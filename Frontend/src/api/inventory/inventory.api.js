import api from '../../lib/axios';

/**
 * Fetch paginated inventory for a given owner (store or admin).
 * @param {Object} params - Query parameters (owner_type, owner_id, page, limit, search, category_id, etc.)
 */
export const getInventoryApi = async (params) => {
  const response = await api.get('/inventory/', { params });
  return response.data;
};

export const getWarehouseInventoryApi = async (params) => {
  const response = await api.get('/inventory/warehouse', { params });
  return response.data;
};

export const getUniversalInventoryApi = async (params) => {
  const response = await api.get('/inventory/universal', { params });
  return response.data;
};

/**
 * Fetch a single inventory record by ID.
 */
export const getInventoryByIdApi = async (id) => {
  const response = await api.get(`/inventory/${id}`);
  return response.data;
};

/**
 * Create a new inventory record.
 */
export const createInventoryApi = async (payload) => {
  const response = await api.post('/inventory/', payload);
  return response.data;
};

/**
 * Update an existing inventory record.
 */
export const updateInventoryApi = async (id, payload) => {
  const response = await api.put(`/inventory/${id}`, payload);
  return response.data;
};

export const getInventoryBatchesApi = async (inventoryId, params = {}) => {
  const response = await api.get(`/inventory/${inventoryId}/batches`, { params });
  return response.data;
};
