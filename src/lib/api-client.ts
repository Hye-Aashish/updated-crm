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
});

console.log('📡 API Client Initialized with URL:', api.defaults.baseURL);

// Request interceptor for auth token (if needed in future)
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
        // Re-throw the original error to preserve error.response.data
        return Promise.reject(error);
    }
);

export default api;
