import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  TrendingUp, Search, RefreshCw, Layers, Tag,
  ArrowRightLeft, AlertCircle, Check, Loader2, X, Archive,
  Download, DollarSign, Package, Trophy, Calendar, Building2, Flame, ArrowUpDown, ChevronRight, Percent,
  Zap, BarChart3, ShoppingCart, CheckSquare, Square, Scale, Store, Plus, Minus, ChevronDown, LayoutGrid, Table, Sparkles, Send
} from 'lucide-react';
import { useProductPerformanceReport } from '../../hooks/useAnalyses';
import { useCategories } from '../../hooks/useCategories';
import { useBrands } from '../../hooks/useBrands';
import { useStores } from '../../hooks/useStores';
import { useTransactions } from '../../hooks/useTransactions';
import { useRoleContext } from '../../hooks/useRoleContext';
import Pagination from '../../components/shared/Pagination';
import { toast } from 'react-toastify';

const ProductPerformance = () => {
  const { storeId, isPathAdmin, buildPath, user, showStoreSwitcher } = useRoleContext();

  // Determine manager's own store ID
  const managerStoreId = user?.store_id || storeId;

  // Filter States
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCatId, setSelectedCatId] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [dateRangePreset, setDateRangePreset] = useState("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [sortBy, setSortBy] = useState("revenue_desc");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Drawer & Modal States
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [bulkReallocModalOpen, setBulkReallocModalOpen] = useState(false);
  const [selectedBulkItems, setSelectedBulkItems] = useState([]);
  const [isBulkExecuting, setIsBulkExecuting] = useState(false);

  // Multi-Store Comparison Modal State
  const [compareModal, setCompareModal] = useState({
    isOpen: false,
    product: null,
    selectedStoreIds: [],
    viewMode: 'cards' // 'cards' vs 'table'
  });

  // Single Item Transfer Modal State
  const [transferModal, setTransferModal] = useState({
    isOpen: false,
    recommendation: null,
    product: null,
    transferMode: isPathAdmin ? 'DIRECT' : 'REQUEST', // 'DIRECT' (Immediate) vs 'REQUEST' (Pending Approval)
    sourceOwnerType: 'STORE', // 'STORE' or 'ADMIN'
    sourceOwnerId: '',
    targetStoreId: isPathAdmin ? '' : (managerStoreId || ''),
    quantity: 1, // Human-selected custom quantity
    remarks: ""
  });

  // Fetch reference data
  const { categories } = useCategories(null, { paginate: false, all_tenant: true });
  const { brands } = useBrands(null, { paginate: false });
  const { stores } = useStores({ paginate: false });

  // Load transaction mutations
  const {
    createTransactionAsync,
    isCreatingTransaction,
    createManagerRequestAsync,
    createAdminRequestAsync,
    isCreatingManagerRequest,
    isCreatingAdminRequest
  } = useTransactions(storeId, {}, !isPathAdmin);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCatId, selectedBrandId, selectedStoreId, dateRangePreset, sortBy, customDateFrom, customDateTo]);

  // Calculate ISO date_from and date_to based on preset or custom date inputs
  const dateParams = useMemo(() => {
    const now = new Date();
    let dateFrom = null;
    let dateTo = null;

    if (dateRangePreset === 'this_month') {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    } else if (dateRangePreset === 'last_30_days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      dateFrom = d.toISOString();
    } else if (dateRangePreset === 'last_90_days') {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      dateFrom = d.toISOString();
    } else if (dateRangePreset === 'this_year') {
      dateFrom = new Date(now.getFullYear(), 0, 1).toISOString();
    } else if (dateRangePreset === 'custom') {
      if (customDateFrom) {
        dateFrom = new Date(customDateFrom + 'T00:00:00').toISOString();
      }
      if (customDateTo) {
        dateTo = new Date(customDateTo + 'T23:59:59').toISOString();
      }
    }

    return { date_from: dateFrom, date_to: dateTo };
  }, [dateRangePreset, customDateFrom, customDateTo]);

  // Combine query params
  const reportFilters = useMemo(() => {
    const params = { page, limit: ITEMS_PER_PAGE };
    if (debouncedSearch.trim()) params.search = debouncedSearch;
    if (selectedCatId) params.category_id = Number(selectedCatId);
    if (selectedBrandId) params.brand_id = Number(selectedBrandId);
    if (selectedStoreId) params.store_id = Number(selectedStoreId);
    if (sortBy) params.sort_by = sortBy;
    if (dateParams.date_from) params.date_from = dateParams.date_from;
    if (dateParams.date_to) params.date_to = dateParams.date_to;
    return params;
  }, [page, debouncedSearch, selectedCatId, selectedBrandId, selectedStoreId, sortBy, dateParams]);

  // Fetch backend report data
  const { data, isLoading, isError, refetch } = useProductPerformanceReport(reportFilters);

  const totalItems = data?.total || 0;
  const items = data?.items || [];
  const summaryKpis = data?.summary_kpis || {};

  // Guarantee Client-Side Sort Order as fallback for immediate response
  const sortedItems = useMemo(() => {
    if (!items || !items.length) return [];
    const list = [...items];
    if (sortBy === 'revenue_desc') {
      list.sort((a, b) => Number(b.total_revenue || 0) - Number(a.total_revenue || 0));
    } else if (sortBy === 'sales_desc') {
      list.sort((a, b) => Number(b.total_units_sold || 0) - Number(a.total_units_sold || 0));
    } else if (sortBy === 'sales_asc') {
      list.sort((a, b) => Number(a.total_units_sold || 0) - Number(b.total_units_sold || 0));
    } else if (sortBy === 'margin_desc') {
      list.sort((a, b) => Number(b.margin_percent || 0) - Number(a.margin_percent || 0));
    } else if (sortBy === 'stock_desc') {
      list.sort((a, b) => Number(b.total_stock_level || 0) - Number(a.total_stock_level || 0));
    }
    return list;
  }, [items, sortBy]);

  // Extract all products with actionable transfer recommendations for Bulk Modal
  const allReallocItems = useMemo(() => {
    return items.filter(p => p.transfer_recommendations && p.transfer_recommendations.length > 0);
  }, [items]);

  useEffect(() => {
    if (allReallocItems.length) {
      setSelectedBulkItems(allReallocItems.map(p => p.product_id));
    }
  }, [allReallocItems]);

  const handleOpenTransferModal = (rec, product, e) => {
    if (e) e.stopPropagation();
    const isHQ = rec.source_store_name.includes("HQ") || rec.source_store_name.includes("Warehouse");
    
    // For manager: target is ALWAYS manager's own store
    const targetStoreId = isPathAdmin ? (rec.target_store_id || '') : (managerStoreId || rec.target_store_id || stores[0]?.id || '');

    setTransferModal({
      isOpen: true,
      recommendation: rec,
      product,
      transferMode: isPathAdmin ? 'DIRECT' : 'REQUEST',
      sourceOwnerType: isHQ ? 'ADMIN' : 'STORE',
      sourceOwnerId: rec.source_store_id || '',
      targetStoreId,
      quantity: rec.recommended_qty || 1,
      remarks: isPathAdmin
        ? `Inter-branch stock re-allocation based on cross-store performance insights.`
        : `Stock request for ${product.product_name} based on store performance insights.`
    });
  };

  // Open Multi-Store Comparison Modal
  const handleOpenCompareModal = (product, e) => {
    if (e) e.stopPropagation();
    setCompareModal({
      isOpen: true,
      product,
      selectedStoreIds: stores.map(s => s.id),
      viewMode: 'cards'
    });
  };

  // 1-Click Smart Transfer / Request Action
  const handleSmartTransferToTopStore = (product, e) => {
    if (e) e.stopPropagation();
    if (!product || !product.store_metrics || !product.store_metrics.length) return;

    const sortedBySales = [...product.store_metrics].sort((a, b) => b.sales_count - a.sales_count);
    const topStore = sortedBySales[0];

    const sortedByStock = [...product.store_metrics].sort((a, b) => b.stock_level - a.stock_level);
    let sourceStore = sortedByStock.find(s => s.store_id !== topStore.store_id);

    const isHQ = !sourceStore || sourceStore.stock_level <= 0;
    const sourceOwnerType = isHQ ? 'ADMIN' : 'STORE';
    const sourceOwnerId = isHQ ? (user?.admin_id || user?.id || 1) : sourceStore.store_id;

    // For manager: target is ALWAYS manager's own store
    const targetStoreId = isPathAdmin ? topStore.store_id : (managerStoreId || topStore.store_id || stores[0]?.id || '');

    setTransferModal({
      isOpen: true,
      recommendation: {
        source_store_id: sourceOwnerId,
        source_store_name: isHQ ? "Admin Central Warehouse (HQ)" : sourceStore.store_name,
        target_store_id: targetStoreId,
        target_store_name: isPathAdmin ? topStore.store_name : "My Store Branch",
        recommended_qty: 1
      },
      product,
      transferMode: isPathAdmin ? 'DIRECT' : 'REQUEST',
      sourceOwnerType,
      sourceOwnerId,
      targetStoreId,
      quantity: 1,
      remarks: isPathAdmin
        ? `Smart stock dispatch to top performing store (${topStore.store_name}: ${topStore.sales_count} sold)`
        : `Stock request for top performing item (${product.product_name})`
    });
  };

  const handleSendTransferRequest = async () => {
    const { product, quantity, remarks, transferMode, sourceOwnerType, sourceOwnerId, targetStoreId } = transferModal;
    if (!product || !targetStoreId) return;

    try {
      const fromType = sourceOwnerType.toUpperCase();
      const fromId = Number(sourceOwnerId);
      const toId = Number(targetStoreId);

      if (transferMode === 'DIRECT' && isPathAdmin) {
        await createTransactionAsync({
          type: 'TRANSFER',
          payload: {
            product_id: product.product_id,
            quantity: Number(quantity),
            from_owner_type: fromType,
            from_owner_id: fromId,
            to_owner_type: 'STORE',
            to_owner_id: toId,
            remarks: remarks || 'Direct stock reallocation executed from Performance Insights'
          }
        });
      } else if (isPathAdmin) {
        await createAdminRequestAsync({
          product_id: product.product_id,
          quantity: Number(quantity),
          from_owner_type: fromType,
          from_owner_id: fromId,
          to_owner_type: 'STORE',
          to_owner_id: toId,
          remarks: remarks || undefined
        });
      } else {
        await createManagerRequestAsync({
          product_id: product.product_id,
          quantity: Number(quantity),
          from_owner_type: fromType,
          from_owner_id: fromId,
          remarks: remarks || undefined
        });
      }

      setTransferModal({
        isOpen: false,
        recommendation: null,
        product: null,
        transferMode: isPathAdmin ? 'DIRECT' : 'REQUEST',
        sourceOwnerType: 'STORE',
        sourceOwnerId: '',
        targetStoreId: isPathAdmin ? '' : (managerStoreId || ''),
        quantity: 1,
        remarks: ""
      });
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  // Execute Bulk Reallocations / Requests
  const handleExecuteBulkReallocations = async () => {
    const itemsToExecute = allReallocItems.filter(p => selectedBulkItems.includes(p.product_id));
    if (!itemsToExecute.length) return;

    setIsBulkExecuting(true);
    let successCount = 0;
    try {
      for (const prod of itemsToExecute) {
        const rec = prod.transfer_recommendations[0];
        if (!rec) continue;

        const isHQ = rec.source_store_name.includes("HQ") || rec.source_store_name.includes("Warehouse");
        const fromType = isHQ ? 'ADMIN' : 'STORE';

        if (isPathAdmin) {
          await createTransactionAsync({
            type: 'TRANSFER',
            payload: {
              product_id: prod.product_id,
              quantity: Number(rec.recommended_qty),
              from_owner_type: fromType,
              from_owner_id: rec.source_store_id,
              to_owner_type: 'STORE',
              to_owner_id: rec.target_store_id,
              remarks: 'Bulk automated stock reallocation'
            }
          });
        } else {
          await createManagerRequestAsync({
            product_id: prod.product_id,
            quantity: Number(rec.recommended_qty),
            from_owner_type: fromType,
            from_owner_id: rec.source_store_id,
            remarks: 'Bulk automated stock reallocation request'
          });
        }
        successCount++;
      }
      toast.success(
        isPathAdmin
          ? `Successfully processed ${successCount} stock reallocation(s).`
          : `Successfully submitted ${successCount} stock request(s).`
      );
      setBulkReallocModalOpen(false);
      refetch();
    } catch (err) {
      console.error(err);
      toast.error("Some requests failed to execute.");
    } finally {
      setIsBulkExecuting(false);
    }
  };

  const fmtCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!items.length) return;
    const headers = ["Product Name", "SKU", "Category", "Brand", "Selling Price", "Cost Price", "Unit Margin", "Margin %", "Units Sold", "Total Revenue", "Velocity Status", "Stock Level"];
    const rows = items.map(p => [
      `"${p.product_name.replace(/"/g, '""')}"`,
      `"${p.sku}"`,
      `"${p.category_name}"`,
      `"${p.brand_name || ''}"`,
      p.selling_price,
      p.cost_price,
      p.unit_margin,
      `${p.margin_percent}%`,
      p.total_units_sold,
      p.total_revenue,
      p.velocity_status,
      p.total_stock_level
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Product_Performance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Velocity status badge helper matching app-wide pill badges
  const renderVelocityBadge = (status) => {
    switch (status) {
      case 'FAST_MOVER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Fast Mover
          </span>
        );
      case 'OUT_OF_STOCK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Out of Stock
          </span>
        );
      case 'STEADY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-3.5 h-3.5 text-emerald-600" /> Steady Demand
          </span>
        );
      case 'SLOW_MOVER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600 rotate-180" /> Slow Mover
          </span>
        );
      case 'DEAD_STOCK':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <Archive className="w-3.5 h-3.5 text-slate-400" /> Zero Movement
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans overflow-x-hidden">
      
      {/* Breadcrumb + Header Block */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 space-x-2">
          <Link to={buildPath('dashboard')} className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-semibold">Product Performance</span>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight">
              Product Performance Insights
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm sm:text-base">
              {isPathAdmin
                ? "Multi-branch sales revenue matrix, demand divergence across stores, profit margins & stock re-allocation."
                : "Cross-branch sales performance analytics, stock levels, and store stock request system."}
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={() => setAnalyticsModalOpen(true)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4 text-slate-500" /> Category List
            </button>
            <button
              onClick={handleExportCSV}
              disabled={!items.length}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-slate-500" /> Export CSV
            </button>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Standard KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {/* Total Product Revenue */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-100 bg-white shadow-sm flex items-center justify-between gap-3">
          <div>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 mb-1">Total Product Revenue</p>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">{fmtCurrency(summaryKpis.total_revenue)}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Total Units Sold */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-100 bg-white shadow-sm flex items-center justify-between gap-3">
          <div>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 mb-1">Total Units Sold</p>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              {(summaryKpis.total_units_sold || 0).toLocaleString()} <span className="text-xs text-slate-400 font-bold">units</span>
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* Top Performing Item */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-100 bg-white shadow-sm flex items-center justify-between gap-3">
          <div className="max-w-[150px] sm:max-w-[180px]">
            <p className="text-xs sm:text-sm font-semibold text-slate-500 mb-1">Top Performing Item</p>
            <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight truncate">{summaryKpis.top_product_name || 'No Sales Yet'}</h3>
            <p className="text-xs font-bold text-amber-600 mt-0.5">{summaryKpis.top_product_revenue ? fmtCurrency(summaryKpis.top_product_revenue) : '₹0'}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
        </div>

        {/* Stock Reallocations / Requests */}
        <div
          onClick={() => summaryKpis.reallocation_opportunities_count > 0 && setBulkReallocModalOpen(true)}
          className={`p-4 sm:p-5 rounded-2xl border border-slate-100 bg-white shadow-sm flex items-center justify-between gap-3 ${
            summaryKpis.reallocation_opportunities_count > 0 ? 'cursor-pointer hover:border-indigo-300' : ''
          }`}
        >
          <div>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 mb-1">
              {isPathAdmin ? "Stock Reallocations" : "Stock Request Items"}
            </p>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              {summaryKpis.reallocation_opportunities_count || 0}
              {summaryKpis.reallocation_opportunities_count > 0 && (
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Actionable</span>
              )}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center flex-shrink-0">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Select Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        
        {/* Branch, Category and Sort Selectors */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
          {showStoreSwitcher && (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <Store className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-600">Branch:</span>
              <div className="relative w-40">
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white appearance-none pr-8"
                >
                  <option value="">All Branches</option>
                  {stores.filter(s => s.id !== 'admin' && s.store_name !== 'All Store').map(s => (
                    <option key={s.id} value={s.id}>{s.store_name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Category Selector */}
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <Layers className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-600">Category:</span>
            <div className="relative w-40">
              <select
                value={selectedCatId}
                onChange={(e) => setSelectedCatId(e.target.value)}
                className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white appearance-none pr-8"
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-600">Sort By:</span>
            <div className="relative w-48">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white appearance-none pr-8 cursor-pointer"
              >
                <option value="revenue_desc">Highest Revenue</option>
                <option value="sales_desc">Units Sold (High → Low)</option>
                <option value="margin_desc">Profit Margin %</option>
                <option value="sales_asc">Slowest Moving</option>
                <option value="stock_desc">Highest Stock</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md w-full">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name or SKU..."
            className="w-full pl-10 pr-9 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white transition-all placeholder:text-slate-400 shadow-xs"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Date Preset Tabs & Custom Date Range Filter */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
          {[
            { key: 'all', label: 'All Time' },
            { key: 'this_month', label: 'This Month' },
            { key: 'last_30_days', label: 'Last 30 Days' },
            { key: 'last_90_days', label: 'Last 90 Days' },
            { key: 'this_year', label: 'This Year' },
            { key: 'custom', label: '📅 Custom Date Range' }
          ].map(f => {
            const isActive = dateRangePreset === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setDateRangePreset(f.key)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap border cursor-pointer ${
                  isActive
                    ? 'bg-slate-950 text-white border-slate-950 shadow-sm shadow-slate-950/20'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Custom Date Range Picker Inputs */}
        {dateRangePreset === 'custom' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Start Date:</span>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-600 whitespace-nowrap">End Date:</span>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-2xs"
                />
              </div>
            </div>

            {(customDateFrom || customDateTo) && (
              <button
                type="button"
                onClick={() => {
                  setCustomDateFrom('');
                  setCustomDateTo('');
                  setDateRangePreset('all');
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Clear Custom Dates
              </button>
            )}
          </div>
        )}
      </div>

      {/* Data Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
          <p className="text-slate-500 text-sm mt-4">Loading performance insights...</p>
        </div>
      ) : isError ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
          <h3 className="text-base font-bold text-slate-900 mb-1">Failed to load performance data</h3>
          <p className="text-slate-500 text-sm">Please refresh the page or try again later.</p>
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <Archive className="w-6 h-6 text-slate-300" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No products found</h3>
          <p className="text-slate-500 text-sm mb-4">Try clearing or adjusting your branch, category, or date filters.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-semibold">
                    <th className="px-5 py-3.5">Product & SKU</th>
                    <th className="px-5 py-3.5">Pricing & Margin</th>
                    <th className="px-5 py-3.5">Sales & Revenue</th>
                    <th className="px-5 py-3.5">Store Stock & Sales</th>
                    <th className="px-5 py-3.5">Demand Velocity</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                  {sortedItems.map((prod) => (
                    <tr
                      key={prod.product_id}
                      onClick={() => setSelectedProductDetail(prod)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      {/* Product & SKU */}
                      <td className="px-5 py-4 whitespace-nowrap min-w-[200px]">
                        <div className="font-bold text-slate-900 hover:text-emerald-600 transition-colors">
                          {prod.product_name}
                        </div>
                        <div className="font-mono text-xs text-slate-400 font-semibold mt-0.5">{prod.sku}</div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-bold">{prod.category_name}</span>
                          {prod.brand_name && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs font-bold border border-emerald-100">{prod.brand_name}</span>
                          )}
                        </div>
                      </td>

                      {/* Pricing & Margin */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-slate-900 font-bold">{fmtCurrency(prod.selling_price)}</div>
                        <div className="text-xs text-slate-400 mt-0.5">Cost: {fmtCurrency(prod.cost_price)}</div>
                        <div className="text-xs font-bold text-emerald-600 mt-1">Margin: {prod.margin_percent}%</div>
                      </td>

                      {/* Sales & Revenue */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-base font-black text-slate-900">{fmtCurrency(prod.total_revenue)}</div>
                        <div className="text-xs font-bold text-slate-500 mt-0.5">{prod.total_units_sold} units sold</div>
                        <div className="text-xs text-slate-400 mt-0.5">Est. Profit: <span className="text-emerald-600 font-bold">{fmtCurrency(prod.total_profit)}</span></div>
                      </td>

                      {/* Store Stock & Sales */}
                      <td className="px-5 py-4 min-w-[220px]">
                        <div className="space-y-1 max-h-[100px] overflow-y-auto pr-1">
                          {prod.store_metrics.map(m => (
                            <div key={m.store_id} className="flex justify-between text-xs p-1 bg-slate-50 rounded border border-slate-100">
                              <span className="font-semibold text-slate-600 truncate max-w-[100px]">{m.store_name}</span>
                              <span className="font-bold text-slate-800">{m.sales_count} sold ({m.stock_level} stock)</span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Demand Velocity */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {renderVelocityBadge(prod.velocity_status)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 whitespace-nowrap text-right space-y-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleOpenCompareModal(prod, e)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 border border-slate-200"
                          >
                            <Scale className="w-3.5 h-3.5 text-slate-500" /> Compare
                          </button>

                          {/* Admin: Dispatch vs Shopkeeper: Request Stock */}
                          <button
                            type="button"
                            onClick={(e) => handleSmartTransferToTopStore(prod, e)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            {isPathAdmin ? (
                              <>
                                <Zap className="w-3.5 h-3.5 text-indigo-600" /> Dispatch
                              </>
                            ) : (
                              <>
                                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" /> Request Stock
                              </>
                            )}
                          </button>
                        </div>

                        {prod.transfer_recommendations && prod.transfer_recommendations.length > 0 ? (
                          <div>
                            <button
                              type="button"
                              onClick={(e) => handleOpenTransferModal(prod.transfer_recommendations[0], prod, e)}
                              className="w-full px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1"
                            >
                              {isPathAdmin ? "Reallocate Stock" : "Request Stock"}
                            </button>
                          </div>
                        ) : prod.velocity_status === 'OUT_OF_STOCK' || prod.total_stock_level <= 1 ? (
                          <div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toast.info(`Purchase order restock feature triggered for ${prod.product_name}`);
                              }}
                              className="w-full px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1"
                            >
                              <ShoppingCart className="w-3.5 h-3.5 text-blue-600" /> Restock
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <Pagination
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            currentPage={page}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Product Detail Drawer (Portal to document.body) */}
      {selectedProductDetail && createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-end">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setSelectedProductDetail(null)} />
          <div className="relative bg-white max-w-md w-full h-full shadow-2xl overflow-y-auto z-10 p-6 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedProductDetail.product_name}</h3>
                <p className="font-mono text-xs text-slate-400 uppercase font-semibold">{selectedProductDetail.sku}</p>
              </div>
              <button
                onClick={() => setSelectedProductDetail(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase">Sales Revenue</span>
                <div className="text-lg font-black text-slate-900 mt-1">{fmtCurrency(selectedProductDetail.total_revenue)}</div>
                <div className="text-xs font-bold text-emerald-600 mt-0.5">{selectedProductDetail.total_units_sold} units sold</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase">Profit Margin</span>
                <div className="text-lg font-black text-emerald-600 mt-1">{selectedProductDetail.margin_percent}%</div>
                <div className="text-xs font-semibold text-slate-400 mt-0.5">{fmtCurrency(selectedProductDetail.unit_margin)} / unit</div>
              </div>
            </div>

            {/* Quick Actions in Drawer */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={(e) => handleOpenCompareModal(selectedProductDetail, e)}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Scale className="w-4 h-4 text-slate-600" /> Compare Stores
              </button>
              <button
                onClick={(e) => handleSmartTransferToTopStore(selectedProductDetail, e)}
                className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isPathAdmin ? (
                  <>
                    <Zap className="w-4 h-4 text-amber-300" /> Dispatch Stock
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-4 h-4 text-white" /> Request Stock
                  </>
                )}
              </button>
            </div>

            {/* Store Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Branch Breakdown</h4>
              <div className="space-y-2">
                {selectedProductDetail.store_metrics.map(m => (
                  <div key={m.store_id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs font-medium">
                    <div>
                      <div className="font-bold text-slate-800">{m.store_name}</div>
                      <div className="text-slate-400">{m.sales_count} units sold</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{fmtCurrency(m.revenue)}</div>
                      <div className="text-slate-500">{m.stock_level} in stock</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Redesigned Executive Side-by-Side Performance Comparison Modal (Portal to document.body) */}
      {compareModal.isOpen && compareModal.product && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setCompareModal(prev => ({ ...prev, isOpen: false }))} />
          <div className="relative bg-white rounded-2xl max-w-5xl w-full p-6 border border-slate-100 shadow-2xl z-10 space-y-6">
            
            {/* Header + Product Hero Summary Banner */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white flex items-center justify-center font-black text-lg shadow-md shrink-0">
                  {compareModal.product.product_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    Multi-Store Performance Matrix
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="font-extrabold text-slate-800 text-sm">{compareModal.product.product_name}</span>
                    <span className="font-mono text-xs text-slate-400 font-semibold uppercase">({compareModal.product.sku})</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-bold">{compareModal.product.category_name}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {/* View Mode Toggle */}
                <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setCompareModal(prev => ({ ...prev, viewMode: 'cards' }))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      compareModal.viewMode === 'cards'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" /> Store Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompareModal(prev => ({ ...prev, viewMode: 'table' }))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      compareModal.viewMode === 'table'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Table className="w-3.5 h-3.5" /> Table Grid
                  </button>
                </div>

                <button
                  onClick={() => setCompareModal(prev => ({ ...prev, isOpen: false }))}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Store Selection Chips Bar */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-slate-400" /> Select Stores to Compare Side-by-Side:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCompareModal(prev => ({ ...prev, selectedStoreIds: stores.map(s => s.id) }))}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    Select All ({stores.length})
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {stores.map(s => {
                  const isChecked = compareModal.selectedStoreIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setCompareModal(prev => ({
                          ...prev,
                          selectedStoreIds: isChecked
                            ? prev.selectedStoreIds.filter(id => id !== s.id)
                            : [...prev.selectedStoreIds, s.id]
                        }));
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer ${
                        isChecked
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                      <span>{s.store_name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Comparison Display: Store Cards vs Table */}
            {compareModal.viewMode === 'cards' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[380px] overflow-y-auto pr-1">
                {stores
                  .filter(s => compareModal.selectedStoreIds.includes(s.id))
                  .map(s => {
                    const m = compareModal.product.store_metrics.find(x => x.store_id === s.id);
                    const sales = m ? m.sales_count : 0;
                    const rev = m ? m.revenue : 0;
                    const stock = m ? m.stock_level : 0;

                    const maxSales = Math.max(...compareModal.product.store_metrics.map(x => x.sales_count), 1);
                    const salesPercent = Math.min(100, Math.round((sales / maxSales) * 100));

                    const isTopPerformer = sales > 0 && sales === maxSales;
                    const isLowStock = stock <= 1;
                    const isOverstocked = sales === 0 && stock >= 5;

                    return (
                      <div
                        key={s.id}
                        className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 bg-white shadow-sm ${
                          isTopPerformer
                            ? 'border-emerald-300 ring-2 ring-emerald-500/10'
                            : isOverstocked
                            ? 'border-amber-200'
                            : 'border-slate-100'
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Store Card Header */}
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2">
                              <Store className="w-4 h-4 text-slate-400" />
                              <span className="font-bold text-sm text-slate-900">{s.store_name}</span>
                            </div>
                            {isTopPerformer ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-extrabold">
                                🏆 Top Sales
                              </span>
                            ) : isLowStock ? (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md text-[10px] font-extrabold">
                                ⚡ Low Stock
                              </span>
                            ) : isOverstocked ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-extrabold">
                                ❄️ Overstocked
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                                Balanced
                              </span>
                            )}
                          </div>

                          {/* Sales Volume Meter */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-slate-500">Sales Volume</span>
                              <span className="text-slate-900">{sales} units</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${salesPercent}%` }}
                              />
                            </div>
                          </div>

                          {/* Revenue & Stock Summary */}
                          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Revenue</span>
                              <span className="font-black text-emerald-600 text-sm">{fmtCurrency(rev)}</span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Stock</span>
                              <span className={`font-black text-sm ${stock <= 1 ? 'text-rose-600' : 'text-slate-900'}`}>
                                {stock} units
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Per-Store Transfer Dispatch (Admin) vs Request (Shopkeeper) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            setTransferModal({
                              isOpen: true,
                              recommendation: {
                                source_store_id: isPathAdmin ? (user?.admin_id || user?.id || 1) : s.id,
                                source_store_name: isPathAdmin ? "Admin Central Warehouse (HQ)" : s.store_name,
                                target_store_id: isPathAdmin ? s.id : (managerStoreId || 1),
                                target_store_name: isPathAdmin ? s.store_name : "My Store Branch",
                                recommended_qty: 1
                              },
                              product: compareModal.product,
                              transferMode: isPathAdmin ? 'DIRECT' : 'REQUEST',
                              sourceOwnerType: isPathAdmin ? 'ADMIN' : 'STORE',
                              sourceOwnerId: isPathAdmin ? (user?.admin_id || user?.id || 1) : s.id,
                              targetStoreId: isPathAdmin ? s.id : (managerStoreId || 1),
                              quantity: 1,
                              remarks: isPathAdmin
                                ? `Targeted stock dispatch to ${s.store_name}`
                                : `Stock request order for ${compareModal.product.product_name} from ${s.store_name}`
                            });
                            setCompareModal(prev => ({ ...prev, isOpen: false }));
                          }}
                          className="w-full py-2 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-xl text-xs font-bold border border-slate-200 hover:border-indigo-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {isPathAdmin ? (
                            <>
                              <Zap className="w-3.5 h-3.5 text-indigo-600" /> Dispatch Stock Here
                            </>
                          ) : (
                            <>
                              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" /> Request Stock From This Branch
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
              </div>
            ) : (
              /* Compact Comparison Table View */
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500">
                      <th className="px-4 py-3">Metrics</th>
                      {stores
                        .filter(s => compareModal.selectedStoreIds.includes(s.id))
                        .map(s => (
                          <th key={s.id} className="px-4 py-3 text-center">{s.store_name}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    <tr>
                      <td className="px-4 py-3 font-bold bg-slate-50/50">Units Sold</td>
                      {stores
                        .filter(s => compareModal.selectedStoreIds.includes(s.id))
                        .map(s => {
                          const m = compareModal.product.store_metrics.find(x => x.store_id === s.id);
                          return (
                            <td key={s.id} className="px-4 py-3 text-center font-bold text-slate-900">
                              {m ? m.sales_count : 0} units
                            </td>
                          );
                        })}
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold bg-slate-50/50">Revenue</td>
                      {stores
                        .filter(s => compareModal.selectedStoreIds.includes(s.id))
                        .map(s => {
                          const m = compareModal.product.store_metrics.find(x => x.store_id === s.id);
                          return (
                            <td key={s.id} className="px-4 py-3 text-center font-bold text-emerald-600">
                              {fmtCurrency(m ? m.revenue : 0)}
                            </td>
                          );
                        })}
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold bg-slate-50/50">Current Stock</td>
                      {stores
                        .filter(s => compareModal.selectedStoreIds.includes(s.id))
                        .map(s => {
                          const m = compareModal.product.store_metrics.find(x => x.store_id === s.id);
                          const stock = m ? m.stock_level : 0;
                          return (
                            <td key={s.id} className={`px-4 py-3 text-center font-bold ${stock <= 1 ? 'text-rose-600' : 'text-slate-900'}`}>
                              {stock} units
                            </td>
                          );
                        })}
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold bg-slate-50/50">Performance Status</td>
                      {stores
                        .filter(s => compareModal.selectedStoreIds.includes(s.id))
                        .map(s => {
                          const m = compareModal.product.store_metrics.find(x => x.store_id === s.id);
                          const sales = m ? m.sales_count : 0;
                          const stock = m ? m.stock_level : 0;
                          let badge = <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">Balanced</span>;
                          if (sales >= 5 && stock <= 2) {
                            badge = <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">🏆 Top Performer</span>;
                          } else if (sales === 0 && stock >= 5) {
                            badge = <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">❄️ Overstocked</span>;
                          }
                          return (
                            <td key={s.id} className="px-4 py-3 text-center">
                              {badge}
                            </td>
                          );
                        })}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Smart Action Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500">
                {isPathAdmin
                  ? "1-Click dispatch pairs top-performing store with overstocked branch or HQ."
                  : "Compare branch performance & submit a stock request for high-demand items."}
              </span>
              <button
                onClick={(e) => {
                  handleSmartTransferToTopStore(compareModal.product, e);
                  setCompareModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {isPathAdmin ? (
                  <>
                    <Zap className="w-4 h-4 text-amber-300" /> Dispatch Stock to Top Store
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-4 h-4 text-white" /> Request Stock Order
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Stock Transfer / Request Modal (Portal to document.body) */}
      {transferModal.isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setTransferModal(prev => ({ ...prev, isOpen: false }))} />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 border border-slate-100 shadow-xl z-10 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
                {isPathAdmin
                  ? (transferModal.transferMode === 'DIRECT' ? "Direct Stock Transfer & Dispatch" : "Stock Reallocation Order")
                  : "Submit Stock Request Order"}
              </h3>
              <button
                onClick={() => setTransferModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Execution Mode selector only shown for Admin */}
              {isPathAdmin ? (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase">Execution Mode</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTransferModal(prev => ({ ...prev, transferMode: 'DIRECT' }))}
                      className={`p-2 rounded-xl border text-left text-xs font-bold transition-all ${
                        transferModal.transferMode === 'DIRECT'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      ⚡ Direct Transfer
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferModal(prev => ({ ...prev, transferMode: 'REQUEST' }))}
                      className={`p-2 rounded-xl border text-left text-xs font-bold transition-all ${
                        transferModal.transferMode === 'REQUEST'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      📩 Request Order
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100 flex items-center gap-2">
                  <Send className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <span className="text-xs font-bold text-indigo-900">
                    Stock Request Mode (Requires Admin/HQ Approval)
                  </span>
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-400 font-semibold uppercase">Product</span>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{transferModal.product?.product_name}</div>
                <div className="text-xs font-mono text-slate-400">{transferModal.product?.sku}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Source Select */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    {isPathAdmin ? "Source (From)" : "Source (Request From)"}
                  </label>
                  <select
                    value={`${transferModal.sourceOwnerType}:${transferModal.sourceOwnerId}`}
                    onChange={(e) => {
                      const [type, id] = e.target.value.split(':');
                      setTransferModal(prev => ({ ...prev, sourceOwnerType: type, sourceOwnerId: id }));
                    }}
                    className="w-full p-2.5 text-xs font-semibold border border-slate-200 rounded-xl bg-white"
                  >
                    <option value={`ADMIN:${user?.admin_id || user?.id || 1}`}>🏢 Admin Central Warehouse (HQ)</option>
                    {stores
                      .filter(s => isPathAdmin || String(s.id) !== String(transferModal.targetStoreId))
                      .map(s => (
                        <option key={s.id} value={`STORE:${s.id}`}>🏪 {s.store_name}</option>
                      ))}
                  </select>
                </div>

                {/* Destination: Selectable for Admin, Locked to Own Store for Manager */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Destination (To)
                  </label>
                  {isPathAdmin ? (
                    <select
                      value={transferModal.targetStoreId}
                      onChange={(e) => setTransferModal(prev => ({ ...prev, targetStoreId: e.target.value }))}
                      className="w-full p-2.5 text-xs font-semibold border border-slate-200 rounded-xl bg-white"
                    >
                      <option value="">Select Target Store</option>
                      {stores.map(s => (
                        <option key={s.id} value={s.id}>🏪 {s.store_name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full p-2.5 text-xs font-bold border border-slate-200 rounded-xl bg-slate-100 text-slate-700 flex items-center gap-1.5 cursor-not-allowed">
                      <Store className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="truncate">
                        {stores.find(s => String(s.id) === String(transferModal.targetStoreId))?.store_name || "My Store Branch"} (Your Store)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Request Quantity</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTransferModal(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={transferModal.quantity}
                    onChange={(e) => setTransferModal(prev => ({ ...prev, quantity: Math.max(1, Number(e.target.value)) }))}
                    className="flex-1 text-center font-bold text-sm p-2 border border-slate-200 rounded-xl bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setTransferModal(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] font-bold text-slate-400">Presets:</span>
                  {[1, 2, 5, 10].map(qty => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setTransferModal(prev => ({ ...prev, quantity: qty }))}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        transferModal.quantity === qty
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {qty} units
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Remarks</label>
                <textarea
                  rows="2"
                  value={transferModal.remarks}
                  onChange={(e) => setTransferModal(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full text-xs font-medium p-2.5 border border-slate-200 rounded-xl bg-white resize-none"
                  placeholder="Optional remarks explaining stock request..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setTransferModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSendTransferRequest}
                disabled={isCreatingTransaction || isCreatingManagerRequest || isCreatingAdminRequest}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {(isCreatingTransaction || isCreatingManagerRequest || isCreatingAdminRequest) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isPathAdmin
                  ? (transferModal.transferMode === 'DIRECT' ? `Confirm Instant Dispatch (${transferModal.quantity})` : `Submit Reallocation Order (${transferModal.quantity})`)
                  : `Submit Stock Request (${transferModal.quantity})`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Bulk Stock Reallocation / Request Modal (Portal to document.body) */}
      {bulkReallocModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setBulkReallocModalOpen(false)} />
          <div className="relative bg-white rounded-2xl max-w-xl w-full p-6 border border-slate-100 shadow-xl z-10 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                {isPathAdmin ? "Automated Bulk Reallocation Center" : "Bulk Stock Request Center"}
              </h3>
              <button onClick={() => setBulkReallocModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
              {allReallocItems.map(p => {
                const rec = p.transfer_recommendations[0];
                const isSelected = selectedBulkItems.includes(p.product_id);
                return (
                  <div
                    key={p.product_id}
                    onClick={() => {
                      setSelectedBulkItems(prev =>
                        isSelected ? prev.filter(id => id !== p.product_id) : [...prev, p.product_id]
                      );
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-100 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      <div>
                        <div className="text-xs font-bold text-slate-900">{p.product_name}</div>
                        <div className="text-[10px] text-slate-500">{rec.reason}</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                      {rec.recommended_qty} units
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500">{selectedBulkItems.length} items selected</span>
              <div className="flex gap-2">
                <button onClick={() => setBulkReallocModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 border rounded-xl">
                  Cancel
                </button>
                <button
                  onClick={handleExecuteBulkReallocations}
                  disabled={!selectedBulkItems.length || isBulkExecuting}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isBulkExecuting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isPathAdmin ? "Execute Reallocations" : "Submit Stock Requests"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Category List Modal (Portal to document.body) */}
      {analyticsModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setAnalyticsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-100 shadow-xl z-10 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" /> Category & Brand References
              </h3>
              <button onClick={() => setAnalyticsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 max-h-[350px] overflow-y-auto">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Categories</h4>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map(c => (
                    <div key={c.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-800">
                      {c.name} <span className="text-slate-400 font-normal">(#{c.id})</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Brands</h4>
                <div className="grid grid-cols-2 gap-2">
                  {brands.map(b => (
                    <div key={b.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-800">
                      {b.name} <span className="text-slate-400 font-normal">(#{b.id})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button onClick={() => setAnalyticsModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl">
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ProductPerformance;
