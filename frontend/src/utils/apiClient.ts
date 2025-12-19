import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', // URL de base du backend
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add an interceptor that mirrors the behaviour in authService: attach token from localStorage
apiClient.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('barrylandAuthToken');
    if (token) {
      if (!config.headers) config.headers = {} as any;
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore localStorage errors
    void e;
  }
  return config;
});

export default apiClient;
