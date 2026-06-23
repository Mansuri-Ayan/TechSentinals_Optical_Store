import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { X, ArrowRightLeft, Loader2, Info, ChevronDown } from 'lucide-react';
import { useStoreStore, useAuthStore } from '../../store/store';
import { createTransferApi } from '../../api/transactions/transaction.api';

const AdminDirectTransferModal = ({ isOpen, onClose, product, sourceStore, activeStoreId, onSuccess }) => {
  const { user } = useAuthStore();
  const { stores } = useStoreStore();
  const [isPending, setIsPending] = useState(false);

  // All valid stores mapped
  const allLocationOptions = useMemo(() => {
    return stores.map(s => {
      if (s.id === 'admin') {
        return { ...s, store_name: 'Admin Warehouse', owner_type: 'ADMIN' };
      }
      return { ...s, owner_type: 'STORE', store_name: s.store_name || s.name };
    }).filter(s => {
      const isAllStore = s.store_name === 'All Store' || s.name === 'All Store';
      return !isAllStore;
    });
  }, [stores]);

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
      target_store_id: '',
      quantity: '',
      remarks: '',
    },
  });

  const watchedSourceStoreId = watch('source_store_id');
  const watchedTargetStoreId = watch('target_store_id');

  // Filter out the source store so we don't transfer to itself
  const targetStores = useMemo(() => {
    return allLocationOptions.filter(s => String(s.id) !== String(watchedSourceStoreId));
  }, [allLocationOptions, watchedSourceStoreId]);

  // If source and target stores are the same, clear target store selection
  useEffect(() => {
    if (watchedSourceStoreId && watchedTargetStoreId && String(watchedSourceStoreId) === String(watchedTargetStoreId)) {
      setValue('target_store_id', '');
    }
  }, [watchedSourceStoreId, watchedTargetStoreId, setValue]);

  // Compute available stock limit dynamically matching selected source store
  const currentSourceStock = useMemo(() => {
    if (!watchedSourceStoreId || !product) return 0;
    
    // Check if the selected source is the initial sourceStore passed in
    const initialSourceId = sourceStore ? String(sourceStore.store_id || sourceStore.id) : '';
    if (String(watchedSourceStoreId) === initialSourceId) {
      return sourceStore.available_quantity ?? sourceStore.quantity ?? 0;
    }
    
    // Check in product's other_stocks list
    if (product.other_stocks) {
      const matched = product.other_stocks.find(s => String(s.store_id || s.id) === String(watchedSourceStoreId));
      if (matched) {
        return matched.available_quantity ?? matched.quantity ?? 0;
      }
    }
    return 0;
  }, [watchedSourceStoreId, product, sourceStore]);

  // Pre-fill source/destination store IDs on open
  useEffect(() => {
    if (isOpen && sourceStore) {
      const initialSourceId = String(sourceStore.store_id || sourceStore.id);
      reset({
        source_store_id: initialSourceId,
        target_store_id: '',
        quantity: '',
        remarks: '',
      });
      
      const filteredTargets = allLocationOptions.filter(s => String(s.id) !== initialSourceId);
      const defaultTarget = filteredTargets.find(s => String(s.id) === String(activeStoreId));
      if (defaultTarget) {
        setValue('target_store_id', String(defaultTarget.id));
      } else if (filteredTargets.length === 1) {
        setValue('target_store_id', String(filteredTargets[0].id));
      }
    }
  }, [isOpen, reset, sourceStore, activeStoreId, setValue, allLocationOptions]);

  if (!isOpen || !product || !sourceStore) return null;

  const handleCancel = () => {
    if (isPending) return;
    reset();
    onClose();
  };

  const onSubmit = async (data) => {
    const targetId = data.target_store_id;
    const sourceId = data.source_store_id;
    if (!targetId || !sourceId) {
      toast.error('Please select both source and destination.');
      return;
    }

    setIsPending(true);
    try {
      const fromStoreObj = allLocationOptions.find(s => String(s.id) === String(sourceId));
      const targetStore = allLocationOptions.find(s => String(s.id) === String(targetId));
      
      if (!fromStoreObj || !targetStore) {
        throw new Error('Invalid store selection');
      }
      
      const fromType = fromStoreObj.owner_type || 'STORE';
      const fromId = fromType === 'ADMIN' ? (user?.id || 0) : Number(fromStoreObj.id);
      
      const toType = targetStore.owner_type || 'STORE';
      const toId = toType === 'ADMIN' ? (user?.id || 0) : Number(targetStore.id);

      const payload = {
        from_owner_type: fromType,
        from_owner_id: fromId,
        to_owner_type: toType,
        to_owner_id: toId,
        product_id: product.product_id || product.id,
        quantity: Number(data.quantity),
        remarks: data.remarks || null,
      };

      await createTransferApi(payload);
      toast.success('Direct stock transfer recorded successfully.');
      onSuccess?.();
      handleCancel();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to complete direct stock transfer.');
    } finally {
      setIsPending(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1200] p-3 sm:p-4 animate-fade-in font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col border border-slate-100 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Direct Stock Transfer</h2>
              <p className="text-xs text-slate-500 mt-0.5">Move stock instantly (Auto-Approved).</p>
            </div>
          </div>
          <button type="button" onClick={handleCancel} disabled={isPending}
            className="p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-colors disabled:opacity-30">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5">
          {/* Source Stock info */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 flex gap-3 text-xs animate-fade-in">
            <Info className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="font-semibold text-slate-600 space-y-1">
              <p className="text-slate-800 text-sm font-bold">{product.product_name || product.name}</p>
              <p><span className="text-slate-400 font-medium">SKU:</span> {product.product_sku || product.sku || 'N/A'}</p>
              <p>
                <span className="text-slate-400 font-medium">From:</span>{' '}
                <span className="text-slate-800 font-bold">
                  {allLocationOptions.find(s => String(s.id) === String(watchedSourceStoreId))?.store_name || 'N/A'}
                </span>
              </p>
              <p>
                <span className="text-slate-400 font-medium">Source Stock:</span>{' '}
                <span className="text-emerald-600 font-bold">{currentSourceStock} units</span>
              </p>
            </div>
          </div>

          {/* Source Store Select */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Source Location (From) <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                {...register('source_store_id', { required: 'Source location is required' })}
                disabled={isPending}
                className="w-full px-4 py-2.5 bg-white border border-slate-350 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-semibold text-slate-800 text-sm transition-all cursor-pointer disabled:bg-slate-50 disabled:text-slate-450 appearance-none pr-10"
              >
                <option value="">-- Select Source Store --</option>
                {allLocationOptions.map(s => (
                  <option key={s.id} value={s.id}>{s.store_name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            {errors.source_store_id && <p className="mt-1 text-xs text-red-500 font-medium">{errors.source_store_id.message}</p>}
          </div>

          {/* Destination Store Select */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Destination Location (To) <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                {...register('target_store_id', { required: 'Destination is required' })}
                disabled={isPending}
                className="w-full px-4 py-2.5 bg-white border border-slate-350 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-semibold text-slate-800 text-sm transition-all cursor-pointer disabled:bg-slate-50 disabled:text-slate-450 appearance-none pr-10"
              >
                <option value="">-- Select Destination Store --</option>
                {targetStores.map(s => (
                  <option key={s.id} value={s.id}>{s.store_name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            {errors.target_store_id && <p className="mt-1 text-xs text-red-500 font-medium">{errors.target_store_id.message}</p>}
          </div>

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
              className="w-full px-4 py-2.5 bg-white border border-slate-350 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-semibold text-slate-800 text-sm transition-all disabled:bg-slate-50 disabled:text-slate-400"
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
              placeholder="E.g., Inter-store inventory rebalancing..."
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
              disabled={isPending}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              {isPending ? 'Transferring...' : 'Execute Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AdminDirectTransferModal;
