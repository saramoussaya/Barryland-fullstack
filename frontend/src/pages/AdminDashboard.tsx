import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import AdminProperties from './admin/AdminProperties';
import UsersPage from './admin/UsersPage';

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
        <aside className="w-64 bg-white shadow-md min-h-screen">
          <div className="p-4 bg-emerald-600">
            <h2 className="text-white text-lg font-semibold">Admin Dashboard</h2>
          </div>
          <nav className="mt-4 p-4">
            <ul className="space-y-2">
              <li>
                <Link to="/admin" className={`block px-3 py-2 rounded ${location.pathname === '/admin' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-700'}`}>Statistiques</Link>
              </li>
              <li>
                <Link to="/admin/properties" className={`block px-3 py-2 rounded ${location.pathname.includes('/admin/properties') ? 'bg-emerald-50 text-emerald-600' : 'text-gray-700'}`}>Annonces</Link>
              </li>
              <li>
                <Link to="/admin/users" className={`block px-3 py-2 rounded ${location.pathname.includes('/admin/users') ? 'bg-emerald-50 text-emerald-600' : 'text-gray-700'}`}>Utilisateurs</Link>
              </li>
            </ul>
          </nav>
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
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
