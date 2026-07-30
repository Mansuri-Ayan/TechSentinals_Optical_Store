import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { X, ArrowRightLeft, Loader2, Info, ChevronDown, Lock } from 'lucide-react';
import { useStoreStore, useAuthStore } from '../../store/store';
import { useTransactions } from '../../hooks/useTransactions';
import { useHasPermission } from '../../hooks/usePermissions';

const AdminRequestStockModal = ({ isOpen, onClose, product, sourceStore, activeStoreId, onSuccess }) => {
  const { stores } = useStoreStore();
  const { user } = useAuthStore();
  const { createAdminRequestAsync, isCreatingAdminRequest } = useTransactions(null, {}, false);
  const canCreateRequest = useHasPermission('inventory:create') || useHasPermission('transactions:create') || ['admin', 'super_admin', 'manager', 'worker', 'optician'].includes(user?.role);

  // Destination option: Only branch stores (Excludes Admin Warehouse 'admin' as destination)
  const destinationStoreOptions = useMemo(() => {
    return stores
      .filter(s => s.id !== 'admin' && s.store_name !== 'All Store' && s.name !== 'All Store')
      .map(s => ({
        id: s.id,
        store_name: s.store_name || s.name,
        owner_type: 'STORE'
      }));
  }, [stores]);

  // All valid source options (Warehouse + Stores)
  const allLocationOptions = useMemo(() => {
    return stores.map(s => {
      if (s.id === 'admin') {
        return { id: 'admin', store_name: 'Admin Warehouse', owner_type: 'ADMIN' };
      }
      return { id: s.id, owner_type: 'STORE', store_name: s.store_name || s.name };
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

  // Filter out the fixed source store from the destination store options so they don't request to itself
  const filteredDestinationOptions = useMemo(() => {
    return destinationStoreOptions.filter(s => String(s.id) !== String(watchedSourceStoreId));
  }, [destinationStoreOptions, watchedSourceStoreId]);

  // Compute available stock limit dynamically matching fixed source store
  const currentSourceStock = useMemo(() => {
    if (!watchedSourceStoreId || !product) return 0;
    
    // Check if the selected source matches the initial sourceStore passed in
    const initialSourceId = sourceStore ? String(sourceStore.store_id || sourceStore.id || '') : '';
    const isWarehouseSource = sourceStore?.owner_type === 'ADMIN' || initialSourceId === '0' || initialSourceId === 'admin';
    const isMatchedInitial = (watchedSourceStoreId === 'admin' && isWarehouseSource) || (String(watchedSourceStoreId) === initialSourceId);
    
    if (isMatchedInitial && sourceStore) {
      return sourceStore.available_quantity ?? sourceStore.quantity ?? 0;
    }
    
    // Check in product's other_stocks list
    if (product.other_stocks) {
      const matched = product.other_stocks.find(s => {
        const sId = String(s.store_id || s.id || '');
        const isWh = s.owner_type === 'ADMIN' || sId === '0' || sId === 'admin';
        return (watchedSourceStoreId === 'admin' && isWh) || (String(watchedSourceStoreId) === sId);
      });
      if (matched) {
        return matched.available_quantity ?? matched.quantity ?? 0;
      }
    }
    return 0;
  }, [watchedSourceStoreId, product, sourceStore]);

  // Pre-fill fixed source store and target (destination) store IDs on open
  useEffect(() => {
    if (isOpen && product) {
      let defaultSourceId = '';
      if (sourceStore) {
        const sourceIdStr = String(sourceStore.store_id || sourceStore.id || '');
        if (sourceStore.owner_type === 'ADMIN' || sourceIdStr === '0' || sourceIdStr === 'admin') {
          defaultSourceId = 'admin';
        } else {
          defaultSourceId = sourceIdStr;
        }
      } else {
        const whOption = allLocationOptions.find(s => s.owner_type === 'ADMIN');
        if (whOption) {
          defaultSourceId = String(whOption.id);
        } else if (allLocationOptions.length > 0) {
          defaultSourceId = String(allLocationOptions[0].id);
        }
      }

      let defaultTargetId = '';
      if (activeStoreId && activeStoreId !== 'admin' && String(activeStoreId) !== defaultSourceId) {
        defaultTargetId = String(activeStoreId);
      } else if (product.owner_id && product.owner_type === 'STORE' && String(product.owner_id) !== defaultSourceId) {
        defaultTargetId = String(product.owner_id);
      } else {
        const validTarget = destinationStoreOptions.find(s => String(s.id) !== defaultSourceId);
        if (validTarget) {
          defaultTargetId = String(validTarget.id);
        }
      }

      reset({
        source_store_id: defaultSourceId,
        target_store_id: defaultTargetId,
        quantity: '',
        remarks: '',
      });
    }
  }, [isOpen, product, sourceStore, activeStoreId, reset, destinationStoreOptions, allLocationOptions]);

  if (!isOpen || !product) return null;

  const handleCancel = () => {
    if (isCreatingAdminRequest) return;
    reset();
    onClose();
  };

  const onSubmit = async (data) => {
    if (!canCreateRequest) {
      toast.error('Permission denied: You do not have permission to submit stock requests.');
      return;
    }

    const targetId = data.target_store_id;
    const sourceId = data.source_store_id;
    if (!targetId || !sourceId) {
      toast.error('Please select a destination store.');
      return;
    }

    try {
      const fromStoreObj = allLocationOptions.find(s => String(s.id) === String(sourceId));
      const targetStore = destinationStoreOptions.find(s => String(s.id) === String(targetId));
      
      if (!fromStoreObj || !targetStore) {
        throw new Error('Invalid store selection');
      }
      
      const fromType = fromStoreObj.owner_type || 'STORE';
      const fromId = fromType === 'ADMIN' ? 0 : Number(fromStoreObj.id);
      
      const toType = 'STORE';
      const toId = Number(targetStore.id);

      const payload = {
        from_owner_type: fromType,
        from_owner_id: fromId,
        to_owner_type: toType,
        to_owner_id: toId,
        product_id: product.product_id || product.id,
        quantity: Number(data.quantity),
        remarks: data.remarks || null,
      };

      await createAdminRequestAsync(payload);
      onSuccess?.();
      handleCancel();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to complete stock request.');
    }
  };

  const currentSourceLocationName = allLocationOptions.find(s => String(s.id) === String(watchedSourceStoreId))?.store_name || 'Admin Warehouse';

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
              <p className="text-xs text-slate-500 mt-0.5">Submit a pending stock request for destination store approval.</p>
            </div>
          </div>
          <button type="button" onClick={handleCancel} disabled={isCreatingAdminRequest}
            className="p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-colors disabled:opacity-30">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5">
          {/* Selected Product info */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 flex gap-3 text-xs animate-fade-in">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="font-semibold text-slate-650 space-y-1">
              <p className="text-slate-800 text-sm font-bold">{product.product_name || product.name}</p>
              <p><span className="text-slate-400 font-medium">SKU:</span> {product.product_sku || product.sku || 'N/A'}</p>
              <p>
                <span className="text-slate-400 font-medium">Fixed Source Location:</span>{' '}
                <span className="text-slate-800 font-bold">{currentSourceLocationName}</span>
              </p>
              <p>
                <span className="text-slate-400 font-medium">Source Stock:</span>{' '}
                <span className="text-emerald-600 font-bold">{currentSourceStock} units</span>
              </p>
            </div>
          </div>

          {/* Fixed Source Location Display */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Source Location (From)</span>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" /> Fixed
              </span>
            </label>
            <div className="w-full px-4 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm flex items-center justify-between cursor-not-allowed">
              <span>{currentSourceLocationName}</span>
              <span className="text-xs font-bold text-emerald-600">({currentSourceStock} units)</span>
            </div>
            <input type="hidden" {...register('source_store_id', { required: true })} />
          </div>

          {/* Destination Store Select */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Destination Store (To) <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                {...register('target_store_id', { required: 'Destination is required' })}
                disabled={isCreatingAdminRequest || !canCreateRequest}
                className="w-full px-4 py-2.5 bg-white border border-slate-350 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-semibold text-slate-808 text-sm transition-all cursor-pointer disabled:bg-slate-50 disabled:text-slate-450 appearance-none pr-10"
              >
                <option value="">-- Select Destination Store --</option>
                {filteredDestinationOptions.map(s => (
                  <option key={s.id} value={s.id}>{s.store_name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            {errors.target_store_id && <p className="mt-1 text-xs text-red-500 font-medium">{errors.target_store_id.message}</p>}
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
              disabled={isCreatingAdminRequest}
              placeholder="e.g. 5"
              className="w-full px-4 py-2.5 bg-white border border-slate-350 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-semibold text-slate-808 text-sm transition-all disabled:bg-slate-50 disabled:text-slate-400"
            />
            {errors.quantity && <p className="mt-1 text-xs text-red-500 font-medium">{errors.quantity.message}</p>}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Remarks / Reason</label>
            <textarea
              {...register('remarks')}
              rows={2.5}
              disabled={isCreatingAdminRequest}
              placeholder="E.g., Low stock alert, upcoming customer order..."
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-semibold text-slate-850 text-sm transition-all resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-3 border-t border-slate-100 flex-shrink-0">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isCreatingAdminRequest}
              className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-750 hover:bg-slate-50 hover:border-slate-300 rounded-xl font-bold transition-all text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingAdminRequest}
              className="flex-1 py-2.5 bg-[#0A0F1F] text-white hover:bg-slate-805 rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingAdminRequest && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              {isCreatingAdminRequest ? 'Sending Request...' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AdminRequestStockModal;
