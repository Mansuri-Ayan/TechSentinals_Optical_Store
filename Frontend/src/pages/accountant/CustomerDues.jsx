import React, { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTable } from '../../hooks/useTable';
import { MOCK_CUSTOMER_DUES, ACCOUNTANT_STORES } from '../../data/accountantData';
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

const CustomerDues = () => {
  const { selectedStore } = useStoreStore();
  const [showFilters, setShowFilters] = useState(false);

  const branchFiltered = useMemo(() => {
    if (!selectedStore || selectedStore.id === 'all' || selectedStore.isAll) return MOCK_CUSTOMER_DUES;
    return MOCK_CUSTOMER_DUES.filter(d => d.storeName === selectedStore.store_name);
  }, [selectedStore]);

  const {
    search, setSearch, paginatedData, totalItems,
    currentPage, setCurrentPage, itemsPerPage,
    sortConfig, requestSort, filters, setFilter, clearFilters,
    detailItem, setDetailItem
  } = useTable({
    initialData: branchFiltered,
    searchKeys: ['customerName', 'invoiceNo', 'storeName'],
    itemsPerPage: 10,
    initialSort: { key: 'dueDate', direction: 'asc' }
  });

  const hasActiveFilters = !!(filters.status || filters.storeName);

  const columns = [
    { key: 'customerName', header: 'Customer', sortable: true, render: (row) => <span className="font-bold text-slate-800">{row.customerName}</span> },
    { key: 'invoiceNo', header: 'Invoice', sortable: true, render: (row) => <span className="font-mono text-xs font-bold text-slate-700">{row.invoiceNo}</span> },
    { key: 'totalBill', header: 'Total Amount', sortable: true, render: (row) => <span className="font-semibold text-slate-700">{formatRupee(row.totalBill)}</span> },
    { key: 'paidAmount', header: 'Paid Amount', sortable: true, render: (row) => <span className="font-semibold text-emerald-600">{formatRupee(row.paidAmount)}</span> },
    { key: 'dueAmount', header: 'Due Amount', sortable: true, render: (row) => <span className="font-bold text-rose-600">{formatRupee(row.dueAmount)}</span> },
    { key: 'dueDate', header: 'Due Date', sortable: true, render: (row) => fmtDate(row.dueDate) },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <StatusBadge status={row.status} /> }
  ];

  const mobileCardRender = (row) => (
    <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm space-y-3 active:scale-[0.99] transition-transform cursor-pointer">
      <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Customer</p>
          <p className="font-bold text-slate-800 text-sm truncate">{row.customerName}</p>
        </div>
        <StatusBadge status={row.status} />
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-bold">Invoice</span>
        <span className="font-mono font-bold text-slate-700">{row.invoiceNo}</span>
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-bold">Due Date</span>
        <span className="font-semibold text-slate-600">{fmtDate(row.dueDate)}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
        <div>
          <p className="text-[9px] text-slate-400 font-bold">Total</p>
          <p className="text-xs font-bold text-slate-800">{formatRupee(row.totalBill)}</p>
        </div>
        <div>
          <p className="text-[9px] text-slate-400 font-bold">Paid</p>
          <p className="text-xs font-bold text-emerald-600">{formatRupee(row.paidAmount)}</p>
        </div>
        <div>
          <p className="text-[9px] text-slate-400 font-bold">Due</p>
          <p className="text-xs font-bold text-rose-600">{formatRupee(row.dueAmount)}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-3 sm:p-5 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans space-y-4 sm:space-y-6 min-w-0 overflow-x-hidden">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0" />
          <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Customer Dues</h1>
        </div>
        <p className="text-slate-500 text-[11px] sm:text-xs lg:text-sm font-semibold">Track outstanding customer payments and overdue invoices.</p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search customers, invoices..." />
          <FilterBar showFilters={showFilters} onToggle={() => setShowFilters(!showFilters)} onClear={clearFilters} hasActiveFilters={hasActiveFilters}>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Store</label>
              <select value={filters.storeName || ''} onChange={e => setFilter('storeName', e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10">
                <option value="">All Stores</option>
                {ACCOUNTANT_STORES.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
              <select value={filters.status || ''} onChange={e => setFilter('status', e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10">
                <option value="">All Statuses</option>
                <option value="Due">Due</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </FilterBar>
        </div>
      </div>

      <DataTable columns={columns} data={paginatedData} onRowClick={(row) => setDetailItem(row)} sortConfig={sortConfig} onSort={requestSort} emptyTitle="No customer dues found" emptyDescription="All customer balances are settled." mobileCardRender={mobileCardRender} />
      <Pagination totalItems={totalItems} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} />

      <DetailDrawer isOpen={!!detailItem} onClose={() => setDetailItem(null)} title="Customer Due Details">
        {detailItem && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailField label="Customer" value={detailItem.customerName} />
              <DetailField label="Invoice No" value={detailItem.invoiceNo} />
              <DetailField label="Phone" value={detailItem.phone} />
              <DetailField label="Email" value={detailItem.email} />
              <DetailField label="Store" value={detailItem.storeName} />
              <DetailField label="Due Date" value={fmtDate(detailItem.dueDate)} />
            </div>
            <hr className="border-slate-100" />
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Total Bill" value={formatRupee(detailItem.totalBill)} />
              <DetailField label="Paid Amount" value={formatRupee(detailItem.paidAmount)} />
              <DetailField label="Due Amount" value={formatRupee(detailItem.dueAmount)} danger />
              <DetailField label="Last Payment" value={fmtDate(detailItem.lastPaymentDate)} />
            </div>
            <hr className="border-slate-100" />
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

const DetailField = ({ label, value, danger }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
    <p className={`text-sm font-bold break-words ${danger ? 'text-rose-600' : 'text-slate-800'}`}>{value || '—'}</p>
  </div>
);

export default CustomerDues;
