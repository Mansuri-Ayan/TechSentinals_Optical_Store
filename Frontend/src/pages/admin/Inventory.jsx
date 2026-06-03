import { useState, useMemo } from 'react';
import {
  Search, Plus, Package, ChevronRight, Eye, Trash2,
  AlertTriangle, CheckCircle, XCircle, Layers, Glasses,
  ShoppingBag, X as XIcon, Info, ShoppingCart,
} from 'lucide-react';
import Pagination from '../../components/shared/Pagination';
import AddInventoryModal from '../../components/admin/AddInventoryModal';
import InventoryDetailDrawer from '../../components/admin/InventoryDetailDrawer';
import ProductViewModal from '../../components/admin/ProductViewModal';
import PlaceOrderModal from '../../components/admin/PlaceOrderModal';

/* ─────────────────────────────────────────────────────────
   CATEGORY & SUBCATEGORY CONFIG
───────────────────────────────────────────────────────── */
const CATEGORIES = {
  all: {
    label: 'All Items',
    icon: Layers,
    subcategories: [],
  },
  frames: {
    label: 'Frames',
    icon: Glasses,
    subcategories: [
      'Full Rim', 'Half Rim', 'Rimless', 'Round', 'Square',
      'Rectangle', 'Cat Eye', 'Aviator', 'Wayfarer',
    ],
  },
  lenses: {
    label: 'Lenses',
    icon: Eye,
    subcategories: [
      'Single Vision', 'Bifocal', 'Progressive', 'Blue Cut',
      'Photochromic', 'Polarized', 'Computer Lens',
    ],
  },
  other: {
    label: 'Other Products',
    icon: ShoppingBag,
    subcategories: [
      'Contact Lens', 'Lens Solution', 'Eye Drops',
      'Accessories', 'Cleaning Kit', 'Cases',
    ],
  },
};

