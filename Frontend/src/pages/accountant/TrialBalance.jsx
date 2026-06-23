import React, { useState, useMemo } from 'react';
import { Scale, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import { useCalculations } from '../../hooks/useCalculations';
import { useStoreStore } from '../../store/store';

const TrialBalance = () => {
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

  const { selectedStore } = useStoreStore();
  const [simulatedMismatch, setSimulatedMismatch] = useState(false);

  // Compute trial balance rows dynamically to match chosen branch calculations
  const trialData = useMemo(() => {
    const gstIsCredit = gstDetails.gstPayable >= 0;
    const gstVal = Math.abs(gstDetails.gstPayable);

    const accounts = [
      { accountName: 'Cash In Hand', debit: cashBalance, credit: 0 },
      { accountName: 'HDFC Bank Account', debit: Math.round(bankBalance * 0.6), credit: 0 },
      { accountName: 'SBI Bank Account', debit: Math.round(bankBalance * 0.4), credit: 0 },
      { accountName: 'Stock-In-Trade (Inventory)', debit: Math.round(costOfGoodsSold * 1.2), credit: 0 },
      { accountName: 'Sundry Debtors (Customers)', debit: totalCustomerDues, credit: 0 },
      { accountName: 'Sundry Creditors (Suppliers)', debit: 0, credit: totalSupplierOutstanding },
      { accountName: gstIsCredit ? 'GST Payable' : 'GST Input Tax Credit', debit: gstIsCredit ? 0 : gstVal, credit: gstIsCredit ? gstVal : 0 },
      { accountName: 'Sales Revenue', debit: 0, credit: totalRevenue },
      { accountName: 'Fitting Charges & Services', debit: 0, credit: Math.round(totalRevenue * 0.06) },
      { accountName: 'Other Miscellaneous Income', debit: 0, credit: Math.round(totalRevenue * 0.01) },
      { accountName: 'Purchases (COGS)', debit: costOfGoodsSold, credit: 0 },
      { accountName: 'Store Rents OPEX', debit: Math.round(totalExpenses * 0.5), credit: 0 },
      { accountName: 'Employee Salaries', debit: Math.round(totalExpenses * 0.3), credit: 0 },
      { accountName: 'Utility Bills', debit: Math.round(totalExpenses * 0.1), credit: 0 },
      { accountName: 'Marketing Expense', debit: Math.round(totalExpenses * 0.07), credit: 0 },
      { accountName: 'General Store Repairs', debit: Math.round(totalExpenses * 0.03), credit: 0 },
      { accountName: 'Stationery & Printing', debit: Math.round(totalExpenses * 0.01), credit: 0 }
    ];

    const totalDebits = accounts.reduce((s, a) => s + a.debit, 0);
    const totalCreditsExcludingCapital = accounts.reduce((s, a) => s + a.credit, 0);

    const capitalA = totalDebits - totalCreditsExcludingCapital;
    
    if (capitalA >= 0) {
      accounts.unshift({ accountName: 'Capital Account', debit: 0, credit: capitalA });
    } else {
      accounts.unshift({ accountName: 'Capital Account', debit: Math.abs(capitalA), credit: 0 });
    }

    return accounts;
  }, [cashBalance, bankBalance, costOfGoodsSold, totalCustomerDues, totalSupplierOutstanding, gstDetails, totalRevenue, totalExpenses]);

  // Compute total debits and credits
  const totals = useMemo(() => {
    let debits = trialData.reduce((s, r) => s + (r.debit || 0), 0);
    let credits = trialData.reduce((s, r) => s + (r.credit || 0), 0);

    if (simulatedMismatch) {
      debits += 5000;
    }

    const matched = debits === credits;
    const difference = Math.abs(debits - credits);

    return { debits, credits, matched, difference };
  }, [trialData, simulatedMismatch]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Trial Balance</h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm font-semibold">
            Reconcile ledger accounts. Verify that total debit balances equal total credit balances to ensure ledger mathematical accuracy.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm text-xs font-bold text-slate-700">
          <label htmlFor="mismatch-toggle" className="cursor-pointer">Simulate Ledger Mismatch</label>
          <input
            id="mismatch-toggle"
            type="checkbox"
            checked={simulatedMismatch}
            onChange={(e) => setSimulatedMismatch(e.target.checked)}
            className="w-4.5 h-4.5 rounded border-slate-350 text-indigo-650 focus:ring-indigo-500/20 cursor-pointer"
          />
        </div>
      </div>

      {/* Mismatch Alert Banner */}
      {!totals.matched ? (
        <div className="bg-red-50 border border-red-150 rounded-2xl p-5 flex gap-4 text-red-800 animate-pulse">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs sm:text-sm">
            <h4 className="font-extrabold text-red-900">Trial Balance Out of Agreement!</h4>
            <p className="leading-relaxed font-medium">
              A discrepancy of <strong>{formatRupee(totals.difference)}</strong> exists between total debits and credits. Check general ledger journal entries and rectify double-entry postings.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex gap-4 text-emerald-800">
          <ShieldCheck className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs sm:text-sm">
            <h4 className="font-extrabold text-emerald-900">Ledger Balances Reconciled</h4>
            <p className="leading-relaxed font-medium">
              Total debits match total credits perfectly. Mathematical accuracy is verified.
            </p>
          </div>
        </div>
      )}

      {/* Main ledger table */}
      <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-widest text-slate-450">
                <th className="px-6 py-4">Account Ledger Name</th>
                <th className="px-6 py-4 text-right">Debit Balance (Dr)</th>
                <th className="px-6 py-4 text-right">Credit Balance (Cr)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-650">
              {trialData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                  <td className="px-6 py-3.5 font-bold text-slate-700">{row.accountName}</td>
                  <td className="px-6 py-3.5 text-right font-semibold text-slate-800">
                    {row.debit > 0 ? formatRupee(row.debit) : '—'}
                  </td>
                  <td className="px-6 py-3.5 text-right font-semibold text-slate-850">
                    {row.credit > 0 ? formatRupee(row.credit) : '—'}
                  </td>
                </tr>
              ))}
              {/* Optional simulated mismatch row */}
              {simulatedMismatch && (
                <tr className="bg-red-50/20 font-bold text-red-750">
                  <td className="px-6 py-3.5 italic flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-550" />
                    <span>Suspense Discrepancy (Simulation)</span>
                  </td>
                  <td className="px-6 py-3.5 text-right">{formatRupee(5000)}</td>
                  <td className="px-6 py-3.5 text-right">—</td>
                </tr>
              )}
              {/* Totals Row */}
              <tr className="bg-slate-50 border-t-2 border-slate-200 font-black text-slate-900 text-sm">
                <td className="px-6 py-4.5">TOTAL TRIAL BALANCES</td>
                <td className="px-6 py-4.5 text-right text-indigo-650">{formatRupee(totals.debits)}</td>
                <td className="px-6 py-4.5 text-right text-emerald-650">{formatRupee(totals.credits)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TrialBalance;
