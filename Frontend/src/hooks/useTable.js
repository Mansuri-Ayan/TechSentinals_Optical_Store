import { useState, useMemo, useEffect } from 'react';

export const useTable = ({
  initialData = [],
  searchKeys = [],
  itemsPerPage = 10,
  initialSort = { key: '', direction: 'asc' },
  initialFilters = {}
}) => {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState(initialSort);

  // Modals & Drawer State
  const [detailItem, setDetailItem] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);

  // Sync state if initialData changes
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filters]);

  // Filter a single value
  const setFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setSearch('');
    setCurrentPage(1);
  };

  // Toggle sorting
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Perform search, filter, and sort
  const processedData = useMemo(() => {
    let result = [...data];

    // 1. Apply Search
    if (search.trim() !== '' && searchKeys.length > 0) {
      const query = search.toLowerCase().trim();
      result = result.filter(item => {
        return searchKeys.some(key => {
          const val = item[key];
          if (val === undefined || val === null) return false;
          return String(val).toLowerCase().includes(query);
        });
      });
    }

    // 2. Apply Filters
    Object.keys(filters).forEach(key => {
      const filterValue = filters[key];
      if (filterValue !== undefined && filterValue !== null && filterValue !== '') {
        result = result.filter(item => {
          const itemValue = item[key];
          if (itemValue === undefined || itemValue === null) return false;

          // Date ranges
          if (key === 'startDate') {
            return new Date(item.date || item.dueDate) >= new Date(filterValue);
          }
          if (key === 'endDate') {
            return new Date(item.date || item.dueDate) <= new Date(filterValue);
          }

          // Strict match or string representation match
          return String(itemValue).toLowerCase() === String(filterValue).toLowerCase();
        });
      }
    });

    // 3. Apply Sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        const aString = String(aValue).toLowerCase();
        const bString = String(bValue).toLowerCase();

        if (aString < bString) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aString > bString) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [data, search, filters, searchKeys, sortConfig]);

  // Pagination calculations
  const totalItems = processedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedData.slice(startIndex, startIndex + itemsPerPage);
  }, [processedData, currentPage, itemsPerPage]);

  return {
    // Data lists
    data,
    setData,
    processedData,
    paginatedData,
    totalItems,

    // Search
    search,
    setSearch,

    // Filters
    filters,
    setFilter,
    clearFilters,

    // Pagination
    currentPage,
    setCurrentPage,
    totalPages,
    itemsPerPage,

    // Sorting
    sortConfig,
    requestSort,

    // Detail drawer state
    detailItem,
    setDetailItem,

    // Modals state
    isFormOpen,
    setIsFormOpen,
    isConfirmOpen,
    setIsConfirmOpen,
    activeItem,
    setActiveItem
  };
};
