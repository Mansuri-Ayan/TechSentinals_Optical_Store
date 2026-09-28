import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store, Search, Building2, MapPin, Phone, Mail,
  Calendar, Loader2, ArrowRight, CheckCircle2, XCircle,
  TrendingUp, ShoppingBag, Eye
} from 'lucide-react';
import { useSuperAdminStores } from '../../hooks/useSuperAdmin';

export default function SuperAdminStores() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const {
    stores,
    total,
    pages,
    isLoading,
    toggleStatusAsync,
    isToggling,
  } = useSuperAdminStores({
    page: currentPage,
    limit: 12,
    search: searchTerm || undefined,
    status_filter: statusFilter || undefined,
  });

  const handleToggleStatus = async (store) => {
    try {
      await toggleStatusAsync({
        storeId: store.id,
        isActive: !store.is_active,
      });
    } catch (err) {}
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Store className="w-8 h-8 text-emerald-600" />
            Stores Directory
          </h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm">
            Cross-tenant repository of all retail branches, outlets, and flagship optical stores.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-slate-700 shadow-2xs">
            Total Stores: <span className="text-emerald-600 font-extrabold">{total}</span>
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4.5 w-4.5 text-slate-400" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Search by store name, branch code, business owner, city or state..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 text-slate-900 rounded-xl text-xs font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-2xs"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="px-4 py-2.5 bg-white border border-slate-200/80 text-slate-900 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 cursor-pointer shadow-2xs"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active Stores Only</option>
          <option value="INACTIVE">Inactive Stores Only</option>
        </select>
      </div>

      {/* Stores Content */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20 bg-white border border-slate-200/60 rounded-3xl shadow-2xs">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : stores.length === 0 ? (
        <div className="bg-white border border-slate-200/60 rounded-3xl p-12 text-center flex flex-col items-center shadow-2xs">
          <Store className="w-12 h-12 text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-900 mb-1">No store branches match your query</h3>
          <p className="text-slate-500 text-xs">Try resetting your filters or modifying search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {stores.map((store) => (
            <div
              key={store.id}
              className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div className="space-y-4">
                {/* Header: Name + Code + Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-extrabold text-slate-900 truncate">
                        {store.store_name}
                      </h3>
                      {store.is_main_store && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          Main
                        </span>
                      )}
                    </div>
                    <span className="inline-block font-mono text-[10px] font-bold text-slate-500 mt-0.5">
                      Code: {store.store_code}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                      store.is_active
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : 'text-slate-600 bg-slate-100 border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        store.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    {store.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                {/* Tenant Association Pill */}
                <button
                  onClick={() => navigate(`/super-admin/admins/${store.admin_id}`)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200/60 w-full transition-colors text-left cursor-pointer"
                  title="View Tenant 360° Profile"
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate flex-1">{store.business_name}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Location & Contact Details */}
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-slate-600 truncate">
                      {store.city || 'N/A'}, {store.state || 'N/A'}
                    </span>
                  </div>
                  {store.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-600 truncate">{store.phone}</span>
                    </div>
                  )}
                  {store.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-600 truncate">{store.email}</span>
                    </div>
                  )}
                </div>

                {/* Metrics Mini-Row */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">GMV</span>
                    <span className="text-xs font-extrabold text-slate-900 mt-0.5 block">
                      ₹{(store.revenue || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Completed</span>
                    <span className="text-xs font-extrabold text-slate-900 mt-0.5 block">
                      {store.orders_count || 0} orders
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => navigate(`/super-admin/admins/${store.admin_id}`)}
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Tenant 360°</span>
                </button>

                <button
                  onClick={() => handleToggleStatus(store)}
                  disabled={isToggling}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                    store.is_active
                      ? 'bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 border-slate-200 hover:border-red-200'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {store.is_active ? 'Deactivate Store' : 'Activate Store'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Page {currentPage} of {pages}</span>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-semibold disabled:opacity-40 transition-all cursor-pointer shadow-2xs"
            >
              Prev
            </button>
            <button
              disabled={currentPage === pages}
              onClick={() => setCurrentPage(prev => Math.min(pages, prev + 1))}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-semibold disabled:opacity-40 transition-all cursor-pointer shadow-2xs"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
