import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Layers,
  Search,
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  User,
  ExternalLink,
  DollarSign,
  Tag,
  Store,
  ChevronRight,
  Download
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../lib/axios';
import Pagination from '../../components/shared/Pagination';
import InventoryDetailDrawer from '../../components/admin/InventoryDetailDrawer';
import { useStoreStore, useAuthStore } from '../../store/store';
import { useRoleContext } from '../../hooks/useRoleContext';
import { getInventoryBatchesApi, getInventoryApi } from '../../api/inventory/inventory.api';
import PermissionGuard from '../../components/shared/PermissionGuard';
import { downloadBarcodePdf } from '../../api/inventory/productUnits.api';

const ITEMS_PER_PAGE = 10;

const StatusBadge = ({ status, isTransferred, transferredTo }) => {
  if (isTransferred) {
    return (
      <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-xs font-bold border text-violet-700 bg-violet-50 border-violet-200 shadow-sm">
        <Store className="w-3.5 h-3.5 flex-shrink-0" />
        Transferred to {transferredTo || 'Store'}
      </span>
    );
  }

  const configs = {
    AVAILABLE: { text: 'Available', style: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    SOLD: { text: 'Sold', style: 'text-rose-700 bg-rose-50 border-rose-200' },
    DAMAGED: { text: 'Damaged', style: 'text-amber-700 bg-amber-50 border-amber-200' },
    IN_REPAIR: { text: 'In Repair', style: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
    LOST: { text: 'Lost', style: 'text-slate-600 bg-slate-100 border-slate-300' },
    RESERVED: { text: 'Reserved', style: 'text-orange-700 bg-orange-50 border-orange-200' },
    DEADSTOCK: { text: 'Deadstock', style: 'text-rose-600 bg-rose-50 border-rose-200' },
    EXCHANGED: { text: 'Exchanged', style: 'text-teal-700 bg-teal-50 border-teal-200' }
  };

  const config = configs[status] || { text: status, style: 'text-slate-600 bg-slate-50 border-slate-200' };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${config.style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {config.text}
    </span>
  );
};

const SourceTypeBadge = ({ source }) => {
  const labels = {
    PURCHASE_ORDER: 'Purchase Order',
    MANUAL_ADD: 'Manual Add',
    TRANSFER_IN: 'Transfer In',
    RETURN: 'Returned',
    EXCHANGE_IN: 'Exchange In'
  };
  return (
    <span className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-155 px-2 py-0.5 rounded-lg">
      {labels[source] || source}
    </span>
  );
};

const ManageUnits = () => {
  const { productId, storeId: urlStoreId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { stores } = useStoreStore();
  const { isPathAdmin, buildPath, storeId: contextStoreId } = useRoleContext();

  const storeId = urlStoreId || contextStoreId;

  const [loadingHeader, setLoadingHeader] = useState(true);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [error, setError] = useState(null);

  // States
  const [inventoryItem, setInventoryItem] = useState(null);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [units, setUnits] = useState([]);

  // Search, filtering & pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeStatusFilters, setActiveStatusFilters] = useState([]);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUnits, setTotalUnits] = useState(0);

  // Selected Units Map (using SKU as unique key)
  const [selectedUnitsMap, setSelectedUnitsMap] = useState({});
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadBarcodes = async () => {
    if (!selectedBatch && Object.keys(selectedUnitsMap).length === 0) {
      toast.error('Select a batch or units first');
      return;
    }
    setIsDownloading(true);
    try {
      const selectedSkus = Object.keys(selectedUnitsMap);
      const payload = {
        product_id: parseInt(productId),
        inventory_batch_id: selectedSkus.length > 0 ? null : selectedBatch?.id,
        unit_skus: selectedSkus.length > 0 ? selectedSkus : null,
      };
      const response = await downloadBarcodePdf(payload);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const disposition = response.headers['content-disposition'];
      const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
      link.download = filenameMatch ? filenameMatch[1] : 'barcodes.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Barcode PDF downloaded (${selectedSkus.length > 0 ? selectedSkus.length + ' selected' : 'all'} units)`);
    } catch (err) {
      console.error('Download error:', err);
      toast.error(err.response?.data?.detail || 'Failed to generate barcode PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUnitSelectToggle = (unit) => {
    setSelectedUnitsMap((prev) => {
      const next = { ...prev };
      if (next[unit.unit_sku]) {
        delete next[unit.unit_sku];
      } else {
        next[unit.unit_sku] = unit;
      }
      return next;
    });
  };

  const handleStatusFilterToggle = (statusId) => {
    setCurrentPage(1);
    if (statusId === 'selected') {
      setShowSelectedOnly(true);
      setActiveStatusFilters([]);
    } else if (statusId === 'all') {
      setShowSelectedOnly(false);
      setActiveStatusFilters([]);
    } else {
      setShowSelectedOnly(false);
      setActiveStatusFilters((prev) => {
        if (prev.includes(statusId)) {
          return prev.filter((s) => s !== statusId);
        } else {
          return [...prev, statusId];
        }
      });
    }
  };

  // Filter selected units by SKU search
  const filteredSelectedUnits = useMemo(() => {
    const list = Object.values(selectedUnitsMap);
    if (!debouncedSearch) return list;
    return list.filter((u) => u.unit_sku.toLowerCase().includes(debouncedSearch.toLowerCase()));
  }, [selectedUnitsMap, debouncedSearch]);

  // Paginate selected units
  const paginatedSelectedUnits = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredSelectedUnits.slice(start, end);
  }, [filteredSelectedUnits, currentPage]);

  // Determine what data to render in the table
  const displayedUnits = useMemo(() => {
    if (showSelectedOnly) {
      return paginatedSelectedUnits;
    }
    return units;
  }, [showSelectedOnly, units, paginatedSelectedUnits]);

  // Total count for pagination
  const renderedTotalUnits = useMemo(() => {
    if (showSelectedOnly) {
      return filteredSelectedUnits.length;
    }
    return totalUnits;
  }, [showSelectedOnly, filteredSelectedUnits.length, totalUnits]);

  // loading state
  const isUnitsLoading = useMemo(() => {
    if (showSelectedOnly) return false;
    return loadingUnits;
  }, [showSelectedOnly, loadingUnits]);

  const isAllPageUnitsSelected = useMemo(() => {
    if (displayedUnits.length === 0) return false;
    return displayedUnits.every((unit) => !!selectedUnitsMap[unit.unit_sku]);
  }, [displayedUnits, selectedUnitsMap]);

  const handleSelectAllToggle = () => {
    if (isAllPageUnitsSelected) {
      // Unselect all units on the current page
      setSelectedUnitsMap((prev) => {
        const next = { ...prev };
        displayedUnits.forEach((unit) => {
          delete next[unit.unit_sku];
        });
        return next;
      });
    } else {
      // Select all units on the current page
      setSelectedUnitsMap((prev) => {
        const next = { ...prev };
        displayedUnits.forEach((unit) => {
          next[unit.unit_sku] = unit;
        });
        return next;
      });
    }
  };

  // Drawer for showing sale details
  const [detailItem, setDetailItem] = useState(null);

  // Derive ownerType and ownerId matching backend/inventory page rules
  const isLocAdmin = isPathAdmin && storeId === 'admin';
  const ownerType = isLocAdmin ? 'ADMIN' : 'STORE';
  const ownerId = isLocAdmin ? user?.id : storeId;

  // Store name for the header / details banner
  const storeName = useMemo(() => {
    if (isLocAdmin) return 'Admin Warehouse';
    const match = stores.find(s => String(s.id) === String(storeId));
    return match ? match.store_name : `Store #${storeId}`;
  }, [storeId, stores, isLocAdmin]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 450);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination on status filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatusFilters, showSelectedOnly]);

  // 1. Fetch Inventory details
  useEffect(() => {
    let active = true;
    const fetchInventory = async () => {
      setLoadingHeader(true);
      setError(null);
      try {
        const params = {
          product_id: productId,
          owner_type: ownerType,
          owner_id: ownerId,
          paginate: false
        };
        const res = await getInventoryApi(params);
        const items = Array.isArray(res) ? res : (res?.items || res?.data || []);
        if (active) {
          if (items.length > 0) {
            setInventoryItem(items[0]);
          } else {
            setError('Inventory record not found for this product and store context.');
          }
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.detail || 'Failed to load product details.');
          toast.error('Failed to load product details.');
        }
      } finally {
        if (active) setLoadingHeader(false);
      }
    };

    if (productId && ownerId) {
      fetchInventory();
    }
    return () => { active = false; };
  }, [productId, ownerType, ownerId]);

  // 2. Fetch Batches (using the inventoryItem ID)
  useEffect(() => {
    let active = true;
    const fetchBatches = async () => {
      if (!inventoryItem?.id) return;
      setLoadingBatches(true);
      try {
        const data = await getInventoryBatchesApi(inventoryItem.id);
        if (active) {
          // Sort batches: batches with available_quantity > 0 first (FIFO order by ID ascending),
          // consumed/exhausted batches (available_quantity <= 0) at the bottom (sorted by ID descending)
          const sorted = [...data].sort((a, b) => {
            const aAvail = a.available_quantity > 0;
            const bAvail = b.available_quantity > 0;
            if (aAvail && !bAvail) return -1;
            if (!aAvail && bAvail) return 1;
            if (aAvail && bAvail) {
              return a.id - b.id; // FIFO ascending
            } else {
              return b.id - a.id; // consumed descending
            }
          });
          setBatches(sorted);
          if (sorted.length > 0) {
            setSelectedBatch(sorted[0]);
          } else {
            setSelectedBatch(null);
          }
        }
      } catch (err) {
        if (active) {
          toast.error('Failed to load purchase batches.');
        }
      } finally {
        if (active) setLoadingBatches(false);
      }
    };

    fetchBatches();
    return () => { active = false; };
  }, [inventoryItem]);

  // 3. Fetch Units for the selected batch
  useEffect(() => {
    let active = true;
    const fetchUnits = async () => {
      if (showSelectedOnly) {
        return;
      }
      if (!selectedBatch?.id) {
        setUnits([]);
        setTotalUnits(0);
        setLoadingUnits(false);
        return;
      }
      setLoadingUnits(true);
      try {
        const searchParams = new URLSearchParams();
        searchParams.append('product_id', productId);
        searchParams.append('inventory_batch_id', String(selectedBatch.id));
        searchParams.append('owner_type', ownerType);
        searchParams.append('owner_id', String(ownerId));
        searchParams.append('skip', String((currentPage - 1) * ITEMS_PER_PAGE));
        searchParams.append('limit', String(ITEMS_PER_PAGE));
        if (debouncedSearch) {
          searchParams.append('search', debouncedSearch);
        }
        if (activeStatusFilters.length > 0) {
          activeStatusFilters.forEach((status) => {
            searchParams.append('status', status);
          });
        }
        const response = await api.get('/inventory/product-units/', { params: searchParams });
        if (active) {
          setUnits(response.data);
          const totalCount = parseInt(
            response.headers['x-total-count'] || 
            response.headers['X-Total-Count'] || 
            response.data.length, 
            10
          );
          setTotalUnits(totalCount);
        }
      } catch (err) {
        if (active) {
          toast.error('Failed to fetch serialized product units.');
        }
      } finally {
        if (active) setLoadingUnits(false);
      }
    };

    fetchUnits();
    return () => { active = false; };
  }, [productId, selectedBatch, ownerType, ownerId, currentPage, debouncedSearch, activeStatusFilters, showSelectedOnly]);

  const handleBack = () => {
    navigate(buildPath('inventory'));
  };

  const openSaleDetail = (saleId) => {
    if (saleId) {
      setDetailItem({ id: saleId, type: 'sales' });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-slate-50 flex flex-col gap-6">
      {/* ── Breadcrumb & Navigation ── */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Link to={buildPath('dashboard')} className="hover:text-slate-700 transition-colors">Dashboard</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to={buildPath('inventory')} className="hover:text-slate-700 transition-colors">Inventory</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-700">Manage Units</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all shadow-sm focus:outline-none"
            title="Go back to Inventory"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-5.5 h-5.5 text-violet-600" />
              Manage Serialized Units
            </h1>
            <p className="text-xs text-slate-500 font-bold mt-0.5">
              Viewing batch stock tracking for store: <span className="text-violet-750 font-black">{storeName}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Error State ── */}
      {error && (
        <div className="bg-white border border-dashed border-red-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
          <h3 className="text-base font-bold text-red-700 mb-1">Failed to load details</h3>
          <p className="text-red-500 text-sm max-w-md">{error}</p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-slate-950 text-white rounded-xl text-sm font-bold shadow hover:bg-slate-800 transition-all"
          >
            Return to Inventory
          </button>
        </div>
      )}

      {/* ── Main Details Grid ── */}
      {!error && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Header Summary Banner */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {loadingHeader ? (
              <div className="flex items-center gap-2 text-slate-400 py-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-semibold">Loading product metadata...</span>
              </div>
            ) : inventoryItem ? (
              <>
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                      {inventoryItem.category}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-100">
                      {inventoryItem.subcategory}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    {inventoryItem.product_name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-0.5 text-xs text-slate-400 font-semibold">
                    <span>Brand: <strong className="text-slate-600 font-black">{inventoryItem.brand}</strong></span>
                    <span>SKU: <strong className="text-slate-600 font-mono">{inventoryItem.sku}</strong></span>
                    <span>Supplier: <strong className="text-slate-600">{inventoryItem.supplier || 'N/A'}</strong></span>
                  </div>
                </div>
                <div className="flex items-center gap-6 sm:border-l border-slate-100 sm:pl-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Quantity</span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900">{inventoryItem.quantity} units</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Selling Price</span>
                    <span className="text-xl sm:text-2xl font-black text-slate-950">₹{Number(inventoryItem.selling_price || 0).toLocaleString()}</span>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Left Panel: Batches Sidebar */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col gap-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                <span>Purchase Batches</span>
                <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
                  {batches.length}
                </span>
              </h3>

              {loadingBatches ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
                  <span className="text-xs font-semibold">Loading batches...</span>
                </div>
              ) : batches.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl">
                  No batches found
                </div>
              ) : (
                <div className="py-1.5 px-1 flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-1">
                  {batches.map((batch) => {
                    const isSelected = selectedBatch?.id === batch.id && !showSelectedOnly;
                    const isConsumed = batch.available_quantity <= 0;
                    const isCurrent = batch.status === 'Current';
                    const isNext = batch.status === 'Next';
                    
                    return (
                      <button
                        key={batch.id}
                        onClick={() => {
                          setSelectedBatch(batch);
                          setCurrentPage(1);
                        }}
                        className={`text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1.5 focus:outline-none ${
                          isSelected
                            ? 'bg-violet-600/5 border-violet-500 shadow-sm ring-1 ring-violet-500/20'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-mono text-xs font-bold text-slate-800">
                            Batch #{batch.id}
                          </span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            isConsumed
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : isCurrent
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : isNext
                                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                  : 'bg-slate-50 text-slate-700 border border-slate-150'
                          }`}>
                            {isConsumed ? 'Consumed' : batch.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold">
                          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{batch.purchase_date ? new Date(batch.purchase_date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold">
                          <User className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{batch.supplier_name}</span>
                        </div>
                        <div className="border-t border-slate-100/60 mt-1 pt-2 flex items-center justify-between w-full text-xs">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Cost Price</span>
                            <span className="font-bold text-slate-800">₹{Number(batch.purchase_cost || 0).toLocaleString()}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Units Left</span>
                            <span className={`font-black ${isConsumed ? 'text-slate-400' : 'text-slate-800'}`}>
                              {batch.available_quantity} / {batch.initial_quantity}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Unit Table */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-sm flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    Serialized Unit List
                    {showSelectedOnly ? (
                      <span className="text-xs text-violet-700 font-bold bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
                        Selected Cross-Batch View
                      </span>
                    ) : selectedBatch ? (
                      <span className="font-mono text-xs text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded border">
                        Batch #{selectedBatch.id}
                      </span>
                    ) : null}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Browse all individual unit items and check their current status parameters.
                  </p>
                </div>
                {/* Search Bar & Download */}
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-56">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
                      placeholder="Search by Unit SKU..."
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 text-slate-700 placeholder-slate-400 rounded-xl text-xs font-semibold focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 shadow-sm focus:outline-none"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                  <PermissionGuard permission="inventory:read">
                    <button
                      onClick={handleDownloadBarcodes}
                      disabled={isDownloading || (!selectedBatch && Object.keys(selectedUnitsMap).length === 0)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all duration-200 shadow-sm whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed bg-slate-900 text-white border-slate-800 hover:bg-slate-800 active:scale-[0.97]"
                    >
                      {isDownloading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      {Object.keys(selectedUnitsMap).length > 0
                        ? `Download Selected (${Object.keys(selectedUnitsMap).length})`
                        : 'Download Barcodes'
                      }
                    </button>
                  </PermissionGuard>
                </div>
              </div>

              {/* Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: 'All Statuses' },
                  { id: 'AVAILABLE', label: 'Available' },
                  { id: 'SOLD', label: 'Sold' },
                  { id: 'DAMAGED', label: 'Damaged' },
                  { id: 'IN_REPAIR', label: 'In Repair' },
                  { id: 'LOST', label: 'Lost' },
                  { id: 'RESERVED', label: 'Reserved' },
                  { id: 'TRANSFERRED', label: 'Transferred' },
                  { id: 'DEADSTOCK', label: 'Deadstock' },
                  { id: 'EXCHANGED', label: 'Exchanged' },
                  { id: 'selected', label: `Selected Units (${Object.keys(selectedUnitsMap).length})`, isSpecial: true }
                ].map((pill) => {
                  const isActive = pill.id === 'selected'
                    ? showSelectedOnly
                    : pill.id === 'all'
                      ? !showSelectedOnly && activeStatusFilters.length === 0
                      : !showSelectedOnly && activeStatusFilters.includes(pill.id);

                  return (
                    <button
                      key={pill.id}
                      onClick={() => handleStatusFilterToggle(pill.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        isActive
                          ? pill.isSpecial 
                            ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                            : 'bg-slate-900 border-slate-900 text-white shadow-sm'
                          : pill.isSpecial
                            ? 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 hover:border-violet-300 animate-pulse'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>

              {/* Units Table */}
              {isUnitsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                  <span className="text-sm font-semibold">Fetching batch units...</span>
                </div>
              ) : displayedUnits.length === 0 ? (
                <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
                  <Tag className="w-8 h-8 text-slate-300 mb-3" />
                  <h4 className="text-sm font-bold text-slate-900">No units found</h4>
                  <p className="text-slate-500 text-xs mt-1">
                    No serialized product units match your search or selection filters.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl shadow-sm">
                  <table className="w-full text-left border-collapse min-w-[750px]">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="py-3 px-4 w-12 text-center">
                          <input
                            type="checkbox"
                            checked={isAllPageUnitsSelected}
                            onChange={handleSelectAllToggle}
                            className="w-4 h-4 text-violet-600 bg-white border-slate-300 rounded focus:ring-violet-500/20 cursor-pointer"
                          />
                        </th>
                        <th className="py-3 px-4">Unit SKU</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Invoice / Reference</th>
                        <th className="py-3 px-4">Manufacturer Serial</th>
                        <th className="py-3 px-4">Created At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                      {displayedUnits.map((unit) => {
                        const isSold = unit.status === 'SOLD';
                        const isRepair = unit.status === 'IN_REPAIR';

                        return (
                          <tr key={unit.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-4 w-12 text-center">
                              <input
                                type="checkbox"
                                checked={!!selectedUnitsMap[unit.unit_sku]}
                                onChange={() => handleUnitSelectToggle(unit)}
                                className="w-4 h-4 text-violet-600 bg-white border-slate-300 rounded focus:ring-violet-500/20 cursor-pointer"
                              />
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                              {unit.unit_sku}
                            </td>
                            <td className="py-3.5 px-4">
                              <StatusBadge 
                                status={unit.status} 
                                isTransferred={(unit.owner_type !== ownerType) || (String(unit.owner_id) !== String(ownerId))}
                                transferredTo={unit.owner_type === 'ADMIN' ? 'Admin Warehouse' : unit.transferred_to_store_name}
                              />
                            </td>
                            <td className="py-3.5 px-4">
                              {isSold && unit.invoice_number ? (
                                <button
                                  onClick={() => openSaleDetail(unit.sale_id)}
                                  className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-850 hover:underline font-bold focus:outline-none"
                                >
                                  {unit.invoice_number}
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </button>
                              ) : isRepair && unit.repair_id ? (
                                <span className="text-slate-500">Repair #{unit.repair_id}</span>
                              ) : (
                                <span className="text-slate-400 font-medium">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-500 font-medium">
                              {unit.manufacturer_serial || <span className="text-slate-350">—</span>}
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 font-medium">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-300" />
                                <span>{unit.created_at ? new Date(unit.created_at).toLocaleDateString() : 'N/A'}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {!isUnitsLoading && renderedTotalUnits > ITEMS_PER_PAGE && (
                <Pagination
                  totalItems={renderedTotalUnits}
                  itemsPerPage={ITEMS_PER_PAGE}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sale Details Drawer Overlay */}
      {detailItem && (
        <InventoryDetailDrawer
          item={detailItem}
          onClose={() => setDetailItem(null)}
        />
      )}
    </div>
  );
};

export default ManageUnits;
