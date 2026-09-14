import React from 'react';

const AgingTimelineEditor = ({ values, onChange, disabled = false }) => {
  const normalMonths = Number(values.normal_period_months ?? 6);
  const s1Months = Number(values.stage_1_months ?? 3);
  const s1Discount = Number(values.stage_1_discount ?? 10);
  const s2Months = Number(values.stage_2_months ?? 3);
  const s2Discount = Number(values.stage_2_discount ?? 20);
  const s3Months = Number(values.stage_3_months ?? 3);
  const s3Discount = Number(values.stage_3_discount ?? 50);

  const t1 = normalMonths;
  const t2 = t1 + s1Months;
  const t3 = t2 + s2Months;
  const t4 = t3 + s3Months;

  const handleChange = (field, val) => {
    const num = parseFloat(val);
    onChange({
      ...values,
      [field]: isNaN(num) ? 0 : num,
    });
  };

  return (
    <div className="space-y-6">
      {/* Visual Timeline Bar */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Timeline Visualizer
        </h4>
        <div className="flex rounded-lg overflow-hidden h-8 text-xs font-bold text-white shadow-inner">
          <div
            style={{ flexGrow: Math.max(normalMonths, 1) }}
            className="bg-emerald-500 flex items-center justify-center transition-all"
            title={`Normal Period: 0 to ${t1} months`}
          >
            Normal ({t1}m)
          </div>
          <div
            style={{ flexGrow: Math.max(s1Months, 1) }}
            className="bg-amber-500 flex items-center justify-center transition-all"
            title={`Stage 1: ${t1} to ${t2} months (${s1Discount}% off)`}
          >
            {s1Discount}% ({s1Months}m)
          </div>
          <div
            style={{ flexGrow: Math.max(s2Months, 1) }}
            className="bg-orange-500 flex items-center justify-center transition-all"
            title={`Stage 2: ${t2} to ${t3} months (${s2Discount}% off)`}
          >
            {s2Discount}% ({s2Months}m)
          </div>
          <div
            style={{ flexGrow: Math.max(s3Months, 1) }}
            className="bg-rose-500 flex items-center justify-center transition-all"
            title={`Stage 3: ${t3} to ${t4} months (${s3Discount}% off)`}
          >
            {s3Discount}% ({s3Months}m)
          </div>
          <div
            style={{ flexGrow: 2 }}
            className="bg-slate-700 flex items-center justify-center transition-all"
            title={`Dead Stock: After ${t4} months`}
          >
            Dead Stock (&gt;{t4}m)
          </div>
        </div>

        <div className="flex justify-between text-[11px] text-slate-500 mt-2 px-1 font-medium">
          <span>0m (Purchased)</span>
          <span>{t1}m</span>
          <span>{t2}m</span>
          <span>{t3}m</span>
          <span>{t4}m+ (Dead Stock)</span>
        </div>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Normal Selling Period */}
        <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Normal Period
          </div>
          <div>
            <label className="block text-[11px] text-slate-600 font-medium mb-1">Duration (Months)</label>
            <input
              type="number"
              min="1"
              disabled={disabled}
              value={normalMonths}
              onChange={(e) => handleChange('normal_period_months', e.target.value)}
              className="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
            />
          </div>
          <p className="text-[10px] text-slate-500">Regular price (0% discount)</p>
        </div>

        {/* Stage 1 */}
        <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2">
          <div className="flex items-center gap-1.5 text-amber-800 font-semibold text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Stage 1 Discount
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-slate-600 font-medium mb-1">Months</label>
              <input
                type="number"
                min="1"
                disabled={disabled}
                value={s1Months}
                onChange={(e) => handleChange('stage_1_months', e.target.value)}
                className="w-full text-xs font-semibold px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 font-medium mb-1">Discount %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                disabled={disabled}
                value={s1Discount}
                onChange={(e) => handleChange('stage_1_discount', e.target.value)}
                className="w-full text-xs font-semibold px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-500">Applies from Month {t1} to {t2}</p>
        </div>

        {/* Stage 2 */}
        <div className="p-3 bg-orange-50/50 border border-orange-200 rounded-xl space-y-2">
          <div className="flex items-center gap-1.5 text-orange-800 font-semibold text-xs">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            Stage 2 Discount
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-slate-600 font-medium mb-1">Months</label>
              <input
                type="number"
                min="1"
                disabled={disabled}
                value={s2Months}
                onChange={(e) => handleChange('stage_2_months', e.target.value)}
                className="w-full text-xs font-semibold px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 font-medium mb-1">Discount %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                disabled={disabled}
                value={s2Discount}
                onChange={(e) => handleChange('stage_2_discount', e.target.value)}
                className="w-full text-xs font-semibold px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-slate-100"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-500">Applies from Month {t2} to {t3}</p>
        </div>

        {/* Stage 3 */}
        <div className="p-3 bg-rose-50/50 border border-rose-200 rounded-xl space-y-2">
          <div className="flex items-center gap-1.5 text-rose-800 font-semibold text-xs">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Stage 3 Discount
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-slate-600 font-medium mb-1">Months</label>
              <input
                type="number"
                min="1"
                disabled={disabled}
                value={s3Months}
                onChange={(e) => handleChange('stage_3_months', e.target.value)}
                className="w-full text-xs font-semibold px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 font-medium mb-1">Discount %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                disabled={disabled}
                value={s3Discount}
                onChange={(e) => handleChange('stage_3_discount', e.target.value)}
                className="w-full text-xs font-semibold px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:bg-slate-100"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-500">Applies from Month {t3} to {t4}</p>
        </div>
      </div>
    </div>
  );
};

export default AgingTimelineEditor;
