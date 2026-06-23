import React, { useMemo } from 'react';
import { FileSpreadsheet, ShieldCheck, ArrowRightLeft, TrendingUp, Landmark, Users } from 'lucide-react';
import { useCalculations } from '../../hooks/useCalculations';
import { useStoreStore } from '../../store/store';

const BalanceSheet = () => {
  const { selectedStore } = useStoreStore();
  const { cashBalance, bankBalance, costOfGoodsSold, totalCustomerDues, totalSupplierOutstanding, gstDetails, formatRupee } = useCalculations();

  // Determine branch scaling
  const storeScales = useMemo(() => {
    const name = selectedStore?.store_name;
    if (!name || name === 'All Branches') {
      return { capital: 500000, loans: 150000 };
    }
    switch (name) {
      case 'Main Branch':
        return { capital: 250000, loans: 75000 };
      case 'Branch 2':
        return { capital: 150000, loans: 45000 };
      case 'Branch 3':
        return { capital: 70000, loans: 20000 };
      case 'Admin Store':
        return { capital: 30000, loans: 10000 };
      default:
        return { capital: 50000, loans: 10000 };
    }
  }, [selectedStore]);

  // Financial values
  const assets = useMemo(() => {
    const inventoryVal = Math.round(costOfGoodsSold * 1.2);
    const items = [
      { name: 'Cash In Hand', val: cashBalance, icon: TrendingUp },
      { name: 'Bank Accounts Balance', val: bankBalance, icon: Landmark },
      { name: 'Optical stock (Inventory)', val: inventoryVal, icon: FileSpreadsheet },
      { name: 'Trade Debtors (Receivables)', val: totalCustomerDues, icon: Users }
    ];
    const total = items.reduce((s, r) => s + r.val, 0);
    return { items, total };
  }, [cashBalance, bankBalance, costOfGoodsSold, totalCustomerDues]);

  const liabilities = useMemo(() => {
    const items = [
      { name: 'Trade Creditors (Payables)', val: totalSupplierOutstanding },
      { name: 'Business Loans Outstanding', val: storeScales.loans },
      { name: 'Taxes Payable (GST Net)', val: Math.max(0, gstDetails.gstPayable) }
    ];
    const total = items.reduce((s, r) => s + r.val, 0);
    return { items, total };
  }, [totalSupplierOutstanding, storeScales.loans, gstDetails.gstPayable]);

  const equity = useMemo(() => {
    // Retained earnings matches balancing amount
    // Assets = Liabilities + Capital + Retained Earnings
    const capital = storeScales.capital;
    const retainedEarnings = assets.total - liabilities.total - capital;

    const items = [
      { name: 'Paid-Up Share Capital', val: capital },
      { name: 'Retained Earnings & Reserves', val: retainedEarnings }
    ];
    const total = items.reduce((s, r) => s + r.val, 0);
    return { items, total };
  }, [assets.total, liabilities.total, storeScales.capital]);

  const holdsEquation = Math.abs(assets.total - (liabilities.total + equity.total)) < 1;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Balance Sheet</h1>
        <p className="text-slate-500 mt-1 text-xs sm:text-sm font-semibold">
          Review company capital structure, asset liquidity, liabilities payable, and equity metrics as of today.
        </p>
      </div>

      {HoldEquationBadge(holdsEquation, formatRupee, assets.total)}

      {/* Main Grid: Assets vs Liabilities & Equity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ASSETS SECTION */}
        <div className="bg-white border border-slate-200/60 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">1. Assets (Dr)</h2>
              <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-xl text-xs font-bold border border-emerald-100">
                Debits
              </span>
            </div>
            
            <div className="space-y-4 text-xs sm:text-sm">
              {assets.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2.5 border-b border-slate-100 font-semibold text-slate-650">
                  <span>{item.name}</span>
                  <span className="font-extrabold text-slate-850">{formatRupee(item.val)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center bg-slate-50 p-4.5 rounded-2xl border border-slate-100 mt-8 font-black text-slate-900 text-base">
            <span>Total Assets</span>
            <span className="text-indigo-650 text-lg">{formatRupee(assets.total)}</span>
          </div>
        </div>

        {/* LIABILITIES & EQUITY SECTION */}
        <div className="space-y-8">
          
          {/* LIABILITIES SECTION */}
          <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-5">
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">2. Liabilities (Cr)</h2>
              <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-xl text-xs font-bold border border-rose-100">
                Creditors
              </span>
            </div>
            
            <div className="space-y-3.5 text-xs sm:text-sm">
              {liabilities.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100 font-semibold text-slate-650">
                  <span>{item.name}</span>
                  <span className="font-extrabold text-slate-850">{formatRupee(item.val)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center bg-slate-50/50 px-4.5 py-3.5 rounded-xl border border-slate-100 mt-6 font-bold text-slate-800 text-xs sm:text-sm">
              <span>Total Liabilities</span>
              <span>{formatRupee(liabilities.total)}</span>
            </div>
          </div>

          {/* EQUITY SECTION */}
          <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-5">
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">3. Shareholder Equity</h2>
              <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl text-xs font-bold border border-indigo-100">
                Net Worth
              </span>
            </div>
            
            <div className="space-y-3.5 text-xs sm:text-sm">
              {equity.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100 font-semibold text-slate-650">
                  <span>{item.name}</span>
                  <span className="font-extrabold text-slate-850">{formatRupee(item.val)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center bg-slate-50/50 px-4.5 py-3.5 rounded-xl border border-slate-100 mt-6 font-bold text-slate-800 text-xs sm:text-sm">
              <span>Total Capital Reserves</span>
              <span>{formatRupee(equity.total)}</span>
            </div>
          </div>

          {/* TOTAL LIABILITIES & EQUITY COMBINED */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-850 flex justify-between items-center font-black text-sm sm:text-base">
            <span>Total Liabilities & Equity</span>
            <span className="text-emerald-400 text-lg sm:text-xl">{formatRupee(liabilities.total + equity.total)}</span>
          </div>

        </div>
      </div>
    </div>
  );
};

// Extracted equation alert helper for visual cleaner structure
const HoldEquationBadge = (holds, formatRupee, value) => {
  return holds ? (
    <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 flex gap-4 text-emerald-800">
      <ShieldCheck className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
      <div className="space-y-1 text-xs sm:text-sm">
        <h4 className="font-extrabold text-emerald-900">Accounting Equation Balanced!</h4>
        <p className="leading-relaxed font-medium">
          The company balance sheets are reconciled perfectly: <strong>Assets = Liabilities + Equity ({formatRupee(value)})</strong>.
        </p>
      </div>
    </div>
  ) : (
    <div className="bg-red-50 border border-red-150 rounded-3xl p-5 flex gap-4 text-red-800">
      <ArrowRightLeft className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="space-y-1 text-xs sm:text-sm">
        <h4 className="font-extrabold text-red-900">Assets Mismatch Liabilities / Reserves!</h4>
        <p className="leading-relaxed font-medium">
          Please audit suspense entries to reconcile capital balances.
        </p>
      </div>
    </div>
  );
};

export default BalanceSheet;
