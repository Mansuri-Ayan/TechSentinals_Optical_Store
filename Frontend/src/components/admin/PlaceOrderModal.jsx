import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { X, ShoppingCart, Package, User, Phone, FileText, Plus, Minus } from 'lucide-react';

/* ── helpers ── */
const FieldError = ({ message }) =>
  message ? (
    <p className="mt-1.5 text-xs font-medium text-red-500 flex items-center gap-1">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
      {message}
    </p>
  ) : null;

const inputCls = (hasError) =>
  `w-full px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-4 font-medium text-slate-900 transition-all text-sm placeholder:text-slate-400 ${
    hasError
      ? 'border-red-400 focus:ring-red-500/10 focus:border-red-500'
      : 'border-slate-300 focus:ring-emerald-500/10 focus:border-emerald-500'
  }`;

/* ── component ── */
const PlaceOrderModal = ({ item, onClose, onSubmit: onSubmitProp }) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      product_name: item?.product_name || '',
      quantity: 1,
      customer_name: '',
      mobile: '',
      notes: '',
    },
  });

  if (!item) return null;

  const watchedQty = watch('quantity');
  const maxQty = item.quantity;

  const changeQty = (delta) => {
    const current = Number(watchedQty) || 1;
    const next = Math.max(1, Math.min(maxQty, current + delta));
    setValue('quantity', next, { shouldValidate: true });
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  const onSubmit = (data) => {
    onSubmitProp?.({ ...data, item, quantity: Number(data.quantity) });
    reset();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] flex flex-col border border-slate-100 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 flex-shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900">Place Order</h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate">Fill in customer details below</p>
            </div>
          </div>
          <button onClick={handleCancel}
            className="p-2 text-slate-400 hover:bg-white/60 hover:text-slate-700 rounded-full transition-colors flex-shrink-0 ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Summary */}
        <div className="mx-5 mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center flex-shrink-0">
            <span className="text-base font-black text-white">{item.product_name[0]}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 truncate">{item.product_name}</p>
            <p className="text-xs text-slate-500 font-medium">{item.brand} · ₹{Number(item.selling_price).toLocaleString()} · Stock: {item.quantity}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="overflow-y-auto flex-1 hide-scrollbar">
          <div className="px-5 py-4 space-y-4">

            {/* Product Name (readonly) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-slate-400" />
                Product Name
              </label>
              <input
                {...register('product_name')}
                type="text"
                readOnly
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 cursor-not-allowed"
              />
            </div>

            {/* Quantity — stepper */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Quantity <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => changeQty(-1)}
                  className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all flex-shrink-0 disabled:opacity-40"
                  disabled={Number(watchedQty) <= 1}>
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  {...register('quantity', {
                    required: 'Quantity is required',
                    min: { value: 1, message: 'Minimum 1 unit' },
                    max: { value: maxQty, message: `Maximum ${maxQty} units available` },
                    validate: v => Number.isInteger(Number(v)) || 'Enter a whole number',
                  })}
                  type="number"
                  min="1"
                  max={maxQty}
                  className={`${inputCls(!!errors.quantity)} text-center text-lg font-bold`}
                />
                <button type="button" onClick={() => changeQty(1)}
                  className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all flex-shrink-0 disabled:opacity-40"
                  disabled={Number(watchedQty) >= maxQty}>
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <FieldError message={errors.quantity?.message} />
              {maxQty > 0 && (
                <p className="mt-1 text-xs text-slate-400 font-medium">
                  Total: ₹{(Number(watchedQty || 1) * Number(item.selling_price)).toLocaleString()}
                </p>
              )}
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('customer_name', {
                  required: 'Customer name is required',
                  minLength: { value: 2, message: 'At least 2 characters required' },
                  maxLength: { value: 80, message: 'Maximum 80 characters' },
                  pattern: { value: /^[a-zA-Z\s]+$/, message: 'Name must contain only letters' },
                })}
                type="text"
                placeholder="e.g. Rajesh Kumar"
                className={inputCls(!!errors.customer_name)}
              />
              <FieldError message={errors.customer_name?.message} />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                {...register('mobile', {
                  required: 'Mobile number is required',
                  pattern: {
                    value: /^[6-9]\d{9}$/,
                    message: 'Enter a valid 10-digit mobile number',
                  },
                })}
                type="tel"
                placeholder="e.g. 9876543210"
                maxLength={10}
                className={inputCls(!!errors.mobile)}
              />
              <FieldError message={errors.mobile?.message} />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Notes / Remarks
              </label>
              <textarea
                {...register('notes', {
                  maxLength: { value: 300, message: 'Maximum 300 characters' },
                })}
                rows={3}
                placeholder="Any special instructions or remarks..."
                className={`${inputCls(!!errors.notes)} resize-none`}
              />
              <FieldError message={errors.notes?.message} />
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
            <button type="button" onClick={handleCancel}
              className="w-full sm:w-auto px-5 py-2.5 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl font-semibold transition-all text-sm">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Confirm Order
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default PlaceOrderModal;
