import React, { useMemo, useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { useTable } from '../../hooks/useTable';
import { MOCK_REFUNDS, ACCOUNTANT_STORES } from '../../data/accountantData';
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

const Refunds = () => {
  const { selectedStore } = useStoreStore();
  const [showFilters, setShowFilters] = useState(false);

  const branchFiltered = useMemo(() => {
    if (!selectedStore || selectedStore.id === 'all' || selectedStore.isAll) return MOCK_REFUNDS;
    return MOCK_REFUNDS.filter(r => r.storeName === selectedStore.store_name);
  }, [selectedStore]);

  const {
    search, setSearch, paginatedData, totalItems,
    currentPage, setCurrentPage, itemsPerPage,
    sortConfig, requestSort, filters, setFilter, clearFilters,
    detailItem, setDetailItem
  } = useTable({
    initialData: branchFiltered,
    searchKeys: ['refundNo', 'customerName', 'invoiceNo', 'reason'],
    itemsPerPage: 10,
    initialSort: { key: 'date', direction: 'desc' }
  });

  const hasActiveFilters = !!(filters.status || filters.storeName);

  const columns = [
    { key: 'refundNo', header: 'Refund Number', sortable: true, render: (row) => <span className="font-bold text-slate-800 font-mono text-xs">{row.refundNo}</span> },
    { key: 'customerName', header: 'Customer', sortable: true, render: (row) => <span className="font-semibold text-slate-700">{row.customerName}</span> },
    { key: 'invoiceNo', header: 'Invoice', sortable: true, render: (row) => <span className="font-mono text-xs font-bold text-slate-600">{row.invoiceNo}</span> },
    { key: 'refundAmount', header: 'Refund Amount', sortable: true, render: (row) => <span className="font-bold text-rose-600">{formatRupee(row.refundAmount)}</span> },
    { key: 'reason', header: 'Reason', sortable: false, render: (row) => <span className="text-slate-600 text-xs truncate max-w-[200px] block">{row.reason}</span> },
    { key: 'date', header: 'Date', sortable: true, render: (row) => fmtDate(row.date) },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <StatusBadge status={row.status} /> }
  ];

  const mobileCardRender = (row) => (
    <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm space-y-3 active:scale-[0.99] transition-transform cursor-pointer">
      <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Refund</p>
          <p className="font-bold text-slate-800 text-sm font-mono truncate">{row.refundNo}</p>
        </div>
        <StatusBadge status={row.status} />
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-bold">Customer</span>
        <span className="font-semibold text-slate-700 truncate ml-2">{row.customerName}</span>
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-bold">Invoice</span>
        <span className="font-mono font-bold text-slate-600">{row.invoiceNo}</span>
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-bold">Date</span>
        <span className="font-semibold text-slate-600">{fmtDate(row.date)}</span>
      </div>
      <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100">
        <span className="text-slate-400 font-bold">Refund Amount</span>
        <span className="font-black text-rose-600">{formatRupee(row.refundAmount)}</span>
      </div>
      <p className="text-[11px] text-slate-500 font-medium leading-snug bg-slate-50 rounded-lg p-2 border border-slate-100">{row.reason}</p>
    </div>
  );

  return (
    <div className="p-3 sm:p-5 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans space-y-4 sm:space-y-6 min-w-0 overflow-x-hidden">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0" />
          <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Refunds & Adjustments</h1>
        </div>
        <p className="text-slate-500 text-[11px] sm:text-xs lg:text-sm font-semibold">Track all customer refunds, returns, and billing adjustments.</p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search refunds, customers..." />
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
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </FilterBar>
        </div>
      </div>

      <DataTable columns={columns} data={paginatedData} onRowClick={(row) => setDetailItem(row)} sortConfig={sortConfig} onSort={requestSort} emptyTitle="No refunds found" emptyDescription="No refund or adjustment records match your criteria." mobileCardRender={mobileCardRender} />
      <Pagination totalItems={totalItems} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} />

      <DetailDrawer isOpen={!!detailItem} onClose={() => setDetailItem(null)} title="Refund Details">
        {detailItem && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailField label="Refund No" value={detailItem.refundNo} />
              <DetailField label="Date" value={fmtDate(detailItem.date)} />
              <DetailField label="Customer" value={detailItem.customerName} />
              <DetailField label="Invoice No" value={detailItem.invoiceNo} />
              <DetailField label="Store" value={detailItem.storeName} />
              <DetailField label="Processed By" value={detailItem.processedBy} />
            </div>
            <hr className="border-slate-100" />
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Refund Amount" value={formatRupee(detailItem.refundAmount)} danger />
              <DetailField label="Refund Method" value={detailItem.method} />
            </div>
            <hr className="border-slate-100" />
            <DetailField label="Reason" value={detailItem.reason} />
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

export default Refunds;
