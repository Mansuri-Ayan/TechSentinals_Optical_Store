import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Receipt, Store, IndianRupee, Tag } from 'lucide-react';
import { createExpenseCategory } from '../../api/expense/expense.api';

const TODAY = new Date().toISOString().split('T')[0];
const PAYMENT_METHODS     = ['Cash', 'UPI', 'Bank Transfer', 'Credit Card', 'Cheque', 'Other'];


const EMPTY_FORM = {
  title: '', category_id: '', description: '', amount: '',
  expense_date: TODAY, payment_method: 'Cash', reference_number: '',
  receipt_url: '',
};

/* ─────────────────────────────────────────────────────────
   ADD CATEGORY MODAL
   ───────────────────────────────────────────────────────── */
export const AddCategoryModal = ({ isOpen, onClose, onAdd }) => {
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
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
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
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
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

const formatPaymentMethodFromBackend = (method) => {
  if (!method) return 'Cash';
  const map = { CASH: 'Cash', UPI: 'UPI', BANK_TRANSFER: 'Bank Transfer', CARD: 'Credit Card', CHEQUE: 'Cheque' };
  return map[method] || 'Other';
};

/* ─────────────────────────────────────────────────────────
   ADD EXPENSE MODAL
   ───────────────────────────────────────────────────────── */
export const AddExpenseModal = ({ isOpen, onClose, onSubmit, categories, isSubmitting, storeName, initialData, storeId, stores }) => {
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [errors, setErrors]         = useState({});
  const [showAddCat, setShowAddCat] = useState(false);
  const [localCats, setLocalCats]   = useState(categories);

  useEffect(() => { setLocalCats(categories); }, [categories]);
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          title: initialData.title || '',
          category_id: initialData.category_id || '',
          description: initialData.description || '',
          amount: initialData.amount || '',
          expense_date: initialData.expense_date || TODAY,
          payment_method: formatPaymentMethodFromBackend(initialData.payment_method),
          reference_number: initialData.reference_number || '',
          receipt_url: initialData.receipt_url || '',
          target_store_id: initialData.owner_type === 'ADMIN' ? 'admin' : (initialData.owner_id || ''),
        });
      } else {
        setForm({ ...EMPTY_FORM, target_store_id: 'admin' });
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

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

    if (storeId === 'admin' && !form.target_store_id)
      e.target_store_id = 'Please select a store / branch';
    
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
                <h2 className="text-base font-bold text-slate-900">{initialData ? 'Edit Expense' : 'Add Expense'}</h2>
                <p className="text-xs text-slate-500">{initialData ? 'Update the expense details below.' : 'Record a new business expense'}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors flex-shrink-0">
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
                  {storeId === 'admin' ? (
                    <select
                      value={form.target_store_id}
                      onChange={e => handleChange('target_store_id', e.target.value)}
                      className={ic('target_store_id')}
                    >
                      <option value="admin">All Store (Central)</option>
                      {stores?.map(s => (
                        <option key={s.id} value={s.id}>{s.store_name} ({s.store_code})</option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-3 py-2.5 text-sm font-medium border border-slate-200 rounded-xl bg-slate-50 text-slate-500 opacity-60 cursor-not-allowed flex items-center gap-2">
                      <Store className="w-4 h-4" />
                      {storeName || 'Loading store...'}
                    </div>
                  )}
                  {errors.target_store_id && <p className="text-xs text-red-500 mt-1">{errors.target_store_id}</p>}
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

            </div>
            <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 flex-shrink-0 bg-slate-50">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting}
                className="px-5 py-2 text-sm font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                <Plus className="w-4 h-4" />
                {isSubmitting ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Expense')}
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
