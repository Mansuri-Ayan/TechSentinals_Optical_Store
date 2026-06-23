import api from "../../lib/axios";


export const loyaltyApi = {
  // --- ADMIN ENDPOINTS (Require storeId) ---
  
  getAdminLoyaltyConfig: async (storeId) => {
    const res = await api.get(`/admin/store/${storeId}/loyalty/config`);
    return res.data;
  },
  
  updateAdminLoyaltyConfig: async (storeId, payload) => {
    const res = await api.put(`/admin/store/${storeId}/loyalty/config`, payload);
    return res.data;
  },
  
  getAdminLoyaltyCategories: async (storeId) => {
    const res = await api.get(`/admin/store/${storeId}/loyalty/categories`);
    return res.data;
  },
  
  updateAdminLoyaltyCategory: async (storeId, categoryId, payload) => {
    const res = await api.put(`/admin/store/${storeId}/loyalty/categories/${categoryId}`, payload);
    return res.data;
  },
  
  getAdminLoyaltyStats: async (storeId) => {
    const res = await api.get(`/admin/store/${storeId}/loyalty/stats`);
    return res.data;
  },
  
  getAdminLoyaltyTrends: async (storeId) => {
    const res = await api.get(`/admin/store/${storeId}/loyalty/trends`);
    return res.data;
  },
  
  getAdminLoyaltyTierDistribution: async (storeId) => {
    const res = await api.get(`/admin/store/${storeId}/loyalty/tier-distribution`);
    return res.data;
  },
  
  getAdminLoyaltyCustomers: async (storeId, params) => {
    const res = await api.get(`/admin/store/${storeId}/loyalty/customers`, { params });
    return res.data;
  },

  getAdminLoyaltyCustomerDetail: async (storeId, customerId) => {
    const url = storeId === 'admin' 
      ? `/admin/loyalty/customers/${customerId}`
      : `/admin/store/${storeId}/loyalty/customers/${customerId}`;
    const res = await api.get(url);
    return res.data;
  },
  
  adjustAdminLoyaltyPoints: async (storeId, payload) => {
    const res = await api.post(`/admin/store/${storeId}/loyalty/adjust`, payload);
    return res.data;
  },

  // --- ADMIN AGGREGATED ENDPOINTS (No storeId — all stores) ---

  getAdminLoyaltyConfigsAll: async () => {
    const res = await api.get(`/admin/loyalty/configs`);
    return res.data;
  },

  getAdminLoyaltyStatsAll: async () => {
    const res = await api.get(`/admin/loyalty/stats`);
    return res.data;
  },

  getAdminLoyaltyTrendsAll: async () => {
    const res = await api.get(`/admin/loyalty/trends`);
    return res.data;
  },

  getAdminLoyaltyTierDistributionAll: async () => {
    const res = await api.get(`/admin/loyalty/tier-distribution`);
    return res.data;
  },

  getAdminLoyaltyCustomersAll: async (params) => {
    const res = await api.get(`/admin/loyalty/customers`, { params });
    return res.data;
  },

  // --- SHOPKEEPER ENDPOINTS (storeId inferred from JWT) ---

  getShopkeeperLoyaltyConfig: async () => {
    const res = await api.get(`/shopkeeper/loyalty/config`);
    return res.data;
  },
  
  updateShopkeeperLoyaltyConfig: async (payload) => {
    const res = await api.put(`/shopkeeper/loyalty/config`, payload);
    return res.data;
  },
  
  getShopkeeperLoyaltyCategories: async () => {
    const res = await api.get(`/shopkeeper/loyalty/categories`);
    return res.data;
  },
  
  updateShopkeeperLoyaltyCategory: async (categoryId, payload) => {
    const res = await api.put(`/shopkeeper/loyalty/categories/${categoryId}`, payload);
    return res.data;
  },
  
  getShopkeeperLoyaltyStats: async () => {
    const res = await api.get(`/shopkeeper/loyalty/stats`);
    return res.data;
  },
  
  getShopkeeperLoyaltyTrends: async () => {
    const res = await api.get(`/shopkeeper/loyalty/trends`);
    return res.data;
  },
  
  getShopkeeperLoyaltyTierDistribution: async () => {
    const res = await api.get(`/shopkeeper/loyalty/tier-distribution`);
    return res.data;
  },
  
  getShopkeeperLoyaltyCustomers: async (params) => {
    const res = await api.get(`/shopkeeper/loyalty/customers`, { params });
    return res.data;
  },

  getShopkeeperLoyaltyCustomerDetail: async (customerId) => {
    const res = await api.get(`/shopkeeper/loyalty/customers/${customerId}`);
    return res.data;
  },
  
  adjustShopkeeperLoyaltyPoints: async (payload) => {
    const res = await api.post(`/shopkeeper/loyalty/adjust`, payload);
    return res.data;
  },

  calculateLoyaltyPreview: async (payload) => {
    const res = await api.post(`/shopkeeper/loyalty/calculate-preview`, payload);
    return res.data;
  }
};
