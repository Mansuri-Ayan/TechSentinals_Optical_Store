import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowRightLeft, TrendingUp, TrendingDown, IndianRupee, Landmark } from 'lucide-react';
import { useTable } from '../../hooks/useTable';
import { MOCK_TRANSACTIONS } from '../../data/accountantData';
import DataTable from '../../components/shared/DataTable';
import DetailDrawer from '../../components/shared/DetailDrawer';
import SearchBar from '../../components/shared/SearchBar';
import FilterBar from '../../components/shared/FilterBar';
import Pagination from '../../components/shared/Pagination';
import StatusBadge from '../../components/shared/StatusBadge';
import { useStoreStore } from '../../store/store';

const Transactions = () => {
  const [showFilters, setShowFilters] = useState(false);
  const { selectedStore } = useStoreStore();

  const filteredTxns = useMemo(() => {
    if (!selectedStore || selectedStore.id === 'all' || selectedStore.isAll || selectedStore.store_name === 'All Branches') {
      return MOCK_TRANSACTIONS;
    }
    return MOCK_TRANSACTIONS.filter(item => item.storeName === selectedStore.store_name);
  }, [selectedStore]);

  // Hook setups
  const {
    paginatedData,
    totalItems,
    search,
    setSearch,
    filters,
    setFilter,
    clearFilters,
    currentPage,
    setCurrentPage,
    totalPages,
    itemsPerPage,
    sortConfig,
    requestSort,
    detailItem,
    setDetailItem
  } = useTable({
    initialData: filteredTxns,
    searchKeys: ['txnId', 'description', 'paymentMethod'],
    itemsPerPage: 8,
    initialSort: { key: 'date', direction: 'desc' },
    initialFilters: { storeName: '', type: '', paymentMethod: '', startDate: '', endDate: '' }
  });

  const fmtCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const fmtDate = (d) => {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const columns = [
    { header: 'Transaction ID', key: 'txnId', sortable: true, className: 'font-mono font-bold text-slate-800' },
    { header: 'Date', key: 'date', sortable: true, render: (row) => fmtDate(row.date) },
    { header: 'Narration / Description', key: 'description', sortable: true, className: 'font-semibold text-slate-800 truncate max-w-[280px]' },
    { header: 'Branch Store', key: 'storeName', sortable: true },
    {
      header: 'Method',
      key: 'paymentMethod',
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-500">
          <span>{row.paymentMethod}</span>
        </span>
      )
    },
    { header: 'Type', key: 'type', sortable: true, render: (row) => <StatusBadge status={row.type} /> },
    {
      header: 'Amount',
      key: 'amount',
      sortable: true,
      className: 'font-black text-right',
      render: (row) => (
        <span className={row.type === 'Credit' ? 'text-emerald-600' : 'text-rose-600'}>
          {row.type === 'Credit' ? '+' : '-'}{fmtCurrency(row.amount)}
        </span>
      )
    }
  ];

  const hasActiveFilters = Object.values(filters).some(val => val !== '');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Central General Ledger</h1>
        <p className="text-slate-500 mt-1 text-xs sm:text-sm font-semibold">
          Reconcile daily double-entry flows, audit debit/credit vouchers, and track cash-equivalents.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Inflow (Credits)', value: fmtCurrency(filteredTxns.filter(r => r.type === 'Credit').reduce((s, r) => s + r.amount, 0)), icon: TrendingUp, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
          { label: 'Total Outflow (Debits)', value: fmtCurrency(filteredTxns.filter(r => r.type === 'Debit').reduce((s, r) => s + r.amount, 0)), icon: TrendingDown, color: 'text-rose-700 bg-rose-50 border-rose-100' },
          { label: 'Net Cash Movement', value: fmtCurrency(filteredTxns.reduce((s, r) => r.type === 'Credit' ? s + r.amount : s - r.amount, 0)), icon: IndianRupee, color: 'text-indigo-650 bg-indigo-50 border-indigo-150/40' },
          { label: 'Transaction Logs Counts', value: filteredTxns.length, icon: Landmark, color: 'text-slate-600 bg-slate-50 border-slate-200/50' }
        ].map((k, idx) => {
          const Icon = k.icon;
          return (
            <div key={idx} className="flex items-center gap-3.5 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className={`p-2.5 rounded-xl flex-shrink-0 ${k.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{k.label}</p>
                <p className="text-base sm:text-lg font-black text-slate-800 tracking-tight truncate mt-0.5">{k.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search and Filters Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search transaction ID, narrations, methods..." />
        <FilterBar
          showFilters={showFilters}
          onToggle={() => setShowFilters(!showFilters)}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        >
          {/* Branch filter */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest mb-1.5 block">Store Branch</label>
            <select
              value={filters.storeName}
              onChange={e => setFilter('storeName', e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 bg-white text-slate-700 transition-all cursor-pointer"
            >
              <option value="">All Branches</option>
              <option value="Main Branch">Main Branch</option>
              <option value="Branch 2">Branch 2</option>
              <option value="Branch 3">Branch 3</option>
              <option value="Admin Store">Admin Store</option>
            </select>
          </div>

          {/* Transaction Type */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-460 uppercase tracking-widest mb-1.5 block">Transaction Type</label>
            <select
              value={filters.type}
              onChange={e => setFilter('type', e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 bg-white text-slate-700 transition-all cursor-pointer"
            >
              <option value="">All Types</option>
              <option value="Credit">Credit (Inflow)</option>
              <option value="Debit">Debit (Outflow)</option>
            </select>
          </div>

          {/* Payment Method filter */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-460 uppercase tracking-widest mb-1.5 block">Payment Channel</label>
            <select
              value={filters.paymentMethod}
              onChange={e => setFilter('paymentMethod', e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 bg-white text-slate-700 transition-all cursor-pointer"
            >
              <option value="">All Channels</option>
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-460 uppercase tracking-widest mb-1.5 block">Date From</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={e => setFilter('startDate', e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 bg-white text-slate-700 transition-all"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-460 uppercase tracking-widest mb-1.5 block">Date To</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={e => setFilter('endDate', e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 bg-white text-slate-700 transition-all"
            />
          </div>
        </FilterBar>
      </div>

      {/* Main Records Table */}
      <DataTable
        columns={columns}
        data={paginatedData}
        onRowClick={setDetailItem}
        sortConfig={sortConfig}
        onSort={requestSort}
        emptyTitle="No transactions found"
        emptyDescription="We couldn't find any transaction matching criteria."
        mobileCardRender={(row) => (
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-3 cursor-pointer hover:border-slate-350 transition-colors">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] font-mono text-slate-400 font-bold">{row.txnId}</p>
                <h4 className="font-extrabold text-slate-800 text-sm mt-0.5 truncate max-w-[200px]">{row.description}</h4>
              </div>
              <StatusBadge status={row.type} />
            </div>
            <div className="flex justify-between text-xs text-slate-500 font-semibold border-b border-slate-100 pb-2.5">
              <span>{row.storeName}</span>
              <span>{fmtDate(row.date)}</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="bg-slate-50 text-slate-500 font-bold px-2 py-0.5 rounded border border-slate-200/50 text-[10px]">{row.paymentMethod}</span>
              <span className={`text-base font-black ${
                row.type === 'Credit' ? 'text-emerald-600' : 'text-rose-650'
              }`}>
                {row.type === 'Credit' ? '+' : '-'}{fmtCurrency(row.amount)}
              </span>
            </div>
          </div>
        )}
      />

      <Pagination
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      {/* Detail Drawer portal */}
      <DetailDrawer
        isOpen={!!detailItem}
        onClose={() => setDetailItem(null)}
        title="Transaction Entry Detail"
        footerActions={
          <button
            onClick={() => setDetailItem(null)}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            Close Details
          </button>
        }
      >
        {detailItem && (
          <div className="space-y-6">
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Audit Txn Ref</p>
                <h4 className="text-lg font-black text-slate-800 font-mono mt-0.5">{detailItem.txnId}</h4>
              </div>
              <StatusBadge status={detailItem.type} />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Transaction Narration</span>
              <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed bg-slate-50 p-4 border border-slate-100 rounded-xl">
                {detailItem.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                <span className="font-extrabold text-slate-400 uppercase tracking-widest text-[9px] block mb-1">Execution Date</span>
                <span className="font-bold text-slate-700">{fmtDate(detailItem.date)}</span>
              </div>
              <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                <span className="font-extrabold text-slate-400 uppercase tracking-widest text-[9px] block mb-1">Store Allocation</span>
                <span className="font-bold text-slate-700">{detailItem.storeName}</span>
              </div>
              <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                <span className="font-extrabold text-slate-400 uppercase tracking-widest text-[9px] block mb-1">Clearing Channel</span>
                <span className="font-bold text-slate-700">{detailItem.paymentMethod}</span>
              </div>
              <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                <span className="font-extrabold text-slate-400 uppercase tracking-widest text-[9px] block mb-1">Ledger Entry Type</span>
                <span className={`font-bold ${detailItem.type === 'Credit' ? 'text-emerald-700' : 'text-rose-700'}`}>{detailItem.type}</span>
              </div>
            </div>

            <div className="border-t border-slate-150 pt-5 flex justify-between items-center text-sm font-black text-slate-900">
              <span className="text-slate-800">Settled Value</span>
              <span className={`text-lg ${detailItem.type === 'Credit' ? 'text-emerald-600' : 'text-rose-650'}`}>
                {detailItem.type === 'Credit' ? '+' : '-'}{fmtCurrency(detailItem.amount)}
              </span>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};

export default Transactions;
