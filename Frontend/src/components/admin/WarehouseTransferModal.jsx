import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { X, ArrowRightLeft, Loader2, Info } from 'lucide-react';
import { useStoreStore, useAuthStore } from '../../store/store';
import { useInventory } from '../../hooks/useInventory';
import { createTransferApi } from '../../api/transactions/transaction.api';

const WarehouseTransferModal = ({ isOpen, onClose, defaultProduct, onSuccess }) => {
  const { user } = useAuthStore();
  const { stores } = useStoreStore();
  const [direction, setDirection] = useState('send'); // 'send' (Admin -> Store) or 'pull' (Store -> Admin)
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [isPending, setIsPending] = useState(false);

  // Filter out the 'admin' pseudo store for branch select dropdown
  const branchStores = useMemo(() => {
    return stores.filter(s => s.id !== 'admin' && s.store_name !== 'All Store' && s.name !== 'All Store');
  }, [stores]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      product_id: '',
      quantity: '',
      remarks: '',
    },
  });

  const selectedProductId = watch('product_id');

  // Determine source store ID to fetch inventories
  const sourceStoreId = useMemo(() => {
    if (direction === 'send') {
      return 'admin';
    }
    return selectedStoreId || null;
  }, [direction, selectedStoreId]);

  // Fetch inventory items from the source store/warehouse
  const { kpiItems, isLoading: isLoadingInventory } = useInventory(sourceStoreId, { paginate: false });

  // Map inventory items to options
  const productOptions = useMemo(() => {
    if (!kpiItems) return [];
    return kpiItems
      .filter(item => item.available_quantity > 0)
      .map(item => ({
        id: item.product_id,
        inventory_id: item.id,
        name: item.product_name,
        sku: item.product_sku || item.sku,
        qty: item.available_quantity,
        brand: item.brand_name || item.brand,
      }));
  }, [kpiItems]);

  // Selected product details
  const selectedProductDetail = useMemo(() => {
    if (!selectedProductId || !productOptions.length) return null;
    return productOptions.find(p => String(p.id) === String(selectedProductId));
  }, [selectedProductId, productOptions]);

  // Update selected store ID if only one branch exists
  useEffect(() => {
    if (branchStores.length === 1 && !selectedStoreId) {
      setSelectedStoreId(String(branchStores[0].id));
    }
  }, [branchStores, selectedStoreId]);

  // Handle default product pre-population
  useEffect(() => {
    if (defaultProduct && isOpen) {
      // Since defaultProduct is from warehouse, set direction to 'send'
      setDirection('send');
      // Find matching item in options
      setValue('product_id', String(defaultProduct.product_id || defaultProduct.id));
    }
  }, [defaultProduct, isOpen, setValue]);

  if (!isOpen) return null;

  const handleCancel = () => {
    if (isPending) return;
    reset();
    setSelectedStoreId(branchStores[0]?.id ? String(branchStores[0].id) : '');
    onClose();
  };

  const onSubmit = async (data) => {
    if (!selectedStoreId) {
      toast.error('Please select a store.');
      return;
    }
    if (!user?.id) {
      toast.error('Logged in user session is required.');
      return;
    }

    setIsPending(true);
    try {
      const fromType = direction === 'send' ? 'ADMIN' : 'STORE';
      const fromId = direction === 'send' ? user.id : Number(selectedStoreId);
      const toType = direction === 'send' ? 'STORE' : 'ADMIN';
      const toId = direction === 'send' ? Number(selectedStoreId) : user.id;

      const payload = {
        from_owner_type: fromType,
        from_owner_id: fromId,
        to_owner_type: toType,
        to_owner_id: toId,
        product_id: Number(data.product_id),
        quantity: Number(data.quantity),
        remarks: data.remarks || null,
      };

      await createTransferApi(payload);
      toast.success('Stock transfer recorded successfully.');
      onSuccess?.();
      handleCancel();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to complete stock transfer.');
    } finally {
      setIsPending(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[999] p-3 sm:p-4 animate-fade-in font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col border border-slate-100 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Warehouse Transfer</h2>
              <p className="text-xs text-slate-500 mt-0.5">Move stock between warehouse and store branches.</p>
            </div>
          </div>
          <button type="button" onClick={handleCancel} disabled={isPending}
            className="p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-colors disabled:opacity-30">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5">
          {/* Direction toggle */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Transfer Direction</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setDirection('send');
                  setValue('product_id', '');
                  setValue('quantity', '');
                }}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  direction === 'send'
                    ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Send to Store (Warehouse → Store)
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setDirection('pull');
                  setValue('product_id', '');
                  setValue('quantity', '');
                }}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  direction === 'pull'
                    ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Pull from Store (Store → Warehouse)
              </button>
            </div>
          </div>

          {/* Store Branch Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Target/Source Store Branch <span className="text-red-500">*</span></label>
            <select
              value={selectedStoreId}
              onChange={(e) => {
                setSelectedStoreId(e.target.value);
                setValue('product_id', '');
                setValue('quantity', '');
              }}
              disabled={isPending}
              className="w-full px-4 py-2.5 bg-white border border-slate-350 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-semibold text-slate-800 text-sm transition-all"
            >
              <option value="">Select Branch Store</option>
              {branchStores.map((st) => (
                <option key={st.id} value={st.id}>{st.store_name || st.name}</option>
              ))}
            </select>
          </div>

          {/* Product Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Product <span className="text-red-500">*</span></label>
            <select
              {...register('product_id', { required: 'Please select a product.' })}
              disabled={isPending || !sourceStoreId || isLoadingInventory}
              className="w-full px-4 py-2.5 bg-white border border-slate-350 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-semibold text-slate-800 text-sm transition-all disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">
                {!selectedStoreId && direction === 'pull'
                  ? 'Select Store Branch First'
                  : isLoadingInventory
                  ? 'Loading Products...'
                  : productOptions.length === 0
                  ? 'No available stock to transfer'
                  : 'Select Product'}
              </option>
              {productOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — Available: {p.qty}
                </option>
              ))}
            </select>
            {errors.product_id && <p className="mt-1 text-xs text-red-500 font-medium">{errors.product_id.message}</p>}
          </div>

          {/* Selected Product Specifications banner */}
          {selectedProductDetail && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 flex gap-3 text-xs">
              <Info className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div className="font-semibold text-slate-600 space-y-1">
                <p><span className="text-slate-400 font-medium">SKU:</span> {selectedProductDetail.sku}</p>
                <p><span className="text-slate-400 font-medium">Brand:</span> {selectedProductDetail.brand}</p>
                <p><span className="text-slate-400 font-medium">Available Quantity:</span> <span className="text-emerald-600 font-bold">{selectedProductDetail.qty} units</span></p>
              </div>
            </div>
          )}

          {/* Quantity Input */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Transfer Quantity <span className="text-red-500">*</span></label>
            <input
              {...register('quantity', {
                required: 'Quantity is required',
                min: { value: 1, message: 'Quantity must be at least 1' },
                validate: v => {
                  const num = Number(v);
                  if (!Number.isInteger(num)) return 'Enter a whole number';
                  if (selectedProductDetail && num > selectedProductDetail.qty) {
                    return `Cannot exceed available quantity (${selectedProductDetail.qty})`;
                  }
                  return true;
                }
              })}
              type="number"
              min="1"
              disabled={isPending || !selectedProductId}
              placeholder="e.g. 5"
              className="w-full px-4 py-2.5 bg-white border border-slate-350 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-semibold text-slate-800 text-sm transition-all disabled:bg-slate-50 disabled:text-slate-400"
            />
            {errors.quantity && <p className="mt-1 text-xs text-red-500 font-medium">{errors.quantity.message}</p>}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Remarks / Reason</label>
            <textarea
              {...register('remarks')}
              rows={2}
              disabled={isPending}
              placeholder="Optional notes about this transfer..."
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-semibold text-slate-850 text-sm transition-all resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-3 border-t border-slate-100 flex-shrink-0">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-750 hover:bg-slate-50 hover:border-slate-300 rounded-xl font-bold transition-all text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !selectedStoreId || !selectedProductId}
              className="flex-1 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              {isPending ? 'Transferring...' : 'Transfer Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default WarehouseTransferModal;
