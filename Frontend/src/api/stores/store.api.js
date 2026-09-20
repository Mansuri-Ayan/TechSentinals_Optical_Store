import api from '../../lib/axios';

export const getStoresApi = async (params) => {
  const response = await api.get('/stores/', { params });
  return response.data;
};

export const getStoreByIdApi = async (id) => {
  const response = await api.get(`/stores/${id}`);
  return response.data;
};

export const getStoreOverviewApi = async (id) => {
  const response = await api.get(`/stores/${id}/overview`);
  return response.data;
};

export const getStoreStaffApi = async (id, params) => {
  const response = await api.get(`/stores/${id}/staff`, { params });
  return response.data;
};

export const getStoreInventoryApi = async (id, params) => {
  const response = await api.get('/inventory/', { params: { ...params, owner_type: 'STORE', owner_id: id } });
  return response.data;
};

export const getStoreSuppliersApi = async (id, params) => {
  const response = await api.get('/suppliers/', { params: { ...params, store_id: id } });
  return response.data;
};

export const getStoreCustomersApi = async (id, params) => {
  const response = await api.get('/customers/', { params: { ...params, store_id: id } });
  return response.data;
};

export const getStoreSalesApi = async (id, params) => {
  const response = await api.get('/sales/', { params: { ...params, store_id: id } });
  return response.data;
};

export const getStoreExpensesApi = async (id, params) => {
  const response = await api.get('/expenses/', { params: { ...params, store_id: id } });
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

export const setMainStoreApi = async (id) => {
  const response = await api.patch(`/stores/${id}/set-main`);
  return response.data;
};

export const getWarehouseInfoApi = async () => {
  const response = await api.get('/settings/warehouse-info');
  return response.data;
};

export const checkWarehouseStockApi = async () => {
  const response = await api.get('/settings/warehouse-stock-check');
  return response.data;
};

export const disableWarehouseApi = async (targetStoreId) => {
  const response = await api.post('/settings/disable-warehouse', { target_store_id: targetStoreId });
  return response.data;
};

export const enableWarehouseApi = async () => {
  const response = await api.patch('/settings/warehouse', { warehouse_enabled: true });
  return response.data;
};

