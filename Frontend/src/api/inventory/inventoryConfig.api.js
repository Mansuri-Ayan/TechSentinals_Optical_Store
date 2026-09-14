import api from '../../lib/axios';

/**
 * Fetch admin's inventory configuration (GST defaults + aging timeline).
 */
export const getInventoryConfigApi = async () => {
  const response = await api.get('/inventory-config/');
  return response.data;
};

/**
 * Update admin's inventory configuration.
 * @param {Object} payload - Partial update fields
 */
export const updateInventoryConfigApi = async (payload) => {
  const response = await api.put('/inventory-config/', payload);
  return response.data;
};

/**
 * Get product-specific aging override.
 * @param {number} productId
 */
export const getProductAgingOverrideApi = async (productId) => {
  const response = await api.get(`/inventory-config/product/${productId}`);
  return response.data;
};

/**
 * Create or update product-specific aging override.
 * @param {number} productId
 * @param {Object} payload
 */
export const upsertProductAgingOverrideApi = async (productId, payload) => {
  const response = await api.put(`/inventory-config/product/${productId}`, payload);
  return response.data;
};

/**
 * Delete product aging override (revert to admin defaults).
 * @param {number} productId
 */
export const deleteProductAgingOverrideApi = async (productId) => {
  const response = await api.delete(`/inventory-config/product/${productId}`);
  return response.data;
};

/**
 * Manually trigger aging evaluation cron job.
 */
export const runAgingEvaluationApi = async () => {
  const response = await api.post('/inventory-config/run-aging');
  return response.data;
};

/**
 * Get summary counts of batches per aging stage.
 */
export const getAgingSummaryApi = async () => {
  const response = await api.get('/inventory-config/aging-summary');
  return response.data;
};
