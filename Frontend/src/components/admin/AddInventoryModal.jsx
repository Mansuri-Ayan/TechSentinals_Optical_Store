import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { X, Package, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useCategories, useSubcategories } from '../../hooks/useCategories';
import { useBrands } from '../../hooks/useBrands';
import { useStoreStore } from '../../store/store';

/* ─── helpers ─────────────────────────────────────── */
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

const SectionHeading = ({ num, label }) => (
  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
    <span className="w-5 h-5 bg-slate-800 text-white rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0">
      {num}
    </span>
    {label}
  </h3>
);

/* ─── component ───────────────────────────────────── */
const AddInventoryModal = ({ isOpen, onClose, onSubmit: onSubmitProp }) => {
  const { selectedStore } = useStoreStore();
  const { categories, isLoadingCategories } = useCategories();
  const { brands, createBrandAsync } = useBrands();
  const [imagePreview, setImagePreview] = useState(null);
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      product_name: '',
      sku: '',
      category_id: '',
      subcategory_id: '',
      brand: '',
      supplier: '',
      quantity: '',
      reorder_level: '',
      cost_price: '',
      selling_price: '',
      description: '',
      is_active: true,
    },
  });

  const watchedCategoryId = watch('category_id');
  const { subcategories, isLoadingSubcategories } = useSubcategories(
    watchedCategoryId ? Number(watchedCategoryId) : null
  );

  // Auto-reset subcategory field when category changes
  useEffect(() => {
    setValue('subcategory_id', '');
  }, [watchedCategoryId, setValue]);

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCancel = () => {
    if (isPending) return;
    reset();
    setImagePreview(null);
    onClose();
  };

  const onSubmit = async (data) => {
    setIsPending(true);
    const typedBrandName = (data.brand || '').trim();
    let brandId = null;

    try {
      if (typedBrandName) {
        // Find if brand already exists (case-insensitive check)
        const brandObj = brands.find(
          (b) => b.name.toLowerCase() === typedBrandName.toLowerCase()
        );

        if (brandObj) {
          brandId = brandObj.id;
        } else {
          // Create new brand dynamically
          const newBrand = await createBrandAsync({ name: typedBrandName });
          brandId = newBrand.id;
        }
      }

      // Await parent submission logic (creating product and inventory on backend)
      await onSubmitProp?.({
        ...data,
        category_id: Number(data.category_id),
        subcategory_id: data.subcategory_id ? Number(data.subcategory_id) : null,
        brand_id: brandId,
        image: imagePreview,
      });

      // Clear, reset form, and close modal only on success
      reset();
      setImagePreview(null);
      onClose();
      toast.success('Inventory item added successfully.');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to add inventory item.');
    } finally {
      setIsPending(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[999] p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col border border-slate-100 animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 border-b border-slate-100 bg-slate-50/60 flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 flex-shrink-0">
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">Add Inventory Item</h2>
              <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">Fill in all required fields to add a product.</p>
            </div>
          </div>
          <button type="button" onClick={handleCancel} disabled={isPending}
            className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-colors flex-shrink-0 ml-2 disabled:opacity-30 disabled:cursor-not-allowed">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="overflow-y-auto flex-1 hide-scrollbar">
          <div className="px-5 sm:px-7 py-5 sm:py-6 space-y-7">

            {/* 1 – Product Information */}
            <section>
              <SectionHeading num="1" label="Product Information" />

              {/* Image Upload */}
              <div className="flex items-center gap-4 mb-5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-16 h-16 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {imagePreview
                    ? <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    : <ImageIcon className="w-6 h-6 text-slate-400" />}
                </div>
                <div>
                  <label className={`inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors ${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input type="file" accept="image/*" onChange={handleImageChange} disabled={isPending} className="hidden" />
                    Upload Image
                  </label>
                  <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB (optional)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Product Name <span className="text-red-500">*</span></label>
                  <input {...register('product_name', {
                    required: 'Product name is required',
                    minLength: { value: 2, message: 'At least 2 characters required' },
                  })} type="text" disabled={isPending} placeholder="e.g. Ray-Ban Aviator Classic" className={inputCls(!!errors.product_name)} />
                  <FieldError message={errors.product_name?.message} />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">SKU <span className="text-red-500">*</span></label>
                  <input {...register('sku', {
                    required: 'SKU is required',
                    pattern: { value: /^[A-Za-z0-9\-_]+$/, message: 'Only letters, numbers, - and _' },
                  })} type="text" disabled={isPending} placeholder="e.g. RB-3025-001" className={inputCls(!!errors.sku)} />
                  <FieldError message={errors.sku?.message} />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category <span className="text-red-500">*</span></label>
                  <select
                    {...register('category_id', { required: 'Category is required' })}
                    className={inputCls(!!errors.category_id)}
                    disabled={isPending || isLoadingCategories}
                  >
                    <option value="">{isLoadingCategories ? 'Loading...' : 'Select Category'}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <FieldError message={errors.category_id?.message} />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Subcategory <span className="text-red-500">*</span></label>
                  <select
                    {...register('subcategory_id', { required: 'Subcategory is required' })}
                    className={inputCls(!!errors.subcategory_id)}
                    disabled={isPending || !watchedCategoryId || isLoadingSubcategories}
                  >
                    <option value="">
                      {!watchedCategoryId
                        ? 'Select Category First'
                        : isLoadingSubcategories
                        ? 'Loading...'
                        : 'Select Subcategory'}
                    </option>
                    {subcategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                  <FieldError message={errors.subcategory_id?.message} />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Brand <span className="text-red-500">*</span></label>
                  <input
                    {...register('brand', { required: 'Brand is required' })}
                    type="text"
                    disabled={isPending}
                    placeholder="e.g. Ray-Ban (creates if new)"
                    className={inputCls(!!errors.brand)}
                    list="brand-datalist"
                  />
                  <datalist id="brand-datalist">
                    {brands.map((b) => (
                      <option key={b.id} value={b.name} />
                    ))}
                  </datalist>
                  <FieldError message={errors.brand?.message} />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Supplier <span className="text-red-500">*</span></label>
                  <input {...register('supplier', { required: 'Supplier is required' })} type="text" disabled={isPending} placeholder="e.g. Vision Supply Co." className={inputCls(!!errors.supplier)} />
                  <FieldError message={errors.supplier?.message} />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                  <textarea {...register('description')} rows={2} disabled={isPending} placeholder="Optional product description..." className={`${inputCls(false)} resize-none`} />
                </div>
              </div>
            </section>

            <div className="border-t border-slate-100" />

            {/* 2 – Stock Details */}
            <section>
              <SectionHeading num="2" label="Stock Details" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Quantity <span className="text-red-500">*</span></label>
                  <input {...register('quantity', {
                    required: 'Quantity is required',
                    min: { value: 0, message: 'Quantity cannot be negative' },
                    validate: v => Number.isInteger(Number(v)) || 'Enter a whole number',
                  })} type="number" min="0" disabled={isPending} placeholder="0" className={inputCls(!!errors.quantity)} />
                  <FieldError message={errors.quantity?.message} />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reorder Level <span className="text-red-500">*</span></label>
                  <input {...register('reorder_level', {
                    required: 'Reorder level is required',
                    min: { value: 1, message: 'Reorder level must be at least 1' },
                  })} type="number" min="1" disabled={isPending} placeholder="e.g. 10" className={inputCls(!!errors.reorder_level)} />
                  <FieldError message={errors.reorder_level?.message} />
                </div>
              </div>
            </section>

            <div className="border-t border-slate-100" />

            {/* 3 – Pricing */}
            <section>
              <SectionHeading num="3" label="Pricing Details" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cost Price (₹) <span className="text-red-500">*</span></label>
                  <input {...register('cost_price', {
                    required: 'Cost price is required',
                    min: { value: 0, message: 'Price cannot be negative' },
                  })} type="number" min="0" step="0.01" disabled={isPending} placeholder="0.00" className={inputCls(!!errors.cost_price)} />
                  <FieldError message={errors.cost_price?.message} />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Selling Price (₹) <span className="text-red-500">*</span></label>
                  <input {...register('selling_price', {
                    required: 'Selling price is required',
                    min: { value: 0, message: 'Price cannot be negative' },
                  })} type="number" min="0" step="0.01" disabled={isPending} placeholder="0.00" className={inputCls(!!errors.selling_price)} />
                  <FieldError message={errors.selling_price?.message} />
                </div>
              </div>
            </section>

            <div className="border-t border-slate-100" />

            {/* 4 – Store */}
            <section>
              <SectionHeading num="4" label="Store Information" />
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Store Name</label>
                <input type="text" disabled value={selectedStore?.store_name || ''} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-500 text-sm cursor-not-allowed" />
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 px-5 sm:px-7 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0 rounded-b-2xl">
            <button type="button" onClick={handleCancel} disabled={isPending}
              className="w-full sm:w-auto px-5 py-2.5 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl font-semibold transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 text-white hover:bg-slate-700 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isPending && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              {isPending ? 'Adding Item...' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddInventoryModal;
