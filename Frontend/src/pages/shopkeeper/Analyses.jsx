import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, BarChart3, PieChart, RefreshCw,
  Download, Clock, DollarSign, ShoppingBag, Users,
  AlertTriangle, Calendar, ChevronRight, Activity, Percent
} from 'lucide-react';
import { useSales } from '../../hooks/useSales';
import { useCustomers } from '../../hooks/useCustomers';

/* ── Helpers ── */
const fmtCurrency = (val) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
};

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

/* ── PREMIUM WIDGET CARD ── */
const AnalyticsCard = ({ title, subtitle, children, className = "" }) => (
  <div className={`bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6 sm:p-8 flex flex-col hover:shadow-md transition-all duration-300 ${className}`}>
    <div className="mb-6 flex-shrink-0">
      <h3 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h3>
      {subtitle && <p className="text-xs text-slate-405 font-semibold mt-0.5">{subtitle}</p>}
    </div>
    <div className="flex-1 min-h-0 flex flex-col justify-center relative">
      {children}
    </div>
  </div>
);

/* ── PURE SVG CHART COMPONENTS ── */

// 1. Line Area Chart: Sales Trend
const SalesTrendChart = ({ data }) => {
  const maxValue = Math.max(...data.map(item => item.value), 50000);
  const points = data.map((item, i) => {
    const x = 40 + i * (250 / 5);
    const y = 135 - (item.value / maxValue) * 105;
    return `${x},${y}`;
  }).join(' ');

  const areaD = points ? `M 40,135 L ${points} L 290,135 Z` : '';

  return (
    <div className="w-full h-72 sm:h-80 px-2 pt-2">
      <svg viewBox="0 0 300 160" className="w-full h-full">
        <defs>
          <linearGradient id="salesTrendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="40" y1="30" x2="290" y2="30" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1="65" x2="290" y2="65" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1="100" x2="290" y2="100" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1="135" x2="290" y2="135" stroke="#E2E8F0" strokeWidth="1.25" />

        {areaD && <path d={areaD} fill="url(#salesTrendGrad)" />}
        {points && <path d={`M 40,135 L ${points}`} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}

        {data.map((p, i) => {
          const x = 40 + i * (250 / 5);
          const y = 135 - (p.value / maxValue) * 105;
          return (
            <g key={i} className="group cursor-pointer">
              <circle cx={x} cy={y} r="2.5" fill="#FFFFFF" stroke="#3B82F6" strokeWidth="1.5" className="transition-all duration-200 group-hover:r-4.5 group-hover:stroke-blue-600" />
              <text x={x} y={y - 8} textAnchor="middle" className="text-[7.5px] font-extrabold fill-slate-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                ₹{(p.value / 1000).toFixed(0)}k
              </text>
              <text x={x} y="145" textAnchor="middle" className="text-[8px] font-bold fill-slate-400 pointer-events-none">{p.label}</text>
              <title>{`${p.label}: ₹${p.value.toLocaleString()}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// 2. Donut Chart
const DonutChart = ({ data, totalLabel = "Total" }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentOffset = 0;

  return (
    <div className="relative w-full h-48 flex flex-col sm:flex-row items-center justify-around gap-4 px-2">
      <div className="relative w-32 h-32 flex-shrink-0">
        <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90">
          <circle cx="70" cy="70" r="50" fill="transparent" stroke="#F8FAFC" strokeWidth="12" />
          {data.map((slice, i) => {
            const percentage = total > 0 ? (slice.value / total) * 100 : 0;
            const strokeLength = (percentage / 100) * 314.16;
            const strokeOffset = 314.16 - strokeLength + currentOffset;
            currentOffset -= strokeLength;

            return (
              <circle
                key={i}
                cx="70"
                cy="70"
                r="50"
                fill="transparent"
                stroke={slice.color}
                strokeWidth="12"
                strokeDasharray={`${strokeLength} 314.16`}
                strokeDashoffset={strokeOffset}
                className="transition-all duration-200 cursor-pointer hover:stroke-[14px]"
                style={{ transformOrigin: 'center' }}
              >
                <title>{`${slice.name}: ${slice.value.toLocaleString()} (${Math.round(percentage)}%)`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">{totalLabel}</span>
          <span className="text-base font-black text-slate-800 leading-none mt-0.5 truncate max-w-[90px] text-center">
            {total >= 100000 ? `${(total / 1000).toFixed(0)}k` : total.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-xs text-slate-655 w-full max-w-[130px] overflow-y-auto max-h-36 pr-1 hide-scrollbar">
        {data.map((slice, i) => (
          <div key={i} className="flex items-center justify-between gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-100/50">
            <div className="flex items-center gap-1 min-w-0">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="font-extrabold truncate text-[9px] text-slate-700">{slice.name}</span>
            </div>
            <span className="font-black text-[9px] text-slate-900 ml-auto">{slice.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 3. Bar Chart
const BarChart = ({ data }) => {
  const maxValue = Math.max(...data.map(item => item.value), 1);

  return (
    <div className="w-full h-48 px-2 pt-2">
      <svg viewBox="0 0 300 160" className="w-full h-full">
        <line x1="40" y1="20" x2="290" y2="20" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1="60" x2="290" y2="60" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1="100" x2="290" y2="100" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1="130" x2="290" y2="130" stroke="#E2E8F0" strokeWidth="1.25" />

        {data.map((bar, i) => {
          const barWidth = Math.max(10, Math.min(20, 130 / data.length));
          const spacing = (250 - (data.length * barWidth)) / (data.length + 1);
          const x = 40 + spacing + i * (barWidth + spacing);
          const height = (bar.value / maxValue) * 105;
          const y = 130 - height;

          return (
            <g key={i} className="group cursor-pointer">
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={height}
                rx="3"
                fill={bar.color}
                className="opacity-90 hover:opacity-100 transition-all duration-350"
              />
              <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="text-[7.5px] font-extrabold fill-slate-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {bar.value.toLocaleString()}
              </text>
              <text x={x + barWidth / 2} y="143" textAnchor="middle" className="text-[8px] font-extrabold fill-slate-400 pointer-events-none">
                {bar.label.length > 9 ? `${bar.label.substring(0, 6)}..` : bar.label}
              </text>
              <title>{`${bar.label}: ${bar.value.toLocaleString()}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// 4. Line Chart: Customer Growth
const CustomerGrowthChart = ({ data }) => {
  const maxValue = Math.max(...data.map(item => item.value), 5);
  const points = data.map((item, i) => {
    const x = 40 + i * (250 / 5);
    const y = 130 - (item.value / maxValue) * 105;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full h-48 px-2 pt-2">
      <svg viewBox="0 0 300 160" className="w-full h-full">
        <line x1="40" y1="20" x2="290" y2="20" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1="60" x2="290" y2="60" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1="100" x2="290" y2="100" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1="130" x2="290" y2="130" stroke="#E2E8F0" strokeWidth="1.25" />

        {points && <path d={`M 40,130 L ${points}`} fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}

        {data.map((p, i) => {
          const x = 40 + i * (250 / 5);
          const y = 130 - (p.value / maxValue) * 105;
          return (
            <g key={i} className="group cursor-pointer">
              <circle cx={x} cy={y} r="2.5" fill="#FFFFFF" stroke="#6366F1" strokeWidth="1.5" className="transition-all duration-200 group-hover:r-4 group-hover:stroke-indigo-600" />
              <text x={x} y={y - 8} textAnchor="middle" className="text-[7.5px] font-extrabold fill-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {p.value}
              </text>
              <text x={x} y="143" textAnchor="middle" className="text-[8px] font-extrabold fill-slate-400 pointer-events-none">{p.label}</text>
              <title>{`${p.label}: ${p.value} Customers`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────── */
const ShopkeeperAnalyses = () => {
  const { sales, isLoading: salesLoading } = useSales({ limit: 1000 });
  const { customers, isLoading: customersLoading } = useCustomers();
  const [dateRange, setDateRange] = useState('This Year');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleExport = () => {
    alert("Exporting store analysis report as CSV...");
  };

  // Dynamic KPI Calculations based on real data
  const kpis = useMemo(() => {
    const totalSalesVal = sales.reduce((sum, s) => sum + (Number(s.total_amount || s.amount) || 0), 0);
    const totalOrdersVal = sales.length;
    const paidRevenueVal = sales.reduce((sum, s) => sum + (Number(s.receivedAmount || s.paid_amount) || 0), 0);
    const totalCustsVal = customers.length;
    const outstandingVal = sales.reduce((sum, s) => sum + (Number(s.remainingAmount || s.due_amount) || 0), 0);
    const activeCustsVal = customers.filter(c => c.status === 'Active' || c.status === 'VIP').length;
    const aov = totalOrdersVal > 0 ? totalSalesVal / totalOrdersVal : 0;
    const activeRate = totalCustsVal > 0 ? (activeCustsVal / totalCustsVal) * 100 : 0;

    return {
      revenue: paidRevenueVal,
      orders: totalOrdersVal,
      customers: totalCustsVal,
      aov,
      outstanding: outstandingVal,
      activeRate
    };
  }, [sales, customers]);

  // Last 6 Months Labels
  const last6Months = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({
        monthName: months[d.getMonth()],
        yearMonthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        orderCount: 0,
        amount: 0,
        customerCount: 0
      });
    }
    return result;
  }, []);

  // 1. Sales Trend Data (last 6 months)
  const salesTrendData = useMemo(() => {
    const monthsMap = [...last6Months];
    sales.forEach((s) => {
      const dateVal = s.orderDate || s.sale_date;
      if (dateVal) {
        const sDate = new Date(dateVal);
        const key = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}`;
        const match = monthsMap.find(m => m.yearMonthKey === key);
        if (match) {
          match.amount += Number(s.total_amount || s.amount) || 0;
        }
      }
    });

    return monthsMap.map(m => ({
      label: m.monthName,
      value: m.amount
    }));
  }, [sales, last6Months]);

  // 2. Sales Status Data
  const salesStatusData = useMemo(() => {
    const statusCounts = { Completed: 0, Pending: 0, Cancelled: 0, Refunded: 0 };
    sales.forEach(s => {
      const rawStatus = (s.status?.value || s.status || 'PENDING').toUpperCase();
      if (rawStatus === 'COMPLETED' || rawStatus === 'DELIVERED') {
        statusCounts.Completed++;
      } else if (rawStatus === 'PARTIALLY_PAID' || rawStatus === 'PROCESSING' || rawStatus === 'READY' || rawStatus === 'LAB PENDING') {
        statusCounts.Pending++;
      } else if (rawStatus === 'CANCELLED') {
        statusCounts.Cancelled++;
      } else if (rawStatus === 'RETURNED' || rawStatus === 'REFUNDED') {
        statusCounts.Refunded++;
      } else {
        statusCounts.Pending++;
      }
    });

    return [
      { name: 'Completed', value: statusCounts.Completed, color: '#10B981' },
      { name: 'Pending', value: statusCounts.Pending, color: '#3B82F6' },
      { name: 'Cancelled', value: statusCounts.Cancelled, color: '#EF4444' },
      { name: 'Refunded', value: statusCounts.Refunded, color: '#F59E0B' },
    ].filter(d => d.value > 0 || sales.length === 0);
  }, [sales]);

  // 3. Revenue Breakdown by Category
  const revenueBreakdownData = useMemo(() => {
    const cats = { Frames: 0, Lenses: 0, Accessories: 0, Other: 0 };
    sales.forEach(s => {
      const cat = (s.productCategory || s.product_category || 'Other').trim().toLowerCase();
      const amt = Number(s.total_amount || s.amount) || 0;
      if (cat.includes('frame')) cats.Frames += amt;
      else if (cat.includes('lens')) cats.Lenses += amt;
      else if (cat.includes('accessor')) cats.Accessories += amt;
      else cats.Other += amt;
    });

    return [
      { name: 'Frames', value: cats.Frames, color: '#3B82F6' },
      { name: 'Lenses', value: cats.Lenses, color: '#10B981' },
      { name: 'Accessories', value: cats.Accessories, color: '#8B5CF6' },
      { name: 'Other', value: cats.Other, color: '#6B7280' },
    ].filter(d => d.value > 0 || sales.length === 0);
  }, [sales]);

  // 4. Brand Revenue Performance (Top 5 Brands)
  const brandPerformanceData = useMemo(() => {
    const brandMap = {};
    sales.forEach(s => {
      const name = s.productName || s.product_name || 'Optical Item';
      let brand = 'Vision Brand';
      if (name.toLowerCase().includes('ray-ban') || name.toLowerCase().includes('rayban')) brand = 'Ray-Ban';
      else if (name.toLowerCase().includes('oakley')) brand = 'Oakley';
      else if (name.toLowerCase().includes('crizal')) brand = 'Crizal';
      else if (name.toLowerCase().includes('hoya')) brand = 'Hoya';
      else if (name.toLowerCase().includes('essilor')) brand = 'Essilor';
      else if (name.toLowerCase().includes('vincent')) brand = 'Vincent Chase';
      else if (name.toLowerCase().includes('fastrack')) brand = 'Fastrack';

      const amt = Number(s.total_amount || s.amount) || 0;
      if (!brandMap[brand]) brandMap[brand] = 0;
      brandMap[brand] += amt;
    });

    const list = Object.keys(brandMap).map(k => ({
      label: k,
      value: brandMap[k],
      color: '#3B82F6'
    })).sort((a, b) => b.value - a.value).slice(0, 5);

    // Fallback if empty
    if (list.length === 0) {
      return [
        { label: 'Ray-Ban', value: 0, color: '#3B82F6' },
        { label: 'Oakley', value: 0, color: '#3B82F6' },
        { label: 'Crizal', value: 0, color: '#3B82F6' }
      ];
    }

    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899'];
    return list.map((item, idx) => ({
      ...item,
      color: colors[idx % colors.length]
    }));
  }, [sales]);

  // 5. Transaction Payment Distribution
  const transactionAnalyticsData = useMemo(() => {
    const payMap = { Cash: 0, UPI: 0, Card: 0, Credit: 0 };
    sales.forEach(s => {
      const method = (s.paymentMethod || 'Cash').trim().toLowerCase();
      if (method.includes('cash')) payMap.Cash++;
      else if (method.includes('upi')) payMap.UPI++;
      else if (method.includes('card')) payMap.Card++;
      else payMap.Credit++;
    });

    return [
      { name: 'Cash', value: payMap.Cash, color: '#8B5CF6' },
      { name: 'UPI', value: payMap.UPI, color: '#10B981' },
      { name: 'Card', value: payMap.Card, color: '#3B82F6' },
      { name: 'Credit', value: payMap.Credit, color: '#F59E0B' },
    ].filter(d => d.value > 0 || sales.length === 0);
  }, [sales]);

  // 6. Monthly Customer Growth
  const customerGrowthData = useMemo(() => {
    const monthsMap = [...last6Months];
    customers.forEach((c) => {
      const dateVal = c.customerSince;
      if (dateVal) {
        const cDate = new Date(dateVal);
        const key = `${cDate.getFullYear()}-${String(cDate.getMonth() + 1).padStart(2, '0')}`;
        const match = monthsMap.find(m => m.yearMonthKey === key);
        if (match) {
          match.customerCount++;
        }
      }
    });

    // Compute cumulative growth
    let runningSum = customers.length - customers.filter(c => {
      if (!c.customerSince) return false;
      const cDate = new Date(c.customerSince);
      const limitDate = new Date(monthsMap[0].yearMonthKey + '-01');
      return cDate >= limitDate;
    }).length;

    return monthsMap.map(m => {
      runningSum += m.customerCount;
      return {
        label: m.monthName,
        value: runningSum
      };
    });
  }, [customers, last6Months]);

  const loading = salesLoading || customersLoading || isRefreshing;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans overflow-x-hidden space-y-6 sm:space-y-8 bg-transparent">
      {/* Analyses Page Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b border-slate-100 pb-5 flex-shrink-0">
        <div className="space-y-1.5">
          <div className="flex items-center text-sm text-slate-500 font-semibold mb-1.5 space-x-2">
            <Link to="/shopkeeper/dashboard" className="hover:text-slate-800 transition-colors">Dashboard</Link>
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
            <span className="text-slate-900 font-extrabold">Analyses</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-slate-800" /> Store Analyses & Insights
          </h1>
          <p className="text-slate-505 text-xs sm:text-sm font-semibold">
            Track business performance metrics, sales trends, and customer metrics for your assigned branch.
          </p>
        </div>

        {/* Action Row */}
        <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
          {/* Date Filter */}
          <div className="relative flex-1 sm:flex-initial min-w-[150px]">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full bg-white text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 cursor-pointer appearance-none pr-8 shadow-sm"
            >
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="This Month">This Month</option>
              <option value="This Quarter">This Quarter</option>
              <option value="This Year">This Year</option>
            </select>
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={handleExport}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" /> Export CSV
          </button>
          <button
            onClick={handleRefresh}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Analytics KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {[
          { title: 'Total Revenue (Paid)', value: fmtCurrency(kpis.revenue), icon: DollarSign, color: 'text-emerald-500' },
          { title: 'Total Orders', value: kpis.orders.toLocaleString(), icon: ShoppingBag, color: 'text-blue-500' },
          { title: 'Total Customers', value: kpis.customers.toLocaleString(), icon: Users, color: 'text-indigo-500' },
          { title: 'Average Order Value', value: fmtCurrency(kpis.aov), icon: TrendingUp, color: 'text-purple-500' },
          { title: 'Outstanding Balance', value: fmtCurrency(kpis.outstanding), icon: AlertTriangle, color: 'text-rose-500' },
          { title: 'Active Customer Rate', value: `${kpis.activeRate.toFixed(1)}%`, icon: Percent, color: 'text-amber-500' }
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between h-36 hover:shadow-md transition-all duration-300"
          >
            <div className="flex justify-between items-start">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-normal">{stat.title}</p>
              <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-none mt-4 truncate">{stat.value}</h3>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <RefreshCw className="w-10 h-10 animate-spin text-emerald-500 mb-3" />
          <p className="text-slate-500 text-sm font-semibold">Updating store analytics reporting metrics...</p>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          
          {/* Row 1: Sales Trend + Sales Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AnalyticsCard
                title="Sales Trend Analysis"
                subtitle="Gross store revenue growth trends plotted across the last 6 calendar months."
              >
                <SalesTrendChart data={salesTrendData} />
              </AnalyticsCard>
            </div>
            <div className="lg:col-span-1">
              <AnalyticsCard
                title="Sales Order Breakdown"
                subtitle="Proportion of orders mapped by status (Completed, Pending, etc.)."
              >
                <DonutChart data={salesStatusData} totalLabel="Orders" />
              </AnalyticsCard>
            </div>
          </div>

          {/* Row 2: Revenue Breakdown + Brand Performance + Payment Methods */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnalyticsCard
              title="Revenue by Product Category"
              subtitle="Product catalog contribution shares to overall gross sales."
            >
              <DonutChart data={revenueBreakdownData} totalLabel="Revenue" />
            </AnalyticsCard>

            <AnalyticsCard
              title="Brand Performance"
              subtitle="Revenue shares generated by major frame and lens brands."
            >
              <BarChart data={brandPerformanceData} />
            </AnalyticsCard>

            <AnalyticsCard
              title="Payment Methods Used"
              subtitle="Distribution of payment types (UPI, Cash, Card) used by customers."
            >
              <DonutChart data={transactionAnalyticsData} totalLabel="Receipts" />
            </AnalyticsCard>
          </div>

          {/* Row 3: Customer Growth */}
          <div className="grid grid-cols-1 gap-6">
            <AnalyticsCard
              title="Monthly Customer Registrations"
              subtitle="Cumulative customer acquisition growth over the last 6 months."
            >
              <CustomerGrowthChart data={customerGrowthData} />
            </AnalyticsCard>
          </div>

        </div>
      )}

    </div>
  );
};

export default ShopkeeperAnalyses;
