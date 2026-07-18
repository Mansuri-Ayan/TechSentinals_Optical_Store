import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Search, Plus, Package, ChevronRight, Eye, AlertTriangle, CheckCircle,
  XCircle, Layers, Glasses, ShoppingBag, X as XIcon, Info, ArrowRightLeft,
  Loader2, Store, CreditCard, ChevronDown, Receipt, Calendar, Truck, ArrowRight
} from "lucide-react";

import Pagination from "../../components/shared/Pagination";
import AddInventoryModal from "../../components/admin/AddInventoryModal";
import InventoryDetailDrawer from "../../components/admin/InventoryDetailDrawer";
import WarehouseTransferModal from "../../components/admin/WarehouseTransferModal";
import AddTransactionModal from "../../components/admin/suppliers/AddTransactionModal";
import TransactionDetailModal from "../../components/admin/suppliers/TransactionDetailModal";
import AddPaymentModal from "../../components/admin/suppliers/AddPaymentModal";
import AdminRequestStockModal from "../../components/admin/AdminRequestStockModal";

import { useStoreStore, useAuthStore } from "../../store/store";
import { useCategories, useSubcategories } from "../../hooks/useCategories";
import { useBrands } from "../../hooks/useBrands";
import { useInventory } from "../../hooks/useInventory";
import { usePurchaseOrders } from "../../hooks/usePurchaseOrders";
import { getWarehouseTransactionsApi } from "../../api/transactions/transaction.api";
import { createProductApi } from "../../api/product/product.api";
import { useSuppliers } from "../../hooks/useSuppliers";
import { useQuery } from "@tanstack/react-query";
import PermissionGuard from '../../components/shared/PermissionGuard';
import { usePagePermissions } from '../../hooks/usePermissions';
import { useRoleContext } from '../../hooks/useRoleContext';

const getCategoryConfig = (name) => {
  const normalized = (name || "").toLowerCase();
  if (normalized.includes("frame")) {
    return {
      icon: Glasses,
      badge: "bg-blue-50 text-blue-700 border-blue-200",
      activeTab: "bg-blue-600 text-white shadow-blue-200 shadow-md",
      hoverTab: "bg-white text-slate-600 border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200",
      color: "blue",
    };
  }
  if (normalized.includes("lens") && !normalized.includes("contact")) {
    return {
      icon: Eye,
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      activeTab: "bg-emerald-600 text-white shadow-emerald-200 shadow-md",
      hoverTab: "bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200",
      color: "emerald",
    };
  }
  if (normalized.includes("sunglass")) {
    return {
      icon: Glasses,
      badge: "bg-amber-50 text-amber-700 border-amber-200",
      activeTab: "bg-amber-600 text-white shadow-amber-200 shadow-md",
      hoverTab: "bg-white text-slate-600 border border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200",
      color: "amber",
    };
  }
  return {
    icon: ShoppingBag,
    badge: "bg-purple-50 text-purple-700 border-purple-200",
    activeTab: "bg-purple-600 text-white shadow-purple-200 shadow-md",
    hoverTab: "bg-white text-slate-600 border border-slate-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200",
    color: "purple",
  };
};

