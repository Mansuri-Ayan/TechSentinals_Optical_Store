import api from '../../lib/axios';

export const getBillSettingsAdmin = async (storeId) => {
  return await api.get(`/bill-settings/admin/store/${storeId}`);
};

export const updateBillSettingsAdmin = async (storeId, payload) => {
  return await api.put(`/bill-settings/admin/store/${storeId}`, payload);
};

export const getBillSettingsShopkeeper = async () => {
  return await api.get(`/bill-settings/shopkeeper`);
};

export const updateBillSettingsShopkeeper = async (payload) => {
  return await api.put(`/bill-settings/shopkeeper`, payload);
};
