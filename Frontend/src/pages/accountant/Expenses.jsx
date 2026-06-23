import React, { useMemo, useState } from 'react';
import { Receipt } from 'lucide-react';
import { useTable } from '../../hooks/useTable';
import { MOCK_EXPENSES, ACCOUNTANT_STORES } from '../../data/accountantData';
import { useStoreStore } from '../../store/store';
import DataTable from '../../components/shared/DataTable';
import SearchBar from '../../components/shared/SearchBar';
import FilterBar from '../../components/shared/FilterBar';
import Pagination from '../../components/shared/Pagination';
import StatusBadge from '../../components/shared/StatusBadge';
import DetailDrawer from '../../components/shared/DetailDrawer';

const formatRupee = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const fmtDate = (d) =>
  d && d !== '—' ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const Expenses = () => {
  const { selectedStore } = useStoreStore();
  const [showFilters, setShowFilters] = useState(false);

  const branchFiltered = useMemo(() => {
    if (!selectedStore || selectedStore.id === 'all' || selectedStore.isAll) return MOCK_EXPENSES;
    return MOCK_EXPENSES.filter(e => e.storeName === selectedStore.store_name);
  }, [selectedStore]);

  const {
    search, setSearch, paginatedData, totalItems,
    currentPage, setCurrentPage, itemsPerPage,
    sortConfig, requestSort, filters, setFilter, clearFilters,
    detailItem, setDetailItem
  } = useTable({
    initialData: branchFiltered,
    searchKeys: ['title', 'category', 'storeName', 'expenseNo'],
    itemsPerPage: 10,
    initialSort: { key: 'date', direction: 'desc' }
  });

  const categories = useMemo(() => [...new Set(MOCK_EXPENSES.map(e => e.category))], []);
  const hasActiveFilters = !!(filters.status || filters.storeName || filters.category);

  const columns = [
    { key: 'title', header: 'Expense Title', sortable: true, render: (row) => <span className="font-bold text-slate-800">{row.title}</span> },
    { key: 'category', header: 'Category', sortable: true, render: (row) => <span className="bg-slate-50 text-slate-600 font-bold px-2.5 py-0.5 rounded-lg border border-slate-200/50 text-[11px]">{row.category}</span> },
    { key: 'storeName', header: 'Store', sortable: true },
    { key: 'amount', header: 'Amount', sortable: true, render: (row) => <span className="font-bold text-slate-800">{formatRupee(row.amount)}</span> },
    { key: 'date', header: 'Expense Date', sortable: true, render: (row) => fmtDate(row.date) },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <StatusBadge status={row.status} /> }
  ];

  const mobileCardRender = (row) => (
    <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm space-y-3 active:scale-[0.99] transition-transform cursor-pointer">
      <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Expense</p>
          <p className="font-bold text-slate-800 text-sm truncate">{row.title}</p>
        </div>
        <StatusBadge status={row.status} />
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-bold">Category</span>
        <span className="bg-slate-50 text-slate-600 font-bold px-2 py-0.5 rounded border border-slate-200/50 text-[11px]">{row.category}</span>
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-bold">Store</span>
        <span className="font-semibold text-slate-600">{row.storeName}</span>
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-bold">Date</span>
        <span className="font-semibold text-slate-600">{fmtDate(row.date)}</span>
      </div>
      <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100">
        <span className="text-slate-400 font-bold">Amount</span>
        <span className="font-black text-slate-800">{formatRupee(row.amount)}</span>
      </div>
    </div>
  );

  return (
    <div className="p-3 sm:p-5 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans space-y-4 sm:space-y-6 min-w-0 overflow-x-hidden">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0" />
          <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Expenses</h1>
        </div>
        <p className="text-slate-500 text-[11px] sm:text-xs lg:text-sm font-semibold">Track all operating expenses across branches.</p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search expenses, categories..." />
          <FilterBar showFilters={showFilters} onToggle={() => setShowFilters(!showFilters)} onClear={clearFilters} hasActiveFilters={hasActiveFilters}>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Store</label>
              <select value={filters.storeName || ''} onChange={e => setFilter('storeName', e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10">
                <option value="">All Stores</option>
                {ACCOUNTANT_STORES.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
              <select value={filters.category || ''} onChange={e => setFilter('category', e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10">
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
              <select value={filters.status || ''} onChange={e => setFilter('status', e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10">
                <option value="">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </FilterBar>
        </div>
      </div>

      <DataTable columns={columns} data={paginatedData} onRowClick={(row) => setDetailItem(row)} sortConfig={sortConfig} onSort={requestSort} emptyTitle="No expenses found" emptyDescription="Try adjusting your search or filter criteria." mobileCardRender={mobileCardRender} />
      <Pagination totalItems={totalItems} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} />

      <DetailDrawer isOpen={!!detailItem} onClose={() => setDetailItem(null)} title="Expense Details">
        {detailItem && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailField label="Expense No" value={detailItem.expenseNo} />
              <DetailField label="Title" value={detailItem.title} />
              <DetailField label="Category" value={detailItem.category} />
              <DetailField label="Store" value={detailItem.storeName} />
              <DetailField label="Date" value={fmtDate(detailItem.date)} />
              <DetailField label="Payment Method" value={detailItem.paymentMethod} />
            </div>
            <hr className="border-slate-100" />
            <DetailField label="Amount" value={formatRupee(detailItem.amount)} highlight />
            <DetailField label="Description" value={detailItem.description} />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
              <StatusBadge status={detailItem.status} />
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};

const DetailField = ({ label, value, highlight }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
    <p className={`text-sm font-bold break-words ${highlight ? 'text-emerald-700' : 'text-slate-800'}`}>{value || '—'}</p>
  </div>
);

export default Expenses;
