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
