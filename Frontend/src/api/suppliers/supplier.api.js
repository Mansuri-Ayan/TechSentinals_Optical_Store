import api from '../../lib/axios';

export const getSuppliersApi = async (params = {}) => {
  const response = await api.get('/suppliers/', { params });
  return response.data;
};

export const createSupplierApi = async (payload) => {
  const response = await api.post('/suppliers/', payload);
  return response.data;
};

export const updateSupplierApi = async (id, payload) => {
  const response = await api.put(`/suppliers/${id}`, payload);
  return response.data;
};

export const deleteSupplierApi = async (id) => {
  await api.delete(`/suppliers/${id}`);
};

export const linkSupplierToStoreApi = async (supplierId, payload) => {
  const response = await api.post(`/suppliers/${supplierId}/stores`, payload);
  return response.data;
};

export const getSupplierByIdApi = async (id) => {
  const response = await api.get(`/suppliers/${id}`);
  return response.data;
};

export const getSupplierProductsApi = async (supplierId) => {
  const response = await api.get(`/suppliers/${supplierId}/products`);
  return response.data;
};

export const addSupplierProductApi = async (supplierId, payload) => {
  const response = await api.post(`/suppliers/${supplierId}/products`, payload);
  return response.data;
};

export const updateSupplierProductApi = async (supplierId, spId, payload) => {
  const response = await api.put(`/suppliers/${supplierId}/products/${spId}`, payload);
  return response.data;
};
