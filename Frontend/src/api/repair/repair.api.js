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

/**
 * Fetch repair bill JSON including HTML content.
 */
export const getRepairBillApi = async (repairId) => {
  const response = await api.get(`/repairs/${repairId}/bill`);
  return response.data;
};

/**
 * Download repair bill PDF file.
 */
export const downloadRepairBillApi = async (repairId, repairNumber, isFinal = false) => {
  const response = await api.get(`/repairs/${repairId}/bill/download`, {
    responseType: 'blob',
  });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const prefix = isFinal ? 'Final_Repair_Bill' : 'Temporary_Repair_Bill';
  const fileName = `${prefix}_${repairNumber || repairId}.pdf`;
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