const categoryColor = {
  frames: { badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  lenses: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  other:  { badge: 'bg-purple-50 text-purple-700 border-purple-200' },
};

const statusConfig = {
  'In Stock':     { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  'Low Stock':    { color: 'text-amber-700 bg-amber-50 border-amber-200',       dot: 'bg-amber-500'   },
  'Out of Stock': { color: 'text-red-700 bg-red-50 border-red-200',             dot: 'bg-red-500'     },
};

/* ─────────────────────────────────────────────────────────
   MOCK DATA (30 items)
───────────────────────────────────────────────────────── */
const MOCK_INVENTORY = [
  { id: 1,  product_name: 'Ray-Ban Aviator Classic',          sku: 'RB-3025-001', category: 'frames', subcategory: 'Aviator',        brand: 'Ray-Ban',       supplier: 'Vision Supply Co.',  quantity: 24, reorder_level: 10, cost_price: 3200,  selling_price: 5499,  store: 'Main Branch', image: null },
  { id: 2,  product_name: 'Oakley Holbrook Sunglasses',       sku: 'OK-9102-BLK', category: 'frames', subcategory: 'Wayfarer',       brand: 'Oakley',        supplier: 'Eyewear Depot',      quantity: 7,  reorder_level: 8,  cost_price: 4500,  selling_price: 7999,  store: 'Main Branch', image: null },
  { id: 3,  product_name: 'Lenskart John Jacobs Round',       sku: 'LK-JJ-RND',  category: 'frames', subcategory: 'Round',          brand: 'John Jacobs',   supplier: 'Lenskart B2B',       quantity: 15, reorder_level: 5,  cost_price: 1200,  selling_price: 2299,  store: 'Branch 2',    image: null },
  { id: 4,  product_name: 'Titan Eye+ Metro Rimless Frame',   sku: 'TT-MTR-007',  category: 'frames', subcategory: 'Rimless',        brand: 'Titan',         supplier: 'Titan Eyewear',      quantity: 12, reorder_level: 5,  cost_price: 1800,  selling_price: 3299,  store: 'Branch 2',    image: null },
  { id: 5,  product_name: 'Fastrack Geometric Square',        sku: 'FT-GEO-SQ',  category: 'frames', subcategory: 'Square',         brand: 'Fastrack',      supplier: 'Vision Supply Co.',  quantity: 0,  reorder_level: 6,  cost_price: 700,   selling_price: 1299,  store: 'Branch 2',    image: null },
  { id: 6,  product_name: 'Vincent Chase Cat Eye Frame',      sku: 'VC-CAT-F01',  category: 'frames', subcategory: 'Cat Eye',        brand: 'Vincent Chase', supplier: 'Lenskart B2B',       quantity: 9,  reorder_level: 8,  cost_price: 900,   selling_price: 1799,  store: 'Main Branch', image: null },
  { id: 7,  product_name: 'Carrera Rectangle Full Rim',       sku: 'CR-REC-001',  category: 'frames', subcategory: 'Full Rim',       brand: 'Carrera',       supplier: 'Eyewear Depot',      quantity: 18, reorder_level: 6,  cost_price: 2800,  selling_price: 4999,  store: 'Main Branch', image: null },
  { id: 8,  product_name: 'Vogue Half Rim Metal Frame',       sku: 'VG-HRM-001',  category: 'frames', subcategory: 'Half Rim',       brand: 'Vogue',         supplier: 'Vision Supply Co.',  quantity: 6,  reorder_level: 8,  cost_price: 2100,  selling_price: 3899,  store: 'Main Branch', image: null },
  { id: 9,  product_name: 'Police Rectangle Frame',           sku: 'PLC-REC-B3',  category: 'frames', subcategory: 'Rectangle',      brand: 'Police',        supplier: 'Eyewear Depot',      quantity: 11, reorder_level: 5,  cost_price: 3400,  selling_price: 5999,  store: 'Branch 2',    image: null },
  { id: 10, product_name: 'Essilor Varilux X Progressive',    sku: 'ES-VX-001',   category: 'lenses', subcategory: 'Progressive',    brand: 'Essilor',       supplier: 'Lens World Pvt Ltd', quantity: 0,  reorder_level: 5,  cost_price: 6000,  selling_price: 9999,  store: 'Main Branch', image: null },
  { id: 11, product_name: 'Crizal Forte UV Lens',             sku: 'CR-FORTE-UV', category: 'lenses', subcategory: 'Single Vision',  brand: 'Crizal',        supplier: 'Lens World Pvt Ltd', quantity: 18, reorder_level: 10, cost_price: 2200,  selling_price: 3999,  store: 'Branch 2',    image: null },
  { id: 12, product_name: 'Hoya Sync III Blue Cut',           sku: 'HY-SNC3-BC',  category: 'lenses', subcategory: 'Blue Cut',       brand: 'Hoya',          supplier: 'Hoya Vision India',  quantity: 9,  reorder_level: 8,  cost_price: 3500,  selling_price: 5999,  store: 'Main Branch', image: null },
  { id: 13, product_name: 'Zeiss Progressive DriveSafe',      sku: 'ZS-DRV-001',  category: 'lenses', subcategory: 'Progressive',    brand: 'Zeiss',         supplier: 'Zeiss India Ltd',    quantity: 5,  reorder_level: 6,  cost_price: 8000,  selling_price: 13499, store: 'Main Branch', image: null },
  { id: 14, product_name: 'Rodenstock Bifocal Round',         sku: 'RD-BIF-R01',  category: 'lenses', subcategory: 'Bifocal',        brand: 'Rodenstock',    supplier: 'Lens World Pvt Ltd', quantity: 7,  reorder_level: 5,  cost_price: 4200,  selling_price: 7499,  store: 'Branch 2',    image: null },
  { id: 15, product_name: 'Essilor Transitions Photochromic', sku: 'ES-TRN-001',  category: 'lenses', subcategory: 'Photochromic',   brand: 'Essilor',       supplier: 'Lens World Pvt Ltd', quantity: 14, reorder_level: 8,  cost_price: 4800,  selling_price: 7999,  store: 'Main Branch', image: null },
  { id: 16, product_name: 'Nikon Polarized SeeMax',           sku: 'NK-POL-001',  category: 'lenses', subcategory: 'Polarized',      brand: 'Nikon',         supplier: 'Nikon Vision India', quantity: 0,  reorder_level: 5,  cost_price: 5200,  selling_price: 8999,  store: 'Main Branch', image: null },
  { id: 17, product_name: 'Hoya Workstyle Computer Lens',     sku: 'HY-WRK-001',  category: 'lenses', subcategory: 'Computer Lens',  brand: 'Hoya',          supplier: 'Hoya Vision India',  quantity: 22, reorder_level: 8,  cost_price: 2900,  selling_price: 4999,  store: 'Branch 2',    image: null },
  { id: 18, product_name: 'Alcon Daily Total1 Contacts',      sku: 'AL-DT1-30PK', category: 'other',  subcategory: 'Contact Lens',   brand: 'Alcon',         supplier: 'MedVision Stores',   quantity: 55, reorder_level: 20, cost_price: 900,   selling_price: 1499,  store: 'Main Branch', image: null },
  { id: 19, product_name: 'Bausch & Lomb Renu Solution',      sku: 'BL-RENU-250', category: 'other',  subcategory: 'Lens Solution',  brand: 'Bausch & Lomb', supplier: 'MedVision Stores',   quantity: 40, reorder_level: 15, cost_price: 180,   selling_price: 299,   store: 'Main Branch', image: null },
  { id: 20, product_name: 'Optho Eye Drops Lubricant',        sku: 'OP-EYD-001',  category: 'other',  subcategory: 'Eye Drops',      brand: 'Optho',         supplier: 'PharmVision',        quantity: 3,  reorder_level: 20, cost_price: 60,    selling_price: 120,   store: 'Main Branch', image: null },
  { id: 21, product_name: 'Opticlens Microfibre Cloth',       sku: 'OPT-CLN-001', category: 'other',  subcategory: 'Cleaning Kit',   brand: 'Opticlens',     supplier: 'OpticEssentials',    quantity: 3,  reorder_level: 20, cost_price: 30,    selling_price: 79,    store: 'Main Branch', image: null },
  { id: 22, product_name: 'Protect Hard Case Premium',        sku: 'PT-HC-PRM',   category: 'other',  subcategory: 'Cases',          brand: 'Protect',       supplier: 'OpticEssentials',    quantity: 60, reorder_level: 15, cost_price: 120,   selling_price: 249,   store: 'Branch 2',    image: null },
  { id: 23, product_name: 'Crizal Lens Spray Cleaner',        sku: 'CR-SPR-100',  category: 'other',  subcategory: 'Lens Solution',  brand: 'Crizal',        supplier: 'Lens World Pvt Ltd', quantity: 8,  reorder_level: 10, cost_price: 150,   selling_price: 299,   store: 'Main Branch', image: null },
  { id: 24, product_name: 'Eyeglass Strap Sporty',            sku: 'ACC-STRAP-1', category: 'other',  subcategory: 'Accessories',    brand: 'EyeGear',       supplier: 'OpticEssentials',    quantity: 45, reorder_level: 10, cost_price: 50,    selling_price: 149,   store: 'Main Branch', image: null },
  { id: 25, product_name: 'Ray-Ban Wayfarer Polarized',       sku: 'RB-WF-POL',   category: 'frames', subcategory: 'Wayfarer',       brand: 'Ray-Ban',       supplier: 'Vision Supply Co.',  quantity: 6,  reorder_level: 8,  cost_price: 5000,  selling_price: 8499,  store: 'Main Branch', image: null },
  { id: 26, product_name: 'Essilor Single Vision Digital',    sku: 'ES-SVD-001',  category: 'lenses', subcategory: 'Single Vision',  brand: 'Essilor',       supplier: 'Lens World Pvt Ltd', quantity: 30, reorder_level: 10, cost_price: 1800,  selling_price: 2999,  store: 'Branch 2',    image: null },
  { id: 27, product_name: 'Johnson Acuvue Oasys Contacts',    sku: 'JJ-ACO-6PK',  category: 'other',  subcategory: 'Contact Lens',   brand: 'J&J',           supplier: 'MedVision Stores',   quantity: 22, reorder_level: 10, cost_price: 700,   selling_price: 1199,  store: 'Branch 2',    image: null },
  { id: 28, product_name: 'Gucci GG0396O Frames',             sku: 'GC-GG396-BK', category: 'frames', subcategory: 'Full Rim',       brand: 'Gucci',         supplier: 'Luxury Eyewear',     quantity: 4,  reorder_level: 3,  cost_price: 18000, selling_price: 28999, store: 'Main Branch', image: null },
  { id: 29, product_name: 'Eyeberry Soft Lens Blue',          sku: 'EB-SL-BLU',   category: 'other',  subcategory: 'Contact Lens',   brand: 'Eyeberry',      supplier: 'MedVision Stores',   quantity: 0,  reorder_level: 5,  cost_price: 300,   selling_price: 599,   store: 'Main Branch', image: null },
  { id: 30, product_name: 'Zeiss Single Vision SmartLife',    sku: 'ZS-SVS-001',  category: 'lenses', subcategory: 'Single Vision',  brand: 'Zeiss',         supplier: 'Zeiss India Ltd',    quantity: 16, reorder_level: 8,  cost_price: 4500,  selling_price: 7499,  store: 'Branch 2',    image: null },
];

/* ─────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────── */
const getStatus = (qty, reorder) => {
  if (qty === 0)      return 'Out of Stock';
  if (qty <= reorder) return 'Low Stock';
  return 'In Stock';
};

const ITEMS_PER_PAGE = 20;
const GRAD_PALETTE = [
  'from-blue-400 to-indigo-600',
  'from-emerald-400 to-teal-600',
  'from-purple-400 to-violet-600',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-600',
  'from-cyan-400 to-sky-600',
];

/* ─────────────────────────────────────────────────────────
   STATUS BADGE
───────────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const sc = statusConfig[status] || statusConfig['In Stock'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${sc.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} flex-shrink-0`} />
      {status}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────
   PRODUCT CARD
───────────────────────────────────────────────────────── */
const ProductCard = ({ item, onViewProduct, onViewDetails, onDelete }) => {
  const status  = item.status;
  const catConf = categoryColor[item.category] || {};
  const grad    = GRAD_PALETTE[item.id % GRAD_PALETTE.length];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group overflow-hidden flex flex-col">

      {/* Image area */}
      <div
        className="relative h-44 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden cursor-pointer"
        onClick={() => onViewProduct(item)}
      >
        {item.image ? (
          <img src={item.image} alt={item.product_name} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-lg`}>
            <span className="text-2xl font-black text-white">{item.product_name[0]}</span>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <StatusBadge status={status} />
        </div>

        {/* Delete button (top-right, hover only) */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={e => e.stopPropagation()}>
          <button onClick={() => onDelete(item.id)}
            className="w-7 h-7 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors"
            title="Delete item">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Qty badge */}
        <div className="absolute bottom-3 right-3">
          <span className={`px-2 py-0.5 rounded-lg text-xs font-bold shadow-sm border border-white/50 ${
            item.quantity === 0 ? 'bg-red-100 text-red-700' :
            item.quantity <= item.reorder_level ? 'bg-amber-100 text-amber-700' :
            'bg-white/90 text-slate-700'
          }`}>
            Qty: {item.quantity}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        {/* Subcategory badge */}
        <span className={`self-start inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${catConf.badge || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
          {item.subcategory}
        </span>

        {/* Name */}
        <h3
          className="text-sm font-bold text-slate-900 leading-tight line-clamp-2 group-hover:text-emerald-700 transition-colors cursor-pointer"
          onClick={() => onViewProduct(item)}
        >
          {item.product_name}
        </h3>

        {/* Brand + SKU */}
        <p className="text-xs font-semibold text-slate-500">{item.brand}</p>
        <p className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md self-start">{item.sku}</p>

        {/* Price */}
        <div className="border-t border-slate-50 mt-auto pt-2 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900">₹{Number(item.selling_price).toLocaleString()}</span>
          <span className="text-xs text-slate-400 truncate max-w-[90px]">{item.supplier}</span>
        </div>

        {/* Two action buttons */}
        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            onClick={() => onViewProduct(item)}
            className="flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-xs font-bold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-sm hover:shadow-md"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            View Product
          </button>
          <button
            onClick={() => onViewDetails(item)}
            className="flex items-center justify-center gap-1.5 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all border border-slate-200"
          >
            <Info className="w-3.5 h-3.5" />
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────── */
const Inventory = () => {
  const [inventoryData, setInventoryData] = useState(
    MOCK_INVENTORY.map(item => ({ ...item, status: getStatus(item.quantity, item.reorder_level) }))
  );

  /* Filters */
  const [activeCategory,    setActiveCategory]    = useState('all');
  const [activeSubcategory, setActiveSubcategory] = useState('');
  const [activeStatus,      setActiveStatus]      = useState('');   // ← NEW: KPI filter
  const [searchTerm,        setSearchTerm]        = useState('');
  const [currentPage,       setCurrentPage]       = useState(1);

  /* Modal/drawer state */
  const [showAddModal,     setShowAddModal]    = useState(false);
  const [detailItem,       setDetailItem]      = useState(null);   // InventoryDetailDrawer
  const [viewProductItem,  setViewProductItem] = useState(null);   // ProductViewModal
  const [orderItem,        setOrderItem]       = useState(null);   // PlaceOrderModal

  /* ── Handlers ── */
  const handleCategoryChange = (key) => {
    setActiveCategory(key);
    setActiveSubcategory('');
    setCurrentPage(1);
  };

  const handleSubcategoryChange = (sub) => {
    setActiveSubcategory(prev => prev === sub ? '' : sub);
    setCurrentPage(1);
  };

  const handleSearch = (v) => { setSearchTerm(v); setCurrentPage(1); };

  const handleStatusFilter = (status) => {
    setActiveStatus(prev => prev === status ? '' : status);
    setCurrentPage(1);
  };

  /* ── KPI counts (always from full dataset) ── */
  const inStock  = inventoryData.filter(i => i.status === 'In Stock').length;
  const lowStock = inventoryData.filter(i => i.status === 'Low Stock').length;
  const outStock = inventoryData.filter(i => i.status === 'Out of Stock').length;

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return inventoryData.filter(item => {
      const matchCat    = activeCategory === 'all' || item.category === activeCategory;
      const matchSub    = !activeSubcategory || item.subcategory === activeSubcategory;
      const matchStatus = !activeStatus || item.status === activeStatus;
      const matchSearch = !q ||
        item.product_name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        (item.supplier || '').toLowerCase().includes(q) ||
        (item.subcategory || '').toLowerCase().includes(q);
      return matchCat && matchSub && matchStatus && matchSearch;
    });
  }, [inventoryData, activeCategory, activeSubcategory, activeStatus, searchTerm]);

  /* ── Paginated slice ── */
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  /* ── Add item ── */
  const handleAddItem = (data) => {
    const newItem = {
      ...data,
      id: Date.now(),
      quantity: Number(data.quantity),
      reorder_level: Number(data.reorder_level),
      cost_price: Number(data.cost_price),
      selling_price: Number(data.selling_price),
    };
    newItem.status = getStatus(newItem.quantity, newItem.reorder_level);
    setInventoryData(prev => [newItem, ...prev]);
  };

  /* ── Delete ── */
  const handleDelete = (id) => {
    if (window.confirm('Delete this inventory item?')) {
      setInventoryData(prev => prev.filter(i => i.id !== id));
    }
  };

  /* ── Place order handler ── */
  const handlePlaceOrder = (orderData) => {
    alert(`✅ Order placed!\nProduct: ${orderData.product_name}\nQty: ${orderData.quantity}\nCustomer: ${orderData.customer_name}\nMobile: ${orderData.mobile}`);
  };

  /* ── Subcategories for active tab ── */
  const subcategories = activeCategory !== 'all' ? CATEGORIES[activeCategory]?.subcategories || [] : [];
  const hasActiveFilters = searchTerm || activeSubcategory || activeStatus;

  /* ── KPI card config ── */
  const kpiCards = [
    {
      label: 'Total Products',
      value: inventoryData.length,
      count: filtered.length,
      status: '',
      icon: Package,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      activeBorder: 'border-blue-500 ring-2 ring-blue-200',
      glow: 'from-blue-50',
      activeBg: 'bg-blue-50',
    },
    {
      label: 'In Stock',
      value: inStock,
      count: inventoryData.filter(i => i.status === 'In Stock' && (activeCategory === 'all' || i.category === activeCategory)).length,
      status: 'In Stock',
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-200',
      glow: 'from-emerald-50',
      activeBg: 'bg-emerald-50',
    },
    {
      label: 'Low Stock',
      value: lowStock,
      count: inventoryData.filter(i => i.status === 'Low Stock' && (activeCategory === 'all' || i.category === activeCategory)).length,
      status: 'Low Stock',
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      activeBorder: 'border-amber-500 ring-2 ring-amber-200',
      glow: 'from-amber-50',
      activeBg: 'bg-amber-50',
    },
    {
      label: 'Out of Stock',
      value: outStock,
      count: inventoryData.filter(i => i.status === 'Out of Stock' && (activeCategory === 'all' || i.category === activeCategory)).length,
      status: 'Out of Stock',
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-100',
      activeBorder: 'border-red-500 ring-2 ring-red-200',
      glow: 'from-red-50',
      activeBg: 'bg-red-50',
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">

      {/* ── Breadcrumb + Header ── */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 space-x-2">
          <span className="hover:text-slate-800 cursor-pointer transition-colors">Dashboard</span>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-semibold">Inventory</span>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight">
              Inventory
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm sm:text-base">
              Browse and manage all optical products across stores.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Inventory
          </button>
        </div>
      </div>

      {/* ── Clickable KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {kpiCards.map(kpi => {
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
              {/* Glow overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.glow} to-transparent ${isActive ? 'opacity-80' : 'opacity-0 group-hover:opacity-50'} transition-opacity`} />

              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-500 mb-1">{kpi.label}</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">{kpi.value}</h3>
                  {isActive && (
                    <p className="text-xs font-semibold mt-1 text-slate-500">
                      {filtered.length} shown
                    </p>
                  )}
                </div>
                <div className={`p-2.5 rounded-xl ${kpi.bg} ${kpi.color} flex-shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
              </div>

              {/* Active indicator bar */}
              {isActive && (
                <div className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl ${kpi.color.replace('text-', 'bg-').replace('-600', '-500')}`} />
              )}

              {/* Click hint */}
              {!isActive && (
                <p className="relative text-[10px] text-slate-400 mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to filter
                </p>
              )}
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
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search by product name, SKU, brand, supplier, or subcategory..."
          className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-medium transition-all shadow-sm placeholder:text-slate-400"
        />
        {searchTerm && (
          <button onClick={() => handleSearch('')}
            className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Main Category Tabs ── */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto hide-scrollbar pb-1">
        {Object.entries(CATEGORIES).map(([key, cat]) => {
          const isActive = activeCategory === key;
          const colMap = {
            all:    isActive ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
            frames: isActive ? 'bg-blue-600 text-white shadow-blue-200 shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200',
            lenses: isActive ? 'bg-emerald-600 text-white shadow-emerald-200 shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200',
            other:  isActive ? 'bg-purple-600 text-white shadow-purple-200 shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200',
          };
          return (
            <button key={key}
              onClick={() => handleCategoryChange(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${colMap[key]}`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
              {isActive && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20">
                  {filtered.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Subcategory Chips ── */}
      {subcategories.length > 0 && (
        <div className="flex items-center gap-2 mb-5 overflow-x-auto hide-scrollbar pb-1">
          <span className="text-xs text-slate-400 font-semibold flex-shrink-0">Filter:</span>
          {subcategories.map(sub => {
            const isActive = activeSubcategory === sub;
            const dotColor = { frames: 'bg-blue-500', lenses: 'bg-emerald-500', other: 'bg-purple-500' }[activeCategory] || 'bg-slate-500';
            return (
              <button
                key={sub}
                onClick={() => handleSubcategoryChange(sub)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                  isActive ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : dotColor} flex-shrink-0`} />
                {sub}
              </button>
            );
          })}
          {activeSubcategory && (
            <button onClick={() => setActiveSubcategory('')}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0">
              <XIcon className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      )}

      {/* ── Active Filters Summary ── */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-slate-500 font-medium">Active filters:</span>
          {activeStatus && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
              {activeStatus}
              <button onClick={() => setActiveStatus('')}><XIcon className="w-3 h-3" /></button>
            </span>
          )}
          {activeSubcategory && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
              {activeSubcategory}
              <button onClick={() => setActiveSubcategory('')}><XIcon className="w-3 h-3" /></button>
            </span>
          )}
          {searchTerm && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
              "{searchTerm}"
              <button onClick={() => setSearchTerm('')}><XIcon className="w-3 h-3" /></button>
            </span>
          )}
          <button
            onClick={() => { setSearchTerm(''); setActiveStatus(''); setActiveSubcategory(''); setCurrentPage(1); }}
            className="text-xs text-slate-400 hover:text-slate-700 font-semibold transition-colors ml-1">
            Clear all
          </button>
          <span className="text-xs text-slate-400 ml-auto">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* ── Product Grid ── */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <Package className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No products found</h3>
          <p className="text-slate-500 text-sm mb-4">Try adjusting your search or filters.</p>
          <button
            onClick={() => { setSearchTerm(''); setActiveCategory('all'); setActiveSubcategory(''); setActiveStatus(''); setCurrentPage(1); }}
            className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors text-sm"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <>
          {!hasActiveFilters && (
            <p className="text-xs text-slate-400 font-medium mb-3">
              {filtered.length} product{filtered.length !== 1 ? 's' : ''} · showing {paginated.length}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {paginated.map(item => (
              <ProductCard
                key={item.id}
                item={item}
                onViewProduct={setViewProductItem}
                onViewDetails={setDetailItem}
                onDelete={handleDelete}
              />
            ))}
          </div>

          <Pagination
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* ── Modals ── */}
      <AddInventoryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddItem}
      />

      <InventoryDetailDrawer
        item={detailItem}
        onClose={() => setDetailItem(null)}
      />

      <ProductViewModal
        item={viewProductItem}
        onClose={() => setViewProductItem(null)}
        onPlaceOrder={(item) => {
          setViewProductItem(null);
          setOrderItem(item);
        }}
      />

      <PlaceOrderModal
        item={orderItem}
        onClose={() => setOrderItem(null)}
        onSubmit={handlePlaceOrder}
      />
    </div>
  );
};

export default Inventory;
