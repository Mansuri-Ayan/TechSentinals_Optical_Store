import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Settings, Play, Percent, Clock, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import {
  useInventoryConfig,
  useUpdateInventoryConfig,
  useRunAgingEvaluation,
  useAgingSummary,
} from '../../hooks/useInventoryConfig';
import AgingTimelineEditor from './AgingTimelineEditor';

const InventoryConfigPanel = ({ isOpen, onClose }) => {
  const { data: config, isLoading, error } = useInventoryConfig();
  const updateMutation = useUpdateInventoryConfig();
  const runEvaluationMutation = useRunAgingEvaluation();
  const { data: summary } = useAgingSummary();

  const [formData, setFormData] = useState({
    default_gst_percent: 18.0,
    aging_enabled: true,
    normal_period_months: 6,
    stage_1_months: 3,
    stage_1_discount: 10.0,
    stage_2_months: 3,
    stage_2_discount: 20.0,
    stage_3_months: 3,
    stage_3_discount: 50.0,
  });

  useEffect(() => {
    if (config) {
      setFormData({
        default_gst_percent: config.default_gst_percent ?? 18.0,
        aging_enabled: config.aging_enabled ?? true,
        normal_period_months: config.normal_period_months ?? 6,
        stage_1_months: config.stage_1_months ?? 3,
        stage_1_discount: config.stage_1_discount ?? 10.0,
        stage_2_months: config.stage_2_months ?? 3,
        stage_2_discount: config.stage_2_discount ?? 20.0,
        stage_3_months: config.stage_3_months ?? 3,
        stage_3_discount: config.stage_3_discount ?? 50.0,
      });
    }
  }, [config]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await updateMutation.mutateAsync(formData);
    onClose();
  };

  const handleRunEvaluation = async () => {
    await runEvaluationMutation.mutateAsync();
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Inventory & Stock Aging Settings</h2>
              <p className="text-xs text-slate-500">Configure global GST rates, aging timelines, and automatic discounts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
              <p className="text-sm font-medium">Loading inventory configurations...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>Failed to load configuration. Please check your permissions or network connection.</p>
            </div>
          ) : (
            <form id="config-form" onSubmit={handleSubmit} className="space-y-8">
              {/* Batch Summary Stats Bar */}
              {summary && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                    Current Aging Batches Breakdown
                  </h3>
                  <div className="grid grid-cols-5 gap-3 text-center">
                    <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg">
                      <span className="text-[10px] text-emerald-700 font-semibold uppercase block">Normal</span>
                      <span className="text-lg font-extrabold text-emerald-900">{summary.normal ?? 0}</span>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
                      <span className="text-[10px] text-amber-700 font-semibold uppercase block">Stage 1</span>
                      <span className="text-lg font-extrabold text-amber-900">{summary.stage_1 ?? 0}</span>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 p-2.5 rounded-lg">
                      <span className="text-[10px] text-orange-700 font-semibold uppercase block">Stage 2</span>
                      <span className="text-lg font-extrabold text-orange-900">{summary.stage_2 ?? 0}</span>
                    </div>
                    <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
                      <span className="text-[10px] text-rose-700 font-semibold uppercase block">Stage 3</span>
                      <span className="text-lg font-extrabold text-rose-900">{summary.stage_3 ?? 0}</span>
                    </div>
                    <div className="bg-slate-100 border border-slate-300 p-2.5 rounded-lg">
                      <span className="text-[10px] text-slate-700 font-semibold uppercase block">Dead Stock</span>
                      <span className="text-lg font-extrabold text-slate-900">{summary.dead_stock ?? 0}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 1: Default GST Rate */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Percent className="w-4 h-4 text-indigo-600" />
                  Default GST Configuration
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-md">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default GST Rate (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.default_gst_percent}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          default_gst_percent: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full text-sm font-semibold px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Used as the default tax rate for new purchase orders and sales when no per-product override is set.
                  </p>
                </div>
              </div>

              {/* Section 2: Stock Aging & Expiry Timeline */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    Stock Aging & Discount Timeline
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.aging_enabled}
                      onChange={(e) =>
                        setFormData({ ...formData, aging_enabled: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    <span className="ml-2 text-xs font-semibold text-slate-700">
                      {formData.aging_enabled ? 'Aging Active' : 'Aging Disabled'}
                    </span>
                  </label>
                </div>

                <AgingTimelineEditor
                  values={formData}
                  onChange={(newTimeline) => setFormData({ ...formData, ...newTimeline })}
                  disabled={!formData.aging_enabled}
                />
              </div>

              {/* Section 3: Manual Trigger */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between bg-amber-50/60 p-4 rounded-xl border border-amber-200">
                <div>
                  <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 text-amber-600" />
                    Manual Evaluation Trigger
                  </h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    The background worker automatically runs daily at midnight. Click below to recalculate all inventory batch stages immediately.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunEvaluation}
                  disabled={runEvaluationMutation.isPending}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
                >
                  {runEvaluationMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Evaluating...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Run Evaluation Now
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="config-form"
            disabled={updateMutation.isPending || isLoading}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-200 flex items-center gap-2 disabled:opacity-50"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InventoryConfigPanel;
