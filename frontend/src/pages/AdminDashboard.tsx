import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import AdminLogoutButton from '../components/AdminLogoutButton';
import { BarChart2, Home, Users, Clock, MessageSquare } from 'lucide-react';
import AdminProperties from './admin/AdminProperties';
import UsersPage from './admin/UsersPage';
const AdminMessages = lazy(() => import('./admin/AdminMessages'));
const AdminActivityLog = lazy(() => import('./admin/ActivityLog'));

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  if (!user || user.role !== 'admin') return <Navigate to="/auth" replace />;

  const [stats, setStats] = useState<any>(null);
  const location = useLocation();
  const mainContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const resp = await apiClient.get('/admin/dashboard');
        if (mounted) setStats(resp.data.data.overview || {});
      } catch (e) {
        console.error('Erreur chargement dashboard admin:', e);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        <aside className="hidden md:flex flex-col w-72 bg-gradient-to-b from-emerald-900 to-emerald-700 text-white shadow-md min-h-screen">
          <div className="p-4 border-b border-emerald-800">
            <div className="flex items-center space-x-3">
              <div className="bg-white/10 p-2 rounded-md">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 11L12 3l9 8v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8z" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div className="text-white text-lg font-semibold">BarryLand</div>
                <div className="text-xs text-gray-400">Espace Administrateur</div>
              </div>
            </div>
          </div>

          <nav className="p-4 overflow-auto flex-1">
            <ul className="space-y-2">
              {/* Statistiques */}
              <li>
                <Link to="/admin" className={`flex items-center justify-between px-4 py-3 my-1 rounded-lg transition-all duration-200 ${location.pathname === '/admin' ? 'bg-blue-600 text-white shadow-md border-l-4 border-white/20 scale-105' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'}`}>
                  <div className="flex items-center space-x-3">
                    <span className="p-2 rounded-md bg-white/5"><BarChart2 className="w-5 h-5" /></span>
                    <span className="font-medium">Tableau de bord</span>
                  </div>
                  {/* Badge supprimé - affichage numérique désactivé */}
                </Link>
              </li>

              {/* Annonces */}
              <li>
                <Link to="/admin/properties" className={`flex items-center justify-between px-4 py-3 my-1 rounded-lg transition-all duration-200 ${location.pathname.includes('/admin/properties') ? 'bg-green-600 text-white shadow-md border-l-4 border-white/20 scale-105' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'}`}>
                  <div className="flex items-center space-x-3">
                    <span className="p-2 rounded-md bg-white/5"><Home className="w-5 h-5" /></span>
                    <span className="font-medium">Gestion des annonces</span>
                  </div>
                  {/* Badge supprimé - affichage numérique désactivé */}
                </Link>
              </li>

              {/* Utilisateurs */}
              <li>
                <Link to="/admin/users" className={`flex items-center justify-between px-4 py-3 my-1 rounded-lg transition-all duration-200 ${location.pathname.includes('/admin/users') ? 'bg-purple-600 text-white shadow-md border-l-4 border-white/20 scale-105' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'}`}>
                  <div className="flex items-center space-x-3">
                    <span className="p-2 rounded-md bg-white/5"><Users className="w-5 h-5" /></span>
                    <span className="font-medium">Utilisateurs</span>
                  </div>
                  {/* Badge supprimé - affichage numérique désactivé */}
                </Link>
              </li>

              {/* Historiques */}
              <li>
                <Link to="/admin/activity-log" className={`flex items-center justify-between px-4 py-3 my-1 rounded-lg transition-all duration-200 ${location.pathname.includes('/admin/activity-log') ? 'bg-amber-500 text-white shadow-md border-l-4 border-white/20 scale-105' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'}`}>
                  <div className="flex items-center space-x-3">
                    <span className="p-2 rounded-md bg-white/5"><Clock className="w-5 h-5" /></span>
                    <span className="font-medium">Journal d'activités</span>
                  </div>
                </Link>
              </li>

              {/* Messages */}
              <li>
                <Link to="/admin/messages" className={`flex items-center justify-between px-4 py-3 my-1 rounded-lg transition-all duration-200 ${location.pathname.includes('/admin/messages') ? 'bg-cyan-500 text-white shadow-md border-l-4 border-white/20 scale-105' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'}`}>
                  <div className="flex items-center space-x-3">
                    <span className="p-2 rounded-md bg-white/5"><MessageSquare className="w-5 h-5" /></span>
                    <span className="font-medium">Messages</span>
                  </div>
                  {/* unread count not yet available in overview */}
                  {/* Badge supprimé - affichage numérique désactivé */}
                </Link>
              </li>
            </ul>
          </nav>

          <div className="p-4 border-t border-emerald-800">
            {user && user.role === 'admin' && location.pathname.includes('/admin') && (
              <AdminLogoutButton />
            )}
          </div>
        </aside>

        <main className="flex-1 p-8" ref={mainContentRef} tabIndex={-1} aria-live="polite">
          <div className="sticky top-4 z-20 bg-gray-100 -mx-8 px-8 pb-4 pt-0">
            <div className="container mx-auto">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
                <div className="text-sm text-gray-600">Bienvenue</div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Routes>
              <Route path="/" element={(
                <section>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm">
                      <h3 className="text-lg font-semibold">Total Annonces</h3>
                      <p className="text-3xl font-bold text-emerald-600">{stats?.totalProperties ?? '—'}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm">
                      <h3 className="text-lg font-semibold">Utilisateurs</h3>
                      <p className="text-3xl font-bold text-emerald-600">{stats?.totalUsers ?? '—'}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm">
                      <h3 className="text-lg font-semibold">Visites</h3>
                      <p className="text-3xl font-bold text-emerald-600">{stats?.totalViews ?? '—'}</p>
                    </div>
                  </div>
                </section>
              )} />

              <Route path="properties" element={<AdminProperties />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="activity-log" element={<Suspense fallback={<div>Chargement...</div>}><AdminActivityLog /></Suspense>} />
              <Route path="messages" element={<Suspense fallback={<div>Chargement...</div>}><AdminMessages /></Suspense>} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
