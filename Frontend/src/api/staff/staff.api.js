import api from '../../lib/axios';

export const getWorkersByStoreApi = async (storeId) => {
  const response = await api.get(`/stores/${storeId}/workers`);
  return response.data;
};

export const getManagersByStoreApi = async (storeId) => {
  const response = await api.get(`/stores/${storeId}/managers`);
  return response.data;
};

export const getOpticiansByStoreApi = async (storeId) => {
  const response = await api.get(`/stores/${storeId}/opticians`);
  return response.data;
};

export const getStoreStaffApi = async (storeId) => {
  const [workers, managers, opticians] = await Promise.all([
    getWorkersByStoreApi(storeId),
    getManagersByStoreApi(storeId),
    getOpticiansByStoreApi(storeId),
  ]);

  return [
    ...workers.map((person) => ({ ...person, role: 'worker' })),
    ...managers.map((person) => ({ ...person, role: 'manager' })),
    ...opticians.map((person) => ({ ...person, role: 'optician' })),
  ];
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
