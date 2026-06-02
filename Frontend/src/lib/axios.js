import axios from 'axios';

// Get API URL from env
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Crucial: enables automatic sending/receiving of cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Response interceptor to handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid infinite 401 loop when calling authentication routes
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
                           originalRequest.url?.includes('/auth/logout') ||
                           originalRequest.url?.includes('/auth/refresh');

    // Check if error is 401 Unauthorized, request hasn't been retried, and is not an auth endpoint
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      // If we are already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh endpoint with credentials (cookie is sent automatically)
        await axios.post(
          `${API_URL}/auth/refresh`,
          {}, // Empty body, server will read from refresh_token cookie
          { withCredentials: true }
        );

        processQueue(null);
        isRefreshing = false;

        // Retry the original request (cookie is now updated and sent automatically)
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        isRefreshing = false;

        // Dispatch global logout event on refresh failure
        window.dispatchEvent(new Event('auth:logout'));

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
