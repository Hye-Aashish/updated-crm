import axios from 'axios';

const getBaseURL = () => {
    // 1. Try VITE_API_URL from environment
    const envURL = (import.meta as any).env.VITE_API_URL;
    if (envURL) return envURL;

    // 2. Production: Use relative path (avoids localhost security issues)
    if ((import.meta as any).env.PROD) {
        return '/api';
    }

    // 3. Development: Default to localhost
    return 'http://localhost:5000/api';
};

const api = axios.create({
    baseURL: getBaseURL(),
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 second timeout
});

// Request interceptor for auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle 401 — token expired or invalid
        if (error.response?.status === 401) {
            const currentPath = window.location.pathname;
            // Don't redirect if already on login page or it's the login request itself
            if (currentPath !== '/login' && !error.config?.url?.includes('/auth/login')) {
                console.warn('🔒 Session expired — redirecting to login');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return new Promise(() => { }); // Prevent further error handling
            }
        }

        // Re-throw the original error to preserve error.response.data
        return Promise.reject(error);
    }
);

export default api;
