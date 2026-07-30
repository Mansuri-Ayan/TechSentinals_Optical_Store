import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { X, ArrowRightLeft, Loader2, Info, ChevronDown, Lock } from 'lucide-react';
import { useTransactions } from '../../hooks/useTransactions';
import { useAuthStore } from '../../store/store';
import { useStores } from '../../hooks/useStores';

const RequestStockModal = ({ isOpen, onClose, product, sourceStore, onSuccess }) => {
  const [isPending, setIsPending] = useState(false);
  const { createManagerRequestAsync } = useTransactions(null, {}, true);
  const { user } = useAuthStore();
  const { stores } = useStores({ paginate: false });

  // Source store options: Central Warehouse + all other store branches
  const sourceStoreOptions = useMemo(() => {
    const options = [
      { id: 'admin', store_name: 'Central Warehouse', owner_type: 'ADMIN' }
    ];
    if (Array.isArray(stores)) {
      stores.forEach(s => {
        const isAllStore = s.id === 'admin' || s.store_name === 'All Store' || s.name === 'All Store';
        const isOwnStore = String(s.id) === String(user?.store_id);
        if (!isAllStore && !isOwnStore) {
          options.push({
            id: s.id,
            store_name: s.store_name || s.name,
            owner_type: 'STORE'
          });
        }
      });
    }
    return options;
  }, [stores, user?.store_id]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      source_store_id: '',
      quantity: '',
      remarks: '',
    },
  });

  const watchedSourceStoreId = watch('source_store_id');

  // Compute available stock limit dynamically matching selected source store
  const currentSourceStock = useMemo(() => {
    if (!watchedSourceStoreId || !product) return 0;
    
    const isWarehouseSelect = watchedSourceStoreId === 'admin';
    
    // Check if the selected source matches the initial sourceStore passed in
    if (sourceStore) {
      const sId = String(sourceStore.store_id || sourceStore.id || '');
      const isInitialWarehouse = sourceStore.owner_type === 'ADMIN' || sId === '0' || sId === 'admin';
      const isMatchedInitial = (isWarehouseSelect && isInitialWarehouse) || (String(watchedSourceStoreId) === sId);
      if (isMatchedInitial) {
        return sourceStore.available_quantity ?? sourceStore.quantity ?? 0;
      }
    }
    
    // Check in product's other_stocks list
    if (product.other_stocks) {
      const matched = product.other_stocks.find(s => {
        const sId = String(s.store_id || s.id || '');
        const isWh = s.owner_type === 'ADMIN' || sId === '0' || sId === 'admin';
        return (isWarehouseSelect && isWh) || (String(watchedSourceStoreId) === sId);
      });
      if (matched) {
        return matched.available_quantity ?? matched.quantity ?? 0;
      }
    }

    // Fallback: check product itself if it belongs to ADMIN
    const isProdWarehouse = product.owner_type === 'ADMIN' || String(product.owner_id) === '0' || String(product.owner_id) === 'admin';
    if (isWarehouseSelect && isProdWarehouse) {
      return product.available_quantity ?? product.quantity ?? 0;
    }
    
    return 0;
  }, [watchedSourceStoreId, product, sourceStore]);

  useEffect(() => {
    if (isOpen && product) {
      let defaultSourceId = 'admin';
      if (sourceStore) {
        const sourceIdStr = String(sourceStore.store_id || sourceStore.id || '');
        if (sourceStore.owner_type === 'ADMIN' || sourceIdStr === '0' || sourceIdStr === 'admin') {
          defaultSourceId = 'admin';
        } else {
          defaultSourceId = sourceIdStr;
        }
      }
      reset({
        source_store_id: defaultSourceId,
        quantity: '',
        remarks: '',
      });
    }
  }, [isOpen, product, sourceStore, reset]);

  if (!isOpen || !product) return null;

  const handleCancel = () => {
    if (isPending) return;
    reset();
    onClose();
  };

  const onSubmit = async (data) => {
    setIsPending(true);
    try {
      const fromStoreObj = sourceStoreOptions.find(s => String(s.id) === String(data.source_store_id));
      if (!fromStoreObj) {
        throw new Error('Invalid source location selected');
      }

      const payload = {
        product_id: product.product_id || product.id,
        quantity: Number(data.quantity),
        from_owner_type: fromStoreObj.owner_type,
        from_owner_id: fromStoreObj.owner_type === 'ADMIN' ? 0 : Number(fromStoreObj.id),
        remarks: data.remarks || null,
      };

      await createManagerRequestAsync(payload);
      onSuccess?.();
      handleCancel();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || err.message || 'Failed to send stock request.');
    } finally {
      setIsPending(false);
    }
  };

  const currentSourceLocationName = sourceStoreOptions.find(s => String(s.id) === String(watchedSourceStoreId))?.store_name || 'Central Warehouse';

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1200] p-3 sm:p-4 animate-fade-in font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col border border-slate-100 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-600">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Request Stock</h2>
              <p className="text-xs text-slate-505 mt-0.5">Submit stock request for your branch store.</p>
            </div>
          </div>
          <button type="button" onClick={handleCancel} disabled={isPending}
            className="p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-colors disabled:opacity-30">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5">
          {/* Selected Product info */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 flex gap-3 text-xs">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="font-semibold text-slate-600 space-y-1">
              <p className="text-slate-800 text-sm font-bold">{product.product_name || product.name}</p>
              <p><span className="text-slate-400 font-medium">SKU:</span> {product.product_sku || product.sku || 'N/A'}</p>
              <p><span className="text-slate-400 font-medium">Brand:</span> {product.brand_name || product.brand || 'N/A'}</p>
              <p>
                <span className="text-slate-400 font-medium">Source Location:</span>{' '}
                <span className="text-slate-800 font-bold">{currentSourceLocationName}</span>
              </p>
              <p>
                <span className="text-slate-400 font-medium">Available Quantity:</span>{' '}
                <span className="text-emerald-600 font-bold">{currentSourceStock} units</span>
              </p>
            </div>
          </div>

          {/* Fixed Source Store Display */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Source Location (From)</span>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" /> Fixed Location
              </span>
            </label>
            <div className="w-full px-4 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm flex items-center justify-between cursor-not-allowed">
              <span>{currentSourceLocationName}</span>
              <span className="text-xs font-bold text-emerald-600">({currentSourceStock} units)</span>
            </div>
            <input type="hidden" {...register('source_store_id', { required: true })} />
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Requested Quantity <span className="text-red-500">*</span></label>
            <input
              {...register('quantity', {
                required: 'Quantity is required',
                min: { value: 1, message: 'Quantity must be at least 1' },
                validate: v => {
                  const num = Number(v);
                  if (!Number.isInteger(num)) return 'Enter a whole number';
                  if (num > currentSourceStock) {
                    return `Cannot exceed source stock availability (${currentSourceStock})`;
                  }
                  return true;
                }
              })}
              type="number"
              min="1"
              disabled={isPending}
              placeholder="e.g. 5"
              className="w-full px-4 py-2.5 bg-white border border-slate-350 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-semibold text-slate-800 text-sm transition-all disabled:bg-slate-50 disabled:text-slate-400"
            />
            {errors.quantity && <p className="mt-1 text-xs text-red-500 font-medium">{errors.quantity.message}</p>}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Remarks / Reason</label>
            <textarea
              {...register('remarks')}
              rows={2.5}
              disabled={isPending}
              placeholder="E.g., Stock running low, customer pre-order..."
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-semibold text-slate-800 text-sm transition-all resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-3 border-t border-slate-100 flex-shrink-0">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 rounded-xl font-bold transition-all text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 bg-[#0A0F1F] text-white hover:bg-slate-800 rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              {isPending ? 'Sending Request...' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default RequestStockModal;
