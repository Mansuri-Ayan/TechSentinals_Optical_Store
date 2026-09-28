import api from '../../lib/axios';

// ── ADMIN BUSINESS (TENANT) MANAGEMENT ────────────────────────────────────────

export const getAdminsApi = async (params = {}) => {
  const response = await api.get('/superadmin/admins', { params });
  return response.data;
};

export const createAdminApi = async (payload) => {
  const response = await api.post('/superadmin/admins', payload);
  return response.data;
};

export const getAdminDetailApi = async (id) => {
  const response = await api.get(`/superadmin/admins/${id}`);
  return response.data;
};

export const updateAdminApi = async (id, payload) => {
  const response = await api.put(`/superadmin/admins/${id}`, payload);
  return response.data;
};

export const deleteAdminApi = async (id) => {
  const response = await api.delete(`/superadmin/admins/${id}`);
  return response.data;
};

export const registerAdminPublicApi = async (payload) => {
  const response = await api.post('/auth/register/admin', payload);
  return response.data;
};

export const getAdmin360OverviewApi = async (id) => {
  const response = await api.get(`/superadmin/admins/${id}/overview`);
  return response.data;
};

export const getAdminStoresApi = async (id) => {
  const response = await api.get(`/superadmin/admins/${id}/stores`);
  return response.data;
};

export const getAdminStaffApi = async (id) => {
  const response = await api.get(`/superadmin/admins/${id}/staff`);
  return response.data;
};

export const updateAdminStatusApi = async (id, status) => {
  const response = await api.patch(`/superadmin/admins/${id}/status`, { status });
  return response.data;
};

export const impersonateAdminApi = async (id) => {
  const response = await api.post(`/superadmin/admins/${id}/impersonate`);
  return response.data;
};

// ── PLATFORM DASHBOARD ────────────────────────────────────────────────────────

export const getSuperAdminDashboardStatsApi = async () => {
  const response = await api.get('/superadmin/dashboard/stats');
  return response.data;
};

export const getSuperAdminDashboardRecentActivityApi = async () => {
  const response = await api.get('/superadmin/dashboard/recent-activity');
  return response.data;
};

// ── PLATFORM ANALYTICS & INTELLIGENCE ──────────────────────────────────────────

export const getAnalyticsOverviewApi = async (params = {}) => {
  const response = await api.get('/superadmin/analytics/overview', { params });
  return response.data;
};

export const getAnalyticsRevenueTrendsApi = async (params = {}) => {
  const response = await api.get('/superadmin/analytics/revenue-trends', { params });
  return response.data;
};

export const getAnalyticsPaymentMethodsApi = async (params = {}) => {
  const response = await api.get('/superadmin/analytics/payment-methods', { params });
  return response.data;
};

export const getAnalyticsTenantHealthApi = async () => {
  const response = await api.get('/superadmin/analytics/tenant-health');
  return response.data;
};

export const getAnalyticsGeographicApi = async () => {
  const response = await api.get('/superadmin/analytics/geographic');
  return response.data;
};

export const getAnalyticsCategoriesBrandsApi = async () => {
  const response = await api.get('/superadmin/analytics/categories-brands');
  return response.data;
};

export const getAnalyticsOperationalHealthApi = async () => {
  const response = await api.get('/superadmin/analytics/operational-health');
  return response.data;
};

// ── CROSS-TENANT STORES DIRECTORY ─────────────────────────────────────────────

export const getAllStoresApi = async (params = {}) => {
  const response = await api.get('/superadmin/stores', { params });
  return response.data;
};

export const toggleSuperAdminStoreStatusApi = async (id, is_active) => {
  const response = await api.patch(`/superadmin/stores/${id}/status`, { is_active });
  return response.data;
};

// ── GLOBAL ROLE PERMISSIONS ───────────────────────────────────────────────────

export const getGlobalPermissionsMatrixApi = async () => {
  const response = await api.get('/superadmin/permissions/global');
  return response.data;
};

export const updateGlobalPermissionApi = async (payload) => {
  const response = await api.put('/superadmin/permissions/global', payload);
  return response.data;
};

export const syncTenantPermissionsApi = async (adminId) => {
  const response = await api.post(`/superadmin/permissions/sync-tenant/${adminId}`);
  return response.data;
};

// ── SUPERADMIN SETTINGS & HEALTH ──────────────────────────────────────────────

export const getSuperAdminProfileApi = async () => {
  const response = await api.get('/superadmin/settings/profile');
  return response.data;
};

export const updateSuperAdminProfileApi = async (payload) => {
  const response = await api.put('/superadmin/settings/profile', payload);
  return response.data;
};

export const changeSuperAdminPasswordApi = async (payload) => {
  const response = await api.post('/superadmin/settings/change-password', payload);
  return response.data;
};

export const getSuperAdminSystemHealthApi = async () => {
  const response = await api.get('/superadmin/settings/system-health');
  return response.data;
};
