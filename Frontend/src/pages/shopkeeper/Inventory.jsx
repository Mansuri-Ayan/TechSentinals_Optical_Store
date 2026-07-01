import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Package, ChevronRight, Eye, AlertTriangle,
  CheckCircle, XCircle, Glasses, ShoppingBag, X as XIcon, Info, ChevronDown, Loader2,
  Store, ArrowRightLeft
} from 'lucide-react';
import { useAuthStore, useStoreStore } from '../../store/store';
import { useInventory } from '../../hooks/useInventory';
import { useCategories, useSubcategories } from '../../hooks/useCategories';
import NotificationBell from '../../components/shared/NotificationBell';
import Pagination from '../../components/shared/Pagination';
import { useStores } from '../../hooks/useStores';
import PermissionGuard from '../../components/shared/PermissionGuard';

const getCategoryConfig = (name) => {
  const normalized = (name || '').toLowerCase();
  if (normalized.includes('frame')) {
    return {
      icon: Glasses,
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      activeTab: 'bg-blue-600 text-white shadow-blue-200 shadow-md',
      hoverTab: 'bg-white text-slate-655 border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200',
      color: 'blue'
    };
  }
  if (normalized.includes('lens')) {
    return {
      icon: Eye,
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      activeTab: 'bg-emerald-600 text-white shadow-emerald-200 shadow-md',
      hoverTab: 'bg-white text-slate-655 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200',
      color: 'emerald'
    };
  }
  return {
    icon: ShoppingBag,
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    activeTab: 'bg-purple-600 text-white shadow-purple-200 shadow-md',
    hoverTab: 'bg-white text-slate-655 border border-slate-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200',
    color: 'purple'
  };
};

