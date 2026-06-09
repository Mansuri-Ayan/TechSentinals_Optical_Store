import api from '../../lib/axios';

export const getStoresApi = async (params) => {
  const response = await api.get('/stores/', { params });
  return response.data;
};

export const createStoreApi = async (payload) => {
  const response = await api.post('/stores/', payload);
  return response.data;
};

export const updateStoreApi = async ({ id, payload }) => {
  const response = await api.put(`/stores/${id}/`, payload);
  return response.data;
};

export const deleteStoreApi = async (id) => {
  const response = await api.delete(`/stores/${id}/`);
  return response.data;
};
