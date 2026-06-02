import api from '../../lib/axios';

export const getStoresApi = async () => {
  const response = await api.get('/stores/');
  return response.data;
};

export const createStoreApi = async (payload) => {
  const response = await api.post('/stores/', payload);
  return response.data;
};
