import api from '../../lib/axios';

export const getTransactionsApi = async (params = {}) => {
  const response = await api.get('/transfers/history', { params });
  return response.data;
};

export const createTransferApi = async (payload) => {
  const response = await api.post('/transfers/transfer', payload);
  return response.data;
};

export const createPurchaseApi = async (payload) => {
  const response = await api.post('/transfers/purchase', payload);
  return response.data;
};

export const createDamageApi = async (payload) => {
  const response = await api.post('/transfers/damage', payload);
  return response.data;
};

export const createLossApi = async (payload) => {
  const response = await api.post('/transfers/loss', payload);
  return response.data;
};

export const createSaleApi = async (payload) => {
  const response = await api.post('/transfers/sale', payload);
  return response.data;
};

export const createReturnApi = async (payload) => {
  const response = await api.post('/transfers/return', payload);
  return response.data;
};
