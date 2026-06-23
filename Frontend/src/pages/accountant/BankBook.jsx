import React, { useState, useMemo } from 'react';
import { Landmark, ArrowDownLeft, ArrowUpRight, Calendar } from 'lucide-react';
import { useTable } from '../../hooks/useTable';
import { MOCK_BANK_BOOK, MOCK_SALES_LEDGER, MOCK_EXPENSES } from '../../data/accountantData';
import DataTable from '../../components/shared/DataTable';
import DetailDrawer from '../../components/shared/DetailDrawer';
import SearchBar from '../../components/shared/SearchBar';
import FilterBar from '../../components/shared/FilterBar';
import Pagination from '../../components/shared/Pagination';
import { useCalculations } from '../../hooks/useCalculations';
import { useStoreStore } from '../../store/store';

const BankBook = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [bankEntries] = useState(MOCK_BANK_BOOK);
  const { formatRupee } = useCalculations();
  const { selectedStore } = useStoreStore();

  const filteredBank = useMemo(() => {
    if (!selectedStore || selectedStore.id === 'all' || selectedStore.isAll || selectedStore.store_name === 'All Branches') {
      return bankEntries;
    }

    let runningBalance = 850000;
    const result = [];

    bankEntries.forEach(item => {
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
          runningBalance = runningBalance + (item.credit || 0) - (item.debit || 0);
          result.push({
            ...item,
            balance: runningBalance
          });
        }
      }
    });

    return result;
  }, [bankEntries, selectedStore]);

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
    initialData: filteredBank,
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
    const credits = filteredBank.reduce((s, r) => s + r.credit, 0);
    const debits = filteredBank.reduce((s, r) => s + r.debit, 0);
    // Net closing balance
    const balance = credits - debits;
    return { credits, debits, balance };
  }, [filteredBank]);

  const columns = [
    { header: 'Date', key: 'date', sortable: true, render: (row) => fmtDate(row.date) },
    { header: 'Reference Details', key: 'reference', sortable: true, className: 'font-bold text-slate-700' },
    {
      header: 'Credits / Deposits (Dr)',
      key: 'credit',
      sortable: true,
      className: 'font-bold text-emerald-650 text-right',
      render: (row) => row.credit > 0 ? `+${formatRupee(row.credit)}` : '—'
    },
    {
      header: 'Debits / Withdrawals (Cr)',
      key: 'debit',
      sortable: true,
      className: 'font-bold text-rose-650 text-right',
      render: (row) => row.debit > 0 ? `-${formatRupee(row.debit)}` : '—'
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
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Bank Book</h1>
        <p className="text-slate-500 mt-1 text-xs sm:text-sm font-semibold">
          Monitor digital bank settlements, UPI collections, NEFT vendor payments, and credit card gateway credits.
        </p>
      </div>

      {/* KPI summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'Total Bank Credits (In)', value: formatRupee(totals.credits), icon: ArrowDownLeft, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
          { label: 'Total Bank Debits (Out)', value: formatRupee(totals.debits), icon: ArrowUpRight, color: 'text-rose-700 bg-rose-50 border-rose-100' },
          { label: 'Closing Bank Balance', value: formatRupee(totals.balance), icon: Landmark, color: 'text-indigo-650 bg-indigo-50 border-indigo-100' }
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
        <SearchBar value={search} onChange={setSearch} placeholder="Search bank transactions (e.g. Rent, UPI, settlement)..." />
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
        emptyTitle="No banking records logged"
        emptyDescription="No match found for your bank registry query."
        mobileCardRender={(row) => (
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-3 cursor-pointer hover:border-slate-350 transition-colors">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-400">{fmtDate(row.date)}</span>
              {row.credit > 0 ? (
                <span className="text-sm font-black text-emerald-600">+{formatRupee(row.credit)}</span>
              ) : (
                <span className="text-sm font-black text-rose-650">-{formatRupee(row.debit)}</span>
              )}
            </div>
            <h4 className="font-bold text-slate-800 text-sm mt-0.5">{row.reference}</h4>
            <div className="flex justify-between items-end border-t border-slate-100 pt-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Bank balance</span>
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
        title="Bank Book Entry Details"
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
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Date Settled</p>
                <h4 className="text-lg font-black text-slate-850 mt-0.5">{fmtDate(detailItem.date)}</h4>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 bg-slate-150 rounded-lg text-xs font-bold text-slate-650 border border-slate-200">
                Bank Registry
              </span>
            </div>

            <div>
              <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Bank Reference / Narration</h5>
              <div className="bg-slate-50/20 border border-slate-200/60 p-4 rounded-xl text-xs font-bold text-slate-700 leading-relaxed shadow-inner">
                {detailItem.reference}
              </div>
            </div>

            <div className="border-t border-slate-150 pt-5 space-y-3">
              <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Entry Flows</h5>
              <div className="flex justify-between text-xs text-emerald-650 font-bold">
                <span>Credits (Deposits)</span>
                <span>{detailItem.credit > 0 ? formatRupee(detailItem.credit) : '—'}</span>
              </div>
              <div className="flex justify-between text-xs text-rose-650 font-bold border-b border-slate-100 pb-2.5">
                <span>Debits (Withdrawals)</span>
                <span>{detailItem.debit > 0 ? formatRupee(detailItem.debit) : '—'}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-1">
                <span>Running Bank Balance</span>
                <span className="text-lg text-slate-900">{formatRupee(detailItem.balance)}</span>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};

export default BankBook;
