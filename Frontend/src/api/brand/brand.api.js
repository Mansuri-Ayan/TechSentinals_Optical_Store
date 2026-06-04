import api from '../../lib/axios';

/**
 * Fetch all brands for the current admin.
 */
export const getBrandsApi = async (params = {}) => {
  const response = await api.get('/brands/', { params });
  return response.data;
};

/**
 * Create a new brand.
 */
export const createBrandApi = async (payload) => {
  const response = await api.post('/brands/', payload);
  return response.data;
};
