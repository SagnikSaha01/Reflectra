import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: '/api'
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get auth from localStorage
    const authStr = localStorage.getItem('reflectra_auth');
    console.log('API Request Interceptor - Auth data:', authStr ? 'Found' : 'Not found');

    if (authStr) {
      try {
        const auth = JSON.parse(authStr);

        if (auth.session && auth.session.access_token) {
          const token = auth.session.access_token;
          config.headers.Authorization = `Bearer ${token}`;
          console.log('API Request Interceptor - Token added:', token.substring(0, 20) + '...');
        } else {
          console.warn('API Request Interceptor - No access token in auth data');
        }
      } catch (error) {
        console.error('Error parsing auth:', error);
      }
    } else {
      console.warn('API Request Interceptor - No auth in localStorage');
    }

    console.log('API Request to:', config.url, 'with headers:', config.headers);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If unauthorized and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const authStr = localStorage.getItem('reflectra_auth');

        if (authStr) {
          const auth = JSON.parse(authStr);

          if (auth.session && auth.session.refresh_token) {
            // Try to refresh token
            const response = await axios.post('/api/auth/refresh', {
              refreshToken: auth.session.refresh_token
            });

            const newSession = response.data.session;

            // Update localStorage
            auth.session = newSession;
            localStorage.setItem('reflectra_auth', JSON.stringify(auth));

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${newSession.access_token}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed, clear auth and redirect to login
        localStorage.removeItem('reflectra_auth');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // If still 401 or refresh failed, redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('reflectra_auth');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
