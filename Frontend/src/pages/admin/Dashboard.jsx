import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, BarChart3, Clock, DollarSign, Users, ShoppingBag,
  AlertTriangle, Plus, ArrowUpRight, IndianRupee, Store, Calendar,
  Package, Truck, Award, Briefcase, RefreshCw
} from 'lucide-react';
import { useStoreStore } from '../../store/store';
import AddStoreModal from '../../components/admin/AddStoreModal';
import StoreSwitcher from '../../components/admin/stores/StoreSwitcher';
import { useDashboard } from '../../hooks/useDashboard';

/* ─────────────────────────────────────────────────────────
   PREMIUM WIDGET CARD (STRIPE-LIKE NOTION AESTHETICS)
   ───────────────────────────────────────────────────────── */
const DashboardCard = ({ title, subtitle, children, actions, className = "" }) => (
  <div className={`bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6 sm:p-8 flex flex-col hover:shadow-md transition-all duration-300 ${className}`}>
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6 flex-shrink-0">
      <div>
        <h3 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 font-medium mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
    <div className="flex-1 min-h-0 flex flex-col justify-center relative">
      {children}
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { stores, selectedStore, setSelectedStore } = useStoreStore();
  const [showAddStore, setShowAddStore] = useState(false);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState('All Store');
  const [activityTab, setActivityTab] = useState('orders'); // orders, transactions, customers

  // Find active store ID based on selectedStoreFilter name
  const activeStoreId = useMemo(() => {
    if (selectedStoreFilter === 'All' || selectedStoreFilter === 'All Store') return null;
    const matchedStore = stores.find(s => (s.store_name || s.name) === selectedStoreFilter);
    return matchedStore?.id || null;
  }, [selectedStoreFilter, stores]);

  const quickActionStoreId = activeStoreId || stores[0]?.id || 1;

  // Fetch real dashboard data from backend
  const { data, isLoading } = useDashboard(activeStoreId);

  // Sync state if selectedStore changes from sidebar selector
  useEffect(() => {
    if (selectedStore) {
      setSelectedStoreFilter(selectedStore.store_name || selectedStore.name);
    } else {
      setSelectedStoreFilter('All Store');
    }
  }, [selectedStore]);

  const activeMetrics = useMemo(() => {
    if (!data?.kpis) {
      return {
        revenue: 0,
        todayRevenue: 0,
        orders: 0,
        pendingOrders: 0,
        customers: 0,
        staff: 0,
        inventoryVal: 0,
        outstanding: 0,
        lowStock: 0
      };
    }
    return {
      revenue: data.kpis.revenue,
      todayRevenue: data.kpis.today_revenue,
      orders: data.kpis.orders_count,
      pendingOrders: data.kpis.pending_orders_count,
      customers: data.kpis.customers_count,
      staff: data.kpis.active_staff_count,
      inventoryVal: data.kpis.inventory_val,
      outstanding: data.kpis.outstanding_payments,
      lowStock: data.kpis.low_stock_count
    };
  }, [data]);

  // Get current date string
  const currentDateString = useMemo(() => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-IN', options);
  }, []);

  /* ── 1. Line Chart: Sales Trend ── */
  const salesTrendData = useMemo(() => {
    return data?.sales_trend || [];
  }, [data]);

  const salesTrendMax = Math.max(...salesTrendData.map(d => Number(d.value)), 1);
  const salesTrendPoints = salesTrendData.map((d, i) => {
    const x = 40 + i * (250 / 11);
    const y = 135 - (Number(d.value) / salesTrendMax) * 105;
    return `${x},${y}`;
  }).join(' ');

  const salesTrendAreaPath = salesTrendPoints
    ? `M 40,135 L ${salesTrendPoints} L 290,135 Z`
    : '';

  /* ── 2. Donut Chart: Sales Status ── */
  const salesStatusData = useMemo(() => {
    return data?.sales_status || [];
  }, [data]);

  const salesStatusTotal = salesStatusData.reduce((acc, d) => acc + d.value, 0);
  let accumulatedPercent = 0;

  /* ── 3. Bar Chart: Branch Performance ── */
  const branchPerformanceData = useMemo(() => {
    return data?.branch_order_comparisons || [];
  }, [data]);

  const branchPerformanceMax = Math.max(...branchPerformanceData.map(d => d.orders), 1);

  /* ── 4. Ranked List: Best Performing Stores ── */
  const bestPerformingStores = useMemo(() => {
    return data?.best_performing_stores || [];
  }, [data]);

  /* ── 5. Bar Chart: Inventory Status ── */
  const inventoryStatusData = useMemo(() => {
    return data?.inventory_status || [];
  }, [data]);

  const inventoryStatusMax = Math.max(...inventoryStatusData.map(d => d.value), 1);

  /* ── 6. Donut Chart: Store-wise Inventory Distribution ── */
  const storeInventoryDistribution = useMemo(() => {
    return data?.store_inventory_distribution || [];
  }, [data]);

  const storeInventoryDistributionTotal = storeInventoryDistribution.reduce((acc, d) => acc + d.value, 0);
  let accumInventoryPercent = 0;

  /* ── 7. RECENT DATA MATRICES ── */
  const recentSalesData = useMemo(() => {
    return data?.recent_orders || [];
  }, [data]);

  const recentTransactions = useMemo(() => {
    return data?.recent_transactions || [];
  }, [data]);

  const recentCustomers = useMemo(() => {
    return data?.recent_customers || [];
  }, [data]);

  const getStatusColor = (status) => {
    const normalized = (status || '').toLowerCase();
    switch (normalized) {
      case 'completed':
      case 'delivered':
        return 'text-emerald-700 bg-emerald-50/70 border-emerald-200/50';
      case 'lab pending':
      case 'processing':
      case 'repair':
      case 'exchange':
      case 'pending':
        return 'text-blue-700 bg-blue-50/70 border-blue-200/50';
      case 'cancelled':
        return 'text-red-700 bg-red-50/70 border-red-200/50';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200/55';
    }
  };

  const fmtCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans overflow-x-hidden space-y-6 sm:space-y-8 bg-transparent">

      {/* SECTION 1 - Welcome Header (Stripe/Notion Clean aesthetic) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 text-slate-800 shadow-sm border border-slate-200/60 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-slate-400 font-extrabold text-[10px] uppercase tracking-widest">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentDateString}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Welcome back, Admin!
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-semibold max-w-xl">
            You are logged into the central Optical Store ERP. View live branch analytics and manage cross-store activity.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">

          {/* Store switcher */}
          {stores.length > 1 && (
            <StoreSwitcher
              selectedStoreFilter={selectedStoreFilter}
              onStoreChange={(val) => {
                setSelectedStoreFilter(val);
              }}
            />
          )}

          {/* Quick Actions Group */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setShowAddStore(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Store
            </button>
            <button
              onClick={() => navigate(`/admin/store/${quickActionStoreId}/staff`)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-slate-400" /> Staff
            </button>
            <button
              onClick={() => navigate(`/admin/store/${quickActionStoreId}/inventory`)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <Package className="w-3.5 h-3.5 text-slate-400" /> Product
            </button>
            <button
              onClick={() => navigate(`/admin/store/${quickActionStoreId}/suppliers`)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5 text-slate-400" /> Supplier
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-slate-200/60 shadow-sm">
          <RefreshCw className="w-10 h-10 animate-spin text-emerald-500 mb-3" />
          <p className="text-slate-500 text-sm font-semibold">Updating dashboard metrics...</p>
        </div>
      ) : (
        <>
          {/* SECTION 2 - KPI Cards */}
          <div className="space-y-6">
            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'Total Revenue', value: fmtCurrency(activeMetrics.revenue), icon: DollarSign, trend: 'Live DB calculation', trendColor: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                { title: "Today's Revenue", value: fmtCurrency(activeMetrics.todayRevenue), icon: IndianRupee, trend: 'Today\'s sales', trendColor: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                { title: 'Total Orders', value: activeMetrics.orders.toLocaleString(), icon: ShoppingBag, trend: 'Active transactions', trendColor: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                { title: 'Pending Orders', value: activeMetrics.pendingOrders.toLocaleString(), icon: Clock, trend: 'Requires attention', trendColor: 'text-amber-600 bg-amber-50 border-amber-100' }
              ].map((stat, i) => (
                <div
                  key={i}
                  className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-40"
                >
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.title}</p>
                    <stat.icon className="w-4.5 h-4.5 text-slate-400" />
                  </div>
                  <div className="space-y-2 mt-2">
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight leading-none">{stat.value}</h3>
                    <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded border ${stat.trendColor}`}>
                      {stat.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'Total Customers', value: activeMetrics.customers.toLocaleString(), icon: Users, trend: 'Unique served', trendColor: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                { title: 'Active Staff', value: activeMetrics.staff.toLocaleString(), icon: Briefcase, trend: 'Active staff members', trendColor: 'text-slate-600 bg-slate-50 border-slate-250/50' },
                { title: 'Inventory Value', value: fmtCurrency(activeMetrics.inventoryVal), icon: Package, trend: 'Asset valuation', trendColor: 'text-slate-600 bg-slate-50 border-slate-250/50' },
                { title: 'Outstanding Payments', value: fmtCurrency(activeMetrics.outstanding), icon: AlertTriangle, trend: 'Receivables due', trendColor: 'text-rose-600 bg-rose-50 border-rose-100' }
              ].map((stat, i) => (
                <div
                  key={i}
                  className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-40"
                >
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.title}</p>
                    <stat.icon className="w-4.5 h-4.5 text-slate-400" />
                  </div>
                  <div className="space-y-2 mt-2">
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight leading-none">{stat.value}</h3>
                    <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded border ${stat.trendColor}`}>
                      {stat.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3 - Revenue Analytics (Sales Trend & Status charts) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Trend Chart (Visually Dominant) */}
            <div className="lg:col-span-2">
              <DashboardCard
                title="Sales Performance Trend"
                subtitle="Annualized gross revenue growth trends charted across 12 calendar months."
                actions={
                  <button
                    onClick={() => navigate('/admin/analyses')}
                    className="text-[11px] font-extrabold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                  >
                    Detailed Analytics <ArrowUpRight className="w-3 h-3 text-slate-400" />
                  </button>
                }
              >
                <div className="w-full h-72 sm:h-80 pt-4 px-2">
                  <svg viewBox="0 0 300 160" className="w-full h-full">
                    <defs>
                      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <line x1="40" y1="30" x2="290" y2="30" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="40" y1="65" x2="290" y2="65" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="40" y1="100" x2="290" y2="100" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="40" y1="135" x2="290" y2="135" stroke="#E2E8F0" strokeWidth="1.25" />

                    {salesTrendAreaPath && <path d={salesTrendAreaPath} fill="url(#trendGrad)" />}
                    {salesTrendPoints && <path d={`M 40,135 L ${salesTrendPoints}`} fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}

                    {salesTrendData.map((d, i) => {
                      const x = 40 + i * (250 / 11);
                      const y = 135 - (Number(d.value) / salesTrendMax) * 105;
                      return (
                        <g key={i} className="group cursor-pointer">
                          <circle cx={x} cy={y} r="2.5" fill="#FFFFFF" stroke="#10B981" strokeWidth="1.5" className="transition-all duration-200 group-hover:r-4 group-hover:stroke-emerald-600" />
                          <text x={x} y={y - 8} textAnchor="middle" className="text-[7.5px] font-extrabold fill-slate-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            ₹{(d.value / 1000).toFixed(0)}k
                          </text>
                          <text x={x} y="146" textAnchor="middle" className="text-[8px] font-bold fill-slate-400 pointer-events-none">{d.label}</text>
                          <title>{`${d.label}: ₹${Number(d.value).toLocaleString()}`}</title>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </DashboardCard>
            </div>

            {/* Sales Status Chart */}
            <div className="lg:col-span-1">
              <DashboardCard
                title="Sales Status Breakdown"
                subtitle="Categorization of order statuses logged during the operational period."
              >
                <div className="relative w-full h-72 flex flex-col items-center justify-center gap-6 pt-2">
                  <div className="relative w-36 h-36 flex-shrink-0">
                    <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90">
                      <circle cx="70" cy="70" r="50" fill="transparent" stroke="#F8FAFC" strokeWidth="12" />
                      {salesStatusData.map((d, i) => {
                        const percentage = salesStatusTotal > 0 ? (d.value / salesStatusTotal) * 100 : 0;
                        const strokeLength = (percentage / 100) * 314.16;
                        const strokeOffset = 314.16 - strokeLength + accumulatedPercent;
                        accumulatedPercent -= strokeLength;
                        return (
                          <circle
                            key={i}
                            cx="70"
                            cy="70"
                            r="50"
                            fill="transparent"
                            stroke={d.color}
                            strokeWidth="12"
                            strokeDasharray={`${strokeLength} 314.16`}
                            strokeDashoffset={strokeOffset}
                            className="transition-all duration-200 cursor-pointer hover:stroke-[14px]"
                            style={{ transformOrigin: 'center' }}
                          >
                            <title>{`${d.name}: ${d.value} (${Math.round(percentage)}%)`}</title>
                          </circle>
                        );
                      })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Orders</span>
                      <span className="text-xl font-black text-slate-800 leading-none mt-0.5">{salesStatusTotal}</span>
                    </div>
                  </div>

                  <div className="w-full grid grid-cols-2 gap-2 text-xs">
                    {salesStatusData.map((d, i) => (
                      <div key={i} className="flex items-center gap-1.5 min-w-0 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="font-bold text-slate-500 truncate text-[10px]">{d.name}</span>
                        <span className="font-black text-slate-800 text-[10px] ml-auto">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </DashboardCard>
            </div>
          </div>

          {/* SECTION 4 - Store Performance (Left: Branch Performance, Right: Best Performing Stores) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Branch Performance Comparison */}
            <DashboardCard
              title="Branch Order Comparisons"
              subtitle="Relative comparison of total processed orders across registered branches."
            >
              <div className="w-full h-64 px-2 pt-2">
                <svg viewBox="0 0 300 160" className="w-full h-full">
                  <line x1="40" y1="20" x2="290" y2="20" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="40" y1="60" x2="290" y2="60" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="40" y1="100" x2="290" y2="100" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="40" y1="130" x2="290" y2="130" stroke="#E2E8F0" strokeWidth="1.25" />

                  {branchPerformanceData.map((d, i) => {
                    const barWidth = 16;
                    const spacing = (250 - (branchPerformanceData.length * barWidth)) / (branchPerformanceData.length + 1);
                    const x = 40 + spacing + i * (barWidth + spacing);
                    const height = (d.orders / branchPerformanceMax) * 105;
                    const y = 130 - height;

                    return (
                      <g key={i} className="group cursor-pointer">
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={height}
                          rx="3"
                          fill={d.color}
                          className="opacity-90 hover:opacity-100 transition-all duration-350"
                        />
                        <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="text-[7.5px] font-extrabold fill-slate-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          {d.orders}
                        </text>
                        <text x={x + barWidth / 2} y="144" textAnchor="middle" className="text-[8px] font-extrabold fill-slate-400 pointer-events-none">
                          {d.name.split(' ')[0]}
                        </text>
                        <title>{`${d.name}: ${d.orders} Orders`}</title>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </DashboardCard>

            {/* Best Performing Stores leaderboard */}
            <div className="bg-white rounded-3xl border border-slate-200/60 p-6 sm:p-8 flex flex-col hover:shadow-md transition-all duration-300 h-full">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6 flex-shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight">Best Performing Stores</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Ranked list of branches by revenue performance and order volumes.</p>
                </div>
                <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-lg self-start">Ranked</span>
              </div>
              <div className="flex-1 space-y-3.5 overflow-y-auto pr-1 hide-scrollbar">
                {bestPerformingStores.map((store, idx) => {
                  const rank = idx + 1;
                  const isPositive = store.growth >= 0;
                  return (
                    <div key={store.name} className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50 rounded-2xl border border-transparent hover:border-slate-100/50 transition-all">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-extrabold text-[11px] flex-shrink-0 ${
                          rank === 1 ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          rank === 2 ? 'bg-slate-50 text-slate-700 border border-slate-200/50' :
                          rank === 3 ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                          'bg-slate-50 text-slate-500'
                        }`}>
                          {rank}
                        </span>
                        <span className="text-sm font-bold text-slate-800 truncate">{store.name}</span>
                      </div>
                      <div className="flex items-center gap-5 text-right flex-shrink-0">
                        <div>
                          <p className="text-sm font-black text-slate-900 leading-none">{fmtCurrency(store.revenue)}</p>
                          <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{store.orders} Orders</p>
                        </div>
                        <span className={`text-xs font-extrabold px-2 py-0.5 rounded-lg border ${isPositive ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-red-700 bg-red-50 border-red-100'}`}>
                          {isPositive ? '+' : ''}{store.growth}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 5 - Inventory Insights (Left: Inventory Status, Right: Store-wise Inventory Distribution) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inventory Status Bar Chart */}
            <DashboardCard
              title="Inventory Status Overview"
              subtitle="Proportion of total stocked items categorized by availability levels."
            >
              <div className="w-full h-64 px-2 pt-2">
                <svg viewBox="0 0 300 160" className="w-full h-full">
                  <line x1="40" y1="20" x2="290" y2="20" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="40" y1="60" x2="290" y2="60" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="40" y1="100" x2="290" y2="100" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="40" y1="130" x2="290" y2="130" stroke="#E2E8F0" strokeWidth="1.25" />

                  {inventoryStatusData.map((d, i) => {
                    const barWidth = 20;
                    const spacing = (250 - (inventoryStatusData.length * barWidth)) / (inventoryStatusData.length + 1);
                    const x = 40 + spacing + i * (barWidth + spacing);
                    const height = (d.value / inventoryStatusMax) * 105;
                    const y = 130 - height;

                    return (
                      <g key={i} className="group cursor-pointer">
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={height}
                          rx="3"
                          fill={d.color}
                          className="opacity-90 hover:opacity-100 transition-all duration-350"
                        />
                        <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="text-[7.5px] font-extrabold fill-slate-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          {d.value}
                        </text>
                        <text x={x + barWidth / 2} y="144" textAnchor="middle" className="text-[8px] font-extrabold fill-slate-400 pointer-events-none">
                          {d.label}
                        </text>
                        <title>{`${d.label}: ${d.value} Products`}</title>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </DashboardCard>

            {/* Store-wise Inventory Distribution Donut Chart */}
            <DashboardCard
              title="Store-wise Inventory Distribution"
              subtitle="Relative breakdown of active inventory volumes allocated to each branch."
            >
              <div className="relative w-full h-64 flex flex-col sm:flex-row items-center justify-around gap-4 px-2">
                <div className="relative w-36 h-36 flex-shrink-0">
                  <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90">
                    <circle cx="70" cy="70" r="50" fill="transparent" stroke="#F8FAFC" strokeWidth="12" />
                    {storeInventoryDistribution.map((d, i) => {
                      const percentage = storeInventoryDistributionTotal > 0 ? (d.value / storeInventoryDistributionTotal) * 100 : 0;
                      const strokeLength = (percentage / 100) * 314.16;
                      const strokeOffset = 314.16 - strokeLength + accumInventoryPercent;
                      accumInventoryPercent -= strokeLength;
                      return (
                        <circle
                          key={i}
                          cx="70"
                          cy="70"
                          r="50"
                          fill="transparent"
                          stroke={d.color}
                          strokeWidth="12"
                          strokeDasharray={`${strokeLength} 314.16`}
                          strokeDashoffset={strokeOffset}
                          className="transition-all duration-200 cursor-pointer hover:stroke-[14px]"
                          style={{ transformOrigin: 'center' }}
                        >
                          <title>{`${d.name}: ${d.value} (${Math.round(percentage)}%)`}</title>
                        </circle>
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Items</span>
                    <span className="text-base font-black text-slate-800 leading-none mt-0.5">{storeInventoryDistributionTotal}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-xs text-slate-650 w-full max-w-[170px]">
                  {storeInventoryDistribution.map((d, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="font-extrabold truncate text-[10px] text-slate-655">{d.name.split(' ')[0]}</span>
                      </div>
                      <span className="font-black text-[10px] text-slate-900 ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </DashboardCard>
          </div>

          {/* SECTION 6 - Business Insights (Three cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Top Brand Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-500 flex-shrink-0">
                <Award className="w-5.5 h-5.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5">Top Eyewear Brand</p>
                <h4 className="text-sm font-bold text-slate-800 truncate">{data?.business_insights?.top_eyewear_brand || "Ray-Ban"}</h4>
                <p className="text-xs text-slate-500 font-bold mt-0.5">{fmtCurrency(data?.business_insights?.top_eyewear_brand_sales || 0)} · {data?.business_insights?.top_eyewear_brand_units || 0} units sold</p>
              </div>
            </div>

            {/* Top Supplier Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-500 flex-shrink-0">
                <Truck className="w-5.5 h-5.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5">Leading Lens Supplier</p>
                <h4 className="text-sm font-bold text-slate-800 truncate">{data?.business_insights?.leading_lens_supplier || "Lens World"}</h4>
                <p className="text-xs text-slate-500 font-bold mt-0.5">{data?.business_insights?.leading_lens_supplier_count || 0} POs · 98% rating</p>
              </div>
            </div>

            {/* Best Sales Month Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-500 flex-shrink-0">
                <Calendar className="w-5.5 h-5.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5">Highest Performing Month</p>
                <h4 className="text-sm font-bold text-slate-800 truncate">{data?.business_insights?.highest_performing_month || "May 2026"}</h4>
                <p className="text-xs text-slate-500 font-bold mt-0.5">{fmtCurrency(data?.business_insights?.highest_performing_month_sales || 0)} total sales</p>
              </div>
            </div>
          </div>

          {/* SECTION 7 - Recent Activity (Tabbed panel: Orders, Transactions, Customers) */}
          <div className="bg-white rounded-3xl border border-slate-200/60 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b border-slate-100 gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-emerald-500" />
                <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Recent Operational Activity</h2>
              </div>

              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/50 w-full sm:w-auto">
                <button
                  onClick={() => setActivityTab('orders')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activityTab === 'orders' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                >
                  Recent Orders
                </button>
                <button
                  onClick={() => setActivityTab('transactions')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activityTab === 'transactions' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                >
                  Transactions
                </button>
                <button
                  onClick={() => setActivityTab('customers')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activityTab === 'customers' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                >
                  New Customers
                </button>
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              {/* TAB 1: Recent Orders */}
              {activityTab === 'orders' && (
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-left text-slate-500 text-[10px] font-extrabold uppercase tracking-widest">
                      <th className="px-6 py-4">Order ID</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Product</th>
                      <th className="px-6 py-4">Branch</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                    {recentSalesData.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-xs text-slate-400 italic">No orders found.</td>
                      </tr>
                    ) : (
                      recentSalesData.map((sale) => (
                        <tr key={sale.order_id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4.5 text-xs font-mono font-bold text-slate-800">{sale.order_id}</td>
                          <td className="px-6 py-4.5 font-bold text-slate-700">{sale.customer_name}</td>
                          <td className="px-6 py-4.5 text-slate-500 max-w-[200px] truncate">{sale.product_name}</td>
                          <td className="px-6 py-4.5 text-slate-600 font-semibold">{sale.branch_name}</td>
                          <td className="px-6 py-4.5 font-black text-slate-900">{fmtCurrency(sale.total_amount)}</td>
                          <td className="px-6 py-4.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(sale.status)}`}>
                              {sale.status}
                            </span>
                          </td>
                          <td className="px-6 py-4.5 text-xs text-slate-400 font-bold">{fmtDate(sale.order_date)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* TAB 2: Recent Transactions */}
              {activityTab === 'transactions' && (
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-left text-slate-500 text-[10px] font-extrabold uppercase tracking-widest">
                      <th className="px-6 py-4">Transaction ID</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Branch</th>
                      <th className="px-6 py-4">Method</th>
                      <th className="px-6 py-4">Paid Amount</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Payment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                    {recentTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-xs text-slate-400 italic">No transactions found.</td>
                      </tr>
                    ) : (
                      recentTransactions.map((sale) => (
                        <tr key={sale.transaction_id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4.5 text-xs font-mono font-bold text-slate-800">{sale.transaction_id}</td>
                          <td className="px-6 py-4.5 font-bold text-slate-700">{sale.customer_name}</td>
                          <td className="px-6 py-4.5 text-slate-600 font-semibold">{sale.branch_name}</td>
                          <td className="px-6 py-4.5"><span className="bg-slate-50 text-slate-500 font-bold px-2 py-0.5 rounded border border-slate-200/50 text-[10px]">{sale.payment_method}</span></td>
                          <td className="px-6 py-4.5 font-black text-emerald-600">{fmtCurrency(sale.paid_amount)}</td>
                          <td className="px-6 py-4.5 text-xs text-slate-400 font-bold">{fmtDate(sale.date)}</td>
                          <td className="px-6 py-4.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                              sale.payment_status === 'Paid' ? 'text-emerald-700 bg-emerald-50/50 border-emerald-200' : 'text-amber-700 bg-amber-50/50 border-amber-200'
                            }`}>
                              {sale.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* TAB 3: Recent Customers */}
              {activityTab === 'customers' && (
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-left text-slate-500 text-[10px] font-extrabold uppercase tracking-widest">
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Contact</th>
                      <th className="px-6 py-4">City</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Registration Date</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                    {recentCustomers.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-xs text-slate-400 italic">No customers found.</td>
                      </tr>
                    ) : (
                      recentCustomers.map((cust) => (
                        <tr key={cust.customer_id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4.5 text-xs font-mono font-bold text-slate-400">#CUST-0{cust.customer_id}</td>
                          <td className="px-6 py-4.5 font-bold text-slate-700">{cust.name}</td>
                          <td className="px-6 py-4.5 font-mono text-slate-500 text-xs">{cust.phone}</td>
                          <td className="px-6 py-4.5 text-slate-500 font-semibold">{cust.city}</td>
                          <td className="px-6 py-4.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                              cust.status === 'VIP' ? 'text-purple-700 bg-purple-50/50 border-purple-200' : 'text-emerald-700 bg-emerald-50/50 border-emerald-200'
                            }`}>
                              {cust.status}
                            </span>
                          </td>
                          <td className="px-6 py-4.5 text-xs text-slate-400 font-bold">{fmtDate(cust.date)}</td>
                          <td className="px-6 py-4.5">
                            <button
                              onClick={() => navigate(`/admin/stores`)}
                              className="text-[10px] font-black text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                            >
                              View CRM
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* Store Add Modal */}
      <AddStoreModal
        isOpen={showAddStore}
        onClose={() => setShowAddStore(false)}
      />
    </div>
  );
};

export default Dashboard;