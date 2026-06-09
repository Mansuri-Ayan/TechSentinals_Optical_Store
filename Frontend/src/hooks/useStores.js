import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { createStoreApi, getStoresApi, updateStoreApi, deleteStoreApi } from '../api/stores/store.api';
import { useStoreStore } from '../store/store';

export const storesQueryKey = ['stores'];
const emptyStores = [];

export const useStores = (params = { paginate: false }) => {
  const queryClient = useQueryClient();
  const { setSelectedStore, upsertStore } = useStoreStore();

  const storesQuery = useQuery({
    queryKey: [storesQueryKey, params],
    queryFn: () => getStoresApi(params),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const createStoreMutation = useMutation({
    mutationFn: createStoreApi,
    onSuccess: (createdStore) => {
      upsertStore(createdStore);
      setSelectedStore(createdStore);
      queryClient.invalidateQueries({ queryKey: storesQueryKey });
      toast.success('Store created successfully.');
    },
    onError: (error) => {
      const errorMsg =
        error.response?.data?.detail || 'Failed to create store.';
      toast.error(errorMsg);
    },
  });

  const updateStoreMutation = useMutation({
    mutationFn: updateStoreApi,
    onSuccess: (updatedStore) => {
      upsertStore(updatedStore);
      queryClient.invalidateQueries({ queryKey: storesQueryKey });
      toast.success('Store updated successfully.');
    },
    onError: (error) => {
      const errorMsg =
        error.response?.data?.detail || 'Failed to update store.';
      toast.error(errorMsg);
    },
  });

  const deleteStoreMutation = useMutation({
    mutationFn: deleteStoreApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storesQueryKey });
      toast.success('Store deleted successfully.');
    },
    onError: (error) => {
      const errorMsg =
        error.response?.data?.detail || 'Failed to delete store.';
      toast.error(errorMsg);
    },
  });

  return {
    storesQuery,
    stores: storesQuery.data?.items || emptyStores,
    isLoadingStores: storesQuery.isLoading,
    isStoresError: storesQuery.isError,
    createStore: createStoreMutation.mutate,
    createStoreAsync: createStoreMutation.mutateAsync,
    isCreatingStore: createStoreMutation.isPending,
    updateStore: updateStoreMutation.mutate,
    updateStoreAsync: updateStoreMutation.mutateAsync,
    isUpdatingStore: updateStoreMutation.isPending,
    deleteStore: deleteStoreMutation.mutate,
    deleteStoreAsync: deleteStoreMutation.mutateAsync,
    isDeletingStore: deleteStoreMutation.isPending,
  };
};
