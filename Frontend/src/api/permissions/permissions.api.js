import api from "../../lib/axios";

// ── GET My Permissions ─────────────────────────────────────
export const getMyPermissionsApi = async () => {
  const { data } = await api.get("/permissions/me");
  return data;
};

// ── Role Defaults (Tier 2) ──────────────────────────────────
export const getRoleDefaultsApi = async (roleType) => {
  const { data } = await api.get(`/admin/permissions/role-defaults`, {
    params: { role_type: roleType }
  });
  return data;
};

export const updateRoleDefaultApi = async (roleType, permissionKey, isGranted) => {
  const { data } = await api.put(`/admin/permissions/role-defaults/${roleType}/${permissionKey}`, {
    is_granted: isGranted
  });
  return data;
};

export const clearRoleDefaultApi = async (roleType, permissionKey) => {
  const { data } = await api.delete(`/admin/permissions/role-defaults/${roleType}/${permissionKey}`);
  return data;
};

// ── Staff List ──────────────────────────────────────────────
export const getStaffListApi = async () => {
  const { data } = await api.get("/admin/permissions/staff");
  return data;
};

// ── Staff Overrides (Tier 3) ────────────────────────────────
export const getStaffPermissionsApi = async (userType, userId) => {
  const { data } = await api.get(`/admin/permissions/staff/${userType}/${userId}`);
  return data;
};

export const updateStaffPermissionApi = async (userType, userId, permissionKey, isGranted) => {
  const { data } = await api.put(`/admin/permissions/staff/${userType}/${userId}/${permissionKey}`, {
    is_granted: isGranted
  });
  return data;
};

export const clearStaffPermissionApi = async (userType, userId, permissionKey) => {
  const { data } = await api.delete(`/admin/permissions/staff/${userType}/${userId}/${permissionKey}`);
  return data;
};
