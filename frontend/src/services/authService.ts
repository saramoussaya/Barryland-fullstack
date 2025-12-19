import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Types
interface User {
  _id?: string;
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'user' | 'admin';
  avatar?: string;
  isVerified: boolean;
  favorites?: any[];
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: User;
  } | null;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

// Intercepteur pour ajouter le token aux requêtes
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('barrylandAuthToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer les erreurs
// Extended request config allows us to pass a custom flag without TypeScript error
type ExtendedRequestConfig = AxiosRequestConfig & { skipAuthRedirect?: boolean };

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    try {
      const status = error.response?.status;
      const reqConfig = (error.config as ExtendedRequestConfig) || {};
      // Allow requests to opt-out of the global redirect using a flag or header
      const skip = reqConfig.skipAuthRedirect === true ||
        (reqConfig.headers && (reqConfig.headers['X-Skip-Auth-Redirect'] === '1' || reqConfig.headers['x-skip-auth-redirect'] === '1'));

      if (status === 401 && !skip) {
        // Only redirect when not already on the auth page
        if (typeof window !== 'undefined' && window.location && !window.location.pathname.startsWith('/auth')) {
          localStorage.removeItem('barrylandAuthToken');
          localStorage.removeItem('barrylandUser');
          window.location.href = '/auth';
        }
      }
    } catch (e) {
      // If anything goes wrong here, don't break the original error flow
      console.error('Auth interceptor error:', e);
    }

    return Promise.reject(error);
  }
);

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const config: ExtendedRequestConfig = {
      // mark this request to skip the global 401 redirect handled by the interceptor
      skipAuthRedirect: true,
      headers: {
        'X-Skip-Auth-Redirect': '1'
      }
    };

    const response: AxiosResponse<AuthResponse> = await apiClient.post<AuthResponse>('/auth/login', {
      email: email.trim().toLowerCase(),
      password
    }, config);

    const respData = response.data as AuthResponse;

    // Si la réponse ne contient pas les données attendues
    if (!respData?.data?.token || !respData?.data?.user) {
      return {
        success: false,
        message: 'Réponse du serveur invalide',
        data: null
      };
    }

    // Si la connexion est réussie
    return {
      success: true,
      message: 'Connexion réussie',
      data: {
        token: respData.data.token,
        user: respData.data.user
      }
    };
  } catch (error) {
    // Gestion des erreurs Axios
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const serverMessage = error.response?.data?.message;
      const serverData = error.response?.data;

      // Si nous avons une réponse structurée du serveur, utilisons-la directement
      if (serverData && typeof serverData === 'object' && 'success' in serverData) {
        return serverData as AuthResponse;
      }

      // Sinon, construisons un message d'erreur approprié
      let errorMessage = 'Une erreur est survenue lors de la connexion.';
      
      switch (status) {
        case 401:
          errorMessage = serverMessage || 'Email ou mot de passe incorrect.';
          break;
        case 403:
          errorMessage = 'Votre compte n\'est pas encore vérifié. Veuillez vérifier votre email.';
          break;
        case 404:
          errorMessage = 'Aucun compte n\'existe avec cet email.';
          break;
        case 429:
          errorMessage = 'Trop de tentatives de connexion. Veuillez réessayer dans quelques minutes.';
          break;
        case 500:
          errorMessage = 'Le service est temporairement indisponible. Veuillez réessayer plus tard.';
          break;
        default:
          errorMessage = serverMessage || 'Erreur lors de la connexion. Veuillez réessayer.';
      }

      // Retourner une réponse d'erreur structurée
      return {
        success: false,
        message: errorMessage,
        data: null
      };
    }
    // Autres types d'erreurs
    return {
      success: false,
      message: 'Une erreur inattendue est survenue',
      data: null
    };
  }
};

export const register = async (userData: RegisterData): Promise<AuthResponse> => {
  try {
    const formattedData = {
      ...userData,
      email: userData.email.trim().toLowerCase(),
      firstName: userData.firstName.trim(),
      lastName: userData.lastName.trim(),
      phone: userData.phone.trim()
    };

    const config: ExtendedRequestConfig = {
      skipAuthRedirect: true,
      headers: {
        'X-Skip-Auth-Redirect': '1'
      }
    };

    const response: AxiosResponse<AuthResponse> = await apiClient.post<AuthResponse>('/auth/register', formattedData, config);
    return response.data as AuthResponse;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 
        'Erreur lors de l\'inscription. Veuillez réessayer.'
      );
    }
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem('barrylandAuthToken');
  localStorage.removeItem('barrylandUser');
  window.location.href = '/auth';
};

// Forgot password: request a password reset email
export const forgotPassword = async (email: string): Promise<AuthResponse> => {
  try {
    const response: AxiosResponse<any> = await apiClient.post('/auth/forgot-password', { email });
    // Expect server to return { success: boolean, message: string }
    const data = response.data;
    return {
      success: data?.success ?? true,
      message: data?.message || 'Instructions envoyées si l\'email existe dans notre base.',
      data: null
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const serverMessage = error.response?.data?.message;
      return {
        success: false,
        message: serverMessage || 'Erreur lors de la demande de réinitialisation du mot de passe',
        data: null
      };
    }
    return { success: false, message: 'Erreur inattendue', data: null };
  }
};

export const verifyOtp = async (email: string, otp: string): Promise<AuthResponse> => {
  try {
    const response: AxiosResponse<any> = await apiClient.post('/auth/verify-otp', { email, otp });
    const data = response.data;
    return { success: !!data?.success, message: data?.message || 'Vérifié', data: null };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return { success: false, message: error.response?.data?.message || 'OTP invalide', data: null };
    }
    return { success: false, message: 'Erreur inattendue', data: null };
  }
};

export const resetPassword = async (email: string, otp: string, newPassword: string): Promise<AuthResponse> => {
  try {
    const response: AxiosResponse<any> = await apiClient.post('/auth/reset-password', { email, otp, newPassword });
    const data = response.data;
    return { success: !!data?.success, message: data?.message || 'Mot de passe réinitialisé', data: null };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return { success: false, message: error.response?.data?.message || 'Erreur', data: null };
    }
    return { success: false, message: 'Erreur inattendue', data: null };
  }
};
