import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  getBrandsApi,
  createBrandApi,
  updateBrandApi,
  deleteBrandApi,
} from '../api/brand/brand.api';

export const brandsQueryKey = ['brands'];

/**
 * React Query hook for paginated, filtered brands with CRUD mutations.
 *
 * @param {number|string|null} storeId - Scope product counts to this store.
 * @param {Object} filters - { page, limit, search }
 */
export const useBrands = (storeId = null, filters = {}) => {
  const queryClient = useQueryClient();

  const params = {
    page: filters.page || 1,
    limit: filters.limit || 20,
    paginate: true,
    ...(storeId ? { store_id: storeId } : {}),
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.active_status ? { active_status: filters.active_status } : {}),
  };

  const query = useQuery({
    queryKey: [brandsQueryKey, storeId, params],
    queryFn: () => getBrandsApi(params),
    enabled: true,
    staleTime: 1000 * 60 * 2,
    retry: false,
    placeholderData: (prev) => prev,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [brandsQueryKey] });
  };

  const createBrandMutation = useMutation({
    mutationFn: createBrandApi,
    onSuccess: () => { invalidate(); toast.success('Brand created successfully.'); },
    onError: (err) => { toast.error(err.response?.data?.detail || 'Failed to create brand.'); },
  });

  const updateBrandMutation = useMutation({
    mutationFn: ({ id, payload }) => updateBrandApi(id, payload),
    onSuccess: () => { invalidate(); toast.success('Brand updated successfully.'); },
    onError: (err) => { toast.error(err.response?.data?.detail || 'Failed to update brand.'); },
  });

  const deleteBrandMutation = useMutation({
    mutationFn: deleteBrandApi,
    onSuccess: () => { invalidate(); toast.success('Brand deactivated successfully.'); },
    onError: (err) => { toast.error(err.response?.data?.detail || 'Failed to delete brand.'); },
  });

  return {
    brandsQuery: query,
    brands: query.data?.items || [],
    total: query.data?.total || 0,
    pages: query.data?.pages || 1,
    currentPage: query.data?.page || 1,
    activeCount: query.data?.active_count || 0,
    inactiveCount: query.data?.inactive_count || 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,

    createBrandAsync: createBrandMutation.mutateAsync,
    isCreatingBrand: createBrandMutation.isPending,
    updateBrandAsync: updateBrandMutation.mutateAsync,
    isUpdatingBrand: updateBrandMutation.isPending,
    deleteBrandAsync: deleteBrandMutation.mutateAsync,
    isDeletingBrand: deleteBrandMutation.isPending,
    isSaving: createBrandMutation.isPending || updateBrandMutation.isPending,
  };
};
