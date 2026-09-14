import api from '../../lib/axios';

/**
 * Public Admin Registration
 * @param {Object} data - Admin and Store registration payload
 * @returns {Promise<Object>} Admin model object
 */
export const registerAdminPublicApi = async (data) => {
  const response = await api.post('/auth/register/admin', data);
  return response.data;
};

/**
 * Perform login request
 * @param {Object} credentials - { email, password }
 * @returns {Promise<Object>} Token object containing access_token, token_type, role, etc.
 */
export const loginApi = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

/**
 * Fetch current authenticated user info
 * @returns {Promise<Object>} User object
 */
export const getMeApi = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

/**
 * Logout request (optional backend token invalidation)
 * @returns {Promise<Object>} Response data
 */
export const logoutApi = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

/**
 * Send OTP verification code to email
 * @param {Object} data - { email, force_new }
 * @returns {Promise<Object>} OTPResponse
 */
export const sendAdminOtpApi = async ({ email, force_new = false }) => {
  const response = await api.post('/auth/otp/send', { email, force_new });
  return response.data;
};

/**
 * Verify OTP verification code
 * @param {Object} data - { email, otp }
 * @returns {Promise<Object>} OTPVerifyResponse
 */
export const verifyAdminOtpApi = async ({ email, otp }) => {
  const response = await api.post('/auth/otp/verify', { email, otp });
  return response.data;
};

/**
 * Check active Admin OTP status
 * @param {Object} data - { email }
 * @returns {Promise<Object>} OTPStatusResponse
 */
export const checkAdminOtpStatusApi = async ({ email }) => {
  const response = await api.post('/auth/otp/status', { email });
  return response.data;
};
