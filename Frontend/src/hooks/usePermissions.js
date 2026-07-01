import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  getMyPermissionsApi,
  getRoleDefaultsApi,
  updateRoleDefaultApi,
  clearRoleDefaultApi,
  getStaffListApi,
  getStaffPermissionsApi,
  updateStaffPermissionApi,
  clearStaffPermissionApi,
} from "../api/permissions/permissions.api";
import { useAuthStore } from "../store/store";

export const useMyPermissions = () => {
  const { user, isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ["permissions", "me"],
    queryFn: getMyPermissionsApi,
    enabled: isAuthenticated && !!user,
    staleTime: 1000 * 60 * 15, // 15 mins
  });
};

export const useHasPermission = (permissionKey) => {
  const { data } = useMyPermissions();
  const { user } = useAuthStore();
  
  if (user?.role === 'admin' || user?.role === 'super_admin') return true;
  
  // Format from API is: permissions[module] = [{key: 'customers:read', is_granted: true}, ...]
  // Wait, the API returns a dict of modules mapping to arrays of permissions?
  // Let's check how tier2/me.py formats it. In me.py, we have `permissions: permission_map`.
  // Wait, I should assume `data?.permissions?.[permissionKey]?.granted` as requested by user OR check if the data format is different.
  // Actually, I'll use the format the user provided in the prompt, or just `data?.permissions?.[permissionKey]?.granted ?? data?.permissions?.[permissionKey] ?? false`.
  // Let's write the exact code the user requested, but adding a fallback just in case the backend format is just `data?.permissions?.[permissionKey]` (boolean).
  
  const perm = data?.permissions?.[permissionKey];
  if (typeof perm === 'boolean') return perm;
  if (perm && typeof perm === 'object') return perm.granted ?? perm.is_granted ?? false;
  return false;
};

export const usePagePermissions = (permissionMap) => {
  const { data } = useMyPermissions();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  
  const result = {};
  for (const [key, permKey] of Object.entries(permissionMap)) {
    if (isAdmin) {
      result[key] = true;
      continue;
    }
    const perm = data?.permissions?.[permKey];
    if (typeof perm === 'boolean') {
      result[key] = perm;
    } else if (perm && typeof perm === 'object') {
      result[key] = perm.granted ?? perm.is_granted ?? false;
    } else {
      result[key] = false;
    }
  }
  return result;
};

export const usePermissions = () => {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  // 1. My Permissions Query (runs automatically if authenticated)
  const myPermissionsQuery = useMyPermissions();

  const hasPermission = (module, action) => {
    if (user?.role === "super_admin" || user?.role === "admin") return true; 
    
    if (!myPermissionsQuery.data) return false;
    const key = `${module}:${action}`;
    const perm = myPermissionsQuery.data.permissions?.[key];
    if (typeof perm === 'boolean') return perm;
    if (perm && typeof perm === 'object') return perm.granted ?? perm.is_granted ?? false;
    return false;
  };

  // 2. Role Defaults Queries (Tier 2)
  const useRoleDefaultsQuery = (roleType) => useQuery({
    queryKey: ["permissions", "role-defaults", roleType],
    queryFn: () => getRoleDefaultsApi(roleType),
    enabled: isAuthenticated && !!roleType && (user?.role === "admin" || user?.role === "super_admin"),
  });

  const updateRoleDefaultMutation = useMutation({
    mutationFn: ({ roleType, permissionKey, isGranted }) =>
      updateRoleDefaultApi(roleType, permissionKey, isGranted),
    onSuccess: (_, { roleType }) => {
      toast.success("Role default updated");
      queryClient.invalidateQueries({ queryKey: ["permissions", "role-defaults", roleType] });
      queryClient.invalidateQueries({ queryKey: ["permissions", "me"] });
    },
    onError: (error) => toast.error(error.response?.data?.detail || "Update failed"),
  });

  const clearRoleDefaultMutation = useMutation({
    mutationFn: ({ roleType, permissionKey }) =>
      clearRoleDefaultApi(roleType, permissionKey),
    onSuccess: (_, { roleType }) => {
      toast.success("Role default cleared");
      queryClient.invalidateQueries({ queryKey: ["permissions", "role-defaults", roleType] });
      queryClient.invalidateQueries({ queryKey: ["permissions", "me"] });
    },
    onError: (error) => toast.error(error.response?.data?.detail || "Clear failed"),
  });

  // 3. Staff List
  const staffListQuery = useQuery({
    queryKey: ["permissions", "staff-list"],
    queryFn: getStaffListApi,
    enabled: isAuthenticated && (user?.role === "admin" || user?.role === "super_admin"),
  });

  // 4. Staff Overrides (Tier 3)
  const useStaffPermissionsQuery = (userType, userId) => useQuery({
    queryKey: ["permissions", "staff", userType, userId],
    queryFn: () => getStaffPermissionsApi(userType, userId),
    enabled: isAuthenticated && !!userType && !!userId && (user?.role === "admin" || user?.role === "super_admin"),
  });

  const updateStaffPermissionMutation = useMutation({
    mutationFn: ({ userType, userId, permissionKey, isGranted }) =>
      updateStaffPermissionApi(userType, userId, permissionKey, isGranted),
    onSuccess: (_, { userType, userId }) => {
      toast.success("Staff permission updated");
      queryClient.invalidateQueries({ queryKey: ["permissions", "staff", userType, userId] });
      queryClient.invalidateQueries({ queryKey: ["permissions", "me"] });
    },
    onError: (error) => toast.error(error.response?.data?.detail || "Update failed"),
  });

  const clearStaffPermissionMutation = useMutation({
    mutationFn: ({ userType, userId, permissionKey }) =>
      clearStaffPermissionApi(userType, userId, permissionKey),
    onSuccess: (_, { userType, userId }) => {
      toast.success("Staff override cleared");
      queryClient.invalidateQueries({ queryKey: ["permissions", "staff", userType, userId] });
      queryClient.invalidateQueries({ queryKey: ["permissions", "me"] });
    },
    onError: (error) => toast.error(error.response?.data?.detail || "Clear failed"),
  });

  return {
    // Current User
    myPermissions: myPermissionsQuery.data || {},
    isLoadingMyPermissions: myPermissionsQuery.isPending,
    hasPermission,

    // Role Defaults
    useRoleDefaultsQuery,
    updateRoleDefault: updateRoleDefaultMutation.mutate,
    isUpdatingRoleDefault: updateRoleDefaultMutation.isPending,
    clearRoleDefault: clearRoleDefaultMutation.mutate,
    isClearingRoleDefault: clearRoleDefaultMutation.isPending,

    // Staff Info
    staffListQuery,
    useStaffPermissionsQuery,
    
    // Staff Overrides
    updateStaffPermission: updateStaffPermissionMutation.mutate,
    isUpdatingStaffPermission: updateStaffPermissionMutation.isPending,
    clearStaffPermission: clearStaffPermissionMutation.mutate,
    isClearingStaffPermission: clearStaffPermissionMutation.isPending,
  };
};
