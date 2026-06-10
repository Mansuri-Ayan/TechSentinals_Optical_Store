import { useQuery } from '@tanstack/react-query';
import { getDashboardReportApi } from '../api/report/report.api';

export const dashboardQueryKey = ['dashboard'];

/**
 * Hook to fetch dashboard report data.
 * @param {number|string|null} storeId - Optional store ID filter.
 */
export const useDashboard = (storeId = null) => {
  const params = {};
  if (storeId && storeId !== 'All') {
    params.store_id = storeId;
  }

  return useQuery({
    queryKey: [dashboardQueryKey, storeId],
    queryFn: () => getDashboardReportApi(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: false,
    placeholderData: (prev) => prev,
  });
};
