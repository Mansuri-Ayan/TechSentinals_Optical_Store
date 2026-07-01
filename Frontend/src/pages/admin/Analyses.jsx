import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, BarChart3, PieChart, RefreshCw, Sliders,
  Database, Filter, Activity, Store, Archive, ArrowRightLeft, Truck, Tag,
  Download, Clock, ArrowUpRight, DollarSign, ShoppingBag, Users, AlertTriangle, Calendar
} from 'lucide-react';
import { useStoreStore } from '../../store/store';
import StoreSwitcher from '../../components/admin/stores/StoreSwitcher';
import { useAnalyses } from '../../hooks/useAnalyses';
import { useChartAnimation } from '../../hooks/useChartAnimation';
import { useRoleContext } from '../../hooks/useRoleContext';

/* ─────────────────────────────────────────────────────────
   PREMIUM WIDGET CARD (STRIPE-LIKE NOTION AESTHETICS)
   ───────────────────────────────────────────────────────── */
const AnalyticsCard = ({ title, subtitle, children, actions, className = "" }) => (
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

/* ─────────────────────────────────────────────────────────
   PURE SVG CHART RENDERING COMPONENTS
   ───────────────────────────────────────────────────────── */

// 1. Line Chart: Sales Trend (12 Months representation)
const SalesTrendChart = ({ data: rawData }) => {
  const [progress, elementRef] = useChartAnimation(rawData);

  if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
    return <div className="w-full h-72 sm:h-80 flex items-center justify-center text-xs text-slate-400 font-semibold">No data available</div>;
  }
  const data = rawData.filter(item => item != null).map(item => ({
    value: Number(item.value) || 0,
    label: String(item.label || ''),
  }));
  if (data.length === 0) return <div className="w-full h-72 sm:h-80 flex items-center justify-center text-xs text-slate-400 font-semibold">No data available</div>;

  const maxValue = Math.max(...data.map(item => item.value), 1);
  const points = data.map((item, i) => {
    const x = 40 + i * (250 / 11);
    const y = 135 - (item.value / maxValue) * 105 * progress;
    return `${x},${y}`;
  }).join(' ');

  const areaD = points ? `M 40,135 L ${points} L 290,135 Z` : '';

  return (
    <div className="w-full h-72 sm:h-80 px-2 pt-2">
      <svg ref={elementRef} viewBox="0 0 300 160" className="w-full h-full">
        <defs>
          <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="40" y1="30" x2="290" y2="30" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1="65" x2="290" y2="65" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1="100" x2="290" y2="100" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1="135" x2="290" y2="135" stroke="#E2E8F0" strokeWidth="1.25" />

        {areaD && <path d={areaD} fill="url(#salesGrad)" />}
        {points && <path d={`M 40,135 L ${points}`} fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}

        {data.map((p, i) => {
          const x = 40 + i * (250 / 11);
          const pVal = p.value;
          const pLabel = p.label;
          const y = 135 - (pVal / maxValue) * 105 * progress;
          const displayVal = pVal.toLocaleString();
          return (
            <g key={i} className="group cursor-pointer">
              <circle cx={x} cy={y} r="2.5" fill="#FFFFFF" stroke="#10B981" strokeWidth="1.5" className="transition-all duration-200 group-hover:r-4.5 group-hover:stroke-emerald-600" />
              <circle cx={x} cy={y} r="8" fill="transparent" />
              <text x={x} y={y - 8} textAnchor="middle" className="text-[7.5px] font-extrabold fill-slate-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                ₹{(pVal / 1000).toFixed(0)}k
              </text>
              <text x={x} y="145" textAnchor="middle" className="text-[8px] font-bold fill-slate-400 pointer-events-none">{pLabel}</text>
              <title>{pLabel + ': ₹' + displayVal}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// 2. Donut Chart (General Visual implementation)
const DonutChart = ({ data: rawData, totalLabel = "Total" }) => {
  const [progress, elementRef] = useChartAnimation(rawData);

  if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
    return <div className="w-full h-48 flex items-center justify-center text-xs text-slate-400 font-semibold">No data available</div>;
  }
  const data = rawData.filter(item => item != null).map(item => ({
    value: Number(item.value) || 0,
    name: String(item.name || ''),
    color: item.color || '#6B7280',
  }));
  if (data.length === 0) return <div className="w-full h-48 flex items-center justify-center text-xs text-slate-400 font-semibold">No data available</div>;

  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentOffset = 0;

  return (
    <div ref={elementRef} className="relative w-full h-48 flex flex-col sm:flex-row items-center justify-around gap-4 px-2">
      <div className="relative w-32 h-32 flex-shrink-0">
        <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90">
          <circle cx="70" cy="70" r="50" fill="transparent" stroke="#F8FAFC" strokeWidth="12" />
          {data.map((slice, i) => {
            const percentage = total > 0 ? (slice.value / total) * 100 : 0;
            const strokeLength = (percentage / 100) * 314.16 * progress;
            const strokeOffset = 314.16 - strokeLength + currentOffset;
            currentOffset -= strokeLength;
            const valDisplay = slice.value.toLocaleString();

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
                <title>{slice.name + ': ' + valDisplay + ' (' + Math.round(percentage) + '%)'}</title>
              </circle>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">{totalLabel}</span>
          <span className="text-base font-black text-slate-800 leading-none mt-0.5">{total.toLocaleString()}</span>
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

// 3. Bar Chart (General Visual implementation)
const BarChart = ({ data: rawData }) => {
  const [progress, elementRef] = useChartAnimation(rawData);

  if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
    return <div className="w-full h-48 flex items-center justify-center text-xs text-slate-400 font-semibold">No data available</div>;
  }
  const data = rawData.filter(item => item != null).map(item => ({
    value: Number(item.value) || 0,
    label: String(item.label || ''),
    color: item.color || '#3B82F6',
  }));
  if (data.length === 0) return <div className="w-full h-48 flex items-center justify-center text-xs text-slate-400 font-semibold">No data available</div>;

  const maxValue = Math.max(...data.map(item => item.value), 1);

  return (
    <div className="w-full h-48 px-2 pt-2">
      <svg ref={elementRef} viewBox="0 0 300 160" className="w-full h-full">
        <line x1="40" y1="20" x2="290" y2="20" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1="60" x2="290" y2="60" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1="100" x2="290" y2="100" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1="130" x2="290" y2="130" stroke="#E2E8F0" strokeWidth="1.25" />

        {data.map((bar, i) => {
          const barWidth = Math.max(10, Math.min(20, 130 / data.length));
          const spacing = (250 - (data.length * barWidth)) / (data.length + 1);
          const x = 40 + spacing + i * (barWidth + spacing);
          const barVal = bar.value;
          const barLabel = bar.label;
          const height = (barVal / maxValue) * 105 * progress;
          const y = 130 - height;
          const displayVal = barVal.toLocaleString();
          const displayLabel = barLabel.length > 9 ? (barLabel.substring(0, 6) + '..') : barLabel;

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
                {displayVal}
              </text>
              <text x={x + barWidth / 2} y="143" textAnchor="middle" className="text-[8px] font-extrabold fill-slate-400 pointer-events-none">
                {displayLabel}
              </text>
              <title>{barLabel + ': ' + displayVal}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
};


// 4. Line Chart: Customer Growth (Jan -> Dec)
const CustomerGrowthChart = ({ data: rawData }) => {
  const [progress, elementRef] = useChartAnimation(rawData);

  if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
    return <div className="w-full h-48 flex items-center justify-center text-xs text-slate-400 font-semibold">No data available</div>;
  }
  const data = rawData.filter(item => item != null).map(item => ({
    value: Number(item.value) || 0,
    label: String(item.label || ''),
  }));
  if (data.length === 0) return <div className="w-full h-48 flex items-center justify-center text-xs text-slate-400 font-semibold">No data available</div>;

  const maxValue = Math.max(...data.map(item => item.value), 1);
  const points = data.map((item, i) => {
    const x = 40 + i * (250 / 11);
    const y = 130 - (item.value / maxValue) * 105 * progress;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full h-48 px-2 pt-2">
      <svg ref={elementRef} viewBox="0 0 300 160" className="w-full h-full">
        <line x1="40" y1="20" x2="290" y2="20" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1="60" x2="290" y2="60" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1="100" x2="290" y2="100" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1="130" x2="290" y2="130" stroke="#E2E8F0" strokeWidth="1.25" />

        {points && <path d={`M 40,130 L ${points}`} fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}

        {data.map((p, i) => {
          const x = 40 + i * (250 / 11);
          const pVal = p.value;
          const pLabel = p.label;
          const y = 130 - (pVal / maxValue) * 105 * progress;
          return (
            <g key={i} className="group cursor-pointer">
              <circle cx={x} cy={y} r="2.5" fill="#FFFFFF" stroke="#6366F1" strokeWidth="1.5" className="transition-all duration-200 group-hover:r-4 group-hover:stroke-indigo-600" />
              <circle cx={x} cy={y} r="8" fill="transparent" />
              <text x={x} y={y - 8} textAnchor="middle" className="text-[7.5px] font-extrabold fill-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {pVal}
              </text>
              <text x={x} y="143" textAnchor="middle" className="text-[8px] font-extrabold fill-slate-400 pointer-events-none">{pLabel}</text>
              <title>{pLabel + ': ' + pVal + ' Customers'}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const Analyses = () => {
  const navigate = useNavigate();
  const { storeId, buildPath, showStoreSwitcher, isPathAdmin } = useRoleContext();
  const { stores, selectedStore, setSelectedStore } = useStoreStore();
  const [selectedStoreFilter, setSelectedStoreFilter] = useState('All Store');
  const [dateRange, setDateRange] = useState('This Year');

  // Find active store ID based on selectedStoreFilter name
  const activeStoreId = useMemo(() => {
    if (!showStoreSwitcher) return storeId ? Number(storeId) : null;
    if (selectedStoreFilter === 'All' || selectedStoreFilter === 'All Store') return null;
    const matchedStore = stores.find(s => (s.store_name || s.name) === selectedStoreFilter);
    return matchedStore?.id || null;
  }, [selectedStoreFilter, stores, showStoreSwitcher, storeId]);

  // Fetch real analyses data from backend
  const { data, isLoading, refetch } = useAnalyses(activeStoreId, dateRange);

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
        orders: 0,
        customers: 0,
        profit: 0,
        inventoryVal: 0,
        stores: 0
      };
    }
    return {
      revenue: data.kpis.revenue,
      orders: data.kpis.orders_count,
      customers: data.kpis.customers_count,
      profit: data.kpis.profit,
      inventoryVal: data.kpis.inventory_val,
      stores: data.kpis.stores_count
    };
  }, [data]);

  const handleRefresh = () => {
    refetch();
  };

  const handleExport = () => {
    alert("Exporting analyses report as CSV/PDF...");
  };

  /* ── 1. Sales Trend Data (Jan -> Dec) ── */
  const salesTrendData = useMemo(() => {
    return data?.sales_trend || [];
  }, [data]);

  /* ── 2. Sales Status Data ── */
  const salesStatusData = useMemo(() => {
    return data?.sales_status || [];
  }, [data]);

  /* ── 3. Revenue Breakdown Data ── */
  const revenueBreakdownData = useMemo(() => {
    return data?.revenue_breakdown || [];
  }, [data]);

  /* ── 4. Inventory Status Data ── */
  const inventoryStatusData = useMemo(() => {
    return data?.inventory_status || [];
  }, [data]);

  /* ── 5. Branch Performance Data ── */
  const branchPerformanceData = useMemo(() => {
    return data?.branch_performance || [];
  }, [data]);

  /* ── 6. Best Performing Stores Data ── */
  const bestPerformingStores = useMemo(() => {
    return data?.best_performing_stores || [];
  }, [data]);

  /* ── 7. Store-wise Inventory Distribution Data ── */
  const storeInventoryDistribution = useMemo(() => {
    return data?.store_inventory_distribution || [];
  }, [data]);

  /* ── 8. Supplier Analytics Data ── */
  const supplierAnalyticsData = useMemo(() => {
    return data?.supplier_volumes || [];
  }, [data]);

  /* ── 9. Transaction Payment Analytics Data ── */
  const transactionAnalyticsData = useMemo(() => {
    return data?.transaction_payment_analytics || [];
  }, [data]);

  /* ── 10. Brand Performance Data ── */
  const brandPerformanceData = useMemo(() => {
    return data?.brand_revenue_comparison || [];
  }, [data]);

  /* ── 11. Customer Growth Data (Jan -> Dec) ── */
  const customerGrowthData = useMemo(() => {
    return data?.monthly_customer_growth || [];
  }, [data]);

  const fmtCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans overflow-x-hidden space-y-6 sm:space-y-8 bg-transparent">

      {/* Analytics Page Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b border-slate-100 pb-5 flex-shrink-0">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-slate-800" /> Analytics Dashboard
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-semibold">
            Business insights and performance tracking
          </p>
        </div>

        {/* Filters and actions row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
          {/* Date Range Filter */}
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

          {/* Store Switcher */}
          {showStoreSwitcher && (
            <StoreSwitcher
              selectedStoreFilter={selectedStoreFilter}
              onStoreChange={(val) => {
                setSelectedStoreFilter(val);
                const matchedStore = stores.find(s => (s.store_name || s.name) === val);
                setSelectedStore(matchedStore || null);
              }}
            />
          )}

          {/* Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" /> Export
            </button>
            <button
              onClick={handleRefresh}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <RefreshCw className="w-10 h-10 animate-spin text-emerald-500 mb-3" />
          <p className="text-slate-500 text-sm font-semibold">Updating analyses report metrics...</p>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">

          {/* Analytics Cards at Top */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {[
              { title: 'Total Revenue', value: fmtCurrency(activeMetrics.revenue), icon: DollarSign, color: 'text-slate-400' },
              { title: 'Total Orders', value: activeMetrics.orders.toLocaleString(), icon: ShoppingBag, color: 'text-slate-400' },
              { title: 'Total Customers', value: activeMetrics.customers.toLocaleString(), icon: Users, color: 'text-slate-400' },
              { title: 'Gross Profit', value: fmtCurrency(activeMetrics.profit), icon: TrendingUp, color: 'text-slate-400' },
              { title: 'Inventory Value', value: fmtCurrency(activeMetrics.inventoryVal), icon: Archive, color: 'text-slate-400' },
              { title: 'Total Stores', value: activeMetrics.stores.toString(), icon: Store, color: 'text-slate-400' }
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between h-36 hover:shadow-md transition-all duration-300"
              >
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.title}</p>
                  <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-none mt-4 truncate">{stat.value}</h3>
              </div>
            ))}
          </div>

          {/* Row 1: Sales Trend (Large 2/3) + Sales Status (Medium 1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AnalyticsCard
                title="Sales Trend Analysis"
                subtitle="Annualized gross revenue growth trends charted across 12 calendar months."
              >
                <SalesTrendChart data={salesTrendData} />
              </AnalyticsCard>
            </div>
            <div className="lg:col-span-1">
              <AnalyticsCard
                title="Sales Status Breakdown"
                subtitle="Proportion of parsed sales transactions categorized by order state."
              >
                <DonutChart data={salesStatusData} totalLabel="Orders" />
              </AnalyticsCard>
            </div>
          </div>

          {/* Row 2: Revenue Breakdown (1/3) + Inventory Status (1/3) + Branch Performance (1/3) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnalyticsCard
              title="Revenue Breakdown"
              subtitle="Product category contributions to overall gross sales numbers."
            >
              <DonutChart data={revenueBreakdownData} totalLabel="Revenue" />
            </AnalyticsCard>

            <AnalyticsCard
              title="Inventory Status Breakdown"
              subtitle="Comparison of active catalog counts categorized by availability levels."
            >
              <BarChart data={inventoryStatusData} />
            </AnalyticsCard>

            <AnalyticsCard
              title="Branch Performance comparison"
              subtitle="Relative order values processed by active store locations."
            >
              <BarChart data={branchPerformanceData} />
            </AnalyticsCard>
          </div>

          {/* Row 3: Best Performing Stores (1/3) + Store-wise Inventory (1/3) + Supplier Analytics (1/3) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Best Performing Stores ranked list */}
            <div className="bg-white rounded-3xl border border-slate-200/60 p-6 sm:p-8 flex flex-col hover:shadow-md transition-all duration-300 h-full">
              <div className="mb-6 flex-shrink-0">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Best Performing Stores</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Ranked branches by gross revenue output.</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[176px] hide-scrollbar pr-1">
                {bestPerformingStores.map((store, idx) => (
                  <div key={store.name} className="flex items-center justify-between gap-3 p-2.5 hover:bg-slate-50 rounded-2xl border border-transparent hover:border-slate-100/50 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-5 h-5 rounded flex items-center justify-center font-black text-[10px] flex-shrink-0 ${idx === 0 ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          idx === 1 ? 'bg-slate-50 text-slate-700 border border-slate-200/50' : 'bg-orange-50 text-orange-700 border border-orange-100'
                        }`}>
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate">{store.name}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs font-black text-slate-900">{fmtCurrency(store.revenue)}</span>
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${store.growth >= 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-red-700 bg-red-50 border-red-100'}`}>
                        {store.growth >= 0 ? '+' : ''}{store.growth}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <AnalyticsCard
              title="Store-wise Inventory Level"
              subtitle="Comparison of relative catalog volume allocations mapped across stores."
            >
              <DonutChart data={storeInventoryDistribution} totalLabel="Stock" />
            </AnalyticsCard>

            <AnalyticsCard
              title="Supplier Lead Order Volumes"
              subtitle="Aggregate order allocations distributed among connected suppliers."
            >
              <BarChart data={supplierAnalyticsData} />
            </AnalyticsCard>
          </div>

          {/* Row 4: Transaction Analytics (1/3) + Brand Performance (1/3) + Customer Growth (1/3) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnalyticsCard
              title="Transaction Payment Analytics"
              subtitle="Relative breakdown of payment methods utilized across orders."
            >
              <DonutChart data={transactionAnalyticsData} totalLabel="Sales" />
            </AnalyticsCard>

            <AnalyticsCard
              title="Brand Revenue comparison"
              subtitle="Comparison of sales revenue volumes generated by eyewear brands."
            >
              <BarChart data={brandPerformanceData} />
            </AnalyticsCard>

            <AnalyticsCard
              title="Monthly Customer Growth"
              subtitle="Cumulative customer registrations tracked monthly."
            >
              <CustomerGrowthChart data={customerGrowthData} />
            </AnalyticsCard>
          </div>

        </div>
      )}

    </div>
  );
};

export default Analyses;
