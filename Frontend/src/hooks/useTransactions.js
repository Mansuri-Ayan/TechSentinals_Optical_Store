import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  getTransactionsApi,
  createTransferApi,
  createPurchaseApi,
  createDamageApi,
  createLossApi,
  createSaleApi,
  createReturnApi,
} from '../api/transactions/transaction.api';

export const transactionsQueryKey = ['transactions'];

export const useTransactions = (storeId, filters = {}) => {
  const queryClient = useQueryClient();
  const params = {
    page: filters.page || 1,
    limit: filters.limit || 20,
    ...(storeId ? { store_id: storeId } : {}),
    ...(filters.transaction_type ? { transaction_type: filters.transaction_type } : {}),
    ...(filters.product_id ? { product_id: filters.product_id } : {}),
  };

  const query = useQuery({
    queryKey: [transactionsQueryKey, storeId, params],
    queryFn: () => getTransactionsApi(params),
    enabled: Boolean(storeId),
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

  return {
    transactions: query.data?.items || [],
    totalTransactions: query.data?.total || 0,
    transactionPages: query.data?.pages || 1,
    transactionPage: query.data?.page || 1,
    isLoadingTransactions: query.isLoading,
    isFetchingTransactions: query.isFetching,
    isTransactionsError: query.isError,
    createTransactionAsync: createTransactionMutation.mutateAsync,
    isCreatingTransaction: createTransactionMutation.isPending,
  };
};