const statusConfig = {
  in_stock: { label: "In Stock", color: "text-emerald-700 bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  low_stock: { label: "Low Stock", color: "text-amber-700 bg-amber-50 border-amber-200", dot: "bg-amber-500" },
  out_of_stock: { label: "Out of Stock", color: "text-red-700 bg-red-50 border-red-200", dot: "bg-red-500" },
};

const getStockStatus = (item) => {
  const qty = Number(item.available_quantity ?? item.quantity ?? 0);
  const reorder = Number(item.reorder_level ?? 0);
  if (qty === 0) return "out_of_stock";
  const threshold = reorder > 0 ? reorder : 10;
  if (qty <= threshold) return "low_stock";
  return "in_stock";
};

const GRAD_PALETTE = [
  "from-blue-400 to-indigo-600",
  "from-emerald-400 to-teal-600",
  "from-purple-400 to-violet-600",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-600",
  "from-cyan-400 to-sky-600",
];

const StatusBadge = ({ status }) => {
  const sc = statusConfig[status] || statusConfig["in_stock"];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${sc.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} flex-shrink-0`} />
      {sc.label}
    </span>
  );
};

const TXN_STATUS_BADGE = {
  APPROVED: 'text-emerald-700 bg-emerald-50 border-emerald-250',
  COMPLETED: 'text-emerald-750 bg-emerald-100 border-emerald-300',
  PENDING: 'text-amber-750 bg-amber-50 border-amber-250',
  REJECTED: 'text-red-700 bg-red-50 border-red-200',
};

const TABS = [
  { id: "catalog", label: "Inventory Catalog", icon: Package },
  { id: "transactions", label: "Transactions History", icon: ArrowRightLeft },
  { id: "pos", label: "Supplier Purchase Orders", icon: Truck },
];

const Warehouse = () => {
  const { storeId, buildPath, showStoreSwitcher, isPathAdmin } = useRoleContext();
  const { user } = useAuthStore();
  const { selectedStore } = useStoreStore();
  const isBranchView = !isPathAdmin || (selectedStore && selectedStore.id !== "admin");
  const [searchParams, setSearchParams] = useSearchParams();

  const queryCategoryId = searchParams.get("category_id");
  const querySubcategoryId = searchParams.get("subcategory_id");
  const queryBrandId = searchParams.get("brand_id");
  const queryStockStatus = searchParams.get("stock_status");

  const perms = usePagePermissions({
    canCreate: 'inventory:create',
    canUpdate: 'inventory:update',
    canDelete: 'inventory:delete'
  });

  const [activeTab, setActiveTab] = useState("catalog");

  /* Filters & Pagination states for Inventory */
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(queryCategoryId || "all");
  const [activeSubcategory, setActiveSubcategory] = useState(querySubcategoryId || "");
  const [activeBrand, setActiveBrand] = useState(queryBrandId || "");
  const [activeStatus, setActiveStatus] = useState(queryStockStatus || "");
  const [currentPage, setCurrentPage] = useState(1);

  /* Transactions list states */
  const [txnSearch, setTxnSearch] = useState("");
  const [debouncedTxnSearch, setDebouncedTxnSearch] = useState("");
  const [txnPage, setTxnPage] = useState(1);

  /* Modal/Drawer states */
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetProduct, setTransferTargetProduct] = useState(null);
  const [detailItem, setDetailItem] = useState(null);

  /* Supplier PO related states */
  const [showRecordPurchase, setShowRecordPurchase] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentTargetPO, setPaymentTargetPO] = useState(null);
  const [preselectedProductId, setPreselectedProductId] = useState(null);

  /* Request stock modal states for branch view */
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestProduct, setRequestProduct] = useState(null);
  const [requestSourceStore, setRequestSourceStore] = useState(null);

  const handleRequestStockClick = (item) => {
    setRequestProduct(item);
    setRequestSourceStore({
      store_id: 'admin',
      store_name: "Admin Warehouse",
      owner_type: "ADMIN",
      available_quantity: item.quantity,
    });
    setRequestModalOpen(true);
  };

  /* Sync URL query params to state when they change */
  useEffect(() => {
    setActiveCategory(queryCategoryId || "all");
    setActiveSubcategory(querySubcategoryId || "");
    setActiveBrand(queryBrandId || "");
    if (queryStockStatus !== null) {
      setActiveStatus(queryStockStatus);
    }
  }, [queryCategoryId, querySubcategoryId, queryBrandId, queryStockStatus]);

  /* Debounce search input */
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  /* Debounce txn search */
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTxnSearch(txnSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [txnSearch]);

  /* Fetch categories & subcategories */
  const { categories } = useCategories();
  const { subcategories } = useSubcategories(
    activeCategory !== "all" ? Number(activeCategory) : null
  );

  /* Fetch all brands to find active brand name */
  const { brands } = useBrands(null, { paginate: false });

  const activeBrandName = useMemo(() => {
    if (!activeBrand || !brands) return "";
    const found = brands.find((b) => String(b.id) === String(activeBrand));
    return found ? found.name : "";
  }, [activeBrand, brands]);

  const getStockStatusValue = (statusStr) => {
    if (!statusStr) return null;
    const s = statusStr.toLowerCase();
    if (s === "in_stock" || s === "in stock") return "in_stock";
    if (s === "low_stock" || s === "low stock") return "low_stock";
    if (s === "out_of_stock" || s === "out of stock") return "out_of_stock";
    return null;
  };

  /* Query paginated inventory data for admin warehouse */
  const {
    items,
    total,
    pages,
    kpiItems,
    isLoading: isLoadingInventory,
    createInventoryAsync,
    updateInventoryAsync,
    inventoryQuery,
  } = useInventory("warehouse", {
    page: currentPage,
    limit: 20,
    search: debouncedSearch,
    category_id: activeCategory !== "all" ? Number(activeCategory) : null,
    subcategory_id: activeSubcategory ? Number(activeSubcategory) : null,
    brand_id: activeBrand ? Number(activeBrand) : null,
    stock_status: getStockStatusValue(activeStatus),
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeCategory, activeSubcategory, activeBrand, activeStatus]);

  /* Fetch supplier catalog and list */
  const { suppliers } = useSuppliers("admin");

  /* Query warehouse transactions list */
  const {
    data: txnResponse,
    isLoading: isLoadingTxns,
    refetch: refetchTxns,
  } = useQuery({
    queryKey: ["warehouseTxns", { page: txnPage, search: debouncedTxnSearch }],
    queryFn: () => getWarehouseTransactionsApi({
      page: txnPage,
      limit: 20,
      search: debouncedTxnSearch,
    }),
    enabled: activeTab === "transactions",
  });

  /* Query warehouse supplier POs (store_id = -1 is Central Warehouse) */
  const {
    purchaseOrders,
    isLoadingPurchaseOrders,
    recordPurchaseAsync,
    recordPaymentAsync,
    purchaseOrdersQuery,
  } = usePurchaseOrders({
    store_id: -1,
  });

  /* Format items */
  const formattedItems = useMemo(() => {
    return items.map((item) => ({
      ...item,
      sku: item.product_sku || item.sku,
      category: item.category_name || item.category,
      subcategory: item.subcategory_name || item.subcategory,
      brand: item.brand_name || item.brand,
      image: item.image_url || item.image,
      quantity: item.available_quantity,
      store: "Central Warehouse",
      supplier: "Supplier Catalog",
    }));
  }, [items]);

  const detailItemFormatted = useMemo(() => {
    if (!detailItem) return null;
    return {
      ...detailItem,
      sku: detailItem.product_sku || detailItem.sku,
      category: detailItem.category_name || detailItem.category,
      subcategory: detailItem.subcategory_name || detailItem.subcategory,
      brand: detailItem.brand_name || detailItem.brand,
      image: detailItem.image_url || detailItem.image,
      quantity: detailItem.available_quantity,
      store: "Central Warehouse",
      supplier: "Supplier Catalog",
    };
  }, [detailItem]);

  /* KPI Calculations */
  const inStockCount = useMemo(
    () => kpiItems.filter((i) => getStockStatus(i) === "in_stock").length,
    [kpiItems]
  );
  const lowStockCount = useMemo(
    () => kpiItems.filter((i) => getStockStatus(i) === "low_stock").length,
    [kpiItems]
  );
  const outStockCount = useMemo(
    () => kpiItems.filter((i) => getStockStatus(i) === "out_of_stock").length,
    [kpiItems]
  );

  const valuationSum = useMemo(() => {
    return kpiItems.reduce((acc, item) => acc + (Number(item.available_quantity) * Number(item.cost_price || 0)), 0);
  }, [kpiItems]);

  const handleStatusFilter = (status) => {
    if (status === "valuation") return;
    setActiveStatus((prev) => (prev === status ? "" : status));
  };

  const hasActiveFilters = Boolean(
    searchTerm ||
    activeCategory !== "all" ||
    activeSubcategory ||
    activeBrand ||
    activeStatus
  );

  const kpiCards = isBranchView ? [
    { label: "Warehouse Products", value: kpiItems.length, status: "", icon: Package, bg: "bg-blue-50 text-blue-600", border: "border-blue-100", activeBorder: "border-blue-500 ring-4 ring-blue-500/10", activeBg: "bg-blue-50" },
    { label: "In Stock", value: inStockCount, status: "in_stock", icon: CheckCircle, bg: "bg-emerald-50 text-emerald-600", border: "border-emerald-100", activeBorder: "border-emerald-500 ring-4 ring-emerald-500/10", activeBg: "bg-emerald-50" },
    { label: "Low Stock Items", value: lowStockCount, status: "low_stock", icon: AlertTriangle, bg: "bg-amber-50 text-amber-600", border: "border-amber-100", activeBorder: "border-amber-500 ring-4 ring-amber-500/10", activeBg: "bg-amber-50" },
    { label: "Out of Stock", value: outStockCount, status: "out_of_stock", icon: XCircle, bg: "bg-red-50 text-red-600", border: "border-red-100", activeBorder: "border-red-500 ring-4 ring-red-500/10", activeBg: "bg-red-50" },
  ] : [
    { label: "Warehouse Products", value: kpiItems.length, status: "", icon: Package, bg: "bg-blue-50 text-blue-600", border: "border-blue-100", activeBorder: "border-blue-500 ring-4 ring-blue-500/10", activeBg: "bg-blue-50" },
    { label: "Central Valuation", value: `₹${valuationSum.toLocaleString("en-IN")}`, status: "valuation", icon: CreditCard, bg: "bg-emerald-50 text-emerald-600", border: "border-emerald-100" },
    { label: "Low Stock Items", value: lowStockCount, status: "low_stock", icon: AlertTriangle, bg: "bg-amber-50 text-amber-600", border: "border-amber-100", activeBorder: "border-amber-500 ring-4 ring-amber-500/10", activeBg: "bg-amber-50" },
    { label: "Out of Stock", value: outStockCount, status: "out_of_stock", icon: XCircle, bg: "bg-red-50 text-red-600", border: "border-red-100", activeBorder: "border-red-500 ring-4 ring-red-500/10", activeBg: "bg-red-50" },
  ];

  /* Handlers */
  const handleCategoryChange = (key) => {
    setActiveCategory(key);
    setActiveSubcategory("");
    const newParams = new URLSearchParams(searchParams);
    if (key === "all") {
      newParams.delete("category_id");
    } else {
      newParams.set("category_id", key);
    }
    newParams.delete("subcategory_id");
    setSearchParams(newParams);
  };

  const handleSubcategoryChange = (subId) => {
    const nextSub = String(activeSubcategory) === String(subId) ? "" : subId;
    setActiveSubcategory(nextSub);
    const newParams = new URLSearchParams(searchParams);
    if (nextSub) {
      newParams.set("subcategory_id", nextSub);
    } else {
      newParams.delete("subcategory_id");
    }
    setSearchParams(newParams);
  };

  const handleAddItem = async (data) => {
    const productPayload = {
      category_id: data.category_id,
      subcategory_id: data.subcategory_id,
      brand_id: data.brand_id,
      sku: data.sku,
      name: data.product_name,
      cost_price: Number(data.cost_price),
      selling_price: Number(data.selling_price),
      discount_percent: Number(data.discount_percent || 0),
      warranty_months: Number(data.warranty_months || 0),
      image_url: data.image || null,
      description: data.description || null,
      frame_details: data.frame_details || null,
      lens_details: data.lens_details || null,
      accessory_details: data.accessory_details || null,
    };

    const product = await createProductApi(productPayload);

    await createInventoryAsync({
      owner_type: "ADMIN",
      owner_id: user?.id,
      product_id: product.id,
      quantity: Number(data.quantity),
      reorder_level: Number(data.reorder_level),
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Deactivate this warehouse inventory item?")) {
      try {
        await updateInventoryAsync({
          id,
          payload: { is_active: false },
        });
      } catch (err) {
        toast.error("Failed to deactivate inventory item.");
      }
    }
  };

  const handleWarehousePOInsert = async (data) => {
    // Dynamically insert supplier record purchase
    const defaultSupplierId = suppliers && suppliers.length > 0 ? suppliers[0].id : data.categoryId;
    await recordPurchaseAsync({
      supplierId: defaultSupplierId,
      storeId: 'warehouse',
      productId: data.productId,
      quantity: data.quantity,
      totalAmount: data.amount,
      paidAmount: data.paidAmount,
      paymentMethod: data.method,
      date: data.date,
      remarks: data.remarks,
      costPrice: data.costPrice,
      sellingPrice: data.sellingPrice,
      discountPercent: data.discountPercent,
    });
    setShowRecordPurchase(false);
    setPreselectedProductId(null);
    inventoryQuery.refetch();
  };

  const handlePOSubmitPayment = async (poId, payload) => {
    await recordPaymentAsync({ poId, payload });
    setShowAddPayment(false);
    setPaymentTargetPO(null);
    setSelectedPO(null);
  };

  const handleOpenPaymentFromDetail = (po) => {
    setPaymentTargetPO(po);
    setShowAddPayment(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">
      {/* Header section */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-semibold mb-3 space-x-2">
          <Link to={buildPath('dashboard')} className="hover:text-slate-800 transition-colors cursor-pointer">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-extrabold">Warehouse Inventory</span>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Store className="w-8 h-8 text-emerald-500" />
              Central Warehouse
            </h1>
            <p className="text-slate-500 mt-1 text-sm sm:text-base font-medium">
              {isBranchView
                ? `View central warehouse stock and request items for ${selectedStore?.store_name || "your store branch"}.`
                : "Manage central inventory, track logistics across branches, and record supplier transactions."}
            </p>
          </div>
          {!isBranchView && (
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <PermissionGuard permission="inventory:update">
                <button
                  onClick={() => setShowTransferModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 shadow-sm transition-all flex-shrink-0"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  Transfer Stock
                </button>
              </PermissionGuard>
              <PermissionGuard permission="inventory:create">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4.5 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-md flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Add Stock
                </button>
              </PermissionGuard>
            </div>
          )}
        </div>
      </div>

      {/* KPI stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          const isClickable = kpi.status !== "valuation";
          const isSelected = activeStatus === kpi.status;
          return (
            <div
              key={kpi.label}
              onClick={() => isClickable && handleStatusFilter(kpi.status)}
              className={`p-4 sm:p-5 bg-white rounded-2xl border ${kpi.border} flex items-center justify-between shadow-sm transition-all duration-200 ${
                isClickable ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : ""
              } ${
                isSelected ? `${kpi.activeBorder} ${kpi.activeBg}` : ""
              }`}
            >
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">{kpi.value}</h3>
              </div>
              <div className={`p-3 rounded-xl ${kpi.bg}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs list */}
      {!isBranchView && (
        <div className="flex items-center gap-1 mb-6 border-b border-slate-100 overflow-x-auto hide-scrollbar pb-px">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-bold text-sm whitespace-nowrap transition-all -mb-px ${
                  isActive
                    ? "text-slate-900 border-slate-900"
                    : "text-slate-400 border-transparent hover:text-slate-700 hover:border-slate-200"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Tab Panels */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 lg:p-8 min-h-[400px]">
        {/* PANEL: Inventory Catalog */}
        {(isBranchView || activeTab === "catalog") && (
          <div className="space-y-6">
            {/* Search + filter bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products by name, SKU, brand..."
                  className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650">
                    <XIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1.5 text-xs">
              <button
                onClick={() => handleCategoryChange("all")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold border transition-all ${
                  activeCategory === "all"
                    ? "bg-slate-950 text-white border-slate-950 shadow-sm"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
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
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold border transition-all ${
                      isActive ? config.activeTab : config.hoverTab
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>

            {/* Catalog Grid */}
            {isLoadingInventory ? (
              <div className="flex flex-col items-center justify-center p-20 min-h-[300px]">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
                <p className="text-slate-400 text-sm font-semibold">Loading catalog items...</p>
              </div>
            ) : formattedItems.length === 0 ? (
              hasActiveFilters ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Package className="w-12 h-12 text-slate-350 mx-auto mb-4" />
                  <h3 className="text-base font-bold text-slate-900 mb-1">No products found</h3>
                  <p className="text-slate-400 text-sm mb-4">No warehouse products matched your search or filter criteria.</p>
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setActiveCategory("all");
                      setActiveSubcategory("");
                      setActiveBrand("");
                      setActiveStatus("");
                    }}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Package className="w-12 h-12 text-slate-350 mx-auto mb-4" />
                  <h3 className="text-base font-bold text-slate-900 mb-1">No Warehouse Stock</h3>
                  <p className="text-slate-400 text-sm mb-4">You have not added any product stock to the warehouse yet.</p>
                  <PermissionGuard permission="inventory:create">
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                    >
                      Add Your First Product
                    </button>
                  </PermissionGuard>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {formattedItems.map((item) => {
                  const status = getStockStatus(item);
                  const grad = GRAD_PALETTE[item.id % GRAD_PALETTE.length];
                  return (
                    <div
                      key={item.id}
                      onClick={() => setDetailItem(item)}
                      className="bg-white rounded-2xl border border-slate-150 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group overflow-hidden flex flex-col cursor-pointer"
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
                          <StatusBadge status={status} />
                        </div>
                        <div className="absolute bottom-3 right-3">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-bold shadow-sm border border-white/50 ${
                            status === "out_of_stock" ? "bg-red-100 text-red-750" : "bg-white text-slate-700"
                          }`}>
                            Qty: {item.quantity}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 flex flex-col flex-1 gap-1.5">
                        <span className="self-start inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-slate-50 text-slate-600 border border-slate-200">
                          {item.subcategory}
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-emerald-600 transition-colors">
                          {item.product_name}
                        </h3>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-auto pt-2 border-t border-slate-50">
                          <span className="font-semibold">{item.brand}</span>
                          <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded border">{item.sku}</span>
                        </div>
                        {isBranchView ? (
                          <PermissionGuard permission="inventory:update">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRequestStockClick(item);
                              }}
                              disabled={item.quantity <= 0}
                              className={`w-full mt-3 py-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 shadow-sm border ${
                                item.quantity > 0
                                  ? 'bg-[#0A0F1F] text-white hover:bg-slate-800 border-transparent cursor-pointer'
                                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              }`}
                            >
                              Request Stock
                            </button>
                          </PermissionGuard>
                        ) : (
                          (status === "low_stock" || status === "out_of_stock") && (
                            <PermissionGuard permission="inventory:create">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreselectedProductId(item.product_id || item.id);
                                  setShowRecordPurchase(true);
                                }}
                                className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                Restock from Supplier
                              </button>
                            </PermissionGuard>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {total > 20 && (
              <div className="pt-6 border-t border-slate-50">
                <Pagination
                  totalItems={total}
                  itemsPerPage={20}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        )}

        {/* PANEL: Transactions History */}
        {activeTab === "transactions" && (
          <div className="space-y-6">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type="text"
                value={txnSearch}
                onChange={(e) => setTxnSearch(e.target.value)}
                placeholder="Search transactions by reference code or notes..."
                className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-slate-400"
              />
            </div>

            {isLoadingTxns ? (
              <div className="flex flex-col items-center justify-center p-20">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
                <p className="text-slate-400 text-sm font-semibold">Loading transactions...</p>
              </div>
            ) : !txnResponse || txnResponse.length === 0 ? (
              <div className="text-center py-20 text-slate-400 bg-slate-50 rounded-2xl border border-dashed">
                <ArrowRightLeft className="w-12 h-12 mx-auto mb-4 text-slate-255" />
                <p className="font-bold text-base text-slate-705">No Transaction Logs</p>
                <p className="text-xs text-slate-400 mt-1">No transaction records found matching the criteria.</p>
              </div>
            ) : (
              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["Date", "Reference ID", "Product", "Type", "Qty", "Remarks", "Branch", "Status"].map((col) => (
                        <th key={col} className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {txnResponse.map((txn) => (
                      <tr key={txn.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                          {new Date(txn.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-5 py-4 text-xs font-mono font-bold text-slate-800">TXN-{txn.id.toString().padStart(6, "0")}</td>
                        <td className="px-5 py-4 font-bold text-slate-900 truncate max-w-[200px]">{txn.product_name}</td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-600">{txn.transaction_type.replace(/_/g, ' ')}</td>
                        <td className="px-5 py-4 text-sm font-extrabold text-slate-850">{txn.quantity} units</td>
                        <td className="px-5 py-4 text-xs text-slate-500 max-w-[200px] truncate">{txn.remarks || '—'}</td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-600">{txn.receive_store_name || txn.send_store_name || "Warehouse"}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${TXN_STATUS_BADGE[txn.status] || 'text-slate-500 bg-slate-50'}`}>
                            {txn.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PANEL: Supplier Purchase Orders */}
        {activeTab === "pos" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Central PO Logs</span>
              <PermissionGuard permission="inventory:create">
                <button
                  onClick={() => setShowRecordPurchase(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Record Purchase
                </button>
              </PermissionGuard>
            </div>

            {isLoadingPurchaseOrders ? (
              <div className="flex flex-col items-center justify-center p-20">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
                <p className="text-slate-400 text-sm font-semibold">Loading purchase orders...</p>
              </div>
            ) : !purchaseOrders || purchaseOrders.length === 0 ? (
              <div className="text-center py-20 text-slate-400 bg-slate-50 rounded-2xl border border-dashed">
                <Truck className="w-12 h-12 mx-auto mb-4 text-slate-205" />
                <p className="font-bold text-base text-slate-705">No Supplier Purchase Orders</p>
                <p className="text-xs text-slate-400 mt-1">Record supplier invoices to track central goods receipts.</p>
              </div>
            ) : (
              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["Order Date", "PO Number", "Supplier", "Total Amount", "Paid", "Due", "Status"].map((col) => (
                        <th key={col} className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchaseOrders.map((po) => (
                      <tr key={po.id} onClick={() => setSelectedPO({
                        id: po.po_number,
                        rawId: po.id,
                        date: po.order_date,
                        product: po.items?.[0]?.product_name || "Supplier PO",
                        category: po.items?.[0]?.category_name || "—",
                        quantity: po.items?.[0]?.quantity_ordered || 0,
                        amount: Number(po.total_amount),
                        paidAmount: Number(po.paid_amount),
                        dueAmount: Number(po.due_amount),
                        paymentMethod: po.payments?.[0]?.payment_method || "Credit",
                        paymentDate: po.payments?.[0]?.payment_date || po.order_date,
                        status: po.status === 'RECEIVED' ? 'Completed' : 'Pending',
                        remarks: po.notes,
                      })} className="hover:bg-blue-50/40 cursor-pointer transition-colors">
                        <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                          {new Date(po.order_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-5 py-4 text-xs font-mono font-bold text-slate-800">{po.po_number}</td>
                        <td className="px-5 py-4 font-bold text-slate-900">{po.supplier_name || "Supplier"}</td>
                        <td className="px-5 py-4 text-sm font-extrabold text-slate-850">₹{Number(po.total_amount).toLocaleString()}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-emerald-600">₹{Number(po.paid_amount).toLocaleString()}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-amber-600">₹{Number(po.due_amount).toLocaleString()}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                            po.status === 'RECEIVED' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-250'
                          }`}>
                            {po.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALS / DRAWERS */}
      <AddInventoryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        forceOwnerType="ADMIN"
        onSubmit={handleAddItem}
      />

      <WarehouseTransferModal
        isOpen={showTransferModal}
        defaultProduct={transferTargetProduct}
        onClose={() => {
          setShowTransferModal(false);
          setTransferTargetProduct(null);
        }}
        onSuccess={() => {
          inventoryQuery.refetch();
          if (activeTab === "transactions") refetchTxns();
        }}
      />

      <InventoryDetailDrawer
        item={detailItemFormatted}
        onClose={() => setDetailItem(null)}
        onTransfer={isBranchView ? undefined : (item) => {
          setTransferTargetProduct(item);
          setShowTransferModal(true);
        }}
        onRestockSupplier={
          isBranchView
            ? undefined
            : (item) => {
                setDetailItem(null);
                setPreselectedProductId(item.product_id || item.id);
                setShowRecordPurchase(true);
              }
        }
      />

      <AddTransactionModal
        isOpen={showRecordPurchase}
        defaultProductId={preselectedProductId}
        supplierName="Supplier"
        storeName="Warehouse"
        activeStoreId="warehouse"
        onClose={() => {
          setShowRecordPurchase(false);
          setPreselectedProductId(null);
        }}
        onSubmit={handleWarehousePOInsert}
      />

      <TransactionDetailModal
        isOpen={Boolean(selectedPO)}
        transaction={selectedPO}
        onClose={() => setSelectedPO(null)}
        onRecordPayment={handleOpenPaymentFromDetail}
      />

      <AddPaymentModal
        isOpen={showAddPayment}
        po={paymentTargetPO}
        supplierName="Supplier"
        onClose={() => {
          setShowAddPayment(false);
          setPaymentTargetPO(null);
        }}
        onSubmit={handlePOSubmitPayment}
      />

      <AdminRequestStockModal
        isOpen={requestModalOpen}
        onClose={() => {
          setRequestModalOpen(false);
          setRequestProduct(null);
          setRequestSourceStore(null);
        }}
        product={requestProduct}
        sourceStore={requestSourceStore}
        activeStoreId={selectedStore?.id}
        onSuccess={() => {
          inventoryQuery.refetch();
        }}
      />
    </div>
  );
};

export default Warehouse;
