import api from '../../lib/axios';

/**
 * Fetch linked members for a customer
 */
export const getLinkedMembersApi = async (customerId) => {
  const response = await api.get(`/customers/${customerId}/links`);
  return response.data;
};

/**
 * Create a new link for a customer
 * payload can be { customer_id_2: int } OR { new_customer: { first_name, phone, ... } }
 */
export const createLinkedMemberApi = async (customerId, payload) => {
  const response = await api.post(`/customers/${customerId}/links`, payload);
  return response.data;
};

/**
 * Remove a link between two customers
 */
export const removeLinkedMemberApi = async (customerId, linkedId) => {
  const response = await api.delete(`/customers/${customerId}/links/${linkedId}`);
  return response.data;
};
