import api from '../../lib/axios';

/**
 * Staff login
 * @param {Object} credentials - { email, password }
 * @returns {Promise<Object>} TokenPair
 */
export const loginApi = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

/**
 * Refresh access token
 * @param {Object} data - { refresh_token, device_fingerprint }
 * @returns {Promise<Object>} TokenPair
 */
export const refreshApi = async (data) => {
  const response = await api.post('/auth/refresh', data);
  return response.data;
};

/**
 * Logout and revoke refresh token
 * @param {Object} data - { refresh_token }
 * @returns {Promise<Object>} Success message
 */
export const logoutApi = async (data) => {
  const response = await api.post('/auth/logout', data);
  return response.data;
};

/**
 * Get current user profile
 * @returns {Promise<Object>} UserRead profile
 */
export const getMeApi = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};
