import { useState, useMemo, useEffect } from 'react';
import {
  Search, Package, ChevronRight, Eye, AlertTriangle,
  CheckCircle, XCircle, Glasses, ShoppingBag, X as XIcon, Info, Warehouse as WarehouseIcon, Loader2
} from 'lucide-react';
import { useAuthStore } from '../../store/store';
import { useInventory } from '../../hooks/useInventory';
import { useCategories } from '../../hooks/useCategories';
import RequestStockModal from '../../components/shopkeeper/RequestStockModal';
import NotificationBell from '../../components/shared/NotificationBell';
import Pagination from '../../components/shared/Pagination';

const getCategoryConfig = (name) => {
  const normalized = (name || '').toLowerCase();
  if (normalized.includes('frame')) {
    return {
      icon: Glasses,
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      activeTab: 'bg-blue-600 text-white shadow-blue-200 shadow-md',
      hoverTab: 'bg-white text-slate-600 border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200',
      color: 'blue'
    };
  }
  if (normalized.includes('lens')) {
    return {
      icon: Eye,
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      activeTab: 'bg-emerald-600 text-white shadow-emerald-200 shadow-md',
      hoverTab: 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200',
      color: 'emerald'
    };
  }
  return {
    icon: ShoppingBag,
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    activeTab: 'bg-purple-600 text-white shadow-purple-200 shadow-md',
    hoverTab: 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200',
    color: 'purple'
  };
};

