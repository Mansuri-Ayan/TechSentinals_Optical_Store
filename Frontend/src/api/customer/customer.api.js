import api from '../../lib/axios';

/**
 * Fetch list of customers.
 * @param {Object} params - { search, store_id, active_only, limit, offset }
 */
export const getCustomersApi = async (params = {}) => {
  const response = await api.get('/customers/', { params });
  return response.data;
};

/**
 * Fetch a customer detail including prescriptions, orders, and compiled history.
 * @param {number|string} id - The customer ID.
 */
export const getCustomerApi = async (id) => {
  const response = await api.get(`/customers/${id}`);
  return response.data;
};

/**
 * Register a new customer.
 * @param {Object} payload
 */
export const createCustomerApi = async (payload) => {
  const response = await api.post('/customers/', payload);
  return response.data;
};

/**
 * Update customer details.
 * @param {number|string} id - The customer ID.
 * @param {Object} payload
 */
export const updateCustomerApi = async (id, payload) => {
  const response = await api.put(`/customers/${id}`, payload);
  return response.data;
};

/**
 * Delete a customer profile (soft-delete).
 * @param {number|string} id - The customer ID.
 */
export const deleteCustomerApi = async (id) => {
  const response = await api.delete(`/customers/${id}`);
  return response.data;
};

/**
 * Record a new eye exam prescription for a customer.
 * @param {Object} payload
 */
export const createPrescriptionApi = async (payload) => {
  const response = await api.post('/prescriptions/', payload);
  return response.data;
};

/**
 * Update a customer prescription record.
 * @param {number|string} id - The prescription ID.
 * @param {Object} payload
 */
export const updatePrescriptionApi = async (id, payload) => {
  const response = await api.put(`/prescriptions/${id}`, payload);
  return response.data;
};

/**
 * Add a payment to a customer order/sale transaction.
 * @param {number|string} saleId - The database sale ID.
 * @param {Object} payload - { amount, payment_method, reference_number, remarks }
 */
export const addSalePaymentApi = async (saleId, payload) => {
  const response = await api.post(`/sales/${saleId}/payments`, payload);
  return response.data;
};

/**
 * Update status/notes for a customer order/sale transaction.
 * @param {number|string} saleId - The database sale ID.
 * @param {Object} payload - { status, notes }
 */
export const updateSaleApi = async (saleId, payload) => {
  const response = await api.put(`/sales/${saleId}`, payload);
  return response.data;
};

/**
 * Log a manual order using a generic product.
 * @param {number|string} customerId - The customer ID.
 * @param {Object} payload - { order_date, frame_name, lens_type, status, amount }
 */
export const createManualOrderApi = async (customerId, payload) => {
  const response = await api.post(`/customers/${customerId}/orders`, payload);
  return response.data;
};
