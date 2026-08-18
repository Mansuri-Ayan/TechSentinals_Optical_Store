import { useState, useEffect } from 'react';
import { ArrowRightLeft, X as XIcon, Plus, IndianRupee } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCategories } from '../../hooks/useCategories';
import { useProducts } from '../../hooks/useProducts';
import { getInventoryApi } from '../../api/inventory/inventory.api';

const MANAGER_EMPTY_FORM = {
  mode: 'request', // 'request', 'send', 'purchase', 'damage', 'loss', 'sale', 'return'
  targetStore: 'admin', // admin warehouse or another store ID
  categoryId: '',
  product: '',
  quantity: '',
  purchasePrice: '',
  remarks: '',
};

const ManagerNewTransactionModal = ({
  isOpen,
  onClose,
  onRequest,
  onPush,
  onPurchase,
  onDamage,
  onLoss,
  onSale,
  onReturn,
  currentUser,
  stores,
  isSubmitting,
}) => {
  const [form, setForm] = useState(MANAGER_EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [localSubmitting, setLocalSubmitting] = useState(false);

  const categoryStoreId = form.mode === 'request'
    ? (form.targetStore === 'admin' ? 'admin' : (form.targetStore || null))
    : (currentUser?.store_id || null);

  const { categories } = useCategories(categoryStoreId, { limit: 100, all_tenant: false });

  // If mode is one of the own store stock-reducing actions or return
  const { data: ownInventoryData, isLoading: isLoadingOwnInventory } = useQuery({
    queryKey: ['inventory', 'STORE', currentUser?.store_id],
    queryFn: () => getInventoryApi({
      owner_type: 'STORE',
      owner_id: currentUser?.store_id,
      paginate: false
    }),
    enabled: isOpen && ['send', 'damage', 'loss', 'sale', 'return'].includes(form.mode) && !!currentUser?.store_id,
  });

  const ownInventoryItems = (ownInventoryData?.items || []).filter(item => (item.available_quantity || 0) > 0);

  // If mode is 'request', fetch source inventory (Admin Warehouse or sister store)
  const sourceOwnerType = form.targetStore === 'admin' ? 'ADMIN' : 'STORE';
  const sourceOwnerId = form.targetStore === 'admin' ? 1 : Number(form.targetStore);
  const { data: sourceInventoryData, isLoading: isLoadingSourceInventory } = useQuery({
    queryKey: ['inventory', sourceOwnerType, sourceOwnerId],
    queryFn: () => getInventoryApi({
      owner_type: sourceOwnerType,
      owner_id: sourceOwnerId,
      warehouse_only: sourceOwnerType === 'ADMIN',
      paginate: false
    }),
    enabled: isOpen && form.mode === 'request' && !!form.targetStore,
  });

  const sourceInventoryItems = (sourceInventoryData?.items || []).filter(item => (item.available_quantity || 0) > 0);

  const { products: catalogProducts } = useProducts({
    category_id: form.categoryId ? Number(form.categoryId) : null,
    limit: 500,
    active_only: true,
  });

  useEffect(() => {
    if (isOpen) {
      setForm(MANAGER_EMPTY_FORM);
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const set = (key, val) => {
    setForm(prev => ({
      ...prev,
      [key]: val,
      ...(key === 'mode' ? { product: '', quantity: '', targetStore: val === 'request' ? 'admin' : '', purchasePrice: '', categoryId: '' } : {}),
      ...(key === 'categoryId' ? { product: '' } : {}),
      ...(key === 'targetStore' ? { product: '', categoryId: '' } : {}),
    }));
    setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (['request', 'send', 'return'].includes(form.mode) && !form.targetStore) {
      e.targetStore = form.mode === 'request' ? 'Source store/warehouse is required' : 'Destination is required';
    }
    if (!form.product) e.product = 'Product is required';
    if (!form.quantity || isNaN(form.quantity) || Number(form.quantity) < 1) {
      e.quantity = 'Enter a valid quantity (≥ 1)';
    }

    if (['send', 'damage', 'loss', 'sale', 'return'].includes(form.mode)) {
      const selectedItem = ownInventoryItems.find(item => String(item.product_id) === String(form.product));
      if (selectedItem && Number(form.quantity) > Number(selectedItem.available_quantity || 0)) {
        e.quantity = `Only ${selectedItem.available_quantity || 0} available in your store stock`;
      }
    }

    if (form.mode === 'purchase') {
      if (!form.purchasePrice || isNaN(form.purchasePrice) || Number(form.purchasePrice) <= 0) {
        e.purchasePrice = 'Enter a valid purchase price (> 0)';
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (localSubmitting) return;

    setLocalSubmitting(true);
    try {
      if (form.mode === 'request') {
        const isFromAdmin = form.targetStore === 'admin';
        await onRequest({
          product_id: Number(form.product),
          quantity: Number(form.quantity),
          from_owner_type: isFromAdmin ? 'ADMIN' : 'STORE',
          from_owner_id: isFromAdmin ? 1 : Number(form.targetStore),
          remarks: form.remarks || null,
        });
      } else if (form.mode === 'send') {
        const isToAdmin = form.targetStore === 'admin' || form.targetStore === '0';
        await onPush({
          product_id: Number(form.product),
          quantity: Number(form.quantity),
          to_store_id: isToAdmin ? 0 : Number(form.targetStore),
          remarks: form.remarks || null,
        });
      } else if (form.mode === 'purchase') {
        await onPurchase({
          product_id: Number(form.product),
          quantity: Number(form.quantity),
          purchase_price: Number(form.purchasePrice),
          remarks: form.remarks || null,
        });
      } else if (form.mode === 'damage') {
        await onDamage({
          product_id: Number(form.product),
          quantity: Number(form.quantity),
          remarks: form.remarks || null,
        });
      } else if (form.mode === 'loss') {
        await onLoss({
          product_id: Number(form.product),
          quantity: Number(form.quantity),
          remarks: form.remarks || null,
        });
      } else if (form.mode === 'sale') {
        await onSale({
          product_id: Number(form.product),
          quantity: Number(form.quantity),
          remarks: form.remarks || null,
        });
      } else if (form.mode === 'return') {
        const isToAdmin = form.targetStore === 'admin';
        await onReturn({
          product_id: Number(form.product),
          quantity: Number(form.quantity),
          owner_type: isToAdmin ? 'ADMIN' : 'STORE',
          owner_id: isToAdmin ? 1 : Number(form.targetStore),
          remarks: form.remarks || null,
        });
      }
    } catch {
      // Error handled elsewhere
    } finally {
      setLocalSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting || localSubmitting) return;
    setForm(MANAGER_EMPTY_FORM);
    setErrors({});
    onClose();
  };

  const inputCls = (field) =>
    `w-full px-3 py-2.5 text-sm font-medium border rounded-xl focus:outline-none focus:ring-4 transition-all bg-white ${errors[field]
      ? 'border-red-400 focus:ring-red-100 focus:border-red-500'
      : 'border-slate-200 focus:ring-blue-500/10 focus:border-blue-500'
    }`;

  // Filter other stores for destination dropdown
  const otherStores = stores.filter(st => String(st.id) !== String(currentUser?.store_id) && String(st.id) !== 'admin');

  // Determine options for products based on mode
  let productOptions = [];
  let isLoadingProducts = false;
  if (form.mode === 'request') {
    productOptions = sourceInventoryItems.filter(item => !form.categoryId || String(item.category_id) === String(form.categoryId));
    isLoadingProducts = isLoadingSourceInventory;
  } else if (['send', 'damage', 'loss', 'sale', 'return'].includes(form.mode)) {
    productOptions = ownInventoryItems.filter(item => !form.categoryId || String(item.category_id) === String(form.categoryId));
    isLoadingProducts = isLoadingOwnInventory;
  } else {
    productOptions = catalogProducts;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[95dvh] overflow-hidden">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {form.mode === 'purchase' ? 'Supplier Purchase' :
                 form.mode === 'damage' ? 'Record Damaged Stock' :
                 form.mode === 'loss' ? 'Record Lost Stock' :
                 form.mode === 'sale' ? 'Record Sale' :
                 form.mode === 'return' ? 'Record Return' : 'New Stock Transfer'}
              </h2>
              <p className="text-xs text-slate-500">
                {form.mode === 'purchase' ? 'Record a purchase into your store inventory' :
                 form.mode === 'damage' ? 'Deduct damaged items from your store stock' :
                 form.mode === 'loss' ? 'Deduct lost items from your store stock' :
                 form.mode === 'sale' ? 'Record a manual sale/stock reduction' :
                 form.mode === 'return' ? 'Add returned items back to store stock' :
                 'Request stock or send inventory to other branches'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} disabled={isSubmitting || localSubmitting} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-5 sm:px-6 py-5 space-y-4">
            
            {/* Transaction Type selection (Dropdown matching admin style) */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Transaction Type <span className="text-red-500">*</span></label>
              <select
                value={form.mode}
                onChange={e => set('mode', e.target.value)}
                className={inputCls('mode')}
              >
                <option value="request">Inventory Transfer (Request)</option>
                <option value="send">Inventory Transfer (Send)</option>
                <option value="damage">Damage</option>
                <option value="return">Return</option>
              </select>
            </div>

            {['purchase', 'damage', 'loss', 'sale'].includes(form.mode) ? (
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Store / Warehouse</label>
                <input
                  value={currentUser?.store_name || "My Store Stock"}
                  disabled
                  className={`${inputCls('destination')} disabled:bg-slate-50 disabled:text-slate-500`}
                />
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  {form.mode === 'request' ? 'Request From (Source)' : 'Send To (Destination)'} <span className="text-red-500">*</span>
                </label>
                <select value={form.targetStore} onChange={e => set('targetStore', e.target.value)} className={inputCls('targetStore')}>
                  <option value="">Select store/warehouse...</option>
                  <option value="admin">Admin Warehouse</option>
                  {otherStores.map(st => (
                    <option key={st.id} value={String(st.id)}>{st.store_name || st.name || `Store #${st.id}`}</option>
                  ))}
                </select>
                {errors.targetStore && <p className="text-xs text-red-500 mt-1">{errors.targetStore}</p>}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Category Filter</label>
                <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)} className={inputCls('categoryId')}>
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Product / Item <span className="text-red-500">*</span></label>
                <select
                  value={form.product}
                  onChange={e => set('product', e.target.value)}
                  className={inputCls('product')}
                  disabled={isLoadingProducts || (form.mode === 'request' && !form.targetStore)}
                >
                  <option value="">
                    {isLoadingProducts
                      ? 'Loading inventory...'
                      : form.mode === 'request' && !form.targetStore
                        ? 'Select source first'
                        : 'Select product...'
                    }
                  </option>
                  {form.mode === 'purchase' ? (
                    productOptions.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))
                  ) : (
                    productOptions.map(item => (
                      <option key={item.id} value={item.product_id}>
                        {item.product_name || item.product_sku || `Product #${item.product_id}`} ({item.available_quantity || 0} available)
                      </option>
                    ))
                  )}
                </select>
                {errors.product && <p className="text-xs text-red-500 mt-1">{errors.product}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Quantity <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={e => set('quantity', e.target.value)}
                  placeholder="e.g. 5"
                  className={inputCls('quantity')}
                />
                {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
              </div>

              {form.mode === 'purchase' && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5" /> Unit Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.purchasePrice}
                    onChange={e => set('purchasePrice', e.target.value)}
                    placeholder="e.g. 299.99"
                    className={inputCls('purchasePrice')}
                  />
                  {errors.purchasePrice && <p className="text-xs text-red-500 mt-1">{errors.purchasePrice}</p>}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Remarks <span className="text-slate-400">(optional)</span></label>
              <textarea
                rows={2}
                value={form.remarks}
                onChange={e => set('remarks', e.target.value)}
                placeholder="Add any notes or justification for the transfer request…"
                className="w-full px-3 py-2.5 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-white resize-none"
              />
            </div>
          </div>

          <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 flex-shrink-0 bg-slate-50">
            <button type="button" onClick={handleClose} disabled={isSubmitting || localSubmitting}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || localSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-[#0A0F1F] rounded-xl hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
              <Plus className="w-4 h-4" />
              {(isSubmitting || localSubmitting) ? 'Submitting...' :
               form.mode === 'request' ? 'Request Stock' :
               form.mode === 'send' ? 'Send Stock' :
               form.mode === 'purchase' ? 'Record Purchase' :
               form.mode === 'damage' ? 'Record Damage' :
               form.mode === 'loss' ? 'Record Loss' :
               form.mode === 'sale' ? 'Record Sale' : 'Record Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManagerNewTransactionModal;
