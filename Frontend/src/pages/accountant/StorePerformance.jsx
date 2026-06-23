import React, { useState, useMemo } from 'react';
import { Store, TrendingUp, ArrowUpRight } from 'lucide-react';
import {
  BarChart,
  StoreRevenueProgress
} from '../../components/shared/Charts';
import { MOCK_STORE_PERFORMANCE } from '../../data/accountantData';

const formatRupee = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const StorePerformance = () => {
  const [selectedStoreId, setSelectedStoreId] = useState(null);

  const filteredStores = useMemo(() => {
    if (!selectedStoreId) return MOCK_STORE_PERFORMANCE;
    return MOCK_STORE_PERFORMANCE.filter(s => s.id === selectedStoreId);
  }, [selectedStoreId]);

  const aggregated = useMemo(() => {
    return filteredStores.reduce((acc, s) => ({
      revenue: acc.revenue + s.revenue,
      expenses: acc.expenses + s.expenses,
      profit: acc.profit + s.profit,
      orders: acc.orders + s.orders,
      customers: acc.customers + s.customers,
      gstCollected: acc.gstCollected + s.gstCollected
    }), { revenue: 0, expenses: 0, profit: 0, orders: 0, customers: 0, gstCollected: 0 });
  }, [filteredStores]);

  const metricCards = [
    { title: 'Revenue', value: formatRupee(aggregated.revenue), tc: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
    { title: 'Expenses', value: formatRupee(aggregated.expenses), tc: 'text-rose-700 bg-rose-50 border-rose-100' },
    { title: 'Profit', value: formatRupee(aggregated.profit), tc: 'text-blue-700 bg-blue-50 border-blue-100' },
    { title: 'Orders', value: aggregated.orders.toLocaleString('en-IN'), tc: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
    { title: 'Customers', value: aggregated.customers.toLocaleString('en-IN'), tc: 'text-violet-700 bg-violet-50 border-violet-100' },
    { title: 'GST Collected', value: formatRupee(aggregated.gstCollected), tc: 'text-amber-700 bg-amber-50 border-amber-100' }
  ];

  const revenueComparisonData = MOCK_STORE_PERFORMANCE.map(s => ({
    name: s.storeName.replace('Main Branch', 'Main').replace('Branch ', 'B').replace('Admin Store', 'Admin'),
    value: s.revenue,
    color: s.color
  }));

  const profitComparisonData = MOCK_STORE_PERFORMANCE.map(s => ({
    name: s.storeName.replace('Main Branch', 'Main').replace('Branch ', 'B').replace('Admin Store', 'Admin'),
    value: s.profit,
    color: s.color
  }));

  const expenseComparisonData = MOCK_STORE_PERFORMANCE.map(s => ({
    name: s.storeName.replace('Main Branch', 'Main').replace('Branch ', 'B').replace('Admin Store', 'Admin'),
    value: s.expenses,
    color: s.color
  }));

  return (
    <div className="p-3 sm:p-5 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans space-y-4 sm:space-y-6 lg:space-y-8 min-w-0 overflow-x-hidden">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Store className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0" />
          <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Store Performance</h1>
        </div>
        <p className="text-slate-500 text-[11px] sm:text-xs lg:text-sm font-semibold">Branch-wise analytics and performance metrics.</p>
      </div>

      {/* Store Selector — horizontal scroll on mobile, grid on larger */}
      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1 hide-scrollbar sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:overflow-visible sm:pb-0">
        <button
          onClick={() => setSelectedStoreId(null)}
          className={`flex-shrink-0 sm:flex-shrink p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer min-w-[120px] sm:min-w-0 ${
            !selectedStoreId
              ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
              : 'bg-white border-slate-200/60 text-slate-700 hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          <p className={`text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider mb-0.5 sm:mb-1 ${!selectedStoreId ? 'text-slate-300' : 'text-slate-400'}`}>View</p>
          <p className={`text-xs sm:text-sm font-black ${!selectedStoreId ? 'text-white' : 'text-slate-800'}`}>All Stores</p>
        </button>
        {MOCK_STORE_PERFORMANCE.map(store => (
          <button
            key={store.id}
            onClick={() => setSelectedStoreId(store.id === selectedStoreId ? null : store.id)}
            className={`flex-shrink-0 sm:flex-shrink p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer min-w-[120px] sm:min-w-0 ${
              selectedStoreId === store.id
                ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                : 'bg-white border-slate-200/60 text-slate-700 hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <p className={`text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider mb-0.5 sm:mb-1 ${selectedStoreId === store.id ? 'text-slate-300' : 'text-slate-400'}`}>{store.location}</p>
            <p className={`text-xs sm:text-sm font-black whitespace-nowrap ${selectedStoreId === store.id ? 'text-white' : 'text-slate-800'}`}>{store.storeName}</p>
          </button>
        ))}
      </div>

      {/* Metric Cards — 2 cols mobile, 3 cols tablet, 6 cols desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {metricCards.map((card, idx) => (
          <div key={idx} className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all">
            <p className="text-[8px] sm:text-[9px] font-extrabold text-slate-450 uppercase tracking-wider mb-1 sm:mb-2">{card.title}</p>
            <h3 className="text-xs sm:text-sm lg:text-base font-black text-slate-800 tracking-tight truncate">{card.value}</h3>
            <div className={`inline-flex items-center gap-1 mt-1 sm:mt-2 px-1.5 sm:px-2 py-0.5 rounded-lg text-[8px] sm:text-[9px] font-bold border ${card.tc}`}>
              <TrendingUp className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
              <span>{selectedStoreId ? 'Store' : 'All'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Store Detail Cards — only when showing all stores */}
      {!selectedStoreId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {MOCK_STORE_PERFORMANCE.map(store => (
            <div
              key={store.id}
              onClick={() => setSelectedStoreId(store.id)}
              className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/60 shadow-sm p-3 sm:p-5 hover:shadow-md hover:border-slate-350 cursor-pointer transition-all group"
            >
              <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 group-hover:text-slate-900 truncate">{store.storeName}</h3>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold">{store.location}</p>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 group-hover:text-emerald-500 transition-colors flex-shrink-0 ml-2" />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 text-[9px] sm:text-[10px]">
                <div>
                  <span className="text-slate-400 font-bold block">Revenue</span>
                  <span className="font-bold text-slate-800">{formatRupee(store.revenue)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Expenses</span>
                  <span className="font-bold text-slate-800">{formatRupee(store.expenses)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Profit</span>
                  <span className={`font-bold ${store.profit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatRupee(store.profit)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Orders</span>
                  <span className="font-bold text-slate-800">{store.orders}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Customers</span>
                  <span className="font-bold text-slate-800">{store.customers}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">GST</span>
                  <span className="font-bold text-slate-800">{formatRupee(store.gstCollected)}</span>
                </div>
              </div>
              {/* Mini progress bar */}
              <div className="mt-2 sm:mt-3 w-full bg-slate-100 h-1 sm:h-1.5 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round((store.profit / store.revenue) * 100)}%`, backgroundColor: store.color }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts — 1 col mobile, 2 cols tablet, 3 cols desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Store Revenue Comparison */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm p-4 sm:p-6 lg:p-8">
          <div className="flex justify-between items-start mb-4 sm:mb-6">
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-850 tracking-tight">Revenue Comparison</h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-0.5">Revenue by branch.</p>
            </div>
            <span className="text-[9px] sm:text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded font-bold uppercase tracking-wider flex-shrink-0 ml-2">Revenue</span>
          </div>
          <div className="min-h-[200px] sm:min-h-[260px] w-full overflow-hidden">
            <BarChart data={revenueComparisonData} />
          </div>
        </div>

        {/* Store Profit Comparison */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm p-4 sm:p-6 lg:p-8">
          <div className="flex justify-between items-start mb-4 sm:mb-6">
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-850 tracking-tight">Profit Comparison</h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-0.5">Net profit by branch.</p>
            </div>
            <span className="text-[9px] sm:text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded font-bold uppercase tracking-wider flex-shrink-0 ml-2">Profit</span>
          </div>
          <div className="min-h-[200px] sm:min-h-[260px] w-full overflow-hidden">
            <BarChart data={profitComparisonData} />
          </div>
        </div>

        {/* Store Expense Comparison */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm p-4 sm:p-6 lg:p-8 md:col-span-2 xl:col-span-1">
          <div className="flex justify-between items-start mb-4 sm:mb-6">
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-850 tracking-tight">Expense Comparison</h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-0.5">Total expenses by branch.</p>
            </div>
            <span className="text-[9px] sm:text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded font-bold uppercase tracking-wider flex-shrink-0 ml-2">Expense</span>
          </div>
          <div className="min-h-[200px] sm:min-h-[260px] w-full overflow-hidden">
            <BarChart data={expenseComparisonData} />
          </div>
        </div>
      </div>

    </div>
  );
};

export default StorePerformance;
