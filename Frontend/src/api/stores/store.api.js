import api from '../../lib/axios';

export const getStoresApi = async (params) => {
  const response = await api.get('/stores/', { params });
  return response.data;
};

export const createStoreApi = async (payload) => {
  const response = await api.post('/stores/', payload);
  return response.data;
};
