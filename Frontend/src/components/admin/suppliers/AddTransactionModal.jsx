import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Package, ChevronDown, Layers, Hash, FileText, Plus, Check, CreditCard, Calendar, IndianRupee
} from 'lucide-react';

const CATEGORIES = ['Frames', 'Lenses', 'Contact Lens', 'Accessories', 'Cleaning Kit', 'Cases'];

const SUBCATEGORIES = {
  Frames:       ['Full Rim', 'Half Rim', 'Rimless', 'Round', 'Square', 'Rectangle', 'Cat Eye', 'Aviator', 'Wayfarer'],
  Lenses:       ['Single Vision', 'Bifocal', 'Progressive', 'Blue Cut', 'Photochromic', 'Polarized', 'Computer Lens'],
  'Contact Lens': ['Daily', 'Bi-Weekly', 'Monthly', 'Coloured'],
  Accessories:  ['Chains', 'Cords', 'Repair Kits', 'Straps', 'Nose Pads'],
  'Cleaning Kit': ['Microfibre Cloth', 'Spray Cleaner', 'Wet Wipes', 'Ultrasonic Cleaner'],
  Cases:        ['Hard Case', 'Soft Case', 'Pouch', 'Zip Case'],
};

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Credit'];

const EMPTY = {
  category: '',
  subcategory: '',
  quantity: '',
  amount: '',
  paidAmount: '',
  dueAmount: '',
  method: '',
  date: new Date().toISOString().split('T')[0],
  remarks: ''
};

