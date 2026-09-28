import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3, TrendingUp, IndianRupee, ShoppingBag, Store,
  Building2, Users, MapPin, Layers, Award, Clock, ArrowUpRight,
  Download, Filter, AlertTriangle, CheckCircle2, ChevronRight, Eye
} from 'lucide-react';
import { useSuperAdminAnalytics } from '../../hooks/useSuperAdmin';

export default function SuperAdminAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [activeTab, setActiveTab] = useState('economics');

  const {
    overview,
    isLoadingOverview,
    revenueTrends,
    isLoadingRevenueTrends,
    paymentMethods,
    isLoadingPaymentMethods,
    tenantHealth,
    isLoadingTenantHealth,
    geographic,
    isLoadingGeographic,
    categoriesBrands,
    isLoadingCategoriesBrands,
    operationalHealth,
    isLoadingOperational,
  } = useSuperAdminAnalytics(selectedPeriod);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleExportCSV = () => {
    if (!overview) return;
    const csvRows = [
      ['Metric', 'Value'],
      ['Platform GMV', overview.period?.gmv || 0],
      ['Completed Invoices', overview.period?.invoices || 0],
      ['Average Order Value (AOV)', overview.period?.aov || 0],
      ['GMV Growth vs Prior Period (%)', overview.period?.gmv_growth_pct || 0],
      ['Lifetime GMV', overview.lifetime?.gmv || 0],
      ['Lifetime Invoices', overview.lifetime?.invoices || 0],
      ['Total Businesses (Tenants)', tenantHealth?.summary?.total_tenants || 0],
      ['Active Businesses', tenantHealth?.summary?.active_tenants || 0],
      ['Dormant Businesses', tenantHealth?.summary?.dormant_tenants || 0],
      ['Total Stores', operationalHealth?.infrastructure?.total_stores || 0],
      ['Total Stock Units', operationalHealth?.inventory?.total_stock_units || 0],
      ['Total Stock Valuation', operationalHealth?.inventory?.total_inventory_valuation || 0],
      ['Deadstock Locked Capital', operationalHealth?.deadstock?.locked_capital || 0],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `platform_analytics_${selectedPeriod}d.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SVG Line Chart for Revenue Trends
  const maxRevenue = useMemo(() => {
    if (!revenueTrends || revenueTrends.length === 0) return 1;
    return Math.max(...revenueTrends.map(r => r.value || 0), 100);
  }, [revenueTrends]);

  const points = useMemo(() => {
    if (!revenueTrends || revenueTrends.length === 0) return '';
    const step = revenueTrends.length > 1 ? 250 / (revenueTrends.length - 1) : 125;
    return revenueTrends.map((pt, idx) => {
      const x = 35 + idx * step;
      const y = 135 - ((pt.value || 0) / maxRevenue) * 105;
      return `${x},${y}`;
    }).join(' ');
  }, [revenueTrends, maxRevenue]);

  const areaD = points ? `M 35,135 L ${points} L 285,135 Z` : '';

  return (
    <div className="space-y-6">
      {/* ── Header & Filter Bar ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Platform Intelligence</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Platform Analytics Hub
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-tenant financial telemetry, store density, customer acquisition, and optical market share.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period selector */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-bold">
            {[
              { label: '7D', value: 7 },
              { label: '30D', value: 30 },
              { label: '90D', value: 90 },
              { label: '1Y', value: 365 },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => setSelectedPeriod(p.value)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedPeriod === p.value
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── Navigation Tabs ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200/60">
        {[
          { id: 'economics', label: 'Revenue & GMV', icon: IndianRupee },
          { id: 'tenants', label: 'Tenant Health & Churn', icon: Building2 },
          { id: 'geographic', label: 'Geographic Footprint', icon: MapPin },
          { id: 'optical', label: 'Optical Catalog Trends', icon: Award },
          { id: 'operational', label: 'Operational Benchmarks', icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#0B132B] text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab 1: Revenue & GMV Economics ───────────────────────── */}
      {activeTab === 'economics' && (
        <div className="space-y-6">
          {/* Top Economic KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Platform GMV</span>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">
                {isLoadingOverview ? '...' : formatCurrency(overview?.period?.gmv)}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
                Growth: <span className="text-emerald-600 font-bold">+{overview?.period?.gmv_growth_pct ?? 0}%</span> vs prior period
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed Invoices</span>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {isLoadingOverview ? '...' : overview?.period?.invoices ?? 0}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Lifetime: <span className="font-bold">{overview?.lifetime?.invoices ?? 0}</span> orders
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Average Order Value</span>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {isLoadingOverview ? '...' : formatCurrency(overview?.period?.aov)}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Per checkout across all stores
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Tax (GST)</span>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {isLoadingOverview ? '...' : formatCurrency(overview?.period?.tax)}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Discounts granted: <span className="font-bold">{formatCurrency(overview?.period?.discounts)}</span>
              </p>
            </div>
          </div>

          {/* Revenue Curve & Payment Mix Dual Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Revenue Trend SVG Curve (2 cols) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">GMV Growth & Order Trajectory</h3>
                  <p className="text-xs text-slate-400">Time-series aggregated sales curve</p>
                </div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Live Telemetry</span>
                </div>
              </div>

              {isLoadingRevenueTrends ? (
                <div className="h-64 flex items-center justify-center text-xs text-slate-400">Loading trend...</div>
              ) : revenueTrends.length > 0 ? (
                <div className="w-full h-64">
                  <svg viewBox="0 0 300 150" className="w-full h-full">
                    <defs>
                      <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <line x1="35" y1="30" x2="285" y2="30" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="35" y1="65" x2="285" y2="65" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="35" y1="100" x2="285" y2="100" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="35" y1="135" x2="285" y2="135" stroke="#E2E8F0" strokeWidth="1.25" />

                    {areaD && <path d={areaD} fill="url(#gmvGrad)" />}
                    {points && (
                      <path
                        d={`M 35,135 L ${points}`}
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {revenueTrends.map((pt, idx) => {
                      const step = revenueTrends.length > 1 ? 250 / (revenueTrends.length - 1) : 125;
                      const x = 35 + idx * step;
                      const y = 135 - ((pt.value || 0) / maxRevenue) * 105;
                      return (
                        <g key={idx} className="group cursor-pointer">
                          <circle cx={x} cy={y} r="3" fill="#FFFFFF" stroke="#10B981" strokeWidth="2" className="transition-all group-hover:r-5" />
                          <text x={x} y="145" textAnchor="middle" className="text-[7.5px] font-bold fill-slate-400">
                            {pt.label}
                          </text>
                          <title>{`${pt.label}: ${formatCurrency(pt.value)} (${pt.invoices} orders)`}</title>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-slate-400">No revenue data for period</div>
              )}
            </div>

            {/* Right: Payment Method Breakdown (1 col) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">Payment Method Mix</h3>
                <p className="text-xs text-slate-400 mb-4">Cross-tenant settlement breakdown</p>

                {isLoadingPaymentMethods ? (
                  <div className="h-48 flex items-center justify-center text-xs text-slate-400">Loading payment mix...</div>
                ) : paymentMethods.length > 0 ? (
                  <div className="space-y-3.5">
                    {paymentMethods.map((pm, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 uppercase">{pm.method}</span>
                          <span className="text-slate-500 font-medium">
                            {formatCurrency(pm.amount)} ({pm.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${pm.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-xs text-slate-400">No payment data yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: Tenant Health & Growth ────────────────────────── */}
      {activeTab === 'tenants' && (
        <div className="space-y-6">
          {/* Health Category Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-emerald-200/60 bg-emerald-50/20 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Thriving Tenants</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-3xl font-black text-emerald-700 mt-2">
                {isLoadingTenantHealth ? '...' : tenantHealth?.summary?.thriving_tenants ?? 0}
              </h3>
              <p className="text-xs text-emerald-600 mt-1">Transacted within the last 7 days</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-blue-200/60 bg-blue-50/20 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Weekly Active</span>
                <Store className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-3xl font-black text-blue-700 mt-2">
                {isLoadingTenantHealth ? '...' : tenantHealth?.summary?.active_weekly_tenants ?? 0}
              </h3>
              <p className="text-xs text-blue-600 mt-1">Transacted within the last 14 days</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-amber-200/60 bg-amber-50/20 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">At-Risk / Dormant</span>
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-3xl font-black text-amber-700 mt-2">
                {isLoadingTenantHealth ? '...' : tenantHealth?.summary?.dormant_tenants ?? 0}
              </h3>
              <p className="text-xs text-amber-600 mt-1">Zero sales in the last 30+ days</p>
            </div>
          </div>

          {/* Top 10 Tenants Leaderboard Table */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Top Revenue Generating Optical Businesses</h3>
                <p className="text-xs text-slate-400">Ranked by lifetime Gross Merchandise Value</p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                Multi-Store Expansion Rate: <span className="text-emerald-600">{tenantHealth?.summary?.multi_store_expansion_rate_pct ?? 0}%</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 uppercase font-bold tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-3">Rank & Business</th>
                    <th className="px-6 py-3">Owner Contact</th>
                    <th className="px-6 py-3 text-center">Stores</th>
                    <th className="px-6 py-3">Health Status</th>
                    <th className="px-6 py-3 text-right">Lifetime GMV</th>
                    <th className="px-6 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingTenantHealth ? (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-400">Loading leaderboard...</td></tr>
                  ) : tenantHealth?.top_tenants_leaderboard?.map((t, idx) => (
                    <tr key={t.admin_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span>{t.business_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">
                        {t.owner_name} • {t.phone}
                      </td>
                      <td className="px-6 py-3.5 text-center font-bold text-slate-700">
                        {t.store_count}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          t.health_status === 'THRIVING'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : t.health_status === 'ACTIVE'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {t.health_status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-black text-emerald-600">
                        {formatCurrency(t.gmv)}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <Link
                          to={`/super-admin/admins/${t.admin_id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 3: Geographic Distribution ───────────────────────── */}
      {activeTab === 'geographic' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* State-Wise Table (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/60 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">State-Wise Optical Market Footprint</h3>
              <p className="text-xs text-slate-400">Stores density and revenue contribution by region</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 uppercase font-bold tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-3">State</th>
                    <th className="px-6 py-3 text-center">Total Stores</th>
                    <th className="px-6 py-3 text-center">Active Stores</th>
                    <th className="px-6 py-3 text-right">Revenue</th>
                    <th className="px-6 py-3 text-right">Platform Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingGeographic ? (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-400">Loading states...</td></tr>
                  ) : geographic?.states?.map((st, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-3.5 font-bold text-slate-900">{st.state}</td>
                      <td className="px-6 py-3.5 text-center font-bold text-slate-700">{st.stores}</td>
                      <td className="px-6 py-3.5 text-center text-emerald-600 font-bold">{st.active_stores}</td>
                      <td className="px-6 py-3.5 text-right font-black text-slate-800">{formatCurrency(st.gmv)}</td>
                      <td className="px-6 py-3.5 text-right font-bold text-emerald-600">{st.share_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Optical Cities (1 col) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Top Optical Hub Cities</h3>
            <p className="text-xs text-slate-400 mb-4">Highest branch concentration</p>

            {isLoadingGeographic ? (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400">Loading cities...</div>
            ) : (
              <div className="space-y-3">
                {geographic?.top_cities?.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{c.city}</p>
                      <p className="text-[10px] text-slate-400">{c.state}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-600">{c.stores} stores</span>
                      <p className="text-[10px] text-slate-500">{formatCurrency(c.gmv)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab 4: Optical Catalog & Brand Intelligence ─────────── */}
      {activeTab === 'optical' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Share */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Optical Product Category Distribution</h3>
            <p className="text-xs text-slate-400 mb-5">Share of units sold and revenue across the platform</p>

            {isLoadingCategoriesBrands ? (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400">Loading categories...</div>
            ) : (
              <div className="space-y-4">
                {categoriesBrands?.categories?.map((cat, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{cat.name}</span>
                      <span className="text-slate-500 font-medium">
                        {cat.units_sold} units • {formatCurrency(cat.revenue)} ({cat.share_pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${cat.share_pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Workflow Ratio & Top Brands */}
          <div className="space-y-6">
            {/* Direct vs Prescription Ratio */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Sale Processing Type Benchmark</h3>
              <p className="text-xs text-slate-400 mb-4">Instant Walk-In Sales vs Custom Prescription Orders</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Direct Counter Sales</span>
                  <h4 className="text-2xl font-black text-slate-800 mt-1">
                    {categoriesBrands?.workflow_ratio?.direct_percentage ?? 0}%
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {categoriesBrands?.workflow_ratio?.direct_sales_units ?? 0} units sold
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-center">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Prescription Orders</span>
                  <h4 className="text-2xl font-black text-emerald-700 mt-1">
                    {categoriesBrands?.workflow_ratio?.prescription_percentage ?? 0}%
                  </h4>
                  <p className="text-[11px] text-emerald-600 mt-0.5">
                    {categoriesBrands?.workflow_ratio?.prescription_order_units ?? 0} custom orders
                  </p>
                </div>
              </div>
            </div>

            {/* Top Brands */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Top Optical Brands in Demand</h3>
              <div className="flex flex-wrap gap-2">
                {categoriesBrands?.top_brands?.map((b, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200 flex items-center gap-1.5"
                  >
                    <span>{b.brand}</span>
                    <span className="text-[10px] text-emerald-600 font-extrabold">({b.units_sold} units)</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 5: Operational Benchmarks ────────────────────────── */}
      {activeTab === 'operational' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-xs">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Inventory Capital</h4>
            <h3 className="text-3xl font-black text-slate-900 mt-2">
              {isLoadingOperational ? '...' : formatCurrency(operationalHealth?.inventory?.total_inventory_valuation)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {operationalHealth?.inventory?.total_stock_units?.toLocaleString() ?? 0} total stock units
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-amber-200/60 bg-amber-50/20 shadow-xs">
            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Deadstock Capital Locked</h4>
            <h3 className="text-3xl font-black text-amber-700 mt-2">
              {isLoadingOperational ? '...' : formatCurrency(operationalHealth?.deadstock?.locked_capital)}
            </h3>
            <p className="text-xs text-amber-600 mt-1">
              {operationalHealth?.deadstock?.deadstock_units ?? 0} idle exchange items
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-xs">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Human Capital</h4>
            <h3 className="text-3xl font-black text-slate-900 mt-2">
              {isLoadingOperational ? '...' : operationalHealth?.infrastructure?.total_staff ?? 0}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {operationalHealth?.infrastructure?.managers} Mgrs • {operationalHealth?.infrastructure?.opticians} Opticians • {operationalHealth?.infrastructure?.workers} Workers
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
