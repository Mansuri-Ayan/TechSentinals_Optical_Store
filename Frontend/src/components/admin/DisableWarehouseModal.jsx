import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2, Store, ArrowRight, X, CheckCircle, Package } from 'lucide-react';
import { toast } from 'react-toastify';
import { checkWarehouseStockApi, disableWarehouseApi } from '../../api/stores/store.api';

const DisableWarehouseModal = ({ isOpen, onClose, stores = [], onSuccess }) => {
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [stockInfo, setStockInfo] = useState({ has_stock: false, total_quantity: 0, batch_count: 0 });
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Active non-deleted stores
  const activeStores = stores.filter((s) => s.is_active && !s.deleted_at);
  const mainStore = activeStores.find((s) => s.is_main_store) || activeStores[0];

  useEffect(() => {
    if (isOpen) {
      setLoadingCheck(true);
      if (mainStore) {
        setSelectedStoreId(String(mainStore.id));
      } else if (activeStores.length > 0) {
        setSelectedStoreId(String(activeStores[0].id));
      }

      checkWarehouseStockApi()
        .then((data) => {
          setStockInfo(data);
        })
        .catch((err) => {
          console.error('Failed to check warehouse stock:', err);
          toast.error('Failed to verify warehouse stock levels');
        })
        .finally(() => {
          setLoadingCheck(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStoreId) {
      toast.error('Please select a destination store.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await disableWarehouseApi(Number(selectedStoreId));
      toast.success(res.message || 'Warehouse disabled successfully.');
      if (onSuccess) {
        onSuccess(Number(selectedStoreId));
      }
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to disable warehouse';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Disable Central Warehouse</h2>
              <p className="text-xs text-slate-500 font-medium">Switch to Main Store inventory model</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loadingCheck ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
            <p className="text-sm font-semibold">Checking warehouse stock balance...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {stockInfo.has_stock ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                  <Package className="w-4 h-4 text-amber-600" />
                  Active Warehouse Inventory Found
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Your dedicated warehouse currently holds{' '}
                  <strong className="font-bold text-amber-900">{stockInfo.total_quantity} physical units</strong> across{' '}
                  <strong className="font-bold text-amber-900">{stockInfo.batch_count} product batches</strong>.
                </p>
                <p className="text-xs text-amber-700 leading-relaxed font-medium">
                  To disable the warehouse, all current stock will automatically be transferred via FIFO to your designated destination store.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Warehouse Stock is Clear (0 Units)
                </div>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  No active stock is stored in the Central Warehouse. Disabling the warehouse will immediately switch operations to your Main Store.
                </p>
              </div>
            )}

            {/* Destination Store Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {stockInfo.has_stock ? 'Transfer Stock & Designate As Central Hub' : 'Designated Central Hub Store'}
              </label>
              <div className="relative">
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  disabled={submitting}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-slate-900 text-sm appearance-none"
                >
                  {activeStores.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.store_name} ({st.store_code}) {st.is_main_store ? '★ [Current Main Store]' : ''}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <Store className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                The Warehouse page and transfer workflows will continue working seamlessly using this store's stock.
              </p>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedStoreId}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-amber-600/20 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {stockInfo.has_stock ? 'Transferring Stock & Disabling...' : 'Disabling Warehouse...'}
                  </>
                ) : (
                  <>
                    {stockInfo.has_stock ? 'Transfer & Disable Warehouse' : 'Disable Warehouse'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};

export default DisableWarehouseModal;
