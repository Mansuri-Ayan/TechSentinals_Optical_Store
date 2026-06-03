import api from '../../lib/axios';

export const getWorkersByStoreApi = async (storeId, params) => {
  const response = await api.get(`/stores/${storeId}/workers`, { params });
  return response.data;
};

export const getManagersByStoreApi = async (storeId, params) => {
  const response = await api.get(`/stores/${storeId}/managers`, { params });
  return response.data;
};

export const getOpticiansByStoreApi = async (storeId, params) => {
  const response = await api.get(`/stores/${storeId}/opticians`, { params });
  return response.data;
};

export const getStoreStaffApi = async (storeId, params) => {
  const response = await api.get(`/stores/${storeId}/staff`, { params });
  return response.data;
};

export const createStaffApi = async ({ storeId, role, payload }) => {
  const response = await api.post(`/stores/${storeId}/${role}s`, payload);
  return { ...response.data, role };
};

export const updateStaffApi = async ({ role, id, payload }) => {
  const response = await api.put(`/stores/${role}s/${id}`, payload);
  return { ...response.data, role };
};

export const deleteStaffApi = async ({ role, id }) => {
  const response = await api.delete(`/stores/${role}s/${id}`);
  return response.data;
};
