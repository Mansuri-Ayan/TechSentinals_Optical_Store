import api from '../../lib/axios';

/**
 * Fetch purchase orders for the authenticated admin/store.
 * Supports filters like supplier_id, store_id, include_nested, status, etc.
 */
export const getPurchaseOrdersApi = async (params = {}) => {
  const response = await api.get('/purchase-orders/', { params });
  return response.data;
};

/**
 * Create a new purchase order with draft status.
 */
export const createPurchaseOrderApi = async (payload) => {
  const response = await api.post('/purchase-orders/', payload);
  return response.data;
};

/**
 * Receive goods for a purchase order (updates inventory).
 */
export const receiveGoodsApi = async (poId, payload) => {
  const response = await api.post(`/purchase-orders/${poId}/receive`, payload);
  return response.data;
};

/**
 * Record a payment made to the supplier against a purchase order.
 */
export const recordSupplierPaymentApi = async (poId, payload) => {
  const response = await api.post(`/purchase-orders/${poId}/payments`, payload);
  return response.data;
};
