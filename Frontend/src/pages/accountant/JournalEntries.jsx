import React, { useState, useMemo } from 'react';
import { Plus, PenTool, Calendar, BookOpen, AlertCircle } from 'lucide-react';
import { useTable } from '../../hooks/useTable';
import { MOCK_JOURNAL_ENTRIES, MOCK_CHART_OF_ACCOUNTS, MOCK_SALES_LEDGER, MOCK_EXPENSES } from '../../data/accountantData';
import DataTable from '../../components/shared/DataTable';
import DetailDrawer from '../../components/shared/DetailDrawer';
import SearchBar from '../../components/shared/SearchBar';
import FilterBar from '../../components/shared/FilterBar';
import Pagination from '../../components/shared/Pagination';
import FormModal from '../../components/shared/FormModal';
import { useCalculations } from '../../hooks/useCalculations';
import { toast } from 'react-toastify';
import { useStoreStore } from '../../store/store';

const JournalEntries = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [journalEntries, setJournalEntries] = useState(MOCK_JOURNAL_ENTRIES);
  const { formatRupee } = useCalculations();
  const { selectedStore } = useStoreStore();

  const filteredJournal = useMemo(() => {
    if (!selectedStore || selectedStore.id === 'all' || selectedStore.isAll || selectedStore.store_name === 'All Branches') {
      return journalEntries;
    }

    return journalEntries.filter(item => {
      const invMatch = item.narration.match(/INV-\d{4}-\d{3}/);
      if (invMatch) {
        const inv = MOCK_SALES_LEDGER.find(s => s.invoiceNo === invMatch[0]);
        if (inv && inv.storeName === selectedStore.store_name) return true;
      }

      const expMatch = item.narration.match(/EXP-\d{4}-\d{3}/);
      if (expMatch) {
        const exp = MOCK_EXPENSES.find(e => e.expenseNo === expMatch[0]);
        if (exp && exp.storeName === selectedStore.store_name) return true;
      }

      const branches = ['Main Branch', 'Branch 2', 'Branch 3', 'Admin Store'];
      const foundBranch = branches.find(b => item.narration.includes(b) || item.narration.toLowerCase().includes(b.toLowerCase()));
      if (foundBranch) {
        return foundBranch === selectedStore.store_name;
      }

      if (item.debitAccount.includes('Rent') || item.creditAccount.includes('Rent')) {
        if (selectedStore.store_name === 'Main Branch') return true;
      }

      return true;
    });
  }, [journalEntries, selectedStore]);

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
    setDetailItem,
    isFormOpen,
    setIsFormOpen
  } = useTable({
    initialData: filteredJournal,
    searchKeys: ['voucherNo', 'debitAccount', 'creditAccount', 'narration'],
    itemsPerPage: 8,
    initialSort: { key: 'date', direction: 'desc' },
    initialFilters: { debitAccount: '', creditAccount: '', startDate: '', endDate: '' }
  });

  // Flat list of accounts for dropdowns
  const accountsList = useMemo(() => {
    const list = [];
    Object.keys(MOCK_CHART_OF_ACCOUNTS).forEach(group => {
      MOCK_CHART_OF_ACCOUNTS[group].forEach(acc => {
        list.push(acc.name);
      });
    });
    return list;
  }, []);

  // Form State for Recording New Journal Voucher (JV)
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    debitAccount: '',
    creditAccount: '',
    amount: '',
    narration: ''
  });

  const fmtDate = (d) => {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleRecordJV = (e) => {
    const amt = parseFloat(newEntry.amount);
    if (!newEntry.debitAccount || !newEntry.creditAccount) {
      toast.error('Please select both Debit and Credit accounts.');
      return;
    }
    if (newEntry.debitAccount === newEntry.creditAccount) {
      toast.error('Debit and Credit accounts cannot be the same.');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid amount greater than zero.');
      return;
    }
    if (!newEntry.narration.trim()) {
      toast.error('Please enter a narration explanation.');
      return;
    }

    const payload = {
      id: journalEntries.length + 1,
      voucherNo: `JV-2026-0${journalEntries.length + 1}`,
      date: newEntry.date,
      debitAccount: newEntry.debitAccount,
      creditAccount: newEntry.creditAccount,
      amount: amt,
      narration: newEntry.narration
    };

    setJournalEntries(prev => [payload, ...prev]);
    setIsFormOpen(false);
    setNewEntry({
      date: new Date().toISOString().split('T')[0],
      debitAccount: '',
      creditAccount: '',
      amount: '',
      narration: ''
    });
    toast.success(`Journal entry ${payload.voucherNo} recorded successfully.`);
  };

  const columns = [
    { header: 'Voucher No', key: 'voucherNo', sortable: true, className: 'font-mono font-bold text-slate-800' },
    { header: 'Date', key: 'date', sortable: true, render: (row) => fmtDate(row.date) },
    {
      header: 'Debit Account (Dr)',
      key: 'debitAccount',
      sortable: true,
      className: 'font-bold text-indigo-700',
      render: (row) => (
        <div className="space-y-0.5">
          <span className="font-bold text-indigo-650">{row.debitAccount}</span>
          <span className="text-[9px] bg-indigo-50 border border-indigo-100 px-1.5 py-0.2.5 rounded block w-max uppercase font-bold text-indigo-500">Dr</span>
        </div>
      )
    },
    {
      header: 'Credit Account (Cr)',
      key: 'creditAccount',
      sortable: true,
      className: 'font-bold text-emerald-700',
      render: (row) => (
        <div className="space-y-0.5">
          <span className="font-bold text-emerald-650">{row.creditAccount}</span>
          <span className="text-[9px] bg-emerald-50 border border-emerald-100 px-1.5 py-0.2.5 rounded block w-max uppercase font-bold text-emerald-500">Cr</span>
        </div>
      )
    },
    { header: 'Amount', key: 'amount', sortable: true, className: 'font-black text-slate-900 text-right', render: (row) => formatRupee(row.amount) },
    { header: 'Narration / Remark', key: 'narration', className: 'text-slate-500 max-w-[240px] truncate' }
  ];

  const hasActiveFilters = Object.values(filters).some(val => val !== '');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Journal Entries</h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm font-semibold">
            Post adjustment vouchers, disburse salaries, record depreciation adjustments, and execute double-entry corrections.
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5.5 bg-[#0A0F1F] text-white rounded-xl text-xs font-extrabold hover:bg-slate-800 transition-all shadow-md hover:-translate-y-0.5 w-full sm:w-auto flex-shrink-0 cursor-pointer animate-fade-in"
        >
          <Plus className="w-4 h-4" />
          <span>Post Journal Entry</span>
        </button>
      </div>

      {/* KPI summaries */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total JVs Amount', value: formatRupee(filteredJournal.reduce((s, r) => s + r.amount, 0)), icon: PenTool, color: 'text-indigo-650 bg-indigo-50 border-indigo-100' },
          { label: 'Active Debit Accounts', value: new Set(filteredJournal.map(e => e.debitAccount)).size, icon: BookOpen, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
          { label: 'Active Credit Accounts', value: new Set(filteredJournal.map(e => e.creditAccount)).size, icon: Calendar, color: 'text-amber-700 bg-amber-50 border-amber-100' },
          { label: 'Total Voucher count', value: filteredJournal.length, icon: AlertCircle, color: 'text-slate-705 bg-slate-50 border-slate-200/50' }
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

      {/* Controls: Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by voucher no, debit/credit account, narration..." />
        <FilterBar
          showFilters={showFilters}
          onToggle={() => setShowFilters(!showFilters)}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        >
          {/* Debit Account filter */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest mb-1.5 block">Debit Account</label>
            <select
              value={filters.debitAccount}
              onChange={e => setFilter('debitAccount', e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 bg-white text-slate-700 transition-all cursor-pointer"
            >
              <option value="">All Accounts</option>
              {accountsList.map(acc => (
                <option key={acc} value={acc}>{acc}</option>
              ))}
            </select>
          </div>

          {/* Credit Account filter */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-widest mb-1.5 block">Credit Account</label>
            <select
              value={filters.creditAccount}
              onChange={e => setFilter('creditAccount', e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 bg-white text-slate-700 transition-all cursor-pointer"
            >
              <option value="">All Accounts</option>
              {accountsList.map(acc => (
                <option key={acc} value={acc}>{acc}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-460 uppercase tracking-widest mb-1.5 block">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={e => setFilter('startDate', e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 bg-white text-slate-700 transition-all"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-460 uppercase tracking-widest mb-1.5 block">End Date</label>
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
        emptyTitle="No journal entries logged"
        emptyDescription="Create a journal voucher to post transaction adjustments."
        mobileCardRender={(row) => (
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-3 cursor-pointer hover:border-slate-350 transition-colors">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] font-mono text-slate-400 font-bold">{row.voucherNo}</p>
                <h4 className="font-bold text-slate-700 text-xs mt-0.5">{fmtDate(row.date)}</h4>
              </div>
              <span className="text-base font-black text-slate-900">{formatRupee(row.amount)}</span>
            </div>
            
            <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 flex flex-col gap-1.5 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Dr:</span>
                <span className="font-bold text-indigo-650">{row.debitAccount}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-1.5">
                <span className="text-slate-400">Cr:</span>
                <span className="font-bold text-emerald-650">{row.creditAccount}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic truncate border-t border-slate-100 pt-2">{row.narration}</p>
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
        title="Journal Voucher Details"
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
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Voucher Identification</p>
                <h4 className="text-lg font-black text-slate-800 font-mono mt-0.5">{detailItem.voucherNo}</h4>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-650 border border-slate-200">
                Journal Voucher
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                <span className="font-extrabold text-slate-400 uppercase tracking-widest text-[9px] block mb-1">Entry Date</span>
                <span className="font-bold text-slate-700">{fmtDate(detailItem.date)}</span>
              </div>
              <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                <span className="font-extrabold text-slate-400 uppercase tracking-widest text-[9px] block mb-1">Voucher System ID</span>
                <span className="font-bold text-slate-700">JV-{detailItem.id}</span>
              </div>
            </div>

            {/* Dual entries block */}
            <div className="space-y-3">
              <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Double-Entry Postings</h5>
              
              <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4.5 space-y-3 text-xs">
                {/* Debit entry */}
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-550 font-bold px-1.5 py-0.5 rounded uppercase">Debit (Dr)</span>
                    <p className="font-black text-slate-850 truncate mt-1">{detailItem.debitAccount}</p>
                  </div>
                  <span className="font-black text-indigo-650 text-sm whitespace-nowrap ml-auto">{formatRupee(detailItem.amount)}</span>
                </div>

                {/* Credit entry */}
                <div className="flex justify-between items-start gap-4 border-t border-slate-150 pt-3">
                  <div className="min-w-0">
                    <span className="text-[9px] bg-emerald-50 border border-emerald-100 text-emerald-550 font-bold px-1.5 py-0.5 rounded uppercase">Credit (Cr)</span>
                    <p className="font-black text-slate-850 truncate mt-1">{detailItem.creditAccount}</p>
                  </div>
                  <span className="font-black text-emerald-650 text-sm whitespace-nowrap ml-auto">{formatRupee(detailItem.amount)}</span>
                </div>
              </div>
            </div>

            {/* Narration notes */}
            <div>
              <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Narration / Remark Explanations</h5>
              <div className="bg-slate-50/20 border border-slate-200/60 p-4 rounded-xl text-xs font-semibold text-slate-700 leading-relaxed shadow-inner italic">
                "{detailItem.narration}"
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5 flex justify-between items-center text-sm font-black text-slate-900">
              <span className="text-slate-850">Total Reconciled Volume</span>
              <span className="text-lg text-slate-900">{formatRupee(detailItem.amount)}</span>
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* Post JV Entry Modal */}
      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Post New Journal Voucher"
        onSubmit={handleRecordJV}
        submitText="Post Voucher"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Voucher Date</label>
              <input
                type="date"
                value={newEntry.date}
                onChange={e => setNewEntry(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-4.5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-850 text-xs sm:text-sm font-semibold text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Voucher Amount (Dr = Cr)</label>
              <input
                type="number"
                value={newEntry.amount}
                onChange={e => setNewEntry(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="INR"
                className="w-full px-4.5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-850 text-xs sm:text-sm font-semibold text-slate-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1.5">Debit Account (Dr)</label>
              <select
                value={newEntry.debitAccount}
                onChange={e => setNewEntry(prev => ({ ...prev, debitAccount: e.target.value }))}
                className="w-full px-4.5 py-3 border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer rounded-xl"
              >
                <option value="">Select Account Ledger</option>
                {accountsList.map(acc => (
                  <option key={`dr-${acc}`} value={acc}>{acc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1.5">Credit Account (Cr)</label>
              <select
                value={newEntry.creditAccount}
                onChange={e => setNewEntry(prev => ({ ...prev, creditAccount: e.target.value }))}
                className="w-full px-4.5 py-3 border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer rounded-xl"
              >
                <option value="">Select Account Ledger</option>
                {accountsList.map(acc => (
                  <option key={`cr-${acc}`} value={acc}>{acc}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Narration / Explanatory Note</label>
            <textarea
              rows="3"
              value={newEntry.narration}
              onChange={e => setNewEntry(prev => ({ ...prev, narration: e.target.value }))}
              placeholder="Provide context explaining the transaction adjustment..."
              className="w-full px-4.5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-850 text-xs sm:text-sm font-semibold text-slate-700"
            />
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 text-amber-850 text-xs font-medium">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div className="leading-relaxed">
              <strong>Voucher Note:</strong> This transaction will automatically post dual-balanced double-entry rows: debiting the selected Dr account and crediting the selected Cr account.
            </div>
          </div>
        </div>
      </FormModal>
    </div>
  );
};

export default JournalEntries;
