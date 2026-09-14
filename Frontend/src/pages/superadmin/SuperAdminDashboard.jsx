import { useSuperAdmin } from '../../hooks/useSuperAdmin';
import { Users, CheckCircle2, AlertTriangle, Shield, Building2, Store } from 'lucide-react';

export default function SuperAdminDashboard() {
  const { total, admins, isLoading } = useSuperAdmin({ limit: 100 });

  const activeCount = admins.filter(a => a.status === 'ACTIVE').length;
  const suspendedCount = admins.filter(a => a.status === 'SUSPENDED').length;
  const inactiveCount = admins.filter(a => a.status === 'INACTIVE').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Shield className="w-8 h-8 text-emerald-600" />
          System Dashboard
        </h1>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">
          System Overview of Registered Retail Businesses and Tenant Stores.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Admins */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Businesses</span>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{isLoading ? '...' : total}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/50">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Active Admins */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Tenants</span>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{isLoading ? '...' : activeCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/50">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Suspended Admins */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Suspended Tenants</span>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{isLoading ? '...' : suspendedCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100/50">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Inactive Admins */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inactive Tenants</span>
            <h3 className="text-2xl font-bold text-slate-600 mt-1">{isLoading ? '...' : inactiveCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-650 flex items-center justify-center border border-slate-200/30">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="bg-white border border-slate-200/60 rounded-3xl p-6 sm:p-8 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">System Activity Summary</h3>
        <div className="text-slate-600 text-sm space-y-4 leading-relaxed">
          <p>
            Welcome to the System Admin control center. Here you can onboard new multi-store optical brands, audit tenant subscriptions, and view globally generated revenue.
          </p>
          <div className="p-4 bg-emerald-50/50 border border-emerald-100 text-emerald-800 rounded-2xl flex gap-3 items-center text-xs">
            <Store className="w-5 h-5 text-emerald-600" />
            <span>Use the <strong>Businesses</strong> sidebar menu to create, update, delete, or suspend admin tenants.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
