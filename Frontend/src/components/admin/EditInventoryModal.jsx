import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { X, Package, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useCategories, useSubcategories } from '../../hooks/useCategories';
import { useBrands } from '../../hooks/useBrands';
import SupplierSelect from './SupplierSelect';

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

const getInitialValues = (item) => {
  if (!item) return {};
  return {
    product_name: item.product_name || '',
    sku: item.sku || '',
    category_id: item.category_id ? String(item.category_id) : '',
    subcategory_id: item.subcategory_id ? String(item.subcategory_id) : '',
    brand: item.brand_name || item.brand || '',
    supplier_id: item.supplier_id ? String(item.supplier_id) : '',
    quantity: item.quantity !== undefined ? String(item.quantity) : '0',
    reorder_level: item.reorder_level !== undefined ? String(item.reorder_level) : '0',
    cost_price: item.cost_price !== undefined ? String(item.cost_price) : '',
    selling_price: item.selling_price !== undefined ? String(item.selling_price) : '',
    discount_percent: item.discount_percent !== undefined ? String(item.discount_percent) : '0.00',
    warranty_months: item.warranty_months !== undefined ? String(item.warranty_months) : '0',
    description: item.description || '',
    image: item.image || item.image_url || null,
    frame_details: {
      frame_type: item.frame_product?.frame_type || '',
      shape: item.frame_product?.shape || '',
      material: item.frame_product?.material || '',
      color: item.frame_product?.color || '',
      lens_width: item.frame_product?.lens_width || '',
      bridge_width: item.frame_product?.bridge_width || '',
      temple_length: item.frame_product?.temple_length || '',
      gender: item.frame_product?.gender || '',
      age_group: item.frame_product?.age_group || '',
    },
    lens_details: {
      lens_type: item.lens_product?.lens_type || '',
      material: item.lens_product?.material || '',
      index_value: item.lens_product?.index_value || '',
      coating: item.lens_product?.coating || '',
      tint_color: item.lens_product?.tint_color || '',
      uv_protection: item.lens_product?.uv_protection || '',
      blue_cut: item.lens_product?.blue_cut || '',
      photochromic: item.lens_product?.photochromic || '',
      polarized: item.lens_product?.polarized || '',
    },
    accessory_details: {
      accessory_type: item.accessory_product?.accessory_type || '',
      material: item.accessory_product?.material || '',
      color: item.accessory_product?.color || '',
      size: item.accessory_product?.size || '',
    },
  };
};

