import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  getAdminsApi,
  createAdminApi,
  getAdminDetailApi,
  updateAdminApi,
  deleteAdminApi,
  registerAdminPublicApi,
  getAdmin360OverviewApi,
  getAdminStoresApi,
  getAdminStaffApi,
  updateAdminStatusApi,
  impersonateAdminApi,
  getSuperAdminDashboardStatsApi,
  getSuperAdminDashboardRecentActivityApi,
  getAnalyticsOverviewApi,
  getAnalyticsRevenueTrendsApi,
  getAnalyticsPaymentMethodsApi,
  getAnalyticsTenantHealthApi,
  getAnalyticsGeographicApi,
  getAnalyticsCategoriesBrandsApi,
  getAnalyticsOperationalHealthApi,
  getAllStoresApi,
  toggleSuperAdminStoreStatusApi,
  getGlobalPermissionsMatrixApi,
  updateGlobalPermissionApi,
  syncTenantPermissionsApi,
  getSuperAdminProfileApi,
  updateSuperAdminProfileApi,
  changeSuperAdminPasswordApi,
  getSuperAdminSystemHealthApi,
} from '../api/superadmin/superadmin.api';
import { sendAdminOtpApi, verifyAdminOtpApi, checkAdminOtpStatusApi } from '../api/auth/auth.api';

export const adminsQueryKey = 'superadmin-admins';

export const useSuperAdmin = (filters = {}) => {
  const queryClient = useQueryClient();

  const params = {
    page: filters.page || 1,
    limit: filters.limit || 20,
    search: filters.search || undefined,
    status_filter: filters.status_filter || undefined,
  };

  const query = useQuery({
    queryKey: [adminsQueryKey, params],
    queryFn: () => getAdminsApi(params),
  });

  const createMutation = useMutation({
    mutationFn: createAdminApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [adminsQueryKey] });
      toast.success('Admin created successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to create admin');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateAdminApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [adminsQueryKey] });
      toast.success('Admin updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to update admin');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [adminsQueryKey] });
      toast.success('Admin deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to delete admin');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateAdminStatusApi(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [adminsQueryKey] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-tenant-360'] });
      toast.success(data?.message || 'Tenant status updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to update status');
    },
  });

  return {
    admins: query.data?.items || [],
    total: query.data?.total || 0,
    page: query.data?.page || 1,
    limit: query.data?.limit || 20,
    pages: query.data?.pages || 1,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,

    createAdminAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    updateAdminAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    deleteAdminAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,

    updateStatusAsync: statusMutation.mutateAsync,
    isUpdatingStatus: statusMutation.isPending,
  };
};

export const useAdminDetail = (adminId) => {
  return useQuery({
    queryKey: ['superadmin-admin-detail', adminId],
    queryFn: () => getAdminDetailApi(adminId),
    enabled: !!adminId,
  });
};

export const useTenant360 = (adminId) => {
  const queryClient = useQueryClient();

  const overviewQuery = useQuery({
    queryKey: ['superadmin-tenant-360', adminId],
    queryFn: () => getAdmin360OverviewApi(adminId),
    enabled: !!adminId,
  });

  const storesQuery = useQuery({
    queryKey: ['superadmin-tenant-stores', adminId],
    queryFn: () => getAdminStoresApi(adminId),
    enabled: !!adminId,
  });

  const staffQuery = useQuery({
    queryKey: ['superadmin-tenant-staff', adminId],
    queryFn: () => getAdminStaffApi(adminId),
    enabled: !!adminId,
  });

  const impersonateMutation = useMutation({
    mutationFn: () => impersonateAdminApi(adminId),
    onSuccess: (data) => {
      toast.success(data?.message || 'Launching impersonation session...');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to impersonate tenant');
    },
  });

  return {
    overview: overviewQuery.data,
    isLoadingOverview: overviewQuery.isLoading,
    stores: storesQuery.data?.stores || [],
    isLoadingStores: storesQuery.isLoading,
    staff: staffQuery.data?.staff || [],
    isLoadingStaff: staffQuery.isLoading,
    impersonateAsync: impersonateMutation.mutateAsync,
    isImpersonating: impersonateMutation.isPending,
    refetch: () => {
      overviewQuery.refetch();
      storesQuery.refetch();
      staffQuery.refetch();
    },
  };
};

export const useSuperAdminDashboard = () => {
  const statsQuery = useQuery({
    queryKey: ['superadmin-dashboard-stats'],
    queryFn: getSuperAdminDashboardStatsApi,
  });

  const activityQuery = useQuery({
    queryKey: ['superadmin-dashboard-activity'],
    queryFn: getSuperAdminDashboardRecentActivityApi,
  });

  return {
    stats: statsQuery.data,
    isLoadingStats: statsQuery.isLoading,
    recentActivity: activityQuery.data,
    isLoadingActivity: activityQuery.isLoading,
    refetch: () => {
      statsQuery.refetch();
      activityQuery.refetch();
    },
  };
};

