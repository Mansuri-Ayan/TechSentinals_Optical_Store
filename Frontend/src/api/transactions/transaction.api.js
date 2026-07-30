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

export const approveTransactionApi = async (id) => {
  const response = await api.put(`/api/transactions/${id}/approve`);
  return response.data;
};

export const rejectTransactionApi = async (id, payload) => {
  const response = await api.put(`/api/transactions/${id}/reject`, payload);
  return response.data;
};

export const createManagerRequestApi = async (payload) => {
  const response = await api.post('/api/shopkeeper/transactions/request', payload);
  return response.data;
};

export const createAdminRequestApi = async (payload) => {
  const response = await api.post('/api/transactions/request', payload);
  return response.data;
};

export const createManagerPushApi = async (payload) => {
  const response = await api.post('/api/shopkeeper/transactions/push', payload);
  return response.data;
};

export const createManagerPurchaseApi = async (payload) => {
  const response = await api.post('/api/shopkeeper/transactions/purchase', payload);
  return response.data;
};

export const createManagerDamageApi = async (payload) => {
  const response = await api.post('/api/shopkeeper/transactions/damage', payload);
  return response.data;
};

export const createManagerLossApi = async (payload) => {
  const response = await api.post('/api/shopkeeper/transactions/loss', payload);
  return response.data;
};

export const createManagerSaleApi = async (payload) => {
  const response = await api.post('/api/shopkeeper/transactions/sale', payload);
  return response.data;
};

export const createManagerReturnApi = async (payload) => {
  const response = await api.post('/api/shopkeeper/transactions/return', payload);
  return response.data;
};

export const getManagerTransactionsApi = async (params = {}) => {
  const response = await api.get('/api/shopkeeper/transactions/', { params });
  return response.data;
};

export const getNotificationsApi = async () => {
  const response = await api.get('/api/notifications/');
  return response.data;
};

export const markNotificationReadApi = async (id) => {
  const response = await api.put(`/api/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsReadApi = async () => {
  const response = await api.put('/api/notifications/read-all');
  return response.data;
};

export const getWarehouseTransactionsApi = async (params = {}) => {
  const response = await api.get('/api/transactions/warehouse', { params });
  return response.data;
};
