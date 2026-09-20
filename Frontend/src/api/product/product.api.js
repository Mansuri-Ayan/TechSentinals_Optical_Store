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

/**
 * Update an existing product.
 * @param {number|string} id - Product ID
 * @param {Object} payload - Product update payload
 */
export const updateProductApi = async (id, payload) => {
  if (!id || id === 'undefined') {
    console.warn(`[updateProductApi] Skipping update: Invalid product id "${id}"`);
    return null;
  }
  const response = await api.put(`/products/${id}`, payload);
  return response.data;
};
