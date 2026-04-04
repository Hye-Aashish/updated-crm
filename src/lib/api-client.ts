import axios from 'axios';

const getBaseURL = () => {
    // 1. Try VITE_API_URL from environment
    const envURL = (import.meta as any).env.VITE_API_URL;
    if (envURL) return envURL;

    // 2. Electron: Always use absolute URL to avoid 'file://' protocol issues
    const isElectron = !!(window as any).electronAPI || navigator.userAgent.includes('Electron');
    if (isElectron) {
        return envURL || 'http://localhost:5000/api';
    }

    // 3. Web Production: Use relative path (standard reverse proxy setup)
    if ((import.meta as any).env.PROD) {
        return '/api';
    }

    // 4. Web Development: Default to localhost
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
            const currentHash = window.location.hash;
            const isLoginPage = currentHash.includes('/login') || error.config?.url?.includes('/auth/login');

            if (!isLoginPage) {
                console.warn('🔒 Session expired — redirecting to login');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                
                // For Electron/HashRouter, we must only change the hash
                if (window.location.protocol === 'file:') {
                    window.location.hash = '#/login';
                } else {
                    window.location.href = '/login';
                }
                return new Promise(() => { }); // Prevent further error handling
            }
        }

        // Re-throw the original error to preserve error.response.data
        return Promise.reject(error);
    }
);

export default api;
