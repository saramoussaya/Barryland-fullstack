import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { verifyOtp as verifyOtpService } from '../services/authService';
import { useToast } from '../contexts/ToastContext';

const VerifyOtpPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.showToast('Email manquant', 'error');
    if (!/^[0-9]{6}$/.test(otp)) return toast.showToast('OTP invalide', 'error');
    setLoading(true);
    const res = await verifyOtpService(email, otp);
    setLoading(false);
    if (res.success) {
      toast.showToast('OTP vérifié', 'success');
      navigate(`/auth/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`);
    } else {
      toast.showToast(res.message || 'OTP invalide', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded p-8 shadow">
        <h2 className="text-xl font-bold mb-2">Vérifier le code</h2>
        <p className="text-gray-600 mb-4">Un code à 6 chiffres a été envoyé à {email}</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <input value={otp} onChange={e => setOtp(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder="Entrez le code OTP" />
          <button disabled={loading} className="w-full bg-emerald-600 text-white py-2 rounded">{loading ? 'Vérification...' : 'Vérifier'}</button>
        </form>
        <div className="mt-4 text-sm">
          <Link to="/auth" className="text-emerald-600 hover:underline">Retour à la connexion</Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtpPage;
