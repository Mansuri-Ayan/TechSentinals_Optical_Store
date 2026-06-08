import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Activity, BarChart3, PieChart,
  RefreshCw, Database, Filter, Store, AlertTriangle,
  Users, DollarSign, ShoppingBag, Plus, ChevronDown, Check,
  Sliders, Package, ArrowRightLeft, Truck
} from 'lucide-react';
import { useStoreStore } from '../../store/store';
import AddStoreModal from '../../components/admin/AddStoreModal';

/* ─────────────────────────────────────────────────────────
   REUSABLE LAYOUT CARD
   ───────────────────────────────────────────────────────── */
const ChartCard = ({ id, title, children, actions, onRefresh, isHighlighted }) => (
  <div
    id={id}
    className={`bg-white rounded-2xl border overflow-hidden p-4 sm:p-5 flex flex-col h-full transition-all duration-500 ${
      isHighlighted
        ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.35)] ring-4 ring-emerald-500/20 scale-[1.01]'
        : 'border-slate-100 shadow-sm hover:shadow-md'
    }`}
  >
    <div className="flex items-center justify-between gap-3 mb-4 flex-shrink-0">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
      <div className="flex items-center gap-2">
        {actions}
        {onRefresh && (
          <button onClick={onRefresh} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all" title="Refresh Chart">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
    <div className="flex-1 min-h-0 flex items-center justify-center relative">
      {children}
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────
   NATIVE CHART COMPONENTS (PURE SVG)
   ───────────────────────────────────────────────────────── */

// 1. Line Chart: Sales Trend
const LineChart = ({ data, onPointClick }) => {
  const maxValue = Math.max(...data.map(item => item.value), 1);
  const points = data.map((item, i) => {
    const x = 50 + (i * (230 / (data.length - 1 || 1)));
    const y = 130 - (item.value / maxValue) * 100;
    return { x, y, val: item.value, label: item.label, raw: item };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} 130 L ${points[0].x} 130 Z`
    : '';

  return (
    <div className="w-full h-60 px-2">
      <svg viewBox="0 0 300 160" className="w-full h-full">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="50" y1="30" x2="280" y2="30" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="50" y1="80" x2="280" y2="80" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="50" y1="130" x2="280" y2="130" stroke="#E2E8F0" strokeWidth="1.5" />

        {areaD && <path d={areaD} fill="url(#lineGrad)" />}
        {pathD && <path d={pathD} fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

        {points.map((p, i) => (
          <g key={i} className="group cursor-pointer" onClick={() => onPointClick(p.raw)}>
            <circle cx={p.x} cy={p.y} r="4" fill="#FFFFFF" stroke="#10B981" strokeWidth="2.5" className="transition-all duration-200 group-hover:r-6 group-hover:stroke-emerald-600" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" className="text-[9px] font-bold fill-slate-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              ₹{p.val.toLocaleString()}
            </text>
            <text x={p.x} y="145" textAnchor="middle" className="text-[9px] font-semibold fill-slate-500 pointer-events-none">{p.label}</text>
            <title>{`${p.label}: ₹${p.val.toLocaleString()}`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
};

// 2. Donut Chart
const DonutChart = ({ data, onSliceClick }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentOffset = 0;

  return (
    <div className="relative w-full h-52 flex flex-col sm:flex-row items-center justify-around gap-4 px-2">
      <div className="relative w-36 h-36 flex-shrink-0">
        <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90">
          <circle cx="70" cy="70" r="50" fill="transparent" stroke="#F8FAFC" strokeWidth="16" />
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
                strokeWidth="16"
                strokeDasharray={`${strokeLength} 314.16`}
                strokeDashoffset={strokeOffset}
                className="transition-all duration-200 cursor-pointer hover:stroke-[19px]"
                onClick={() => onSliceClick(slice)}
                style={{ transformOrigin: 'center' }}
              >
                <title>{`${slice.name}: ${slice.value.toLocaleString()} (${Math.round(percentage)}%)`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none font-sans">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
          <span className="text-sm font-extrabold text-slate-800">{total.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-xs text-slate-600 max-h-36 overflow-y-auto w-full max-w-[150px] hide-scrollbar pr-1">
        {data.map((slice, i) => (
          <div key={i} className="flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded-lg transition-colors" onClick={() => onSliceClick(slice)}>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="font-semibold truncate text-[11px] text-slate-700">{slice.name}</span>
            </div>
            <span className="font-bold text-[11px] text-slate-900">{slice.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 3. Bar Chart
const BarChart = ({ data, onBarClick }) => {
  const maxValue = Math.max(...data.map(item => item.value), 1);

  return (
    <div className="w-full h-52 px-2">
      <svg viewBox="0 0 300 160" className="w-full h-full">
        <line x1="40" y1="20" x2="290" y2="20" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="40" y1="60" x2="290" y2="60" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="40" y1="100" x2="290" y2="100" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="40" y1="130" x2="290" y2="130" stroke="#E2E8F0" strokeWidth="1.5" />

        {data.map((bar, i) => {
          const barWidth = Math.max(12, Math.min(24, 150 / data.length));
          const spacing = (250 - (data.length * barWidth)) / (data.length + 1);
          const x = 40 + spacing + i * (barWidth + spacing);
          const height = (bar.value / maxValue) * 110;
          const y = 130 - height;

          return (
            <g key={i} className="group cursor-pointer" onClick={() => onBarClick(bar)}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={height}
                rx="3"
                fill={bar.color}
                className="transition-all duration-300 hover:brightness-95 hover:opacity-90"
              />
              <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="text-[9px] font-extrabold fill-slate-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {bar.value.toLocaleString()}
              </text>
              <text x={x + barWidth / 2} y="145" textAnchor="middle" className="text-[9px] font-semibold fill-slate-500 pointer-events-none">
                {bar.label.length > 9 ? `${bar.label.substring(0, 7)}..` : bar.label}
              </text>
              <title>{`${bar.label}: ${bar.value.toLocaleString()}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   STORE SPECIFIC KPI METRIC CALCULATIONS
   ───────────────────────────────────────────────────────── */
const STORE_METRICS = {
  All:          { revenue: '₹8,15,400', staff: 24, orders: 1240, lowStock: 35, mult: 1.0 },
  'Main Branch': { revenue: '₹2,84,000', staff: 8,  orders: 420,  lowStock: 12, mult: 0.35 },
  'Branch 2':    { revenue: '₹1,97,000', staff: 6,  orders: 310,  lowStock: 8,  mult: 0.24 },
  'Branch 3':    { revenue: '₹98,500',  staff: 5,  orders: 190,  lowStock: 4,  mult: 0.12 },
  'Admin Store': { revenue: '₹1,50,000', staff: 5,  orders: 320,  lowStock: 6,  mult: 0.18 }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { stores, selectedStore } = useStoreStore();
  const [showAddStore, setShowAddStore] = useState(false);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState('All');
  const [trendFilter, setTrendFilter] = useState('Month');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);
  const [highlightedChart, setHighlightedChart] = useState(null);

  const activeStoreId = selectedStore?.id || stores[0]?.id || 1;

  // Sync state if selectedStore changes from sidebar selector
  useEffect(() => {
    if (selectedStore) {
      setSelectedStoreFilter(selectedStore.store_name || selectedStore.name);
    }
  }, [selectedStore]);

  const activeMetrics = useMemo(() => {
    return STORE_METRICS[selectedStoreFilter] || STORE_METRICS.All;
  }, [selectedStoreFilter]);

  const showSupplier = selectedStoreFilter === 'All' || selectedStoreFilter === 'Admin Store';

  const scrollToChart = (chartId) => {
    const element = document.getElementById(chartId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedChart(chartId);
      setTimeout(() => {
        setHighlightedChart(null);
      }, 2000);
    }
  };

  const scaleValue = (val) => {
    return Math.round(val * activeMetrics.mult);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 600);
  };

  // 1. Sales Trend
  const salesTrendData = useMemo(() => {
    let raw = [];
    if (trendFilter === 'Today') {
      raw = [
        { label: '09:00', value: 8500 },
        { label: '11:00', value: 24000 },
        { label: '13:00', value: 18500 },
        { label: '15:00', value: 32000 },
        { label: '17:00', value: 41000 },
        { label: '19:00', value: 29000 },
      ];
    } else if (trendFilter === 'Week') {
      raw = [
        { label: 'Mon', value: 48000 },
        { label: 'Tue', value: 54000 },
        { label: 'Wed', value: 39000 },
        { label: 'Thu', value: 68000 },
        { label: 'Fri', value: 82000 },
        { label: 'Sat', value: 95000 },
        { label: 'Sun', value: 41000 },
      ];
    } else if (trendFilter === 'Year') {
      raw = [
        { label: 'Jan', value: 340000 },
        { label: 'Feb', value: 420000 },
        { label: 'Mar', value: 510000 },
        { label: 'Apr', value: 480000 },
        { label: 'May', value: 620000 },
        { label: 'Jun', value: 710000 },
      ];
    } else {
      raw = [
        { label: 'Wk 1', value: 125000 },
        { label: 'Wk 2', value: 168000 },
        { label: 'Wk 3', value: 145000 },
        { label: 'Wk 4', value: 195000 },
      ];
    }
    return raw.map(item => ({ ...item, value: scaleValue(item.value) }));
  }, [trendFilter, activeMetrics]);

  // 2. Sales Status
  const salesStatusData = useMemo(() => {
    return [
      { name: 'Completed', value: scaleValue(1240), color: '#10B981' },
      { name: 'Cancelled', value: scaleValue(120), color: '#64748B' },
      { name: 'Returned', value: scaleValue(45), color: '#EF4444' },
      { name: 'Repair', value: scaleValue(32), color: '#6366F1' },
      { name: 'Lab Pending', value: scaleValue(88), color: '#F59E0B' },
      { name: 'Exchange', value: scaleValue(15), color: '#A855F7' },
    ].filter(item => item.value > 0 || selectedStoreFilter === 'All');
  }, [activeMetrics, selectedStoreFilter]);

  // 3. Revenue Breakdown
  const revenueBreakdownData = useMemo(() => {
    return [
      { name: 'Frames', value: scaleValue(284000), categoryId: 1, color: '#3B82F6' },
      { name: 'Lenses', value: scaleValue(197000), categoryId: 2, color: '#10B981' },
      { name: 'Other Products', value: scaleValue(98500), categoryId: 3, color: '#8B5CF6' },
    ];
  }, [activeMetrics]);

  // 4. Inventory Status
  const inventoryStatusData = useMemo(() => {
    return [
      { label: 'In Stock', value: scaleValue(420), color: '#10B981' },
      { label: 'Low Stock', value: activeMetrics.lowStock, color: '#F59E0B' },
      { label: 'Out Of Stock', value: scaleValue(8), color: '#EF4444' },
    ];
  }, [activeMetrics]);

  // 5. Branch Performance
  const branchPerformanceData = useMemo(() => {
    return [
      { label: 'Admin Store', value: 150000, color: selectedStoreFilter === 'Admin Store' ? '#10B981' : '#475569' },
      { label: 'Main Branch', value: 284000, color: selectedStoreFilter === 'Main Branch' ? '#10B981' : '#6366F1' },
      { label: 'Branch 2', value: 197000, color: selectedStoreFilter === 'Branch 2' ? '#10B981' : '#3B82F6' },
      { label: 'Branch 3', value: 98500, color: selectedStoreFilter === 'Branch 3' ? '#10B981' : '#F59E0B' },
    ];
  }, [selectedStoreFilter]);

  // 6. Store Inventory Distribution
  const storeInventoryDistributionData = useMemo(() => {
    return [
      { name: 'Admin Store', value: 1200, id: 1, color: '#475569' },
      { name: 'Main Branch', value: 850, id: 2, color: '#6366F1' },
      { name: 'Branch 2', value: 640, id: 3, color: '#3B82F6' },
      { name: 'Branch 3', value: 430, id: 4, color: '#F59E0B' },
    ];
  }, []);

  // 7. Supplier Analytics
  const supplierAnalyticsData = useMemo(() => {
    return [
      { label: 'Vision Supply', value: scaleValue(24), id: 1, color: '#3B82F6' },
      { label: 'Eyewear Depot', value: scaleValue(18), id: 2, color: '#6366F1' },
      { label: 'Lens World', value: scaleValue(32), id: 3, color: '#8B5CF6' },
      { label: 'Zeiss India', value: scaleValue(12), id: 9, color: '#EC4899' },
      { label: 'OpticEssential', value: scaleValue(22), id: 8, color: '#F59E0B' },
    ];
  }, [activeMetrics]);

  // 8. Transaction Analytics
  const transactionAnalyticsData = useMemo(() => {
    return [
      { name: 'Transfer', value: scaleValue(145), type: 'Inventory Transfer', color: '#3B82F6' },
      { name: 'Purchase', value: scaleValue(90), type: 'Purchase', color: '#8B5CF6' },
      { name: 'Sale', value: scaleValue(220), type: 'Sale', color: '#10B981' },
      { name: 'Return', value: scaleValue(45), type: 'Return', color: '#F59E0B' },
      { name: 'Damage', value: scaleValue(12), type: 'Damage', color: '#EF4444' },
    ];
  }, [activeMetrics]);

  // 9. Brand Performance
  const brandPerformanceData = useMemo(() => {
    return [
      { label: 'Ray-Ban', value: scaleValue(120), color: '#3B82F6' },
      { label: 'Oakley', value: scaleValue(85), color: '#6366F1' },
      { label: 'Crizal', value: scaleValue(70), color: '#10B981' },
      { label: 'Hoya', value: scaleValue(65), color: '#F59E0B' },
      { label: 'Essilor', value: scaleValue(50), color: '#8B5CF6' },
    ];
  }, [activeMetrics]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans overflow-x-hidden">
      
      {/* Top Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 sm:mb-8 flex-shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time analytics, sales KPIs, store comparisons, and stock levels.
          </p>
        </div>

        {/* Global Store Selector, Add Store Button */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap sm:flex-nowrap">
          
          {/* Dropdown Branch Filter */}
          <div className="relative w-full sm:w-56">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Store className="w-4 h-4" />
            </span>
            <select
              value={selectedStoreFilter}
              onChange={(e) => setSelectedStoreFilter(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white appearance-none cursor-pointer"
            >
              <option value="All">All Stores</option>
              <option value="Main Branch">Main Branch</option>
              <option value="Branch 2">Branch 2</option>
              <option value="Branch 3">Branch 3</option>
              <option value="Admin Store">Admin Store</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Add Store Button */}
          <button
            onClick={() => setShowAddStore(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex-shrink-0 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Add Store
          </button>
        </div>
      </div>

      {/* Reintroduced 4 Small KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {[
          { title: 'Total Revenue', value: activeMetrics.revenue, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50', border: 'border-emerald-100', chartId: 'sales-trend' },
          { title: 'Active Staff', value: activeMetrics.staff, icon: Users, color: 'text-blue-600 bg-blue-50', border: 'border-blue-100', chartId: 'branch-performance' },
          { title: 'Total Orders', value: activeMetrics.orders.toLocaleString(), icon: ShoppingBag, color: 'text-purple-600 bg-purple-50', border: 'border-purple-100', chartId: 'sales-status' },
          { title: 'Low Stock Alert', value: activeMetrics.lowStock, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50', border: 'border-amber-100', chartId: 'inventory-status' },
        ].map((stat, i) => (
          <button
            key={i}
            onClick={() => scrollToChart(stat.chartId)}
            className="w-full text-left bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <div className={`p-3 sm:p-4 rounded-xl ${stat.color} mr-4 flex-shrink-0 border ${stat.border}`}>
              <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-slate-400 mb-0.5 truncate uppercase tracking-wider">{stat.title}</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-800">{stat.value}</h3>
            </div>
          </button>
        ))}
      </div>

      {/* Analytics Content Area */}
      {isLoading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <RefreshCw className="w-10 h-10 animate-spin text-emerald-500 mb-3" />
          <p className="text-slate-500 text-sm font-semibold">Updating chart comparisons...</p>
        </div>
      ) : isEmpty ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm max-w-xl mx-auto">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-4">
            <Activity className="w-7 h-7 text-slate-300" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Analytical database is empty</h3>
          <p className="text-slate-500 text-sm mb-6">No inventory changes were registered for the active selection.</p>
          <button
            onClick={() => setIsEmpty(false)}
            className="px-5 py-2.5 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-md"
          >
            Load Simulated Database Records
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Row 1: Sales Trend (Full Width - Highest Importance) */}
          <div className="w-full">
            <ChartCard
              id="sales-trend"
              isHighlighted={highlightedChart === 'sales-trend'}
              title="Sales Trend (Line Chart)"
              onRefresh={handleRefresh}
              actions={
                <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
                  {['Today', 'Week', 'Month', 'Year'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setTrendFilter(filter)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                        trendFilter === filter
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              }
            >
              <LineChart
                data={salesTrendData}
                onPointClick={() => navigate('/admin/sales')}
              />
            </ChartCard>
          </div>

          {/* Row 2: Sales Status | Revenue Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard
              id="sales-status"
              isHighlighted={highlightedChart === 'sales-status'}
              title="Sales Status (Donut Chart)"
              onRefresh={handleRefresh}
            >
              <DonutChart
                data={salesStatusData}
                onSliceClick={(slice) => navigate(`/admin/sales?status=${slice.name}`)}
              />
            </ChartCard>

            <ChartCard title="Revenue Breakdown (Donut Chart)" onRefresh={handleRefresh}>
              <DonutChart
                data={revenueBreakdownData}
                onSliceClick={(slice) => navigate(`/admin/store/${activeStoreId}/inventory?category_id=${slice.categoryId}`)}
              />
            </ChartCard>
          </div>

          {/* Row 3: Inventory Status | Branch Performance (Highlights Comparison) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard
              id="inventory-status"
              isHighlighted={highlightedChart === 'inventory-status'}
              title="Inventory Status (Bar Chart)"
              onRefresh={handleRefresh}
            >
              <BarChart
                data={inventoryStatusData}
                onBarClick={(bar) => navigate(`/admin/store/${activeStoreId}/inventory?stock_status=${bar.label}`)}
              />
            </ChartCard>

            <ChartCard
              id="branch-performance"
              isHighlighted={highlightedChart === 'branch-performance'}
              title="Branch Performance (Bar Chart)"
              onRefresh={handleRefresh}
            >
              <BarChart
                data={branchPerformanceData}
                onBarClick={(bar) => navigate(`/admin/sales?branch=${bar.label}`)}
              />
            </ChartCard>
          </div>

          {/* Row 4 & 5: Conditional Supplier Analytics Grid */}
          {showSupplier ? (
            <>
              {/* Row 4: Store Inventory Distribution | Supplier Analytics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ChartCard title="Store-wise Inventory Distribution (Donut Chart)" onRefresh={handleRefresh}>
                  <DonutChart
                    data={storeInventoryDistributionData}
                    onSliceClick={(slice) => navigate(`/admin/store/${slice.id}/inventory`)}
                  />
                </ChartCard>

                <ChartCard title="Supplier Analytics (Bar Chart)" onRefresh={handleRefresh}>
                  <BarChart
                    data={supplierAnalyticsData}
                    onBarClick={(bar) => navigate(`/admin/suppliers/${bar.id}`)}
                  />
                </ChartCard>
              </div>

              {/* Row 5: Transaction Analytics | Brand Performance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ChartCard title="Transaction Analytics (Donut Chart)" onRefresh={handleRefresh}>
                  <DonutChart
                    data={transactionAnalyticsData}
                    onSliceClick={(slice) => navigate(`/admin/transactions?type=${slice.type}`)}
                  />
                </ChartCard>

                <ChartCard title="Brand Performance (Bar Chart)" onRefresh={handleRefresh}>
                  <BarChart
                    data={brandPerformanceData}
                    onBarClick={() => navigate(`/admin/store/${activeStoreId}/inventory`)}
                  />
                </ChartCard>
              </div>
            </>
          ) : (
            <>
              {/* Row 4: Store Inventory Distribution | Transaction Analytics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ChartCard title="Store-wise Inventory Distribution (Donut Chart)" onRefresh={handleRefresh}>
                  <DonutChart
                    data={storeInventoryDistributionData}
                    onSliceClick={(slice) => navigate(`/admin/store/${slice.id}/inventory`)}
                  />
                </ChartCard>

                <ChartCard title="Transaction Analytics (Donut Chart)" onRefresh={handleRefresh}>
                  <DonutChart
                    data={transactionAnalyticsData}
                    onSliceClick={(slice) => navigate(`/admin/transactions?type=${slice.type}`)}
                  />
                </ChartCard>
              </div>

              {/* Row 5: Brand Performance (Full Width) */}
              <div className="w-full">
                <ChartCard title="Brand Performance (Bar Chart)" onRefresh={handleRefresh}>
                  <BarChart
                    data={brandPerformanceData}
                    onBarClick={() => navigate(`/admin/store/${activeStoreId}/inventory`)}
                  />
                </ChartCard>
              </div>
            </>
          )}

        </div>
      )}

      {/* Reinstated Store Add Modal */}
      <AddStoreModal
        isOpen={showAddStore}
        onClose={() => setShowAddStore(false)}
      />
    </div>
  );
};

export default Dashboard;