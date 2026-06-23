import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loyaltyApi } from '../api/loyalty/loyalty.api';

// --- Helpers to map backend response to the shape the UI components expect ---

/** The backend returns: { total_customers, total_points_awarded, total_points_redeemed, ... }
 *  But the UI components expect: { total_customers_enrolled, lifetime_points_awarded, lifetime_points_redeemed, ... }
 */
const mapStats = (raw) => {
  if (!raw) return raw;
  return {
    ...raw,
    total_customers_enrolled: raw.total_customers ?? raw.total_customers_enrolled ?? 0,
    lifetime_points_awarded: raw.total_points_awarded ?? raw.lifetime_points_awarded ?? 0,
    lifetime_points_redeemed: raw.total_points_redeemed ?? raw.lifetime_points_redeemed ?? 0,
  };
};

/** The backend tier distribution is an array: [{tier: 'SILVER', count: N, percentage: P}, ...]
 *  But the UI components expect an object: { silver: N, gold: N, platinum: N }
 */
const mapTierDistribution = (raw) => {
  if (!raw) return raw;
  // If it's already an object with .silver etc, pass through
  if (!Array.isArray(raw)) return raw;
  const result = { silver: 0, gold: 0, platinum: 0 };
  for (const item of raw) {
    const tierKey = (item.tier || '').toLowerCase();
    if (tierKey in result) {
      result[tierKey] = item.count ?? 0;
    }
  }
  return result;
};

// --- CONFIG ---
export const useLoyaltyConfig = (storeId, role = 'shopkeeper') => {
  return useQuery({
    queryKey: ['loyaltyConfig', storeId, role],
    queryFn: () => role === 'admin' 
      ? loyaltyApi.getAdminLoyaltyConfig(storeId)
      : loyaltyApi.getShopkeeperLoyaltyConfig(),
    enabled: role === 'shopkeeper' || (!!storeId && storeId !== 'admin')
  });
};

export const useUpdateLoyaltyConfig = (storeId, role = 'shopkeeper') => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => role === 'admin'
      ? loyaltyApi.updateAdminLoyaltyConfig(storeId, payload)
      : loyaltyApi.updateShopkeeperLoyaltyConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyaltyConfig', storeId, role] });
    }
  });
};

// --- ADMIN ALL-STORES CONFIGS ---
export const useLoyaltyConfigsAll = () => {
  return useQuery({
    queryKey: ['loyaltyConfigsAll'],
    queryFn: () => loyaltyApi.getAdminLoyaltyConfigsAll(),
  });
};

// --- CATEGORIES ---
export const useLoyaltyCategories = (storeId, role = 'shopkeeper') => {
  return useQuery({
    queryKey: ['loyaltyCategories', storeId, role],
    queryFn: () => role === 'admin'
      ? loyaltyApi.getAdminLoyaltyCategories(storeId)
      : loyaltyApi.getShopkeeperLoyaltyCategories(),
    enabled: role === 'shopkeeper' || (!!storeId && storeId !== 'admin')
  });
};

export const useUpdateLoyaltyCategory = (storeId, role = 'shopkeeper') => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, payload }) => role === 'admin'
      ? loyaltyApi.updateAdminLoyaltyCategory(storeId, categoryId, payload)
      : loyaltyApi.updateShopkeeperLoyaltyCategory(categoryId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyaltyCategories', storeId, role] });
    }
  });
};

// --- STATS & CHARTS ---
export const useLoyaltyStats = (storeId, role = 'shopkeeper') => {
  const isAdminAll = role === 'admin' && storeId === 'admin';
  return useQuery({
    queryKey: ['loyaltyStats', storeId, role],
    queryFn: async () => {
      const raw = isAdminAll
        ? await loyaltyApi.getAdminLoyaltyStatsAll()
        : role === 'admin'
          ? await loyaltyApi.getAdminLoyaltyStats(storeId)
          : await loyaltyApi.getShopkeeperLoyaltyStats();
      return mapStats(raw);
    },
    enabled: role === 'shopkeeper' || !!storeId
  });
};

