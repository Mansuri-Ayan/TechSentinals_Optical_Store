import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDeadstockApi,
  getPosAvailableDeadstockApi,
  getDeadstockItemApi,
  reuseDeadstockApi,
} from '../api/deadstock/deadstock.api';
import { toast } from 'react-toastify';

/**
 * Custom hook to fetch list of deadstock items.
 */
export const useDeadstock = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ['deadstock', params],
    queryFn: () => getDeadstockApi(params),
    keepPreviousData: true,
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...options,
  });
};

/**
 * Custom hook to fetch AVAILABLE deadstock items for POS product selection.
 */
export const usePosAvailableDeadstock = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ['deadstock', 'pos-available', params],
    queryFn: () => getPosAvailableDeadstockApi(params),
    staleTime: 1000 * 30, // 30 seconds
    ...options,
  });
};

/**
 * Custom hook to fetch single deadstock item by ID.
 */
export const useDeadstockItem = (id, options = {}) => {
  return useQuery({
    queryKey: ['deadstock', id],
    queryFn: () => getDeadstockItemApi(id),
    enabled: !!id,
    ...options,
  });
};

/**
 * Custom hook to reuse a deadstock frame/accessory.
 */
export const useReuseDeadstock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => reuseDeadstockApi(id),
    onSuccess: (data) => {
      toast.success(data.message || 'Item moved back to active inventory!');
      queryClient.invalidateQueries({ queryKey: ['deadstock'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (error) => {
      const msg = error.response?.data?.detail || 'Failed to reuse deadstock item.';
      toast.error(msg);
    },
  });
};
