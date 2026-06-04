import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightLeft, Plus, Search, ChevronRight,
  X as XIcon, Building2, Store, Package, Filter,
  CheckCircle, Clock, XCircle, AlertTriangle, Tag,
  Layers, RotateCcw, ShoppingCart, TrendingUp, Truck,
  RefreshCw, Trash2, Eye,
} from 'lucide-react';
import Pagination from '../../components/shared/Pagination';

/* ─────────────────────────────────────────────────────────
   CONSTANTS & MOCK DATA
───────────────────────────────────────────────────────── */
const STORES = ['Admin Store', 'Main Branch', 'Branch 2', 'Branch 3'];

const CATEGORIES = ['Frames', 'Lenses', 'Contact Lens', 'Accessories', 'Cleaning Kit', 'Cases'];

const PRODUCTS = [
  'Ray-Ban Aviator Classic', 'Oakley Holbrook Sunglasses', 'Lenskart John Jacobs Round',
  'Titan Eye+ Metro Rimless', 'Fastrack Geometric Square', 'Essilor Varilux X Progressive',
  'Crizal Forte UV Lens', 'Hoya Sync III Blue Cut', 'Alcon Daily Total1 Contacts',
  'Bausch & Lomb Renu Solution', 'Opticlens Microfibre Cloth', 'Protect Hard Case Premium',
];

