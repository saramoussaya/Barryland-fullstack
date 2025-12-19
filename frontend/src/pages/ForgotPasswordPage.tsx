import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { forgotPassword as forgotPasswordService } from '../services/authService';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const validate = () => {
    if (!email.trim()) {
      setError('L\'email est requis');
      return false;
    }
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!valid) {
      setError('Email invalide');
      return false;
    }
    setError(null);
    return true;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await forgotPasswordService(email.trim().toLowerCase());
      if (res.success) {
        toast.showToast(res.message || 'Email de réinitialisation envoyé', 'success', 4000);
        // Rediriger vers la page de vérification OTP en ajoutant l'email en query param
        navigate(`/auth/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      } else {
        toast.showToast(res.message || 'Erreur', 'error', 4000);
      }
    } catch (err: any) {
      toast.showToast(err?.message || 'Erreur lors de la requête', 'error', 4000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link to="/" aria-label="Accueil" className="inline-flex items-center mb-6">
            <div className="bg-emerald-600 p-0 rounded-full flex items-center justify-center">
              <img src="/yes.png" alt="BarryLand" className="h-20 md:h-24 w-auto object-contain" />
            </div>
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">Mot de passe oublié</h2>
          <p className="mt-2 text-gray-600">Entrez votre adresse email et nous vous enverrons les instructions pour réinitialiser votre mot de passe.</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm font-medium text-gray-700">Adresse email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${error ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="votre@email.com"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button type="submit" disabled={loading} className={`w-full bg-emerald-600 text-white py-2 px-4 rounded-lg font-semibold ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-700'}`}>
              {loading ? 'Envoi...' : 'Envoyer les instructions'}
            </button>

            <div className="mt-4 text-center">
              <Link to="/auth" className="text-sm text-emerald-600 hover:underline">Retour à la connexion</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