export const useSuperAdminAnalytics = (days = 30) => {
  const overviewQuery = useQuery({
    queryKey: ['superadmin-analytics-overview', days],
    queryFn: () => getAnalyticsOverviewApi({ days }),
  });

  const revenueTrendsQuery = useQuery({
    queryKey: ['superadmin-analytics-revenue-trends', days],
    queryFn: () => getAnalyticsRevenueTrendsApi({ days, interval: days > 60 ? 'month' : 'day' }),
  });

  const paymentMethodsQuery = useQuery({
    queryKey: ['superadmin-analytics-payment-methods', days],
    queryFn: () => getAnalyticsPaymentMethodsApi({ days }),
  });

  const tenantHealthQuery = useQuery({
    queryKey: ['superadmin-analytics-tenant-health'],
    queryFn: getAnalyticsTenantHealthApi,
  });

  const geographicQuery = useQuery({
    queryKey: ['superadmin-analytics-geographic'],
    queryFn: getAnalyticsGeographicApi,
  });

  const categoriesQuery = useQuery({
    queryKey: ['superadmin-analytics-categories-brands'],
    queryFn: getAnalyticsCategoriesBrandsApi,
  });

  const operationalQuery = useQuery({
    queryKey: ['superadmin-analytics-operational-health'],
    queryFn: getAnalyticsOperationalHealthApi,
  });

  return {
    overview: overviewQuery.data,
    isLoadingOverview: overviewQuery.isLoading,

    revenueTrends: revenueTrendsQuery.data || [],
    isLoadingRevenueTrends: revenueTrendsQuery.isLoading,

    paymentMethods: paymentMethodsQuery.data || [],
    isLoadingPaymentMethods: paymentMethodsQuery.isLoading,

    tenantHealth: tenantHealthQuery.data,
    isLoadingTenantHealth: tenantHealthQuery.isLoading,

    geographic: geographicQuery.data,
    isLoadingGeographic: geographicQuery.isLoading,

    categoriesBrands: categoriesQuery.data,
    isLoadingCategoriesBrands: categoriesQuery.isLoading,

    operationalHealth: operationalQuery.data,
    isLoadingOperational: operationalQuery.isLoading,
  };
};

export const useSuperAdminStores = (filters = {}) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['superadmin-stores', filters],
    queryFn: () => getAllStoresApi(filters),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ storeId, isActive }) => toggleSuperAdminStoreStatusApi(storeId, isActive),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-stores'] });
      toast.success(data?.message || 'Store status updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to update store status');
    },
  });

  return {
    stores: query.data?.items || [],
    total: query.data?.total || 0,
    page: query.data?.page || 1,
    pages: query.data?.pages || 1,
    isLoading: query.isLoading,
    toggleStatusAsync: toggleStatusMutation.mutateAsync,
    isToggling: toggleStatusMutation.isPending,
  };
};

export const useGlobalPermissions = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['superadmin-global-permissions'],
    queryFn: getGlobalPermissionsMatrixApi,
  });

  const updateMutation = useMutation({
    mutationFn: updateGlobalPermissionApi,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-global-permissions'] });
      toast.success(data?.message || 'Global permission updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to update permission');
    },
  });

  const syncMutation = useMutation({
    mutationFn: syncTenantPermissionsApi,
    onSuccess: (data) => {
      toast.success(data?.message || 'Permissions synced to tenant successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to sync permissions');
    },
  });

  return {
    matrix: query.data,
    isLoading: query.isLoading,
    updatePermissionAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    syncTenantAsync: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending,
  };
};

export const useSuperAdminSettings = () => {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['superadmin-profile'],
    queryFn: getSuperAdminProfileApi,
  });

  const healthQuery = useQuery({
    queryKey: ['superadmin-health'],
    queryFn: getSuperAdminSystemHealthApi,
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateSuperAdminProfileApi,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-profile'] });
      toast.success(data?.message || 'Profile updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to update profile');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: changeSuperAdminPasswordApi,
    onSuccess: (data) => {
      toast.success(data?.message || 'Password changed successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to change password');
    },
  });

  return {
    profile: profileQuery.data,
    isLoadingProfile: profileQuery.isLoading,
    health: healthQuery.data,
    isLoadingHealth: healthQuery.isLoading,
    updateProfileAsync: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
    changePasswordAsync: changePasswordMutation.mutateAsync,
    isChangingPassword: changePasswordMutation.isPending,
  };
};

// ── Existing public registration & OTP hooks ───────────────────────────────────

export const useRegisterAdminPublic = () => {
  const mutation = useMutation({
    mutationFn: registerAdminPublicApi,
    onSuccess: () => {
      toast.success('Admin registration successful!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Registration failed.');
    },
  });

  return {
    registerAdminPublicAsync: mutation.mutateAsync,
    isRegistering: mutation.isPending,
  };
};

export const useSendAdminOtp = () => {
  const mutation = useMutation({
    mutationFn: sendAdminOtpApi,
    onSuccess: (res) => {
      if (res.already_sent) {
        toast.info(res.message || 'An active verification code has already been sent to your email.');
      } else {
        toast.success(res.message || 'Verification code sent to your email.');
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to send verification code.');
    },
  });

  return {
    sendAdminOtpAsync: mutation.mutateAsync,
    isSendingOtp: mutation.isPending,
  };
};

export const useVerifyAdminOtp = () => {
  const mutation = useMutation({
    mutationFn: verifyAdminOtpApi,
    onSuccess: (res) => {
      toast.success(res.message || 'Email verified successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Invalid or expired verification code.');
    },
  });

  return {
    verifyAdminOtpAsync: mutation.mutateAsync,
    isVerifyingOtp: mutation.isPending,
  };
};

export const useCheckAdminOtpStatus = () => {
  const mutation = useMutation({
    mutationFn: checkAdminOtpStatusApi,
  });

  return {
    checkAdminOtpStatusAsync: mutation.mutateAsync,
    isCheckingStatus: mutation.isPending,
  };
};
