import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Crown, Store, ArrowRight, AlertTriangle, CheckCircle, X, Loader2, Info } from 'lucide-react';
import { toast } from 'react-toastify';
import { setMainStoreApi } from '../../api/stores/store.api';

const SwitchMainStoreModal = ({
  isOpen,
  onClose,
  allStores = [],
  currentMainStore,
  targetStore: initialTargetStore = null,
  isWarehouseDisabled = false,
  onSuccess,
}) => {
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeStores = (allStores || []).filter(
    (s) => s.is_active && !s.deleted_at && s.id !== 'admin' && s.store_name !== 'All Store' && s.name !== 'All Store'
  );

  useEffect(() => {
    if (isOpen) {
      if (initialTargetStore) {
        setSelectedStoreId(String(initialTargetStore.id));
      } else {
        const otherStore = activeStores.find((s) => !s.is_main_store);
        setSelectedStoreId(otherStore ? String(otherStore.id) : '');
      }
    }
  }, [isOpen, initialTargetStore, allStores]);

  if (!isOpen) return null;

  const chosenStore = activeStores.find((s) => String(s.id) === String(selectedStoreId));
  const isAlreadyMain = chosenStore?.is_main_store;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStoreId) {
      toast.error('Please select a store to designate as Main Store.');
      return;
    }
    if (isAlreadyMain) {
      toast.info(`${chosenStore.store_name || chosenStore.name} is already the Main Store.`);
      onClose();
      return;
    }

    setSubmitting(true);
    try {
      const updated = await setMainStoreApi(Number(selectedStoreId));
      toast.success(`${updated.store_name || chosenStore.store_name || 'Store'} is now designated as the Main Store.`);
      if (onSuccess) {
        onSuccess(updated);
      }
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to designate Main Store';
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
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
              <Crown className="w-5 h-5 fill-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {initialTargetStore ? 'Designate Main Store' : 'Switch Main Store'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Designate your primary store identity & central hub
              </p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Target store pre-selected mode */}
          {initialTargetStore ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <span>Store Designation Change</span>
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  {/* Current */}
                  <div className="flex-1 bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">CURRENT MAIN</span>
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {currentMainStore?.store_name || currentMainStore?.name || 'None'}
                    </p>
                    <span className="text-[10px] font-mono text-slate-400">
                      {currentMainStore?.store_code || currentMainStore?.code || ''}
                    </span>
                  </div>

                  <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0" />

                  {/* New Target */}
                  <div className="flex-1 bg-amber-50/80 p-3 rounded-lg border border-amber-200">
                    <span className="text-[10px] font-bold text-amber-700 block mb-1">NEW MAIN STORE</span>
                    <p className="text-sm font-bold text-amber-900 truncate">
                      {initialTargetStore.store_name || initialTargetStore.name}
                    </p>
                    <span className="text-[10px] font-mono text-amber-600">
                      {initialTargetStore.store_code || initialTargetStore.code || ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200/80 flex items-start gap-2.5 text-xs text-blue-800">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Only one store under your account can be the Main Store at a time. The previous Main Store will automatically revert to a standard branch store.
                </p>
              </div>
            </div>
          ) : (
            /* Select from list mode */
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Select New Main Store:
              </label>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {activeStores.map((st) => {
                  const isCurrent = st.is_main_store;
                  const isSelected = String(st.id) === String(selectedStoreId);
                  return (
                    <div
                      key={st.id}
                      onClick={() => !isCurrent && setSelectedStoreId(String(st.id))}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-slate-50/80 border-slate-200 opacity-70 cursor-not-allowed'
                          : isSelected
                            ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20 cursor-pointer shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="radio"
                          name="mainStoreSelect"
                          checked={isSelected}
                          disabled={isCurrent}
                          onChange={() => setSelectedStoreId(String(st.id))}
                          className="w-4 h-4 text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {st.store_name || st.name}
                            </p>
                            <span className="text-[10px] font-mono text-slate-400">
                              {st.store_code || st.code || ''}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate">
                            {st.city ? `${st.city}, ${st.state}` : st.address || 'Active Store'}
                          </p>
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Crown className="w-3 h-3 fill-amber-600 text-amber-600" />
                          Current Main
                        </span>
                      ) : isSelected ? (
                        <span className="text-xs font-bold text-amber-700">Selected</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Central Hub Warning if Warehouse Disabled */}
          {isWarehouseDisabled && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/90 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <p className="font-bold mb-1">Central Warehouse Notice</p>
                <p>
                  Because the dedicated warehouse is disabled, <span className="font-semibold">{chosenStore ? (chosenStore.store_name || chosenStore.name) : 'the new Main Store'}</span> will immediately take over as your <span className="font-bold">Central Stock Hub</span> for all supplier orders and branch stock requests.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedStoreId || isAlreadyMain}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4 fill-white" />
                  Confirm & Set as Main Store
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default SwitchMainStoreModal;
