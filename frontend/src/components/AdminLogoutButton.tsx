import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import apiClient from '../utils/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';

const AdminLogoutButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // call auth logout endpoint to record server-side logs
      await apiClient.post('/auth/logout', {}, { headers: { 'X-Skip-Auth-Redirect': '1' } } as any);
    } catch (err) {
      // ignore server errors
      // eslint-disable-next-line no-console
      console.error('admin logout error', err);
    } finally {
      try {
        // Remove tokens from localStorage and sessionStorage
        localStorage.removeItem('barrylandAuthToken');
        localStorage.removeItem('barrylandUser');
        localStorage.removeItem('barrylandAdminToken');
      } catch (e) { void e; }
      try {
        sessionStorage.removeItem('barrylandAuthToken');
        sessionStorage.removeItem('barrylandUser');
        sessionStorage.removeItem('barrylandAdminToken');
      } catch (e) { void e; }

      try { logout(); } catch (e) { void e; }

      try {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('barryland:auth:logout'));
        }
      } catch (e) { /* ignore */ }

      try { showToast('Déconnexion réussie', 'success'); } catch (e) { void e; }
      navigate('/admin/login');
      setLoading(false);
      setOpen(false);
    }
  };

  // Only render button UI; visibility will be controlled by parent via checks
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full inline-flex items-center justify-center bg-red-600 text-white hover:bg-red-700 rounded-lg px-4 py-2 transition-colors duration-200"
        aria-label="Se Deconnecter"
      >
        <LogOut className="h-4 w-4 mr-2" />
        <span className="font-medium">Se Deconnecter</span>
      </button>

      <ConfirmModal
        open={open}
        title="Confirmer la déconnexion"
        description="Voulez-vous vraiment vous déconnecter de l'espace administrateur ?"
        confirmText="Se déconnecter"
        cancelText="Annuler"
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
        loading={loading}
      />
    </>
  );
};

export default AdminLogoutButton;
