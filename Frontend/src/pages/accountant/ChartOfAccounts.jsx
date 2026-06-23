import React, { useState, useMemo } from 'react';
import {
  ChevronDown, ChevronRight, Search, ListTree, FolderTree, FolderOpen,
  DollarSign, TrendingUp, Wallet, ArrowUpRight, HelpCircle
} from 'lucide-react';
import { useCalculations } from '../../hooks/useCalculations';
import { useStoreStore } from '../../store/store';

const ChartOfAccounts = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({
    Assets: true,
    Liabilities: true,
    Income: true,
    Expenses: true
  });

  const { selectedStore } = useStoreStore();
  const {
    totalRevenue,
    totalExpenses,
    costOfGoodsSold,
    totalCustomerDues,
    totalSupplierOutstanding,
    cashBalance,
    bankBalance,
    gstDetails,
    formatRupee
  } = useCalculations();

  // Expand / Collapse all toggler
  const [allExpanded, setAllExpanded] = useState(true);
  const handleToggleAll = () => {
    const nextState = !allExpanded;
    setExpandedGroups({
      Assets: nextState,
      Liabilities: nextState,
      Income: nextState,
      Expenses: nextState
    });
    setAllExpanded(nextState);
  };

  const handleToggleGroup = (group) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  // Determine branch scaling for loans
  const loansVal = useMemo(() => {
    const name = selectedStore?.store_name;
    if (!name || name === 'All Branches') return 150000;
    switch (name) {
      case 'Main Branch': return 75000;
      case 'Branch 2': return 45000;
      case 'Branch 3': return 20000;
      case 'Admin Store': return 10000;
      default: return 10000;
    }
  }, [selectedStore]);

  const dynamicChartOfAccounts = useMemo(() => {
    return {
      Assets: [
        { code: '1010', name: 'Cash In Hand', balance: cashBalance, type: 'Asset' },
        { code: '1020', name: 'HDFC Bank A/c', balance: Math.round(bankBalance * 0.6), type: 'Asset' },
        { code: '1030', name: 'SBI Bank A/c', balance: Math.round(bankBalance * 0.4), type: 'Asset' },
        { code: '1040', name: 'Optical Stock (Inventory)', balance: Math.round(costOfGoodsSold * 1.2), type: 'Asset' },
        { code: '1050', name: 'Trade Debtors (Customers)', balance: totalCustomerDues, type: 'Asset' }
      ],
      Liabilities: [
        { code: '2010', name: 'Trade Creditors (Payables)', balance: totalSupplierOutstanding, type: 'Liability' },
        { code: '2020', name: 'Business Loan (SBI)', balance: loansVal, type: 'Liability' },
        { code: '2030', name: 'GST Payable', balance: Math.max(0, gstDetails.gstPayable), type: 'Liability' }
      ],
      Income: [
        { code: '3010', name: 'Sales Revenue (Eyewear)', balance: totalRevenue, type: 'Income' },
        { code: '3020', name: 'Fitting Charges & Services', balance: Math.round(totalRevenue * 0.06), type: 'Income' },
        { code: '3030', name: 'Other Miscellaneous Income', balance: Math.round(totalRevenue * 0.01), type: 'Income' }
      ],
      Expenses: [
        { code: '4010', name: 'Inventory Procurement (Purchase)', balance: costOfGoodsSold, type: 'Expense' },
        { code: '4020', name: 'Store Rent Expense', balance: Math.round(totalExpenses * 0.5), type: 'Expense' },
        { code: '4030', name: 'Employee Salaries', balance: Math.round(totalExpenses * 0.3), type: 'Expense' },
        { code: '4040', name: 'Electricity & Internet (Utilities)', balance: Math.round(totalExpenses * 0.15), type: 'Expense' },
        { code: '4055', name: 'Marketing & Advertising', balance: Math.round(totalExpenses * 0.04), type: 'Expense' },
        { code: '4060', name: 'Miscellaneous Expenses', balance: Math.round(totalExpenses * 0.01), type: 'Expense' }
      ]
    };
  }, [cashBalance, bankBalance, costOfGoodsSold, totalCustomerDues, totalSupplierOutstanding, loansVal, gstDetails.gstPayable, totalRevenue, totalExpenses]);

  // Filter accounts based on query
  const filteredAccounts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return dynamicChartOfAccounts;

    const filtered = {};
    Object.keys(dynamicChartOfAccounts).forEach(group => {
      filtered[group] = dynamicChartOfAccounts[group].filter(
        acc => acc.name.toLowerCase().includes(query) || acc.code.includes(query)
      );
    });
    return filtered;
  }, [searchQuery, dynamicChartOfAccounts]);

  // Compute summary stats
  const totals = useMemo(() => {
    const stats = {
      Assets: { count: 0, balance: 0 },
      Liabilities: { count: 0, balance: 0 },
      Income: { count: 0, balance: 0 },
      Expenses: { count: 0, balance: 0 }
    };

    Object.keys(dynamicChartOfAccounts).forEach(group => {
      stats[group].count = dynamicChartOfAccounts[group].length;
      stats[group].balance = dynamicChartOfAccounts[group].reduce((s, r) => s + r.balance, 0);
    });

    return stats;
  }, [dynamicChartOfAccounts]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans space-y-6 sm:space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Chart of Accounts</h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm font-semibold">
            Define and organize ledger categories, check running account counts, and monitor capital balances.
          </p>
        </div>
        <button
          onClick={handleToggleAll}
          className="px-4.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap w-full sm:w-auto cursor-pointer"
        >
          {allExpanded ? 'Collapse All Groups' : 'Expand All Groups'}
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Asset Accounts', val: totals.Assets.balance, count: totals.Assets.count, icon: Wallet, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
          { label: 'Liability Accounts', val: totals.Liabilities.balance, count: totals.Liabilities.count, icon: DollarSign, color: 'text-rose-700 bg-rose-50 border-rose-100' },
          { label: 'Revenue/Income', val: totals.Income.balance, count: totals.Income.count, icon: TrendingUp, color: 'text-indigo-650 bg-indigo-50 border-indigo-100' },
          { label: 'Expense Overhead', val: totals.Expenses.balance, count: totals.Expenses.count, icon: ArrowUpRight, color: 'text-amber-700 bg-amber-50 border-amber-100' }
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="flex items-center gap-3.5 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className={`p-2.5 rounded-xl flex-shrink-0 ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{card.label}</p>
                <p className="text-base sm:text-lg font-black text-slate-800 mt-0.5 tracking-tight truncate">
                  {formatRupee(card.val)}
                </p>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">{card.count} active ledgers</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="relative w-full">
        <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-4.5 w-4.5 text-slate-400" />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Filter by account code or ledger name (e.g., Cash, SBI, Sales)..."
          className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-800 text-xs sm:text-sm font-semibold text-slate-700 transition-all bg-white"
        />
      </div>

      {/* Accounts tree structure */}
      <div className="space-y-4">
        {Object.keys(filteredAccounts).map(group => {
          const accounts = filteredAccounts[group];
          const isExpanded = expandedGroups[group];
          const groupTotal = accounts.reduce((acc, a) => acc + a.balance, 0);

          return (
            <div key={group} className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm">
              {/* Group Header */}
              <div
                onClick={() => handleToggleGroup(group)}
                className="flex items-center justify-between px-6 py-4.5 bg-slate-50/70 border-b border-slate-100 cursor-pointer select-none hover:bg-slate-100/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                  {isExpanded ? (
                    <FolderOpen className="w-5 h-5 text-slate-500" />
                  ) : (
                    <FolderTree className="w-5 h-5 text-slate-400" />
                  )}
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-800 uppercase tracking-wider">{group}</h3>
                  <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                    {accounts.length} Accounts
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Group Balance</span>
                  <span className="font-black text-sm sm:text-base text-slate-900">{formatRupee(groupTotal)}</span>
                </div>
              </div>

              {/* Accounts list inside group */}
              {isExpanded && (
                <div className="divide-y divide-slate-100 overflow-x-auto w-full">
                  {accounts.length > 0 ? (
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-slate-50/20 text-slate-400 font-extrabold text-[10px] uppercase tracking-widest border-b border-slate-100">
                          <th className="px-6 py-3">Account Code</th>
                          <th className="px-6 py-3">Account Name</th>
                          <th className="px-6 py-3">Account Type</th>
                          <th className="px-6 py-3 text-right">Current Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-650">
                        {accounts.map(acc => (
                          <tr key={acc.code} className="hover:bg-slate-55/10 transition-colors">
                            <td className="px-6 py-3.5 font-mono font-bold text-slate-800">{acc.code}</td>
                            <td className="px-6 py-3.5 font-bold text-slate-700">{acc.name}</td>
                            <td className="px-6 py-3.5">
                              <span className="inline-flex items-center px-2 py-0.5 bg-slate-50 border border-slate-150 rounded-lg text-[10px] font-bold text-slate-500">
                                {acc.type}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-right font-black text-slate-900">{formatRupee(acc.balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs sm:text-sm font-semibold">
                      No matching accounts in this group.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChartOfAccounts;
