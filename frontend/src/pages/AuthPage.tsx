import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  [key: string]: string | undefined;
}

const AuthPage: React.FC = () => {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  // Déterminer la redirection en fonction du rôle
  const getRedirectPath = (role?: string) => {
    if (location.state?.from) return location.state.from;
    if (role === 'admin') return '/admin';
    return '/dashboard';
  };
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login, register, error: authError, isLoading, clearError } = useAuth();
  const toast = useToast();

  // Synchroniser l'erreur du contexte d'auth vers l'affichage local
  useEffect(() => {
    if (authError) {
      setServerMessage(authError);
      try { toast.showToast(authError, 'error', 4000); } catch (e) { void e; }
    } else {
      setServerMessage(null);
    }
  }, [authError, toast]);

  // Écouter les changements d'erreur d'authentification
  useEffect(() => {
    if (authError) {
      setFormErrors(prev => ({ ...prev, submit: authError }));
    } else {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.submit;
        return newErrors;
      });
    }
  }, [authError]);

  // Réinitialiser les erreurs quand on change de mode (login/register)
  useEffect(() => {
    setFormErrors({});
    clearError();
    setServerMessage(null);
  }, [isLogin, clearError]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (serverMessage) setServerMessage(null);
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!isLogin && !formData.firstName.trim()) {
      newErrors.firstName = 'Le prénom est requis';
    }

    if (!isLogin && !formData.lastName.trim()) {
      newErrors.lastName = 'Le nom est requis';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (!isLogin && !formData.phone.trim()) {
      newErrors.phone = 'Le numéro de téléphone est requis';
    } else if (!isLogin) {
      const phoneNumber = formData.phone.startsWith('+224') ? formData.phone : `+224${formData.phone}`;
      if (!/^\+224[0-9]{8,9}$/.test(phoneNumber)) {
        newErrors.phone = 'Format de téléphone guinéen invalide (+224XXXXXXXX)';
      }
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (!isLogin && formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      // Call login/register and expect an AuthResponse
      const response = isLogin
        ? await login(formData.email, formData.password)
        : await register({
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            email: formData.email.trim().toLowerCase(),
            phone: formData.phone.startsWith('+224') ? formData.phone : `+224${formData.phone}`,
            password: formData.password
          });

      if (response.success && response.data?.user) {
        const redirectPath = getRedirectPath(response.data.user.role);
        navigate(redirectPath, { replace: true });
      } else {
        // Afficher le message reçu de l'API (ou un fallback)
        const message = response.message || (isLogin ? 'Erreur de connexion' : 'Erreur lors de la création du compte');
        setServerMessage(message);
        setFormErrors(prev => ({ ...prev, submit: message }));
      }
    } catch (error: unknown) {
      // Gestion des erreurs techniques
      let errorMessage: string;

      if (error instanceof Error) {
        switch (error.message.toLowerCase()) {
          case 'network error':
            errorMessage = 'Problème de connexion internet. Veuillez vérifier votre connexion.';
            break;
          case 'timeout':
            errorMessage = 'La requête a pris trop de temps. Veuillez réessayer.';
            break;
          case 'server error':
            errorMessage = 'Le service est temporairement indisponible. Veuillez réessayer plus tard.';
            break;
          default:
            errorMessage = error.message;
        }
      } else {
        errorMessage = 'Une erreur inattendue est survenue. Veuillez réessayer plus tard.';
      }
      
      setFormErrors(prev => ({ ...prev, submit: errorMessage }));
      console.error('Erreur lors de la soumission :', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link to="/" aria-label="Accueil" className="inline-flex items-center mb-6">
            <div className="bg-emerald-600 p-0 rounded-full flex items-center justify-center">
              <img src="/yes.png" alt="BarryLand" className="h-20 md:h-24 w-auto object-contain" />
            </div>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">
            {isLogin ? 'Connectez-vous' : 'Créez votre compte'}
          </h2>
          <p className="mt-2 text-gray-600">
            {isLogin 
              ? 'Accédez à votre tableau de bord et gérez vos biens' 
              : 'Rejoignez la communauté BarryLand dès aujourd\'hui'
            }
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                        formErrors.firstName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Votre prénom"
                    />
                  </div>
                  {formErrors.firstName && <p className="text-red-500 text-sm mt-1">{formErrors.firstName}</p>}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nom *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                        formErrors.lastName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Votre nom"
                    />
                  </div>
                  {formErrors.lastName && <p className="text-red-500 text-sm mt-1">{formErrors.lastName}</p>}
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Adresse email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                    formErrors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="votre@email.com"
                />
              </div>
              {formErrors.email && <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro de téléphone *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                      formErrors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="+224 XX XX XX XX"
                  />
                </div>
                {formErrors.phone && <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                    formErrors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Votre mot de passe"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {formErrors.password && <p className="text-red-500 text-sm mt-1">{formErrors.password}</p>}
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le mot de passe *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                      formErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Confirmez votre mot de passe"
                  />
                </div>
                {formErrors.confirmPassword && <p className="text-red-500 text-sm mt-1">{formErrors.confirmPassword}</p>}
              </div>
            )}

            {/* Messages d'erreur (affichés inline sous chaque champ) :
                nous retirons le composant ErrorMessage global pour éviter la duplication */}
            
            {/* Les messages d'erreur détaillés sont affichés inline sous les champs via `formErrors`.
                Nous supprimons le bloc d'erreur secondaire pour éviter la duplication visuelle */}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-emerald-600 text-white py-2 px-4 rounded-lg font-semibold 
                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-700'} 
                focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200
                flex items-center justify-center`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isLogin ? 'Connexion...' : 'Création du compte...'}
                </>
              ) : (
                isLogin ? 'Se connecter' : 'Créer mon compte'
              )}
            </button>
            {isLogin && (
              <div className="text-right mt-2">
                <Link to="/auth/forgot-password" className="text-sm text-emerald-600 hover:underline">
                  Mot de passe oublié ?
                </Link>
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {isLogin ? 'Vous n\'avez pas de compte ?' : 'Vous avez déjà un compte ?'}
              {' '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setFormErrors({});
                  clearError();
                  setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    password: '',
                    confirmPassword: ''
                  });
                }}
                className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
              >
                {isLogin ? 'Créez-en un' : 'Connectez-vous'}
              </button>
            </p>
          </div>
        </div>

        <div className="text-center text-sm text-gray-500">
          En continuant, vous acceptez nos{' '}
          <Link to="/terms" className="text-emerald-600 hover:text-emerald-700">
            conditions d'utilisation
          </Link>
          {' '}et notre{' '}
          <Link to="/privacy" className="text-emerald-600 hover:text-emerald-700">
            politique de confidentialité
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
