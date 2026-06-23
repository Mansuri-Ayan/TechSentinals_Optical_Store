import React, { useState, useMemo } from 'react';
import { Coins, ArrowDownLeft, ArrowUpRight, Calendar } from 'lucide-react';
import { useTable } from '../../hooks/useTable';
import { MOCK_CASH_BOOK, MOCK_SALES_LEDGER, MOCK_EXPENSES } from '../../data/accountantData';
import DataTable from '../../components/shared/DataTable';
import DetailDrawer from '../../components/shared/DetailDrawer';
import SearchBar from '../../components/shared/SearchBar';
import FilterBar from '../../components/shared/FilterBar';
import Pagination from '../../components/shared/Pagination';
import { useCalculations } from '../../hooks/useCalculations';
import { useStoreStore } from '../../store/store';

const CashBook = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [cashEntries] = useState(MOCK_CASH_BOOK);
  const { formatRupee } = useCalculations();
  const { selectedStore } = useStoreStore();

  const filteredCash = useMemo(() => {
    if (!selectedStore || selectedStore.id === 'all' || selectedStore.isAll || selectedStore.store_name === 'All Branches') {
      return cashEntries;
    }

    let runningBalance = 150000;
    const result = [];

    cashEntries.forEach(item => {
      let matchesStore = false;
      if (item.reference.includes('Opening') || item.reference.toLowerCase().includes('opening balance')) {
        matchesStore = true;
      } else {
        const invMatch = item.reference.match(/INV-\d{4}-\d{3}/);
        if (invMatch) {
          const inv = MOCK_SALES_LEDGER.find(s => s.invoiceNo === invMatch[0]);
          if (inv && inv.storeName === selectedStore.store_name) matchesStore = true;
        }

        const expMatch = item.reference.match(/EXP-\d{4}-\d{3}/);
        if (expMatch) {
          const exp = MOCK_EXPENSES.find(e => e.expenseNo === expMatch[0]);
          if (exp && exp.storeName === selectedStore.store_name) matchesStore = true;
        }
      }

      if (matchesStore) {
        if (item.reference.includes('Opening')) {
          result.push({ ...item });
        } else {
          runningBalance = runningBalance + (item.cashIn || 0) - (item.cashOut || 0);
          result.push({
            ...item,
            balance: runningBalance
          });
        }
      }
    });

    return result;
  }, [cashEntries, selectedStore]);

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
    initialData: filteredCash,
    searchKeys: ['reference'],
    itemsPerPage: 8,
    initialSort: { key: 'date', direction: 'desc' },
    initialFilters: { startDate: '', endDate: '' }
  });

  const fmtDate = (d) => {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const totals = React.useMemo(() => {
    const cashIn = filteredCash.reduce((s, r) => s + r.cashIn, 0);
    const cashOut = filteredCash.reduce((s, r) => s + r.cashOut, 0);
    // Final balance is last item in chronological order or simple math
    const balance = cashIn - cashOut;
    return { cashIn, cashOut, balance };
  }, [filteredCash]);

  const columns = [
    { header: 'Date', key: 'date', sortable: true, render: (row) => fmtDate(row.date) },
    { header: 'Reference Description', key: 'reference', sortable: true, className: 'font-bold text-slate-700' },
    {
      header: 'Cash In (Dr)',
      key: 'cashIn',
      sortable: true,
      className: 'font-bold text-emerald-650 text-right',
      render: (row) => row.cashIn > 0 ? `+${formatRupee(row.cashIn)}` : '—'
    },
    {
      header: 'Cash Out (Cr)',
      key: 'cashOut',
      sortable: true,
      className: 'font-bold text-rose-650 text-right',
      render: (row) => row.cashOut > 0 ? `-${formatRupee(row.cashOut)}` : '—'
    },
    {
      header: 'Running Balance',
      key: 'balance',
      className: 'font-black text-slate-900 text-right',
      render: (row) => formatRupee(row.balance)
    }
  ];

  const hasActiveFilters = Object.values(filters).some(val => val !== '');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Cash Book</h1>
        <p className="text-slate-500 mt-1 text-xs sm:text-sm font-semibold">
          Audit daily counter cash-flows, cash sales payments, and petty cash store expense registry logs.
        </p>
      </div>

      {/* KPI summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'Total Cash Receipts In', value: formatRupee(totals.cashIn), icon: ArrowDownLeft, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
          { label: 'Total Cash Disbursements Out', value: formatRupee(totals.cashOut), icon: ArrowUpRight, color: 'text-rose-700 bg-rose-50 border-rose-100' },
          { label: 'Closing Cash Balance', value: formatRupee(totals.balance), icon: Coins, color: 'text-indigo-650 bg-indigo-50 border-indigo-100' }
        ].map((k, idx) => {
          const Icon = k.icon;
          return (
            <div key={idx} className="flex items-center gap-3.5 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className={`p-3.5 rounded-xl flex-shrink-0 ${k.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{k.label}</p>
                <p className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight truncate mt-1">{k.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by reference description (e.g. Sales, Rent)..." />
        <FilterBar
          showFilters={showFilters}
          onToggle={() => setShowFilters(!showFilters)}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        >
          {/* Start Date */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-460 uppercase tracking-widest mb-1.5 block">From Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={e => setFilter('startDate', e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 bg-white text-slate-700 transition-all"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-460 uppercase tracking-widest mb-1.5 block">To Date</label>
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
        emptyTitle="No cash entries logged"
        emptyDescription="We couldn't find any cash transaction matching your search terms."
        mobileCardRender={(row) => (
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-3 cursor-pointer hover:border-slate-350 transition-colors">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-400">{fmtDate(row.date)}</span>
              {row.cashIn > 0 ? (
                <span className="text-sm font-black text-emerald-600">+{formatRupee(row.cashIn)}</span>
              ) : (
                <span className="text-sm font-black text-rose-650">-{formatRupee(row.cashOut)}</span>
              )}
            </div>
            <h4 className="font-bold text-slate-800 text-sm mt-0.5">{row.reference}</h4>
            <div className="flex justify-between items-end border-t border-slate-100 pt-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Cash balance</span>
              <span className="text-sm font-black text-slate-900">{formatRupee(row.balance)}</span>
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

      {/* Details Drawer */}
      <DetailDrawer
        isOpen={!!detailItem}
        onClose={() => setDetailItem(null)}
        title="Cash Book Entry Details"
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
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Date Logged</p>
                <h4 className="text-lg font-black text-slate-850 mt-0.5">{fmtDate(detailItem.date)}</h4>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 bg-slate-150 rounded-lg text-xs font-bold text-slate-650 border border-slate-200">
                Cash Book
              </span>
            </div>

            <div>
              <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Reference Details</h5>
              <div className="bg-slate-50/20 border border-slate-200/60 p-4 rounded-xl text-xs font-bold text-slate-700 leading-relaxed shadow-inner">
                {detailItem.reference}
              </div>
            </div>

            <div className="border-t border-slate-150 pt-5 space-y-3">
              <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Entry Flows</h5>
              <div className="flex justify-between text-xs text-emerald-650 font-bold">
                <span>Cash Inflow (Dr)</span>
                <span>{detailItem.cashIn > 0 ? formatRupee(detailItem.cashIn) : '—'}</span>
              </div>
              <div className="flex justify-between text-xs text-rose-650 font-bold border-b border-slate-100 pb-2.5">
                <span>Cash Outflow (Cr)</span>
                <span>{detailItem.cashOut > 0 ? formatRupee(detailItem.cashOut) : '—'}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-1">
                <span>Running Cash Balance</span>
                <span className="text-lg text-slate-900">{formatRupee(detailItem.balance)}</span>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};

export default CashBook;
