import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive,
  Search,
  RefreshCw,
  Glasses,
  Eye,
  Package,
  Layers,
  ChevronRight,
  Store,
  X,
  RotateCcw,
  Check,
  ShoppingBag,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useDeadstock, useReuseDeadstock, useBatchReuseDeadstock } from '../../hooks/useDeadstock';
import { useAuthStore, useStoreStore } from '../../store/store';
import { useRoleContext } from '../../hooks/useRoleContext';
import { useStores } from '../../hooks/useStores';
import PermissionGuard from '../../components/shared/PermissionGuard';
import Pagination from '../../components/shared/Pagination';
import { usePagePermissions } from '../../hooks/usePermissions';


const categoryConfig = {
  Frames: { icon: Glasses, color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  Lenses: { icon: Eye, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  Accessories: { icon: Package, color: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  Other: { icon: Layers, color: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-500' },
};

const statusBadges = {
  AVAILABLE: { label: 'Available', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  REUSED: { label: 'Reused (In Stock)', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  SOLD: { label: 'Sold via POS', color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
};

const Deadstock = () => {
  const { user } = useAuthStore();
  const { selectedStore } = useStoreStore();
  const { storeId, buildPath, showStoreSwitcher, isPathAdmin } = useRoleContext();
  const { stores } = useStores();
  const perms = usePagePermissions('deadstock');
  const canUpdate = perms.canUpdate ?? true;


  const [selectedBranch, setSelectedBranch] = useState(storeId || 'All');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeStatus, setActiveStatus] = useState('All');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [groupByItem, setGroupByItem] = useState(true);
  const [reuseModalItem, setReuseModalItem] = useState(null);
  const [batchReuseGroup, setBatchReuseGroup] = useState(null);

  useEffect(() => {
    if (isPathAdmin && selectedStore && selectedStore.id !== 'admin') {
      setSelectedBranch(selectedStore.id);
    }
  }, [selectedStore, isPathAdmin]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBranch, activeCategory, activeStatus, searchTerm]);

  const effectiveStoreId = useMemo(() => {
    if (isPathAdmin) {
      return selectedBranch === 'All' ? undefined : selectedBranch;
    }
    return user?.store_id || selectedStore?.id || 'admin';
  }, [isPathAdmin, selectedBranch, user?.store_id, selectedStore?.id]);

  const queryParams = useMemo(() => {
    const params = { page: currentPage, limit: 10 };
    if (effectiveStoreId) params.store_id = effectiveStoreId;
    if (activeCategory !== 'All') params.category = activeCategory;
    if (activeStatus !== 'All') params.status = activeStatus;
    if (searchTerm.trim()) params.search = searchTerm.trim();
    return params;
  }, [effectiveStoreId, activeCategory, activeStatus, searchTerm, currentPage]);

  const { data, isLoading, isRefetching, refetch } = useDeadstock(queryParams);
  const reuseMutation = useReuseDeadstock();
  const batchReuseMutation = useBatchReuseDeadstock();

  const items = data?.items || [];
  const total = data?.total || 0;
  const counts = data?.counts || {
    frames_count: 0,
    lenses_count: 0,
    accessories_count: 0,
    other_count: 0,
    total_count: 0,
  };

  const groupedItems = useMemo(() => {
    if (!groupByItem) return [];
    const groups = {};
    items.forEach((item) => {
      const key = item.product_id ? `p-${item.product_id}` : `sku-${item.sku}-${item.category_name}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          product_id: item.product_id,
          product_name: item.product_name || item.sku || 'Unassigned Product',
          category_name: item.category_name,
          brand_name: item.brand_name || 'Generic',
          sku: item.sku,
          store_name: item.store_name,
          total_quantity: 0,
          available_quantity: 0,
          total_value: 0,
          item_ids: [],
          available_item_ids: [],
          items: [],
        };
      }
      groups[key].total_quantity += Number(item.quantity || 1);
      groups[key].total_value += Number(item.original_price || 0) * Number(item.quantity || 1);
      groups[key].item_ids.push(item.id);
      groups[key].items.push(item);
      if (item.status === 'AVAILABLE') {
        groups[key].available_quantity += Number(item.quantity || 1);
        groups[key].available_item_ids.push(item.id);
      }
    });
    return Object.values(groups);
  }, [items, groupByItem]);

  const handleConfirmReuse = () => {
    if (!reuseModalItem) return;
    reuseMutation.mutate(reuseModalItem.id, {
      onSuccess: () => {
        toast.success(`Item ${reuseModalItem.sku} successfully restored to active inventory.`);
        setReuseModalItem(null);
        refetch();
      },
      onError: (err) => {
        toast.error(err.response?.data?.detail || "Failed to restore deadstock item.");
      }
    });
  };

  const handleConfirmBatchReuse = () => {
    if (!batchReuseGroup || batchReuseGroup.available_item_ids.length === 0) return;
    batchReuseMutation.mutate(batchReuseGroup.available_item_ids, {
      onSuccess: (res) => {
        toast.success(res.message || `Successfully restored ${batchReuseGroup.available_quantity} units of ${batchReuseGroup.product_name} to active inventory.`);
        setBatchReuseGroup(null);
        refetch();
      },
      onError: (err) => {
        toast.error(err.response?.data?.detail || "Failed to restore deadstock product quantity.");
      }
    });
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <PermissionGuard permission="deadstock:read" fallback={
      <div className="p-8 text-center text-slate-500 font-sans">
        You do not have permission to view deadstock inventory.
      </div>
    }>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 font-sans animate-fade-in overflow-x-hidden">
        {/* ── Breadcrumbs + Page Header ── */}
        <div>
          <div className="flex items-center text-sm text-slate-500 font-medium mb-3 space-x-2">
            <Link to={buildPath('dashboard')} className="hover:text-slate-800 transition-colors">Dashboard</Link>
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
            <span className="text-slate-900 font-semibold">Deadstock</span>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight flex items-center gap-2.5">
                <Archive className="w-8 h-8 text-amber-500" />
                Deadstock Inventory
              </h1>
              <p className="text-slate-500 mt-1 text-xs sm:text-sm font-medium">
                Track returned exchange items, move frames & accessories back to active stock, or reuse lenses in POS checkout.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm cursor-pointer font-semibold text-xs"
                title="Refresh list"
                type="button"
              >
                <RefreshCw className={`w-4 h-4 text-slate-500 ${isRefetching ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── KPI Summary Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 text-amber-600">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Deadstock</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{counts.total_count}</p>
            </div>
          </div>

          <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">
              <Glasses className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Frames</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{counts.frames_count}</p>
            </div>
          </div>

          <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lenses</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{counts.lenses_count}</p>
            </div>
          </div>

          <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0 text-purple-600">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Accessories</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{counts.accessories_count}</p>
            </div>
          </div>
        </div>

        {/* ── Filters Bar ── */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {showStoreSwitcher && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-600 flex items-center gap-1.5 whitespace-nowrap">
                    <Store className="w-4 h-4 text-slate-400" /> Branch:
                  </label>
                  <div className="relative w-full sm:w-48">
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white appearance-none pr-8 cursor-pointer"
                    >
                      <option value="All">All Branches</option>
                      {stores.filter(s => s.id !== 'admin' && s.store_name !== 'All Store' && s.name !== 'All Store').map(store => (
                        <option key={store.id} value={store.id}>{store.store_name}</option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
                  </div>
                </div>
              )}

              {/* Group By Item Toggle & Status Filter */}
              <div className="flex items-center gap-2 sm:ml-2">
                <button
                  type="button"
                  onClick={() => setGroupByItem(!groupByItem)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                    groupByItem
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  {groupByItem ? 'Grouped by Product' : 'Individual Units'}
                </button>

                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Status:</span>
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100 text-xs font-bold">
                  {['All', 'AVAILABLE', 'REUSED', 'SOLD'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setActiveStatus(st)}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        activeStatus === st
                          ? 'bg-white text-slate-900 shadow-sm font-extrabold border border-slate-200'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      type="button"
                    >
                      {st === 'All' ? 'All' : st === 'AVAILABLE' ? 'Available' : st === 'REUSED' ? 'Reused' : 'Sold'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search SKU, product name, or invoice..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-9 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white transition-all placeholder:text-slate-400 shadow-sm"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  type="button"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar border-t border-slate-100 pt-3 text-xs">
            {['All', 'Frames', 'Lenses', 'Accessories'].map((cat) => {
              const isActive = activeCategory === cat;
              const catConfig = categoryConfig[cat] || categoryConfig.Other;
              const Icon = catConfig.icon || Layers;
              const badgeCount =
                cat === 'All'
                  ? counts.total_count
                  : cat === 'Frames'
                  ? counts.frames_count
                  : cat === 'Lenses'
                  ? counts.lenses_count
                  : counts.accessories_count;

              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold border transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                  type="button"
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{cat}</span>
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {badgeCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Table & Content List ── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mb-3"></div>
            <p className="text-slate-500 text-sm font-semibold">Loading deadstock inventory...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-center mb-4 text-amber-500">
              <Archive className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No deadstock items found</h3>
            <p className="text-slate-500 text-sm max-w-sm">
              Exchanged items automatically appear here. Try adjusting your filters or search keywords.
            </p>
          </div>
        ) : groupByItem ? (
          /* GROUPED BY PRODUCT VIEW */
          <div className="space-y-4">
            <div className="hidden lg:block border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-4">Product Details</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4 text-center">Total Deadstock Qty</th>
                    <th className="px-5 py-4 text-center">Available Qty</th>
                    <th className="px-5 py-4 text-right">Total Valuation</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {groupedItems.map((group) => {
                    const catCfg = categoryConfig[group.category_name] || categoryConfig.Other;
                    const CatIcon = catCfg.icon;
                    const canReuseGroup = group.available_quantity > 0 && canUpdate;

                    return (
                      <tr key={group.key} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-extrabold text-xs shadow-sm flex-shrink-0">
                              {group.product_name[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors truncate max-w-[240px]">
                                {group.product_name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 font-bold">
                                  SKU: {group.sku}
                                </span>
                                {group.brand_name && (
                                  <span className="text-[10px] text-slate-400 font-semibold truncate">
                                    {group.brand_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${catCfg.color}`}>
                            <CatIcon className="w-3.5 h-3.5" />
                            {group.category_name}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center font-extrabold text-slate-800 text-base">
                          <span className="bg-slate-100 px-3 py-1 rounded-full text-slate-900 border border-slate-200">
                            {group.total_quantity} units
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center font-extrabold">
                          {group.available_quantity > 0 ? (
                            <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200">
                              {group.available_quantity} available
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
                              0 available
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-mono font-bold text-slate-900">
                          {fmt(group.total_value)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          {canReuseGroup ? (
                            <button
                              onClick={() => setBatchReuseGroup(group)}
                              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ml-auto cursor-pointer"
                              type="button"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Restore {group.available_quantity} {group.available_quantity === 1 ? 'Unit' : 'Units'} to Stock
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-semibold italic">Reused / Sold</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Group Cards */}
            <div className="lg:hidden space-y-3">
              {groupedItems.map((group) => {
                const catCfg = categoryConfig[group.category_name] || categoryConfig.Other;
                const CatIcon = catCfg.icon;
                const canReuseGroup = group.available_quantity > 0 && canUpdate;

                return (
                  <div key={group.key} className="bg-white p-4 border border-slate-100 rounded-2xl shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          SKU: {group.sku}
                        </span>
                        <h3 className="font-bold text-slate-900 text-sm mt-1">{group.product_name}</h3>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${catCfg.color}`}>
                        <CatIcon className="w-3 h-3" />
                        {group.category_name}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px]">Total Quantity</span>
                        <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">{group.total_quantity} Units</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px]">Total Value</span>
                        <span className="font-bold text-slate-900 font-mono mt-0.5 block">{fmt(group.total_value)}</span>
                      </div>
                    </div>

                    {canReuseGroup && (
                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          onClick={() => setBatchReuseGroup(group)}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                          type="button"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore {group.available_quantity} Units to Active Inventory
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Pagination
              totalItems={total}
              itemsPerPage={10}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        ) : (
          /* INDIVIDUAL UNITS VIEW */
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden lg:block border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-4">Item Details</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">Exchange Ref</th>
                    <th className="px-5 py-4">Origin Status</th>
                    <th className="px-5 py-4 text-right">Original Value</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((item) => {
                    const catCfg = categoryConfig[item.category_name] || categoryConfig.Other;
                    const CatIcon = catCfg.icon;
                    const stBadge = statusBadges[item.status] || statusBadges.AVAILABLE;
                    const canReuse = item.status === 'AVAILABLE' && canUpdate;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors group">
                        {/* Details */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-extrabold text-xs shadow-sm flex-shrink-0">
                              {item.product_name ? item.product_name[0] : 'D'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors truncate max-w-[220px]">
                                {item.product_name || 'Exchanged Item'}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 font-bold">
                                  SKU: {item.sku}
                                </span>
                                {item.brand_name && (
                                  <span className="text-[10px] text-slate-400 font-semibold truncate">
                                    {item.brand_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${catCfg.color}`}>
                            <CatIcon className="w-3.5 h-3.5" />
                            {item.category_name}
                          </span>
                        </td>

                        {/* Exchange Ref */}
                        <td className="px-5 py-4 font-mono text-xs font-bold text-slate-700">
                          <div>
                            <span className="text-indigo-600">{item.exchange_number || 'EXC-—'}</span>
                            {item.original_invoice_number && (
                              <p className="text-[10px] text-slate-400 font-normal">From {item.original_invoice_number}</p>
                            )}
                          </div>
                        </td>

                        {/* Origin Status */}
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Currently Exchanged
                          </span>
                        </td>

                        {/* Price */}
                        <td className="px-5 py-4 text-right font-mono font-bold text-slate-900">
                          {fmt(item.original_price)}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${stBadge.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${stBadge.dot}`} />
                            {stBadge.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          {canReuse ? (
                            <button
                              onClick={() => setReuseModalItem(item)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ml-auto cursor-pointer"
                              type="button"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Reuse Item
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-semibold italic">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {items.map((item) => {
                const catCfg = categoryConfig[item.category_name] || categoryConfig.Other;
                const CatIcon = catCfg.icon;
                const stBadge = statusBadges[item.status] || statusBadges.AVAILABLE;
                const canReuse = item.status === 'AVAILABLE' && canUpdate;

                return (
                  <div key={item.id} className="bg-white p-4 border border-slate-100 rounded-2xl shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          SKU: {item.sku}
                        </span>
                        <h3 className="font-bold text-slate-900 text-sm mt-1">{item.product_name || 'Exchanged Item'}</h3>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${stBadge.color}`}>
                        <span className={`w-1 h-1 rounded-full ${stBadge.dot}`} />
                        {stBadge.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px]">Category</span>
                        <span className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold border ${catCfg.color}`}>
                          <CatIcon className="w-3 h-3" />
                          {item.category_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px]">Item Value</span>
                        <span className="font-bold text-slate-900 font-mono mt-0.5 block">{fmt(item.original_price)}</span>
                      </div>
                    </div>

                    {canReuse && (
                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          onClick={() => setReuseModalItem(item)}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                          type="button"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reuse Item to Inventory
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination Component */}
            <Pagination
              totalItems={total}
              itemsPerPage={10}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        {/* ── Batch Reuse Modal Confirmation ── */}
        {batchReuseGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1200] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
              <div className="p-6 space-y-4 text-center">
                <div className="w-14 h-14 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center mx-auto text-amber-600 shadow-inner">
                  <RotateCcw className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Restore Product Quantity to Active Stock?</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    This action will restore <span className="font-extrabold text-slate-800">{batchReuseGroup.available_quantity} {batchReuseGroup.available_quantity === 1 ? 'unit' : 'units'}</span> of <span className="font-extrabold text-slate-800">{batchReuseGroup.product_name}</span> back into active inventory and increase store stock quantity by <span className="font-bold text-emerald-600">+{batchReuseGroup.available_quantity}</span>.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-left text-xs font-medium space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Product:</span>
                    <span className="font-bold text-slate-800">{batchReuseGroup.product_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Category:</span>
                    <span className="font-semibold text-slate-700">{batchReuseGroup.category_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">SKU Code:</span>
                    <span className="font-mono font-bold text-slate-800">{batchReuseGroup.sku}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Restored Quantity:</span>
                    <span className="font-bold text-emerald-600">+{batchReuseGroup.available_quantity} units</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setBatchReuseGroup(null)}
                    disabled={batchReuseMutation.isPending}
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmBatchReuse}
                    disabled={batchReuseMutation.isPending}
                    className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {batchReuseMutation.isPending ? (
                      <span>Restoring Stock...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Restore {batchReuseGroup.available_quantity} Units
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Reuse Single Item Modal Confirmation ── */}
        {reuseModalItem && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1200] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
              <div className="p-6 space-y-4 text-center">
                <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center mx-auto text-blue-600 shadow-inner">
                  <RotateCcw className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Reuse Exchanged Item?</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    This action will move <span className="font-extrabold text-slate-800">{reuseModalItem.product_name || reuseModalItem.sku}</span> back into active store inventory and increase existing stock by 1 unit.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-left text-xs font-medium space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Category:</span>
                    <span className="font-semibold text-slate-700">{reuseModalItem.category_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">SKU Code:</span>
                    <span className="font-mono font-bold text-slate-800">{reuseModalItem.sku}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Item Value:</span>
                    <span className="font-mono font-bold text-slate-900">{fmt(reuseModalItem.original_price)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReuseModalItem(null)}
                    disabled={reuseMutation.isPending}
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReuse}
                    disabled={reuseMutation.isPending}
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {reuseMutation.isPending ? (
                      <span>Moving to Stock...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Confirm & Move to Stock
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
};

export default Deadstock;
