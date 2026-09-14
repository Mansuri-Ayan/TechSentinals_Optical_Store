import api from '../../lib/axios';

/**
 * Fetch dashboard report metrics.
 */
export const getDashboardReportApi = async (params = {}) => {
  const response = await api.get('/reports/dashboard', { params });
  return response.data;
};

/**
 * Fetch analyses report metrics.
 */
export const getAnalysesReportApi = async (params = {}) => {
  const response = await api.get('/reports/analyses', { params });
  return response.data;
};

/**
 * Fetch cross-store product performance report.
 */
export const getProductPerformanceReportApi = async (params = {}) => {
  const response = await api.get('/reports/product-performance', { params });
  return response.data;
};

