/** @format */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  getInventoryApi,
  createInventoryApi,
  updateInventoryApi,
} from "../api/inventory/inventory.api";

export const inventoryQueryKey = ["inventory"];

export const useInventory = (storeId, filters = {}) => {
  const queryClient = useQueryClient();

  const params = {
    owner_type: 'STORE',
    owner_id: storeId,
    page: filters.page || 1,
    limit: filters.limit || 20,
    paginate: true,
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.category_id ? { category_id: filters.category_id } : {}),
    ...(filters.subcategory_id
      ? { subcategory_id: filters.subcategory_id }
      : {}),
    ...(filters.brand_id ? { brand_id: filters.brand_id } : {}),
    ...(filters.stock_status ? { stock_status: filters.stock_status } : {}),
  };

  // Main paginated query
  const query = useQuery({
    queryKey: [inventoryQueryKey, storeId, params],
    queryFn: () => getInventoryApi(params),
    enabled: !!storeId,
    staleTime: 1000 * 60 * 2,
    retry: false,
    placeholderData: (previousData) => previousData,
  });

  // KPIs — fetch ALL items unpaginated for correct counts
  const kpiQuery = useQuery({
    queryKey: [inventoryQueryKey, storeId, "kpis"],
    queryFn: async () => {
      const res = await getInventoryApi(
        { owner_type: 'STORE', owner_id: storeId, paginate: false }
      );
      // Handle both response shapes:
      // Shape 1: { items: [...], total: N }
      // Shape 2: [...] flat array
      if (Array.isArray(res)) return res;
      if (res?.items && Array.isArray(res.items)) return res.items;
      // Shape 3: { data: [...] }
      if (Array.isArray(res?.data)) return res.data;
      return [];
    },
    enabled: !!storeId,
    staleTime: 1000 * 60 * 2,
    retry: false,
  });

  const invalidateInventory = () => {
    queryClient.invalidateQueries({ queryKey: [inventoryQueryKey, storeId] });
  };

  const createInventoryMutation = useMutation({
    mutationFn: createInventoryApi,
    onSuccess: () => {
      invalidateInventory();
      toast.success("Inventory record created successfully.");
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to create inventory record.",
      );
    },
  });

  const updateInventoryMutation = useMutation({
    mutationFn: ({ id, payload }) => updateInventoryApi(id, payload),
    onSuccess: () => {
      invalidateInventory();
      toast.success("Inventory record updated successfully.");
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to update inventory record.",
      );
    },
  });

  return {
    inventoryQuery: query,
    items: query.data?.items || [],
    total: query.data?.total || 0,
    pages: query.data?.pages || 1,
    currentPage: query.data?.page || 1,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,

    // kpiItems is always a flat array regardless of backend response shape
    kpiItems: kpiQuery.data || [],
    isLoadingKpis: kpiQuery.isLoading,

    createInventoryAsync: createInventoryMutation.mutateAsync,
    updateInventoryAsync: updateInventoryMutation.mutateAsync,
    isSaving:
      createInventoryMutation.isPending || updateInventoryMutation.isPending,
  };
};
