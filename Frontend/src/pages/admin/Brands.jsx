import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  Search, Plus, Tag, ChevronRight, Edit2, Trash2, Eye, Loader2, Store, ChevronDown
} from 'lucide-react';
import Pagination from '../../components/shared/Pagination';
import AddEditBrandModal from '../../components/admin/AddEditBrandModal';
import ConfirmationModal from '../../components/shared/ConfirmationModal';
import { useStoreStore } from '../../store/store';
import { useBrands } from '../../hooks/useBrands';
import PermissionGuard from '../../components/shared/PermissionGuard';
import { usePagePermissions } from '../../hooks/usePermissions';
import { useRoleContext } from '../../hooks/useRoleContext';

const ITEMS_PER_PAGE = 8;

const StatusBadge = ({ isActive }) => {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${isActive ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-600 bg-slate-100 border-slate-200'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'} flex-shrink-0`} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
};

const Brands = () => {
  const navigate = useNavigate();
  const { storeId: contextStoreId, buildPath, showStoreSwitcher, isPathAdmin } = useRoleContext();
  const { selectedStore, setSelectedStore, stores } = useStoreStore();
  const [inPageStoreId, setInPageStoreId] = useState(contextStoreId);

  useEffect(() => {
    setInPageStoreId(contextStoreId);
  }, [contextStoreId]);

  // Sync storeId from URL with global store state
  useEffect(() => {
    if (isPathAdmin && contextStoreId && stores.length > 0) {
      const urlStore = stores.find(s => String(s.id) === String(contextStoreId));
      if (urlStore && (!selectedStore || String(selectedStore.id) !== String(contextStoreId))) {
        setSelectedStore(urlStore);
      }
    }
  }, [contextStoreId, stores, selectedStore, setSelectedStore, isPathAdmin]);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeStatusFilter, setActiveStatusFilter] = useState('all');
  const [modalState, setModalState] = useState({ isOpen: false, item: null });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, brandId: null });

  const perms = usePagePermissions({
    canCreate: 'brands:create',
    canUpdate: 'brands:update',
    canDelete: 'brands:delete'
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination on status filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatusFilter]);

  const {
    brands,
    total,
    pages,
    activeCount,
    inactiveCount,
    isLoading,
    isFetching,
    isError,
    createBrandAsync,
    updateBrandAsync,
    deleteBrandAsync,
    isSaving,
  } = useBrands(inPageStoreId, {
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    search: debouncedSearch || undefined,
    active_status: activeStatusFilter !== 'all' ? activeStatusFilter : undefined,
  });

  /* ── Handlers ── */
  const handleSaveBrand = useCallback(async (data) => {
    try {
      if (data.id) {
        await updateBrandAsync({
          id: data.id,
          payload: { name: data.name, is_active: data.is_active },
        });
      } else {
        await createBrandAsync({ name: data.name });
      }
      return true;
    } catch {
      return false;
    }
  }, [createBrandAsync, updateBrandAsync]);

  const handleDelete = useCallback((id) => {
    setConfirmModal({ isOpen: true, brandId: id });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmModal.brandId) return;
    try {
      await deleteBrandAsync(confirmModal.brandId);
    } catch {
      // Error handled by mutation
    }
  }, [confirmModal.brandId, deleteBrandAsync]);

  const handleViewBrandItems = (brandId) => {
    navigate(buildPath(`inventory?brand_id=${brandId}`));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in font-sans">
      {/* ── Breadcrumb + Header ── */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 space-x-2">
          <Link to={buildPath('dashboard')} className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-semibold">Brands</span>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Tag className="w-8 h-8 text-blue-500" />
              Brands Management
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm sm:text-base">
              Manage product brands, tracking active status and inventory associations.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {showStoreSwitcher && (
              <div className="relative">
                <select
                  value={inPageStoreId}
                  onChange={(e) => {
                    setInPageStoreId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-10 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm appearance-none cursor-pointer"
                >
                  <option value="admin">All Store</option>
                  {stores.filter(s => s.id !== 'admin' && s.store_name !== 'All Store' && s.name !== 'All Store').map(s => (
                    <option key={s.id} value={s.id}>{s.store_name}</option>
                  ))}
                </select>
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            )}
            <PermissionGuard permission="brands:create">
              <button
                onClick={() => setModalState({ isOpen: true, item: null })}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex-shrink-0 justify-center animate-fade-in"
              >
                <Plus className="w-4 h-4" />
                Add Brand
              </button>
            </PermissionGuard>
          </div>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <button
          onClick={() => setActiveStatusFilter('all')}
          className={`flex items-center gap-2 px-4 py-2 border rounded-xl shadow-sm cursor-pointer transition-all focus:outline-none ${
            activeStatusFilter === 'all'
              ? 'bg-slate-50 border-slate-400 text-slate-900 font-semibold ring-2 ring-slate-100'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span className="text-2xl font-bold text-slate-900">{activeCount + inactiveCount}</span>
          <span className="text-sm text-slate-500 font-medium">Total Brands</span>
        </button>
        <button
          onClick={() => setActiveStatusFilter('active')}
          className={`flex items-center gap-2 px-4 py-2 border rounded-xl shadow-sm cursor-pointer transition-all focus:outline-none ${
            activeStatusFilter === 'active'
              ? 'bg-emerald-50 border-emerald-400 text-emerald-700 font-semibold ring-2 ring-emerald-100'
              : 'bg-white border-emerald-200/60 text-emerald-600 hover:bg-emerald-50'
          }`}
        >
          <span className="text-2xl font-bold text-emerald-700">{activeCount}</span>
          <span className="text-sm text-emerald-600 font-medium">Active</span>
        </button>
        <button
          onClick={() => setActiveStatusFilter('inactive')}
          className={`flex items-center gap-2 px-4 py-2 border rounded-xl shadow-sm cursor-pointer transition-all focus:outline-none ${
            activeStatusFilter === 'inactive'
              ? 'bg-slate-100 border-slate-400 text-slate-700 font-semibold ring-2 ring-slate-200'
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          <span className="text-2xl font-bold text-slate-600">{inactiveCount}</span>
          <span className="text-sm text-slate-500 font-medium">Inactive</span>
        </button>
      </div>

      {/* ── Search Bar ── */}
      <div className="relative w-full mb-6 group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search brands by name..."
          className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-medium transition-all shadow-sm placeholder:text-slate-400"
        />
      </div>

      {/* ── Results count ── */}
      {debouncedSearch && (
        <p className="text-xs text-slate-500 font-medium mb-4">
          {total} brand{total !== 1 ? 's' : ''} found for "{debouncedSearch}"
        </p>
      )}

      {/* ── Loading / Error / Data ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : isError ? (
        <div className="bg-white border border-dashed border-red-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <h3 className="text-base font-bold text-red-700 mb-1">Failed to load brands</h3>
          <p className="text-red-500 text-sm">Please try refreshing the page.</p>
        </div>
      ) : brands.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <Tag className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No brands found</h3>
          <p className="text-slate-500 text-sm mb-4">Try adjusting your search criteria or add a new brand.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Fetching overlay spinner */}
          {isFetching && !isLoading && (
            <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-2xl">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
            {brands.map(brand => (
              <div key={brand.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-4 sm:p-5 flex flex-col group h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 text-xl flex-shrink-0">
                      {brand.name[0]}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-base truncate">
                        {brand.name}
                      </h3>
                      <div className="text-xs text-slate-500 font-medium mt-0.5 truncate">Added {new Date(brand.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <StatusBadge isActive={brand.is_active} />
                </div>
                
                <div className="flex-1" />

                <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
                  {/* Products count */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm flex flex-col">
                      <span className="text-slate-500 font-medium text-xs">Products in Inventory</span>
                      <span className="font-bold text-slate-900 text-lg">{brand.products_count}</span>
                    </div>
                  </div>

                  {/* Action buttons row */}
                  <div className="flex items-center gap-2">
                    {/* View Inventory Items */}
                    <button
                      onClick={() => handleViewBrandItems(brand.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors border border-blue-100"
                      title={`View all ${brand.name} items in inventory`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Items
                    </button>
                    {/* Edit */}
                    {perms.canUpdate && (
                      <button
                        onClick={() => setModalState({ isOpen: true, item: brand })}
                        className="flex items-center justify-center w-9 h-9 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200"
                        title="Edit brand"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {/* Delete */}
                    {perms.canDelete && (
                      <button
                        onClick={() => handleDelete(brand.id)}
                        className="flex items-center justify-center w-9 h-9 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
                        title="Deactivate brand"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            totalItems={total}
            itemsPerPage={ITEMS_PER_PAGE}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Add/Edit Modal */}
      <AddEditBrandModal
        isOpen={modalState.isOpen}
        item={modalState.item}
        onClose={() => setModalState({ isOpen: false, item: null })}
        onSubmit={handleSaveBrand}
        isSaving={isSaving}
      />

      {/* Confirm Deactivate Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, brandId: null })}
        onConfirm={handleConfirmDelete}
        type="warning"
        title="Deactivate Brand?"
        message="Are you sure you want to deactivate this brand? It will no longer appear as an active brand in inventory."
        confirmText="Deactivate"
        cancelText="Cancel"
      />
    </div>
  );
};

export default Brands;
