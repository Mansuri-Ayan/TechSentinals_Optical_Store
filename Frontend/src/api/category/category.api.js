import api from '../../lib/axios';

/**
 * Fetch all categories for the current admin.
 * @param {Object} params - Optional query params (e.g. { active_only: true })
 */
export const getCategoriesApi = async (params = {}) => {
  const response = await api.get('/categories/', { params });
  return response.data;
};

/**
 * Fetch subcategories for a specific category.
 * @param {number} categoryId
 * @param {Object} params - Optional query params
 */
export const getSubcategoriesApi = async (categoryId, params = {}) => {
  const response = await api.get(`/categories/${categoryId}/subcategories`, { params });
  return response.data;
};
