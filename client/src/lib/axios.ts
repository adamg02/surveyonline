import axios from 'axios';

// Configure axios defaults
const apiUrl = import.meta.env.VITE_API_URL || '';

if (apiUrl) {
  // Production: use full API URL
  axios.defaults.baseURL = apiUrl;
} else {
  // Development: use proxy (relative URLs)
  axios.defaults.baseURL = '';
}

// Add auth token to all requests if available
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors globally
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default axios;