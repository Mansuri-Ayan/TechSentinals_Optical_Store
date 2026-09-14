import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  getInventoryConfigApi,
  updateInventoryConfigApi,
  getProductAgingOverrideApi,
  upsertProductAgingOverrideApi,
  deleteProductAgingOverrideApi,
  runAgingEvaluationApi,
  getAgingSummaryApi,
} from '../api/inventory/inventoryConfig.api';

export const inventoryConfigKey = ['inventoryConfig'];

/**
 * Fetch admin's inventory configuration (aging timeline + GST defaults).
 */
export const useInventoryConfig = () => {
  return useQuery({
    queryKey: inventoryConfigKey,
    queryFn: getInventoryConfigApi,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};

/**
 * Update admin's inventory configuration.
 */
export const useUpdateInventoryConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateInventoryConfigApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryConfigKey });
      toast.success('Inventory configuration updated.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update configuration.');
    },
  });
};

/**
 * Fetch product-specific aging override.
 */
export const useProductAgingOverride = (productId) => {
  return useQuery({
    queryKey: [...inventoryConfigKey, 'product', productId],
    queryFn: () => getProductAgingOverrideApi(productId),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
};

/**
 * Upsert product aging override.
 */
export const useUpsertProductAgingOverride = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, payload }) => upsertProductAgingOverrideApi(productId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...inventoryConfigKey, 'product', variables.productId] });
      toast.success('Product aging override saved.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to save product override.');
    },
  });
};

/**
 * Delete product aging override (revert to defaults).
 */
export const useDeleteProductAgingOverride = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProductAgingOverrideApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryConfigKey });
      toast.success('Product aging override reset to defaults.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to reset override.');
    },
  });
};

/**
 * Manually run the aging evaluation job.
 */
export const useRunAgingEvaluation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runAgingEvaluationApi,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: inventoryConfigKey });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success(
        `Aging evaluation complete: ${data.evaluated} batches evaluated, ${data.stage_changes} stage changes.`
      );
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Aging evaluation failed.');
    },
  });
};

/**
 * Fetch aging summary (counts per stage).
 */
export const useAgingSummary = () => {
  return useQuery({
    queryKey: [...inventoryConfigKey, 'summary'],
    queryFn: getAgingSummaryApi,
    staleTime: 60 * 1000,
    retry: 1,
  });
};
