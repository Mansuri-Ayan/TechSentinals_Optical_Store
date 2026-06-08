import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, Store, ChevronRight, X, Filter,
  Plus, Receipt, TrendingDown, CheckCircle, Clock,
  XCircle, CreditCard, Tag, FileText,
  Upload, RefreshCw, Repeat, IndianRupee,
} from 'lucide-react';
import { EXPENSE_MOCK_DATA, EXPENSE_CATEGORIES } from '../../data/expensesData';
import Pagination from '../../components/shared/Pagination';
import InventoryDetailDrawer from '../../components/admin/InventoryDetailDrawer';

/* ─────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────── */
const ITEMS_PER_PAGE = 10;
const TODAY = new Date().toISOString().split('T')[0];

const APPROVAL_CONFIG = {
  Approved: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  Pending:  { color: 'text-amber-700  bg-amber-50  border-amber-200',     dot: 'bg-amber-500'   },
  Rejected: { color: 'text-red-700    bg-red-50    border-red-200',       dot: 'bg-red-500'     },
};

const APPROVAL_TABS = [
  { key: 'All',      label: 'All Expenses' },
  { key: 'Pending',  label: 'Pending Approval' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Rejected', label: 'Rejected' },
];

const PAYMENT_METHODS     = ['Cash', 'UPI', 'Bank Transfer', 'Credit Card', 'Cheque', 'Other'];
const RECURRING_INTERVALS = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];

