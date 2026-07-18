import { useQuery } from '@tanstack/react-query';
import { getExchangesApi } from '../api/exchange/exchange.api';

export const exchangesQueryKey = 'exchanges';

/**
 * React Query hook for paginated, filtered exchanges.
 *
 * @param {Object} filters - { page, limit, storeId, status, search, dateFrom, dateTo }
 */
export const useExchanges = (filters = {}) => {
  const params = {
    page: filters.page || 1,
    limit: filters.limit || 8,
    ...(filters.storeId && filters.storeId !== 'All' ? { store_id: filters.storeId } : {}),
    ...(filters.status && filters.status !== 'All' ? { status: filters.status } : {}),
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.dateFrom ? { date_from: filters.dateFrom } : {}),
    ...(filters.dateTo ? { date_to: filters.dateTo } : {}),
  };

  const query = useQuery({
    queryKey: [exchangesQueryKey, params],
    queryFn: async () => {
      return await getExchangesApi(params);
    },
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: false,
  });

  return {
    exchangesQuery: query,
    exchanges: query.data?.items || [],
    total: query.data?.total || 0,
    pages: query.data?.pages || 1,
    currentPage: query.data?.page || 1,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
  };
};
