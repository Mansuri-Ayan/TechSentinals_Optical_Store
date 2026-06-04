import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  getInventoryApi,
  createInventoryApi,
  updateInventoryApi,
} from '../api/inventory/inventory.api';

export const inventoryQueryKey = ['inventory'];

/**
 * React Query hook for paginated and filtered store inventory.
 *
 * @param {number|string} storeId - The store whose inventory to fetch.
 * @param {Object} filters - { page, limit, search, category_id, subcategory_id, brand_id, stock_status }
 */
export const useInventory = (storeId, filters = {}) => {
  const queryClient = useQueryClient();

  const params = {
    owner_type: 'STORE',
    owner_id: storeId,
    page: filters.page || 1,
    limit: filters.limit || 20,
    paginate: true,
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.category_id ? { category_id: filters.category_id } : {}),
    ...(filters.subcategory_id ? { subcategory_id: filters.subcategory_id } : {}),
    ...(filters.brand_id ? { brand_id: filters.brand_id } : {}),
    ...(filters.stock_status ? { stock_status: filters.stock_status } : {}),
  };

  // Main paginated query
  const query = useQuery({
    queryKey: [inventoryQueryKey, storeId, params],
    queryFn: () => getInventoryApi(params),
    enabled: !!storeId,
    staleTime: 1000 * 60 * 2,
    retry: false,
    placeholderData: (previousData) => previousData, // keepPreviousData replacement in TanStack Query v5 style
  });

  // KPIs / Full list query (unpaginated)
  const kpiQuery = useQuery({
    queryKey: [inventoryQueryKey, storeId, 'kpis'],
    queryFn: () => getInventoryApi({ owner_type: 'STORE', owner_id: storeId, paginate: false }),
    enabled: !!storeId,
    staleTime: 1000 * 60 * 2,
    retry: false,
  });

  const invalidateInventory = () => {
    queryClient.invalidateQueries({ queryKey: [inventoryQueryKey, storeId] });
  };

  const createInventoryMutation = useMutation({
    mutationFn: createInventoryApi,
    onSuccess: () => {
      invalidateInventory();
      toast.success('Inventory record created successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create inventory record.');
    },
  });

  const updateInventoryMutation = useMutation({
    mutationFn: ({ id, payload }) => updateInventoryApi(id, payload),
    onSuccess: () => {
      invalidateInventory();
      toast.success('Inventory record updated successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update inventory record.');
    },
  });

  return {
    inventoryQuery: query,
    items: query.data?.items || [],
    total: query.data?.total || 0,
    pages: query.data?.pages || 1,
    currentPage: query.data?.page || 1,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,

    // KPIs / Full inventory items
    kpiItems: kpiQuery.data?.items || [],
    isLoadingKpis: kpiQuery.isLoading,

    createInventoryAsync: createInventoryMutation.mutateAsync,
    updateInventoryAsync: updateInventoryMutation.mutateAsync,
    isSaving: createInventoryMutation.isPending || updateInventoryMutation.isPending,
  };
};
