import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBrandsApi, createBrandApi } from '../api/brand/brand.api';

export const brandsQueryKey = ['brands'];

export const useBrands = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: brandsQueryKey,
    queryFn: () => getBrandsApi({ active_only: true }),
    staleTime: 1000 * 60 * 10, // Brands rarely change
    retry: false,
  });

  const createBrandMutation = useMutation({
    mutationFn: createBrandApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandsQueryKey });
    },
  });

  return {
    brandsQuery: query,
    brands: query.data || [],
    isLoadingBrands: query.isLoading,
    createBrandAsync: createBrandMutation.mutateAsync,
    isCreatingBrand: createBrandMutation.isPending,
  };
};