/* ─────────────────────────────────────────────────────────
   APPROVAL BADGE
───────────────────────────────────────────────────────── */
const ApprovalBadge = ({ status }) => {
  const cfg   = APPROVAL_CONFIG[status] || APPROVAL_CONFIG.Pending;
  const label = status === 'Pending' ? 'Pending Approval' : status;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {label}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────
   ADD CATEGORY MODAL  (portal, z-[1000])
───────────────────────────────────────────────────────── */
const AddCategoryModal = ({ isOpen, onClose, onAdd }) => {
  const [form, setForm]     = useState({ name: '', description: '', status: 'Active' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) { setForm({ name: '', description: '', status: 'Active' }); setErrors({}); }
  }, [isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Category name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    onAdd({ ...form, id: Date.now() });
    onClose();
  };

  const ic = (f) =>
    `w-full px-3 py-2.5 text-sm font-medium border rounded-xl focus:outline-none focus:ring-4 transition-all bg-white ${errors[f]
      ? 'border-red-400 focus:ring-red-100 focus:border-red-500'
      : 'border-slate-200 focus:ring-violet-500/10 focus:border-violet-500'}`;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center">
              <Tag className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add Expense Category</h2>
              <p className="text-xs text-slate-500">Create a new expense category</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Rent & Utilities"
              className={ic('name')}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Brief description of this category..."
              className="w-full px-3 py-2.5 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all bg-white resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className={ic('status')}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-all shadow-md flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

/* ─────────────────────────────────────────────────────────
   ADD EXPENSE MODAL  (portal, z-[999], covers sidebar)
───────────────────────────────────────────────────────── */
const EMPTY_FORM = {
  title: '', category: '', description: '', amount: '',
  expenseDate: '', store: '', paymentMethod: '', referenceNumber: '',
  receipt: null, isRecurring: false, recurringInterval: '',
};

const AddExpenseModal = ({ isOpen, onClose, onSubmit, categories, stores, isSubmitting }) => {
  const [form, setForm]             = useState(EMPTY_FORM);
  const [errors, setErrors]         = useState({});
  const [showAddCat, setShowAddCat] = useState(false);
  const [localCats, setLocalCats]   = useState(categories);
  const [receiptName, setReceiptName] = useState('');

  useEffect(() => { setLocalCats(categories); }, [categories]);
  useEffect(() => {
    if (isOpen) { setForm(EMPTY_FORM); setErrors({}); setReceiptName(''); }
  }, [isOpen]);

  if (!isOpen) return null;

  const set = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    setErrors(p => ({ ...p, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim())  e.title   = 'Title is required';
    if (!form.category)      e.category = 'Category is required';
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
                             e.amount  = 'Enter a valid amount';
    if (!form.expenseDate)   e.expenseDate = 'Date is required';
    if (!form.store)         e.store   = 'Store is required';
    if (!form.paymentMethod) e.paymentMethod = 'Payment method is required';
    if (form.isRecurring && !form.recurringInterval)
                             e.recurringInterval = 'Select an interval';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    try { await onSubmit(form); } catch (_) {}
  };

  const ic = (f) =>
    `w-full px-3 py-2.5 text-sm font-medium border rounded-xl focus:outline-none focus:ring-4 transition-all bg-white ${errors[f]
      ? 'border-red-400 focus:ring-red-100 focus:border-red-500'
      : 'border-slate-200 focus:ring-violet-500/10 focus:border-violet-500'}`;

  const allStores = ['Admin Store', ...stores.filter(s => s !== 'Admin Store')];

  return createPortal(
    <>
      {/* Overlay covers sidebar at z-[999] */}
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 font-sans animate-fade-in">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

        <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-slide-up">

          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0">
                <Receipt className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Add Expense</h2>
                <p className="text-xs text-slate-500">Record a new business expense</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable body */}
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
            <div className="px-5 sm:px-6 py-5 space-y-4">

              {/* Expense Title */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Expense Title <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder="e.g. Monthly Store Rent – Main Branch"
                  className={ic('title')}
                />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
              </div>

              {/* Category + Add button */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Expense Category <span className="text-red-500">*</span>
                </label>
                <div className="flex items-stretch gap-2">
                  <select value={form.category} onChange={e => set('category', e.target.value)} className={`${ic('category')} flex-1`}>
                    <option value="">Select category...</option>
                    {localCats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddCat(true)}
                    title="Add new category"
                    className="w-10 h-10 flex-shrink-0 bg-violet-50 border border-violet-200 rounded-xl flex items-center justify-center text-violet-600 hover:bg-violet-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Optional notes or context..."
                  className="w-full px-3 py-2.5 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all bg-white resize-none"
                />
              </div>

              {/* Amount + Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1 block">
                    <IndianRupee className="w-3.5 h-3.5" /> Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number" min="0.01" step="0.01"
                    value={form.amount}
                    onChange={e => set('amount', e.target.value)}
                    placeholder="e.g. 15000"
                    className={ic('amount')}
                  />
                  {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Expense Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date" max={TODAY}
                    value={form.expenseDate}
                    onChange={e => set('expenseDate', e.target.value)}
                    className={ic('expenseDate')}
                  />
                  {errors.expenseDate && <p className="text-xs text-red-500 mt-1">{errors.expenseDate}</p>}
                </div>
              </div>

              {/* Store + Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Store / Branch <span className="text-red-500">*</span>
                  </label>
                  <select value={form.store} onChange={e => set('store', e.target.value)} className={ic('store')}>
                    <option value="">Select store...</option>
                    {allStores.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.store && <p className="text-xs text-red-500 mt-1">{errors.store}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} className={ic('paymentMethod')}>
                    <option value="">Select method...</option>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {errors.paymentMethod && <p className="text-xs text-red-500 mt-1">{errors.paymentMethod}</p>}
                </div>
              </div>

              {/* Reference Number */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Reference Number</label>
                <input
                  value={form.referenceNumber}
                  onChange={e => set('referenceNumber', e.target.value)}
                  placeholder="e.g. TXN-HDFC-001234 (optional)"
                  className={ic('referenceNumber')}
                />
              </div>

              {/* Receipt Upload */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Receipt / Image</label>
                <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-all group">
                  <Upload className="w-4 h-4 text-slate-400 group-hover:text-violet-500 flex-shrink-0 transition-colors" />
                  <span className="text-sm text-slate-500 group-hover:text-violet-600 font-medium transition-colors truncate">
                    {receiptName || 'Click to upload receipt (JPG, PNG, PDF)'}
                  </span>
                  <input
                    type="file" accept="image/*,.pdf" className="sr-only"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) { set('receipt', file); setReceiptName(file.name); }
                    }}
                  />
                </label>
              </div>

              {/* Is Recurring toggle */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => set('isRecurring', !form.isRecurring)}
                  className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 focus:outline-none ${form.isRecurring ? 'bg-violet-600' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isRecurring ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" /> Is Recurring
                  </p>
                  <p className="text-xs text-slate-400">This expense repeats on a schedule</p>
                </div>
              </div>

              {/* Recurring interval */}
              {form.isRecurring && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Recurring Interval <span className="text-red-500">*</span>
                  </label>
                  <select value={form.recurringInterval} onChange={e => set('recurringInterval', e.target.value)} className={ic('recurringInterval')}>
                    <option value="">Select interval...</option>
                    {RECURRING_INTERVALS.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                  {errors.recurringInterval && <p className="text-xs text-red-500 mt-1">{errors.recurringInterval}</p>}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 flex-shrink-0 bg-slate-50">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting}
                className="px-5 py-2 text-sm font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                <Plus className="w-4 h-4" />
                {isSubmitting ? 'Saving...' : 'Add Expense'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <AddCategoryModal
        isOpen={showAddCat}
        onClose={() => setShowAddCat(false)}
        onAdd={(cat) => {
          setLocalCats(prev => [...prev, cat]);
          set('category', cat.name);
        }}
      />
    </>,
    document.body
  );
};

/* ─────────────────────────────────────────────────────────
   MAIN EXPENSES PAGE
───────────────────────────────────────────────────────── */
const Expenses = () => {
  const [searchTerm, setSearchTerm]         = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStore, setFilterStore]       = useState('');
  const [filterApproval, setFilterApproval] = useState('All');
  const [showFilters, setShowFilters]       = useState(false);
  const [currentPage, setCurrentPage]       = useState(1);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showAddModal, setShowAddModal]     = useState(false);
  const [categories, setCategories]         = useState(EXPENSE_CATEGORIES);
  const [expenses, setExpenses]             = useState(EXPENSE_MOCK_DATA);
  const [isSubmitting, setIsSubmitting]     = useState(false);

  const resetPage = () => setCurrentPage(1);

  /* sync selected expense after approve/reject so drawer updates live */
  useEffect(() => {
    if (selectedExpense) {
      const updated = expenses.find(e => e.id === selectedExpense.id);
      if (updated) setSelectedExpense(updated);
    }
  }, [expenses]); // eslint-disable-line

  const stores = useMemo(() => {
    return Array.from(new Set(expenses.map(e => e.store))).sort();
  }, [expenses]);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return expenses.filter(exp => {
      const matchSearch = !q ||
        exp.title.toLowerCase().includes(q) ||
        exp.category.toLowerCase().includes(q) ||
        exp.store.toLowerCase().includes(q) ||
        exp.expenseId.toLowerCase().includes(q) ||
        exp.paymentMethod.toLowerCase().includes(q) ||
        (exp.recordedBy || '').toLowerCase().includes(q);
      const matchCat      = !filterCategory || exp.category === filterCategory;
      const matchStore    = !filterStore    || exp.store    === filterStore;
      const matchApproval = filterApproval === 'All' || exp.approvalStatus === filterApproval;
      return matchSearch && matchCat && matchStore && matchApproval;
    });
  }, [expenses, searchTerm, filterCategory, filterStore, filterApproval]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const kpis = useMemo(() => {
    const total    = expenses.reduce((s, e) => s + e.amount, 0);
    const approved = expenses.filter(e => e.approvalStatus === 'Approved').reduce((s, e) => s + e.amount, 0);
    const pending  = expenses.filter(e => e.approvalStatus === 'Pending').length;
    const month    = expenses.filter(e => e.expenseDate?.startsWith('2026-06')).reduce((s, e) => s + e.amount, 0);
    return { total, approved, pending, month };
  }, [expenses]);

  const tabCounts = useMemo(() => {
    const c = { All: expenses.length, Pending: 0, Approved: 0, Rejected: 0 };
    expenses.forEach(e => { if (c[e.approvalStatus] !== undefined) c[e.approvalStatus]++; });
    return c;
  }, [expenses]);

  const hasFilters = searchTerm || filterCategory || filterStore || filterApproval !== 'All';

  const clearFilters = () => {
    setSearchTerm(''); setFilterCategory(''); setFilterStore('');
    setFilterApproval('All'); resetPage();
  };

  /* ── Approval actions ── */
  const handleApprove = (exp) => {
    setExpenses(prev => prev.map(e =>
      e.id === exp.id
        ? { ...e, approvalStatus: 'Approved', approvedBy: 'Admin User', approvedDate: TODAY, rejectedBy: null, rejectedDate: null, rejectionReason: null }
        : e
    ));
  };

  const handleReject = (exp, reason) => {
    setExpenses(prev => prev.map(e =>
      e.id === exp.id
        ? { ...e, approvalStatus: 'Rejected', rejectedBy: 'Admin User', rejectedDate: TODAY, rejectionReason: reason, approvedBy: null, approvedDate: null }
        : e
    ));
  };

  const handleAddExpense = async (form) => {
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 500));
    const newExp = {
      ...form,
      id: Date.now(),
      type: 'expense',
      expenseId: `EXP-2026-${String(expenses.length + 1).padStart(3, '0')}`,
      amount: Number(form.amount),
      paymentStatus: 'Pending',
      approvalStatus: 'Pending',
      approvedBy: null, approvedDate: null,
      rejectedBy: null, rejectedDate: null, rejectionReason: null,
      recordedBy: 'Admin User',
      receiptUrl: null,
    };
    setExpenses(p => [newExp, ...p]);
    setIsSubmitting(false);
    setShowAddModal(false);
  };

  const fmt     = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto font-sans overflow-x-hidden">

      {/* ── Breadcrumb + Header ── */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 gap-1.5">
          <span className="hover:text-slate-800 cursor-pointer transition-colors">Dashboard</span>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-semibold">Expenses</span>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight">
              Expense Management
            </h1>
            <p className="text-slate-500 mt-1 text-sm sm:text-base">
              Track, manage, and approve business expenses across all branches.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 w-full sm:w-auto flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          { label: 'Total Expenses',   value: fmt(kpis.total),    icon: TrendingDown, tc: 'text-slate-700',  bg: 'bg-slate-50',   bc: 'border-slate-200'   },
          { label: 'This Month',       value: fmt(kpis.month),    icon: Receipt,      tc: 'text-violet-700', bg: 'bg-violet-50',  bc: 'border-violet-200'  },
          { label: 'Approved Amount',  value: fmt(kpis.approved), icon: CheckCircle,  tc: 'text-emerald-700',bg: 'bg-emerald-50', bc: 'border-emerald-200' },
          { label: 'Pending Approval', value: kpis.pending,       icon: Clock,        tc: 'text-amber-700',  bg: 'bg-amber-50',   bc: 'border-amber-200'   },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className={`flex items-center gap-3 p-4 sm:p-5 rounded-2xl border shadow-sm bg-white ${k.bc}`}>
              <div className={`p-2.5 rounded-xl flex-shrink-0 ${k.tc} ${k.bg}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 truncate">{k.label}</p>
                <p className="text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate">{k.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Approval Status Tabs ── */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto hide-scrollbar pb-1">
        {APPROVAL_TABS.map(tab => {
          const active = filterApproval === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => { setFilterApproval(tab.key); resetPage(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 border ${
                active ? 'bg-[#0A0F1F] text-white border-[#0A0F1F] shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                {tabCounts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Search + Filter Toggle ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); resetPage(); }}
            placeholder="Search by title, category, store, recorded by..."
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 text-sm font-medium transition-all shadow-sm placeholder:text-slate-400"
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); resetPage(); }}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(p => !p)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all flex-shrink-0 ${
            showFilters || filterCategory || filterStore
              ? 'bg-violet-50 text-violet-700 border-violet-200'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Filter className="w-4 h-4" /> Filters
          {(filterCategory || filterStore) && <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />}
        </button>
      </div>

      {/* ── Expandable Filters ── */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Category</label>
            <select
              value={filterCategory}
              onChange={e => { setFilterCategory(e.target.value); resetPage(); }}
              className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 bg-white text-slate-700 transition-all"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Store / Branch</label>
            <select
              value={filterStore}
              onChange={e => { setFilterStore(e.target.value); resetPage(); }}
              className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 bg-white text-slate-700 transition-all"
            >
              <option value="">All Stores</option>
              {stores.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {hasFilters && (
            <div className="sm:col-span-2 flex justify-end">
              <button onClick={clearFilters}
                className="px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors flex items-center gap-1.5">
                <X className="w-3.5 h-3.5" /> Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Active filter pills ── */}
      {hasFilters && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-slate-500 font-medium">Active:</span>
          {filterApproval !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
              {filterApproval === 'Pending' ? 'Pending Approval' : filterApproval}
              <button onClick={() => { setFilterApproval('All'); resetPage(); }}><X className="w-3 h-3" /></button>
            </span>
          )}
          {filterCategory && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
              <Tag className="w-3 h-3" /> {filterCategory}
              <button onClick={() => setFilterCategory('')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {filterStore && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
              <Store className="w-3 h-3" /> {filterStore}
              <button onClick={() => setFilterStore('')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {searchTerm && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-full text-xs font-semibold">
              "{searchTerm}"
              <button onClick={() => { setSearchTerm(''); resetPage(); }}><X className="w-3 h-3" /></button>
            </span>
          )}
          <span className="text-xs text-slate-400 ml-auto">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* ── Empty State ── */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 sm:p-14 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <Receipt className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No expenses found</h3>
          <p className="text-slate-500 text-sm mb-4">Try adjusting your search or filters.</p>
          {hasFilters && (
            <button onClick={clearFilters} className="text-violet-600 font-semibold hover:text-violet-700 transition-colors text-sm">
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">

          {/* ── Desktop Table ── */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Expense Title', 'Category', 'Amount', 'Date', 'Payment', 'Store / Branch', 'Status', 'Recorded By'].map(col => (
                      <th key={col} className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginated.map(exp => (
                    <tr
                      key={exp.id}
                      onClick={() => setSelectedExpense(exp)}
                      className="hover:bg-violet-50/40 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3.5 max-w-[200px]">
                        <p className="font-semibold text-slate-900 truncate text-sm">{exp.title}</p>
                        <p className="font-mono text-[10px] text-slate-400 mt-0.5">{exp.expenseId}</p>
                        {exp.isRecurring && (
                          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-violet-50 text-violet-600 border border-violet-200 rounded text-[10px] font-bold">
                            <RefreshCw className="w-2.5 h-2.5" /> {exp.recurringInterval}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-600">
                          <Tag className="w-3 h-3 text-slate-400 flex-shrink-0" /> {exp.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-black text-slate-900 whitespace-nowrap">{fmt(exp.amount)}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-slate-500 whitespace-nowrap">{fmtDate(exp.expenseDate)}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-600">
                          <CreditCard className="w-3 h-3 text-slate-400 flex-shrink-0" /> {exp.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-600">
                          <Store className="w-3 h-3 text-slate-400 flex-shrink-0" /> {exp.store}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <ApprovalBadge status={exp.approvalStatus} />
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-slate-600 whitespace-nowrap">{exp.recordedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="md:hidden space-y-3">
            {paginated.map(exp => (
              <div
                key={exp.id}
                onClick={() => setSelectedExpense(exp)}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3 cursor-pointer hover:shadow-md hover:border-violet-200 active:scale-[0.99] transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] font-bold text-slate-400">{exp.expenseId}</p>
                    <h3 className="font-bold text-slate-900 text-sm mt-0.5 leading-snug line-clamp-2">{exp.title}</h3>
                  </div>
                  <div className="flex-shrink-0 mt-0.5">
                    <ApprovalBadge status={exp.approvalStatus} />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xl font-black text-slate-900">{fmt(exp.amount)}</span>
                  <span className="text-xs text-slate-400 font-semibold">{fmtDate(exp.expenseDate)}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-semibold text-slate-500">
                    <Tag className="w-3 h-3 flex-shrink-0" /> {exp.category}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-semibold text-slate-500">
                    <Store className="w-3 h-3 flex-shrink-0" /> {exp.store}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-semibold text-slate-500">
                    <CreditCard className="w-3 h-3 flex-shrink-0" /> {exp.paymentMethod}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>By <span className="font-semibold text-slate-600">{exp.recordedBy}</span></span>
                  {exp.isRecurring && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-violet-50 text-violet-600 border border-violet-200 rounded text-[10px] font-bold">
                      <RefreshCw className="w-2.5 h-2.5" /> {exp.recurringInterval}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Pagination ── */}
          <Pagination
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* ── Detail Drawer ── */}
      <InventoryDetailDrawer
        item={selectedExpense}
        onClose={() => setSelectedExpense(null)}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* ── Add Expense Modal ── */}
      <AddExpenseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddExpense}
        categories={categories}
        stores={stores}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default Expenses;
