import api from '../../lib/axios';

/**
 * Fetch all registered Admins (paginated).
 */
export const getAdminsApi = async (params = {}) => {
  const response = await api.get('/superadmin/admins', { params });
  return response.data;
};

/**
 * Create a new Admin business.
 */
export const createAdminApi = async (payload) => {
  const response = await api.post('/superadmin/admins', payload);
  return response.data;
};

/**
 * Fetch detail of a single Admin.
 */
export const getAdminDetailApi = async (id) => {
  const response = await api.get(`/superadmin/admins/${id}`);
  return response.data;
};

/**
 * Update an existing Admin business.
 */
export const updateAdminApi = async (id, payload) => {
  const response = await api.put(`/superadmin/admins/${id}`, payload);
  return response.data;
};

/**
 * Soft-delete an Admin.
 */
export const deleteAdminApi = async (id) => {
  const response = await api.delete(`/superadmin/admins/${id}`);
  return response.data;
};

/**
 * Public register Admin.
 */
export const registerAdminPublicApi = async (payload) => {
  const response = await api.post('/auth/register/admin', payload);
  return response.data;
};
