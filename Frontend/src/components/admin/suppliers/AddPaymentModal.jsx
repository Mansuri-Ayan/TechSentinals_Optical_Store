import { useState } from 'react';
import { X, CreditCard, Calendar, IndianRupee, FileText, Plus, Check } from 'lucide-react';

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Credit'];

const EMPTY = { date: new Date().toISOString().split('T')[0], amount: '', method: '', remarks: '' };

const AddPaymentModal = ({ isOpen, supplierName, onClose, onSubmit }) => {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.date)    e.date   = 'Payment date is required';
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
      e.amount = 'Enter a valid amount (> 0)';
    if (!form.method) e.method = 'Payment method is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    onSubmit({ ...form, amount: Number(form.amount) });
    setForm(EMPTY);
    setErrors({});
  };

  const handleClose = () => { setForm(EMPTY); setErrors({}); onClose(); };

  const inputCls = (f) =>
    `w-full px-3 py-2.5 text-sm font-medium rounded-xl border transition-all focus:outline-none focus:ring-4 bg-white appearance-none ${
      errors[f]
        ? 'border-red-400 focus:ring-red-100 focus:border-red-500'
        : 'border-slate-200 focus:ring-blue-500/10 focus:border-blue-500 placeholder:text-slate-400'
    }`;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl shadow-2xl flex flex-col max-h-[95dvh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add Payment</h2>
              <p className="text-xs text-slate-500 truncate max-w-[220px]">To: {supplierName}</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-5 py-5 space-y-4">
            {/* Payment Date */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Payment Date <span className="text-red-500">*</span>
              </label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className={inputCls('date')} />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-slate-400" /> Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₹</span>
                <input type="number" min="1" step="0.01" value={form.amount}
                  onChange={e => set('amount', e.target.value)}
                  placeholder="0.00"
                  className={`${inputCls('amount')} pl-7`} />
              </div>
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
            </div>

            {/* Payment Method */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Payment Method <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button key={m} type="button" onClick={() => set('method', m)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                      form.method === m
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
              {errors.method && <p className="text-xs text-red-500 mt-1">{errors.method}</p>}
            </div>

            {/* Remarks */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" /> Remarks <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea rows={3} value={form.remarks} onChange={e => set('remarks', e.target.value)}
                placeholder="Invoice number, reference, or notes…"
                className="w-full px-3 py-2.5 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-white resize-none placeholder:text-slate-400" />
            </div>

            {/* Preview */}
            {form.amount && form.method && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-blue-700">
                  ₹{Number(form.amount).toLocaleString('en-IN')} via {form.method}
                </span>
                {form.date && (
                  <span className="ml-auto text-xs text-blue-500 font-medium">
                    {new Date(form.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50 flex-shrink-0">
            <button type="button" onClick={handleClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPaymentModal;
