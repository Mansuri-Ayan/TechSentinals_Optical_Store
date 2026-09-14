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

/**
 * Fetch PO invoice JSON including HTML content.
 */
export const getPOInvoiceApi = async (poId) => {
  const response = await api.get(`/purchase-orders/${poId}/invoice`);
  return response.data;
};

/**
 * Download PO invoice PDF file.
 */
export const downloadPOInvoiceApi = async (poId, poNumber, isFinal = false) => {
  const response = await api.get(`/purchase-orders/${poId}/invoice/download`, {
    responseType: 'blob',
  });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const prefix = isFinal ? 'Final_Purchase_Invoice' : 'Temporary_Purchase_Invoice';
  const fileName = `${prefix}_${poNumber || poId}.pdf`;
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

