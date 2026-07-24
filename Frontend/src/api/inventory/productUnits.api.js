import api from '../../lib/axios';

export const getProductUnits = async (params) => {
    const response = await api.get("/inventory/product-units/", { params });
    return response.data;
};

export const lookupProductUnit = async (unitSku) => {
    const response = await api.get(`/inventory/product-units/lookup/${unitSku}`);
    return response.data;
};
