import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  Wrench,
  RotateCcw,
  CheckCircle2,
  DollarSign,
  Package,
  FileText,
  Search,
  Filter,
  Phone,
  Mail,
  ExternalLink,
  Copy,
  ChevronRight,
  Store,
  X,
  RefreshCw,
  Check,
  Building2,
  ArrowRight,
  Clock,
  Eye,
  Glasses,
  ArchiveX,
  MinusCircle,
  Ban
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useDamagedItems, useQCMutations, useItemQCHistory } from '../../hooks/useQC';
import { getProductsApi } from '../../api/product/product.api';
import Pagination from '../shared/Pagination';
import {
  VerifyCompleteModal,
  MarkFailedModal,
  ReopenDamageModal,
  ChangeResolutionModal,
  DamageItemHistoryModal,
} from './qc/DamageLifecycleModals';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function DamagedStockTab({
  storeId,
  showStoreSwitcher = false,
  selectedBranch = 'All',
  onBranchChange,
  stores = [],
  canUpdate = true,
}) {
  // Filters
  const [stageFilter, setStageFilter] = useState('All'); // 'All' | 'PRE_LAB' | 'POST_LAB'
  const [warrantyFilter, setWarrantyFilter] = useState('All'); // 'All' | 'IN_WARRANTY' | 'OUT_OF_WARRANTY'
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'OPEN' | 'PROMISED' | 'RESOLVED' | 'REOPENED' | 'FAILED' | 'WRITTEN_OFF'
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Modals state
  const [contactModal, setContactModal] = useState({ isOpen: false, data: null, type: 'supplier' });
  const [supplierModal, setSupplierModal] = useState({ isOpen: false, item: null });
  const [labModal, setLabModal] = useState({ isOpen: false, item: null });
  const [lossModal, setLossModal] = useState({ isOpen: false, item: null });
  const [historyItemId, setHistoryItemId] = useState(null);

  // Dynamic Lifecycle Modals state
  const [verifyModalItem, setVerifyModalItem] = useState(null);
  const [markFailedModalItem, setMarkFailedModalItem] = useState(null);
  const [reopenModalItem, setReopenModalItem] = useState(null);
  const [changeResModalItem, setChangeResModalItem] = useState(null);
  const [damageHistoryModalItem, setDamageHistoryModalItem] = useState(null);

  // Promise pending state for supplier / lab modal
  const [isPromise, setIsPromise] = useState(false);
  const [expectedDate, setExpectedDate] = useState('');

  // Supplier Resolution Form State
  // supplierResType: 'REPLACEMENT' | 'FULL_COMPENSATION' | 'PARTIAL_COMPENSATION' | 'NO_COMPENSATION' | 'MARK_AS_LOSS'
  const [supplierResType, setSupplierResType] = useState('REPLACEMENT');
  const [supplierSubtype, setSupplierSubtype] = useState('SAME_ITEM'); // 'SAME_ITEM' | 'ALT_ITEM'
  const [supplierFinMode, setSupplierFinMode] = useState('CREDIT_NOTE'); // 'CREDIT_NOTE' | 'CASH_REFUND'
  const [supplierCompAmount, setSupplierCompAmount] = useState('');
  const [supplierLossAmount, setSupplierLossAmount] = useState('');
  const [supplierLossReason, setSupplierLossReason] = useState('Vendor Refused Warranty / Rejected Claim');
  const [supplierCustomLossReason, setSupplierCustomLossReason] = useState('');
  const [supplierPoId, setSupplierPoId] = useState('');
  const [supplierResNotes, setSupplierResNotes] = useState('');
  const [altProductSearch, setAltProductSearch] = useState('');
  const [altProductsList, setAltProductsList] = useState([]);
  const [selectedAltProduct, setSelectedAltProduct] = useState(null);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);

  // Lab Resolution Form State
  // labResType: 'FULL_COMPENSATION' | 'PARTIAL_COMPENSATION' | 'REPLACEMENT' | 'NO_COMPENSATION' | 'MARK_AS_LOSS'
  const [labResType, setLabResType] = useState('FULL_COMPENSATION');
  const [labCompAmount, setLabCompAmount] = useState('');
  const [labLossAmount, setLabLossAmount] = useState('');
  const [labLossReason, setLabLossReason] = useState('Lab Disputed Liability / Refused Claim');
  const [labCustomLossReason, setLabCustomLossReason] = useState('');
  const [labResNotes, setLabResNotes] = useState('');

  // Quick Direct Mark-as-Loss Form State
  const [quickLossReason, setQuickLossReason] = useState('In-Store Breakage / Accidental Damage');
  const [quickCustomLossReason, setQuickCustomLossReason] = useState('');
  const [quickLossAmount, setQuickLossAmount] = useState('');
  const [quickLossNotes, setQuickLossNotes] = useState('');

  // Fetch damaged items
  const effectiveStoreId = selectedBranch === 'All' ? storeId : selectedBranch;
  const { items, total, pages, isLoading, isFetching, refetch } = useDamagedItems({
    storeId: effectiveStoreId,
    stage: stageFilter !== 'All' ? stageFilter : undefined,
    status: statusFilter !== 'All' ? statusFilter : undefined,
    search: searchTerm.trim() || undefined,
    page: currentPage,
    limit: 10,
  });

  const {
    resolveSupplierDamage,
    isResolvingSupplierDamage,
    resolveLabDamage,
    isResolvingLabDamage,
    markDamagedItemAsLoss,
    isMarkingLoss,
  } = useQCMutations();
  const { data: historyData = [], isLoading: isLoadingHistory } = useItemQCHistory(historyItemId);

  // Filter items by warranty if selected (client-side warranty filter)
  const filteredItems = useMemo(() => {
    if (warrantyFilter === 'All') return items;
    return items.filter((it) => {
      const isWarr = it.warranty_status && it.warranty_status.toUpperCase().includes('IN_WARRANTY');
      return warrantyFilter === 'IN_WARRANTY' ? isWarr : !isWarr;
    });
  }, [items, warrantyFilter]);

  // KPIs
  const preLabCount = useMemo(() => items.filter((i) => i.stage === 'PRE_LAB' || i.damage_type === 'STORE_STOCK_DAMAGE').length, [items]);
  const postLabCount = useMemo(() => items.filter((i) => i.stage === 'POST_LAB' || i.damage_type === 'LAB_DAMAGE').length, [items]);
  const inWarrantyCount = useMemo(() => items.filter((i) => i.warranty_status && i.warranty_status.toUpperCase().includes('IN_WARRANTY')).length, [items]);
  const openCount = useMemo(() => items.filter((i) => i.status === 'OPEN' || i.status === 'PENDING_SUPPLIER_CLAIM').length, [items]);

  // Handle product search for Alternative Item (Option 1 - Alternative)
  useEffect(() => {
    if (supplierResType !== 'REPLACEMENT' || supplierSubtype !== 'ALT_ITEM') return;
    const fetchProds = async () => {
      setIsSearchingProducts(true);
      try {
        const res = await getProductsApi({ search: altProductSearch.trim() || undefined, limit: 10 });
        setAltProductsList(Array.isArray(res) ? res : res?.items || []);
      } catch (err) {
        console.error('Error fetching products for alternative item:', err);
      } finally {
        setIsSearchingProducts(false);
      }
    };
    const timer = setTimeout(fetchProds, 300);
    return () => clearTimeout(timer);
  }, [altProductSearch, supplierResType, supplierSubtype]);

  // Open Supplier Modal
  const handleOpenSupplierModal = (item) => {
    setSupplierModal({ isOpen: true, item });
    setSupplierResType('REPLACEMENT');
    setSupplierSubtype('SAME_ITEM');
    setSupplierFinMode('CREDIT_NOTE');
    const cost = item.product_cost || item.product_price || '';
    setSupplierCompAmount(cost);
    setSupplierLossAmount('');
    setSupplierLossReason('Vendor Refused Warranty / Rejected Claim');
    setSupplierCustomLossReason('');
    setSupplierPoId('');
    setSupplierResNotes('');
    setSelectedAltProduct(null);
    setAltProductSearch('');
    setIsPromise(false);
    setExpectedDate('');
  };

  // Submit Supplier Resolution
  const handleSupplierResolutionSubmit = async (e) => {
    e.preventDefault();
    if (!supplierModal.item) return;

    let resTypePayload = supplierResType;
    let compTypePayload = null;
    let newProdId = null;
    const finalLossReason = supplierLossReason === 'Other (Specify)' ? supplierCustomLossReason.trim() : supplierLossReason;

    if (supplierResType === 'REPLACEMENT') {
      if (supplierSubtype === 'ALT_ITEM') {
        if (!selectedAltProduct) {
          toast.warning('Please select an alternative replacement product.');
          return;
        }
        resTypePayload = 'EQUIVALENT_ITEM';
        compTypePayload = 'EQUIVALENT_ITEM';
        newProdId = selectedAltProduct.id;
      } else {
        resTypePayload = 'REPLACEMENT_ITEM';
        compTypePayload = 'REPLACEMENT_ITEM';
      }
    } else if (supplierResType === 'FULL_COMPENSATION') {
      if (!supplierCompAmount || Number(supplierCompAmount) <= 0) {
        toast.warning('Please enter a valid compensation settlement amount.');
        return;
      }
      compTypePayload = supplierFinMode;
    } else if (supplierResType === 'PARTIAL_COMPENSATION') {
      if (!supplierCompAmount || Number(supplierCompAmount) <= 0) {
        toast.warning('Please enter the partial compensation amount received.');
        return;
      }
      if (!finalLossReason) {
        toast.warning('Please select or specify a reason for the written-off balance.');
        return;
      }
      compTypePayload = supplierFinMode;
    } else if (supplierResType === 'NO_COMPENSATION' || supplierResType === 'MARK_AS_LOSS') {
      if (!finalLossReason) {
        toast.warning('Please select or specify a reason for marking this item as a loss.');
        return;
      }
      compTypePayload = 'NONE';
    }

    try {
      await resolveSupplierDamage({
        damagedItemId: supplierModal.item.id,
        payload: {
          resolution_type: resTypePayload,
          compensation_type: compTypePayload,
          compensation_amount: (supplierResType === 'FULL_COMPENSATION' || supplierResType === 'PARTIAL_COMPENSATION')
            ? Number(supplierCompAmount)
            : (supplierResType === 'NO_COMPENSATION' || supplierResType === 'MARK_AS_LOSS') ? 0 : null,
          loss_reason: (supplierResType === 'PARTIAL_COMPENSATION' || supplierResType === 'NO_COMPENSATION' || supplierResType === 'MARK_AS_LOSS')
            ? finalLossReason
            : null,
          loss_amount: (supplierResType === 'PARTIAL_COMPENSATION' || supplierResType === 'NO_COMPENSATION' || supplierResType === 'MARK_AS_LOSS')
            ? (supplierLossAmount ? Number(supplierLossAmount) : null)
            : null,
          new_product_id: newProdId,
          po_id: supplierPoId ? Number(supplierPoId) : null,
          resolution_notes: supplierResNotes.trim() || undefined,
          is_promise: isPromise,
          expected_date: isPromise && expectedDate ? expectedDate : null,
        },
      });
      setSupplierModal({ isOpen: false, item: null });
      refetch();
    } catch (err) {
      // Error handled by mutation hook toast
    }
  };

  // Open Lab Modal
  const handleOpenLabModal = (item) => {
    setLabModal({ isOpen: true, item });
    setLabResType('FULL_COMPENSATION');
    const cost = item.product_cost || item.product_price || '';
    setLabCompAmount(cost);
    setLabLossAmount('');
    setLabLossReason('Lab Disputed Liability / Refused Claim');
    setLabCustomLossReason('');
    setLabResNotes('');
    setIsPromise(false);
    setExpectedDate('');
  };

  // Submit Lab Resolution
  const handleLabResolutionSubmit = async (e) => {
    e.preventDefault();
    if (!labModal.item) return;

    const finalLossReason = labLossReason === 'Other (Specify)' ? labCustomLossReason.trim() : labLossReason;

    if (labResType === 'FULL_COMPENSATION' && (!labCompAmount || Number(labCompAmount) <= 0)) {
      toast.warning('Please enter a valid claimed compensation amount.');
      return;
    }
    if (labResType === 'PARTIAL_COMPENSATION') {
      if (!labCompAmount || Number(labCompAmount) <= 0) {
        toast.warning('Please enter the partial compensation amount.');
        return;
      }
      if (!finalLossReason) {
        toast.warning('Please select or specify a loss reason for the remaining balance.');
        return;
      }
    }
    if ((labResType === 'NO_COMPENSATION' || labResType === 'MARK_AS_LOSS') && !finalLossReason) {
      toast.warning('Please select or specify a reason for marking as loss.');
      return;
    }

    try {
      await resolveLabDamage({
        damagedItemId: labModal.item.id,
        payload: {
          resolution_type: labResType,
          compensation_amount: (labResType === 'FULL_COMPENSATION' || labResType === 'PARTIAL_COMPENSATION')
            ? Number(labCompAmount)
            : (labResType === 'NO_COMPENSATION' || labResType === 'MARK_AS_LOSS') ? 0 : null,
          loss_reason: (labResType === 'PARTIAL_COMPENSATION' || labResType === 'NO_COMPENSATION' || labResType === 'MARK_AS_LOSS')
            ? finalLossReason
            : null,
          loss_amount: (labResType === 'PARTIAL_COMPENSATION' || labResType === 'NO_COMPENSATION' || labResType === 'MARK_AS_LOSS')
            ? (labLossAmount ? Number(labLossAmount) : null)
            : null,
          resolution_notes: labResNotes.trim() || undefined,
          is_promise: isPromise,
          expected_date: isPromise && expectedDate ? expectedDate : null,
        },
      });
      setLabModal({ isOpen: false, item: null });
      refetch();
    } catch (err) {
      // Error handled by mutation hook toast
    }
  };

  // Open Quick Loss Modal
  const handleOpenLossModal = (item) => {
    const isLab = item.stage === 'POST_LAB' || item.damage_type === 'LAB_DAMAGE';
    setLossModal({ isOpen: true, item });
    setQuickLossReason(isLab ? 'Lab Disputed Liability / Refused Claim' : 'In-Store Breakage / Accidental Damage');
    setQuickCustomLossReason('');
    setQuickLossAmount(item.product_cost || item.product_price || '');
    setQuickLossNotes('');
  };

  // Submit Quick Mark as Loss
  const handleQuickLossSubmit = async (e) => {
    e.preventDefault();
    if (!lossModal.item) return;

    const finalLossReason = quickLossReason === 'Other (Specify)' ? quickCustomLossReason.trim() : quickLossReason;
    if (!finalLossReason) {
      toast.warning('Please select or provide a write-off reason.');
      return;
    }

    try {
      await markDamagedItemAsLoss({
        damagedItemId: lossModal.item.id,
        payload: {
          loss_reason: finalLossReason,
          loss_amount: quickLossAmount ? Number(quickLossAmount) : null,
          resolution_notes: quickLossNotes.trim() || undefined,
        },
      });
      setLossModal({ isOpen: false, item: null });
      refetch();
    } catch (err) {
      // Error handled by mutation hook toast
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.info(`${label} copied to clipboard!`);
  };

  return (
    <div className="space-y-6">
      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center flex-shrink-0 text-rose-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Damaged</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{total}</p>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 text-amber-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Store Stock Damage</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">{preLabCount}</p>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lab Liability</p>
            <p className="text-2xl font-black text-blue-600 mt-0.5">{postLabCount}</p>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">In Warranty</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{inWarrantyCount}</p>
          </div>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {showStoreSwitcher && stores && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-slate-600 flex items-center gap-1.5 whitespace-nowrap">
                  <Store className="w-4 h-4 text-slate-400" /> Branch:
                </label>
                <div className="relative w-full sm:w-48">
                  <select
                    value={selectedBranch}
                    onChange={(e) => {
                      if (onBranchChange) onBranchChange(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 bg-white appearance-none pr-8 cursor-pointer"
                  >
                    <option value="All">All Branches</option>
                    {stores
                      .filter((s) => s.id !== 'admin' && s.store_name !== 'All Store' && s.name !== 'All Store')
                      .map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.store_name || store.name}
                        </option>
                      ))}
                  </select>
                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
                </div>
              </div>
            )}

            {/* Stage Filter */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100 text-xs font-bold">
              {[
                { id: 'All', label: 'All Stages' },
                { id: 'PRE_LAB', label: 'Pre-Lab (Store Stock)' },
                { id: 'POST_LAB', label: 'Post-Lab (Lab Damage)' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => {
                    setStageFilter(st.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    stageFilter === st.id
                      ? 'bg-white text-slate-900 shadow-sm font-extrabold border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  type="button"
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Warranty Filter */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100 text-xs font-bold">
              {[
                { id: 'All', label: 'All Warranty' },
                { id: 'IN_WARRANTY', label: 'In Warranty' },
                { id: 'OUT_OF_WARRANTY', label: 'Out of Warranty' },
              ].map((wf) => (
                <button
                  key={wf.id}
                  onClick={() => setWarrantyFilter(wf.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    warrantyFilter === wf.id
                      ? 'bg-white text-slate-900 shadow-sm font-extrabold border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  type="button"
                >
                  {wf.id === 'IN_WARRANTY' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
                  {wf.id === 'OUT_OF_WARRANTY' && <ShieldX className="w-3.5 h-3.5 text-rose-400" />}
                  <span>{wf.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search SKU, Product, Supplier, Lab, Invoice..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-9 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 bg-white transition-all placeholder:text-slate-400 shadow-sm"
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

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar border-t border-slate-100 pt-3 text-xs">
          {[
            { id: 'All', label: 'All Statuses' },
            { id: 'OPEN', label: 'Open' },
            { id: 'PROMISED', label: 'Promised (Pending)' },
            { id: 'RESOLVED', label: 'Resolved / Completed' },
            { id: 'REOPENED', label: 'Reopened' },
            { id: 'FAILED', label: 'Failed Promise' },
            { id: 'WRITTEN_OFF', label: 'Written Off (Loss)' },
          ].map((st) => {
            const isActive = statusFilter === st.id;
            return (
              <button
                key={st.id}
                onClick={() => {
                  setStatusFilter(st.id);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-xl font-bold border transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                type="button"
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Damaged Items Table ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500 mb-3"></div>
          <p className="text-slate-500 text-sm font-semibold">Loading damaged items & claims...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-center mb-4 text-emerald-500">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No damaged items found</h3>
          <p className="text-slate-500 text-sm max-w-sm">
            All order items have passed quality control inspections without issues.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-4">Product & Invoice</th>
                    <th className="px-5 py-4">Damage Classification</th>
                    <th className="px-5 py-4">Warranty Status</th>
                    <th className="px-5 py-4">Responsible Party</th>
                    <th className="px-5 py-4 text-right">Cost & Settlement</th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredItems.map((item) => {
                    const isPreLab = item.stage === 'PRE_LAB' || item.damage_type === 'STORE_STOCK_DAMAGE';
                    const isPostLab = item.stage === 'POST_LAB' || item.damage_type === 'LAB_DAMAGE';
                    const isWarranty = item.warranty_status && item.warranty_status.toUpperCase().includes('IN_WARRANTY');
                    const isPromised = item.status === 'PROMISED' || item.is_promise_pending;
                    const isResolved = item.status === 'RESOLVED' || item.status === 'RESOLVED_REPLACED' || item.status === 'RESOLVED_COMPENSATED' || item.status === 'RESOLVED_PARTIAL_COMPENSATION';
                    const isReopened = item.status === 'REOPENED';
                    const isFailed = item.status === 'FAILED';
                    const isWrittenOff = item.status === 'WRITTEN_OFF';
                    const isOpen = item.status === 'OPEN' || item.status === 'PENDING_SUPPLIER_CLAIM';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors group">
                        {/* Product & Invoice */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-600 flex items-center justify-center text-white font-extrabold text-xs shadow-sm flex-shrink-0">
                              {item.product_name ? item.product_name[0] : 'P'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors truncate max-w-[220px]">
                                {item.product_name || `Product #${item.product_id}`}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 font-bold">
                                  SKU: {item.product_sku || 'N/A'}
                                </span>
                                {item.category_name && (
                                  <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-semibold border border-blue-100">
                                    {item.category_name}
                                  </span>
                                )}
                              </div>
                              {item.invoice_number && (
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                  Order Inv: <span className="font-mono font-bold text-slate-700">{item.invoice_number}</span>
                                </p>
                              )}
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Store: <span className="font-semibold text-slate-600">{item.store_name || `Branch #${item.store_id}`}</span>
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Damage Classification */}
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            {item.damage_type === 'STORE_STOCK_DAMAGE' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border bg-rose-50 text-rose-700 border-rose-200">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Store Stock Damage
                              </span>
                            )}
                            {item.damage_type === 'LAB_DAMAGE' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200">
                                <Wrench className="w-3.5 h-3.5" />
                                Lab Damage
                              </span>
                            )}
                            {item.damage_type === 'FITTING_FAILURE' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border bg-purple-50 text-purple-700 border-purple-200">
                                <RotateCcw className="w-3.5 h-3.5" />
                                Fitting Rework #{item.rework_count}
                              </span>
                            )}
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
                              <span>Stage: <span className="font-bold text-slate-600">{item.stage}</span></span>
                              <span>•</span>
                              <span>{new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                            </div>
                          </div>
                        </td>

                        {/* Warranty Status */}
                        <td className="px-5 py-4">
                          {isWarranty ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black border bg-emerald-50 text-emerald-700 border-emerald-200">
                              <ShieldCheck className="w-4 h-4 text-emerald-600" />
                              <span>{item.warranty_status}</span>
                            </div>
                          ) : item.warranty_status && item.warranty_status.toUpperCase().includes('OUT') ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border bg-slate-100 text-slate-600 border-slate-200">
                              <ShieldX className="w-4 h-4 text-slate-400" />
                              <span>Out of Warranty</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-slate-400 bg-slate-50 border border-slate-200">
                              <span>{item.warranty_status || 'No Warranty'}</span>
                            </div>
                          )}
                          {item.warranty_months ? (
                            <p className="text-[10px] text-slate-400 font-medium mt-1">
                              Duration: {item.warranty_months} Months
                            </p>
                          ) : null}
                        </td>

                        {/* Responsible Party (Supplier or Lab) */}
                        <td className="px-5 py-4">
                          {isPreLab ? (
                            <div className="space-y-1">
                              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                {item.supplier_name || 'Generic Supplier'}
                              </p>
                              {(item.supplier_phone || item.supplier_email) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setContactModal({
                                      isOpen: true,
                                      type: 'supplier',
                                      data: {
                                        name: item.supplier_name,
                                        phone: item.supplier_phone,
                                        email: item.supplier_email,
                                      },
                                    })
                                  }
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                                >
                                  <Phone className="w-3 h-3" />
                                  Contact Supplier
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                                <Wrench className="w-3.5 h-3.5 text-slate-400" />
                                {item.lab_name || 'Processing Lab'}
                              </p>
                              {(item.lab_phone || item.lab_email) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setContactModal({
                                      isOpen: true,
                                      type: 'lab',
                                      data: {
                                        name: item.lab_name,
                                        phone: item.lab_phone,
                                        email: item.lab_email,
                                      },
                                    })
                                  }
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                                >
                                  <Phone className="w-3 h-3" />
                                  Contact Lab
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Cost & Settlement */}
                        <td className="px-5 py-4 text-right">
                          <p className="font-mono font-extrabold text-slate-900">
                            {fmt(item.product_cost || item.product_price)}
                          </p>
                          <div className="mt-1 flex flex-col items-end gap-0.5">
                            {Number(item.compensation_amount || 0) > 0 && (
                              <span className="inline-block text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                Settle: {fmt(item.compensation_amount)}
                              </span>
                            )}
                            {(Number(item.loss_amount || 0) > 0 || isWrittenOff) && (
                              <span
                                className="inline-block text-[10px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded"
                                title={item.loss_reason ? `Loss Reason: ${item.loss_reason}` : 'Written off as loss'}
                              >
                                Loss: {fmt(item.loss_amount || item.product_cost || item.product_price || 0)}
                              </span>
                            )}
                            {item.loss_reason && (
                              <span className="text-[10px] text-slate-500 font-medium truncate max-w-[170px]" title={item.loss_reason}>
                                {item.loss_reason}
                              </span>
                            )}
                            {item.compensation_type && item.compensation_type !== 'NONE' && (
                              <p className="text-[9px] font-mono text-slate-400 font-bold">
                                {item.compensation_type}
                              </p>
                            )}
                            {!item.compensation_amount && !item.loss_amount && !isWrittenOff && (
                              <p className="text-[10px] text-slate-400 font-medium">Cost Value</p>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4 text-center">
                          {isPromised ? (
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black tracking-wide uppercase bg-sky-100 text-sky-900 border border-sky-200">
                                <Clock className="w-3 h-3 text-sky-600" />
                                Promised (Pending)
                              </span>
                              {item.expected_resolution_date && (
                                <span className="text-[10px] text-sky-700 font-semibold">
                                  Due: {new Date(item.expected_resolution_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </span>
                              )}
                            </div>
                          ) : isReopened ? (
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black tracking-wide uppercase bg-amber-100 text-amber-900 border border-amber-200">
                                <RotateCcw className="w-3 h-3 text-amber-600" />
                                Reopened {item.reopen_count > 1 ? `(x${item.reopen_count})` : ''}
                              </span>
                              {item.last_reopened_reason && (
                                <span className="text-[10px] text-amber-800 font-medium truncate max-w-[130px]" title={item.last_reopened_reason}>
                                  {item.last_reopened_reason}
                                </span>
                              )}
                            </div>
                          ) : isFailed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black tracking-wide uppercase bg-rose-100 text-rose-900 border border-rose-200">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              Failed Promise
                            </span>
                          ) : isWrittenOff ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black tracking-wide uppercase bg-purple-100 text-purple-900 border border-purple-200">
                              <ArchiveX className="w-3 h-3 text-purple-700" />
                              Written Off / Loss
                            </span>
                          ) : isResolved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black tracking-wide uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Resolved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black tracking-wide uppercase bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              {item.status === 'PENDING_SUPPLIER_CLAIM' ? 'Pending Claim' : 'Open'}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                          {/* Lifecycle Audit History Button */}
                          <button
                            type="button"
                            onClick={() => setDamageHistoryModalItem(item)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                            title="View Full Resolution Lifecycle History"
                          >
                            <FileText className="w-4 h-4 inline" />
                          </button>

                          {/* Actions for PROMISED status */}
                          {canUpdate && isPromised && (
                            <>
                              <button
                                type="button"
                                onClick={() => setVerifyModalItem(item)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer inline-flex items-center gap-1"
                                title="Verify physical receipt of replacement or confirmed credit note"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Verify & Complete</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setMarkFailedModalItem(item)}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 border border-rose-200"
                                title="Vendor or lab failed to fulfill promised resolution"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Mark Failed</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setChangeResModalItem(item)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 border border-slate-200"
                                title="Change resolution terms"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                                <span>Change</span>
                              </button>
                            </>
                          )}

                          {/* Actions for RESOLVED status */}
                          {canUpdate && isResolved && (
                            <>
                              <button
                                type="button"
                                onClick={() => setReopenModalItem(item)}
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 border border-amber-200"
                                title="Reopen previously resolved claim"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                                <span>Reopen</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setChangeResModalItem(item)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 border border-slate-200"
                                title="Change resolution terms"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                                <span>Change</span>
                              </button>
                            </>
                          )}

                          {/* Actions for WRITTEN_OFF (Loss) status */}
                          {canUpdate && isWrittenOff && (
                            <>
                              <button
                                type="button"
                                onClick={() => setReopenModalItem(item)}
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 border border-amber-200"
                                title="Recover or reopen written-off loss record"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                                <span>Recover / Reopen</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setChangeResModalItem(item)}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 border border-blue-200"
                                title="Change loss to claim or settlement"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                                <span>Change Resolution</span>
                              </button>
                            </>
                          )}

                          {/* Actions for FAILED status */}
                          {canUpdate && isFailed && (
                            <>
                              <button
                                type="button"
                                onClick={() => setChangeResModalItem(item)}
                                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer inline-flex items-center gap-1"
                                title="Select alternative resolution after promise failure"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>New Resolution</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenLossModal(item)}
                                className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 border border-purple-200"
                                title="Write off item as loss"
                              >
                                <ArchiveX className="w-3.5 h-3.5 text-purple-600" />
                                <span>Mark Loss</span>
                              </button>
                            </>
                          )}

                          {/* Actions for OPEN or REOPENED status */}
                          {canUpdate && (isOpen || isReopened) && (
                            <>
                              {isPreLab && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenSupplierModal(item)}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer inline-flex items-center gap-1"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Resolve Claim</span>
                                </button>
                              )}
                              {isPostLab && item.damage_type !== 'FITTING_FAILURE' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenLabModal(item)}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer inline-flex items-center gap-1"
                                >
                                  <DollarSign className="w-3.5 h-3.5" />
                                  <span>Resolve Lab Claim</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenLossModal(item)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 border border-slate-200 hover:border-purple-200"
                                title="Mark this item as a loss without pending replacement or claim"
                              >
                                <ArchiveX className="w-3.5 h-3.5 text-purple-600" />
                                <span>Mark Loss</span>
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <Pagination
            totalItems={total}
            itemsPerPage={10}
            currentPage={currentPage}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </div>
      )}

      {/* ── Contact Modal (Supplier or Lab) ── */}
      {contactModal.isOpen && contactModal.data && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[1200] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Contact {contactModal.type === 'supplier' ? 'Supplier' : 'Lab'}
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold">{contactModal.data.name || 'Vendor'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setContactModal({ isOpen: false, data: null, type: 'supplier' })}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 pt-2">
                {/* Phone */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</p>
                      <p className="text-sm font-bold text-slate-800 font-mono">
                        {contactModal.data.phone || 'No phone registered'}
                      </p>
                    </div>
                  </div>
                  {contactModal.data.phone && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(contactModal.data.phone, 'Phone number')}
                        className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer"
                        title="Copy Phone"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <a
                        href={`tel:${contactModal.data.phone}`}
                        className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                      >
                        Call
                      </a>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Email Address</p>
                      <p className="text-sm font-bold text-slate-800">
                        {contactModal.data.email || 'No email registered'}
                      </p>
                    </div>
                  </div>
                  {contactModal.data.email && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(contactModal.data.email, 'Email address')}
                        className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer"
                        title="Copy Email"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <a
                        href={`mailto:${contactModal.data.email}`}
                        className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                      >
                        Email
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setContactModal({ isOpen: false, data: null, type: 'supplier' })}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Supplier Resolution Modal (3 Options) ── */}
      {supplierModal.isOpen && supplierModal.item && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[1200] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Resolve Supplier Damaged Stock</h3>
                  <p className="text-xs text-slate-500">
                    Vendor:{' '}
                    <span className="font-bold text-slate-800">
                      {supplierModal.item.supplier_name || 'Assigned Supplier'}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSupplierModal({ isOpen: false, item: null })}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSupplierResolutionSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Product & Warranty Context */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Damaged Product</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{supplierModal.item.product_name}</p>
                  <p className="font-mono text-[10px] text-slate-500">SKU: {supplierModal.item.product_sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Cost Value</p>
                  <p className="font-mono font-black text-slate-900 text-base mt-0.5">
                    {fmt(supplierModal.item.product_cost || supplierModal.item.product_price)}
                  </p>
                  <span
                    className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full mt-1 ${
                      supplierModal.item.warranty_status?.toUpperCase().includes('IN_WARRANTY')
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {supplierModal.item.warranty_status || 'Out of Warranty'}
                  </span>
                </div>
              </div>

              {/* 5 Resolution Options */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Select Supplier Resolution Method *
                </label>

                {/* Option 1: Replacement */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                    supplierResType === 'REPLACEMENT'
                      ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/10'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="supplierResType"
                    value="REPLACEMENT"
                    checked={supplierResType === 'REPLACEMENT'}
                    onChange={(e) => setSupplierResType(e.target.value)}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4 text-rose-600" />
                      <span className="font-bold text-slate-900 text-xs">1. Replacement (Same or Equivalent Item)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Supplier replaces the damaged unit with a fresh unit of the same product or an alternative product of equal value.
                    </p>
                  </div>
                </label>

                {/* Option 2: Full Compensation */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                    supplierResType === 'FULL_COMPENSATION'
                      ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/10'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="supplierResType"
                    value="FULL_COMPENSATION"
                    checked={supplierResType === 'FULL_COMPENSATION'}
                    onChange={(e) => setSupplierResType(e.target.value)}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-slate-900 text-xs">2. Full Compensation (Full Credit Note / Refund)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Supplier reimburses 100% of the cost value via an accounts ledger credit note or cash refund.
                    </p>
                  </div>
                </label>

                {/* Option 3: Partial Compensation */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                    supplierResType === 'PARTIAL_COMPENSATION'
                      ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/10'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="supplierResType"
                    value="PARTIAL_COMPENSATION"
                    checked={supplierResType === 'PARTIAL_COMPENSATION'}
                    onChange={(e) => {
                      setSupplierResType(e.target.value);
                      const cost = Number(supplierModal.item.product_cost || supplierModal.item.product_price || 0);
                      const half = Math.round((cost / 2) * 100) / 100;
                      setSupplierCompAmount(half);
                      setSupplierLossAmount(cost - half);
                    }}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <MinusCircle className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-slate-900 text-xs">3. Partial Compensation (Partial Refund + Write-Off Balance)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Supplier covers a portion of the cost. The uncompensated remainder is written off as an inventory loss with recorded rationale.
                    </p>
                  </div>
                </label>

                {/* Option 4: No Compensation */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                    supplierResType === 'NO_COMPENSATION'
                      ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/10'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="supplierResType"
                    value="NO_COMPENSATION"
                    checked={supplierResType === 'NO_COMPENSATION'}
                    onChange={(e) => {
                      setSupplierResType(e.target.value);
                      setSupplierCompAmount('0');
                      setSupplierLossAmount(supplierModal.item.product_cost || supplierModal.item.product_price || '');
                    }}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <Ban className="w-4 h-4 text-amber-600" />
                      <span className="font-bold text-slate-900 text-xs">4. No Compensation (Claim Rejected / Expired Warranty)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Supplier refused warranty claim or coverage expired ($0 recovery). Full cost is written off as an inventory loss.
                    </p>
                  </div>
                </label>

                {/* Option 5: Mark as Loss */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                    supplierResType === 'MARK_AS_LOSS'
                      ? 'border-purple-500 bg-purple-50/40 ring-2 ring-purple-500/10'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="supplierResType"
                    value="MARK_AS_LOSS"
                    checked={supplierResType === 'MARK_AS_LOSS'}
                    onChange={(e) => {
                      setSupplierResType(e.target.value);
                      setSupplierCompAmount('0');
                      setSupplierLossAmount(supplierModal.item.product_cost || supplierModal.item.product_price || '');
                    }}
                    className="mt-0.5 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <ArchiveX className="w-4 h-4 text-purple-600" />
                      <span className="font-bold text-slate-900 text-xs">5. Mark as Loss (Direct Write-Off)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Explicitly write off this damaged item as a loss without pending supplier claim or replacement.
                    </p>
                  </div>
                </label>
              </div>

              {/* Sub-form: REPLACEMENT */}
              {supplierResType === 'REPLACEMENT' && (
                <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-200 space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="supplierSubtype"
                        value="SAME_ITEM"
                        checked={supplierSubtype === 'SAME_ITEM'}
                        onChange={() => setSupplierSubtype('SAME_ITEM')}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span>Direct 1:1 Replacement (Same SKU)</span>
                    </label>
                    <label className="font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="supplierSubtype"
                        value="ALT_ITEM"
                        checked={supplierSubtype === 'ALT_ITEM'}
                        onChange={() => setSupplierSubtype('ALT_ITEM')}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span>Alternative Equivalent Product</span>
                    </label>
                  </div>

                  {supplierSubtype === 'SAME_ITEM' ? (
                    <p className="text-[11px] text-slate-600 font-medium">
                      +1 unit of <span className="font-bold">{supplierModal.item.product_name}</span> will be added to this store's inventory upon confirmation.
                    </p>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <p className="font-bold text-slate-800 text-xs">Search & Select Replacement Product *</p>
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Type product name or SKU..."
                          value={altProductSearch}
                          onChange={(e) => setAltProductSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                        />
                      </div>
                      {selectedAltProduct && (
                        <div className="p-2.5 bg-white rounded-xl border border-emerald-200 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-emerald-600 uppercase">Selected:</span>
                            <p className="font-bold text-slate-900 text-xs">{selectedAltProduct.name}</p>
                            <p className="font-mono text-[10px] text-slate-500">SKU: {selectedAltProduct.sku} • {fmt(selectedAltProduct.price)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedAltProduct(null)}
                            className="text-slate-400 hover:text-slate-600 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {!selectedAltProduct && altProductsList.length > 0 && (
                        <div className="max-h-36 overflow-y-auto space-y-1 bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
                          {altProductsList.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => setSelectedAltProduct(p)}
                              className="p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center justify-between"
                            >
                              <div>
                                <p className="font-bold text-slate-800 text-xs">{p.name}</p>
                                <p className="font-mono text-[10px] text-slate-400">SKU: {p.sku}</p>
                              </div>
                              <span className="font-mono font-bold text-slate-700 text-xs">{fmt(p.price)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-form: FULL_COMPENSATION */}
              {supplierResType === 'FULL_COMPENSATION' && (
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="supplierFinMode"
                        value="CREDIT_NOTE"
                        checked={supplierFinMode === 'CREDIT_NOTE'}
                        onChange={() => setSupplierFinMode('CREDIT_NOTE')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Credit Note (Accounts Ledger)</span>
                    </label>
                    <label className="font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="supplierFinMode"
                        value="CASH_REFUND"
                        checked={supplierFinMode === 'CASH_REFUND'}
                        onChange={() => setSupplierFinMode('CASH_REFUND')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Direct Cash / Bank Refund</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Settlement Amount (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={supplierCompAmount}
                        onChange={(e) => setSupplierCompAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        PO ID (Optional Ledger Link)
                      </label>
                      <input
                        type="number"
                        value={supplierPoId}
                        onChange={(e) => setSupplierPoId(e.target.value)}
                        placeholder="e.g. 24"
                        className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-form: PARTIAL_COMPENSATION */}
              {supplierResType === 'PARTIAL_COMPENSATION' && (
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="supplierFinMode"
                        value="CREDIT_NOTE"
                        checked={supplierFinMode === 'CREDIT_NOTE'}
                        onChange={() => setSupplierFinMode('CREDIT_NOTE')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Credit Note (Accounts Ledger)</span>
                    </label>
                    <label className="font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="supplierFinMode"
                        value="CASH_REFUND"
                        checked={supplierFinMode === 'CASH_REFUND'}
                        onChange={() => setSupplierFinMode('CASH_REFUND')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Cash / Bank Refund</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Compensated Portion (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={supplierCompAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSupplierCompAmount(val);
                          const cost = Number(supplierModal.item.product_cost || supplierModal.item.product_price || 0);
                          setSupplierLossAmount(Math.max(0, cost - Number(val || 0)));
                        }}
                        placeholder="0.00"
                        className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block mb-1">
                        Uncompensated Loss (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={supplierLossAmount}
                        onChange={(e) => setSupplierLossAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 text-xs font-bold border border-rose-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-rose-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Loss Write-Off Reason *
                    </label>
                    <select
                      value={supplierLossReason}
                      onChange={(e) => setSupplierLossReason(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="Vendor Refused Warranty / Rejected Claim">Vendor Refused Warranty / Rejected Claim</option>
                      <option value="Partial Settlement Approved by Vendor">Partial Settlement Approved by Vendor</option>
                      <option value="Expired Supplier Warranty">Expired Supplier Warranty</option>
                      <option value="In-Store Handling / Accidental Breakage">In-Store Handling / Accidental Breakage</option>
                      <option value="Transit / Courier Breakage">Transit / Courier Breakage</option>
                      <option value="Beyond Economic Repair">Beyond Economic Repair</option>
                      <option value="Other (Specify)">Other (Specify)</option>
                    </select>
                    {supplierLossReason === 'Other (Specify)' && (
                      <input
                        type="text"
                        placeholder="Specify write-off rationale..."
                        value={supplierCustomLossReason}
                        onChange={(e) => setSupplierCustomLossReason(e.target.value)}
                        className="w-full mt-2 px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Sub-form: NO_COMPENSATION */}
              {supplierResType === 'NO_COMPENSATION' && (
                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-3">
                  <div className="p-2.5 bg-amber-100/60 rounded-lg text-amber-900 text-[11px] font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-700" />
                    <span>Vendor rejected warranty or claim was waived. Full cost of ₹{Number(supplierLossAmount || supplierModal.item.product_cost || supplierModal.item.product_price || 0).toFixed(2)} will be written off as an inventory loss.</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Loss Amount Written Off (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={supplierLossAmount}
                        onChange={(e) => setSupplierLossAmount(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-amber-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Rejection / Loss Reason *
                      </label>
                      <select
                        value={supplierLossReason}
                        onChange={(e) => setSupplierLossReason(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      >
                        <option value="Vendor Refused Warranty / Rejected Claim">Vendor Refused Warranty / Rejected Claim</option>
                        <option value="Expired Supplier Warranty">Expired Supplier Warranty</option>
                        <option value="Physical Breakage Excluded from Warranty">Physical Breakage Excluded from Warranty</option>
                        <option value="Beyond Economic Repair">Beyond Economic Repair</option>
                        <option value="Internal Policy Write-off">Internal Policy Write-off</option>
                        <option value="Other (Specify)">Other (Specify)</option>
                      </select>
                    </div>
                  </div>
                  {supplierLossReason === 'Other (Specify)' && (
                    <input
                      type="text"
                      placeholder="Specify rejection reason..."
                      value={supplierCustomLossReason}
                      onChange={(e) => setSupplierCustomLossReason(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  )}
                </div>
              )}

              {/* Sub-form: MARK_AS_LOSS */}
              {supplierResType === 'MARK_AS_LOSS' && (
                <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-200 space-y-3">
                  <div className="p-2.5 bg-purple-100/60 rounded-lg text-purple-900 text-[11px] font-medium flex items-center gap-2">
                    <ArchiveX className="w-4 h-4 flex-shrink-0 text-purple-700" />
                    <span>This item will be recorded as written off as an inventory loss without pending supplier claim or replacement.</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Loss Value (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={supplierLossAmount}
                        onChange={(e) => setSupplierLossAmount(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-purple-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Loss Reason *
                      </label>
                      <select
                        value={supplierLossReason}
                        onChange={(e) => setSupplierLossReason(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      >
                        <option value="In-Store Breakage / Accidental Damage">In-Store Breakage / Accidental Damage</option>
                        <option value="Vendor Refused Warranty / Rejected Claim">Vendor Refused Warranty / Rejected Claim</option>
                        <option value="Transit / Courier Damage">Transit / Courier Damage</option>
                        <option value="Beyond Economic Repair">Beyond Economic Repair</option>
                        <option value="Internal Inventory Policy Write-off">Internal Inventory Policy Write-off</option>
                        <option value="Other (Specify)">Other (Specify)</option>
                      </select>
                    </div>
                  </div>
                  {supplierLossReason === 'Other (Specify)' && (
                    <input
                      type="text"
                      placeholder="Specify write-off reason..."
                      value={supplierCustomLossReason}
                      onChange={(e) => setSupplierCustomLossReason(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  )}
                </div>
              )}

              {/* Promise Pending Checkbox */}
              {supplierResType !== 'MARK_AS_LOSS' && (
                <div className="p-3.5 bg-sky-50/60 rounded-xl border border-sky-200 space-y-2">
                  <label className="font-bold text-sky-900 text-xs flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPromise}
                      onChange={(e) => setIsPromise(e.target.checked)}
                      className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                    />
                    <span>Resolution is Promised / Pending Supplier Fulfillment</span>
                  </label>
                  <p className="text-[11px] text-sky-800">
                    Check this if the supplier promised replacement or credit note for a future date. Stock will not be added to store inventory until physically verified received.
                  </p>
                  {isPromise && (
                    <div className="pt-1">
                      <label className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block mb-1">
                        Expected Fulfillment Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={expectedDate}
                        onChange={(e) => setExpectedDate(e.target.value)}
                        className="w-full sm:w-48 px-3 py-1.5 text-xs font-semibold border border-sky-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-800"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Resolution Notes */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Settlement & Audit Notes
                </label>
                <textarea
                  rows={2}
                  value={supplierResNotes}
                  onChange={(e) => setSupplierResNotes(e.target.value)}
                  placeholder="Enter invoice credit number, batch reference, or vendor details..."
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 bg-white"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSupplierModal({ isOpen: false, item: null })}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResolvingSupplierDamage}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isResolvingSupplierDamage ? (
                    <span>Processing Resolution...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm Resolution</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Lab Compensation Modal ── */}
      {labModal.isOpen && labModal.item && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[1200] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Resolve Lab Damaged Product</h3>
                  <p className="text-xs text-slate-500">
                    Processing Lab:{' '}
                    <span className="font-bold text-slate-800">{labModal.item.lab_name || 'Lab Partner'}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLabModal({ isOpen: false, item: null })}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLabResolutionSubmit} className="p-6 space-y-4 text-xs font-semibold overflow-y-auto flex-1">
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1 text-slate-700">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">{labModal.item.product_name}</span>
                  <span className="font-mono font-bold text-blue-700">
                    Product Cost: {fmt(labModal.item.product_cost || labModal.item.product_price)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Select the appropriate resolution pathway. The system does not assume automatic replacement or full compensation.
                </p>
              </div>

              {/* 5 Resolution Options Grid */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Select Resolution Action (Lab Damage)
                </label>

                {/* Option 1: Replacement */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                    labResType === 'REPLACEMENT'
                      ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/10'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="labResType"
                    value="REPLACEMENT"
                    checked={labResType === 'REPLACEMENT'}
                    onChange={(e) => {
                      setLabResType(e.target.value);
                      setLabCompAmount('0');
                      setLabLossAmount('');
                    }}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <RefreshCw className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-slate-900 text-xs">1. Replacement (Lab Replaces Item)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Lab remakes lens or replaces damaged frame at no expense to store.
                    </p>
                  </div>
                </label>

                {/* Option 2: Full Compensation */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                    labResType === 'FULL_COMPENSATION'
                      ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/10'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="labResType"
                    value="FULL_COMPENSATION"
                    checked={labResType === 'FULL_COMPENSATION'}
                    onChange={(e) => {
                      setLabResType(e.target.value);
                      const cost = labModal.item.product_cost || labModal.item.product_price || '';
                      setLabCompAmount(cost);
                      setLabLossAmount('');
                    }}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-slate-900 text-xs">2. Full Compensation</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Lab reimburses 100% full monetary value or credits the store invoice.
                    </p>
                  </div>
                </label>

                {/* Option 3: Partial Compensation */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                    labResType === 'PARTIAL_COMPENSATION'
                      ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500/10'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="labResType"
                    value="PARTIAL_COMPENSATION"
                    checked={labResType === 'PARTIAL_COMPENSATION'}
                    onChange={(e) => {
                      setLabResType(e.target.value);
                      const cost = labModal.item.product_cost || labModal.item.product_price || 0;
                      const half = cost ? (Number(cost) / 2).toFixed(2) : '';
                      setLabCompAmount(half);
                      setLabLossAmount(half);
                    }}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <MinusCircle className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold text-slate-900 text-xs">3. Partial Compensation</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Lab pays partial settlement. The unrecovered balance is written off as an inventory loss.
                    </p>
                  </div>
                </label>

                {/* Option 4: No Compensation */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                    labResType === 'NO_COMPENSATION'
                      ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/10'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="labResType"
                    value="NO_COMPENSATION"
                    checked={labResType === 'NO_COMPENSATION'}
                    onChange={(e) => {
                      setLabResType(e.target.value);
                      setLabCompAmount('0');
                      setLabLossAmount(labModal.item.product_cost || labModal.item.product_price || '');
                    }}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <Ban className="w-4 h-4 text-amber-600" />
                      <span className="font-bold text-slate-900 text-xs">4. No Compensation (Claim Denied / Waived)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Lab disputed liability or refused claim. Entire item cost is written off as a loss.
                    </p>
                  </div>
                </label>

                {/* Option 5: Mark as Loss */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                    labResType === 'MARK_AS_LOSS'
                      ? 'border-purple-500 bg-purple-50/40 ring-2 ring-purple-500/10'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="labResType"
                    value="MARK_AS_LOSS"
                    checked={labResType === 'MARK_AS_LOSS'}
                    onChange={(e) => {
                      setLabResType(e.target.value);
                      setLabCompAmount('0');
                      setLabLossAmount(labModal.item.product_cost || labModal.item.product_price || '');
                    }}
                    className="mt-0.5 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <ArchiveX className="w-4 h-4 text-purple-600" />
                      <span className="font-bold text-slate-900 text-xs">5. Mark as Loss (Direct Write-Off)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Explicitly record this damaged product as written off as an inventory loss without pending claim.
                    </p>
                  </div>
                </label>
              </div>

              {/* Sub-form: REPLACEMENT */}
              {labResType === 'REPLACEMENT' && (
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-2">
                  <div className="p-2.5 bg-blue-100/60 rounded-lg text-blue-900 text-[11px] font-medium flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 flex-shrink-0 text-blue-700" />
                    <span>Lab will remake or replace this damaged item. +1 unit of <span className="font-bold">{labModal.item.product_name}</span> will be added back to this store's inventory.</span>
                  </div>
                </div>
              )}

              {/* Sub-form: FULL_COMPENSATION */}
              {labResType === 'FULL_COMPENSATION' && (
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Claimed Compensation Amount (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={labCompAmount}
                      onChange={(e) => setLabCompAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-emerald-800"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Pre-filled with product cost. You may adjust the amount for high-end lenses or extra fitting fees.
                    </p>
                  </div>
                </div>
              )}

              {/* Sub-form: PARTIAL_COMPENSATION */}
              {labResType === 'PARTIAL_COMPENSATION' && (
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Lab Reimbursed Portion (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={labCompAmount}
                        onChange={(e) => {
                          const comp = e.target.value;
                          setLabCompAmount(comp);
                          const total = Number(labModal.item.product_cost || labModal.item.product_price || 0);
                          if (total && !isNaN(comp)) {
                            const rem = Math.max(0, total - Number(comp));
                            setLabLossAmount(rem.toFixed(2));
                          }
                        }}
                        placeholder="0.00"
                        className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-indigo-700"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block mb-1">
                        Uncompensated Loss (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={labLossAmount}
                        onChange={(e) => setLabLossAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 text-xs font-bold border border-rose-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-rose-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Loss Write-Off Reason *
                    </label>
                    <select
                      value={labLossReason}
                      onChange={(e) => setLabLossReason(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="Lab Disputed Liability / Refused Claim">Lab Disputed Liability / Refused Claim</option>
                      <option value="Partial Settlement Agreed with Lab">Partial Settlement Agreed with Lab</option>
                      <option value="Store-Lab Shared Liability Agreement">Store-Lab Shared Liability Agreement</option>
                      <option value="Beyond Repair / Waste">Beyond Repair / Waste</option>
                      <option value="Other (Specify)">Other (Specify)</option>
                    </select>
                    {labLossReason === 'Other (Specify)' && (
                      <input
                        type="text"
                        placeholder="Specify write-off rationale..."
                        value={labCustomLossReason}
                        onChange={(e) => setLabCustomLossReason(e.target.value)}
                        className="w-full mt-2 px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Sub-form: NO_COMPENSATION */}
              {labResType === 'NO_COMPENSATION' && (
                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-3">
                  <div className="p-2.5 bg-amber-100/60 rounded-lg text-amber-900 text-[11px] font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-700" />
                    <span>Lab disputed liability or claim was waived. Full cost of ₹{Number(labLossAmount || labModal.item.product_cost || labModal.item.product_price || 0).toFixed(2)} will be written off as an inventory loss.</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Loss Amount Written Off (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={labLossAmount}
                        onChange={(e) => setLabLossAmount(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-amber-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Rejection / Loss Reason *
                      </label>
                      <select
                        value={labLossReason}
                        onChange={(e) => setLabLossReason(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      >
                        <option value="Lab Disputed Liability / Refused Claim">Lab Disputed Liability / Refused Claim</option>
                        <option value="Customer Frame / Non-Lab Breakage">Customer Frame / Non-Lab Breakage</option>
                        <option value="Lab Claim Period Lapsed">Lab Claim Period Lapsed</option>
                        <option value="Beyond Economic Repair">Beyond Economic Repair</option>
                        <option value="Store Inventory Policy Write-off">Store Inventory Policy Write-off</option>
                        <option value="Other (Specify)">Other (Specify)</option>
                      </select>
                    </div>
                  </div>
                  {labLossReason === 'Other (Specify)' && (
                    <input
                      type="text"
                      placeholder="Specify rejection reason..."
                      value={labCustomLossReason}
                      onChange={(e) => setLabCustomLossReason(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  )}
                </div>
              )}

              {/* Sub-form: MARK_AS_LOSS */}
              {labResType === 'MARK_AS_LOSS' && (
                <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-200 space-y-3">
                  <div className="p-2.5 bg-purple-100/60 rounded-lg text-purple-900 text-[11px] font-medium flex items-center gap-2">
                    <ArchiveX className="w-4 h-4 flex-shrink-0 text-purple-700" />
                    <span>This item will be recorded as written off as an inventory loss originating from Lab processing without pending claim.</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Loss Value (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={labLossAmount}
                        onChange={(e) => setLabLossAmount(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-purple-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Loss Reason *
                      </label>
                      <select
                        value={labLossReason}
                        onChange={(e) => setLabLossReason(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      >
                        <option value="Lab Incident Write-off">Lab Incident Write-off</option>
                        <option value="Lab Disputed Liability / Refused Claim">Lab Disputed Liability / Refused Claim</option>
                        <option value="Store Inventory Policy Write-off">Store Inventory Policy Write-off</option>
                        <option value="Beyond Repair / Waste">Beyond Repair / Waste</option>
                        <option value="Other (Specify)">Other (Specify)</option>
                      </select>
                    </div>
                  </div>
                  {labLossReason === 'Other (Specify)' && (
                    <input
                      type="text"
                      placeholder="Specify write-off reason..."
                      value={labCustomLossReason}
                      onChange={(e) => setLabCustomLossReason(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  )}
                </div>
              )}

              {/* Promise Pending Checkbox */}
              {labResType !== 'MARK_AS_LOSS' && (
                <div className="p-3.5 bg-sky-50/60 rounded-xl border border-sky-200 space-y-2">
                  <label className="font-bold text-sky-900 text-xs flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPromise}
                      onChange={(e) => setIsPromise(e.target.checked)}
                      className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                    />
                    <span>Resolution is Promised / Pending Lab Settlement</span>
                  </label>
                  <p className="text-[11px] text-sky-800">
                    Check this if the lab agreed to provide remake or credit on a future date. Replacement units will not be restocked until verified.
                  </p>
                  {isPromise && (
                    <div className="pt-1">
                      <label className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block mb-1">
                        Expected Settlement Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={expectedDate}
                        onChange={(e) => setExpectedDate(e.target.value)}
                        className="w-full sm:w-48 px-3 py-1.5 text-xs font-semibold border border-sky-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-800"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Resolution Notes */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Lab Liability Audit Notes
                </label>
                <textarea
                  rows={2}
                  value={labResNotes}
                  onChange={(e) => setLabResNotes(e.target.value)}
                  placeholder="Enter lab incident report ID, damage details, or courier ref..."
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                />
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLabModal({ isOpen: false, item: null })}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResolvingLabDamage}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isResolvingLabDamage ? (
                    <span>Processing Resolution...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm Lab Resolution</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Quick Direct Mark as Loss Modal ── */}
      {lossModal.isOpen && lossModal.item && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[1200] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <ArchiveX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Mark Damaged Product as Loss</h3>
                  <p className="text-xs text-slate-500">
                    Origin:{' '}
                    <span className="font-bold text-purple-700">
                      {lossModal.item.stage === 'POST_LAB' || lossModal.item.damage_type === 'LAB_DAMAGE'
                        ? `Lab Processing (${lossModal.item.lab_name || 'Lab Partner'})`
                        : `Supplier / Store Stock (${lossModal.item.supplier_name || 'Supplier'})`}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLossModal({ isOpen: false, item: null })}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickLossSubmit} className="p-6 space-y-4 text-xs font-semibold">
              <div className="p-3.5 bg-purple-50/40 rounded-xl border border-purple-100 space-y-1.5 text-slate-700">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">{lossModal.item.product_name}</span>
                  <span className="font-mono font-bold text-purple-700">
                    Cost: {fmt(lossModal.item.product_cost || lossModal.item.product_price)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>SKU: <span className="font-mono font-medium text-slate-700">{lossModal.item.product_sku || 'N/A'}</span></span>
                  <span>•</span>
                  <span>Damage Type: <span className="font-medium text-slate-700">{lossModal.item.damage_type?.replace(/_/g, ' ') || 'DAMAGED'}</span></span>
                </div>
                <p className="text-[11px] text-purple-900/80 pt-1 border-t border-purple-100">
                  This item will be recorded as written off as an inventory loss. Product units will transition to LOST status and an inventory loss transaction will be logged.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Loss Value (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={quickLossAmount}
                    onChange={(e) => setQuickLossAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-purple-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Loss / Write-Off Reason *
                  </label>
                  <select
                    value={quickLossReason}
                    onChange={(e) => setQuickLossReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    {lossModal.item.stage === 'POST_LAB' || lossModal.item.damage_type === 'LAB_DAMAGE' ? (
                      <>
                        <option value="Lab Disputed Liability / Refused Claim">Lab Disputed Liability / Refused Claim</option>
                        <option value="Lab Incident Write-off">Lab Incident Write-off</option>
                        <option value="Beyond Repair / Waste">Beyond Repair / Waste</option>
                        <option value="Store Inventory Policy Write-off">Store Inventory Policy Write-off</option>
                        <option value="Other (Specify)">Other (Specify)</option>
                      </>
                    ) : (
                      <>
                        <option value="In-Store Breakage / Accidental Damage">In-Store Breakage / Accidental Damage</option>
                        <option value="Vendor Refused Warranty / Rejected Claim">Vendor Refused Warranty / Rejected Claim</option>
                        <option value="Transit / Courier Damage">Transit / Courier Damage</option>
                        <option value="Beyond Economic Repair">Beyond Economic Repair</option>
                        <option value="Internal Inventory Policy Write-off">Internal Inventory Policy Write-off</option>
                        <option value="Other (Specify)">Other (Specify)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {quickLossReason === 'Other (Specify)' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Specify Custom Write-off Reason *
                  </label>
                  <input
                    type="text"
                    placeholder="Provide details on why this item is written off..."
                    value={quickCustomLossReason}
                    onChange={(e) => setQuickCustomLossReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Write-off Audit Notes
                </label>
                <textarea
                  rows={2}
                  value={quickLossNotes}
                  onChange={(e) => setQuickLossNotes(e.target.value)}
                  placeholder="Additional context, incident circumstances, or supervisor authorization..."
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLossModal({ isOpen: false, item: null })}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMarkingLoss}
                  className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isMarkingLoss ? (
                    <span>Writing Off...</span>
                  ) : (
                    <>
                      <ArchiveX className="w-4 h-4" />
                      <span>Confirm Loss Write-Off</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── QC Audit History Modal ── */}
      {historyItemId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[1200] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  QC Inspection Audit Timeline (Item #{historyItemId})
                </h3>
              </div>
              <button
                onClick={() => setHistoryItemId(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {isLoadingHistory ? (
                <div className="p-8 text-center text-slate-400 font-bold text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                  Loading audit logs...
                </div>
              ) : historyData.length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold py-6 text-center">
                  No QC inspection history logs recorded for this item yet.
                </p>
              ) : (
                historyData.map((h) => (
                  <div key={h.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>
                        {h.inspector_name || `Inspector #${h.inspector_id}`} ({h.inspector_type})
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {new Date(h.created_at).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                      <span className="px-2 py-0.5 bg-slate-200 rounded text-[10px] font-bold">
                        {h.previous_status || 'INIT'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-black text-[10px]">
                        {h.new_status}
                      </span>
                    </div>
                    {h.notes && (
                      <p className="text-[11px] text-slate-600 font-medium italic pt-1 border-t border-slate-200/50">
                        "{h.notes}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setHistoryItemId(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dynamic Lifecycle Modals ── */}
      <VerifyCompleteModal
        isOpen={Boolean(verifyModalItem)}
        onClose={() => setVerifyModalItem(null)}
        item={verifyModalItem}
        onSuccess={() => {
          refetch();
          setVerifyModalItem(null);
        }}
      />

      <MarkFailedModal
        isOpen={Boolean(markFailedModalItem)}
        onClose={() => setMarkFailedModalItem(null)}
        item={markFailedModalItem}
        onSuccess={() => {
          refetch();
          setMarkFailedModalItem(null);
        }}
      />

      <ReopenDamageModal
        isOpen={Boolean(reopenModalItem)}
        onClose={() => setReopenModalItem(null)}
        item={reopenModalItem}
        onSuccess={() => {
          refetch();
          setReopenModalItem(null);
        }}
      />

      <ChangeResolutionModal
        isOpen={Boolean(changeResModalItem)}
        onClose={() => setChangeResModalItem(null)}
        item={changeResModalItem}
        onSuccess={() => {
          refetch();
          setChangeResModalItem(null);
        }}
      />

      <DamageItemHistoryModal
        isOpen={Boolean(damageHistoryModalItem)}
        onClose={() => setDamageHistoryModalItem(null)}
        item={damageHistoryModalItem}
      />
    </div>
  );
}