const TRANSACTION_TYPES = [
  { value: 'Inventory Transfer', icon: ArrowRightLeft, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'Sale', icon: ShoppingCart, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { value: 'Purchase', icon: TrendingUp, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { value: 'Return', icon: RotateCcw, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'Damage', icon: Trash2, color: 'text-red-600 bg-red-50 border-red-200' },
];

const STATUS_OPTIONS = ['Completed', 'Pending', 'Cancelled', 'Failed'];

const STATUS_CONFIG = {
  Completed: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle },
  Pending: { color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500', icon: Clock },
  Cancelled: { color: 'text-slate-600 bg-slate-100 border-slate-200', dot: 'bg-slate-400', icon: XCircle },
  Failed: { color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500', icon: AlertTriangle },
};

// Tab definitions: key used to filter by transfer direction
const TABS = [
  { id: 'all', label: 'All Transactions', icon: ArrowRightLeft },
  { id: 'admin-to-branch', label: 'Admin → Branch', icon: Truck },
  { id: 'branch-to-branch', label: 'Branch → Branch', icon: RefreshCw },
  { id: 'branch-to-admin', label: 'Branch → Admin', icon: Building2 },
];

// Helper: classify a transaction into a tab
const classifyTab = (tx) => {
  const senderIsAdmin = tx.sender.toLowerCase().includes('admin');
  const receiverIsAdmin = tx.receiver.toLowerCase().includes('admin');
  if (senderIsAdmin && !receiverIsAdmin) return 'admin-to-branch';
  if (!senderIsAdmin && receiverIsAdmin) return 'branch-to-admin';
  if (!senderIsAdmin && !receiverIsAdmin) return 'branch-to-branch';
  return 'other';
};

// Generate 30 mock transactions
const generateMockData = () => {
  const types = TRANSACTION_TYPES.map(t => t.value);
  const statuses = STATUS_OPTIONS;
  const pairs = [
    ['Admin Store', 'Main Branch'],
    ['Admin Store', 'Branch 2'],
    ['Admin Store', 'Branch 3'],
    ['Main Branch', 'Branch 2'],
    ['Branch 2', 'Main Branch'],
    ['Branch 2', 'Branch 3'],
    ['Main Branch', 'Admin Store'],
    ['Branch 3', 'Admin Store'],
  ];
  return Array.from({ length: 30 }, (_, i) => {
    const pair = pairs[i % pairs.length];
    const type = types[i % types.length];
    const status = statuses[i % statuses.length];
    const date = new Date(2026, 5 - (i % 6), 1 + (i % 28));
    return {
      id: `TXN-${String(1000 + i).padStart(4, '0')}`,
      date: date.toISOString(),
      sender: pair[0],
      receiver: pair[1],
      category: CATEGORIES[i % CATEGORIES.length],
      product: PRODUCTS[i % PRODUCTS.length],
      quantity: (i % 10) + 1,
      type,
      status,
      remarks: i % 3 === 0 ? 'Urgent restock required.' : i % 5 === 0 ? 'Regular monthly transfer.' : '',
    };
  });
};

const MOCK_TRANSACTIONS = generateMockData();
const ITEMS_PER_PAGE = 10;

/* ─────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>
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

/* ─────────────────────────────────────────────────────────
   NEW TRANSACTION MODAL
───────────────────────────────────────────────────────── */
const EMPTY_FORM = {
  sender: '', receiver: '', category: '', product: '', quantity: '',
  type: 'Inventory Transfer', remarks: '',
};

const NewTransactionModal = ({ isOpen, onClose, onSubmit }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const set = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.sender) e.sender = 'Sender is required';
    if (!form.receiver) e.receiver = 'Receiver is required';
    if (form.sender && form.receiver && form.sender === form.receiver)
      e.receiver = 'Sender and receiver must be different';
    if (!form.category) e.category = 'Category is required';
    if (!form.product) e.product = 'Product is required';
    if (!form.quantity || isNaN(form.quantity) || Number(form.quantity) < 1)
      e.quantity = 'Enter a valid quantity (≥ 1)';
    if (!form.type) e.type = 'Transaction type is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
    setForm(EMPTY_FORM);
    setErrors({});
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[95dvh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">New Transaction</h2>
              <p className="text-xs text-slate-500">Record a new inventory movement</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-5 sm:px-6 py-5 space-y-4">

            {/* Sender + Receiver */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Sender Store <span className="text-red-500">*</span></label>
                <select value={form.sender} onChange={e => set('sender', e.target.value)} className={inputCls('sender')}>
                  <option value="">Select sender…</option>
                  {STORES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.sender && <p className="text-xs text-red-500 mt-1">{errors.sender}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Receiver Store <span className="text-red-500">*</span></label>
                <select value={form.receiver} onChange={e => set('receiver', e.target.value)} className={inputCls('receiver')}>
                  <option value="">Select receiver…</option>
                  {STORES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.receiver && <p className="text-xs text-red-500 mt-1">{errors.receiver}</p>}
              </div>
            </div>

            {/* Category + Product */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Category <span className="text-red-500">*</span></label>
                <select value={form.category} onChange={e => set('category', e.target.value)} className={inputCls('category')}>
                  <option value="">Select category…</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Product / Inventory <span className="text-red-500">*</span></label>
                <select value={form.product} onChange={e => set('product', e.target.value)} className={inputCls('product')}>
                  <option value="">Select product…</option>
                  {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {errors.product && <p className="text-xs text-red-500 mt-1">{errors.product}</p>}
              </div>
            </div>

            {/* Quantity + Transaction Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Quantity <span className="text-red-500">*</span></label>
                <input
                  type="number" min="1" value={form.quantity}
                  onChange={e => set('quantity', e.target.value)}
                  placeholder="e.g. 5"
                  className={inputCls('quantity')}
                />
                {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Transaction Type <span className="text-red-500">*</span></label>
                <select value={form.type} onChange={e => set('type', e.target.value)} className={inputCls('type')}>
                  {TRANSACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.value}</option>)}
                </select>
                {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type}</p>}
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Remarks <span className="text-slate-400">(optional)</span></label>
              <textarea
                rows={3} value={form.remarks}
                onChange={e => set('remarks', e.target.value)}
                placeholder="Add any notes or remarks…"
                className="w-full px-3 py-2.5 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-white resize-none"
              />
            </div>

            {/* Transfer preview pill */}
            {form.sender && form.receiver && form.sender !== form.receiver && (
              <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm font-semibold text-blue-700">
                <Store className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{form.sender}</span>
                <ArrowRightLeft className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{form.receiver}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 flex-shrink-0 bg-slate-50">
            <button type="button" onClick={handleClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-[#0A0F1F] rounded-xl hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   VIEW DETAIL MODAL
───────────────────────────────────────────────────────── */
const ViewDetailModal = ({ transaction, onClose }) => {
  if (!transaction) return null;

  const date = new Date(transaction.date);
  const rows = [
    { label: 'Transaction ID', value: transaction.id, mono: true },
    { label: 'Date & Time', value: `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` },
    { label: 'Sender', value: transaction.sender },
    { label: 'Receiver', value: transaction.receiver },
    { label: 'Category', value: transaction.category },
    { label: 'Product', value: transaction.product },
    { label: 'Quantity', value: transaction.quantity },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
              <Eye className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Transaction Details</h2>
              <p className="text-xs font-mono text-slate-500">{transaction.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* Status + Type row */}
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={transaction.status} />
            <TypeBadge type={transaction.type} />
          </div>

          {/* Transfer arrow */}
          <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl border border-slate-200">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">From</p>
              <p className="font-bold text-slate-900 text-sm truncate">{transaction.sender}</p>
            </div>
            <div className="flex-shrink-0 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm">
              <ArrowRightLeft className="w-4 h-4 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">To</p>
              <p className="font-bold text-slate-900 text-sm truncate">{transaction.receiver}</p>
            </div>
          </div>

          {/* Details table */}
          <div className="rounded-xl border border-slate-100 overflow-hidden">
            {rows.slice(4).map((r, i) => (
              <div key={r.label} className={`flex items-start justify-between px-4 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                <span className="text-xs font-semibold text-slate-500">{r.label}</span>
                <span className={`text-xs font-bold text-slate-900 text-right max-w-[55%] ${r.mono ? 'font-mono' : ''}`}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* Remarks */}
          {transaction.remarks && (
            <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1">Remarks</p>
              <p className="text-sm text-amber-800 font-medium">{transaction.remarks}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex justify-end bg-slate-50">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────── */
const Transactions = () => {
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('transactions');
    return saved ? JSON.parse(saved) : MOCK_TRANSACTIONS;
  });

  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSender, setFilterSender] = useState('');
  const [filterReceiver, setFilterReceiver] = useState('');
  const [filterType, setFilterType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showNewModal, setShowNewModal] = useState(false);
  const [viewTx, setViewTx] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return transactions.filter(tx => {
      const tab = classifyTab(tx);
      const matchTab = activeTab === 'all' || tab === activeTab;
      const matchSender = !filterSender || tx.sender === filterSender;
      const matchReceiver = !filterReceiver || tx.receiver === filterReceiver;
      const matchType = !filterType || tx.type === filterType;
      const matchSearch = !q ||
        tx.id.toLowerCase().includes(q) ||
        tx.sender.toLowerCase().includes(q) ||
        tx.receiver.toLowerCase().includes(q) ||
        tx.product.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        tx.type.toLowerCase().includes(q) ||
        tx.status.toLowerCase().includes(q);
      return matchTab && matchSender && matchReceiver && matchType && matchSearch;
    });
  }, [transactions, activeTab, searchTerm, filterSender, filterReceiver, filterType]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  /* ── Tab counts ── */
  const tabCounts = useMemo(() => {
    const counts = { all: transactions.length, 'admin-to-branch': 0, 'branch-to-branch': 0, 'branch-to-admin': 0 };
    transactions.forEach(tx => {
      const t = classifyTab(tx);
      if (counts[t] !== undefined) counts[t]++;
    });
    return counts;
  }, [transactions]);

  const resetPage = () => setCurrentPage(1);

  const hasFilters = searchTerm || filterSender || filterReceiver || filterType;

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterSender('');
    setFilterReceiver('');
    setFilterType('');
    resetPage();
  };

  const handleNewTransaction = (data) => {
    const newTx = {
      ...data,
      id: `TXN-${String(1000 + transactions.length + 1).padStart(4, '0')}`,
      date: new Date().toISOString(),
      quantity: Number(data.quantity),
      status: 'Pending',
    };
    setTransactions(prev => [newTx, ...prev]);
    setShowNewModal(false);
  };

  const selectCls = 'px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white text-slate-700 transition-all';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">

      {/* ── Breadcrumb + Header ── */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 space-x-2">
          <Link to="/admin/dashboard" className="hover:text-slate-800 transition-colors">Dashboard</Link>
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
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex-shrink-0 w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            New Transaction
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          { label: 'Total', value: transactions.length, color: 'text-slate-700 bg-slate-50 border-slate-200', icon: ArrowRightLeft },
          { label: 'Admin → Branch', value: tabCounts['admin-to-branch'], color: 'text-blue-700 bg-blue-50 border-blue-200', icon: Truck },
          { label: 'Branch → Branch', value: tabCounts['branch-to-branch'], color: 'text-purple-700 bg-purple-50 border-purple-200', icon: RefreshCw },
          { label: 'Branch → Admin', value: tabCounts['branch-to-admin'], color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: Building2 },
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
          <div className="flex-1 min-w-[160px]">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Sender</label>
            <select value={filterSender} onChange={e => { setFilterSender(e.target.value); resetPage(); }} className={selectCls}>
              <option value="">All Senders</option>
              {STORES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Receiver</label>
            <select value={filterReceiver} onChange={e => { setFilterReceiver(e.target.value); resetPage(); }} className={selectCls}>
              <option value="">All Receivers</option>
              {STORES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
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
      {filtered.length === 0 ? (
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
                          <StatusBadge status={tx.status} />
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
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs font-bold text-slate-500">{tx.id}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <StatusBadge status={tx.status} />
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
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* ── Modals ── */}
      <NewTransactionModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSubmit={handleNewTransaction}
      />
      <ViewDetailModal
        transaction={viewTx}
        onClose={() => setViewTx(null)}
      />
    </div>
  );
};

export default Transactions;
