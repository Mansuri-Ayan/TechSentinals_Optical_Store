import { useState, useEffect, useCallback } from 'react';
import { 
  getExpenses, 
  getExpenseCategories 
} from '../api/expense/expense.api';

/**
 * Hook to manage expenses list with pagination and filters.
 */
export const useExpenses = ({ 
  store_id, 
  page = 1, 
  page_size = 10, 
  category_id, 
  start_date, 
  end_date, 
  search 
}) => {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchExpenses = useCallback(async () => {
    if (!store_id) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        owner_type: 'STORE',
        owner_id: store_id,
        page,
        limit: page_size,
        category_id: category_id || undefined,
        start_date: start_date || undefined,
        end_date: end_date || undefined,
        search: search || undefined
      };
      
      const data = await getExpenses(params);
      setExpenses(data.items);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
      setError(err.message || 'Failed to fetch expenses');
    } finally {
      setIsLoading(false);
    }
  }, [store_id, page, page_size, category_id, start_date, end_date, search]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return {
    expenses,
    total,
    totalPages,
    isLoading,
    error,
    refetch: fetchExpenses
  };
};

/**
 * Hook to fetch expense categories for a store.
 */
export const useExpenseCategories = (store_id) => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    if (!store_id) return;
    
    setIsLoading(true);
    try {
      const data = await getExpenseCategories(store_id);
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch expense categories:', err);
      setError(err.message || 'Failed to fetch categories');
    } finally {
      setIsLoading(false);
    }
  }, [store_id]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    isLoading,
    error,
    refetch: fetchCategories
  };
};
