import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { X, Layers, Plus, Save, Loader2 } from 'lucide-react';

const FieldError = ({ message }) =>
  message ? (
    <p className="mt-1.5 text-xs font-medium text-red-500 flex items-center gap-1">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
      {message}
    </p>
  ) : null;

const inputCls = (hasError, disabled) =>
  `w-full px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-4 font-medium text-slate-900 transition-all text-sm placeholder:text-slate-400 ${
    hasError
      ? 'border-red-400 focus:ring-red-500/10 focus:border-red-500'
      : 'border-slate-300 focus:ring-emerald-500/10 focus:border-emerald-500'
  } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`;

const AddEditCategoryModal = ({ isOpen, onClose, onSubmit: onSubmitProp, item = null, mode = 'category', isSaving = false }) => {
  const isEdit = !!item?.id;
  const isSubcategory = mode === 'subcategory';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      description: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (item) {
        reset({
          name: item.name || '',
          description: item.description || '',
          is_active: item.is_active !== undefined ? item.is_active : true,
        });
      } else {
        reset({
          name: '',
          description: '',
          is_active: true,
        });
      }
    }
  }, [isOpen, item, reset]);

  if (!isOpen) return null;

  const handleCancel = () => {
    if (isSaving) return;
    reset();
    onClose();
  };

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      is_active: data.is_active === 'true' || data.is_active === true,
      mode,
    };
    if (isEdit) payload.id = item.id;
    const success = await onSubmitProp?.(payload);
    if (success !== false) {
      handleCancel();
    }
  };

  const titleText = isEdit
    ? isSubcategory ? 'Edit Subcategory' : 'Edit Category'
    : isSubcategory ? 'Add New Subcategory' : 'Add New Category';

  const saveText = isEdit
    ? isSubcategory ? 'Update Subcategory' : 'Update Category'
    : isSubcategory ? 'Save Subcategory' : 'Save Category';

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl flex-shrink-0 ${isEdit ? 'bg-amber-500/10 border border-amber-500/20 text-amber-600' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600'}`}>
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{titleText}</h2>
            </div>
          </div>
          <button onClick={handleCancel} disabled={isSaving}
            className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-colors flex-shrink-0 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <fieldset disabled={isSaving} className="contents">
            <div className="p-5 space-y-4">
              
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {isSubcategory ? 'Subcategory Name' : 'Category Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('name', { required: `${isSubcategory ? 'Subcategory' : 'Category'} name is required` })}
                  type="text"
                  placeholder={isSubcategory ? "e.g. Aviator, Wayfarer..." : "e.g. Sunglasses, Frames..."}
                  className={inputCls(!!errors.name, isSaving)}
                  autoFocus
                />
                <FieldError message={errors.name?.message} />
              </div>

              {/* Status */}
              {isEdit && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('is_active')}
                    className={inputCls(false, isSaving)}
                  >
                    <option value={true}>Active</option>
                    <option value={false}>Inactive</option>
                  </select>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="Optional brief description..."
                  className={`${inputCls(false, isSaving)} resize-none`}
                />
              </div>

            </div>
          </fieldset>

          {/* Footer */}
          <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
            <button type="button" onClick={handleCancel} disabled={isSaving}
              className="flex-1 py-2.5 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-semibold transition-all text-sm disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={isSaving}
              className="flex-1 py-2.5 bg-[#0A0F1F] text-white rounded-xl font-semibold text-sm transition-all shadow-md hover:shadow-lg hover:bg-slate-800 disabled:opacity-60 flex items-center justify-center gap-2">
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEdit ? (
                <Save className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {isSaving ? 'Saving...' : saveText}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddEditCategoryModal;
