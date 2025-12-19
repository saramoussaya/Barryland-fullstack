import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { resetPassword as resetPasswordService } from '../services/authService';
import { useToast } from '../contexts/ToastContext';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const otp = searchParams.get('otp') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const validate = () => {
    if (!password) return 'Le mot de passe est requis';
    if (password.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères';
    if (password !== confirm) return 'Les mots de passe ne correspondent pas';
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) return toast.showToast(v, 'error');
    if (!email || !otp) return toast.showToast('Paramètres manquants', 'error');
    setLoading(true);
    const res = await resetPasswordService(email, otp, password);
    setLoading(false);
    if (res.success) {
      toast.showToast('Mot de passe réinitialisé, connectez-vous', 'success');
      navigate('/auth');
    } else {
      toast.showToast(res.message || 'Erreur', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded p-8 shadow">
        <h2 className="text-xl font-bold mb-2">Réinitialiser le mot de passe</h2>
        <p className="text-gray-600 mb-4">Entrez votre nouveau mot de passe pour {email}</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" className="w-full border px-3 py-2 rounded" placeholder="Nouveau mot de passe" />
          <input value={confirm} onChange={e => setConfirm(e.target.value)} type="password" className="w-full border px-3 py-2 rounded" placeholder="Confirmer le mot de passe" />
          <button disabled={loading} className="w-full bg-emerald-600 text-white py-2 rounded">{loading ? 'En cours...' : 'Réinitialiser le mot de passe'}</button>
        </form>
        <div className="mt-4 text-sm">
          <Link to="/auth" className="text-emerald-600 hover:underline">Retour à la connexion</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
