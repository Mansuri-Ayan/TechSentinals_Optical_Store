import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { X, Layers, Plus, Save } from 'lucide-react';

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

const AddEditCategoryModal = ({ isOpen, onClose, onSubmit: onSubmitProp, item = null }) => {
  const isEdit = !!item;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      category_name: '',
      category_type: 'Frames',
      description: '',
      status: 'Active',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (item) {
        reset({
          category_name: item.category_name,
          category_type: item.category_type,
          description: item.description || '',
          status: item.status,
        });
      } else {
        reset({
          category_name: '',
          category_type: 'Frames',
          description: '',
          status: 'Active',
        });
      }
    }
  }, [isOpen, item, reset]);

  if (!isOpen) return null;

  const handleCancel = () => {
    reset();
    onClose();
  };

  const onSubmit = (data) => {
    onSubmitProp?.({ ...item, ...data });
    handleCancel();
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col border border-slate-100 overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl flex-shrink-0 ${isEdit ? 'bg-amber-500/10 border border-amber-500/20 text-amber-600' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600'}`}>
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{isEdit ? 'Edit Category' : 'Add New Category'}</h2>
            </div>
          </div>
          <button onClick={handleCancel}
            className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="p-5 space-y-4">
            
            {/* Category Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('category_name', { required: 'Category name is required' })}
                type="text"
                placeholder="e.g. Sunglasses"
                className={inputCls(!!errors.category_name)}
                autoFocus
              />
              <FieldError message={errors.category_name?.message} />
            </div>

            {/* Category Type */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Category Type <span className="text-red-500">*</span>
              </label>
              <select
                {...register('category_type', { required: 'Category type is required' })}
                className={inputCls(!!errors.category_type)}
              >
                <option value="Frames">Frames</option>
                <option value="Lenses">Lenses</option>
                <option value="Other Product">Other Product</option>
              </select>
              <FieldError message={errors.category_type?.message} />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                {...register('status', { required: 'Status is required' })}
                className={inputCls(!!errors.status)}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <FieldError message={errors.status?.message} />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={2}
                placeholder="Optional brief description..."
                className={`${inputCls(!!errors.description)} resize-none`}
              />
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
              {isEdit ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isEdit ? 'Update Category' : 'Save Category'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddEditCategoryModal;
