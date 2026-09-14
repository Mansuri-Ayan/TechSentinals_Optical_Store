import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  submitPreLabQCApi,
  getItemReplacementOptionsApi,
  resolveSaleItemDamageApi,
  submitPostLabQCApi,
  logCustomerContactApi,
  getItemQCHistoryApi,
  getItemContactLogsApi,
  getDamagedItemsApi,
  resolveDamageCompensationApi,
  resolveSupplierDamageApi,
  resolveLabDamageApi,
  markDamagedItemAsLossApi,
  verifyCompleteDamageApi,
  markFailedDamageApi,
  reopenDamagedItemApi,
  changeDamageResolutionApi,
  getDamagedItemHistoryApi,
} from '../api/qc/qc.api';

export const damagedItemsQueryKey = 'qcDamagedItems';
export const itemQCHistoryQueryKey = 'saleItemQCHistory';
export const itemReplacementOptionsQueryKey = 'itemReplacementOptions';


/**
 * Hook to query paginated Damaged / Issue Items list
 */
export const useDamagedItems = (filters = {}) => {
  const params = {
    page: filters.page || 1,
    limit: filters.limit || 15,
    ...(filters.storeId && filters.storeId !== 'All' ? { store_id: filters.storeId } : {}),
    ...(filters.damageType && filters.damageType !== 'All' ? { damage_type: filters.damageType } : {}),
    ...(filters.stage && filters.stage !== 'All' ? { stage: filters.stage } : {}),
    ...(filters.status && filters.status !== 'All' ? { status: filters.status } : {}),
    ...(filters.search ? { search: filters.search } : {}),
  };

  const query = useQuery({
    queryKey: [damagedItemsQueryKey, params],
    queryFn: () => getDamagedItemsApi(params),
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 2,
  });

  return {
    items: query.data?.items || [],
    total: query.data?.total || 0,
    page: query.data?.page || 1,
    pages: query.data?.pages || 1,
    limit: query.data?.limit || 15,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

/**
 * Hook to fetch SaleItem QC audit history
 */
export const useItemQCHistory = (saleItemId) => {
  return useQuery({
    queryKey: [itemQCHistoryQueryKey, saleItemId],
    queryFn: () => getItemQCHistoryApi(saleItemId),
    enabled: Boolean(saleItemId),
  });
};

/**
 * Hook to fetch SaleItem customer contact logs
 */
export const useItemContactLogs = (saleItemId) => {
  return useQuery({
    queryKey: ['saleItemContactLogs', saleItemId],
    queryFn: () => getItemContactLogsApi(saleItemId),
    enabled: Boolean(saleItemId),
  });
};

/**
 * Hook to query replacement stock options for a damaged line item
 */
export const useItemReplacementOptions = (saleItemId) => {
  return useQuery({
    queryKey: [itemReplacementOptionsQueryKey, saleItemId],
    queryFn: () => getItemReplacementOptionsApi(saleItemId),
    enabled: Boolean(saleItemId),
    staleTime: 0,
  });
};

/**
 * Hook to fetch chronological audit history for a damaged item
 */
export const useDamagedItemHistory = (damagedItemId) => {
  return useQuery({
    queryKey: ['damagedItemHistory', damagedItemId],
    queryFn: () => getDamagedItemHistoryApi(damagedItemId),
    enabled: Boolean(damagedItemId),
  });
};

/**
 * Mutations hook for executing QC actions
 */
export const useQCMutations = () => {
  const queryClient = useQueryClient();

  const preLabMutation = useMutation({
    mutationFn: ({ saleItemId, payload }) => submitPreLabQCApi(saleItemId, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['saleDrawerDetail'] });
      queryClient.invalidateQueries({ queryKey: ['labOrders'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: [damagedItemsQueryKey] });
      queryClient.invalidateQueries({ queryKey: [itemQCHistoryQueryKey] });
      toast.success(res.message || 'Pre-lab QC submitted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Pre-lab QC submission failed');
    },
  });

  const resolveDamageMutation = useMutation({
    mutationFn: ({ saleItemId, payload }) => resolveSaleItemDamageApi(saleItemId, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['saleDrawerDetail'] });
      queryClient.invalidateQueries({ queryKey: ['labOrders'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: [damagedItemsQueryKey] });
      queryClient.invalidateQueries({ queryKey: [itemQCHistoryQueryKey] });
      queryClient.invalidateQueries({ queryKey: [itemReplacementOptionsQueryKey] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success(res.message || 'Damaged item resolved successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to resolve damaged item');
    },
  });

  const postLabMutation = useMutation({
    mutationFn: ({ saleItemId, payload }) => submitPostLabQCApi(saleItemId, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['saleDrawerDetail'] });
      queryClient.invalidateQueries({ queryKey: ['labOrders'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: [damagedItemsQueryKey] });
      queryClient.invalidateQueries({ queryKey: [itemQCHistoryQueryKey] });
      toast.success(res.message || 'Post-lab QC submitted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Post-lab QC submission failed');
    },
  });

  const contactLogMutation = useMutation({
    mutationFn: ({ saleItemId, payload }) => logCustomerContactApi(saleItemId, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['saleDrawerDetail'] });
      queryClient.invalidateQueries({ queryKey: ['labOrders'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['saleItemContactLogs'] });
      toast.success(res.message || 'Customer contact log saved');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to log customer contact');
    },
  });

  const compensationMutation = useMutation({
    mutationFn: ({ damagedItemId, payload }) => resolveDamageCompensationApi(damagedItemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [damagedItemsQueryKey] });
      toast.success('Compensation claim recorded successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to record compensation');
    },
  });

  const supplierResolutionMutation = useMutation({
    mutationFn: ({ damagedItemId, payload }) => resolveSupplierDamageApi(damagedItemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [damagedItemsQueryKey] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['deadstock'] });
      toast.success('Supplier damage resolution saved successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to resolve supplier damage claim');
    },
  });

  const labResolutionMutation = useMutation({
    mutationFn: ({ damagedItemId, payload }) => resolveLabDamageApi(damagedItemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [damagedItemsQueryKey] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['deadstock'] });
      toast.success('Lab damage resolution saved successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to record lab resolution');
    },
  });

  const markLossMutation = useMutation({
    mutationFn: ({ damagedItemId, payload }) => markDamagedItemAsLossApi(damagedItemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [damagedItemsQueryKey] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['deadstock'] });
      queryClient.invalidateQueries({ queryKey: ['damagedItemHistory'] });
      toast.success('Damaged item marked as loss successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to mark item as loss');
    },
  });

  const verifyCompleteMutation = useMutation({
    mutationFn: ({ damagedItemId, payload }) => verifyCompleteDamageApi(damagedItemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [damagedItemsQueryKey] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['deadstock'] });
      queryClient.invalidateQueries({ queryKey: ['damagedItemHistory'] });
      toast.success('Resolution verified & completed! Stock updated.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to verify resolution');
    },
  });

  const markFailedMutation = useMutation({
    mutationFn: ({ damagedItemId, payload }) => markFailedDamageApi(damagedItemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [damagedItemsQueryKey] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['deadstock'] });
      queryClient.invalidateQueries({ queryKey: ['damagedItemHistory'] });
      toast.info('Resolution marked as failed. You can now select a new resolution.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to mark resolution as failed');
    },
  });

  const reopenDamagedItemMutation = useMutation({
    mutationFn: ({ damagedItemId, payload }) => reopenDamagedItemApi(damagedItemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [damagedItemsQueryKey] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['deadstock'] });
      queryClient.invalidateQueries({ queryKey: ['damagedItemHistory'] });
      toast.success('Damage record reopened successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to reopen damage record');
    },
  });

  const changeResolutionMutation = useMutation({
    mutationFn: ({ damagedItemId, payload }) => changeDamageResolutionApi(damagedItemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [damagedItemsQueryKey] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['deadstock'] });
      queryClient.invalidateQueries({ queryKey: ['damagedItemHistory'] });
      toast.success('Resolution updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to change resolution');
    },
  });

  return {
    submitPreLabQC: preLabMutation.mutateAsync,
    isSubmittingPreLab: preLabMutation.isPending,

    resolveSaleItemDamage: resolveDamageMutation.mutateAsync,
    isResolvingDamage: resolveDamageMutation.isPending,

    submitPostLabQC: postLabMutation.mutateAsync,
    isSubmittingPostLab: postLabMutation.isPending,

    logCustomerContact: contactLogMutation.mutateAsync,
    isLoggingContact: contactLogMutation.isPending,

    resolveCompensation: compensationMutation.mutateAsync,
    isResolvingCompensation: compensationMutation.isPending,

    resolveSupplierDamage: supplierResolutionMutation.mutateAsync,
    isResolvingSupplierDamage: supplierResolutionMutation.isPending,

    resolveLabDamage: labResolutionMutation.mutateAsync,
    isResolvingLabDamage: labResolutionMutation.isPending,

    markDamagedItemAsLoss: markLossMutation.mutateAsync,
    isMarkingLoss: markLossMutation.isPending,

    verifyCompleteDamage: verifyCompleteMutation.mutateAsync,
    isVerifyingComplete: verifyCompleteMutation.isPending,

    markFailedDamage: markFailedMutation.mutateAsync,
    isMarkingFailed: markFailedMutation.isPending,

    reopenDamagedItem: reopenDamagedItemMutation.mutateAsync,
    isReopeningDamagedItem: reopenDamagedItemMutation.isPending,

    changeDamageResolution: changeResolutionMutation.mutateAsync,
    isChangingResolution: changeResolutionMutation.isPending,
  };
};

