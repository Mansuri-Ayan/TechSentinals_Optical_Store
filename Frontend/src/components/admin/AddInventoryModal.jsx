import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'react-toastify';
import { X, Package, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useCategories, useSubcategories } from '../../hooks/useCategories';
import { useBrands } from '../../hooks/useBrands';
import { useStoreStore } from '../../store/store';
import SupplierSelect from './SupplierSelect';

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

const getDefaultItemValues = (storeId = '', preselectedProduct = null) => {
  if (preselectedProduct) {
    return {
      product_id: preselectedProduct.product_id || preselectedProduct.id,
      product_name: preselectedProduct.product_name || preselectedProduct.name || '',
      sku: preselectedProduct.sku || preselectedProduct.product_sku || '',
      category_id: preselectedProduct.category_id ? String(preselectedProduct.category_id) : '',
      subcategory_id: preselectedProduct.subcategory_id ? String(preselectedProduct.subcategory_id) : '',
      brand: preselectedProduct.brand_name || preselectedProduct.brand || '',
      supplier: preselectedProduct.supplier_name || preselectedProduct.supplier || '',
      supplier_id: preselectedProduct.supplier_id ? String(preselectedProduct.supplier_id) : '',
      quantity: '',
      reorder_level: preselectedProduct.reorder_level !== undefined ? String(preselectedProduct.reorder_level) : '',
      cost_price: preselectedProduct.cost_price !== undefined ? String(preselectedProduct.cost_price) : '',
      selling_price: preselectedProduct.selling_price !== undefined ? String(preselectedProduct.selling_price) : '',
      discount_percent: preselectedProduct.discount_percent !== undefined ? String(preselectedProduct.discount_percent) : '0.00',
      warranty_months: preselectedProduct.warranty_months !== undefined ? String(preselectedProduct.warranty_months) : '0',
      description: preselectedProduct.description || '',
      is_active: true,
      store_id: storeId === 'admin' ? '' : storeId,
      image: preselectedProduct.image || preselectedProduct.image_url || null,
      frame_details: {
        frame_type: preselectedProduct.frame_product?.frame_type || '',
        shape: preselectedProduct.frame_product?.shape || '',
        material: preselectedProduct.frame_product?.material || '',
        color: preselectedProduct.frame_product?.color || '',
        lens_width: preselectedProduct.frame_product?.lens_width || '',
        bridge_width: preselectedProduct.frame_product?.bridge_width || '',
        temple_length: preselectedProduct.frame_product?.temple_length || '',
        gender: preselectedProduct.frame_product?.gender || '',
        age_group: preselectedProduct.frame_product?.age_group || '',
      },
      lens_details: {
        lens_type: preselectedProduct.lens_product?.lens_type || '',
        material: preselectedProduct.lens_product?.material || '',
        index_value: preselectedProduct.lens_product?.index_value || '',
        coating: preselectedProduct.lens_product?.coating || '',
        tint_color: preselectedProduct.lens_product?.tint_color || '',
        uv_protection: preselectedProduct.lens_product?.uv_protection || '',
        blue_cut: preselectedProduct.lens_product?.blue_cut || '',
        photochromic: preselectedProduct.lens_product?.photochromic || '',
        polarized: preselectedProduct.lens_product?.polarized || '',
      },
      accessory_details: {
        accessory_type: preselectedProduct.accessory_product?.accessory_type || '',
        material: preselectedProduct.accessory_product?.material || '',
        color: preselectedProduct.accessory_product?.color || '',
        size: preselectedProduct.accessory_product?.size || '',
      },
    };
  }
  return {
    product_name: '',
    sku: '',
    category_id: '',
    subcategory_id: '',
    brand: '',
    supplier: '',
    supplier_id: '',
    quantity: '',
    reorder_level: '',
    cost_price: '',
    selling_price: '',
    discount_percent: '0.00',
    warranty_months: '0',
    description: '',
    is_active: true,
    store_id: storeId === 'admin' ? '' : storeId,
    image: null,
    frame_details: {
      frame_type: '',
      shape: '',
      material: '',
      color: '',
      lens_width: '',
      bridge_width: '',
      temple_length: '',
      gender: '',
      age_group: '',
    },
    lens_details: {
      lens_type: '',
      material: '',
      index_value: '',
      coating: '',
      tint_color: '',
      uv_protection: '',
      blue_cut: '',
      photochromic: '',
      polarized: '',
    },
    accessory_details: {
      accessory_type: '',
      material: '',
      color: '',
      size: '',
    },
  };
};

