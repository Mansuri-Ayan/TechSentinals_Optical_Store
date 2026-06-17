import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Store, ChevronRight, X, Filter,
  Plus, Receipt, TrendingDown, CheckCircle, Clock,
  XCircle, CreditCard, Tag, FileText,
  Upload, RefreshCw, Repeat, IndianRupee, Edit2, Trash2, Loader2,
} from 'lucide-react';
import { 
  getExpenses, 
  getExpenseCategories, 
  createExpense, 
  updateExpense, 
  deleteExpense,
  createExpenseCategory
} from '../../api/expense/expense.api';
import Pagination from '../../components/shared/Pagination';
import InventoryDetailDrawer from '../../components/admin/InventoryDetailDrawer';
import { AddExpenseModal } from '../../components/admin/AddExpenseModal';
import { useAuthStore } from '../../store/store';
import { getStoresApi } from '../../api/stores/store.api';
import NotificationBell from '../../components/shared/NotificationBell';

const ITEMS_PER_PAGE = 10;
const TODAY = new Date().toISOString().split('T')[0];

const APPROVAL_CONFIG = {
  Approved: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  Pending:  { color: 'text-amber-700  bg-amber-50  border-amber-200',     dot: 'bg-amber-500'   },
  Rejected: { color: 'text-red-700    bg-red-50    border-red-200',       dot: 'bg-red-500'     },
};

