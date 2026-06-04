import { useQuery } from '@tanstack/react-query';
import { getCategoriesApi, getSubcategoriesApi } from '../api/category/category.api';

export const categoriesQueryKey = ['categories'];
export const subcategoriesQueryKey = ['subcategories'];

/**
 * React Query hook for fetching all categories.
 */
export const useCategories = () => {
  const query = useQuery({
    queryKey: categoriesQueryKey,
    queryFn: () => getCategoriesApi({ active_only: true }),
    staleTime: 1000 * 60 * 10, // Categories rarely change
    retry: false,
  });

  return {
    categoriesQuery: query,
    categories: query.data || [],
    isLoadingCategories: query.isLoading,
    isCategoriesError: query.isError,
  };
};

/**
 * React Query hook for fetching subcategories of a given category.
 * @param {number|null} categoryId - The category to load subcategories for.
 */
export const useSubcategories = (categoryId) => {
  const query = useQuery({
    queryKey: [subcategoriesQueryKey, categoryId],
    queryFn: () => getSubcategoriesApi(categoryId, { active_only: true }),
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  return {
    subcategoriesQuery: query,
    subcategories: query.data || [],
    isLoadingSubcategories: query.isLoading,
    isSubcategoriesError: query.isError,
  };
};
