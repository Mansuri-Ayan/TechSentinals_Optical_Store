import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store, Search, Plus, ChevronRight, Edit2, Trash2,
  Users, IndianRupee, MapPin, Phone, Filter, X as XIcon, CheckCircle, AlertCircle
} from 'lucide-react';
import { useStores } from '../../hooks/useStores';
import { useStoreStore } from '../../store/store';
import AddStoreModal from '../../components/admin/AddStoreModal';
import Pagination from '../../components/shared/Pagination';
import PermissionGuard from '../../components/shared/PermissionGuard';

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi',
  'Jammu & Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

const Stores = () => {
  const navigate = useNavigate();
  const { setSelectedStore } = useStoreStore();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [stateFilter, setStateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [storeToEdit, setStoreToEdit] = useState(null);
  const [storeToDelete, setStoreToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filters = useMemo(() => ({
    page,
    limit: 10,
    ...(search && { search }),
    ...(statusFilter !== 'All' && { status: statusFilter.toUpperCase() }),
    ...(stateFilter && { state: stateFilter })
  }), [page, search, statusFilter, stateFilter]);

  const { stores, total, pages, isLoadingStores, isStoresError, deleteStoreAsync } = useStores(filters);
  
  // Unfiltered call for Total Stores count
  const { total: overallTotal } = useStores({ paginate: false });
  // Active branches call
  const { total: activeTotal } = useStores({ status: 'ACTIVE', paginate: false });

  const handleAddClick = () => {
    setStoreToEdit(null);
    setShowModal(true);
  };

  const handleEditClick = (e, store) => {
    e.stopPropagation();
    setStoreToEdit(store);
    setShowModal(true);
  };

  const handleDeleteClick = (e, store) => {
    e.stopPropagation();
    setStoreToDelete(store);
  };

  const confirmDelete = async () => {
    if (!storeToDelete) return;
    setIsDeleting(true);
    try {
      await deleteStoreAsync(storeToDelete.id);
      setStoreToDelete(null);
    } catch {
      // Toast feedback handled by useStores mutation
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRowClick = (store) => {
    setSelectedStore(store);
    navigate(`/admin/stores/${store.id}`);
  };

  // KPIs
  const kpiData = useMemo(() => {
    let totalRevenueVal = 0;
    let totalStaffVal = 0;

    stores.forEach(s => {
      totalStaffVal += (s.staff_count || 0);
      totalRevenueVal += (s.revenue_generated || 0);
    });

    const formatRupee = (num) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(num);
    };

    return {
      total: overallTotal,
      active: activeTotal,
      revenue: formatRupee(totalRevenueVal),
      staff: totalStaffVal
    };
  }, [stores, overallTotal, activeTotal]);

  const hasFilters = search || statusFilter !== 'All' || stateFilter;

  const handleClearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('All');
    setStateFilter('');
    setPage(1);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">
      
      {/* ── Breadcrumb + Header ── */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 space-x-2">
          <Link to="/admin/dashboard" className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-semibold">Stores</span>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Store className="w-8 h-8 text-blue-500" />
              Stores Directory
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm sm:text-base">
              Manage optical store branches, managers, staff rosters, inventory distribution, and sales.
            </p>
          </div>
          <PermissionGuard permission="stores:create">
            <button
              onClick={handleAddClick}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex-shrink-0 w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              Add Store
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          { label: 'Total Stores', value: kpiData.total, color: 'text-slate-700 bg-slate-50 border-slate-200', icon: Store },
          { label: 'Active Branches', value: kpiData.active, color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle },
          { label: 'Estimated Revenue', value: kpiData.revenue, color: 'text-blue-700 bg-blue-50 border-blue-200', icon: IndianRupee },
          { label: 'Total Store Staff', value: kpiData.staff, color: 'text-purple-700 bg-purple-50 border-purple-200', icon: Users },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className={`flex items-center gap-4 p-4 sm:p-5 rounded-2xl border shadow-sm ${kpi.color}`}>
              <div className="p-2.5 rounded-xl bg-white/60 flex-shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold opacity-70">{kpi.label}</p>
                <p className="text-xl sm:text-2xl font-bold">{kpi.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Search + Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search stores by name, code or city..."
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-medium transition-all shadow-sm placeholder:text-slate-400"
          />
          {searchInput && (
            <button onClick={() => { setSearchInput(''); setSearch(''); }}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors">
              <XIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Toggle filters button */}
        <button
          onClick={() => setShowFilters(p => !p)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all flex-shrink-0 ${showFilters || statusFilter !== 'All' || stateFilter
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {(statusFilter !== 'All' || stateFilter) && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          )}
        </button>
      </div>

      {/* ── Expandable Filter Row ── */}
      {showFilters && (
        <div className="flex flex-wrap gap-4 mb-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm animate-fade-in">
          <div className="flex-1 min-w-[160px]">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Store Status</label>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white text-slate-700 transition-all"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">State</label>
            <select
              value={stateFilter}
              onChange={e => { setStateFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white text-slate-700 transition-all"
            >
              <option value="">All States</option>
              {indianStates.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
          {hasFilters && (
            <div className="flex items-end">
              <button onClick={handleClearFilters}
                className="px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors flex items-center gap-1.5 h-[38px]">
                <XIcon className="w-3.5 h-3.5" />
                Clear All
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Store Listing Table ── */}
      {isLoadingStores ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-500 font-semibold shadow-sm">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          Loading stores...
        </div>
      ) : isStoresError ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-12 text-center text-red-700 font-semibold">
          Unable to load stores list. Please check your backend connection.
        </div>
      ) : stores.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <Store className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No stores found</h3>
          <p className="text-slate-500 text-sm mb-4">Try adjusting your filters or create a new store.</p>
          {hasFilters && (
            <button onClick={handleClearFilters} className="text-blue-600 font-semibold hover:text-blue-700 transition-colors text-sm">
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Store Details', 'Store Code', 'Location', 'Contact', 'Staff Count', 'Est. Revenue', 'Status', 'Actions'].map(col => (
                    <th key={col} className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stores.map(store => {
                  const name = store.store_name || store.name;
                  const code = store.store_code || store.code;
                  const formatRupee = (num) => {
                    return new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0
                    }).format(num);
                  };
                  
                  return (
                    <tr
                      key={store.id}
                      onClick={() => handleRowClick(store)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-900 flex items-center justify-center text-white font-black text-base shadow-sm">
                            {name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-950 group-hover:text-blue-600 transition-colors">{name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{store.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Store Code */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                          {code}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{store.city}, {store.state}</span>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                          <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{store.phone}</span>
                        </div>
                      </td>

                      {/* Staff */}
                      <td className="px-6 py-4 whitespace-nowrap text-slate-700 font-bold">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-purple-500" />
                          <span>{store.staff_count || 0}</span>
                        </div>
                      </td>

                      {/* Revenue */}
                      <td className="px-6 py-4 whitespace-nowrap text-slate-900 font-extrabold">
                        {formatRupee(store.revenue_generated || 0)}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          store.is_active
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : 'text-slate-600 bg-slate-100 border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${store.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {store.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleRowClick(store)}
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition-all"
                            title="View dashboard"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <PermissionGuard permission="stores:update">
                            <button
                              onClick={(e) => handleEditClick(e, store)}
                              className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-100 rounded-xl transition-all"
                              title="Edit branch"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </PermissionGuard>
                          <PermissionGuard permission="stores:delete">
                            <button
                              onClick={(e) => handleDeleteClick(e, store)}
                              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all"
                              title="Delete branch"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </PermissionGuard>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {pages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <Pagination
                totalItems={total}
                itemsPerPage={10}
                currentPage={page}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Modal Components ── */}
      <AddStoreModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        storeToEdit={storeToEdit}
      />

      {/* ── Delete Confirmation Modal ── */}
      {storeToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 p-6">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-lg font-bold text-slate-900">Delete Store Branch</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-950">{storeToDelete.store_name || storeToDelete.name}</span>? This action is permanent and will delete all associated data rosters and configuration links.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setStoreToDelete(null)}
                className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-colors flex items-center gap-2"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Store'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stores;