const APPROVAL_TABS = [
  { key: 'all',      label: 'All Expenses' },
  { key: 'pending',  label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const PAYMENT_METHODS     = ['Cash', 'UPI', 'Bank Transfer', 'Credit Card', 'Cheque', 'Other'];

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

const ApprovalBadge = ({ isApproved, isRejected }) => {
  const status = isApproved ? 'Approved' : (isRejected ? 'Rejected' : 'Pending');
  const cfg   = APPROVAL_CONFIG[status] || APPROVAL_CONFIG.Pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {status}
    </span>
  );
};

const Expenses = () => {
  const { user } = useAuthStore();
  const store_id = user?.store_id;

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
  const [editingExpense, setEditingExpense]   = useState(null);
  
  const [categories, setCategories]           = useState([]);
  const [expenses, setExpenses]               = useState([]);
  const [storeName, setStoreName]             = useState('');
  const [total, setTotal]                     = useState(0);
  const [totalPages, setTotalPages]           = useState(0);
  const [isLoading, setIsLoading]             = useState(true);
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [tabCounts, setTabCounts]             = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });

  const tabToApprovalParam = {
    all: undefined,
    pending: 'PENDING',
    approved: 'APPROVED',
    rejected: 'REJECTED'
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchTabCounts = useCallback(async () => {
    if (!store_id) return;
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
    if (!store_id) return;
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

      if (res.data.items.length > 0 && !storeName) {
        setStoreName(res.data.items[0].owner_name);
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setIsLoading(false);
    }
  }, [store_id, page, search, categoryId, startDate, endDate, paymentMethod, activeTab, storeName]);

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
      if (!store_id) return;
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

  const handleAddOrEditExpense = async (form) => {
    setIsSubmitting(true);
    try {
      const payload = {
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
      };

      if (editingExpense) {
        await updateExpense(editingExpense.id, payload);
      } else {
        await createExpense(payload);
      }
      fetchExpenses();
      setShowAddModal(false);
      setEditingExpense(null);
    } catch (err) {
      console.error('Failed to save expense:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (e, exp) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete this expense: "${exp.title}"?`)) {
      try {
        await deleteExpense(exp.id);
        fetchExpenses();
      } catch (err) {
        console.error('Failed to delete expense:', err);
      }
    }
  };

  const formatAmount = (amount) =>
    `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const formatPaymentMethod = (method) => {
    const map = { CASH: 'Cash', UPI: 'UPI', BANK_TRANSFER: 'Bank Transfer', CARD: 'Card', CHEQUE: 'Cheque' }
    return map[method] || method.replace('_', ' ')
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const handleRowClick = (exp) => {
    setSelectedExpense({ 
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
    });
  };

  if (!store_id) {
    return (
      <div className="p-8 text-center text-slate-500 font-semibold">
        No store association found for your account. Please contact the administrator.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto font-sans overflow-x-hidden">

      {/* Breadcrumb + Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 gap-1.5">
          <Link to="/shopkeeper/dashboard" className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-semibold">Expenses</span>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight">
              Expense Management
            </h1>
            <p className="text-slate-555 mt-1 text-sm sm:text-base">
              Track, record, and review business expenses for your branch.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <NotificationBell role="shopkeeper" />
            <button
              onClick={() => { setEditingExpense(null); setShowAddModal(true); }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 w-full sm:w-auto flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
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
                <p className="text-lg sm:text-xl font-bold text-slate-900 truncate">{k.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Approval Status Tabs */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto hide-scrollbar pb-1">
        {APPROVAL_TABS.map(tab => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 border ${
                active ? 'bg-[#0A0F1F] text-white border-[#0A0F1F] shadow-sm' : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-505'}`}>
                {tabCounts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by title, category..."
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

      {/* Expandable Filters */}
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
              className="px-4 py-2 text-xs font-semibold text-red-650 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors flex items-center gap-1.5"
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

      {/* Listing */}
      {!isLoading && expenses.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 sm:p-14 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <Receipt className="w-8 h-8 text-slate-350" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No expenses found</h3>
          <p className="text-slate-505 text-sm mb-4">Try adjusting your search or filters.</p>
          {hasFilters && (
            <button onClick={handleClearFilters} className="text-violet-600 font-semibold hover:text-violet-700 transition-colors text-sm">
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">

          {/* Desktop Table */}
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
                    {['Expense Title', 'Category', 'Amount', 'Expense Date', 'Payment Method', 'Status', 'Actions'].map(col => (
                      <th key={col} className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {expenses.map(exp => (
                    <tr
                      key={exp.id}
                      onClick={() => handleRowClick(exp)}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-4 max-w-[200px]">
                        <p className="font-bold text-slate-905 truncate text-sm leading-tight">{exp.title}</p>
                        <p className="font-mono text-[10px] text-slate-400 mt-1">EXP-{exp.id}</p>
                        {exp.is_recurring && (
                          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-violet-50 text-violet-600 border border-violet-200 rounded text-[10px] font-bold">
                            <RefreshCw className="w-2.5 h-2.5" /> {exp.recurring_interval}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-650">
                          <Tag className="w-3 h-3 text-slate-400 flex-shrink-0" /> {exp.category_name}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-black text-slate-900 whitespace-nowrap">{formatAmount(exp.amount)}</td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-500 whitespace-nowrap">{fmtDate(exp.expense_date)}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-650">
                          <CreditCard className="w-3 h-3 text-slate-400 flex-shrink-0" /> {formatPaymentMethod(exp.payment_method)}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <ApprovalBadge isApproved={exp.is_approved} isRejected={exp.is_rejected} />
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {/* Only allow editing or deleting if the expense is pending approval */}
                        {!(exp.is_approved || exp.is_rejected) ? (
                          <div className="flex items-center space-x-1.5 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingExpense(exp); setShowAddModal(true); }}
                              className="p-1.5 text-slate-400 hover:text-violet-650 hover:bg-violet-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteExpense(e, exp)}
                              className="p-1.5 text-slate-405 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic font-medium">Locked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {expenses.map(exp => (
              <div
                key={exp.id}
                onClick={() => handleRowClick(exp)}
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
                  <span className="text-lg font-bold text-slate-900">{formatAmount(exp.amount)}</span>
                  <span className="text-xs text-slate-400 font-semibold">{fmtDate(exp.expense_date)}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-650">
                    <Tag className="w-3 h-3 flex-shrink-0" /> {exp.category_name}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-655">
                    <CreditCard className="w-3 h-3 flex-shrink-0" /> {formatPaymentMethod(exp.payment_method)}
                  </span>
                </div>
                {!(exp.is_approved || exp.is_rejected) && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingExpense(exp); setShowAddModal(true); }}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-100 transition-colors flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={(e) => handleDeleteExpense(e, exp)}
                      className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > ITEMS_PER_PAGE && (
            <Pagination
              totalItems={total}
              itemsPerPage={ITEMS_PER_PAGE}
              currentPage={page}
              onPageChange={setPage}
            />
          )}
        </div>
      )}

      {/* Detail Drawer */}
      <InventoryDetailDrawer
        item={selectedExpense}
        onClose={() => setSelectedExpense(null)}
      />

      {/* Add / Edit Expense Modal */}
      <AddExpenseModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingExpense(null); }}
        onSubmit={handleAddOrEditExpense}
        categories={categories}
        isSubmitting={isSubmitting}
        storeName={storeName}
        initialData={editingExpense}
      />
    </div>
  );
};

export default Expenses;
