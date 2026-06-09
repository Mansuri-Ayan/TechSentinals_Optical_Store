import api from '../../lib/axios';

/**
 * FETCH EXPENSES
 * Backend uses: store_id (required), page, page_size, search, category_id, is_approved, start_date, end_date
 */
export const getExpenses = (params) => api.get('/expenses/', { params });

/**
 * CREATE EXPENSE
 */
export const createExpense = (data) => api.post('/expenses/', data);

/**
 * UPDATE EXPENSE
 */
export const updateExpense = (id, data) => api.put(`/expenses/${id}`, data);

/**
 * DELETE EXPENSE
 */
export const deleteExpense = (id) => api.delete(`/expenses/${id}`);

/**
 * CATEGORIES
 */
export const getExpenseCategories = (store_id) => api.get('/expenses/categories/', { params: { store_id } });
export const createExpenseCategory = (data) => api.post('/expenses/categories/', data);
export const deleteExpenseCategory = (id) => api.delete(`/expenses/categories/${id}`);

/**
 * APPROVAL / REJECTION
 */
export const approveExpense = (id) => api.patch(`/expenses/${id}/approve`, { is_approved: true });
export const rejectExpense  = (id, reason) => api.patch(`/expenses/${id}/reject`, { reason });