const statusConfig = {
  'In Stock':     { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  'Low Stock':    { color: 'text-amber-700 bg-amber-50 border-amber-200',       dot: 'bg-amber-500'   },
  'Out of Stock': { color: 'text-red-700 bg-red-50 border-red-200',             dot: 'bg-red-500'     },
};

const getStatus = (qty, reorder) => {
  if (qty === 0)      return 'Out of Stock';
  if (qty <= reorder) return 'Low Stock';
  return 'In Stock';
};

const GRAD_PALETTE = [
  'from-blue-400 to-indigo-600',
  'from-emerald-400 to-teal-600',
  'from-purple-400 to-violet-600',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-600',
  'from-cyan-400 to-sky-600',
];

const StatusBadge = ({ status }) => {
  const sc = statusConfig[status] || statusConfig['In Stock'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${sc.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} flex-shrink-0`} />
      {status}
    </span>
  );
};

const SearchSuggestions = ({ items, searchTerm, onSelectProduct }) => {
  if (!searchTerm || items.length === 0) return null;
  
  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl z-[1000] overflow-hidden divide-y divide-slate-100 animate-fade-in max-h-72 overflow-y-auto">
      <div className="px-4 py-2 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        Search Suggestions ({items.length} matching products)
      </div>
      {items.slice(0, 5).map((item) => {
        // Find stores with quantity > 0
        const stockLocations = [];
        if (item.available_quantity > 0 || item.quantity > 0) {
          stockLocations.push({
            name: item.owner_name || item.store || 'Local Store',
            qty: item.available_quantity ?? item.quantity ?? 0
          });
        }
        if (item.other_stocks) {
          item.other_stocks.forEach(s => {
            if (s.available_quantity > 0) {
              stockLocations.push({ name: s.store_name, qty: s.available_quantity });
            }
          });
        }
        
        return (
          <div
            key={item.product_id || item.id}
            onClick={() => onSelectProduct(item)}
            className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all font-sans text-left"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-slate-800 line-clamp-1">{item.product_name}</p>
                {(item.owner_name || item.store) && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-bold flex-shrink-0">
                    {item.owner_name || item.store}
                  </span>
                )}
              </div>
              <p className="text-[10px] font-mono text-slate-400 mt-0.5">SKU: {item.product_sku || item.sku}</p>
            </div>
            <div className="text-right flex-shrink-0">
              {stockLocations.length > 0 ? (
                <div className="flex flex-wrap gap-1 items-center justify-end">
                  <span className="text-[10px] font-bold text-slate-400 mr-1">In Stock:</span>
                  {stockLocations.map((loc, idx) => (
                    <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-extrabold">
                      {loc.name} ({loc.qty})
                    </span>
                  ))}
                </div>
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-100 text-[10px] font-extrabold">
                  Out of Stock everywhere
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ShopkeeperStockDropdown = ({ item, onRequestHandler }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="mt-3 pt-3 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-[10px] font-bold text-slate-500 hover:text-slate-850 transition-colors"
      >
        <span>Check Store Stock ({item.other_stocks.reduce((acc, s) => acc + s.available_quantity, 0)} units)</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
          {item.other_stocks.map((stock) => (
            <div key={stock.store_id} className="flex items-center justify-between text-[10px] bg-slate-50 px-2.5 py-2 rounded-xl border border-slate-100">
              <span className="font-semibold text-slate-650">{stock.store_name}</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-800">{stock.available_quantity} units</span>
                <PermissionGuard permission="inventory:transfer">
                  <button
                    onClick={() => onRequestHandler(item, stock)}
                    className="px-2 py-0.5 bg-blue-500/10 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-500/20 rounded-lg font-bold transition-all"
                  >
                    Request
                  </button>
                </PermissionGuard>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Inventory = () => {
  const { user } = useAuthStore();
  const { selectedStore } = useStoreStore();
  const storeId = user?.role === 'admin' ? selectedStore?.id : user?.store_id;
  const { stores: allStores } = useStores({ paginate: false });
  const [viewStoreId, setViewStoreId] = useState(storeId);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeSubcategory, setActiveSubcategory] = useState('all');
  const [activeStatus, setActiveStatus] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [universalSearch, setUniversalSearch] = useState(false);

  // Request Stock states
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestProduct, setRequestProduct] = useState(null);
  const [requestSourceStore, setRequestSourceStore] = useState(null);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelectSuggestion = (product) => {
    setSearchTerm(product.product_name);
    setShowSuggestions(false);
  };

  useEffect(() => {
    setViewStoreId(storeId);
  }, [storeId]);

  /* Debounce search input */
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  /* Reset pagination on filter change */
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeCategory, activeSubcategory, activeStatus, universalSearch, viewStoreId]);

  /* Fetch database categories & subcategories */
  const { categories } = useCategories();
  const { subcategories } = useSubcategories(
    activeCategory !== "all" ? Number(activeCategory) : null,
  );

  const getStockStatusValue = (statusStr) => {
    if (!statusStr) return null;
    const s = statusStr.toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    if (s === 'in stock') return 'in_stock';
    if (s === 'low stock') return 'low_stock';
    if (s === 'out of stock') return 'out_of_stock';
    return null;
  };

  /* Query paginated inventory data from the backend */
  const {
    items,
    total,
    pages,
    kpiItems,
    isLoading,
    isFetching,
    inventoryQuery,
  } = useInventory(viewStoreId || storeId, {
    page: currentPage,
    limit: 20,
    search: debouncedSearch,
    category_id: activeCategory !== 'all' ? Number(activeCategory) : null,
    subcategory_id: activeSubcategory !== 'all' ? Number(activeSubcategory) : null,
    stock_status: getStockStatusValue(activeStatus),
    universal: universalSearch,
  });

  const handleRequestInit = (product, sourceStore) => {
    setRequestProduct(product);
    setRequestSourceStore(sourceStore);
    setRequestModalOpen(true);
  };

  const handleRequestSuccess = () => {
    inventoryQuery.refetch();
  };

  const isViewingOwnStore = String(viewStoreId) === String(storeId);
  const viewStoreLabel = useMemo(() => {
    if (viewStoreId === 'warehouse') return 'Admin Warehouse';
    if (isViewingOwnStore) return 'My Store';
    const found = allStores?.find(s => String(s.id) === String(viewStoreId));
    return found?.store_name || 'Store';
  }, [viewStoreId, storeId, allStores, isViewingOwnStore]);

  // Format main page products
  const products = useMemo(() => {
    return (items || []).map(item => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      category: item.category_name,
      subcategory: item.subcategory_name,
      brand: item.brand_name,
      sku: item.product_sku || item.sku,
      selling_price: Number(item.selling_price),
      available_quantity: item.available_quantity,
      reorder_level: item.reorder_level,
      image: item.image_url || item.image,
      description: item.product_description || item.description || '',
      status: getStatus(item.available_quantity, item.reorder_level),
      quantity: item.available_quantity,
      discount_percent: Number(item.discount_percent || 0),
      warranty_months: Number(item.warranty_months || 0),
      other_stocks: item.other_stocks || [],
    }));
  }, [items]);

  // Format KPI calculations based on unpaginated kpiItems
  const kpiProducts = useMemo(() => {
    return (kpiItems || []).map(item => ({
      status: getStatus(item.available_quantity, item.reorder_level)
    }));
  }, [kpiItems]);

  // KPI Calculations
  const inStockCount = useMemo(() => kpiProducts.filter((i) => i.status === 'In Stock').length, [kpiProducts]);
  const lowStockCount = useMemo(() => kpiProducts.filter((i) => i.status === 'Low Stock').length, [kpiProducts]);
  const outStockCount = useMemo(() => kpiProducts.filter((i) => i.status === 'Out of Stock').length, [kpiProducts]);

  const handleStatusFilter = (status) => {
    setActiveStatus((prev) => (prev === status ? '' : status));
  };

  const kpiCards = [
    {
      label: 'Total Products',
      value: kpiProducts.length,
      status: '',
      icon: Package,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      activeBorder: 'border-blue-500 ring-4 ring-blue-500/10',
      glow: 'from-blue-50',
      activeBg: 'bg-blue-50',
    },
    {
      label: 'In Stock',
      value: inStockCount,
      status: 'In Stock',
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      activeBorder: 'border-emerald-500 ring-4 ring-emerald-500/10',
      glow: 'from-emerald-50',
      activeBg: 'bg-emerald-50',
    },
    {
      label: 'Low Stock',
      value: lowStockCount,
      status: 'Low Stock',
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      activeBorder: 'border-amber-500 ring-4 ring-amber-500/10',
      glow: 'from-amber-50',
      activeBg: 'bg-amber-50',
    },
    {
      label: 'Out of Stock',
      value: outStockCount,
      status: 'Out of Stock',
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-100',
      activeBorder: 'border-red-500 ring-4 ring-red-500/10',
      glow: 'from-red-50',
      activeBg: 'bg-red-50',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[400px] bg-white rounded-2xl border border-slate-100 shadow-sm font-sans">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-slate-505 text-sm font-semibold">Loading inventory...</p>
      </div>
    );
  }

  return (
    <PermissionGuard permission="inventory:read" fallback={
      <div className="p-8 text-center text-slate-500">
        You do not have permission to view this page.
      </div>
    }>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">
      {/* ── Breadcrumb ── */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-semibold mb-3 space-x-2">
          <Link to="/shopkeeper/dashboard" className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-extrabold">Inventory Catalog</span>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Package className="w-8 h-8 text-blue-500" />
              Inventory Catalog
            </h1>
            <p className="text-slate-500 mt-1 text-xs sm:text-sm font-semibold">
              Live dashboard of store stock status, reorder quantities, and brand selections.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {allStores && allStores.length > 1 && (
              <div className="relative">
                <select
                  value={viewStoreId}
                  onChange={(e) => setViewStoreId(e.target.value === 'warehouse' ? 'warehouse' : e.target.value)}
                  className="pl-9 pr-10 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm appearance-none cursor-pointer"
                >
                  <option value={storeId}>My Store</option>
                  <option value="warehouse">Admin Warehouse</option>
                  {allStores.filter(s => String(s.id) !== String(storeId) && s.store_name !== 'All Store').map(s => (
                    <option key={s.id} value={s.id}>{s.store_name}</option>
                  ))}
                </select>
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            )}
            <NotificationBell role="shopkeeper" />
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {kpiCards.map((kpi) => {
          const isActive = activeStatus === kpi.status;
          return (
            <button
              key={kpi.label}
              onClick={() => handleStatusFilter(kpi.status)}
              className={`text-left p-4 sm:p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all group relative overflow-hidden cursor-pointer focus:outline-none ${
                isActive
                  ? `${kpi.activeBorder} ${kpi.activeBg} shadow-md`
                  : `bg-white ${kpi.border} hover:${kpi.activeBorder}`
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.glow} to-transparent ${isActive ? 'opacity-80' : 'opacity-0 group-hover:opacity-50'} transition-opacity`} />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-405 mb-1">{kpi.label}</p>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-905">{kpi.value}</h3>
                </div>
                <div className={`p-2.5 rounded-xl ${kpi.bg} ${kpi.color} flex-shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Search Bar & Universal Toggle ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-5">
        <div className="relative flex-1 group" ref={searchRef}>
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search by product name, SKU, brand..."
            className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-medium transition-all shadow-sm placeholder:text-slate-450"
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); setShowSuggestions(false); }}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors">
              <XIcon className="w-4 h-4" />
            </button>
          )}
          {showSuggestions && (
            <SearchSuggestions
              items={products}
              searchTerm={searchTerm}
              onSelectProduct={handleSelectSuggestion}
            />
          )}
        </div>
        <label className="flex items-center gap-2.5 px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 cursor-pointer select-none transition-colors">
          <input
            type="checkbox"
            checked={universalSearch}
            onChange={(e) => setUniversalSearch(e.target.checked)}
            className="w-4 h-4 text-emerald-600 border-slate-350 rounded focus:ring-emerald-500 cursor-pointer accent-emerald-600"
          />
          <span className="text-sm font-semibold text-slate-750">Search All Stores</span>
        </label>
      </div>

      {/* ── Category Tabs ── */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto hide-scrollbar pb-1">
        <button
          onClick={() => { setActiveCategory('all'); setActiveSubcategory('all'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 border ${
            activeCategory === 'all'
              ? 'bg-slate-955 text-white border-slate-955 shadow-md shadow-slate-955/20'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Items
        </button>
        {categories.map((cat) => {
          const isActive = String(activeCategory) === String(cat.id);
          const config = getCategoryConfig(cat.name);
          return (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(String(cat.id)); setActiveSubcategory('all'); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                isActive ? config.activeTab : config.hoverTab
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* ── Subcategory Tabs ── */}
      {activeCategory !== 'all' && subcategories.length > 0 && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto hide-scrollbar pb-1 text-xs">
          <button
            onClick={() => setActiveSubcategory('all')}
            className={`px-3.5 py-2 rounded-xl font-bold border transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
              activeSubcategory === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Subcategories
          </button>
          {subcategories.map((sub) => {
            const isActive = String(activeSubcategory) === String(sub.id);
            return (
              <button
                key={sub.id}
                onClick={() => setActiveSubcategory(String(sub.id))}
                className={`px-3.5 py-2 rounded-xl font-bold border transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {sub.name}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Product Grid ── */}
      {isFetching && (
        <div className="absolute inset-0 bg-slate-50/40 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      )}

      {products.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <Glasses className="w-12 h-12 text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-900 mb-1">No inventory items found</h3>
          <p className="text-slate-500 text-sm">No items found matching selected filters or search terms.</p>
        </div>
      ) : (
        <div className="relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((item) => {
              const grad = GRAD_PALETTE[item.product_id % GRAD_PALETTE.length];
              return (
                <div
                  key={item.product_id || item.id}
                  className="bg-white rounded-2xl border border-slate-150 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group overflow-hidden flex flex-col cursor-pointer"
                >
                  {/* Image / Thumbnail */}
                  <div onClick={() => setSelectedProduct(item)} className="relative h-44 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt={item.product_name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                        <span className="text-xl font-black text-white">{item.product_name[0]}</span>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                      <StatusBadge status={item.status} />
                    </div>

                    {/* Available Stock */}
                    <div className="absolute bottom-3 right-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm border border-white/50 ${
                        item.quantity === 0 ? 'bg-red-100 text-red-700' :
                        item.quantity <= item.reorder_level ? 'bg-amber-100 text-amber-700' :
                        'bg-white text-slate-700'
                      }`}>
                        Stock: {item.quantity}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex flex-col flex-1 gap-1.5">
                    <div onClick={() => setSelectedProduct(item)} className="space-y-1.5 cursor-pointer">
                      <div className="flex flex-wrap gap-1">
                        <span className="self-start inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-extrabold border bg-slate-50 text-slate-600 border-slate-200">
                          {item.subcategory}
                        </span>
                        {Number(item.discount_percent) > 0 && (
                          <span className="self-start inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-extrabold border bg-rose-50 text-rose-700 border-rose-200">
                            {item.discount_percent}% Off
                          </span>
                        )}
                        {Number(item.warranty_months) > 0 && (
                          <span className="self-start inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-extrabold border bg-blue-50 text-blue-700 border-blue-200">
                            {item.warranty_months}M Warranty
                          </span>
                        )}
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                        {item.product_name}
                      </h3>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 border-t border-slate-50 pt-2">
                        <span className="font-semibold">{item.brand}</span>
                        <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{item.sku}</span>
                      </div>
                      <div className="flex items-center justify-between mt-auto pt-1">
                        <span className="text-xs font-bold text-slate-400">Retail Price</span>
                        <span className="text-sm font-black text-slate-900">₹{item.selling_price.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Request from viewed store button */}
                    {!isViewingOwnStore && (
                      <PermissionGuard permission="inventory:transfer">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const isWH = viewStoreId === 'warehouse';
                            handleRequestInit(item, {
                              store_id: isWH ? 0 : viewStoreId,
                              store_name: viewStoreLabel,
                              owner_type: isWH ? 'ADMIN' : 'STORE',
                              available_quantity: item.available_quantity,
                            });
                          }}
                          className="w-full mt-2 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-xs font-bold hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          Request from {viewStoreLabel}
                        </button>
                      </PermissionGuard>
                    )}

                    {isViewingOwnStore && (item.status === 'Low Stock' || item.status === 'Out of Stock') && (
                      <PermissionGuard permission="inventory:transfer">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const whStock = item.other_stocks?.find(s => s.owner_type === 'ADMIN');
                            const source = whStock ? {
                              store_id: 0,
                              store_name: 'Central Warehouse',
                              owner_type: 'ADMIN',
                              available_quantity: whStock.available_quantity,
                            } : {
                              store_id: 0,
                              store_name: 'Central Warehouse',
                              owner_type: 'ADMIN',
                              available_quantity: 0,
                            };
                            handleRequestInit(item, source);
                          }}
                          className="w-full mt-2 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-xs font-bold hover:from-amber-600 hover:to-orange-700 transition-all shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          Request Stock
                        </button>
                      </PermissionGuard>
                    )}
                    {/* Other stores stock toggle & list */}
                    {item.other_stocks && item.other_stocks.length > 0 && (
                      <ShopkeeperStockDropdown item={item} onRequestHandler={handleRequestInit} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            totalItems={total}
            itemsPerPage={20}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* ── Product Detailed Spec Modal ── */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
          <div className="relative bg-white w-full sm:max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] border border-slate-150 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedProduct.brand} Details</span>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                type="button"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Spec Sheet Body */}
            <div className="overflow-y-auto p-5 sm:p-6 flex-1 space-y-5 text-sm font-medium">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-400">
                  <Glasses className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">{selectedProduct.product_name}</h3>
                  <p className="text-slate-455 mt-0.5 text-xs">SKU: {selectedProduct.sku} &middot; {selectedProduct.subcategory}</p>
                </div>
              </div>

              {/* Attributes block */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-100 rounded-xl p-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Price</span>
                  <span className="font-bold text-slate-900 text-sm">₹{selectedProduct.selling_price.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Available Stock</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedProduct.quantity} units</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reorder Alert Trigger</span>
                  <span className="font-bold text-slate-700 text-xs">Below {selectedProduct.reorder_level} units</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stock Level Status</span>
                  <span className="mt-1 block"><StatusBadge status={selectedProduct.status} /></span>
                </div>
              </div>

              {/* Description */}
              {selectedProduct.description && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" /> Description
                  </span>
                  <p className="text-slate-650 text-xs leading-relaxed">{selectedProduct.description}</p>
                </div>
              )}

              {/* Features list */}
              {selectedProduct.features && selectedProduct.features.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Product Features</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProduct.features.map((f, i) => (
                      <span key={i} className="bg-slate-100 text-slate-650 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-150">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Request Stock Modal ── */}
      {requestModalOpen && (
        <RequestStockModal
          isOpen={requestModalOpen}
          onClose={() => {
            setRequestModalOpen(false);
            setRequestProduct(null);
            setRequestSourceStore(null);
          }}
          product={requestProduct}
          sourceStore={requestSourceStore}
          onSuccess={handleRequestSuccess}
        />
      )}
    </div>
    </PermissionGuard>
  );
};

export default Inventory;
