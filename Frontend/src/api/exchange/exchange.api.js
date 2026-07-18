import api from '../../lib/axios';

/**
 * Fetch exchanges for current admin / store.
 * 
 * @param {Object} params - Query parameters.
 */
export const getExchangesApi = async (params = {}) => {
  const response = await api.get('/exchanges/', { params });
  return response.data;
};

/**
 * Fetch a single exchange by ID.
 * 
 * @param {number|string} id - The exchange ID.
 */
export const getExchangeApi = async (id) => {
  const response = await api.get(`/exchanges/${id}`);
  return response.data;
};

/**
 * Create a new exchange atomically.
 * 
 * @param {Object} payload - The exchange payload.
 */
export const createExchangeApi = async (payload) => {
  const response = await api.post('/exchanges/', payload);
  return response.data;
};

/**
 * Fetch backend-generated HTML receipt for an exchange.
 * 
 * @param {number|string} id - The exchange ID.
 */
export const getExchangeReceiptApi = async (id) => {
  const response = await api.get(`/exchanges/${id}/receipt`);
  return response.data;
};

/**
 * Cancel an exchange.
 * 
 * @param {number|string} id - The exchange ID.
 */
export const cancelExchangeApi = async (id) => {
  const response = await api.post(`/exchanges/${id}/cancel`);
  return response.data;
};
