import React, { useMemo, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useTable } from '../../hooks/useTable';
import { MOCK_SALES_LEDGER, ACCOUNTANT_STORES } from '../../data/accountantData';
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

const SalesLedger = () => {
  const { selectedStore } = useStoreStore();
  const [showFilters, setShowFilters] = useState(false);

  const branchFiltered = useMemo(() => {
    if (!selectedStore || selectedStore.id === 'all' || selectedStore.isAll) return MOCK_SALES_LEDGER;
    return MOCK_SALES_LEDGER.filter(s => s.storeName === selectedStore.store_name);
  }, [selectedStore]);

  const enrichedData = useMemo(() => branchFiltered.map(sale => {
    const paidAmount = sale.status === 'Paid' ? sale.total : Math.round(sale.total * 0.5);
    const dueAmount = sale.total - paidAmount;
    return { ...sale, paidAmount, dueAmount };
  }), [branchFiltered]);

  const {
    search, setSearch, paginatedData, totalItems,
    currentPage, setCurrentPage, itemsPerPage,
    sortConfig, requestSort, filters, setFilter, clearFilters,
    detailItem, setDetailItem
  } = useTable({
    initialData: enrichedData,
    searchKeys: ['invoiceNo', 'customerName', 'storeName'],
    itemsPerPage: 10,
    initialSort: { key: 'date', direction: 'desc' }
  });

  const hasActiveFilters = !!(filters.status || filters.storeName);

  const columns = [
    { key: 'invoiceNo', header: 'Invoice Number', sortable: true, render: (row) => <span className="font-bold text-slate-800 font-mono text-xs">{row.invoiceNo}</span> },
    { key: 'customerName', header: 'Customer', sortable: true, render: (row) => <span className="font-semibold text-slate-700">{row.customerName}</span> },
    { key: 'storeName', header: 'Store', sortable: true },
    { key: 'date', header: 'Sale Date', sortable: true, render: (row) => fmtDate(row.date) },
    { key: 'total', header: 'Total Amount', sortable: true, render: (row) => <span className="font-bold text-slate-800">{formatRupee(row.total)}</span> },
    { key: 'paidAmount', header: 'Paid Amount', sortable: true, render: (row) => <span className="font-semibold text-emerald-600">{formatRupee(row.paidAmount)}</span> },
    { key: 'dueAmount', header: 'Due Amount', sortable: true, render: (row) => <span className={`font-semibold ${row.dueAmount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{formatRupee(row.dueAmount)}</span> },
    { key: 'status', header: 'Payment Status', sortable: true, render: (row) => <StatusBadge status={row.status} /> }
  ];

  // Mobile card renderer for responsive table
  const mobileCardRender = (row) => (
    <div
      className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm space-y-3 active:scale-[0.99] transition-transform cursor-pointer"
    >
      <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-2">
        <div className="min-w-0">
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Invoice</p>
          <p className="font-bold text-slate-800 text-sm font-mono truncate">{row.invoiceNo}</p>
        </div>
        <StatusBadge status={row.status} />
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-bold">Customer</span>
        <span className="font-semibold text-slate-700 truncate ml-2">{row.customerName}</span>
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-bold">Store</span>
        <span className="font-semibold text-slate-600">{row.storeName}</span>
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-bold">Date</span>
        <span className="font-semibold text-slate-600">{fmtDate(row.date)}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
        <div>
          <p className="text-[9px] text-slate-400 font-bold">Total</p>
          <p className="text-xs font-bold text-slate-800">{formatRupee(row.total)}</p>
        </div>
        <div>
          <p className="text-[9px] text-slate-400 font-bold">Paid</p>
          <p className="text-xs font-bold text-emerald-600">{formatRupee(row.paidAmount)}</p>
        </div>
        <div>
          <p className="text-[9px] text-slate-400 font-bold">Due</p>
          <p className={`text-xs font-bold ${row.dueAmount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{formatRupee(row.dueAmount)}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-3 sm:p-5 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans space-y-4 sm:space-y-6 min-w-0 overflow-x-hidden">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0" />
          <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Sales Ledger</h1>
        </div>
        <p className="text-slate-500 text-[11px] sm:text-xs lg:text-sm font-semibold">Track all sales invoices across branches.</p>
      </div>

      {/* Search + Filter — stacks on mobile */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search invoices, customers..." />
          <FilterBar
            showFilters={showFilters}
            onToggle={() => setShowFilters(!showFilters)}
            onClear={clearFilters}
            hasActiveFilters={hasActiveFilters}
          >
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
                <option value="Paid">Paid</option>
                <option value="Due">Due</option>
              </select>
            </div>
          </FilterBar>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={paginatedData}
        onRowClick={(row) => setDetailItem(row)}
        sortConfig={sortConfig}
        onSort={requestSort}
        emptyTitle="No sales records found"
        emptyDescription="Try adjusting your search or filter criteria."
        mobileCardRender={mobileCardRender}
      />

      {/* Pagination */}
      <Pagination totalItems={totalItems} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} />

      {/* Detail Drawer */}
      <DetailDrawer isOpen={!!detailItem} onClose={() => setDetailItem(null)} title="Invoice Details">
        {detailItem && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailField label="Invoice No" value={detailItem.invoiceNo} />
              <DetailField label="Date" value={fmtDate(detailItem.date)} />
              <DetailField label="Customer" value={detailItem.customerName} />
              <DetailField label="Store" value={detailItem.storeName} />
              <DetailField label="Items" value={detailItem.items} />
              <DetailField label="Payment Method" value={detailItem.paymentMethod} />
            </div>
            <hr className="border-slate-100" />
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Subtotal" value={formatRupee(detailItem.subtotal)} />
              <DetailField label="CGST" value={formatRupee(detailItem.cgst)} />
              <DetailField label="SGST" value={formatRupee(detailItem.sgst)} />
              <DetailField label="Total Amount" value={formatRupee(detailItem.total)} highlight />
              <DetailField label="Paid Amount" value={formatRupee(detailItem.paidAmount)} />
              <DetailField label="Due Amount" value={formatRupee(detailItem.dueAmount)} danger={detailItem.dueAmount > 0} />
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

const DetailField = ({ label, value, highlight, danger }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
    <p className={`text-sm font-bold break-words ${danger ? 'text-rose-600' : highlight ? 'text-emerald-700' : 'text-slate-800'}`}>{value || '—'}</p>
  </div>
);

export default SalesLedger;
