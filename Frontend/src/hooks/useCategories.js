import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  getCategoriesApi,
  createCategoryApi,
  updateCategoryApi,
  deleteCategoryApi,
  getSubcategoriesApi,
  createSubcategoryApi,
  updateSubcategoryApi,
  deleteSubcategoryApi,
} from '../api/category/category.api';

export const categoriesQueryKey = ['categories'];
export const subcategoriesQueryKey = ['subcategories'];

/**
 * Paginated categories hook with CRUD.
 *
 * @param {number|string|null} storeId - Scope product counts to this store.
 * @param {Object} filters - { page, limit, search }
 */
export const useCategories = (storeId = null, filters = {}) => {
  const queryClient = useQueryClient();

  const params = {
    page: filters.page || 1,
    limit: filters.limit || 20,
    paginate: filters.paginate !== undefined ? filters.paginate : true,
    ...(storeId ? { store_id: storeId } : {}),
    ...(filters.search ? { search: filters.search } : {}),
  };

  const query = useQuery({
    queryKey: [categoriesQueryKey, storeId, params],
    queryFn: () => getCategoriesApi(params),
    enabled: true,
    staleTime: 1000 * 60 * 2,
    retry: false,
    placeholderData: (prev) => prev,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [categoriesQueryKey] });
  };

  const createCategoryMutation = useMutation({
    mutationFn: createCategoryApi,
    onSuccess: () => { invalidate(); toast.success('Category created successfully.'); },
    onError: (err) => { toast.error(err.response?.data?.detail || 'Failed to create category.'); },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, payload }) => updateCategoryApi(id, payload),
    onSuccess: () => { invalidate(); toast.success('Category updated successfully.'); },
    onError: (err) => { toast.error(err.response?.data?.detail || 'Failed to update category.'); },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategoryApi,
    onSuccess: () => { invalidate(); toast.success('Category deactivated successfully.'); },
    onError: (err) => { toast.error(err.response?.data?.detail || 'Failed to delete category.'); },
  });

  return {
    categoriesQuery: query,
    categories: query.data?.items || [],
    total: query.data?.total || 0,
    pages: query.data?.pages || 1,
    currentPage: query.data?.page || 1,
    isLoadingCategories: query.isLoading,
    isFetchingCategories: query.isFetching,
    isCategoriesError: query.isError,

    createCategoryAsync: createCategoryMutation.mutateAsync,
    isCreatingCategory: createCategoryMutation.isPending,
    updateCategoryAsync: updateCategoryMutation.mutateAsync,
    isUpdatingCategory: updateCategoryMutation.isPending,
    deleteCategoryAsync: deleteCategoryMutation.mutateAsync,
    isDeletingCategory: deleteCategoryMutation.isPending,
    isSavingCategory: createCategoryMutation.isPending || updateCategoryMutation.isPending,
  };
};

/**
 * Paginated subcategories hook with CRUD.
 *
 * @param {number|null} categoryId - The parent category.
 * @param {number|string|null} storeId - Scope product counts to this store.
 * @param {Object} filters - { page, limit, search }
 */
export const useSubcategories = (categoryId, storeId = null, filters = {}) => {
  const queryClient = useQueryClient();

  const params = {
    page: filters.page || 1,
    limit: filters.limit || 20,
    paginate: filters.paginate !== undefined ? filters.paginate : true,
    ...(storeId ? { store_id: storeId } : {}),
    ...(filters.search ? { search: filters.search } : {}),
  };

  const query = useQuery({
    queryKey: [subcategoriesQueryKey, categoryId, storeId, params],
    queryFn: () => getSubcategoriesApi(categoryId, params),
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 2,
    retry: false,
    placeholderData: (prev) => prev,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [subcategoriesQueryKey, categoryId] });
    // Also invalidate parent categories to refresh subcategories_count
    queryClient.invalidateQueries({ queryKey: [categoriesQueryKey] });
  };

  const createSubcategoryMutation = useMutation({
    mutationFn: (payload) => createSubcategoryApi(categoryId, payload),
    onSuccess: () => { invalidate(); toast.success('Subcategory created successfully.'); },
    onError: (err) => { toast.error(err.response?.data?.detail || 'Failed to create subcategory.'); },
  });

  const updateSubcategoryMutation = useMutation({
    mutationFn: ({ id, payload }) => updateSubcategoryApi(id, payload),
    onSuccess: () => { invalidate(); toast.success('Subcategory updated successfully.'); },
    onError: (err) => { toast.error(err.response?.data?.detail || 'Failed to update subcategory.'); },
  });

  const deleteSubcategoryMutation = useMutation({
    mutationFn: deleteSubcategoryApi,
    onSuccess: () => { invalidate(); toast.success('Subcategory deactivated successfully.'); },
    onError: (err) => { toast.error(err.response?.data?.detail || 'Failed to delete subcategory.'); },
  });

  return {
    subcategoriesQuery: query,
    subcategories: query.data?.items || [],
    totalSubcategories: query.data?.total || 0,
    subcategoryPages: query.data?.pages || 1,
    subcategoryPage: query.data?.page || 1,
    isLoadingSubcategories: query.isLoading,
    isFetchingSubcategories: query.isFetching,
    isSubcategoriesError: query.isError,

    createSubcategoryAsync: createSubcategoryMutation.mutateAsync,
    isCreatingSubcategory: createSubcategoryMutation.isPending,
    updateSubcategoryAsync: updateSubcategoryMutation.mutateAsync,
    isUpdatingSubcategory: updateSubcategoryMutation.isPending,
    deleteSubcategoryAsync: deleteSubcategoryMutation.mutateAsync,
    isDeletingSubcategory: deleteSubcategoryMutation.isPending,
    isSavingSubcategory: createSubcategoryMutation.isPending || updateSubcategoryMutation.isPending,
  };
};
