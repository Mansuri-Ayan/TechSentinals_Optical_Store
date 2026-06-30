import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  getLabsApi,
  createLabApi,
  updateLabApi,
  deleteLabApi,
} from '../api/labs/labs.api';

export const labsQueryKey = ['labs'];

/**
 * React Query hook for paginated, filtered labs with CRUD mutations.
 *
 * @param {Object} filters - { page, limit, search, active_status }
 */
export const useLabs = (filters = {}) => {
  const queryClient = useQueryClient();

  const params = {
    page: filters.page || 1,
    limit: filters.limit !== undefined ? filters.limit : 10,
    paginate: filters.paginate !== undefined ? filters.paginate : true,
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.active_status && filters.active_status !== 'all' ? { active_status: filters.active_status } : {}),
  };

  const query = useQuery({
    queryKey: [labsQueryKey, params],
    queryFn: () => getLabsApi(params),
    enabled: true,
    staleTime: 0,
    retry: false,
    placeholderData: (prev) => prev,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [labsQueryKey] });
  };

  const createLabMutation = useMutation({
    mutationFn: createLabApi,
    onSuccess: () => {
      invalidate();
      toast.success('Lab created successfully.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to create lab.');
    },
  });

  const updateLabMutation = useMutation({
    mutationFn: ({ id, payload }) => updateLabApi(id, payload),
    onSuccess: () => {
      invalidate();
      toast.success('Lab updated successfully.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to update lab.');
    },
  });

  const deleteLabMutation = useMutation({
    mutationFn: deleteLabApi,
    onSuccess: () => {
      invalidate();
      toast.success('Lab deleted successfully.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to delete lab.');
    },
  });

  return {
    labsQuery: query,
    labs: query.data && Array.isArray(query.data) ? query.data : (query.data?.items || []),
    total: query.data?.total || 0,
    pages: query.data?.pages || 1,
    currentPage: query.data?.page || 1,
    activeCount: query.data?.active_count || 0,
    inactiveCount: query.data?.inactive_count || 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,

    createLabAsync: createLabMutation.mutateAsync,
    isCreatingLab: createLabMutation.isPending,
    updateLabAsync: updateLabMutation.mutateAsync,
    isUpdatingLab: updateLabMutation.isPending,
    deleteLabAsync: deleteLabMutation.mutateAsync,
    isDeletingLab: deleteLabMutation.isPending,
    isSaving: createLabMutation.isPending || updateLabMutation.isPending,
  };
};
