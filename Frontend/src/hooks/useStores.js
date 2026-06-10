import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { createStoreApi, getStoresApi, updateStoreApi, deleteStoreApi } from '../api/stores/store.api';
import { useStoreStore, useAuthStore } from '../store/store';

export const storesQueryKey = ['stores'];
const emptyStores = [];

export const useStores = (params = {}) => {
  const queryClient = useQueryClient();
  const { setSelectedStore, upsertStore } = useStoreStore();
  const { user } = useAuthStore();

  const isManagerOrStaff = user && user.role !== 'admin';

  const storesQuery = useQuery({
    queryKey: [storesQueryKey, params],
    queryFn: () => getStoresApi(params),
    staleTime: 1000 * 60 * 5,
    retry: false,
    enabled: user?.role === 'admin',
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

  let stores = emptyStores;
  const total = storesQuery.data?.total || 0;
  const pages = storesQuery.data?.pages || 0;

  if (isManagerOrStaff && user) {
    stores = [{ id: user.store_id, store_name: user.store_name }];
  } else if (storesQuery.data?.items) {
    stores = storesQuery.data.items;
  }

  return {
    storesQuery,
    stores,
    total,
    pages,
    isLoadingStores: user?.role === 'admin' ? storesQuery.isLoading : false,
    isStoresError: user?.role === 'admin' ? storesQuery.isError : false,
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