export const useLoyaltyTrends = (storeId, role = 'shopkeeper') => {
  const isAdminAll = role === 'admin' && storeId === 'admin';
  return useQuery({
    queryKey: ['loyaltyTrends', storeId, role],
    queryFn: async () => {
      const raw = isAdminAll
        ? await loyaltyApi.getAdminLoyaltyTrendsAll()
        : role === 'admin'
          ? await loyaltyApi.getAdminLoyaltyTrends(storeId)
          : await loyaltyApi.getShopkeeperLoyaltyTrends();
      // Backend returns array directly for aggregated, or {trends: [...]} for store-specific
      // Normalize to { trends: [...] } shape
      if (Array.isArray(raw)) return { trends: raw };
      return raw;
    },
    enabled: role === 'shopkeeper' || !!storeId
  });
};

export const useLoyaltyTierDistribution = (storeId, role = 'shopkeeper') => {
  const isAdminAll = role === 'admin' && storeId === 'admin';
  return useQuery({
    queryKey: ['loyaltyTierDistribution', storeId, role],
    queryFn: async () => {
      const raw = isAdminAll
        ? await loyaltyApi.getAdminLoyaltyTierDistributionAll()
        : role === 'admin'
          ? await loyaltyApi.getAdminLoyaltyTierDistribution(storeId)
          : await loyaltyApi.getShopkeeperLoyaltyTierDistribution();
      return mapTierDistribution(raw);
    },
    enabled: role === 'shopkeeper' || !!storeId
  });
};

// --- CUSTOMERS ---
export const useLoyaltyCustomers = (storeId, role = 'shopkeeper', params = {}) => {
  const isAdminAll = role === 'admin' && storeId === 'admin';
  return useQuery({
    queryKey: ['loyaltyCustomers', storeId, role, params],
    queryFn: () => {
      // Map page_size to limit for backend consistency
      const { page_size, ...rest } = params;
      const finalParams = { ...rest, limit: page_size };
      
      if (isAdminAll) return loyaltyApi.getAdminLoyaltyCustomersAll(finalParams);
      return role === 'admin'
        ? loyaltyApi.getAdminLoyaltyCustomers(storeId, finalParams)
        : loyaltyApi.getShopkeeperLoyaltyCustomers(finalParams);
    },
    enabled: role === 'shopkeeper' || !!storeId
  });
};

export const useLoyaltyCustomerDetail = (customerId, storeId, role = 'shopkeeper') => {
  return useQuery({
    queryKey: ['loyaltyCustomerDetail', customerId, storeId, role],
    queryFn: () => role === 'admin'
      ? loyaltyApi.getAdminLoyaltyCustomerDetail(storeId, customerId)
      : loyaltyApi.getShopkeeperLoyaltyCustomerDetail(customerId),
    enabled: !!customerId && (role === 'shopkeeper' || !!storeId)
  });
};

// --- ADJUST POINTS ---
export const useAdjustLoyaltyPoints = (storeId, role = 'shopkeeper') => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => role === 'admin'
      ? loyaltyApi.adjustAdminLoyaltyPoints(storeId, payload)
      : loyaltyApi.adjustShopkeeperLoyaltyPoints(payload),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['loyaltyCustomers', storeId, role] });
      queryClient.invalidateQueries({ queryKey: ['loyaltyStats', storeId, role] });
      queryClient.invalidateQueries({ queryKey: ['loyaltyTrends', storeId, role] });
      queryClient.invalidateQueries({ queryKey: ['loyaltyTierDistribution', storeId, role] });
    }
  });
};

// --- PREVIEW ---
export const useLoyaltyPreview = () => {
  return useMutation({
    mutationFn: (payload) => loyaltyApi.calculateLoyaltyPreview(payload)
  });
};
