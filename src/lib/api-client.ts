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
        const status = error.response?.status;
        const currentHash = window.location.hash;
        const isLoginPage = currentHash.includes('/login') || error.config?.url?.includes('/auth/login');

        // Handle 401 — token expired or invalid (outside of login page)
        if (status === 401 && !isLoginPage) {
            console.warn('🔒 Session expired — redirecting to login');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // For HashRouter, we must only change the hash
            window.location.hash = '#/login';
            return new Promise(() => { }); // Prevent further error handling
        }

        // Clean & normalize error message for user presentation
        let cleanMessage = '';
        const serverData = error.response?.data;
        const serverMessage = typeof serverData === 'string' 
            ? serverData 
            : (serverData?.message || serverData?.error || serverData?.msg);

        if (serverMessage && typeof serverMessage === 'string' && serverMessage.trim()) {
            cleanMessage = serverMessage.trim();
        } else if (status === 403) {
            cleanMessage = 'Permission Denied: You do not have permission to perform this action.';
        } else if (status === 401) {
            cleanMessage = 'Invalid credentials. Please check your email and password.';
        } else if (status === 404) {
            cleanMessage = 'The requested item or resource was not found.';
        } else if (status === 400) {
            cleanMessage = 'Invalid input data or request format.';
        } else if (status === 429) {
            cleanMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (status >= 500) {
            cleanMessage = 'Server error occurred. Please try again later.';
        } else if (error.code === 'ERR_NETWORK' || !error.response) {
            cleanMessage = 'Network Error: Unable to connect to server. Please check your internet connection.';
        } else {
            cleanMessage = error.message || 'An unexpected error occurred.';
        }

        // Attach standardized properties to error object
        error.userMessage = cleanMessage;
        error.status = status;
        error.isPermissionError = status === 403;
        
        // OVERRIDE error.message so that any catch block reading error.message gets cleanMessage instead of "Request failed with status code 403/500"
        error.message = cleanMessage;

        return Promise.reject(error);
    }
);

export function getErrorMessage(error: any): string {
    if (!error) return 'An unexpected error occurred.';
    if (typeof error === 'string') return error;
    if (error.userMessage) return error.userMessage;
    if (error.response?.data?.message) return error.response.data.message;
    if (error.response?.data?.error) return error.response.data.error;
    if (error.message) return error.message;
    return 'An unexpected error occurred.';
}

export default api;

