import { useQuery } from '@tanstack/react-query';
import { getProductsApi } from '../api/product/product.api';

export const productsQueryKey = ['products'];

/**
 * Hook to retrieve products belonging to the active admin.
 * @param {Object} filters - Query parameters like category_id, subcategory_id, search, limit, etc.
 */
export const useProducts = (filters = {}) => {
  const params = {
    limit: filters.limit || 100, // get a reasonable default size for selection lists
    offset: filters.offset || 0,
    ...(filters.category_id ? { category_id: Number(filters.category_id) } : {}),
    ...(filters.subcategory_id ? { subcategory_id: Number(filters.subcategory_id) } : {}),
    ...(filters.brand_id ? { brand_id: Number(filters.brand_id) } : {}),
    ...(filters.search ? { search: filters.search } : {}),
    active_only: filters.active_only !== undefined ? filters.active_only : true,
  };

  const query = useQuery({
    queryKey: [productsQueryKey, params],
    queryFn: () => getProductsApi(params),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return {
    products: query.data || [],
    isLoadingProducts: query.isLoading,
    isFetchingProducts: query.isFetching,
    isProductsError: query.isError,
    productsQuery: query,
  };
};