/* ─── dynamic form item component ─────────────────── */
const InventoryItemForm = ({
  index,
  register,
  control,
  errors,
  watch,
  setValue,
  categories,
  isLoadingCategories,
  brands,
  stores,
  isPending,
  onRemove,
  showRemove,
}) => {
  const watchedProductId = watch(`items.${index}.product_id`);
  const isProductPreselected = !!watchedProductId;

  const watchedCategoryId = watch(`items.${index}.category_id`);
  const watchedImage = watch(`items.${index}.image`);

  const { subcategories, isLoadingSubcategories } = useSubcategories(
    watchedCategoryId ? Number(watchedCategoryId) : null
  );

  const selectedCategoryObj = categories?.find(
    (c) => c.id === Number(watchedCategoryId)
  );
  const categoryName = selectedCategoryObj?.name?.toLowerCase() || '';
  const isFrame = categoryName === 'frames';
  const isLens = categoryName === 'lenses';
  const isAccessory = !!watchedCategoryId && !isFrame && !isLens;

  // Keep category_id in sync after categories load
  useEffect(() => {
    const defaultCatId = watch(`items.${index}.category_id`);
    if (defaultCatId && categories?.length > 0) {
      setValue(`items.${index}.category_id`, String(defaultCatId));
    }
  }, [categories, index, setValue, watch]);

  // Keep subcategory_id in sync after subcategories load
  useEffect(() => {
    const defaultSubcatId = watch(`items.${index}.subcategory_id`);
    if (defaultSubcatId && subcategories?.length > 0) {
      setValue(`items.${index}.subcategory_id`, String(defaultSubcatId));
    }
  }, [subcategories, index, setValue, watch]);

  // Auto-reset subcategory field when category changes (only if product is NOT preselected)
  useEffect(() => {
    if (!watchedProductId) {
      setValue(`items.${index}.subcategory_id`, '');
    }
  }, [watchedCategoryId, watchedProductId, index, setValue]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setValue(`items.${index}.image`, reader.result);
      reader.readAsDataURL(file);
    }
  };

  const itemErrors = errors?.items?.[index] || {};

  return (
    <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-6 relative">
      {/* Item Title & Delete Button */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
            {index + 1}
          </span>
          Inventory Item
        </h4>
        {showRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={isPending}
            className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline disabled:opacity-50 flex items-center gap-1"
          >
            Remove Item
          </button>
        )}
      </div>

      {/* 1 – Product Information */}
      <section>
        <SectionHeading num="1" label="Product Information" />

        {/* Image Upload */}
        <div className="flex items-center gap-4 mb-5 p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div className="w-16 h-16 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0">
            {watchedImage ? (
              <img src={watchedImage} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-6 h-6 text-slate-400" />
            )}
          </div>
          <div>
            <label className={`inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors ${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
              <input type="file" accept="image/*" onChange={handleImageChange} disabled={isPending} className="hidden" />
              Upload Image
            </label>
            {watchedImage && (
              <button
                type="button"
                onClick={() => setValue(`items.${index}.image`, null)}
                className="ml-2 text-xs font-bold text-red-500 hover:text-red-750"
              >
                Clear
              </button>
            )}
            <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB (optional)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Product Name <span className="text-red-500">*</span></label>
            <input
              {...register(`items.${index}.product_name`, {
                required: 'Product name is required',
                minLength: { value: 2, message: 'At least 2 characters required' },
              })}
              type="text"
              disabled={isPending}
              placeholder="e.g. Ray-Ban Aviator Classic"
              className={inputCls(!!itemErrors.product_name)}
            />
            <FieldError message={itemErrors.product_name?.message} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">SKU <span className="text-red-500">*</span></label>
            <input
              {...register(`items.${index}.sku`, {
                required: 'SKU is required',
                pattern: { value: /^[A-Z0-9]+$/, message: 'Only uppercase letters and numbers are allowed' },
                onChange: (e) => {
                  e.target.value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                }
              })}
              type="text"
              disabled={isPending}
              placeholder="e.g. RB3025001"
              className={inputCls(!!itemErrors.sku)}
            />
            <FieldError message={itemErrors.sku?.message} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category <span className="text-red-500">*</span></label>
            <select
              {...register(`items.${index}.category_id`, { required: 'Category is required' })}
              className={inputCls(!!itemErrors.category_id)}
              disabled={isPending || isLoadingCategories}
            >
              <option value="">{isLoadingCategories ? 'Loading...' : 'Select Category'}</option>
              {categories.filter((cat) => cat.is_active).map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <FieldError message={itemErrors.category_id?.message} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Subcategory <span className="text-red-500">*</span></label>
            <select
              {...register(`items.${index}.subcategory_id`, { required: 'Subcategory is required' })}
              className={inputCls(!!itemErrors.subcategory_id)}
              disabled={isPending || !watchedCategoryId || isLoadingSubcategories}
            >
              <option value="">
                {!watchedCategoryId
                  ? 'Select Category First'
                  : isLoadingSubcategories
                  ? 'Loading...'
                  : 'Select Subcategory'}
              </option>
              {subcategories.filter((sub) => sub.is_active).map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
            <FieldError message={itemErrors.subcategory_id?.message} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Brand <span className="text-red-500">*</span></label>
            <input
              {...register(`items.${index}.brand`, { required: 'Brand is required' })}
              type="text"
              disabled={isPending}
              placeholder="e.g. Ray-Ban (creates if new)"
              className={inputCls(!!itemErrors.brand)}
              list={`brand-datalist-${index}`}
            />
            <datalist id={`brand-datalist-${index}`}>
              {brands.filter((b) => b.is_active).map((b) => (
                <option key={b.id} value={b.name} />
              ))}
            </datalist>
            <FieldError message={itemErrors.brand?.message} />
          </div>

          <div className="sm:col-span-2">
            <input
              type="hidden"
              {...register(`items.${index}.supplier_id`, { required: 'Supplier is required' })}
            />
            <SupplierSelect
              selectedSupplierId={watch(`items.${index}.supplier_id`)}
              onChange={(supplier) => {
                setValue(`items.${index}.supplier_id`, supplier ? String(supplier.id) : '');
                setValue(`items.${index}.supplier`, supplier ? supplier.company_name : '');
              }}
              error={itemErrors.supplier_id?.message}
              disabled={isPending}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
            <textarea
              {...register(`items.${index}.description`)}
              rows={2}
              disabled={isPending}
              placeholder="Optional product description..."
              className={`${inputCls(false)} resize-none`}
            />
          </div>
        </div>
      </section>

      {/* 2 – Product Specifications (Conditional) */}
      {watchedCategoryId && (
        <>
          <div className="border-t border-slate-100" />
          <section>
            <SectionHeading num="2" label={`${selectedCategoryObj?.name || 'Product'} Specifications`} />

            {isFrame && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Frame Type</label>
                  <select {...register(`items.${index}.frame_details.frame_type`)} disabled={isPending} className={inputCls(!!itemErrors.frame_details?.frame_type)}>
                    <option value="">Select Type</option>
                    <option value="Full-Rim">Full-Rim</option>
                    <option value="Half-Rim">Half-Rim</option>
                    <option value="Rimless">Rimless</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Shape</label>
                  <select {...register(`items.${index}.frame_details.shape`)} disabled={isPending} className={inputCls(!!itemErrors.frame_details?.shape)}>
                    <option value="">Select Shape</option>
                    <option value="Rectangle">Rectangle</option>
                    <option value="Round">Round</option>
                    <option value="Aviator">Aviator</option>
                    <option value="Cat-Eye">Cat-Eye</option>
                    <option value="Oval">Oval</option>
                    <option value="Square">Square</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Material</label>
                  <select {...register(`items.${index}.frame_details.material`)} disabled={isPending} className={inputCls(!!itemErrors.frame_details?.material)}>
                    <option value="">Select Material</option>
                    <option value="Acetate">Acetate</option>
                    <option value="Metal">Metal</option>
                    <option value="TR-90">TR-90</option>
                    <option value="Titanium">Titanium</option>
                    <option value="Carbon Fiber">Carbon Fiber</option>
                    <option value="Plastic">Plastic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Color</label>
                  <input {...register(`items.${index}.frame_details.color`)} type="text" disabled={isPending} placeholder="e.g. Black / Gold" className={inputCls(!!itemErrors.frame_details?.color)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Lens Width (mm)</label>
                  <input {...register(`items.${index}.frame_details.lens_width`)} type="text" disabled={isPending} placeholder="e.g. 52" className={inputCls(!!itemErrors.frame_details?.lens_width)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bridge Width (mm)</label>
                  <input {...register(`items.${index}.frame_details.bridge_width`)} type="text" disabled={isPending} placeholder="e.g. 18" className={inputCls(!!itemErrors.frame_details?.bridge_width)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Temple Length (mm)</label>
                  <input {...register(`items.${index}.frame_details.temple_length`)} type="text" disabled={isPending} placeholder="e.g. 140" className={inputCls(!!itemErrors.frame_details?.temple_length)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Gender</label>
                  <select {...register(`items.${index}.frame_details.gender`)} disabled={isPending} className={inputCls(!!itemErrors.frame_details?.gender)}>
                    <option value="">Select Gender</option>
                    <option value="Unisex">Unisex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Kids">Kids</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Age Group</label>
                  <select {...register(`items.${index}.frame_details.age_group`)} disabled={isPending} className={inputCls(!!itemErrors.frame_details?.age_group)}>
                    <option value="">Select Age Group</option>
                    <option value="Adult">Adult</option>
                    <option value="Teens">Teens</option>
                    <option value="Kids">Kids</option>
                  </select>
                </div>
              </div>
            )}

            {isLens && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Lens Type</label>
                  <select {...register(`items.${index}.lens_details.lens_type`)} disabled={isPending} className={inputCls(!!itemErrors.lens_details?.lens_type)}>
                    <option value="">Select Type</option>
                    <option value="Single Vision">Single Vision</option>
                    <option value="Bifocal">Bifocal</option>
                    <option value="Progressive">Progressive</option>
                    <option value="Zero Power">Zero Power</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Material</label>
                  <select {...register(`items.${index}.lens_details.material`)} disabled={isPending} className={inputCls(!!itemErrors.lens_details?.material)}>
                    <option value="">Select Material</option>
                    <option value="CR-39">CR-39</option>
                    <option value="Polycarbonate">Polycarbonate</option>
                    <option value="Glass">Glass</option>
                    <option value="Trivex">Trivex</option>
                    <option value="High-Index Plastic">High-Index Plastic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Index Value</label>
                  <select {...register(`items.${index}.lens_details.index_value`)} disabled={isPending} className={inputCls(!!itemErrors.lens_details?.index_value)}>
                    <option value="">Select Index</option>
                    <option value="1.50">1.50</option>
                    <option value="1.56">1.56</option>
                    <option value="1.60">1.60</option>
                    <option value="1.67">1.67</option>
                    <option value="1.74">1.74</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Coating</label>
                  <select {...register(`items.${index}.lens_details.coating`)} disabled={isPending} className={inputCls(!!itemErrors.lens_details?.coating)}>
                    <option value="">Select Coating</option>
                    <option value="Anti-Reflective">Anti-Reflective</option>
                    <option value="Scratch-Resistant">Scratch-Resistant</option>
                    <option value="HMC">HMC (Hard Multi-Coat)</option>
                    <option value="Blue Cut">Blue Cut</option>
                    <option value="Hydrophobic">Hydrophobic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tint Color</label>
                  <input {...register(`items.${index}.lens_details.tint_color`)} type="text" disabled={isPending} placeholder="Clear / Brown / Grey" className={inputCls(!!itemErrors.lens_details?.tint_color)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">UV Protection</label>
                  <select {...register(`items.${index}.lens_details.uv_protection`)} disabled={isPending} className={inputCls(!!itemErrors.lens_details?.uv_protection)}>
                    <option value="">Select UV</option>
                    <option value="UV400">UV400</option>
                    <option value="UV380">UV380</option>
                    <option value="None">None</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Blue Cut Filter</label>
                  <select {...register(`items.${index}.lens_details.blue_cut`)} disabled={isPending} className={inputCls(!!itemErrors.lens_details?.blue_cut)}>
                    <option value="">Select Blue Cut</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Photochromic</label>
                  <select {...register(`items.${index}.lens_details.photochromic`)} disabled={isPending} className={inputCls(!!itemErrors.lens_details?.photochromic)}>
                    <option value="">Select Transition</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Polarized</label>
                  <select {...register(`items.${index}.lens_details.polarized`)} disabled={isPending} className={inputCls(!!itemErrors.lens_details?.polarized)}>
                    <option value="">Select Polarization</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>
            )}

            {isAccessory && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Accessory Type</label>
                  <input {...register(`items.${index}.accessory_details.accessory_type`)} type="text" disabled={isPending} placeholder="e.g. Case, Cloth, Chain, Solution" className={inputCls(!!itemErrors.accessory_details?.accessory_type)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Material</label>
                  <input {...register(`items.${index}.accessory_details.material`)} type="text" disabled={isPending} placeholder="e.g. Leather, Microfiber, Silicon" className={inputCls(!!itemErrors.accessory_details?.material)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Color</label>
                  <input {...register(`items.${index}.accessory_details.color`)} type="text" disabled={isPending} placeholder="e.g. Black, Brown, Transparent" className={inputCls(!!itemErrors.accessory_details?.color)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Size / Dimensions</label>
                  <input {...register(`items.${index}.accessory_details.size`)} type="text" disabled={isPending} placeholder="e.g. Medium, 50ml, 15x15cm" className={inputCls(!!itemErrors.accessory_details?.size)} />
                </div>
              </div>
            )}
          </section>
        </>
      )}

      <div className="border-t border-slate-100" />

      {/* 3 – Stock Details */}
      <section>
        <SectionHeading num="3" label="Stock Details" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Quantity <span className="text-red-500">*</span></label>
            <input
              {...register(`items.${index}.quantity`, {
                required: 'Quantity is required',
                min: { value: 0, message: 'Quantity cannot be negative' },
                validate: v => Number.isInteger(Number(v)) || 'Enter a whole number',
              })}
              type="number"
              min="0"
              disabled={isPending}
              placeholder="0"
              className={inputCls(!!itemErrors.quantity)}
            />
            <FieldError message={itemErrors.quantity?.message} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reorder Level <span className="text-red-500">*</span></label>
            <input
              {...register(`items.${index}.reorder_level`, {
                required: 'Reorder level is required',
                min: { value: 1, message: 'Reorder level must be at least 1' },
              })}
              type="number"
              min="1"
              disabled={isPending}
              placeholder="e.g. 10"
              className={inputCls(!!itemErrors.reorder_level)}
            />
            <FieldError message={itemErrors.reorder_level?.message} />
          </div>
        </div>
      </section>

      <div className="border-t border-slate-100" />

      {/* 4 – Pricing */}
      <section>
        <SectionHeading num="4" label="Pricing & Warranty Details" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cost Price (₹) <span className="text-red-500">*</span></label>
            <input
              {...register(`items.${index}.cost_price`, {
                required: 'Cost price is required',
                min: { value: 0, message: 'Price cannot be negative' },
              })}
              type="number"
              min="0"
              step="0.01"
              disabled={isPending}
              placeholder="0.00"
              className={inputCls(!!itemErrors.cost_price)}
            />
            <FieldError message={itemErrors.cost_price?.message} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Selling Price (₹) <span className="text-red-500">*</span></label>
            <input
              {...register(`items.${index}.selling_price`, {
                required: 'Selling price is required',
                min: { value: 0, message: 'Price cannot be negative' },
              })}
              type="number"
              min="0"
              step="0.01"
              disabled={isPending}
              placeholder="0.00"
              className={inputCls(!!itemErrors.selling_price)}
            />
            <FieldError message={itemErrors.selling_price?.message} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Discount (%)</label>
            <input
              {...register(`items.${index}.discount_percent`, {
                min: { value: 0, message: 'Discount cannot be negative' },
                max: { value: 100, message: 'Discount cannot exceed 100%' },
              })}
              type="number"
              min="0"
              max="100"
              step="0.01"
              disabled={isPending}
              placeholder="0.00"
              className={inputCls(!!itemErrors.discount_percent)}
            />
            <FieldError message={itemErrors.discount_percent?.message} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Warranty (Months)</label>
            <input
              {...register(`items.${index}.warranty_months`, {
                min: { value: 0, message: 'Warranty cannot be negative' },
                validate: v => v === '' || Number.isInteger(Number(v)) || 'Enter a whole number',
              })}
              type="number"
              min="0"
              disabled={isPending}
              placeholder="0"
              className={inputCls(!!itemErrors.warranty_months)}
            />
            <FieldError message={itemErrors.warranty_months?.message} />
          </div>
        </div>
      </section>

      <div className="border-t border-slate-100" />

      {/* 5 – Store */}
      <section>
        <SectionHeading num="5" label="Store Information" />
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Store <span className="text-red-500">*</span></label>
          <select
            {...register(`items.${index}.store_id`, { required: 'Store is required' })}
            className={inputCls(!!itemErrors.store_id)}
            disabled={isPending}
          >
            <option value="">Select Store</option>
            {stores.map((st) => (
              <option key={st.id} value={st.id}>{st.store_name || st.name || `Store #${st.id}`}</option>
            ))}
          </select>
          <FieldError message={itemErrors.store_id?.message} />
        </div>
      </section>
    </div>
  );
};

