import api from '../../lib/axios';

// ── Categories ────────────────────────────────────────────────

/**
 * Fetch categories for the current shopkeeper (paginated).
 */
export const getShopkeeperCategoriesApi = async (params = {}) => {
  const response = await api.get('/shopkeeper/categories/', { params });
  return response.data;
};

/**
 * Create a new category.
 */
export const createShopkeeperCategoryApi = async (payload) => {
  const response = await api.post('/shopkeeper/categories/', payload);
  return response.data;
};

/**
 * Update an existing category.
 */
export const updateShopkeeperCategoryApi = async (id, payload) => {
  const response = await api.put(`/shopkeeper/categories/${id}`, payload);
  return response.data;
};

/**
 * Soft-delete a category.
 */
export const deleteShopkeeperCategoryApi = async (id) => {
  const response = await api.delete(`/shopkeeper/categories/${id}`);
  return response.data;
};

// ── Subcategories ─────────────────────────────────────────────

/**
 * Fetch subcategories for a specific category (paginated).
 */
export const getShopkeeperSubcategoriesApi = async (categoryId, params = {}) => {
  const response = await api.get(`/shopkeeper/categories/${categoryId}/subcategories`, { params });
  return response.data;
};

/**
 * Create a subcategory under a category.
 */
export const createShopkeeperSubcategoryApi = async (categoryId, payload) => {
  const response = await api.post(`/shopkeeper/categories/${categoryId}/subcategories`, payload);
  return response.data;
};

/**
 * Update an existing subcategory.
 */
export const updateShopkeeperSubcategoryApi = async (id, payload) => {
  const response = await api.put(`/shopkeeper/categories/subcategories/${id}`, payload);
  return response.data;
};

/**
 * Soft-delete a subcategory.
 */
export const deleteShopkeeperSubcategoryApi = async (id) => {
  const response = await api.delete(`/shopkeeper/categories/subcategories/${id}`);
  return response.data;
};
