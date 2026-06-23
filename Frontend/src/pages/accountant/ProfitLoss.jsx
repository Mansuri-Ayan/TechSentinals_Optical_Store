import React from 'react';
import { BarChart3, ArrowUpRight } from 'lucide-react';
import {
  LineChart,
  BarChart,
  StoreRevenueProgress
} from '../../components/shared/Charts';
import {
  DASHBOARD_CHARTS_DATA,
  MOCK_PROFIT_LOSS
} from '../../data/accountantData';
import { useCalculations } from '../../hooks/useCalculations';

const formatRupee = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const ProfitLoss = () => {
  const {
    totalRevenue,
    totalExpenses,
    grossProfit,
    netProfit
  } = useCalculations();

  const statCards = [
    { title: 'Revenue', value: formatRupee(totalRevenue), tc: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
    { title: 'Expenses', value: formatRupee(totalExpenses), tc: 'text-rose-700 bg-rose-50 border-rose-100' },
    { title: 'Gross Profit', value: formatRupee(grossProfit), tc: 'text-blue-700 bg-blue-50 border-blue-100' },
    { title: 'Net Profit', value: formatRupee(netProfit), tc: 'text-teal-700 bg-teal-50 border-teal-100' }
  ];

  const revenueVsExpenseData = [
    { name: 'Revenue', value: totalRevenue, color: '#10B981' },
    { name: 'Expenses', value: totalExpenses, color: '#EF4444' },
    { name: 'Gross', value: grossProfit, color: '#3B82F6' },
    { name: 'Net', value: netProfit, color: '#6366F1' }
  ];

  return (
    <div className="p-3 sm:p-5 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans space-y-4 sm:space-y-6 lg:space-y-8 min-w-0 overflow-x-hidden">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0" />
          <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Profit & Loss</h1>
        </div>
        <p className="text-slate-500 text-[11px] sm:text-xs lg:text-sm font-semibold">Comprehensive profit and loss overview with trend analysis.</p>
      </div>

      {/* KPI Cards — 2 cols mobile, 4 cols tablet+ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all">
            <p className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 sm:mb-2">{stat.title}</p>
            <h3 className="text-base sm:text-lg lg:text-xl font-black text-slate-800 tracking-tight truncate">{stat.value}</h3>
            <div className={`inline-flex items-center gap-1 mt-1 sm:mt-2 px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold border ${stat.tc}`}>
              <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>Current Period</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid — 1 col mobile, 2 cols tablet+ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Revenue vs Expense Bar Chart */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm p-4 sm:p-6 lg:p-8">
          <div className="flex justify-between items-start mb-4 sm:mb-6">
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-850 tracking-tight">Revenue vs Expense</h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-0.5">Comparative overview of income and expenditure.</p>
            </div>
            <span className="text-[9px] sm:text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded font-bold uppercase tracking-wider flex-shrink-0 ml-2">Summary</span>
          </div>
          <div className="min-h-[200px] sm:min-h-[260px] w-full overflow-hidden">
            <BarChart data={revenueVsExpenseData} />
          </div>
        </div>

        {/* Monthly Profit Trend */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm p-4 sm:p-6 lg:p-8">
          <div className="flex justify-between items-start mb-4 sm:mb-6">
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-850 tracking-tight">Monthly Profit Trend</h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-0.5">Net profit trajectory across months.</p>
            </div>
            <span className="text-[9px] sm:text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded font-bold uppercase tracking-wider flex-shrink-0 ml-2">Trend</span>
          </div>
          <div className="min-h-[200px] sm:min-h-[260px] w-full overflow-hidden">
            <LineChart data={DASHBOARD_CHARTS_DATA.profitTrend} strokeColor="#6366F1" gradientColor="#6366F1" />
          </div>
        </div>
      </div>

      {/* Store-wise Profit */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-start mb-4 sm:mb-6">
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-slate-850 tracking-tight">Store-wise Profit</h3>
            <p className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-0.5">Revenue, expenses, and net profit by branch.</p>
          </div>
          <span className="text-[9px] sm:text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded font-bold uppercase tracking-wider flex-shrink-0 ml-2">Stores</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="overflow-hidden">
            <StoreRevenueProgress data={MOCK_PROFIT_LOSS.storeWiseProfit} />
          </div>
          <div className="space-y-3 sm:space-y-4">
            {MOCK_PROFIT_LOSS.storeWiseProfit.map((store, idx) => (
              <div key={idx} className="bg-slate-50/50 rounded-xl sm:rounded-2xl border border-slate-100 p-3 sm:p-4 hover:border-slate-250 transition-colors">
                <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                  <span className="font-bold text-xs sm:text-sm text-slate-800 truncate">{store.storeName}</span>
                  <span className={`text-[11px] sm:text-xs font-bold flex-shrink-0 ml-2 ${store.profit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatRupee(store.profit)}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-[9px] sm:text-[10px]">
                  <div>
                    <span className="text-slate-400 font-bold">Revenue</span>
                    <p className="font-bold text-slate-700">{formatRupee(store.revenue)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold">Expenses</span>
                    <p className="font-bold text-slate-700">{formatRupee(store.expenses)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold">Margin</span>
                    <p className="font-bold text-emerald-600">{Math.round((store.profit / store.revenue) * 100)}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitLoss;
