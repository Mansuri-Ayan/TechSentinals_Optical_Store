import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  getTransactionsApi,
  getManagerTransactionsApi,
  createTransferApi,
  createPurchaseApi,
  createDamageApi,
  createLossApi,
  createSaleApi,
  createReturnApi,
  approveTransactionApi,
  rejectTransactionApi,
  createManagerRequestApi,
  createManagerPushApi,
  createManagerPurchaseApi,
} from '../api/transactions/transaction.api';

export const transactionsQueryKey = ['transactions'];

export const useTransactions = (storeId, filters = {}, isManager = false) => {
  const queryClient = useQueryClient();
  const params = {
    page: filters.page || 1,
    limit: filters.limit || 20,
    ...(storeId ? { store_id: storeId } : {}),
    ...(filters.transaction_type ? { transaction_type: filters.transaction_type } : {}),
    ...(filters.product_id ? { product_id: filters.product_id } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.transfer_direction ? { transfer_direction: filters.transfer_direction } : {}),
    ...(filters.is_request !== undefined ? { is_request: filters.is_request } : {}),
    ...(filters.search ? { search: filters.search } : {}),
  };

  const query = useQuery({
    queryKey: [transactionsQueryKey, storeId, params, isManager],
    queryFn: () => isManager ? getManagerTransactionsApi(params) : getTransactionsApi(params),
    enabled: isManager ? true : Boolean(storeId),
    retry: false,
    staleTime: 1000 * 60 * 2,
  });

  const createTransactionMutation = useMutation({
    mutationFn: async ({ type, payload }) => {
      const normalizedType = (type || '').toUpperCase();
      switch (normalizedType) {
        case 'PURCHASE':
          return createPurchaseApi(payload);
        case 'DAMAGE':
          return createDamageApi(payload);
        case 'LOSS':
          return createLossApi(payload);
        case 'SALE':
          return createSaleApi(payload);
        case 'RETURN':
          return createReturnApi(payload);
        case 'INVENTORY TRANSFER':
        case 'TRANSFER':
        default:
          return createTransferApi(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [transactionsQueryKey] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Transaction completed successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to complete transaction.');
    },
  });

  const approveTransactionMutation = useMutation({
    mutationFn: (id) => approveTransactionApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [transactionsQueryKey] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Transaction approved successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to approve transaction.');
    },
  });

  const rejectTransactionMutation = useMutation({
    mutationFn: ({ id, payload }) => rejectTransactionApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [transactionsQueryKey] });
      toast.success('Transaction rejected successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to reject transaction.');
    },
  });

  const createManagerRequestMutation = useMutation({
    mutationFn: (payload) => createManagerRequestApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [transactionsQueryKey] });
      toast.success('Transfer request sent successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to send transfer request.');
    },
  });

  const createManagerPushMutation = useMutation({
    mutationFn: (payload) => createManagerPushApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [transactionsQueryKey] });
      toast.success('Stock push sent successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to send stock push.');
    },
  });

  const createManagerPurchaseMutation = useMutation({
    mutationFn: (payload) => createManagerPurchaseApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [transactionsQueryKey] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Purchase recorded successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to record purchase.');
    },
  });

  return {
    transactions: query.data?.items || query.data || [],
    totalTransactions: query.data?.total || (Array.isArray(query.data) ? query.data.length : 0),
    transactionPages: query.data?.pages || 1,
    transactionPage: query.data?.page || 1,
    isLoadingTransactions: query.isLoading,
    isFetchingTransactions: query.isFetching,
    isTransactionsError: query.isError,
    createTransactionAsync: createTransactionMutation.mutateAsync,
    isCreatingTransaction: createTransactionMutation.isPending,
    approveTransactionAsync: approveTransactionMutation.mutateAsync,
    isApprovingTransaction: approveTransactionMutation.isPending,
    rejectTransactionAsync: rejectTransactionMutation.mutateAsync,
    isRejectingTransaction: rejectTransactionMutation.isPending,
    createManagerRequestAsync: createManagerRequestMutation.mutateAsync,
    isCreatingManagerRequest: createManagerRequestMutation.isPending,
    createManagerPushAsync: createManagerPushMutation.mutateAsync,
    isCreatingManagerPush: createManagerPushMutation.isPending,
    createManagerPurchaseAsync: createManagerPurchaseMutation.mutateAsync,
    isCreatingManagerPurchase: createManagerPurchaseMutation.isPending,
  };
};