const AddTransactionModal = ({ isOpen, supplierName, onClose, onSubmit }) => {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const set = (k, v) => {
    setForm(p => {
      const next = {
        ...p,
        [k]: v,
        ...(k === 'category' ? { subcategory: '' } : {})
      };
      
      if (k === 'amount' || k === 'paidAmount') {
        const totalVal = k === 'amount' ? v : p.amount;
        const paidVal = k === 'paidAmount' ? v : p.paidAmount;
        
        const total = totalVal === '' ? 0 : Number(totalVal);
        const paid = paidVal === '' ? 0 : Number(paidVal);
        
        if (!isNaN(total) && !isNaN(paid)) {
          next.dueAmount = String(total - paid);
        } else {
          next.dueAmount = '';
        }
      }
      return next;
    });
    setErrors(p => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.category)    e.category    = 'Category is required';
    if (!form.subcategory) e.subcategory = 'Sub-category is required';
    if (!form.quantity || isNaN(form.quantity) || Number(form.quantity) < 1)
      e.quantity = 'Enter a valid quantity (≥ 1)';
    if (form.amount === '' || isNaN(form.amount) || Number(form.amount) < 0)
      e.amount = 'Enter a valid amount (≥ 0)';
    if (form.paidAmount === '' || isNaN(form.paidAmount) || Number(form.paidAmount) < 0)
      e.paidAmount = 'Enter a valid paid amount (≥ 0)';
    if (Number(form.paidAmount) > Number(form.amount))
      e.paidAmount = 'Paid amount cannot exceed total amount';
    if (!form.method)      e.method      = 'Payment method is required';
    if (!form.date)        e.date        = 'Date is required';
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      ...form,
      quantity: Number(form.quantity),
      amount: Number(form.amount),
      paidAmount: Number(form.paidAmount),
      dueAmount: Number(form.dueAmount)
    });
    setForm(EMPTY);
    setErrors({});
  };

  const handleClose = () => {
    setForm(EMPTY);
    setErrors({});
    onClose();
  };

  const inputCls = (f) =>
    `w-full px-3 py-2 text-sm font-medium rounded-xl border transition-all focus:outline-none focus:ring-4 appearance-none ${
      f === 'dueAmount' ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
    } ${
      errors[f]
        ? 'border-red-400 focus:ring-red-100 focus:border-red-500'
        : 'border-slate-200 focus:ring-blue-500/10 focus:border-blue-500 placeholder:text-slate-400'
    }`;

  const subcats = SUBCATEGORIES[form.category] || [];

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-3 sm:p-4 animate-fade-in">
      <div className="relative bg-white w-full sm:max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] min-h-0 border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0 font-sans">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Record Purchase (Goods & Payment)</h2>
              <p className="text-xs text-slate-500 truncate max-w-[280px]">Supplier: {supplierName}</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 min-h-0">
          <div className="px-5 py-5 space-y-4">
            
            {/* Section: Goods Details */}
            <div className="space-y-3 font-sans">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Goods details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Category */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" /> Product Category <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select value={form.category} onChange={e => set('category', e.target.value)} className={inputCls('category')}>
                      <option value="">Select category…</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
                </div>

                {/* Sub-category */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" /> Sub Category <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select value={form.subcategory} onChange={e => set('subcategory', e.target.value)} className={inputCls('subcategory')} disabled={!form.category}>
                      <option value="">{form.category ? 'Select sub-category…' : 'Select a category first'}</option>
                      {subcats.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  {errors.subcategory && <p className="text-xs text-red-500 mt-1">{errors.subcategory}</p>}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-400" /> Quantity <span className="text-red-500">*</span>
                </label>
                <input type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)}
                  placeholder="e.g. 20" className={inputCls('quantity')} />
                {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Section: Payment Details */}
            <div className="space-y-3 font-sans">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Payment details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Total Amount */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5 text-slate-400" /> Total Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₹</span>
                    <input type="number" min="0" step="0.01" value={form.amount}
                      onChange={e => set('amount', e.target.value)}
                      placeholder="0.00"
                      className={`${inputCls('amount')} pl-7`} />
                  </div>
                  {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
                </div>

                {/* Date */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date <span className="text-red-500">*</span>
                  </label>
                  <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className={inputCls('date')} />
                  {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
                </div>

                {/* Done Payment */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5 text-slate-400" /> Done Payment (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₹</span>
                    <input type="number" min="0" step="0.01" value={form.paidAmount}
                      onChange={e => set('paidAmount', e.target.value)}
                      placeholder="0.00"
                      className={`${inputCls('paidAmount')} pl-7`} />
                  </div>
                  {errors.paidAmount && <p className="text-xs text-red-500 mt-1">{errors.paidAmount}</p>}
                </div>

                {/* Due Payment */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5 text-slate-400" /> Due Payment (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₹</span>
                    <input type="number" value={form.dueAmount}
                      readOnly
                      placeholder="0.00"
                      className={`${inputCls('dueAmount')} pl-7 bg-slate-50 cursor-not-allowed`} />
                  </div>
                  {errors.dueAmount && <p className="text-xs text-red-500 mt-1">{errors.dueAmount}</p>}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Payment Method <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button key={m} type="button" onClick={() => set('method', m)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        form.method === m
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                      title={m}>
                      {m}
                    </button>
                  ))}
                </div>
                {errors.method && <p className="text-xs text-red-500 mt-1">{errors.method}</p>}
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Remarks */}
            <div className="font-sans">
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" /> Remarks <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea rows={2} value={form.remarks} onChange={e => set('remarks', e.target.value)}
                placeholder="Invoice number, reference, or notes…"
                className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-white resize-none placeholder:text-slate-400" />
            </div>

            {/* Preview chip */}
            {form.category && form.subcategory && form.quantity && form.amount && form.paidAmount !== '' && form.method && (
              <div className="flex flex-col gap-1 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl font-sans">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span className="text-xs font-semibold text-emerald-700">
                    {form.category} → {form.subcategory} (Qty: {form.quantity})
                  </span>
                </div>
                <div className="text-xs text-emerald-600 font-medium pl-5 space-y-0.5">
                  <div>Total: ₹{Number(form.amount).toLocaleString('en-IN')} | Paid: ₹{Number(form.paidAmount).toLocaleString('en-IN')} | Due: ₹{Number(form.dueAmount || 0).toLocaleString('en-IN')}</div>
                  <div>Payment: via {form.method}</div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50 flex-shrink-0 font-sans">
            <button type="button" onClick={handleClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Record Purchase
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddTransactionModal;
