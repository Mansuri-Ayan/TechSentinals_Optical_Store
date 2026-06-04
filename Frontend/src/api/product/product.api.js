import api from '../../lib/axios';

/**
 * Create a new product.
 * @param {Object} payload - Product data matching ProductCreate schema
 */
export const createProductApi = async (payload) => {
  const response = await api.post('/products/', payload);
  return response.data;
};

/**
 * Fetch all products for the current admin.
 */
export const getProductsApi = async (params = {}) => {
  const response = await api.get('/products/', { params });
  return response.data;
};
