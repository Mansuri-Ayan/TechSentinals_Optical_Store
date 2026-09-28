import { Link } from 'react-router-dom';
import {
  Shield, Building2, Store, Users, IndianRupee, ShoppingBag,
  TrendingUp, ArrowUpRight, CheckCircle2, AlertTriangle, KeyRound,
  BarChart3, Activity, Layers, Clock, Eye
} from 'lucide-react';
import { useSuperAdminDashboard } from '../../hooks/useSuperAdmin';

export default function SuperAdminDashboard() {
  const { stats, isLoadingStats, recentActivity, isLoadingActivity } = useSuperAdminDashboard();

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="space-y-8">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#0B132B] via-slate-900 to-[#1C2541] text-white p-6 sm:p-8 rounded-3xl shadow-md border border-slate-800">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Platform Command Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Executive Operations Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Real-time multi-tenant monitoring, platform-wide gross merchandise volume, retail branches, and operational telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/super-admin/analytics"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md hover:shadow-emerald-600/20 cursor-pointer"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Platform Analytics Hub</span>
          </Link>
          <Link
            to="/super-admin/admins"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/10 text-xs font-bold transition-all cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
            <span>Manage Tenants</span>
          </Link>
        </div>
      </div>

      {/* ── KPI Metric Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Total Businesses */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tenants (Admins)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900">
            {isLoadingStats ? '...' : stats?.tenants?.total ?? 0}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
            <span className="text-emerald-600 font-bold">{stats?.tenants?.active ?? 0} Active</span>
            <span>•</span>
            <span className="text-amber-600 font-bold">{stats?.tenants?.suspended ?? 0} Suspended</span>
          </p>
        </div>

        {/* Card 2: Active Stores */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Retail Branches</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900">
            {isLoadingStats ? '...' : stats?.stores?.active ?? 0}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Across {stats?.stores?.total ?? 0} physical store branches
          </p>
        </div>

        {/* Card 3: Platform GMV */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Platform GMV</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-emerald-600">
            {isLoadingStats ? '...' : formatCurrency(stats?.economics?.gmv)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            30-day cross-tenant sales volume
          </p>
        </div>

        {/* Card 4: Orders & Invoices */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Invoices</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900">
            {isLoadingStats ? '...' : stats?.economics?.invoices ?? 0}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            AOV: <span className="font-bold text-slate-700">{formatCurrency(stats?.economics?.aov)}</span>
          </p>
        </div>

        {/* Card 5: Total Staff */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Staff Users</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900">
            {isLoadingStats ? '...' : stats?.staff?.total ?? 0}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Managers, Opticians, Workers
          </p>
        </div>

        {/* Card 6: Stock Valuation */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Stock Valuation</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900">
            {isLoadingStats ? '...' : formatCurrency(stats?.inventory?.total_valuation)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            {stats?.inventory?.total_units?.toLocaleString() ?? 0} items in stock
          </p>
        </div>
      </div>

      {/* ── Quick Navigation Shortcuts ────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          to="/super-admin/analytics"
          className="bg-white p-4 rounded-2xl border border-slate-200/60 hover:border-emerald-400 hover:shadow-md transition-all group flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Platform Analytics</h4>
            <p className="text-[11px] text-slate-400">GMV, Geo & Churn</p>
          </div>
        </Link>

        <Link
          to="/super-admin/admins"
          className="bg-white p-4 rounded-2xl border border-slate-200/60 hover:border-emerald-400 hover:shadow-md transition-all group flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Tenant 360°</h4>
            <p className="text-[11px] text-slate-400">Manage businesses</p>
          </div>
        </Link>

        <Link
          to="/super-admin/stores"
          className="bg-white p-4 rounded-2xl border border-slate-200/60 hover:border-emerald-400 hover:shadow-md transition-all group flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Store Directory</h4>
            <p className="text-[11px] text-slate-400">Cross-tenant branches</p>
          </div>
        </Link>

        <Link
          to="/super-admin/permissions"
          className="bg-white p-4 rounded-2xl border border-slate-200/60 hover:border-emerald-400 hover:shadow-md transition-all group flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Global Permissions</h4>
            <p className="text-[11px] text-slate-400">Tier 1 templates</p>
          </div>
        </Link>
      </div>

      {/* ── Dual Activity Panels ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Recent Tenant Onboardings */}
        <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Recent Tenant Onboardings</h3>
                  <p className="text-[11px] text-slate-400">Newly registered optical businesses</p>
                </div>
              </div>
              <Link
                to="/super-admin/admins"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoadingActivity ? (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                Loading tenant activity...
              </div>
            ) : recentActivity?.recent_tenants?.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recentActivity.recent_tenants.map((tenant) => (
                  <div key={tenant.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900 truncate">{tenant.business_name}</p>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                            tenant.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {tenant.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {tenant.owner_name} • {tenant.city || 'India'}
                      </p>
                    </div>

                    <Link
                      to={`/super-admin/admins/${tenant.id}`}
                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                      title="Inspect 360°"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                No tenants registered yet.
              </div>
            )}
          </div>
        </div>

        {/* Panel 2: Recent Completed Sales Across Platform */}
        <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Recent Completed Orders</h3>
                  <p className="text-[11px] text-slate-400">Live transactions across all stores</p>
                </div>
              </div>
              <Link
                to="/super-admin/analytics"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Analytics</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoadingActivity ? (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                Loading sales telemetry...
              </div>
            ) : recentActivity?.recent_sales?.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recentActivity.recent_sales.map((sale) => (
                  <div key={sale.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900">{sale.invoice_number}</p>
                        <span className="text-[10px] text-slate-400 font-medium">({sale.store_name})</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {sale.business_name} • {sale.customer_name}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-extrabold text-emerald-600">
                        {formatCurrency(sale.total_amount)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Completed</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                No orders recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
