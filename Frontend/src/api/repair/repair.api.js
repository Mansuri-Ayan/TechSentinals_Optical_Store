// API: repair/repair.api.js
import api from '../../lib/axios';

/**
 * Create a new repair/service job.
 */
export const createRepairApi = async (payload) => {
  const response = await api.post('/repairs/', payload);
  return response.data;
};

/**
 * List repair/service jobs with optional filters.
 * @param {Object} params - { store_id, customer_id, status, repair_type, search, limit, offset }
 */
export const listRepairsApi = async (params = {}) => {
  const response = await api.get('/repairs/', { params });
  return response.data;
};

/**
 * Get a single repair by ID.
 */
export const getRepairApi = async (repairId) => {
  const response = await api.get(`/repairs/${repairId}`);
  return response.data;
};

/**
 * Partially update a repair record.
 */
export const updateRepairApi = async (repairId, payload) => {
  const response = await api.patch(`/repairs/${repairId}`, payload);
  return response.data;
};

/**
 * Update only the status of a repair.
 */
export const updateRepairStatusApi = async (repairId, status) => {
  const response = await api.patch(`/repairs/${repairId}/status`, { status });
  return response.data;
};

/**
 * Cancel a repair (soft-delete by setting status to CANCELLED).
 */
export const cancelRepairApi = async (repairId) => {
  const response = await api.delete(`/repairs/${repairId}`);
  return response.data;
};
