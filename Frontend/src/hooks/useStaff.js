import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  createStaffApi,
  deleteStaffApi,
  getStoreStaffApi,
  updateStaffApi,
} from '../api/staff/staff.api';

export const staffQueryKey = (storeId) => ['stores', storeId, 'staff'];

export const useStoreStaff = (storeId) => {
  const queryClient = useQueryClient();

  const staffQuery = useQuery({
    queryKey: staffQueryKey(storeId),
    queryFn: () => getStoreStaffApi(storeId),
    enabled: Boolean(storeId),
    retry: false, 
    staleTime: 1000 * 60 * 5,
  });

  const invalidateStaff = () => {
    queryClient.invalidateQueries({ queryKey: staffQueryKey(storeId) });
  };

  const createStaffMutation = useMutation({
    mutationFn: createStaffApi,
    onSuccess: () => {
      invalidateStaff();
      toast.success('Staff member created successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create staff member.');
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: updateStaffApi,
    onSuccess: () => {
      invalidateStaff();
      toast.success('Staff member updated successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update staff member.');
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: deleteStaffApi,
    onSuccess: () => {
      invalidateStaff();
      toast.success('Staff member deleted successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete staff member.');
    },
  });

  return {
    staffQuery,
    staff: staffQuery.data || [],
    isLoadingStaff: staffQuery.isLoading,
    isStaffError: staffQuery.isError,
    createStaffAsync: createStaffMutation.mutateAsync,
    updateStaffAsync: updateStaffMutation.mutateAsync,
    deleteStaffAsync: deleteStaffMutation.mutateAsync,
    isSavingStaff: createStaffMutation.isPending || updateStaffMutation.isPending,
    isDeletingStaff: deleteStaffMutation.isPending,
  };
};
