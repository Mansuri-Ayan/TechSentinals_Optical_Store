import api from '../../lib/axios';

/**
 * Fetch brands for the current admin (paginated).
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

/**
 * Update an existing brand.
 */
export const updateBrandApi = async (id, payload) => {
  const response = await api.put(`/brands/${id}`, payload);
  return response.data;
};

/**
 * Soft-delete a brand.
 */
export const deleteBrandApi = async (id) => {
  const response = await api.delete(`/brands/${id}`);
  return response.data;
};