const EditInventoryModal = ({ isOpen, onClose, inventoryItem, onSubmit: onSubmitProp }) => {
  const { categories, isLoadingCategories } = useCategories(null, { paginate: false });
  const { brands, createBrandAsync } = useBrands();
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: getInitialValues(inventoryItem),
  });

  // Re-populate when inventoryItem changes
  useEffect(() => {
    if (isOpen && inventoryItem) {
      reset(getInitialValues(inventoryItem));
    }
  }, [isOpen, inventoryItem, reset]);

  const watchedCategoryId = watch('category_id');
  const watchedImage = watch('image');
  const watchedSupplierId = watch('supplier_id');

  const { subcategories, isLoadingSubcategories } = useSubcategories(
    watchedCategoryId ? Number(watchedCategoryId) : null,
    null,
    { paginate: false }
  );

  // Keep category_id in sync after categories load
  useEffect(() => {
    if (inventoryItem?.category_id && categories?.length > 0) {
      setValue('category_id', String(inventoryItem.category_id));
    }
  }, [categories, inventoryItem, setValue]);

  // Keep subcategory_id in sync after subcategories load
  useEffect(() => {
    if (inventoryItem?.subcategory_id && subcategories?.length > 0) {
      setValue('subcategory_id', String(inventoryItem.subcategory_id));
    }
  }, [subcategories, inventoryItem, setValue]);

  const selectedCategoryObj = categories?.find(
    (c) => c.id === Number(watchedCategoryId)
  );
  const categoryName = selectedCategoryObj?.name?.toLowerCase() || '';
  const isFrame = categoryName === 'frames';
  const isLens = categoryName === 'lenses';
  const isAccessory = !!watchedCategoryId && !isFrame && !isLens;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setValue('image', reader.result);
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen || !inventoryItem) return null;

  const handleCancel = () => {
    if (isPending) return;
    onClose();
  };

  const onSubmit = async (data) => {
    setIsPending(true);
    try {
      const typedBrandName = (data.brand || '').trim();
      let brandId = null;

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

      // Clean specifications
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

      if (isFrame) {
        frame_details = cleanObj(data.frame_details);
      } else if (isLens) {
        lens_details = cleanObj(data.lens_details);
      } else if (isAccessory) {
        accessory_details = cleanObj(data.accessory_details);
      }

      const updatedPayload = {
        ...data,
        id: inventoryItem.id,
        product_id: inventoryItem.product_id,
        category_id: Number(data.category_id),
        subcategory_id: data.subcategory_id ? Number(data.subcategory_id) : null,
        brand_id: brandId,
        image: data.image || null,
        frame_details,
        lens_details,
        accessory_details,
      };

      await onSubmitProp?.(updatedPayload);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsPending(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[999] p-3 sm:p-4 animate-fade-in font-sans">
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col border border-slate-100 animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 border-b border-slate-100 bg-white flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-600 flex-shrink-0">
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                Edit Inventory: {inventoryItem.product_name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                Modify product details, pricing, and reorder levels.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors flex-shrink-0 ml-2 disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="overflow-y-auto flex-1 hide-scrollbar">
          <div className="px-5 sm:px-7 py-5 sm:py-6 space-y-6">
            <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-6">
              
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
                        onClick={() => setValue('image', null)}
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
                      {...register('product_name', {
                        required: 'Product name is required',
                        minLength: { value: 2, message: 'At least 2 characters required' },
                      })}
                      type="text"
                      disabled={isPending}
                      placeholder="e.g. Ray-Ban Aviator Classic"
                      className={inputCls(!!errors.product_name)}
                    />
                    <FieldError message={errors.product_name?.message} />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">SKU</label>
                    <input
                      {...register('sku')}
                      type="text"
                      disabled={true}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-sm font-medium cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category <span className="text-red-500">*</span></label>
                    <select
                      {...register('category_id', { required: 'Category is required' })}
                      className={inputCls(!!errors.category_id)}
                      disabled={isPending}
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
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
                      {subcategories.filter((sub) => sub.is_active).map((sub) => (
                        <option key={sub.id} value={String(sub.id)}>{sub.name}</option>
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
                      list="edit-brand-datalist"
                    />
                    <datalist id="edit-brand-datalist">
                      {brands.filter((b) => b.is_active).map((b) => (
                        <option key={b.id} value={b.name} />
                      ))}
                    </datalist>
                    <FieldError message={errors.brand?.message} />
                  </div>

                  <div className="sm:col-span-2">
                    <SupplierSelect
                      selectedSupplierId={watchedSupplierId}
                      onChange={(supplier) => setValue('supplier_id', supplier ? String(supplier.id) : '')}
                      error={errors.supplier_id?.message}
                      disabled={isPending}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                    <textarea
                      {...register('description')}
                      rows={2}
                      disabled={isPending}
                      placeholder="Optional product description..."
                      className={`${inputCls(false)} resize-none`}
                    />
                  </div>
                </div>
              </section>

              {/* 2 – Specifications (Conditional) */}
              {watchedCategoryId && (
                <>
                  <div className="border-t border-slate-100" />
                  <section>
                    <SectionHeading num="2" label={`${selectedCategoryObj?.name || 'Product'} Specifications`} />

                    {isFrame && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Frame Type</label>
                          <select {...register('frame_details.frame_type')} disabled={isPending} className={inputCls(false)}>
                            <option value="">Select Type</option>
                            <option value="Full-Rim">Full-Rim</option>
                            <option value="Half-Rim">Half-Rim</option>
                            <option value="Rimless">Rimless</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Shape</label>
                          <select {...register('frame_details.shape')} disabled={isPending} className={inputCls(false)}>
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
                          <select {...register('frame_details.material')} disabled={isPending} className={inputCls(false)}>
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
                          <input {...register('frame_details.color')} type="text" disabled={isPending} placeholder="e.g. Black / Gold" className={inputCls(false)} />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Lens Width (mm)</label>
                          <input {...register('frame_details.lens_width')} type="text" disabled={isPending} placeholder="e.g. 52" className={inputCls(false)} />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bridge Width (mm)</label>
                          <input {...register('frame_details.bridge_width')} type="text" disabled={isPending} placeholder="e.g. 18" className={inputCls(false)} />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Temple Length (mm)</label>
                          <input {...register('frame_details.temple_length')} type="text" disabled={isPending} placeholder="e.g. 140" className={inputCls(false)} />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Gender</label>
                          <select {...register('frame_details.gender')} disabled={isPending} className={inputCls(false)}>
                            <option value="">Select Gender</option>
                            <option value="Unisex">Unisex</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Kids">Kids</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Age Group</label>
                          <select {...register('frame_details.age_group')} disabled={isPending} className={inputCls(false)}>
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
                          <select {...register('lens_details.lens_type')} disabled={isPending} className={inputCls(false)}>
                            <option value="">Select Type</option>
                            <option value="Single Vision">Single Vision</option>
                            <option value="Bifocal">Bifocal</option>
                            <option value="Progressive">Progressive</option>
                            <option value="Zero Power">Zero Power</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Material</label>
                          <select {...register('lens_details.material')} disabled={isPending} className={inputCls(false)}>
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
                          <select {...register('lens_details.index_value')} disabled={isPending} className={inputCls(false)}>
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
                          <select {...register('lens_details.coating')} disabled={isPending} className={inputCls(false)}>
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
                          <input {...register('lens_details.tint_color')} type="text" disabled={isPending} placeholder="Clear / Brown / Grey" className={inputCls(false)} />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">UV Protection</label>
                          <select {...register('lens_details.uv_protection')} disabled={isPending} className={inputCls(false)}>
                            <option value="">Select UV</option>
                            <option value="UV400">UV400</option>
                            <option value="UV380">UV380</option>
                            <option value="None">None</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Blue Cut Filter</label>
                          <select {...register('lens_details.blue_cut')} disabled={isPending} className={inputCls(false)}>
                            <option value="">Select Blue Cut</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Photochromic</label>
                          <select {...register('lens_details.photochromic')} disabled={isPending} className={inputCls(false)}>
                            <option value="">Select Transition</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Polarized</label>
                          <select {...register('lens_details.polarized')} disabled={isPending} className={inputCls(false)}>
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
                          <input {...register('accessory_details.accessory_type')} type="text" disabled={isPending} placeholder="e.g. Case, Cloth, Chain, Solution" className={inputCls(false)} />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Material</label>
                          <input {...register('accessory_details.material')} type="text" disabled={isPending} placeholder="e.g. Leather, Microfiber, Silicon" className={inputCls(false)} />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Color</label>
                          <input {...register('accessory_details.color')} type="text" disabled={isPending} placeholder="e.g. Black, Brown, Transparent" className={inputCls(false)} />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Size / Dimensions</label>
                          <input {...register('accessory_details.size')} type="text" disabled={isPending} placeholder="e.g. Medium, 50ml, 15x15cm" className={inputCls(false)} />
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
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Current Stock Level</label>
                    <input
                      type="number"
                      disabled={true}
                      value={inventoryItem.quantity}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-sm font-medium cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-slate-400">Restock via "Restock from Supplier" to increase physical inventory</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reorder Level <span className="text-red-500">*</span></label>
                    <input
                      {...register('reorder_level', {
                        required: 'Reorder level is required',
                        min: { value: 1, message: 'Reorder level must be at least 1' },
                      })}
                      type="number"
                      min="1"
                      disabled={isPending}
                      placeholder="e.g. 10"
                      className={inputCls(!!errors.reorder_level)}
                    />
                    <FieldError message={errors.reorder_level?.message} />
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
                      {...register('cost_price', {
                        required: 'Cost price is required',
                        min: { value: 0, message: 'Price cannot be negative' },
                      })}
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={isPending}
                      placeholder="0.00"
                      className={inputCls(!!errors.cost_price)}
                    />
                    <FieldError message={errors.cost_price?.message} />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Selling Price (₹) <span className="text-red-500">*</span></label>
                    <input
                      {...register('selling_price', {
                        required: 'Selling price is required',
                        min: { value: 0, message: 'Price cannot be negative' },
                      })}
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={isPending}
                      placeholder="0.00"
                      className={inputCls(!!errors.selling_price)}
                    />
                    <FieldError message={errors.selling_price?.message} />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Discount (%)</label>
                    <input
                      {...register('discount_percent', {
                        min: { value: 0, message: 'Discount cannot be negative' },
                        max: { value: 100, message: 'Discount cannot exceed 100%' },
                      })}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      disabled={isPending}
                      placeholder="0.00"
                      className={inputCls(!!errors.discount_percent)}
                    />
                    <FieldError message={errors.discount_percent?.message} />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Warranty (Months)</label>
                    <input
                      {...register('warranty_months', {
                        min: { value: 0, message: 'Warranty cannot be negative' },
                      })}
                      type="number"
                      min="0"
                      disabled={isPending}
                      placeholder="0"
                      className={inputCls(!!errors.warranty_months)}
                    />
                    <FieldError message={errors.warranty_months?.message} />
                  </div>
                </div>
              </section>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end items-center gap-3 px-5 sm:px-7 py-4 border-t border-slate-200 bg-white flex-shrink-0 rounded-b-2xl">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="px-5 py-2.5 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-350 rounded-xl font-semibold transition-all text-sm disabled:opacity-50 text-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isPending}
            className="px-6 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin text-white" />}
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EditInventoryModal;
