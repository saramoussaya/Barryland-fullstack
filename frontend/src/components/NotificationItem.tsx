// No default React import required with new JSX transform
import { useState } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { X, Loader2 } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { useToast } from '../contexts/ToastContext';

type Props = {
	notification: any;
};

const NotificationItem = ({ notification }: Props) => {
	const { markAsRead, deleteNotification } = useNotifications();
	const [deleting, setDeleting] = useState(false);

	const handleMarkRead = async (e?: React.MouseEvent) => {
		if (e) e.stopPropagation();
		if (!notification.read) {
			await markAsRead(notification._id);
		}
	};

	const { showToast } = useToast();
	const [confirmOpen, setConfirmOpen] = useState(false);

	const handleDelete = async (e?: React.MouseEvent) => {
		if (e) e.stopPropagation();
		setConfirmOpen(true);
	};

	const doDelete = async () => {
		try {
			setDeleting(true);
			await deleteNotification(notification._id);
			showToast('Notification supprimée', 'success');
		} catch (err: any) {
			showToast(err?.message || 'Erreur lors de la suppression', 'error');
		} finally {
			setDeleting(false);
			setConfirmOpen(false);
		}
	};

	return (
		<div className={`p-3 border-b hover:bg-gray-50 ${notification.read ? 'bg-white' : 'bg-blue-50'}`}>
			<div className="flex justify-between items-start">
				<div className="flex-1" onClick={() => handleMarkRead()}>
					<div className="font-medium text-sm">{notification.title}</div>
					{notification.message ? <div className="text-xs text-gray-600">{notification.message}</div> : null}
				</div>
				<div className="flex flex-col items-end space-y-2 ml-4">
					<div className="text-xs text-gray-400">{new Date(notification.createdAt).toLocaleString()}</div>
					<div className="flex items-center space-x-2">
						{!notification.read ? (
							<button onClick={handleMarkRead} className="text-xs text-gray-600">Marquer lu</button>
						) : null}
						<>
							<button
								onClick={handleDelete}
								className="ml-2 p-1 rounded-full bg-white hover:bg-gray-100 border border-gray-100 shadow-sm flex items-center justify-center"
								title="Supprimer la notification"
							>
								{deleting ? <Loader2 className="h-4 w-4 animate-spin text-gray-500" /> : <X className="h-4 w-4 text-gray-500" />}
							</button>
							<ConfirmModal
								open={confirmOpen}
								title="Supprimer la notification"
								description="Voulez-vous vraiment supprimer cette notification ? Cette action est irréversible."
								confirmText="Supprimer"
								cancelText="Annuler"
								loading={deleting}
								onCancel={() => setConfirmOpen(false)}
								onConfirm={doDelete}
							/>
						</>
					</div>
				</div>
			</div>
		</div>
	);
};

export default NotificationItem;
