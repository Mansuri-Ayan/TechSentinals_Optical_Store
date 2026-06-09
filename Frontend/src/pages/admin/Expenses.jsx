import { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import {
  Search, Store, ChevronRight, X, Filter,
  Plus, Receipt, TrendingDown, CheckCircle, Clock,
  XCircle, CreditCard, Tag, FileText,
  Upload, RefreshCw, Repeat, IndianRupee,
} from 'lucide-react';
import { 
  getExpenses, 
  getExpenseCategories, 
  createExpense, 
  updateExpense, 
  deleteExpense,
  createExpenseCategory,
  approveExpense,
  rejectExpense
} from '../../api/expense/expense.api';
import { getStoresApi } from '../../api/stores/store.api';
import Pagination from '../../components/shared/Pagination';
import InventoryDetailDrawer from '../../components/admin/InventoryDetailDrawer';
import api from '../../lib/axios';

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
  { key: 'all',      label: 'All Expenses' },
  { key: 'pending',  label: 'Pending Approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const PAYMENT_METHODS     = ['Cash', 'UPI', 'Bank Transfer', 'Credit Card', 'Cheque', 'Other'];
const RECURRING_INTERVALS = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];

// Helper to map UI payment method to Backend enum
const formatPaymentMethodForBackend = (method) => {
  if (!method) return undefined;
  const map = {
    'Cash': 'CASH',
    'UPI': 'UPI',
    'Bank Transfer': 'BANK_TRANSFER',
    'Credit Card': 'CARD',
    'Cheque': 'CHEQUE'
  };
  return map[method] || method.toUpperCase().replace(' ', '_');
};

/* ─────────────────────────────────────────────────────────
   APPROVAL BADGE
───────────────────────────────────────────────────────── */
const ApprovalBadge = ({ isApproved, isRejected }) => {
  const status = isApproved ? 'Approved' : (isRejected ? 'Rejected' : 'Pending');
  const cfg   = APPROVAL_CONFIG[status] || APPROVAL_CONFIG.Pending;
  const label = status;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {label}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────
   ADD CATEGORY MODAL
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
    onAdd(form);
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
   ADD EXPENSE MODAL
───────────────────────────────────────────────────────── */
const EMPTY_FORM = {
  title: '', category_id: '', description: '', amount: '',
  expense_date: TODAY, payment_method: 'Cash', reference_number: '',
  receipt_url: '', is_recurring: false, recurring_interval: '',
};

const AddExpenseModal = ({ isOpen, onClose, onSubmit, categories, isSubmitting, storeName }) => {
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [errors, setErrors]         = useState({});
  const [showAddCat, setShowAddCat] = useState(false);
  const [localCats, setLocalCats]   = useState(categories);

  useEffect(() => { setLocalCats(categories); }, [categories]);
  useEffect(() => {
    if (isOpen) { setForm({ ...EMPTY_FORM }); setErrors({}); }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setForm(p => ({ ...p, [field]: value }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.title || form.title.trim().length < 3)
      e.title = 'Title must be at least 3 characters';
    if (!form.category_id)
      e.category_id = 'Please select a category';
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
      e.amount = 'Enter a valid amount greater than 0';
    if (!form.expense_date)
      e.expense_date = 'Please select a date';
    if (!form.payment_method)
      e.payment_method = 'Please select a payment method';
    if (form.is_recurring && !form.recurring_interval)
      e.recurring_interval = 'Select an interval';
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  };

  const ic = (f) =>
    `w-full px-3 py-2.5 text-sm font-medium border rounded-xl focus:outline-none focus:ring-4 transition-all bg-white ${errors[f]
      ? 'border-red-500 focus:ring-red-100 focus:border-red-500'
      : 'border-slate-200 focus:ring-violet-500/10 focus:border-violet-500'}`;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 font-sans animate-fade-in">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-slide-up">
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
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
            <div className="px-5 sm:px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Expense Title <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.title}
                  onChange={e => handleChange('title', e.target.value)}
                  placeholder="e.g. Monthly Store Rent"
                  className={ic('title')}
                />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Expense Category <span className="text-red-500">*</span>
                </label>
                <div className="flex items-stretch gap-2">
                  <select value={form.category_id} onChange={e => handleChange('category_id', e.target.value)} className={`${ic('category_id')} flex-1`}>
                    <option value="">Select category...</option>
                    {localCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                {errors.category_id && <p className="text-xs text-red-500 mt-1">{errors.category_id}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => handleChange('description', e.target.value)}
                  placeholder="Optional notes or context..."
                  className="w-full px-3 py-2.5 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all bg-white resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1 block">
                    <IndianRupee className="w-3.5 h-3.5" /> Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number" min="0.01" step="0.01"
                    value={form.amount}
                    onChange={e => handleChange('amount', e.target.value)}
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
                    value={form.expense_date}
                    onChange={e => handleChange('expense_date', e.target.value)}
                    className={ic('expense_date')}
                  />
                  {errors.expense_date && <p className="text-xs text-red-500 mt-1">{errors.expense_date}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Store / Branch <span className="text-red-500">*</span>
                  </label>
                  {/* FIX 1: Display current store as readonly display field */}
                  <div className="w-full px-3 py-2.5 text-sm font-medium border border-slate-200 rounded-xl bg-slate-50 text-slate-500 opacity-60 cursor-not-allowed flex items-center gap-2">
                    <Store className="w-4 h-4" />
                    {storeName || 'Loading store...'}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select value={form.payment_method} onChange={e => handleChange('payment_method', e.target.value)} className={ic('payment_method')}>
                    <option value="">Select method...</option>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {errors.payment_method && <p className="text-xs text-red-500 mt-1">{errors.payment_method}</p>}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Reference Number</label>
                <input
                  value={form.reference_number}
                  onChange={e => handleChange('reference_number', e.target.value)}
                  placeholder="e.g. TXN-HDFC-001234 (optional)"
                  className={ic('reference_number')}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Receipt / Image URL</label>
                <input
                   value={form.receipt_url}
                   onChange={e => handleChange('receipt_url', e.target.value)}
                   placeholder="Link to receipt image (optional)"
                   className={ic('receipt_url')}
                />
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleChange('is_recurring', !form.is_recurring)}
                  className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 focus:outline-none ${form.is_recurring ? 'bg-violet-600' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_recurring ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" /> Is Recurring
                  </p>
                  <p className="text-xs text-slate-400">This expense repeats on a schedule</p>
                </div>
              </div>
              {form.is_recurring && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Recurring Interval <span className="text-red-500">*</span>
                  </label>
                  <select value={form.recurring_interval} onChange={e => handleChange('recurring_interval', e.target.value)} className={ic('recurring_interval')}>
                    <option value="">Select interval...</option>
                    {RECURRING_INTERVALS.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                  {errors.recurring_interval && <p className="text-xs text-red-500 mt-1">{errors.recurring_interval}</p>}
                </div>
              )}
            </div>
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
        onAdd={async (cat) => {
          try {
             const res = await createExpenseCategory({ name: cat.name, description: cat.description, is_active: cat.status === 'Active', admin_id: 1 });
             const newCat = res.data;
             setLocalCats(prev => [...prev, newCat]);
             handleChange('category_id', newCat.id);
             setShowAddCat(false);
          } catch (err) { console.error(err); }
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
  const { store_id } = useParams();
  
  const [searchInput, setSearchInput]         = useState('');
  const [search, setSearch]                   = useState('');
  const [categoryId, setCategoryId]           = useState('');
  const [paymentMethod, setPaymentMethod]     = useState('');
  const [activeTab, setActiveTab]             = useState('all');
  const [startDate, setStartDate]             = useState('');
  const [endDate, setEndDate]                 = useState('');
  const [showFilters, setShowFilters]         = useState(false);
  const [page, setPage]                       = useState(1);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showAddModal, setShowAddModal]       = useState(false);
  
  const [categories, setCategories]           = useState([]);
  const [expenses, setExpenses]               = useState([]);
  const [storeName, setStoreName]             = useState('');
  const [total, setTotal]                     = useState(0);
  const [totalPages, setTotalPages]           = useState(0);
  const [isLoading, setIsLoading]             = useState(true);
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [tabCounts, setTabCounts]             = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [approvalLoading, setApprovalLoading] = useState(false);

  // Map tab to approval_status param
  const tabToApprovalParam = {
    all: undefined,
    pending: 'PENDING',
    approved: 'APPROVED',
    rejected: 'REJECTED'
  };

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Fetch counts for each tab
  const fetchTabCounts = useCallback(async () => {
    try {
      const [all, pending, approved, rejected] = await Promise.all([
        getExpenses({ store_id, page: 1, page_size: 1 }),
        getExpenses({ store_id, page: 1, page_size: 1, approval_status: 'PENDING' }),
        getExpenses({ store_id, page: 1, page_size: 1, approval_status: 'APPROVED' }),
        getExpenses({ store_id, page: 1, page_size: 1, approval_status: 'REJECTED' }),
      ]);
      setTabCounts({
        all: all.data.total,
        pending: pending.data.total,
        approved: approved.data.total,
        rejected: rejected.data.total
      });
    } catch (err) {
      console.error('Failed to fetch tab counts:', err);
    }
  }, [store_id]);

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getExpenses({
        store_id,
        page,
        page_size: ITEMS_PER_PAGE,
        ...(search && { search }),
        ...(categoryId && { category_id: categoryId }),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
        ...(paymentMethod && { payment_method: formatPaymentMethodForBackend(paymentMethod) }),
        ...(tabToApprovalParam[activeTab] !== undefined && { approval_status: tabToApprovalParam[activeTab] }),
      });
      
      setExpenses(res.data.items);
      setTotalPages(res.data.pages);
      setTotal(res.data.total);

      // Resolve store name from first item if available
      if (res.data.items.length > 0 && !storeName) {
        setStoreName(res.data.items[0].owner_name);
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setIsLoading(false);
    }
  }, [store_id, page, search, categoryId, startDate, endDate, paymentMethod, activeTab, storeName]);

  // Fallback: fetch store name if expenses list is empty
  useEffect(() => {
    const resolveStoreName = async () => {
      if (expenses.length === 0 && store_id) {
        try {
          const res = await getStoresApi();
          const currentStore = res.items?.find(s => String(s.id) === String(store_id));
          if (currentStore) setStoreName(currentStore.store_name);
        } catch (err) { console.error(err); }
      }
    };
    resolveStoreName();
  }, [expenses.length, store_id]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    fetchTabCounts();
  }, [fetchTabCounts, expenses.length]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await getExpenseCategories(store_id);
        setCategories(res.data);
      } catch (err) { console.error(err); }
    };
    fetchCategories();
  }, [store_id]);

  const kpis = useMemo(() => {
    const totalAmt = expenses.reduce((s, e) => s + e.amount, 0);
    const approved = expenses.filter(e => e.is_approved).reduce((s, e) => s + e.amount, 0);
    const pending  = expenses.filter(e => !e.is_approved && !e.is_rejected).length;
    const month    = expenses.filter(e => e.expense_date?.startsWith('2026-06')).reduce((s, e) => s + e.amount, 0);
    return { total: totalAmt, approved, pending, month };
  }, [expenses]);

  const hasFilters = searchInput || categoryId || paymentMethod || startDate || endDate;

  const handleClearFilters = () => {
    setSearchInput(''); setSearch('');
    setCategoryId(''); setStartDate(''); setEndDate('');
    setPaymentMethod('');
    setPage(1);
  };

  /* ── Approval actions ── */
  const handleApprove = async (exp) => {
    setApprovalLoading('approve');
    try {
      await approveExpense(exp.id);
      fetchExpenses();
      fetchTabCounts();
      setSelectedExpense(null);
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleReject = async (exp, reason) => {
    setApprovalLoading('reject');
    try {
      await rejectExpense(exp.id, reason);
      fetchExpenses();
      fetchTabCounts();
      setSelectedExpense(null);
    } catch (err) {
      console.error('Rejection failed:', err);
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleAddExpense = async (form) => {
    setIsSubmitting(true);
    try {
      // FIX 3: Ensure payload matches backend and includes store_id
      await createExpense({
        owner_type: 'STORE',
        owner_id: Number(store_id),
        category_id: Number(form.category_id),
        title: form.title.trim(),
        description: form.description || null,
        amount: Number(form.amount),
        expense_date: form.expense_date,
        payment_method: formatPaymentMethodForBackend(form.payment_method),
        reference_number: form.reference_number || null,
        receipt_url: form.receipt_url || null,
        is_recurring: form.is_recurring || false,
        recurring_interval: form.recurring_interval ? form.recurring_interval.toUpperCase() : null
      });
      fetchExpenses();
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to add expense:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAmount = (amount) =>
    `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const formatPaymentMethod = (method) => {
    const map = { CASH: 'Cash', UPI: 'UPI', BANK_TRANSFER: 'Bank Transfer', CARD: 'Card', CHEQUE: 'Cheque' }
    return map[method] || method.replace('_', ' ')
  }

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
          { label: 'Total Expenses',   value: formatAmount(kpis.total),    icon: TrendingDown, tc: 'text-slate-700',  bg: 'bg-slate-50',   bc: 'border-slate-200'   },
          { label: 'This Month',       value: formatAmount(kpis.month),    icon: Receipt,      tc: 'text-violet-700', bg: 'bg-violet-50',  bc: 'border-violet-200'  },
          { label: 'Approved Amount',  value: formatAmount(kpis.approved), icon: CheckCircle,  tc: 'text-emerald-700',bg: 'bg-emerald-50', bc: 'border-emerald-200' },
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
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPage(1); }}
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
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by title, category, store, recorded by..."
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 text-sm font-medium transition-all shadow-sm placeholder:text-slate-400"
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(p => !p)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all flex-shrink-0 ${
            showFilters || categoryId || paymentMethod || startDate || endDate
              ? 'bg-violet-50 text-violet-700 border-violet-200'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Filter className="w-4 h-4" /> Filters
          {(categoryId || paymentMethod || startDate || endDate) && <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />}
        </button>
      </div>

      {/* ── Expandable Filters ── */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm animate-slide-down">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Category</label>
            <select
              value={categoryId}
              onChange={e => { setCategoryId(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 bg-white text-slate-700 transition-all"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={e => { setPaymentMethod(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 bg-white text-slate-700 transition-all"
            >
              <option value="">All Methods</option>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 bg-white text-slate-700 transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 bg-white text-slate-700 transition-all"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-3 pt-2">
            <button 
              onClick={handleClearFilters}
              className="px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" /> Clear Filters
            </button>
            <button 
              onClick={() => fetchExpenses()}
              className="px-5 py-2 text-xs font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-all shadow-md flex items-center gap-2"
            >
              <Filter className="w-3.5 h-3.5" /> Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* ── Empty State ── */}
      {!isLoading && expenses.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 sm:p-14 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <Receipt className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No expenses found</h3>
          <p className="text-slate-500 text-sm mb-4">Try adjusting your search or filters.</p>
          {hasFilters && (
            <button onClick={handleClearFilters} className="text-violet-600 font-semibold hover:text-violet-700 transition-colors text-sm">
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">

          {/* ── Desktop Table ── */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative">
             {isLoading && (
              <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-violet-600 animate-spin" />
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Expense Title', 'Category', 'Amount', 'Date', 'Payment', 'Recorded By'].map(col => (
                      <th key={col} className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {expenses.map(exp => (
                    <tr
                      key={exp.id}
                      onClick={() => setSelectedExpense({ 
                        ...exp, 
                        type: 'expense',
                        expenseId: `EXP-${exp.id}`,
                        approvalStatus: exp.is_approved ? 'Approved' : (exp.is_rejected ? 'Rejected' : 'Pending'), 
                        title: exp.title,
                        category: exp.category_name,
                        expenseDate: exp.expense_date,
                        store: exp.owner_name,
                        isRecurring: exp.is_recurring,
                        recurringInterval: exp.recurring_interval,
                        paymentMethod: formatPaymentMethod(exp.payment_method),
                        paymentStatus: exp.is_approved ? 'Paid' : 'Pending',
                        recordedBy: exp.recorded_by_name,
                        approvedBy: exp.approved_by_name,
                        approvedDate: exp.approved_at,
                        rejectedBy: exp.rejected_by_name,
                        rejectedDate: exp.rejected_at,
                        rejectionReason: exp.rejection_reason
                      })}
                      className="hover:bg-violet-50/40 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3.5 max-w-[200px]">
                        <p className="font-semibold text-slate-900 truncate text-sm">{exp.title}</p>
                        <p className="font-mono text-[10px] text-slate-400 mt-0.5">EXP-{exp.id}</p>
                        {exp.is_recurring && (
                          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-violet-50 text-violet-600 border border-violet-200 rounded text-[10px] font-bold">
                            <RefreshCw className="w-2.5 h-2.5" /> {exp.recurring_interval}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-600">
                          <Tag className="w-3 h-3 text-slate-400 flex-shrink-0" /> {exp.category_name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-black text-slate-900 whitespace-nowrap">{formatAmount(exp.amount)}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-slate-500 whitespace-nowrap">{fmtDate(exp.expense_date)}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-600">
                          <CreditCard className="w-3 h-3 text-slate-400 flex-shrink-0" /> {formatPaymentMethod(exp.payment_method)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-slate-600 whitespace-nowrap">{exp.recorded_by_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="md:hidden space-y-3">
            {expenses.map(exp => (
              <div
                key={exp.id}
                onClick={() => setSelectedExpense({ 
                  ...exp, 
                  type: 'expense',
                  expenseId: `EXP-${exp.id}`,
                  approvalStatus: exp.is_approved ? 'Approved' : (exp.is_rejected ? 'Rejected' : 'Pending'), 
                  title: exp.title,
                  category: exp.category_name,
                  expenseDate: exp.expense_date,
                  store: exp.owner_name,
                  isRecurring: exp.is_recurring,
                  recurringInterval: exp.recurring_interval,
                  paymentMethod: formatPaymentMethod(exp.payment_method),
                  paymentStatus: exp.is_approved ? 'Paid' : 'Pending',
                  recordedBy: exp.recorded_by_name,
                  approvedBy: exp.approved_by_name,
                  approvedDate: exp.approved_at,
                  rejectedBy: exp.rejected_by_name,
                  rejectedDate: exp.rejected_at,
                  rejectionReason: exp.rejection_reason
                })}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3 cursor-pointer hover:shadow-md hover:border-violet-200 active:scale-[0.99] transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] font-bold text-slate-400">EXP-{exp.id}</p>
                    <h3 className="font-bold text-slate-900 text-sm mt-0.5 leading-snug line-clamp-2">{exp.title}</h3>
                  </div>
                  <div className="flex-shrink-0 mt-0.5">
                    <ApprovalBadge isApproved={exp.is_approved} isRejected={exp.is_rejected} />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xl font-black text-slate-900">{formatAmount(exp.amount)}</span>
                  <span className="text-xs text-slate-400 font-semibold">{fmtDate(exp.expense_date)}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-semibold text-slate-500">
                    <Tag className="w-3 h-3 flex-shrink-0" /> {exp.category_name}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-semibold text-slate-500">
                    <CreditCard className="w-3 h-3 flex-shrink-0" /> {formatPaymentMethod(exp.payment_method)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>By <span className="font-semibold text-slate-600">{exp.recorded_by_name}</span></span>
                  {exp.is_recurring && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-violet-50 text-violet-600 border border-violet-200 rounded text-[10px] font-bold">
                      <RefreshCw className="w-2.5 h-2.5" /> {exp.recurring_interval}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Pagination ── */}
          <Pagination
            totalItems={total}
            itemsPerPage={ITEMS_PER_PAGE}
            currentPage={page}
            onPageChange={setPage}
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
        isSubmitting={isSubmitting}
        storeName={storeName}
      />
    </div>
  );
};

export default Expenses;
