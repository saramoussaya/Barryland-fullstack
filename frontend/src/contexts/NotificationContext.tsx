import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import apiClient from '../utils/apiClient';

type Notification = {
	_id: string;
	type: string;
	title: string;
	message?: string;
	data?: any;
	read: boolean;
	createdAt: string;
};

type NotificationContextType = {
	notifications: Notification[];
	loading: boolean;
	refresh: () => Promise<void>;
	markAsRead: (id: string) => Promise<void>;
	markAllRead: () => Promise<void>;
	deleteNotification: (id: string) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [loading, setLoading] = useState(false);

		const fetchNotifications = async () => {
		setLoading(true);
		try {
				// If there's no auth token, skip server call (visitor has no notifications)
				const token = (() => {
					try { return localStorage.getItem('barrylandAuthToken'); } catch (e) { return null; }
				})();
				if (!token) {
					setNotifications([]);
					setLoading(false);
					return;
				}
				// apiClient already has baseURL set to .../api
				// Request a small page initially to improve perceived load time
				const res = await apiClient.get('/notifications', { params: { page: 1, limit: 8 } });
			if (res && res.data && res.data.data) {
				setNotifications(res.data.data.notifications || []);
			}
		} catch (err) {
			console.error('Erreur fetch notifications', err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		// Initial fetch
		fetchNotifications();

		// Poll less frequently (every 2 minutes) to reduce server load
		const t = setInterval(fetchNotifications, 2 * 60 * 1000);

		// Also listen to global auth events so notifications refresh on login/logout
		const onLogin = () => {
			// When a user logs in elsewhere in the app, refresh notifications for the current user
			fetchNotifications().catch(() => {});
		};
		const onLogout = () => {
			setNotifications([]);
		};

		window.addEventListener('barryland:auth:login', onLogin as EventListener);
		window.addEventListener('barryland:auth:logout', onLogout as EventListener);

		return () => {
			clearInterval(t);
			window.removeEventListener('barryland:auth:login', onLogin as EventListener);
			window.removeEventListener('barryland:auth:logout', onLogout as EventListener);
		};
	}, []);

	const markAsRead = async (id: string) => {
		try {
			await apiClient.put(`/notifications/${id}/read`);
			// Refresh from server for stronger consistency
			await fetchNotifications();
		} catch (err) {
			console.error('Erreur markAsRead', err);
		}
	};

	const markAllRead = async () => {
		try {
			await apiClient.put('/notifications/mark-all-read');
			// Refresh to ensure server state is reflected
			await fetchNotifications();
		} catch (err) {
			console.error('Erreur markAllRead', err);
		}
	};

	const deleteNotification = async (id: string) => {
		try {
			// Optimistic removal locally
			setNotifications(prev => prev.filter(n => String(n._id) !== String(id)));
			await apiClient.delete(`/notifications/${id}`);
			// no need to refresh full list; optimistic update is sufficient
		} catch (err) {
			console.error('Erreur deleteNotification', err);
			// axios specific details
			try {
				const anyErr: any = err;
				if (anyErr?.response) {
					console.error('deleteNotification response status/data:', anyErr.response.status, anyErr.response.data);
				}
			} catch (e) { /* ignore */ }
			// On error, refetch to restore accurate state
			try { await fetchNotifications(); } catch (e) { /* ignore */ }
		}
	};

	return (
		<NotificationContext.Provider value={{ notifications, loading, refresh: fetchNotifications, markAsRead, markAllRead, deleteNotification }}>
			{children}
		</NotificationContext.Provider>
	);
};

export const useNotifications = () => {
	const ctx = useContext(NotificationContext);
	if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
	return ctx;
};

export default NotificationContext;
