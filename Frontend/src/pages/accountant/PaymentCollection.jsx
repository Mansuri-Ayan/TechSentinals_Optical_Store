import React, { useMemo, useState } from 'react';
import { Coins } from 'lucide-react';
import { useTable } from '../../hooks/useTable';
import { MOCK_PAYMENT_COLLECTIONS, ACCOUNTANT_STORES } from '../../data/accountantData';
import { useStoreStore } from '../../store/store';
import DataTable from '../../components/shared/DataTable';
import SearchBar from '../../components/shared/SearchBar';
import FilterBar from '../../components/shared/FilterBar';
import Pagination from '../../components/shared/Pagination';
import DetailDrawer from '../../components/shared/DetailDrawer';

const formatRupee = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const fmtDate = (d) =>
  d && d !== '—' ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const PaymentCollection = () => {
  const { selectedStore } = useStoreStore();
  const [showFilters, setShowFilters] = useState(false);

  const branchFiltered = useMemo(() => {
    if (!selectedStore || selectedStore.id === 'all' || selectedStore.isAll) return MOCK_PAYMENT_COLLECTIONS;
    return MOCK_PAYMENT_COLLECTIONS.filter(p => p.storeName === selectedStore.store_name);
  }, [selectedStore]);

  const validPayments = useMemo(() => branchFiltered.filter(p => p.paymentAmount > 0), [branchFiltered]);

  const {
    search, setSearch, paginatedData, totalItems,
    currentPage, setCurrentPage, itemsPerPage,
    sortConfig, requestSort, filters, setFilter, clearFilters,
    detailItem, setDetailItem
  } = useTable({
    initialData: validPayments,
    searchKeys: ['customerName', 'invoiceNo', 'collectedBy', 'paymentMethod'],
    itemsPerPage: 10,
    initialSort: { key: 'paymentDate', direction: 'desc' }
  });

  const hasActiveFilters = !!(filters.paymentMethod || filters.storeName);
  const methods = useMemo(() => [...new Set(MOCK_PAYMENT_COLLECTIONS.filter(p => p.paymentMethod !== '—').map(p => p.paymentMethod))], []);

  const columns = [
    { key: 'customerName', header: 'Customer', sortable: true, render: (row) => <span className="font-bold text-slate-800">{row.customerName}</span> },
    { key: 'invoiceNo', header: 'Invoice', sortable: true, render: (row) => <span className="font-mono text-xs font-bold text-slate-700">{row.invoiceNo}</span> },
    { key: 'paymentAmount', header: 'Payment Amount', sortable: true, render: (row) => <span className="font-bold text-emerald-600">{formatRupee(row.paymentAmount)}</span> },
    { key: 'paymentDate', header: 'Payment Date', sortable: true, render: (row) => fmtDate(row.paymentDate) },
    { key: 'paymentMethod', header: 'Payment Method', sortable: true, render: (row) => <span className="bg-slate-50 text-slate-600 font-bold px-2.5 py-0.5 rounded-lg border border-slate-200/50 text-[11px]">{row.paymentMethod}</span> },
    { key: 'collectedBy', header: 'Collected By', sortable: true, render: (row) => <span className="font-semibold text-slate-600">{row.collectedBy}</span> }
  ];

  const mobileCardRender = (row) => (
    <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm space-y-3 active:scale-[0.99] transition-transform cursor-pointer">
      <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Customer</p>
          <p className="font-bold text-slate-800 text-sm truncate">{row.customerName}</p>
        </div>
        <span className="font-black text-emerald-600 text-sm whitespace-nowrap">{formatRupee(row.paymentAmount)}</span>
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-bold">Invoice</span>
        <span className="font-mono font-bold text-slate-700">{row.invoiceNo}</span>
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-bold">Date</span>
        <span className="font-semibold text-slate-600">{fmtDate(row.paymentDate)}</span>
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-bold">Method</span>
        <span className="bg-slate-50 text-slate-600 font-bold px-2 py-0.5 rounded border border-slate-200/50 text-[11px]">{row.paymentMethod}</span>
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-bold">Collected By</span>
        <span className="font-semibold text-slate-600 truncate ml-2">{row.collectedBy}</span>
      </div>
    </div>
  );

  return (
    <div className="p-3 sm:p-5 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans space-y-4 sm:space-y-6 min-w-0 overflow-x-hidden">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0" />
          <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Payment Collection</h1>
        </div>
        <p className="text-slate-500 text-[11px] sm:text-xs lg:text-sm font-semibold">Track all payments collected from customers.</p>
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
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Payment Method</label>
              <select value={filters.paymentMethod || ''} onChange={e => setFilter('paymentMethod', e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10">
                <option value="">All Methods</option>
                {methods.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </FilterBar>
        </div>
      </div>

      <DataTable columns={columns} data={paginatedData} onRowClick={(row) => setDetailItem(row)} sortConfig={sortConfig} onSort={requestSort} emptyTitle="No payment collections found" emptyDescription="Try adjusting your search or filter criteria." mobileCardRender={mobileCardRender} />
      <Pagination totalItems={totalItems} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} />

      <DetailDrawer isOpen={!!detailItem} onClose={() => setDetailItem(null)} title="Payment Collection Details">
        {detailItem && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailField label="Customer" value={detailItem.customerName} />
              <DetailField label="Invoice No" value={detailItem.invoiceNo} />
              <DetailField label="Payment Date" value={fmtDate(detailItem.paymentDate)} />
              <DetailField label="Payment Method" value={detailItem.paymentMethod} />
              <DetailField label="Collected By" value={detailItem.collectedBy} />
              <DetailField label="Store" value={detailItem.storeName} />
            </div>
            <hr className="border-slate-100" />
            <DetailField label="Payment Amount" value={formatRupee(detailItem.paymentAmount)} highlight />
            <DetailField label="Notes" value={detailItem.notes} />
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

export default PaymentCollection;
