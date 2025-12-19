import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { login as loginService, register as registerService, AuthResponse } from '../services/authService';

interface User {
  _id?: string;
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'user' | 'admin';
  favorites?: any[];
}

interface RegisterUserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  userType?: string; // Optionnel car géré en interne
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (userData: RegisterUserData) => Promise<AuthResponse>;
  logout: () => void;
  updateUser: (u: Partial<User>) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'barrylandAuthToken';
const USER_KEY = 'barrylandUser';

interface ErrorBoundaryState {
  hasError: boolean;
}

class AuthErrorBoundary extends React.Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // reference the error to satisfy lint rules (actual logging happens in componentDidCatch)
    void error;
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AuthProvider Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Une erreur est survenue
            </h2>
            <p className="text-gray-600 mb-4">
              Veuillez rafraîchir la page ou vous reconnecter
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
            >
              Rafraîchir
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Disable react-refresh warning about non-component exports in this file
/* eslint-disable react-refresh/only-export-components */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const storedUser = localStorage.getItem(USER_KEY);
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      // En cas d'erreur de parsing, on nettoie le localStorage
      void e;
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = user?.role === 'admin';

  const logout = (): void => {
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    try {
      // ensure local favorites are cleared on logout to avoid cross-account leakage
      localStorage.removeItem('barrylandLocalFavorites');
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('barryland:auth:logout'));
      }
    } catch (e) { /* ignore */ }
  };

  const updateUser = (u: Partial<User>) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...(u || {}) } as User;
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(next));
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  useEffect(() => {
    const validateAuth = () => {
      try {
        // Vérifier le token au démarrage
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token && user) {
          // Si pas de token mais un utilisateur en état, déconnexion
          logout();
        }
      } catch (e) {
        void e;
        // En cas d'erreur, on déconnecte l'utilisateur
        logout();
      }
    };
    
    validateAuth();
  }, [user]);

  const clearError = () => setError(null);

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response: AuthResponse = await loginService(email, password);

      // Si échec côté API, on remonte l'erreur dans le contexte
      if (!response.success) {
        const errorMessage = response.message || 'Erreur lors de la connexion';
        setError(errorMessage);
        console.log('Échec de l\'authentification:', { message: errorMessage, response });
        return response;
      }

      // Vérifier la présence des données
      if (!response.data?.token || !response.data?.user) {
        const errorMessage = 'Réponse du serveur invalide';
        setError(errorMessage);
        return { success: false, message: errorMessage, data: null };
      }

      setUser(response.data.user);
      localStorage.setItem(TOKEN_KEY, response.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));

      // Dispatch un événement avec les favoris reçus du serveur
      try {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('barryland:auth:login', {
            detail: {
              favorites: (response.data.user as any).favorites || []
            }
          }));
        }
      } catch (e) { /* ignore */ }
      return response;
    } catch (err) {
      console.error('Erreur de connexion:', err); // Pour le débogage
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue lors de la connexion';
      setError(errorMessage);
      return { success: false, message: errorMessage, data: null };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterUserData): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response: AuthResponse = await registerService(userData);
      
      if (!response.success) {
        setError(response.message || "Erreur lors de l'inscription");
        return response;
      }

      if (!response.data?.token || !response.data?.user) {
        const errorMessage = "Réponse du serveur invalide";
        setError(errorMessage);
        return { success: false, message: errorMessage, data: null };
      }

      setUser(response.data.user);
      localStorage.setItem(TOKEN_KEY, response.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Une erreur est survenue lors de l'inscription";
      setError(errorMessage);
      return { success: false, message: errorMessage, data: null };
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthErrorBoundary>
      <AuthContext.Provider value={{ 
        user, 
        isLoading, 
        error,
        isAdmin,
        login, 
        register, 
        logout,
        updateUser,
        clearError 
      }}>
        {children}
      </AuthContext.Provider>
    </AuthErrorBoundary>
  );
};

function createUseAuth() {
  return function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
      throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
    }
    return context;
  };
}

export const useAuth = createUseAuth();