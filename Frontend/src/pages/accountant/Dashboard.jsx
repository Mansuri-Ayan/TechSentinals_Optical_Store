import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, DollarSign, AlertTriangle, ArrowUpRight,
  Calendar, Receipt, FileText, Truck
} from 'lucide-react';
import {
  LineChart,
  StoreRevenueProgress
} from '../../components/shared/Charts';
import {
  DASHBOARD_CHARTS_DATA,
  DASHBOARD_GST_TREND,
  MOCK_PROFIT_LOSS
} from '../../data/accountantData';
import { useCalculations } from '../../hooks/useCalculations';
import { useStoreStore } from '../../store/store';

const Dashboard = () => {
  const navigate = useNavigate();
  const { selectedStore } = useStoreStore();
  const {
    totalRevenue,
    totalExpenses,
    netProfit,
    totalCustomerDues,
    totalSupplierOutstanding,
    gstDetails,
    formatRupee
  } = useCalculations();

  const currentDateString = useMemo(() => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-IN', options);
  }, []);

  const expenseTrendData = [
    { label: 'Jan', value: 85000 },
    { label: 'Feb', value: 102000 },
    { label: 'Mar', value: 124000 },
    { label: 'Apr', value: 110000 },
    { label: 'May', value: 145000 },
    { label: 'Jun', value: totalExpenses }
  ];

  const profitTrendData = DASHBOARD_CHARTS_DATA.profitTrend;

  const statCards = [
    { title: 'Total Revenue', value: formatRupee(totalRevenue), icon: DollarSign, tc: 'text-emerald-700 bg-emerald-50 border-emerald-100', path: '/accountant/sales-ledger' },
    { title: 'Total Expenses', value: formatRupee(totalExpenses), icon: Receipt, tc: 'text-indigo-700 bg-indigo-50 border-indigo-100', path: '/accountant/expenses' },
    { title: 'Net Profit', value: formatRupee(netProfit), icon: TrendingUp, tc: 'text-teal-700 bg-teal-50 border-teal-100', path: '/accountant/profit-loss' },
    { title: 'Total GST Collected', value: formatRupee(gstDetails.outputGST), icon: Receipt, tc: 'text-violet-700 bg-violet-50 border-violet-100', path: '/accountant/reports' },
    { title: 'Pending Customer Dues', value: formatRupee(totalCustomerDues), icon: AlertTriangle, tc: 'text-rose-700 bg-rose-50 border-rose-100', path: '/accountant/customer-dues' },
    { title: 'Pending Supplier Payments', value: formatRupee(totalSupplierOutstanding), icon: Truck, tc: 'text-amber-700 bg-amber-50 border-amber-100', path: '/accountant/supplier-payments' }
  ];

  return (
    <div className="p-3 sm:p-5 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans space-y-4 sm:space-y-6 lg:space-y-8 bg-transparent min-w-0 overflow-x-hidden">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 text-slate-800 shadow-sm border border-slate-200/60 flex flex-col gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-1.5 text-slate-400 font-extrabold text-[9px] sm:text-[10px] uppercase tracking-widest">
            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{currentDateString}</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            Financial Dashboard
          </h1>
          <p className="text-slate-500 text-[11px] sm:text-xs lg:text-sm font-semibold max-w-xl">
            Real-time financial overview across all branches.
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => navigate('/accountant/reports')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4.5 py-2 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Generate Report</span>
          </button>
          <button
            onClick={() => navigate('/accountant/store-performance')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4.5 py-2 sm:py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>Store Performance</span>
          </button>
        </div>
      </div>

      {/* KPI Cards — 2 cols mobile, 3 cols tablet, 6 cols desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              onClick={() => navigate(stat.path)}
              className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-slate-350 cursor-pointer transition-all flex flex-col justify-between min-h-[100px] sm:min-h-[120px] select-none group"
            >
              <div className="flex justify-between items-start gap-1">
                <p className="text-[8px] sm:text-[9px] font-extrabold text-slate-450 uppercase tracking-wider group-hover:text-slate-600 transition-colors leading-tight">{stat.title}</p>
                <div className={`p-1 sm:p-1.5 rounded-lg flex-shrink-0 ${stat.tc}`}>
                  <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
              </div>
              <div className="mt-1 sm:mt-2 min-w-0">
                <h3 className="text-xs sm:text-sm lg:text-base font-black text-slate-800 tracking-tight leading-tight truncate">{stat.value}</h3>
                <span className="text-[7px] sm:text-[8.5px] font-bold text-slate-400 mt-0.5 sm:mt-1 block group-hover:text-slate-600 transition-colors">View Details →</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Primary Charts — 1 col mobile, 2 cols tablet, 3 cols desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Revenue Trend */}
        <div
          onClick={() => navigate('/accountant/sales-ledger')}
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm p-4 sm:p-6 lg:p-8 flex flex-col hover:shadow-md hover:border-slate-350 transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-3 sm:mb-6">
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-850 tracking-tight group-hover:text-slate-900">Revenue Trend</h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-0.5 truncate">Monthly gross sales across branches.</p>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-emerald-500 transition-colors flex-shrink-0 ml-2" />
          </div>
          <div className="flex-1 min-h-[180px] sm:min-h-[220px] w-full overflow-hidden">
            <LineChart data={DASHBOARD_CHARTS_DATA.revenueOverview} strokeColor="#10B981" gradientColor="#10B981" />
          </div>
        </div>

        {/* Expense Trend */}
        <div
          onClick={() => navigate('/accountant/expenses')}
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm p-4 sm:p-6 lg:p-8 flex flex-col hover:shadow-md hover:border-slate-350 transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-3 sm:mb-6">
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-850 tracking-tight group-hover:text-slate-900">Expense Trend</h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-0.5 truncate">Monthly operating expenses timeline.</p>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-rose-500 transition-colors flex-shrink-0 ml-2" />
          </div>
          <div className="flex-1 min-h-[180px] sm:min-h-[220px] w-full overflow-hidden">
            <LineChart data={expenseTrendData} strokeColor="#EF4444" gradientColor="#EF4444" />
          </div>
        </div>

        {/* Profit Trend */}
        <div
          onClick={() => navigate('/accountant/profit-loss')}
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm p-4 sm:p-6 lg:p-8 flex flex-col hover:shadow-md hover:border-slate-350 transition-all cursor-pointer group md:col-span-2 xl:col-span-1"
        >
          <div className="flex justify-between items-start mb-3 sm:mb-6">
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-850 tracking-tight group-hover:text-slate-900">Profit Trend</h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-0.5 truncate">Monthly net profit trajectory.</p>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-indigo-500 transition-colors flex-shrink-0 ml-2" />
          </div>
          <div className="flex-1 min-h-[180px] sm:min-h-[220px] w-full overflow-hidden">
            <LineChart data={profitTrendData} strokeColor="#6366F1" gradientColor="#6366F1" />
          </div>
        </div>
      </div>

      {/* Secondary Charts — GST Trend + Store Comparisons */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        
        {/* GST Collection Trend */}
        <div
          onClick={() => navigate('/accountant/reports')}
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm p-4 sm:p-6 lg:p-8 flex flex-col hover:shadow-md hover:border-slate-350 transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-3 sm:mb-6">
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-850 tracking-tight group-hover:text-slate-900">GST Collection Trend</h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-0.5 truncate">Monthly GST collected from sales.</p>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-violet-500 transition-colors flex-shrink-0 ml-2" />
          </div>
          <div className="flex-1 min-h-[180px] sm:min-h-[220px] w-full overflow-hidden">
            <LineChart data={DASHBOARD_GST_TREND} strokeColor="#8B5CF6" gradientColor="#8B5CF6" />
          </div>
        </div>

        {/* Store Revenue Comparison */}
        <div
          onClick={() => navigate('/accountant/store-performance')}
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm p-4 sm:p-6 lg:p-8 flex flex-col hover:shadow-md hover:border-slate-350 transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-3 sm:mb-6">
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-850 tracking-tight group-hover:text-slate-900">Store Revenue</h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-0.5 truncate">Branch-wise revenue contributions.</p>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-blue-500 transition-colors flex-shrink-0 ml-2" />
          </div>
          <div className="flex-1 overflow-hidden">
            <StoreRevenueProgress data={DASHBOARD_CHARTS_DATA.storeWiseRevenue} />
          </div>
        </div>

        {/* Store Profit Comparison */}
        <div
          onClick={() => navigate('/accountant/store-performance')}
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm p-4 sm:p-6 lg:p-8 flex flex-col hover:shadow-md hover:border-slate-350 transition-all cursor-pointer group md:col-span-2 xl:col-span-1"
        >
          <div className="flex justify-between items-start mb-3 sm:mb-6">
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-850 tracking-tight group-hover:text-slate-900">Store Profit</h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-0.5 truncate">Branch-wise net profit breakdown.</p>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-emerald-500 transition-colors flex-shrink-0 ml-2" />
          </div>
          <div className="flex-1 overflow-hidden">
            <StoreRevenueProgress data={MOCK_PROFIT_LOSS.storeWiseProfit} />
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
