// Hook: useRepairs.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listRepairsApi,
  getRepairApi,
  createRepairApi,
  updateRepairApi,
  updateRepairStatusApi,
  cancelRepairApi,
} from '../api/repair/repair.api';
import { toast } from 'react-toastify';

export const repairsQueryKey = ['repairs'];

/**
 * Hook to list repairs with optional filters.
 * @param {Object} filters - { store_id, customer_id, status, repair_type, search, limit, offset }
 */
export const useRepairs = (filters = {}) => {
  return useQuery({
    queryKey: [...repairsQueryKey, filters],
    queryFn: () => listRepairsApi(filters),
    staleTime: 1000 * 60, // 1 minute
    retry: false,
    placeholderData: (prev) => prev,
  });
};

/**
 * Hook to fetch a single repair by ID.
 */
export const useRepair = (repairId) => {
  return useQuery({
    queryKey: [...repairsQueryKey, repairId],
    queryFn: () => getRepairApi(repairId),
    enabled: !!repairId,
    staleTime: 1000 * 60,
    retry: false,
  });
};

/**
 * Hook providing create/update/status/cancel mutations for repairs.
 */
export const useRepairMutations = () => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: repairsQueryKey });
  };

  const createRepairMutation = useMutation({
    mutationFn: (payload) => createRepairApi(payload),
    onSuccess: () => {
      toast.success('Repair task booked successfully.');
      invalidate();
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail || 'Failed to create repair.';
      toast.error(msg);
    },
  });

  const updateRepairMutation = useMutation({
    mutationFn: ({ repairId, payload }) => updateRepairApi(repairId, payload),
    onSuccess: () => {
      toast.success('Repair updated successfully.');
      invalidate();
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail || 'Failed to update repair.';
      toast.error(msg);
    },
  });

  const updateRepairStatusMutation = useMutation({
    mutationFn: ({ repairId, status }) => updateRepairStatusApi(repairId, status),
    onSuccess: (data) => {
      const status = data?.status?.replace('_', ' ') || 'Unknown';
      toast.success(`Status updated to ${status}.`);
      invalidate();
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail || 'Failed to update repair status.';
      toast.error(msg);
    },
  });

  const cancelRepairMutation = useMutation({
    mutationFn: (repairId) => cancelRepairApi(repairId),
    onSuccess: () => {
      toast.success('Repair cancelled.');
      invalidate();
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail || 'Failed to cancel repair.';
      toast.error(msg);
    },
  });

  return {
    createRepairAsync: createRepairMutation.mutateAsync,
    updateRepairAsync: updateRepairMutation.mutateAsync,
    updateRepairStatusAsync: updateRepairStatusMutation.mutateAsync,
    cancelRepairAsync: cancelRepairMutation.mutateAsync,
    isCreating: createRepairMutation.isPending,
    isUpdating: updateRepairMutation.isPending,
    isUpdatingStatus: updateRepairStatusMutation.isPending,
    isCancelling: cancelRepairMutation.isPending,
  };
};