const AddInventoryModal = ({ isOpen, onClose, onSubmit: onSubmitProp, preselectedProduct = null }) => {
  const { selectedStore, stores } = useStoreStore();
  const { categories, isLoadingCategories } = useCategories();
  const { brands, createBrandAsync } = useBrands();
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      items: [getDefaultItemValues(selectedStore?.id ? String(selectedStore.id) : '', preselectedProduct)],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // Keep store ID and preselectedProduct updated when selectedStore changes and we open the modal
  useEffect(() => {
    if (isOpen) {
      reset({
        items: [getDefaultItemValues(selectedStore?.id ? String(selectedStore.id) : '', preselectedProduct)],
      });
    }
  }, [isOpen, selectedStore, preselectedProduct, reset]);

  if (!isOpen) return null;

  const handleCancel = () => {
    if (isPending) return;
    reset({
      items: [getDefaultItemValues(selectedStore?.id ? String(selectedStore.id) : '', preselectedProduct)],
    });
    onClose();
  };

  const onSubmit = async (data) => {
    setIsPending(true);
    try {
      const payloadItems = [];

      for (const item of data.items) {
        let brandId = null;

        // Only handle brand creation/lookup if product is not preselected
        if (!preselectedProduct) {
          const typedBrandName = (item.brand || '').trim();
          if (typedBrandName) {
            const brandObj = brands.find(
              (b) => b.name.toLowerCase() === typedBrandName.toLowerCase()
            );

            if (brandObj) {
              brandId = brandObj.id;
            } else {
              const newBrand = await createBrandAsync({ name: typedBrandName });
              brandId = newBrand.id;
            }
          }
        } else {
          brandId = preselectedProduct.brand_id;
        }

        // Clean spec data blocks
        let frame_details = null;
        let lens_details = null;
        let accessory_details = null;

        const cleanObj = (obj) => {
          if (!obj) return null;
          const cleaned = {};
          let hasValue = false;
          for (const [k, v] of Object.entries(obj)) {
            if (v !== undefined && v !== null && String(v).trim() !== '') {
              cleaned[k] = v;
              hasValue = true;
            }
          }
          return hasValue ? cleaned : null;
        };

        const selectedCategoryObj = categories?.find(
          (c) => c.id === Number(item.category_id)
        );
        const categoryName = selectedCategoryObj?.name?.toLowerCase() || '';
        const isFrame = categoryName === 'frames';
        const isLens = categoryName === 'lenses';
        const isAccessory = !!item.category_id && !isFrame && !isLens;

        if (!preselectedProduct) {
          if (isFrame) {
            frame_details = cleanObj(item.frame_details);
          } else if (isLens) {
            lens_details = cleanObj(item.lens_details);
          } else if (isAccessory) {
            accessory_details = cleanObj(item.accessory_details);
          }
        }

        payloadItems.push({
          ...item,
          category_id: Number(item.category_id),
          subcategory_id: item.subcategory_id ? Number(item.subcategory_id) : null,
          brand_id: brandId,
          image: item.image || null,
          frame_details: preselectedProduct ? preselectedProduct.frame_product : frame_details,
          lens_details: preselectedProduct ? preselectedProduct.lens_product : lens_details,
          accessory_details: preselectedProduct ? preselectedProduct.accessory_product : accessory_details,
        });
      }

      // Submit array to parent handler
      await onSubmitProp?.(payloadItems);

      // Clear, reset form, and close modal only on success
      reset({
        items: [getDefaultItemValues(selectedStore?.id ? String(selectedStore.id) : '', preselectedProduct)],
      });
      onClose();
      toast.success(
        payloadItems.length > 1
          ? `Successfully added ${payloadItems.length} inventory items.`
          : 'Inventory item added successfully.'
      );
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to add inventory item(s).');
    } finally {
      setIsPending(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[999] p-3 sm:p-4 animate-fade-in font-sans">
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col border border-slate-100 animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 border-b border-slate-100 bg-white flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 flex-shrink-0">
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                {preselectedProduct
                  ? `Add Stock for "${preselectedProduct.product_name || preselectedProduct.name}"`
                  : fields.length > 1
                  ? 'Add Bulk Inventory Items'
                  : 'Add Inventory Item'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                {preselectedProduct
                  ? 'Specify store location and stock quantity for this product.'
                  : 'Fill in all required fields to add products to inventory.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors flex-shrink-0 ml-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="overflow-y-auto flex-1 hide-scrollbar">
          <div className="px-5 sm:px-7 py-5 sm:py-6 space-y-6">
            {fields.map((field, index) => (
              <InventoryItemForm
                key={field.id}
                index={index}
                register={register}
                control={control}
                errors={errors}
                watch={watch}
                setValue={setValue}
                categories={categories}
                isLoadingCategories={isLoadingCategories}
                brands={brands}
                stores={stores}
                isPending={isPending}
                onRemove={() => remove(index)}
                showRemove={fields.length > 1}
              />
            ))}
          </div>
        </form>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 px-5 sm:px-7 py-4 border-t border-slate-200 bg-white flex-shrink-0 rounded-b-2xl">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="w-full sm:w-auto px-5 py-2.5 text-slate-750 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-350 rounded-xl font-semibold transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed text-center"
            >
              Cancel
            </button>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {!preselectedProduct && (
              <button
                type="button"
                onClick={() => append(getDefaultItemValues(selectedStore?.id ? String(selectedStore.id) : ''))}
                disabled={isPending}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800 rounded-xl font-bold transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                Add New
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={isPending}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 text-white hover:bg-slate-755 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              {isPending ? 'Adding Items...' : fields.length > 1 ? `Add All (${fields.length}) Items` : 'Add Item'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AddInventoryModal;
