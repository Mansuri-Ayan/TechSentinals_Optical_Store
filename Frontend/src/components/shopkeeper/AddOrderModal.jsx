import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ShoppingBag, Calendar, Plus } from 'lucide-react';
import { LENS_TYPES } from '../../data/customersData';

const ORDER_STATUSES = ['Pending', 'Processing', 'Ready', 'Delivered'];

const Field = ({ label, field, icon: Icon, placeholder, type = 'text', required, form, errors, set, inputCls, children }) => (
  <div>
    <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children || (
      <input
        type={type}
        value={form[field]}
        onChange={e => set(field, e.target.value)}
        placeholder={placeholder}
        className={inputCls(field)}
      />
    )}
    {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]}</p>}
  </div>
);

const AddOrderModal = ({ isOpen, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    orderNumber: '',
    frameName: '',
    lensType: '',
    orderDate: '',
    amount: '',
    status: 'Pending',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      const randomNum = String(Math.floor(1000 + Math.random() * 9000));
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setForm({
        orderNumber: `ORD-${randomNum}`,
        frameName: '',
        lensType: '',
        orderDate: new Date().toISOString().split('T')[0],
        amount: '',
        status: 'Pending',
      });
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.orderNumber.trim()) e.orderNumber = 'Order number is required';
    if (!form.frameName.trim()) e.frameName = 'Frame name is required';
    if (!form.amount.trim()) e.amount = 'Amount is required';
    else if (isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      e.amount = 'Enter a valid positive amount';
    }
    if (!form.orderDate) e.orderDate = 'Order date is required';
    if (!form.status) e.status = 'Status is required';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  };

  const inputCls = (f) =>
    `w-full px-3 py-2.5 text-sm font-medium rounded-xl border transition-all focus:outline-none focus:ring-4 bg-white ${
      errors[f]
        ? 'border-red-400 focus:ring-red-100 focus:border-red-500'
        : 'border-slate-200 focus:ring-blue-500/10 focus:border-blue-500 placeholder:text-slate-400'
    }`;

  const fieldProps = { form, errors, set, inputCls };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-3 sm:p-4 animate-fade-in font-sans">
      <div className="relative bg-white w-full sm:max-w-lg rounded-2xl shadow-2xl flex flex-col border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-50 border border-blue-100">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add New Order</h2>
              <p className="text-xs text-slate-500">Log a new purchase for this customer</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-5 sm:px-6 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field field="orderNumber" label="Order ID" required {...fieldProps} />
              <Field field="orderDate" label="Order Date" icon={Calendar} required {...fieldProps}>
                <input type="date" value={form.orderDate} onChange={e => set('orderDate', e.target.value)} className={inputCls('orderDate')} />
              </Field>
            </div>

            <Field field="frameName" label="Frame Name / Product" placeholder="e.g. Ray-Ban Aviator Classic" required {...fieldProps} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field field="lensType" label="Lens Type" {...fieldProps}>
                <select value={form.lensType} onChange={e => set('lensType', e.target.value)} className={inputCls('lensType')}>
                  <option value="">Select lens type…</option>
                  {LENS_TYPES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </Field>
              <Field field="status" label="Status" required {...fieldProps}>
                <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls('status')}>
                  {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            <Field field="amount" label="Total Amount (₹)" placeholder="e.g. 8500" type="number" required {...fieldProps} />
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 flex-shrink-0 bg-slate-50">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2 bg-[#0A0F1F] hover:bg-slate-800">
              <Plus className="w-4 h-4" />
              Save Order
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddOrderModal;
