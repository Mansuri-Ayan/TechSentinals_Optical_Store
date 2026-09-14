import React, { useState, useEffect } from 'react';
import { Clock, RotateCcw, Check, Loader2 } from 'lucide-react';
import {
  useProductAgingOverride,
  useUpsertProductAgingOverride,
  useDeleteProductAgingOverride,
  useInventoryConfig,
} from '../../hooks/useInventoryConfig';
import AgingTimelineEditor from './AgingTimelineEditor';

const ProductAgingOverride = ({ productId }) => {
  const { data: globalConfig } = useInventoryConfig();
  const { data: override, isLoading } = useProductAgingOverride(productId);
  const upsertMutation = useUpsertProductAgingOverride();
  const deleteMutation = useDeleteProductAgingOverride();

  const [useCustom, setUseCustom] = useState(false);
  const [formData, setFormData] = useState({
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
    if (override) {
      setUseCustom(true);
      setFormData({
        aging_enabled: override.aging_enabled ?? true,
        normal_period_months: override.normal_period_months ?? globalConfig?.normal_period_months ?? 6,
        stage_1_months: override.stage_1_months ?? globalConfig?.stage_1_months ?? 3,
        stage_1_discount: override.stage_1_discount ?? globalConfig?.stage_1_discount ?? 10.0,
        stage_2_months: override.stage_2_months ?? globalConfig?.stage_2_months ?? 3,
        stage_2_discount: override.stage_2_discount ?? globalConfig?.stage_2_discount ?? 20.0,
        stage_3_months: override.stage_3_months ?? globalConfig?.stage_3_months ?? 3,
        stage_3_discount: override.stage_3_discount ?? globalConfig?.stage_3_discount ?? 50.0,
      });
    } else {
      setUseCustom(false);
      if (globalConfig) {
        setFormData({
          aging_enabled: globalConfig.aging_enabled ?? true,
          normal_period_months: globalConfig.normal_period_months ?? 6,
          stage_1_months: globalConfig.stage_1_months ?? 3,
          stage_1_discount: globalConfig.stage_1_discount ?? 10.0,
          stage_2_months: globalConfig.stage_2_months ?? 3,
          stage_2_discount: globalConfig.stage_2_discount ?? 20.0,
          stage_3_months: globalConfig.stage_3_months ?? 3,
          stage_3_discount: globalConfig.stage_3_discount ?? 50.0,
        });
      }
    }
  }, [override, globalConfig]);

  if (!productId) return null;

  const handleSave = async () => {
    await upsertMutation.mutateAsync({
      productId,
      payload: formData,
    });
  };

  const handleReset = async () => {
    await deleteMutation.mutateAsync(productId);
    setUseCustom(false);
  };

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Stock Aging Override
          </h4>
        </div>
        <div className="flex items-center gap-3">
          {useCustom ? (
            <button
              type="button"
              onClick={handleReset}
              disabled={deleteMutation.isPending}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Admin Default
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setUseCustom(true)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              + Customize for this product
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-4 text-center text-xs text-slate-400">Loading aging configuration...</div>
      ) : !useCustom ? (
        <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-600">
          This product is using the <strong>Admin Global Default Timeline</strong> (Normal: {globalConfig?.normal_period_months ?? 6}m, Stage 1: {globalConfig?.stage_1_discount ?? 10}% off, Stage 2: {globalConfig?.stage_2_discount ?? 20}% off, Stage 3: {globalConfig?.stage_3_discount ?? 50}% off).
        </div>
      ) : (
        <div className="space-y-4 pt-2">
          <AgingTimelineEditor
            values={formData}
            onChange={(newVals) => setFormData({ ...formData, ...newVals })}
          />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={upsertMutation.isPending}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {upsertMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Save Product Aging Override
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductAgingOverride;