const statusConfig = {
  in_stock: { label: 'In Stock', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  low_stock: { label: 'Low Stock', color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  out_of_stock: { label: 'Out of Stock', color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500' },
};

const getStockStatus = (item) => {
  const qty = Number(item.available_quantity ?? item.quantity ?? 0);
  const reorder = Number(item.reorder_level ?? 0);
  if (qty === 0) return 'out_of_stock';
  const threshold = reorder > 0 ? reorder : 10;
  if (qty <= threshold) return 'low_stock';
  return 'in_stock';
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
  const sc = statusConfig[status] || statusConfig['in_stock'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${sc.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} flex-shrink-0`} />
      {sc.label}
    </span>
  );
};

const ShopkeeperWarehouse = () => {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeStatus, setActiveStatus] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Categories query
  const { categories } = useCategories();

  /* Debounce search input */
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeCategory, activeStatus]);

  const getStockStatusValue = (statusStr) => {
    if (!statusStr) return null;
    const s = statusStr.toLowerCase();
    if (s === "in_stock" || s === "in stock") return "in_stock";
    if (s === "low_stock" || s === "low stock") return "low_stock";
    if (s === "out_of_stock" || s === "out of stock") return "out_of_stock";
    return null;
  };

  // Load Admin warehouse inventory
  const {
    items,
    total,
    pages,
    kpiItems,
    isLoading,
    inventoryQuery,
  } = useInventory('warehouse', {
    page: currentPage,
    limit: 20,
    search: debouncedSearch,
    category_id: activeCategory !== 'all' ? Number(activeCategory) : null,
    stock_status: getStockStatusValue(activeStatus),
  });

  // Dynamically calculate stock statuses from backend products for current page
  const products = useMemo(() => {
    return (items || []).map(item => ({
      ...item,
      id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      category: item.category_name,
      subcategory: item.subcategory_name,
      brand: item.brand_name,
      sku: item.product_sku || item.sku,
      available_quantity: item.available_quantity,
      reorder_level: item.reorder_level,
      image: item.image_url,
      description: item.product_description || '',
      status: getStockStatus(item),
      quantity: item.available_quantity,
    }));
  }, [items]);

  const filteredProducts = products;

  // KPI Calculations using unpaginated kpiItems
  const mappedKpiItems = useMemo(() => {
    return (kpiItems || []).map(item => ({
      ...item,
      status: getStockStatus(item),
    }));
  }, [kpiItems]);

  const inStockCount = useMemo(() => mappedKpiItems.filter((i) => i.status === 'in_stock').length, [mappedKpiItems]);
  const lowStockCount = useMemo(() => mappedKpiItems.filter((i) => i.status === 'low_stock').length, [mappedKpiItems]);
  const outStockCount = useMemo(() => mappedKpiItems.filter((i) => i.status === 'out_of_stock').length, [mappedKpiItems]);

  const handleStatusFilter = (status) => {
    setActiveStatus((prev) => (prev === status ? '' : status));
  };

  const handleRequestStockClick = (product, e) => {
    e.stopPropagation();
    setSelectedProduct(product);
    setShowRequestModal(true);
  };

  const handleRequestSuccess = () => {
    inventoryQuery.refetch();
  };

  const hasActiveFilters = Boolean(searchTerm || activeCategory !== 'all' || activeStatus);

  const kpiCards = [
    {
      label: 'Warehouse Products',
      value: total,
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
      status: 'in_stock',
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
      status: 'low_stock',
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
      status: 'out_of_stock',
      icon: XCircle,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-100',
      activeBorder: 'border-rose-500 ring-4 ring-rose-500/10',
      glow: 'from-rose-50',
      activeBg: 'bg-rose-50',
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">
      {/* Breadcrumbs & Header */}
      <div className="mb-6 sm:mb-8 flex justify-between items-start">
        <div>
          <div className="flex items-center text-sm text-slate-500 font-semibold mb-3 space-x-2">
            <span className="hover:text-slate-800 transition-colors">Shopkeeper</span>
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
            <span className="text-slate-900 font-extrabold">Warehouse Inventory</span>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <WarehouseIcon className="w-8 h-8 text-emerald-500" />
              Central Warehouse
            </h1>
            <p className="text-slate-500 mt-1 text-sm sm:text-base font-medium">
              View central warehouse stock and request items for your store branch.
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <NotificationBell />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          const isSelected = activeStatus === kpi.status;
          return (
            <div
              key={kpi.label}
              onClick={() => kpi.status && handleStatusFilter(kpi.status)}
              className={`p-4 sm:p-5 bg-white rounded-2xl border ${kpi.border} flex items-center justify-between shadow-sm transition-all duration-200 cursor-pointer ${
                isSelected ? kpi.activeBorder + ' ' + kpi.activeBg : 'hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">{kpi.value}</h3>
              </div>
              <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Body */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 lg:p-8 min-h-[400px]">
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products by name, SKU, brand..."
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <XIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1.5 text-xs">
            <button
              onClick={() => setActiveCategory('all')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold border transition-all ${
                activeCategory === 'all'
                  ? 'bg-slate-950 text-white border-slate-950 shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => {
              const isActive = String(activeCategory) === String(cat.id);
              const config = getCategoryConfig(cat.name);
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold border transition-all ${
                    isActive ? config.activeTab : config.hoverTab
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* Products Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 min-h-[300px]">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
              <p className="text-slate-400 text-sm font-semibold">Loading warehouse catalog...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            hasActiveFilters ? (
              <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-base font-bold text-slate-900 mb-1">No products found</h3>
                <p className="text-slate-400 text-sm mb-4">No warehouse products matched your search or filter criteria.</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setActiveCategory('all');
                    setActiveStatus('');
                  }}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-base font-bold text-slate-900 mb-1">No Warehouse Stock</h3>
                <p className="text-slate-400 text-sm mb-4">No products are currently available in the central warehouse.</p>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map((item) => {
                const grad = GRAD_PALETTE[item.id % GRAD_PALETTE.length];
                const canRequest = (item.available_quantity ?? item.quantity ?? 0) > 0;
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-150 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group overflow-hidden flex flex-col"
                  >
                    <div className="relative h-40 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-lg`}>
                          <span className="text-xl font-black text-white">{item.product_name[0]}</span>
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="absolute bottom-3 right-3">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold shadow-sm border border-white/50 ${
                          item.status === 'out_of_stock' ? 'bg-red-100 text-red-700' : 'bg-white text-slate-700'
                        }`}>
                          Qty: {item.quantity}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-1 gap-1.5">
                      <span className="self-start inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-slate-50 text-slate-600 border border-slate-200">
                        {item.subcategory}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2 leading-snug">
                        {item.product_name}
                      </h3>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-50">
                        <span className="font-semibold">{item.brand}</span>
                        <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded border">{item.sku}</span>
                      </div>

                      {/* Request Stock button */}
                      <button
                        onClick={(e) => handleRequestStockClick(item, e)}
                        disabled={!canRequest}
                        className={`w-full mt-3 py-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 shadow-sm border ${
                          canRequest
                            ? 'bg-[#0A0F1F] text-white hover:bg-slate-800 border-transparent cursor-pointer'
                            : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        }`}
                      >
                        Request Stock
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="pt-6 border-t border-slate-50">
              <Pagination current={currentPage} total={pages} onPageChange={setCurrentPage} />
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      <RequestStockModal
        isOpen={showRequestModal}
        onClose={() => {
          setShowRequestModal(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onSuccess={handleRequestSuccess}
      />
    </div>
  );
};

export default ShopkeeperWarehouse;
