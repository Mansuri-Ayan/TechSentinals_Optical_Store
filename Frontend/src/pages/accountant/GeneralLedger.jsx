import React, { useState, useMemo } from 'react';
import { BookOpen, Calendar, ArrowRightLeft, FileSpreadsheet } from 'lucide-react';
import { useTable } from '../../hooks/useTable';
import { MOCK_GENERAL_LEDGER, MOCK_SALES_LEDGER, MOCK_EXPENSES } from '../../data/accountantData';
import DataTable from '../../components/shared/DataTable';
import DetailDrawer from '../../components/shared/DetailDrawer';
import SearchBar from '../../components/shared/SearchBar';
import FilterBar from '../../components/shared/FilterBar';
import Pagination from '../../components/shared/Pagination';
import { useCalculations } from '../../hooks/useCalculations';
import { useStoreStore } from '../../store/store';

const GeneralLedger = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [ledgerEntries] = useState(MOCK_GENERAL_LEDGER);
  const { formatRupee } = useCalculations();
  const { selectedStore } = useStoreStore();

  const filteredLedger = useMemo(() => {
    if (!selectedStore || selectedStore.id === 'all' || selectedStore.isAll || selectedStore.store_name === 'All Branches') {
      return ledgerEntries;
    }

    let runningBalance = 164750;
    const result = [];

    ledgerEntries.forEach(item => {
      let matchesStore = false;

      const invMatch = item.description.match(/INV-\d{4}-\d{3}/);
      if (invMatch) {
        const inv = MOCK_SALES_LEDGER.find(s => s.invoiceNo === invMatch[0]);
        if (inv && inv.storeName === selectedStore.store_name) matchesStore = true;
      }

      const expMatch = item.description.match(/EXP-\d{4}-\d{3}/);
      if (expMatch) {
        const exp = MOCK_EXPENSES.find(e => e.expenseNo === expMatch[0]);
        if (exp && exp.storeName === selectedStore.store_name) matchesStore = true;
      }

      if (!invMatch && !expMatch) {
        const branches = ['Main Branch', 'Branch 2', 'Branch 3', 'Admin Store'];
        const foundBranch = branches.find(b => item.description.includes(b));
        if (foundBranch) {
          if (foundBranch === selectedStore.store_name) matchesStore = true;
        } else {
          matchesStore = true;
        }
      }

      if (matchesStore) {
        runningBalance = runningBalance + (item.debit || 0) - (item.credit || 0);
        result.push({
          ...item,
          balance: runningBalance
        });
      }
    });

    return result;
  }, [ledgerEntries, selectedStore]);

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
    initialData: filteredLedger,
    searchKeys: ['voucherNo', 'account', 'description'],
    itemsPerPage: 8,
    initialSort: { key: 'date', direction: 'desc' },
    initialFilters: { account: '', startDate: '', endDate: '' }
  });

  const fmtDate = (d) => {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Get distinct account names for filters
  const distinctAccounts = React.useMemo(() => {
    const accs = new Set();
    ledgerEntries.forEach(entry => {
      if (entry.account) accs.add(entry.account);
    });
    return Array.from(accs);
  }, [ledgerEntries]);

  const columns = [
    { header: 'Date', key: 'date', sortable: true, render: (row) => fmtDate(row.date) },
    { header: 'Voucher No', key: 'voucherNo', sortable: true, className: 'font-mono font-bold text-slate-800' },
    { header: 'Account Ledger', key: 'account', sortable: true, className: 'font-bold text-slate-700' },
    { header: 'Description / Narration', key: 'description', className: 'text-slate-500 max-w-[280px] truncate' },
    {
      header: 'Debit (Dr)',
      key: 'debit',
      sortable: true,
      className: 'font-bold text-slate-900 text-right',
      render: (row) => row.debit > 0 ? formatRupee(row.debit) : '—'
    },
    {
      header: 'Credit (Cr)',
      key: 'credit',
      sortable: true,
      className: 'font-bold text-slate-900 text-right',
      render: (row) => row.credit > 0 ? formatRupee(row.credit) : '—'
    },
    {
      header: 'Balance',
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
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">General Ledger</h1>
        <p className="text-slate-500 mt-1 text-xs sm:text-sm font-semibold">
          Audit chronological transactions, verify debit/credit entries, and review running account ledger balances.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Debit Flow', value: formatRupee(filteredLedger.reduce((s, r) => s + r.debit, 0)), icon: BookOpen, color: 'text-indigo-650 bg-indigo-50 border-indigo-100' },
          { label: 'Total Credit Flow', value: formatRupee(filteredLedger.reduce((s, r) => s + r.credit, 0)), icon: ArrowRightLeft, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
          { label: 'Net Flow Difference', value: formatRupee(Math.abs(filteredLedger.reduce((s, r) => s + r.debit, 0) - filteredLedger.reduce((s, r) => s + r.credit, 0))), icon: FileSpreadsheet, color: 'text-amber-700 bg-amber-50 border-amber-100' },
          { label: 'Total Transactions Logged', value: filteredLedger.length, icon: Calendar, color: 'text-slate-700 bg-slate-50 border-slate-200/50' }
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

      {/* Controls: Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by voucher no, account ledger, description..." />
        <FilterBar
          showFilters={showFilters}
          onToggle={() => setShowFilters(!showFilters)}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        >
          {/* Account selector filter */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest mb-1.5 block">Ledger Account</label>
            <select
              value={filters.account}
              onChange={e => setFilter('account', e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 bg-white text-slate-700 transition-all cursor-pointer"
            >
              <option value="">All Accounts</option>
              {distinctAccounts.map(acc => (
                <option key={acc} value={acc}>{acc}</option>
              ))}
            </select>
          </div>

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
        emptyTitle="No ledger records found"
        emptyDescription="Adjust filter configurations or query keywords to audit records."
        mobileCardRender={(row) => (
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-3 cursor-pointer hover:border-slate-350 transition-colors">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] font-mono text-slate-400 font-bold">{row.voucherNo}</p>
                <h4 className="font-extrabold text-slate-800 text-sm mt-0.5">{row.account}</h4>
              </div>
              <span className="text-xs font-semibold text-slate-500">{fmtDate(row.date)}</span>
            </div>
            <p className="text-xs text-slate-500 line-clamp-1 border-t border-slate-100 pt-2">{row.description}</p>
            <div className="flex justify-between items-end border-t border-slate-100 pt-2.5">
              <div className="flex gap-4">
                {row.debit > 0 && (
                  <div>
                    <span className="text-[9px] font-bold text-indigo-500 uppercase block">Debit (Dr)</span>
                    <span className="font-extrabold text-xs text-indigo-650">{formatRupee(row.debit)}</span>
                  </div>
                )}
                {row.credit > 0 && (
                  <div>
                    <span className="text-[9px] font-bold text-emerald-500 uppercase block">Credit (Cr)</span>
                    <span className="font-extrabold text-xs text-emerald-650">{formatRupee(row.credit)}</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Balance</span>
                <span className="text-base font-black text-slate-900">{formatRupee(row.balance)}</span>
              </div>
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
        title="Ledger Entry Details"
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
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Voucher Reference</p>
                <h4 className="text-lg font-black text-slate-800 font-mono mt-0.5">{detailItem.voucherNo}</h4>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border border-slate-200">
                General Ledger
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Ledger Account Name</span>
              <p className="text-sm sm:text-base font-black text-slate-800 leading-snug">{detailItem.account}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                <span className="font-extrabold text-slate-400 uppercase tracking-widest text-[9px] block mb-1">Transaction Date</span>
                <span className="font-bold text-slate-700">{fmtDate(detailItem.date)}</span>
              </div>
              <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                <span className="font-extrabold text-slate-400 uppercase tracking-widest text-[9px] block mb-1">Entry Balance ID</span>
                <span className="font-bold text-slate-700">GL-{detailItem.id}</span>
              </div>
            </div>

            <div>
              <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Narration / Description Note</h5>
              <div className="bg-slate-50/20 border border-slate-200/60 p-4 rounded-xl text-xs font-semibold text-slate-700 leading-relaxed shadow-inner">
                {detailItem.description}
              </div>
            </div>

            <div className="border-t border-slate-150 pt-5 space-y-3">
              <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Accounting Flow</h5>
              <div className="flex justify-between text-xs text-slate-500 font-semibold">
                <span>Debit Value (Dr)</span>
                <span>{detailItem.debit > 0 ? formatRupee(detailItem.debit) : '—'}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 font-semibold border-b border-slate-100 pb-2.5">
                <span>Credit Value (Cr)</span>
                <span>{detailItem.credit > 0 ? formatRupee(detailItem.credit) : '—'}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-1">
                <span>Current Account Balance</span>
                <span className="text-lg text-slate-900">{formatRupee(detailItem.balance)}</span>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};

export default GeneralLedger;
