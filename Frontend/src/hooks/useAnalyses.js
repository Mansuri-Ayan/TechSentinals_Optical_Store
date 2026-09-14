import { useQuery } from '@tanstack/react-query';
import { getAnalysesReportApi, getProductPerformanceReportApi } from '../api/report/report.api';

export const analysesQueryKey = ['analyses'];

/**
 * Hook to fetch analyses report data.
 * @param {number|string|null} storeId - Optional store ID filter.
 * @param {string|null} dateRange - Optional date range filter.
 */
export const useAnalyses = (storeId = null, dateRange = null) => {
  const params = {};
  if (storeId && storeId !== 'All') {
    params.store_id = storeId;
  }
  if (dateRange) {
    params.date_range = dateRange;
  }

  return useQuery({
    queryKey: [analysesQueryKey, storeId, dateRange],
    queryFn: () => getAnalysesReportApi(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: false,
    placeholderData: (prev) => prev,
  });
};

/**
 * Hook to fetch product performance report.
 */
export const useProductPerformanceReport = (filters = {}) => {
  return useQuery({
    queryKey: ['product-performance', filters],
    queryFn: () => getProductPerformanceReportApi(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: false,
    placeholderData: (prev) => prev,
  });
};

