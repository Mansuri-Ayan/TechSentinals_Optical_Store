import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  createSupplierApi,
  deleteSupplierApi,
  getSuppliersApi,
  linkSupplierToStoreApi,
  updateSupplierApi,
  getSupplierByIdApi,
  getSupplierProductsApi,
  addSupplierProductApi,
  updateSupplierProductApi,
} from '../api/suppliers/supplier.api';

export const suppliersQueryKey = ['suppliers'];

export const useSuppliers = (storeId, filters = {}) => {
  const queryClient = useQueryClient();
  const params = {
    page: filters.page || 1,
    limit: filters.limit || 20,
    ...(storeId ? { store_id: storeId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search ? { search: filters.search } : {}),
  };

  const query = useQuery({
    queryKey: [suppliersQueryKey, storeId, params],
    queryFn: () => getSuppliersApi(params),
    enabled: Boolean(storeId),
    retry: false,
    staleTime: 1000 * 60 * 2,
  });

  const invalidateSuppliers = () => {
    queryClient.invalidateQueries({ queryKey: [suppliersQueryKey] });
  };

  const createSupplierMutation = useMutation({
    mutationFn: async ({ payload }) => {
      const supplier = await createSupplierApi(payload);
      if (storeId) {
        await linkSupplierToStoreApi(supplier.id, {
          store_id: Number(storeId),
          is_primary: false,
        });
      }
      return supplier;
    },
    onSuccess: () => {
      invalidateSuppliers();
      toast.success('Supplier created successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create supplier.');
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, payload }) => updateSupplierApi(id, payload),
    onSuccess: () => {
      invalidateSuppliers();
      queryClient.invalidateQueries({ queryKey: ['supplier', id] });
      toast.success('Supplier updated successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update supplier.');
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: deleteSupplierApi,
    onSuccess: () => {
      invalidateSuppliers();
      toast.success('Supplier deleted successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete supplier.');
    },
  });

  return {
    suppliers: query.data?.items || [],
    totalSuppliers: query.data?.total || 0,
    supplierPages: query.data?.pages || 1,
    supplierPage: query.data?.page || 1,
    isLoadingSuppliers: query.isLoading,
    isFetchingSuppliers: query.isFetching,
    isSuppliersError: query.isError,
    createSupplierAsync: createSupplierMutation.mutateAsync,
    updateSupplierAsync: updateSupplierMutation.mutateAsync,
    deleteSupplierAsync: deleteSupplierMutation.mutateAsync,
    isSavingSupplier: createSupplierMutation.isPending || updateSupplierMutation.isPending,
    isDeletingSupplier: deleteSupplierMutation.isPending,
  };
};

/**
 * Fetch details for a single supplier.
 */
export const useSupplier = (supplierId) => {
  const query = useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: () => getSupplierByIdApi(supplierId),
    enabled: !!supplierId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    supplier: query.data,
    isLoadingSupplier: query.isLoading,
    isSupplierError: query.isError,
    supplierQuery: query,
  };
};

/**
 * Fetch and manage supplier catalogue products.
 */
export const useSupplierProducts = (supplierId) => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['supplierProducts', supplierId],
    queryFn: () => getSupplierProductsApi(supplierId),
    enabled: !!supplierId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const addProductMutation = useMutation({
    mutationFn: (payload) => addSupplierProductApi(supplierId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierProducts', supplierId] });
      toast.success('Product added to supplier catalogue.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to add product.');
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ spId, payload }) => updateSupplierProductApi(supplierId, spId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierProducts', supplierId] });
      toast.success('Catalogue product updated successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update product.');
    },
  });

  return {
    products: query.data || [],
    isLoadingProducts: query.isLoading,
    isProductsError: query.isError,
    productsQuery: query,
    addProductAsync: addProductMutation.mutateAsync,
    isAddingProduct: addProductMutation.isPending,
    updateProductAsync: updateProductMutation.mutateAsync,
    isUpdatingProduct: updateProductMutation.isPending,
  };
};
