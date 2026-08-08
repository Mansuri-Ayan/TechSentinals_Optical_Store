import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Package, ChevronDown, Layers, Hash, FileText, Plus, Check, CreditCard, Calendar, IndianRupee, Store, Building
} from 'lucide-react';
import { useCategories, useSubcategories } from '../../../hooks/useCategories';
import { useProducts } from '../../../hooks/useProducts';
import { useStores } from '../../../hooks/useStores';
import SupplierSelect from '../SupplierSelect';
import { useSuppliers } from '../../../hooks/useSuppliers';

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Credit'];

const EMPTY = {
  categoryId: '',
  subcategoryId: '',
  productId: '',
  storeId: '',
  quantity: '',
  amount: '',
  paidAmount: '',
  dueAmount: '',
  method: '',
  date: new Date().toISOString().split('T')[0],
  remarks: '',
  
  enterUnitCostPrice: true,
  unitCostPrice: '',
  unitSellingPrice: '',
  discountPercent: '0.00',
  profitMargin: '',
  supplierId: '',
};

const AddTransactionModal = ({ isOpen, defaultProductId, defaultSupplierId, storeName, activeStoreId, onClose, onSubmit }) => {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const { stores } = useStores();

  // When a defaultSupplierId is given, the supplier is locked (auto-selected)
  const isSupplierLocked = !!defaultSupplierId;

  // Fetch suppliers to display the locked supplier name
  const { suppliers } = useSuppliers('admin', { limit: 200 });
  const lockedSupplier = isSupplierLocked
    ? suppliers.find(s => String(s.id) === String(defaultSupplierId))
    : null;

  // Fetch all categories (using a high limit to get all)
  const { categories } = useCategories(null, { limit: 100 });
  
  // Fetch subcategories for the selected category
  const { subcategories } = useSubcategories(
    form.categoryId ? Number(form.categoryId) : null,
    null,
    { limit: 100 }
  );

  // Fetch products in the selected category/subcategory
  const { products } = useProducts({
    category_id: form.categoryId ? Number(form.categoryId) : null,
    subcategory_id: form.subcategoryId ? Number(form.subcategoryId) : null,
    limit: 500
  });

  // Fetch all products (for defaultProductId lookup when category/subcategory aren't selected yet)
  const { products: allProducts } = useProducts({ limit: 500 });

  useEffect(() => {
    if (isOpen) {
      setForm({
        ...EMPTY,
        storeId: activeStoreId ? String(activeStoreId) : '',
        enterUnitCostPrice: true,
        supplierId: defaultSupplierId ? String(defaultSupplierId) : '',
      });
      setErrors({});
    }
  }, [isOpen, activeStoreId, defaultSupplierId]);

  // Set category and subcategory from defaultProductId once products list is fetched
  useEffect(() => {
    if (isOpen && defaultProductId && allProducts.length > 0) {
      const prod = allProducts.find(p => String(p.id) === String(defaultProductId));
      if (prod) {
        const cp = Number(prod.cost_price || 0);
        const sp = Number(prod.selling_price || 0);
        const marginVal = sp > 0 ? (((sp - cp) / sp) * 100).toFixed(2) : '';
        setForm(p => ({
          ...p,
          categoryId: String(prod.category_id),
          subcategoryId: String(prod.subcategory_id),
          productId: String(prod.id),
          unitCostPrice: String(cp),
          unitSellingPrice: String(sp),
          discountPercent: String(prod.discount_percent || 0),
          profitMargin: marginVal,
          amount: String(cp * (Number(p.quantity) || 1)),
          dueAmount: String(Math.max(0, cp * (Number(p.quantity) || 1) - (Number(p.paidAmount) || 0))),
        }));
      }
    }
  }, [isOpen, defaultProductId, allProducts]);

  if (!isOpen) return null;

  const set = (k, v) => {
    setForm(p => {
      const next = {
        ...p,
        [k]: v,
        ...(k === 'categoryId' ? { subcategoryId: '', productId: '' } : {}),
        ...(k === 'subcategoryId' ? { productId: '' } : {})
      };

      // Auto-populate unit price or product default cost if product is selected
      if (k === 'productId' && v) {
        const prod = products.find(p => String(p.id) === String(v)) || allProducts.find(p => String(p.id) === String(v));
        if (prod) {
          const cp = Number(prod.cost_price || 0);
          const sp = Number(prod.selling_price || 0);
          next.unitCostPrice = String(cp);
          next.unitSellingPrice = String(sp);
          next.discountPercent = String(prod.discount_percent || 0);
          next.profitMargin = sp > 0 ? (((sp - cp) / sp) * 100).toFixed(2) : '';
          
          if (next.enterUnitCostPrice) {
            next.amount = String(cp * (Number(next.quantity) || 1));
          }
        }
      }

      // Recompute amount if quantity changes
      if (k === 'quantity') {
        const qty = Number(v) || 0;
        if (next.enterUnitCostPrice) {
          const ucp = Number(next.unitCostPrice || 0);
          next.amount = String(ucp * qty);
        } else {
          const amt = Number(next.amount || 0);
          if (qty > 0) {
            next.unitCostPrice = (amt / qty).toFixed(2);
          }
        }
      }

      // Recompute if enterUnitCostPrice checkbox is toggled
      if (k === 'enterUnitCostPrice') {
        if (v) { // switched to entering unit cost
          const ucp = Number(next.unitCostPrice || 0);
          const qty = Number(next.quantity || 1);
          next.amount = String(ucp * qty);
        } else { // switched to entering total cost
          const amt = Number(next.amount || 0);
          const qty = Number(next.quantity || 1);
          if (qty > 0) {
            next.unitCostPrice = (amt / qty).toFixed(2);
          }
        }
      }

      // Recompute if unitCostPrice changes
      if (k === 'unitCostPrice') {
        const ucp = Number(v) || 0;
        const qty = Number(next.quantity || 1);
        if (next.enterUnitCostPrice) {
          next.amount = String(ucp * qty);
        }
        // Update margin
        const usp = Number(next.unitSellingPrice || 0);
        if (usp > 0) {
          next.profitMargin = (((usp - ucp) / usp) * 100).toFixed(2);
        }
      }

      // Recompute if unitSellingPrice changes
      if (k === 'unitSellingPrice') {
        const usp = Number(v) || 0;
        const ucp = Number(next.unitCostPrice || 0);
        if (usp > 0) {
          next.profitMargin = (((usp - ucp) / usp) * 100).toFixed(2);
        }
      }

      // Recompute if profitMargin changes
      if (k === 'profitMargin') {
        const marginVal = Number(v);
        const ucp = Number(next.unitCostPrice || 0);
        if (!isNaN(marginVal) && marginVal < 100 && marginVal >= -1000) {
          const usp = ucp / (1 - marginVal / 100);
          next.unitSellingPrice = isFinite(usp) ? usp.toFixed(2) : '';
        }
      }

      // Recompute if total amount changes
      if (k === 'amount') {
        const amt = Number(v) || 0;
        const qty = Number(next.quantity || 1);
        if (!next.enterUnitCostPrice && qty > 0) {
          next.unitCostPrice = (amt / qty).toFixed(2);
          // Recompute margin
          const usp = Number(next.unitSellingPrice || 0);
          const ucp = Number(next.unitCostPrice);
          if (usp > 0) {
            next.profitMargin = (((usp - ucp) / usp) * 100).toFixed(2);
          }
        }
      }
      
      if (k === 'amount' || k === 'paidAmount' || k === 'quantity' || k === 'unitCostPrice' || k === 'enterUnitCostPrice') {
        const total = next.amount === '' ? 0 : Number(next.amount);
        const paid = next.paidAmount === '' ? 0 : Number(next.paidAmount);
        
        if (!isNaN(total) && !isNaN(paid)) {
          next.dueAmount = String(Math.max(0, total - paid));
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
    if (!form.supplierId)    e.supplierId    = 'Supplier is required';
    if (!form.categoryId)    e.categoryId    = 'Category is required';
    if (!form.subcategoryId) e.subcategoryId = 'Sub-category is required';
    if (!form.productId)     e.productId     = 'Product is required';
    if (!form.storeId)       e.storeId       = 'Receiving store is required';
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

    if (form.unitCostPrice === '' || isNaN(form.unitCostPrice) || Number(form.unitCostPrice) < 0)
      e.unitCostPrice = 'Enter a valid unit cost price (≥ 0)';
    if (form.unitSellingPrice === '' || isNaN(form.unitSellingPrice) || Number(form.unitSellingPrice) < 0)
      e.unitSellingPrice = 'Enter a valid unit selling price (≥ 0)';
    if (form.discountPercent === '' || isNaN(form.discountPercent) || Number(form.discountPercent) < 0 || Number(form.discountPercent) >= 100)
      e.discountPercent = 'Enter a valid discount (0–99.99%). 100% discount is not allowed.';
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      supplierId: Number(form.supplierId),
      categoryId: Number(form.categoryId),
      subcategoryId: Number(form.subcategoryId),
      productId: Number(form.productId),
      storeId: form.storeId === 'warehouse' ? 'warehouse' : Number(form.storeId),
      quantity: Number(form.quantity),
      amount: Number(form.amount),
      paidAmount: Number(form.paidAmount),
      dueAmount: Number(form.dueAmount),
      method: form.method,
      date: form.date,
      remarks: form.remarks,
      
      costPrice: Number(form.unitCostPrice),
      sellingPrice: Number(form.unitSellingPrice),
      discountPercent: Number(form.discountPercent || 0),
    });
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

  const selectedProduct = products.find(p => String(p.id) === String(form.productId));

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
              <p className="text-xs text-slate-500 truncate max-w-[280px]">Restock inventory and record supplier transaction.</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 min-h-0">
          <div className="px-5 py-5 space-y-4">
            
            {/* Section: Supplier */}
            <div className="space-y-3 font-sans">
              {isSupplierLocked ? (
                // When opened from supplier detail page, show a locked read-only supplier card
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    Supplier <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-black">{lockedSupplier?.company_name?.[0] ?? 'S'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{lockedSupplier?.company_name ?? 'Loading...'}</p>
                      {lockedSupplier?.contact_person && (
                        <p className="text-xs text-slate-500 truncate">Contact: {lockedSupplier.contact_person}</p>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 border border-emerald-300 text-emerald-700 tracking-wide uppercase">Auto-Selected</span>
                  </div>
                </div>
              ) : (
                <SupplierSelect
                  selectedSupplierId={form.supplierId}
                  onChange={supplier => set('supplierId', supplier ? String(supplier.id) : '')}
                  error={errors.supplierId}
                />
              )}
            </div>

            <hr className="border-slate-100" />
            
            {/* Section: Goods Details */}
            <div className="space-y-3 font-sans">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Goods details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Category */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" /> Product Category <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)} className={inputCls('categoryId')}>
                      <option value="">Select category…</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  {errors.categoryId && <p className="text-xs text-red-500 mt-1">{errors.categoryId}</p>}
                </div>

                {/* Sub-category */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" /> Sub Category <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select value={form.subcategoryId} onChange={e => set('subcategoryId', e.target.value)} className={inputCls('subcategoryId')} disabled={!form.categoryId}>
                      <option value="">{form.categoryId ? 'Select sub-category…' : 'Select a category first'}</option>
                      {subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  {errors.subcategoryId && <p className="text-xs text-red-500 mt-1">{errors.subcategoryId}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Product Selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-slate-400" /> Product <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select value={form.productId} onChange={e => set('productId', e.target.value)} className={inputCls('productId')} disabled={!form.subcategoryId}>
                      <option value="">{form.subcategoryId ? 'Select product…' : 'Select category & sub-category'}</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  {errors.productId && <p className="text-xs text-red-500 mt-1">{errors.productId}</p>}
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
            </div>

            <hr className="border-slate-100" />

              {/* Destination & Payment Details */}
              <div className="space-y-3 font-sans">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">3. Destination & Payment details</h3>
                
                {/* Receiving Store selection dropdown */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-slate-400" /> Receiving Store <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select value={form.storeId} onChange={e => set('storeId', e.target.value)} className={inputCls('storeId')}>
                      <option value="">Select receiving store…</option>
                      <option value="warehouse">Warehouse (Central)</option>
                      {stores.map(st => <option key={st.id} value={st.id}>{st.store_name || st.name || `Store #${st.id}`}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  {errors.storeId && <p className="text-xs text-red-500 mt-1">{errors.storeId}</p>}
                </div>

                {/* Pricing details section */}
                <div className="pt-2 border-t border-slate-100 space-y-3 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">2.5 Pricing details</h4>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.enterUnitCostPrice}
                        onChange={(e) => set('enterUnitCostPrice', e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/10 focus:ring-4"
                      />
                      <span className="text-xs font-bold text-slate-600">Enter Unit Cost Price</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Unit Cost Price */}
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                        <IndianRupee className="w-3.5 h-3.5 text-slate-400" /> Unit Cost Price (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={!form.enterUnitCostPrice}
                        value={form.unitCostPrice}
                        onChange={(e) => set('unitCostPrice', e.target.value)}
                        placeholder="0.00"
                        className={inputCls('unitCostPrice')}
                      />
                      {errors.unitCostPrice && <p className="text-xs text-red-500 mt-1">{errors.unitCostPrice}</p>}
                    </div>

                    {/* Unit Selling Price */}
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                        <IndianRupee className="w-3.5 h-3.5 text-slate-400" /> Unit Selling Price (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.unitSellingPrice}
                        onChange={(e) => set('unitSellingPrice', e.target.value)}
                        placeholder="0.00"
                        className={inputCls('unitSellingPrice')}
                      />
                      {errors.unitSellingPrice && <p className="text-xs text-red-500 mt-1">{errors.unitSellingPrice}</p>}
                    </div>

                    {/* Profit Margin (%) */}
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-slate-400" /> Profit Margin (%)
                      </label>
                      <input
                        type="number"
                        min="-1000"
                        max="99.99"
                        step="0.01"
                        value={form.profitMargin}
                        onChange={(e) => set('profitMargin', e.target.value)}
                        placeholder="0.00"
                        className={inputCls('profitMargin')}
                      />
                      <p className="mt-0.5 text-[10px] text-slate-400 font-medium">Recalculates Unit Selling Price</p>
                    </div>

                    {/* Discount (%) */}
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-slate-400" /> Discount (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="99.99"
                        step="0.01"
                        value={form.discountPercent}
                        onChange={(e) => set('discountPercent', e.target.value)}
                        placeholder="0.00"
                        className={inputCls('discountPercent')}
                      />
                      {errors.discountPercent && <p className="text-xs text-red-500 mt-1">{errors.discountPercent}</p>}
                      <p className="mt-0.5 text-[10px] text-slate-400 font-medium">Max 99.99% — 100% not allowed</p>
                    </div>
                  </div>
                </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Total Amount */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5 text-slate-400" /> Total Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₹</span>
                    <input type="number" min="0" step="0.01" value={form.amount}
                      disabled={form.enterUnitCostPrice}
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
            {form.categoryId && form.subcategoryId && form.productId && form.quantity && form.amount && form.paidAmount !== '' && form.method && (
              <div className="flex flex-col gap-1 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl font-sans animate-fade-in">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span className="text-xs font-semibold text-emerald-700">
                    {selectedProduct?.name} (Qty: {form.quantity})
                  </span>
                </div>
                <div className="text-xs text-emerald-600 font-medium pl-5 space-y-0.5">
                  <div>Total: ₹{Number(form.amount).toLocaleString('en-IN')} | Paid: ₹{Number(form.paidAmount).toLocaleString('en-IN')} | Due: ₹{Number(form.dueAmount || 0).toLocaleString('en-IN')}</div>
                  <div>Payment: via {form.method} | Deliver to: {storeName}</div>
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
