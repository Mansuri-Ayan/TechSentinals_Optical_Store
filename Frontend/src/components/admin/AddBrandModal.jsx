import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { X, Tag, Plus } from 'lucide-react';

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

const AddBrandModal = ({ isOpen, onClose, onSubmit: onSubmitProp }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      brand_name: '',
    },
  });

  if (!isOpen) return null;

  const handleCancel = () => {
    reset();
    onClose();
  };

  const onSubmit = (data) => {
    onSubmitProp?.(data);
    reset();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-600 flex-shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add New Brand</h2>
            </div>
          </div>
          <button onClick={handleCancel}
            className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="p-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Brand Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('brand_name', { required: 'Brand name is required' })}
                type="text"
                placeholder="e.g. Ray-Ban, Oakley..."
                className={inputCls(!!errors.brand_name)}
                autoFocus
              />
              <FieldError message={errors.brand_name?.message} />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
            <button type="button" onClick={handleCancel}
              className="flex-1 py-2.5 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-semibold transition-all text-sm">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 py-2.5 bg-[#0A0F1F] text-white rounded-xl font-semibold text-sm transition-all shadow-md hover:shadow-lg hover:bg-slate-800 disabled:opacity-60 flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Save Brand
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddBrandModal;
