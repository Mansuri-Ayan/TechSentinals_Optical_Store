import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  createStaffApi,
  deleteStaffApi,
  getStoreStaffApi,
  updateStaffApi,
  getStaffDetailApi,
} from '../api/staff/staff.api';

export const staffQueryKey = (storeId, params) => ['stores', storeId, 'staff', params];

export const useStoreStaff = (storeId, params) => {
  const queryClient = useQueryClient();

  const staffQuery = useQuery({
    queryKey: staffQueryKey(storeId, params),
    queryFn: () => getStoreStaffApi(storeId, params),
    enabled: Boolean(storeId),
    retry: false, 
    staleTime: 1000 * 60 * 5,
  });

  const staffKpisQuery = useQuery({
    queryKey: ['stores', storeId, 'staff', 'kpis'],
    queryFn: () => getStoreStaffApi(storeId, { paginate: false }),
    enabled: Boolean(storeId),
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const invalidateStaff = () => {
    queryClient.invalidateQueries({ queryKey: ['stores', storeId, 'staff'] });
  };

  const handleMutationError = (error, variables, defaultMessage) => {
    if (error.response?.status === 409 && Array.isArray(error.response?.data?.detail) && variables.setError) {
      error.response.data.detail.forEach((item) => {
        let field = item.field;
        if (field === 'first_name') field = 'firstName';
        else if (field === 'last_name') field = 'lastName';
        else if (field === 'joining_date') field = 'joiningDate';
        else if (field === 'pf_number') field = 'pfNumber';
        else if (field === 'is_active') field = 'isActive';
        else if (field === 'employee_code') field = 'employeeCode';
        
        variables.setError(field, { type: 'server', message: item.message });
      });
    } else {
      const msg = typeof error.response?.data?.detail === 'string'
        ? error.response.data.detail
        : defaultMessage;
      toast.error(msg);
    }
  };

  const createStaffMutation = useMutation({
    mutationFn: createStaffApi,
    onSuccess: () => {
      invalidateStaff();
      toast.success('Staff member created successfully.');
    },
    onError: (error, variables) => handleMutationError(error, variables, 'Failed to create staff member.'),
  });

  const updateStaffMutation = useMutation({
    mutationFn: updateStaffApi,
    onSuccess: () => {
      invalidateStaff();
      toast.success('Staff member updated successfully.');
    },
    onError: (error, variables) => handleMutationError(error, variables, 'Failed to update staff member.'),
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
    staff: staffQuery.data?.items || [],
    total: staffQuery.data?.total || 0,
    page: staffQuery.data?.page || 1,
    pages: staffQuery.data?.pages || 1,
    limit: staffQuery.data?.limit || 20,
    isLoadingStaff: staffQuery.isLoading,
    isStaffError: staffQuery.isError,
    
    // KPI Data
    kpiStaff: staffKpisQuery.data?.items || [],
    isLoadingKpis: staffKpisQuery.isLoading,
    
    createStaffAsync: createStaffMutation.mutateAsync,
    updateStaffAsync: updateStaffMutation.mutateAsync,
    deleteStaffAsync: deleteStaffMutation.mutateAsync,
    isSavingStaff: createStaffMutation.isPending || updateStaffMutation.isPending,
    isDeletingStaff: deleteStaffMutation.isPending,
  };
};

export const useStaffDetail = (role, staffId) => {
  return useQuery({
    queryKey: ['staff', role, staffId, 'details'],
    queryFn: () => getStaffDetailApi(role, staffId),
    enabled: Boolean(role) && Boolean(staffId),
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
};
