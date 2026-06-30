import React, { useMemo } from 'react';

// Formatter helper for Indian Rupees
const formatRupee = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
};

/* ─────────────────────────────────────────────────────────
   1. LINE CHART (SVG-based line, area gradient, tooltips)
   ───────────────────────────────────────────────────────── */
export const LineChart = ({
  data = [],
  strokeColor = '#10B981', // emerald
  gradientColor = '#10B981',
  height = 160
}) => {
  const maxVal = useMemo(() => Math.max(...data.map(d => Number(d.value || 0)), 1), [data]);

  const pathD = useMemo(() => {
    if (!data || data.length === 0) return '';
    return data.map((d, i) => {
      const val = Number(d.value || 0);
      const x = 40 + i * (250 / Math.max(1, data.length - 1));
      const y = 135 - (val / maxVal) * 105;
      return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
    }).join(' ');
  }, [data, maxVal]);

  const areaPath = useMemo(() => {
    if (!pathD || data.length === 0) return '';
    const firstX = 40;
    const lastX = 40 + (data.length - 1) * (250 / Math.max(1, data.length - 1));
    return `${pathD} L ${lastX},135 L ${firstX},135 Z`;
  }, [pathD, data]);

  return (
    <div className="w-full h-full min-h-[220px] pt-4 px-2 select-none relative">
      <svg viewBox="0 0 300 160" className="w-full h-full">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradientColor} stopOpacity="0.12" />
            <stop offset="100%" stopColor={gradientColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid Lines */}
        <line x1="40" y1="30" x2="290" y2="30" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1="65" x2="290" y2="65" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1="100" x2="290" y2="100" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1="135" x2="290" y2="135" stroke="#E2E8F0" strokeWidth="1.25" />

        {/* Area fill */}
        {areaPath && <path d={areaPath} fill="url(#lineGrad)" className="transition-all duration-300" />}

        {/* Line stroke */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
        )}

        {/* Points & Interactive Tooltips */}
        {data.map((d, i) => {
          const val = Number(d.value || 0);
          const x = 40 + i * (250 / Math.max(1, data.length - 1));
          const y = 135 - (val / maxVal) * 105;
          return (
            <g key={i} className="group cursor-pointer">
              <circle
                cx={x}
                cy={y}
                r="3.5"
                fill="#FFFFFF"
                stroke={strokeColor}
                strokeWidth="1.75"
                className="transition-all duration-200 group-hover:r-5 group-hover:stroke-emerald-600"
              />
              {/* Tooltip background */}
              <rect
                x={x - 24}
                y={y - 25}
                width="48"
                height="15"
                rx="4"
                fill="#0A0F1F"
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
              />
              {/* Tooltip value */}
              <text
                x={x}
                y={y - 15}
                textAnchor="middle"
                className="text-[7.5px] font-bold fill-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
              >
                {val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`}
              </text>
              {/* Axis Label */}
              <text
                x={x}
                y="148"
                textAnchor="middle"
                className="text-[8px] font-extrabold fill-slate-400 pointer-events-none"
              >
                {d.label}
              </text>
              <title>{`${d.label}: ${formatRupee(val)}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   2. DONUT CHART (SVG-based radial circle segment)
   ───────────────────────────────────────────────────────── */
export const DonutChart = ({
  data = [],
  totalLabel = 'Total'
}) => {
  const totalVal = useMemo(() => data.reduce((acc, d) => acc + d.value, 0), [data]);

  // Compute percentage positions
  const slices = useMemo(() => {
    let accumulatedPercent = 0;
    return data.map(d => {
      const percentage = totalVal > 0 ? (d.value / totalVal) * 100 : 0;
      const strokeLength = (percentage / 100) * 314.16;
      const strokeOffset = 314.16 - strokeLength + accumulatedPercent;
      accumulatedPercent -= strokeLength;
      return {
        ...d,
        percentage,
        strokeLength,
        strokeOffset
      };
    });
  }, [data, totalVal]);

  return (
    <div className="relative w-full flex flex-col sm:flex-row items-center justify-around gap-6 py-4 px-2">
      <div className="relative w-36 h-36 flex-shrink-0 select-none">
        <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90">
          {/* Base circle background */}
          <circle cx="70" cy="70" r="50" fill="transparent" stroke="#F8FAFC" strokeWidth="12" />

          {slices.map((slice, idx) => (
            <circle
              key={idx}
              cx="70"
              cy="70"
              r="50"
              fill="transparent"
              stroke={slice.color}
              strokeWidth="12"
              strokeDasharray={`${slice.strokeLength} 314.16`}
              strokeDashoffset={slice.strokeOffset}
              className="transition-all duration-300 cursor-pointer hover:stroke-[14px]"
              style={{ transformOrigin: 'center' }}
            >
              <title>{`${slice.name}: ${slice.value} (${Math.round(slice.percentage)}%)`}</title>
            </circle>
          ))}
        </svg>
        {/* Core Center values */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">{totalLabel}</span>
          <span className="text-lg font-black text-slate-800 leading-none mt-0.5">{totalVal}</span>
        </div>
      </div>

      {/* Legends list */}
      <div className="flex flex-col gap-2 text-xs text-slate-600 w-full max-w-[180px]">
        {slices.map((slice, idx) => (
          <div key={idx} className="flex items-center justify-between gap-2 bg-slate-50/50 px-3 py-2 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="font-bold text-slate-550 truncate text-[10px] sm:text-xs">{slice.name}</span>
            </div>
            <span className="font-extrabold text-[10px] sm:text-xs text-slate-900 ml-auto">
              {slice.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   3. BAR CHART (Rounded vertical columns)
   ───────────────────────────────────────────────────────── */
export const BarChart = ({
  data = [],
  maxValOverride,
  height = 160
}) => {
  const maxVal = useMemo(() => {
    if (maxValOverride) return maxValOverride;
    return Math.max(...data.map(d => d.value), 1);
  }, [data, maxValOverride]);

  return (
    <div className="w-full h-full min-h-[220px] pt-4 px-2 select-none relative">
      <svg viewBox="0 0 300 160" className="w-full h-full">
        {/* Grid lines */}
        <line x1="40" y1="20" x2="290" y2="20" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1="60" x2="290" y2="60" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1="100" x2="290" y2="100" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="40" y1="130" x2="290" y2="130" stroke="#E2E8F0" strokeWidth="1.25" />

        {data.map((d, i) => {
          const barWidth = 22;
          const spacing = (250 - (data.length * barWidth)) / (data.length + 1);
          const x = 40 + spacing + i * (barWidth + spacing);
          const heightVal = (d.value / maxVal) * 105;
          const y = 130 - heightVal;

          return (
            <g key={i} className="group cursor-pointer">
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(2, heightVal)}
                rx="4"
                fill={d.color || '#3B82F6'}
                className="opacity-90 hover:opacity-100 transition-all duration-300"
              />
              {/* Value display */}
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                className="text-[7.5px] font-extrabold fill-slate-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
              >
                {d.value >= 1000 ? `₹${(d.value / 1000).toFixed(0)}k` : `₹${d.value}`}
              </text>
              {/* Category label */}
              <text
                x={x + barWidth / 2}
                y="144"
                textAnchor="middle"
                className="text-[8px] font-extrabold fill-slate-400 pointer-events-none"
              >
                {d.name}
              </text>
              <title>{`${d.name}: ${formatRupee(d.value)}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   4. PROGRESS HORIZONTAL COMPARISON BARS (Stores Revenue/Profit)
   ───────────────────────────────────────────────────────── */
export const StoreRevenueProgress = ({
  data = []
}) => {
  const maxRevenue = useMemo(() => Math.max(...data.map(d => d.value || d.revenue), 1), [data]);

  return (
    <div className="space-y-4">
      {data.map((store, idx) => {
        const val = store.value || store.revenue || 0;
        const percent = Math.round((val / maxRevenue) * 100);
        return (
          <div key={idx} className="space-y-1.5 hover:bg-slate-50 p-2 rounded-xl transition-colors">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800">{store.storeName || store.name}</span>
              <span className="font-black text-slate-900">{formatRupee(val)}</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${percent}%`,
                  backgroundColor: store.color || '#3B82F6'
                }}
              />
            </div>
            {store.profit !== undefined && (
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                <span>Exp: {formatRupee(store.expenses)}</span>
                <span className="text-emerald-600 font-bold">Profit: {formatRupee(store.profit)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
