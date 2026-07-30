import { useState, useMemo, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import TransactionDetailModal from '../../components/admin/suppliers/TransactionDetailModal';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRightLeft, Plus, Search, ChevronRight, ChevronDown,
  X as XIcon, Building2, Store, Package, Filter,
  CheckCircle, Clock, XCircle, AlertTriangle, Tag,
  Layers, RotateCcw, ShoppingCart, TrendingUp, Truck,
  RefreshCw, Trash2, Eye, IndianRupee, FileText,
} from 'lucide-react';
import Pagination from '../../components/shared/Pagination';
import ManagerNewTransactionModal from '../../components/shopkeeper/ManagerNewTransactionModal';
import { useStoreStore, useAuthStore } from '../../store/store';
import { useInventory } from '../../hooks/useInventory';
import { useTransactions } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';
import { useProducts } from '../../hooks/useProducts';
import { getInventoryApi } from '../../api/inventory/inventory.api';
import PermissionGuard from '../../components/shared/PermissionGuard';
import { usePagePermissions } from '../../hooks/usePermissions'; 
import { useRoleContext } from '../../hooks/useRoleContext';

/* ─────────────────────────────────────────────────────────
   CONSTANTS & MOCK DATA
───────────────────────────────────────────────────────── */
const TRANSACTION_TYPES = [
  { value: 'Inventory Transfer', icon: ArrowRightLeft, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'Warehouse Send', icon: ArrowRightLeft, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { value: 'Warehouse Receive', icon: ArrowRightLeft, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  { value: 'Sale', icon: ShoppingCart, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { value: 'Purchase', icon: TrendingUp, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { value: 'Return', icon: RotateCcw, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'Damage', icon: Trash2, color: 'text-red-600 bg-red-50 border-red-200' },
  { value: 'Loss', icon: Trash2, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { value: 'Exchange Return', icon: RotateCcw, color: 'text-teal-600 bg-teal-50 border-teal-200' },
  { value: 'Exchange Issue', icon: RefreshCw, color: 'text-sky-600 bg-sky-50 border-sky-200' },
];

const STATUS_CONFIG = {
  Completed: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle },
  Approved: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle },
  Pending: { color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500', icon: Clock },
  Rejected: { color: 'text-rose-700 bg-rose-50 border-rose-200', dot: 'bg-rose-500', icon: XCircle },
  Cancelled: { color: 'text-slate-600 bg-slate-100 border-slate-200', dot: 'bg-slate-400', icon: XCircle },
  Failed: { color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500', icon: AlertTriangle },
};

// Tab definitions: key used to filter by transfer direction
const TABS = [
  { id: 'all', label: 'All Transactions', icon: ArrowRightLeft },
  { id: 'admin-to-branch', label: 'Admin → Branch', icon: Truck },
  { id: 'branch-to-branch', label: 'Branch → Branch', icon: RefreshCw },
  { id: 'branch-to-admin', label: 'Branch → Admin', icon: Building2 },
  { id: 'pending-requests', label: 'Pending Requests', icon: Clock },
];

// Helper: classify a transaction into a tab
const classifyTab = (tx) => {
  if (tx.type === 'Purchase') return 'other';
  const senderIsAdmin = tx.sender.toLowerCase().includes('admin');
  const receiverIsAdmin = tx.receiver.toLowerCase().includes('admin');
  if (senderIsAdmin && !receiverIsAdmin) return 'admin-to-branch';
  if (!senderIsAdmin && receiverIsAdmin) return 'branch-to-admin';
  if (!senderIsAdmin && !receiverIsAdmin) return 'branch-to-branch';
  return 'other';
};

const ITEMS_PER_PAGE = 10;

/* ─────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────── */
const StatusBadge = ({ status, rejectionReason }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
  return (
    <span 
      title={status === 'Rejected' && rejectionReason ? `Rejection reason: ${rejectionReason}` : undefined}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${status === 'Rejected' ? 'cursor-help' : ''} ${cfg.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
      {status}
    </span>
  );
};

const TypeBadge = ({ type }) => {
  const cfg = TRANSACTION_TYPES.find(t => t.value === type) || TRANSACTION_TYPES[0];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {type}
    </span>
  );
};

const DetailRow = ({ label, value, mono }) => (
  <div className="flex items-start justify-between py-2.5 border-b border-slate-50 last:border-0 gap-3">
    <span className="text-sm text-slate-500 font-medium shrink-0">{label}</span>
    <span className={`text-sm font-semibold text-slate-900 text-right break-words min-w-0 ${mono ? 'font-mono' : ''}`}>
      {value ?? '—'}
    </span>
  </div>
);

const Section = ({ icon: Icon, title, children, color = 'emerald' }) => {
  const colours = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600',
    blue:    'bg-blue-500/10 border-blue-500/20 text-blue-600',
    purple:  'bg-purple-500/10 border-purple-500/20 text-purple-600',
    amber:   'bg-amber-500/10 border-amber-500/20 text-amber-600',
    rose:    'bg-rose-500/10 border-rose-500/20 text-rose-600',
    slate:   'bg-slate-500/10 border-slate-500/20 text-slate-600',
    violet:  'bg-violet-500/10 border-violet-500/20 text-violet-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-50">
        <div className={`p-2 rounded-xl border ${colours[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      </div>
      <div className="px-5 pt-1 pb-2">{children}</div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   NEW TRANSACTION MODAL
───────────────────────────────────────────────────────── */
const EMPTY_FORM = {
  sender: '',
  receiver: '',
  categoryId: '',
  product: '',
  quantity: '',
  type: 'Inventory Transfer',
  purchasePrice: '',
  remarks: '',
};

const TRANSACTION_TYPE_OPTIONS = [
  { value: 'Inventory Transfer', label: 'Inventory Transfer' },
  { value: 'Purchase', label: 'Purchase' },
  { value: 'Damage', label: 'Damage' },
  { value: 'Loss', label: 'Loss' },
  { value: 'Sale', label: 'Sale' },
  { value: 'Return', label: 'Return' },
];

const NewTransactionModal = ({
  isOpen,
  onClose,
  onSubmit,
  currentStore,
  stores,
  isSubmitting,
}) => {
  const { user } = useAuthStore();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const isAdminOrAccountant = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'accountant';
  const isSenderLocked = stores.length <= 1 || !isAdminOrAccountant;

  const myStore = useMemo(() => {
    if (!user) return stores[0] || {};
    if (isAdminOrAccountant) return currentStore || stores[0] || {};
    return stores.find(s => String(s.id) === String(user.store_id)) || stores[0] || {};
  }, [user, stores, isAdminOrAccountant, currentStore]);

  const transactionTypeOptions = useMemo(() => {
    if (stores.length <= 1) {
      return TRANSACTION_TYPE_OPTIONS.filter(opt => opt.value !== 'Inventory Transfer');
    }
    return TRANSACTION_TYPE_OPTIONS;
  }, [stores.length]);

  const storeOptions = useMemo(() => {
    return [
      { id: 'admin', name: 'All Store' },
      ...stores.map(st => ({ id: String(st.id), name: st.store_name || st.name || `Store #${st.id}` }))
    ];
  }, [stores]);

  const categoryStoreId = form.sender || null;
  const { categories } = useCategories(categoryStoreId, { limit: 100, all_tenant: false });

  const senderType = form.sender === 'admin' ? 'ADMIN' : 'STORE';
  const senderIdVal = form.sender === 'admin' ? user?.id : Number(form.sender);

  const { data: inventoryData, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['inventory', senderType, senderIdVal],
    queryFn: () => getInventoryApi({
      owner_type: senderType,
      owner_id: senderIdVal,
      paginate: false
    }),
    enabled: isOpen && !!form.sender && (senderType === 'ADMIN' ? !!user?.id : !!senderIdVal) && form.type !== 'Purchase',
  });

  const inventoryItems = inventoryData?.items || [];

  const { products: catalogProducts } = useProducts({
    category_id: form.categoryId ? Number(form.categoryId) : null,
    limit: 500,
    active_only: true,
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        ...EMPTY_FORM,
        sender: isSenderLocked ? (myStore?.id ? String(myStore.id) : '') : (currentStore?.id ? String(currentStore.id) : ''),
        type: stores.length <= 1 ? 'Purchase' : 'Inventory Transfer',
      });
      setErrors({});
    }
  }, [isOpen, currentStore, stores, isSenderLocked, myStore]);

  if (!isOpen) return null;

  const set = (key, val) => {
    setForm(prev => {
      const next = {
        ...prev,
        [key]: val,
        ...(key === 'type' ? { 
          product: '', 
          quantity: '', 
          purchasePrice: '', 
          receiver: '',
          sender: isSenderLocked ? (myStore?.id ? String(myStore.id) : '') : ''
        } : {}),
        ...(key === 'sender' ? { product: '', quantity: '', receiver: prev.receiver === val ? '' : prev.receiver } : {}),
        ...(key === 'categoryId' ? { product: '' } : {}),
      };
      return next;
    });
    setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    const type = form.type;

    if (!form.product || isNaN(Number(form.product))) {
      e.product = 'A valid product selection is required';
    }
    if (!form.quantity || isNaN(form.quantity) || Number(form.quantity) < 1) {
      e.quantity = 'Enter a valid quantity (≥ 1)';
    }

    if (type === 'Inventory Transfer') {
      if (!form.sender) e.sender = 'Sender store is required';
      if (!form.receiver) e.receiver = 'Receiver store is required';
      if (form.sender && form.receiver && form.sender === form.receiver) {
        e.receiver = 'Sender and receiver must be different';
      }

      const senderId = form.sender === 'admin' ? (user?.id || 1) : Number(form.sender);
      const receiverId = form.receiver === 'admin' ? (user?.id || 1) : Number(form.receiver);
      if (isNaN(senderId)) e.sender = 'Invalid sender store selection';
      if (isNaN(receiverId)) e.receiver = 'Invalid receiver store selection';

      const selectedItem = inventoryItems.find(item => String(item.product_id) === String(form.product));
      if (selectedItem && Number(form.quantity) > Number(selectedItem.available_quantity || 0)) {
        e.quantity = `Only ${selectedItem.available_quantity || 0} available in sender stock`;
      }
    } else if (type === 'Purchase') {
      if (!form.purchasePrice || isNaN(form.purchasePrice) || Number(form.purchasePrice) <= 0) {
        e.purchasePrice = 'Enter a valid purchase price (> 0)';
      }
    } else if (['Damage', 'Loss', 'Sale'].includes(type)) {
      if (!form.sender) e.sender = 'Affected store/owner is required';
      const senderId = form.sender === 'admin' ? (user?.id || 1) : Number(form.sender);
      if (isNaN(senderId)) e.sender = 'Invalid store/owner selection';

      const selectedItem = inventoryItems.find(item => String(item.product_id) === String(form.product));
      if (selectedItem && Number(form.quantity) > Number(selectedItem.available_quantity || 0)) {
        e.quantity = `Only ${selectedItem.available_quantity || 0} available in stock`;
      }
    } else if (type === 'Return') {
      if (!form.sender) e.sender = 'Affected store/owner is required';
      const senderId = form.sender === 'admin' ? (user?.id || 1) : Number(form.sender);
      if (isNaN(senderId)) e.sender = 'Invalid store/owner selection';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    let payload;
    const type = form.type;

    if (type === 'Inventory Transfer') {
      payload = {
        product_id: Number(form.product),
        quantity: Number(form.quantity),
        from_owner_type: form.sender === 'admin' ? 'ADMIN' : 'STORE',
        from_owner_id: form.sender === 'admin' ? (user?.id || 1) : Number(form.sender),
        to_owner_type: form.receiver === 'admin' ? 'ADMIN' : 'STORE',
        to_owner_id: form.receiver === 'admin' ? (user?.id || 1) : Number(form.receiver),
        remarks: form.remarks || null,
      };
    } else if (type === 'Purchase') {
      payload = {
        product_id: Number(form.product),
        quantity: Number(form.quantity),
        purchase_price: Number(form.purchasePrice),
        owner_type: currentStore?.id === 'admin' ? 'ADMIN' : 'STORE',
        owner_id: currentStore?.id === 'admin' ? (user?.id || 1) : Number(currentStore?.id),
        remarks: form.remarks || null,
      };
    } else {
      payload = {
        product_id: Number(form.product),
        owner_type: form.sender === 'admin' ? 'ADMIN' : 'STORE',
        owner_id: form.sender === 'admin' ? (user?.id || 1) : Number(form.sender),
        quantity: Number(form.quantity),
        remarks: form.remarks || null,
      };
    }

    try {
      await onSubmit({
        type: type === 'Inventory Transfer' ? 'TRANSFER' : type.toUpperCase(),
        payload,
      });
      setForm(EMPTY_FORM);
      setErrors({});
    } catch (err) {
      console.error('Submit transaction failed', err);
    }
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    onClose();
  };

  const inputCls = (field) =>
    `w-full px-3 py-2.5 text-sm font-medium border rounded-xl focus:outline-none focus:ring-4 transition-all bg-white ${errors[field]
      ? 'border-red-400 focus:ring-red-100 focus:border-red-500'
      : 'border-slate-200 focus:ring-blue-500/10 focus:border-blue-500'
    }`;



  const productOptions = form.type === 'Purchase'
    ? catalogProducts
    : inventoryItems.filter(item => !form.categoryId || String(item.category_id) === String(form.categoryId));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[95dvh] overflow-hidden">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">New Transaction</h2>
              <p className="text-xs text-slate-500">Record a new stock movement or adjustment</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-5 sm:px-6 py-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Transaction Type <span className="text-red-500">*</span></label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className={inputCls('type')}>
                {transactionTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type}</p>}
            </div>

            {form.type !== 'Purchase' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    {form.type === 'Inventory Transfer' ? 'Sender Store' : 'Affected Store/Owner'} <span className="text-red-500">*</span>
                  </label>
                  {isSenderLocked ? (
                    <input
                      value={myStore?.store_name || myStore?.name || ''}
                      disabled
                      className={`${inputCls('sender')} disabled:bg-slate-50 disabled:text-slate-500`}
                    />
                  ) : (
                    <select value={form.sender} onChange={e => set('sender', e.target.value)} className={inputCls('sender')}>
                      <option value="">Select store/warehouse...</option>
                      {storeOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                  )}
                  {errors.sender && <p className="text-xs text-red-500 mt-1">{errors.sender}</p>}
                </div>

                {form.type === 'Inventory Transfer' ? (
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Receiver Store <span className="text-red-500">*</span></label>
                    <select value={form.receiver} onChange={e => set('receiver', e.target.value)} className={inputCls('receiver')}>
                      <option value="">Select receiver...</option>
                      {storeOptions.filter(opt => opt.id !== form.sender).map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                    {errors.receiver && <p className="text-xs text-red-500 mt-1">{errors.receiver}</p>}
                  </div>
                ) : null}
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Destination Store</label>
                <input
                  value={currentStore?.id === 'admin' ? 'All Store' : currentStore?.store_name || currentStore?.name || 'All Store'}
                  disabled
                  className={`${inputCls('destination')} disabled:bg-slate-50 disabled:text-slate-500`}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Category Filter</label>
                <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)} className={inputCls('categoryId')}>
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Product / Item <span className="text-red-500">*</span></label>
                <select
                  value={form.product}
                  onChange={e => set('product', e.target.value)}
                  className={inputCls('product')}
                  disabled={form.type !== 'Purchase' && !form.sender}
                >
                  <option value="">
                    {form.type !== 'Purchase' && !form.sender
                      ? 'Select store first'
                      : isLoadingInventory
                      ? 'Loading inventory...'
                      : 'Select product...'
                    }
                  </option>
                  {form.type === 'Purchase' ? (
                    productOptions.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))
                  ) : (
                    productOptions.map(item => (
                      <option key={item.id} value={item.product_id}>
                        {item.product_name || item.product_sku || `Product #${item.product_id}`} ({item.available_quantity || 0} available)
                      </option>
                    ))
                  )}
                </select>
                {errors.product && <p className="text-xs text-red-500 mt-1">{errors.product}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Quantity <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={e => set('quantity', e.target.value)}
                  placeholder="e.g. 5"
                  className={inputCls('quantity')}
                />
                {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
              </div>

              {form.type === 'Purchase' ? (
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5" /> Unit Purchase Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.purchasePrice}
                    onChange={e => set('purchasePrice', e.target.value)}
                    placeholder="e.g. 299.99"
                    className={inputCls('purchasePrice')}
                  />
                  {errors.purchasePrice && <p className="text-xs text-red-500 mt-1">{errors.purchasePrice}</p>}
                </div>
              ) : null}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Remarks <span className="text-slate-400">(optional)</span></label>
              <textarea
                rows={2}
                value={form.remarks}
                onChange={e => set('remarks', e.target.value)}
                placeholder="Add any notes, audit reference, damage details or remarks…"
                className="w-full px-3 py-2.5 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-white resize-none"
              />
            </div>

            {form.type === 'Inventory Transfer' && form.sender && form.receiver && form.product && form.quantity && (
              <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm font-semibold text-blue-700">
                <Store className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{storeOptions.find(o => o.id === form.sender)?.name}</span>
                <ArrowRightLeft className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{storeOptions.find(o => o.id === form.receiver)?.name}</span>
              </div>
            )}
          </div>

          <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 flex-shrink-0 bg-slate-50">
            <button type="button" onClick={handleClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-[#0A0F1F] rounded-xl hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
              <Plus className="w-4 h-4" />
              {isSubmitting ? 'Creating...' : 'Create Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   TRANSACTION DETAIL DRAWER
───────────────────────────────────────────────────────── */




/* ─────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────── */
const Transactions = () => {
  const { storeId, buildPath, showStoreSwitcher, isPathAdmin } = useRoleContext();
  const { user } = useAuthStore();
  const { selectedStore, setSelectedStore, stores: globalStores } = useStoreStore();
  
  const stores = globalStores.length > 0 ? globalStores : (
    user?.store_id ? [{ id: user.store_id, name: user.store_name || `Store #${user.store_id}`, store_name: user.store_name || `Store #${user.store_id}` }] : []
  );
  const effectiveCurrentStore = selectedStore || (stores.length > 0 ? stores[0] : null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [inPageStoreId, setInPageStoreId] = useState(storeId);
  const perms = usePagePermissions('transactions');

  useEffect(() => {
    setInPageStoreId(storeId);
  }, [storeId]);
  const queryType = searchParams.get('type');
  const querySearch = searchParams.get('search');
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState(querySearch || '');
  const [filterSender, setFilterSender] = useState('');
  const [filterReceiver, setFilterReceiver] = useState('');
  const [filterType, setFilterType] = useState(queryType || '');

  // Synchronize URL query changes to state
  useEffect(() => {
    setFilterType(queryType || '');
  }, [queryType]);

  useEffect(() => {
    setSearchTerm(querySearch || '');
  }, [querySearch]);

  // Synchronize state changes to URL query params
  useEffect(() => {
    const params = {};
    if (searchTerm.trim()) {
      params.search = searchTerm.trim();
    }
    if (filterType) {
      params.type = filterType;
    }
    setSearchParams(params, { replace: true });
  }, [searchTerm, filterType, setSearchParams]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showNewModal, setShowNewModal] = useState(false);
  const [viewTx, setViewTx] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const {
    transactions: backendTransactions,
    totalTransactions,
    isLoadingTransactions,
    isTransactionsError,
    createTransactionAsync,
    isCreatingTransaction,
    approveTransactionAsync,
    rejectTransactionAsync,
    isApprovingTransaction,
    isRejectingTransaction,
    createManagerRequestAsync,
    isCreatingManagerRequest,
    createManagerPushAsync,
    isCreatingManagerPush,
    createManagerPurchaseAsync,
    isCreatingManagerPurchase,
    createManagerDamageAsync,
    isCreatingManagerDamage,
    createManagerLossAsync,
    isCreatingManagerLoss,
    createManagerSaleAsync,
    isCreatingManagerSale,
    createManagerReturnAsync,
    isCreatingManagerReturn,
  } = useTransactions(inPageStoreId, {
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    search: searchTerm || undefined,
    transaction_type: filterType || undefined,
    status: activeTab === 'pending-requests' ? 'Pending' : undefined,
    transfer_direction: ['admin-to-branch', 'branch-to-branch', 'branch-to-admin'].includes(activeTab)
      ? activeTab.replace(/-/g, '_').toUpperCase()
      : undefined,
  });

  const { transactions: allTransactions } = useTransactions(inPageStoreId, {
    limit: 1000,
    search: searchTerm || undefined,
    transaction_type: filterType || undefined,
  });

  const mapTransaction = (tx) => {
    let displayId = `TXN-${String(tx.id).padStart(6, '0')}`;
    if (searchTerm) {
      const cleanSearch = searchTerm.trim().toUpperCase();
      const match = cleanSearch.match(/^TXN-(\d+)$/) || cleanSearch.match(/^(\d+)$/);
      if (match) {
        const searchedId = parseInt(match[1], 10);
        if (tx.reference_id === searchedId) {
          displayId = `TXN-${String(searchedId).padStart(6, '0')}`;
        }
      }
    } else if (storeId && tx.receive_store_id && String(tx.receive_store_id) === String(storeId) && tx.reference_id) {
      displayId = `TXN-${String(tx.reference_id).padStart(6, '0')}`;
    }

    return {
      id: displayId,
      rawId: tx.id,
      date: tx.created_at,
      sender: tx.send_store_name || 'All Store',
      receiver: tx.receive_store_name || 'All Store',
      category: 'Inventory',
      product: tx.product_name || tx.product_sku || `Product #${tx.product_id}`,
      quantity: tx.quantity,
      type: tx.transaction_type === 'ADMIN_TRANSFER_OUT' ? 'Warehouse Send' :
            tx.transaction_type === 'ADMIN_TRANSFER_IN' ? 'Warehouse Receive' :
            (tx.transaction_type === 'STORE_TRANSFER_OUT' || 
             tx.transaction_type === 'STORE_TRANSFER_IN' || 
             tx.transaction_type === 'TRANSFER')
              ? 'Inventory Transfer'
              : tx.transaction_type === 'EXCHANGE_IN' ? 'Exchange Return' :
                tx.transaction_type === 'EXCHANGE_OUT' ? 'Exchange Issue' :
                tx.transaction_type.charAt(0).toUpperCase() + tx.transaction_type.slice(1).toLowerCase(),
      status: tx.status === 'COMPLETED' ? 'Completed' :
              tx.status === 'APPROVED' ? 'Approved' :
              tx.status === 'PENDING' ? 'Pending' :
              tx.status === 'REJECTED' ? 'Rejected' : tx.status,
      transferDirection: tx.transfer_direction,
      isRequest: tx.is_request,
      rejectionReason: tx.rejection_reason,
      remarks: tx.remarks || '',
      raw: tx,
    };
  };

  const transactions = useMemo(() => backendTransactions.map(mapTransaction), [backendTransactions]);
  const mappedAllTransactions = useMemo(() => allTransactions.map(mapTransaction), [allTransactions]);

  useEffect(() => {
    if (isPathAdmin && storeId && stores.length > 0) {
      const urlStore = stores.find(s => String(s.id) === String(storeId));
      if (urlStore && (!selectedStore || String(selectedStore.id) !== String(storeId))) {
        setSelectedStore(urlStore);
      }
    }
  }, [storeId, stores, selectedStore, setSelectedStore, isPathAdmin]);

  /* ── Filtered list (tab filtering only — search/type are handled server-side) ── */
  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      const tab = classifyTab(tx);
      const matchTab = activeTab === 'all' || 
                       (activeTab === 'pending-requests' ? tx.status === 'Pending' : tab === activeTab);
      const matchSender = !filterSender || tx.sender === filterSender;
      const matchReceiver = !filterReceiver || tx.receiver === filterReceiver;
      return matchTab && matchSender && matchReceiver;
    });
  }, [transactions, activeTab, filterSender, filterReceiver]);

  const paginated = filtered;

  /* ── Tab counts (calculated from all transactions for correct total numbers) ── */
  const tabCounts = useMemo(() => {
    const counts = { all: mappedAllTransactions.length, 'admin-to-branch': 0, 'branch-to-branch': 0, 'branch-to-admin': 0, 'pending-requests': 0 };
    mappedAllTransactions.forEach(tx => {
      const t = classifyTab(tx);
      if (counts[t] !== undefined) counts[t]++;
      if (tx.status === 'Pending') counts['pending-requests']++;
    });
    return counts;
  }, [mappedAllTransactions]);

  const resetPage = () => setCurrentPage(1);

  const hasFilters = searchTerm || filterSender || filterReceiver || filterType;

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterSender('');
    setFilterReceiver('');
    setFilterType('');
    resetPage();
  };

  const handleNewTransaction = async (data) => {
    await createTransactionAsync({
      type: data.type,
      payload: data.payload,
    });
    setShowNewModal(false);
  };

  const handleNewRequest = async (data) => {
    await createManagerRequestAsync(data);
    setShowNewModal(false);
  };

  const handleNewPush = async (data) => {
    await createManagerPushAsync(data);
    setShowNewModal(false);
  };

  const handleNewPurchase = async (data) => {
    await createManagerPurchaseAsync(data);
    setShowNewModal(false);
  };

  const handleNewDamage = async (data) => {
    await createManagerDamageAsync(data);
    setShowNewModal(false);
  };

  const handleNewLoss = async (data) => {
    await createManagerLossAsync(data);
    setShowNewModal(false);
  };

  const handleNewSale = async (data) => {
    await createManagerSaleAsync(data);
    setShowNewModal(false);
  };

  const handleNewReturn = async (data) => {
    await createManagerReturnAsync(data);
    setShowNewModal(false);
  };

  const isAdminOrAccountant = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'accountant';

  const selectCls = 'px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white text-slate-700 transition-all';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">

      {/* ── Breadcrumb + Header ── */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 space-x-2">
          <Link to={buildPath('dashboard')} className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-semibold">Transactions</span>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ArrowRightLeft className="w-8 h-8 text-blue-500" />
              Transactions
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm sm:text-base">
              Track and manage inventory movements across all stores.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {showStoreSwitcher && (
              <div className="relative animate-fade-in">
                <select
                  value={inPageStoreId}
                  onChange={(e) => {
                    setInPageStoreId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-10 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm appearance-none cursor-pointer"
                >
                  <option value="admin">All Store</option>
                  <option value="warehouse">Warehouse (Central)</option>
                  {stores.filter(s => s.id !== 'admin' && s.store_name !== 'All Store' && s.name !== 'All Store').map(s => (
                    <option key={s.id} value={s.id}>{s.store_name}</option>
                  ))}
                </select>
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            )}
            <PermissionGuard permission="transactions:create">
              <button
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex-shrink-0 justify-center animate-fade-in"
              >
                <Plus className="w-4 h-4" />
                New Transaction
              </button>
            </PermissionGuard>
          </div>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        {[
          { label: 'Total', value: tabCounts.all, color: 'text-slate-700 bg-slate-50 border-slate-200', icon: ArrowRightLeft },
          { label: 'Admin → Branch', value: tabCounts['admin-to-branch'], color: 'text-blue-700 bg-blue-50 border-blue-200', icon: Truck },
          { label: 'Branch → Branch', value: tabCounts['branch-to-branch'], color: 'text-purple-700 bg-purple-50 border-purple-200', icon: RefreshCw },
          { label: 'Branch → Admin', value: tabCounts['branch-to-admin'], color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: Building2 },
          { label: 'Pending Requests', value: tabCounts['pending-requests'], color: 'text-amber-700 bg-amber-50 border-amber-200', icon: Clock },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className={`flex items-center gap-4 p-4 sm:p-5 rounded-2xl border shadow-sm ${kpi.color}`}>
              <div className="p-2.5 rounded-xl bg-white/60 flex-shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold opacity-70">{kpi.label}</p>
                <p className="text-2xl font-bold">{kpi.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Tabs ── */}
      {stores.length > 1 && (
        <div className="flex items-center gap-2 mb-5 overflow-x-auto hide-scrollbar pb-1">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); resetPage(); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${isActive
                    ? 'bg-[#0A0F1F] text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                  {tabCounts[tab.id]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Search + Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); resetPage(); }}
            placeholder="Search by ID, store, product, type, status…"
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-medium transition-all shadow-sm placeholder:text-slate-400"
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); resetPage(); }}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors">
              <XIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Toggle filters button */}
        <button
          onClick={() => setShowFilters(p => !p)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all flex-shrink-0 ${showFilters || filterSender || filterReceiver || filterType
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {(filterSender || filterReceiver || filterType) && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          )}
        </button>
      </div>

      {/* ── Expandable Filter Row ── */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm animate-fade-in">
          {stores.length > 1 && (
            <>
              <div className="flex-1 min-w-[160px]">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Sender</label>
                <select value={filterSender} onChange={e => { setFilterSender(e.target.value); resetPage(); }} className={selectCls}>
                  <option value="">All Senders</option>
                  {stores.map(store => {
                    const name = store.store_name || store.name || `Store #${store.id}`;
                    return <option key={store.id} value={name}>{name}</option>;
                  })}
                </select>
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Receiver</label>
                <select value={filterReceiver} onChange={e => { setFilterReceiver(e.target.value); resetPage(); }} className={selectCls}>
                  <option value="">All Receivers</option>
                  {stores.map(store => {
                    const name = store.store_name || store.name || `Store #${store.id}`;
                    return <option key={store.id} value={name}>{name}</option>;
                  })}
                </select>
              </div>
            </>
          )}
          <div className="flex-1 min-w-[160px]">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Transaction Type</label>
            <select value={filterType} onChange={e => { setFilterType(e.target.value); resetPage(); }} className={selectCls}>
              <option value="">All Types</option>
              {TRANSACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.value}</option>)}
            </select>
          </div>
          {hasFilters && (
            <div className="flex items-end">
              <button onClick={handleClearFilters}
                className="px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors flex items-center gap-1.5">
                <XIcon className="w-3.5 h-3.5" />
                Clear All
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Active filter pills ── */}
      {hasFilters && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-slate-500 font-medium">Active filters:</span>
          {filterSender && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
              <Store className="w-3 h-3" /> From: {filterSender}
              <button onClick={() => setFilterSender('')}><XIcon className="w-3 h-3" /></button>
            </span>
          )}
          {filterReceiver && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
              <Building2 className="w-3 h-3" /> To: {filterReceiver}
              <button onClick={() => setFilterReceiver('')}><XIcon className="w-3 h-3" /></button>
            </span>
          )}
          {filterType && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
              <Tag className="w-3 h-3" /> {filterType}
              <button onClick={() => setFilterType('')}><XIcon className="w-3 h-3" /></button>
            </span>
          )}
          {searchTerm && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
              "{searchTerm}"
              <button onClick={() => setSearchTerm('')}><XIcon className="w-3 h-3" /></button>
            </span>
          )}
          <span className="text-xs text-slate-400 ml-auto">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* ── Table / Card listing ── */}
      {isLoadingTransactions ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-500 font-semibold">
          Loading transactions...
        </div>
      ) : isTransactionsError ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-12 text-center text-red-700 font-semibold">
          Unable to load transactions for this store.
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <ArrowRightLeft className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No transactions found</h3>
          <p className="text-slate-500 text-sm mb-4">Try adjusting your search or filters.</p>
          {hasFilters && (
            <button onClick={handleClearFilters} className="text-blue-600 font-semibold hover:text-blue-700 transition-colors text-sm">
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Transaction ID', 'Date & Time', 'Sender', 'Receiver', 'Category', 'Product', 'Qty', 'Type', 'Status'].map(col => (
                      <th key={col} className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginated.map(tx => {
                    const date = new Date(tx.date);
                    return (
                      <tr
                        key={tx.id}
                        onClick={() => setViewTx(tx)}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-700">{tx.id}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <p className="text-xs font-semibold text-slate-800">{date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                          <p className="text-[10px] text-slate-400">{date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                            <Store className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            {tx.sender}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                            <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            {tx.receiver}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                            <Layers className="w-3 h-3 flex-shrink-0" />
                            {tx.category}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 max-w-[160px]">
                          <p className="text-xs font-semibold text-slate-800 truncate">{tx.product}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">
                            {tx.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <TypeBadge type={tx.type} />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            {tx.status === 'Rejected' && tx.rejectionReason ? (
                              <div className="relative group/tooltip">
                                <StatusBadge status={tx.status} />
                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover/tooltip:block bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-md whitespace-nowrap z-50">
                                  Reason: {tx.rejectionReason}
                                </div>
                              </div>
                            ) : (
                              <StatusBadge status={tx.status} />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards — fully clickable */}
          <div className="md:hidden space-y-3">
            {paginated.map(tx => {
              const date = new Date(tx.date);
              return (
                <div
                  key={tx.id}
                  onClick={() => setViewTx(tx)}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3 cursor-pointer hover:shadow-md hover:border-blue-200 active:scale-[0.99] transition-all"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2" onClick={(e) => {
                    if (e.target.closest('button')) {
                      e.stopPropagation();
                    }
                  }}>
                    <div>
                      <p className="font-mono text-xs font-bold text-slate-500">{tx.id}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {tx.status === 'Rejected' && tx.rejectionReason ? (
                        <div className="relative group/tooltip">
                          <StatusBadge status={tx.status} />
                          <div className="absolute bottom-full mb-1 right-0 hidden group-hover/tooltip:block bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-md whitespace-nowrap z-50">
                            Reason: {tx.rejectionReason}
                          </div>
                        </div>
                      ) : (
                        <StatusBadge status={tx.status} />
                      )}

                    </div>
                  </div>

                  {/* Transfer arrow */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-semibold text-slate-700 truncate">{tx.sender}</span>
                    <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-700 truncate">{tx.receiver}</span>
                  </div>

                  {/* Details row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <TypeBadge type={tx.type} />
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                      <Package className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[120px]">{tx.product}</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded-md font-bold text-slate-700">×{tx.quantity}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            totalItems={filterSender || filterReceiver ? filtered.length : totalTransactions}
            itemsPerPage={ITEMS_PER_PAGE}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* ── Modals ── */}
      {isAdminOrAccountant ? (
        <NewTransactionModal
          isOpen={showNewModal}
          onClose={() => setShowNewModal(false)}
          onSubmit={handleNewTransaction}
          currentStore={effectiveCurrentStore}
          stores={stores}
          isSubmitting={isCreatingTransaction}
        />
      ) : (
        <ManagerNewTransactionModal
          isOpen={showNewModal}
          onClose={() => setShowNewModal(false)}
          onRequest={handleNewRequest}
          onPush={handleNewPush}
          onPurchase={handleNewPurchase}
          onDamage={handleNewDamage}
          onLoss={handleNewLoss}
          onSale={handleNewSale}
          onReturn={handleNewReturn}
          currentUser={user}
          stores={stores}
          isSubmitting={
            isCreatingTransaction ||
            isCreatingManagerRequest ||
            isCreatingManagerPush ||
            isCreatingManagerPurchase ||
            isCreatingManagerDamage ||
            isCreatingManagerLoss ||
            isCreatingManagerSale ||
            isCreatingManagerReturn
          }
        />
      )}
      <TransactionDetailModal
        isOpen={!!viewTx}
        transaction={viewTx}
        onClose={() => setViewTx(null)}
        onApprove={async (id) => {
          await approveTransactionAsync(id);
          setViewTx(null);
        }}
        onReject={async (id, reason) => {
          await rejectTransactionAsync({ id, payload: { reason } });
          setViewTx(null);
        }}
        isApproving={isApprovingTransaction}
        isRejecting={isRejectingTransaction}
        canApprove={
          viewTx?.status === 'Pending' &&
          perms.canUpdate &&
          (isAdminOrAccountant || (
            viewTx?.isRequest
              ? String(viewTx?.raw?.send_store_id) === String(user?.store_id)
              : String(viewTx?.raw?.receive_store_id) === String(user?.store_id)
          ))
        }
      />
    </div>
  );
};

export default Transactions;
