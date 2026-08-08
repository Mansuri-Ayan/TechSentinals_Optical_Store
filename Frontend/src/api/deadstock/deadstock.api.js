import api from '../../lib/axios';

/**
 * Fetch deadstock items with filters, search, and category counts.
 * 
 * @param {Object} params - Query parameters.
 */
export const getDeadstockApi = async (params = {}) => {
  const response = await api.get('/deadstock/', { params });
  return response.data;
};

/**
 * Fetch AVAILABLE deadstock items for POS product selection.
 * 
 * @param {Object} params - Query parameters (store_id, category).
 */
export const getPosAvailableDeadstockApi = async (params = {}) => {
  const response = await api.get('/deadstock/pos-available', { params });
  return response.data;
};

/**
 * Fetch a single deadstock item by ID.
 * 
 * @param {number|string} id - The deadstock item ID.
 */
export const getDeadstockItemApi = async (id) => {
  const response = await api.get(`/deadstock/${id}`);
  return response.data;
};

/**
 * Reuse a deadstock frame or accessory (move back to active store inventory).
 * 
 * @param {number|string} id - The deadstock item ID.
 */
export const reuseDeadstockApi = async (id) => {
  const response = await api.post(`/deadstock/${id}/reuse`);
  return response.data;
};

/**
 * Batch reuse multiple deadstock items (moves quantity back to active inventory).
 * 
 * @param {Array<number>} itemIds - List of deadstock item IDs.
 */
export const batchReuseDeadstockApi = async (itemIds) => {
  const response = await api.post('/deadstock/batch-reuse', { item_ids: itemIds });
  return response.data;
};
