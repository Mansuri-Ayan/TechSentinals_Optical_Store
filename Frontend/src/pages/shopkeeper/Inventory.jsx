import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Package, ChevronRight, Eye, AlertTriangle,
  CheckCircle, XCircle, Glasses, ShoppingBag, X as XIcon, Info
} from 'lucide-react';
import { FRAME_SUBCATEGORIES, LENS_SUBCATEGORIES } from '../../data/productsData';
import { useAuthStore, useStoreStore } from '../../store/store';
import { useInventory } from '../../hooks/useInventory';

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

const Inventory = () => {
  const { user } = useAuthStore();
  const { selectedStore } = useStoreStore();
  const storeId = user?.role === 'admin' ? selectedStore?.id : user?.store_id;

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeSubcategory, setActiveSubcategory] = useState('all');
  const [activeStatus, setActiveStatus] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const { kpiItems, isLoading } = useInventory(storeId);

  // Dynamically calculate stock statuses from backend products
  const products = useMemo(() => {
    return (kpiItems || []).map(item => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      category: item.category_name,
      subcategory: item.subcategory_name,
      brand: item.brand_name,
      sku: item.product_sku,
      selling_price: Number(item.selling_price),
      available_quantity: item.available_quantity,
      reorder_level: item.reorder_level,
      image: item.image_url,
      description: item.product_description || '',
      status: getStatus(item.available_quantity, item.reorder_level),
      quantity: item.available_quantity,
      discount_percent: Number(item.discount_percent || 0),
      warranty_months: Number(item.warranty_months || 0),
    }));
  }, [kpiItems]);

  // Filtered listing
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = activeCategory === 'all' || p.category === activeCategory;
      const matchSubcategory = activeSubcategory === 'all' || p.subcategory === activeSubcategory;
      const matchStatus = !activeStatus || p.status === activeStatus;
      
      const q = searchTerm.toLowerCase().trim();
      if (!q) return matchCategory && matchSubcategory && matchStatus;

      const matchSearch =
        p.product_name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.subcategory.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);

      return matchCategory && matchSubcategory && matchStatus && matchSearch;
    });
  }, [products, activeCategory, activeSubcategory, activeStatus, searchTerm]);

  // KPI Calculations
  const inStockCount = useMemo(() => products.filter((i) => i.status === 'In Stock').length, [products]);
  const lowStockCount = useMemo(() => products.filter((i) => i.status === 'Low Stock').length, [products]);
  const outStockCount = useMemo(() => products.filter((i) => i.status === 'Out of Stock').length, [products]);

  const handleStatusFilter = (status) => {
    setActiveStatus((prev) => (prev === status ? '' : status));
  };

  const kpiCards = [
    {
      label: 'Total Products',
      value: products.length,
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

      {/* ── Search Bar ── */}
      <div className="relative w-full mb-5 group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by product name, SKU, brand..."
          className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-medium transition-all shadow-sm placeholder:text-slate-450"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Category Tabs ── */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto hide-scrollbar pb-1">
        <button
          onClick={() => { setActiveCategory('all'); setActiveSubcategory('all'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 border ${
            activeCategory === 'all'
              ? 'bg-slate-950 text-white border-slate-950 shadow-md shadow-slate-950/20'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Items
        </button>
        {['Frames', 'Lenses'].map((cat) => {
          const isActive = activeCategory === cat;
          const config = getCategoryConfig(cat);
          return (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setActiveSubcategory('all'); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                isActive ? config.activeTab : config.hoverTab
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* ── Subcategory Tabs ── */}
      {(activeCategory === 'Frames' || activeCategory === 'Lenses') && (
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
          {(activeCategory === 'Frames' ? FRAME_SUBCATEGORIES : LENS_SUBCATEGORIES).map((sub) => {
            const isActive = activeSubcategory === sub;
            return (
              <button
                key={sub}
                onClick={() => setActiveSubcategory(sub)}
                className={`px-3.5 py-2 rounded-xl font-bold border transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {sub}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Product Grid ── */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <Glasses className="w-12 h-12 text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-900 mb-1">No inventory items found</h3>
          <p className="text-slate-500 text-sm">No items found matching selected filters or search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredProducts.map((item) => {
            const grad = GRAD_PALETTE[item.id % GRAD_PALETTE.length];
            return (
              <div
                key={item.id}
                onClick={() => setSelectedProduct(item)}
                className="bg-white rounded-2xl border border-slate-150 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group overflow-hidden flex flex-col cursor-pointer"
              >
                {/* Image / Thumbnail */}
                <div className="relative h-44 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
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
              </div>
            );
          })}
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
                  <p className="text-slate-450 mt-0.5 text-xs">SKU: {selectedProduct.sku} &middot; {selectedProduct.subcategory}</p>
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
    </div>
  );
};

export default Inventory;
