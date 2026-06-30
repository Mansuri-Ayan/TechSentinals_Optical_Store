import api from '../../lib/axios';

export const getLabsApi = async (params = {}) => {
  const response = await api.get('/labs/', { params });
  return response.data;
};

export const createLabApi = async (payload) => {
  const response = await api.post('/labs/', payload);
  return response.data;
};

export const updateLabApi = async (id, payload) => {
  const response = await api.put(`/labs/${id}`, payload);
  return response.data;
};

export const deleteLabApi = async (id) => {
  await api.delete(`/labs/${id}`);
};

export const getLabOrdersApi = async (id, params = {}) => {
  const response = await api.get(`/labs/${id}/orders`, { params });
  return response.data;
};
