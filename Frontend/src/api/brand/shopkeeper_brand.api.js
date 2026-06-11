import api from '../../lib/axios';

/**
 * Fetch brands for the current shopkeeper (paginated).
 */
export const getShopkeeperBrandsApi = async (params = {}) => {
  const response = await api.get('/shopkeeper/brands/', { params });
  return response.data;
};

/**
 * Create a new brand.
 */
export const createShopkeeperBrandApi = async (payload) => {
  const response = await api.post('/shopkeeper/brands/', payload);
  return response.data;
};

/**
 * Update an existing brand.
 */
export const updateShopkeeperBrandApi = async (id, payload) => {
  const response = await api.put(`/shopkeeper/brands/${id}`, payload);
  return response.data;
};

/**
 * Soft-delete a brand.
 */
export const deleteShopkeeperBrandApi = async (id) => {
  const response = await api.delete(`/shopkeeper/brands/${id}`);
  return response.data;
};
