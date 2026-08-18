import api from '../../lib/axios';

/**
 * Fetch sales for the current admin (paginated, with optional filtering and search).
 * 
 * @param {Object} params - Query parameters.
 */
export const getSalesApi = async (params = {}) => {
  const response = await api.get('/sales/', { params });
  return response.data;
};

/**
 * Fetch a single sale by ID.
 * 
 * @param {number|string} id - The sale ID.
 */
export const getSaleApi = async (id) => {
  const response = await api.get(`/sales/${id}`);
  return response.data;
};

/**
 * Create a new sale atomically with items and payments.
 * 
 * @param {Object} payload - The sale payload.
 */
export const createSaleApi = async (payload) => {
  const response = await api.post('/sales/', payload);
  return response.data;
};

/**
 * Fetch backend-generated HTML bill for a sale.
 * 
 * @param {number|string} saleId - The sale ID.
 */
export const getSaleBillApi = async (saleId) => {
  const response = await api.get(`/sales/${saleId}/bill`);
  return response.data;
};

/**
 * Delete a sale permanently and perform full inventory/loyalty rollback.
 * 
 * @param {number|string} saleId - The sale ID.
 */
export const deleteSaleApi = async (saleId) => {
  const response = await api.delete(`/sales/${saleId}`);
  return response.data;
};

/**
 * Cancel a sale (changes status to Cancelled and rolls back stock).
 * 
 * @param {number|string} saleId - The sale ID.
 */
export const cancelSaleApi = async (saleId) => {
  const response = await api.post(`/sales/${saleId}/cancel`);
  return response.data;
};

