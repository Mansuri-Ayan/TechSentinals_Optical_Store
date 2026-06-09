import { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';

/* ─────────────────────────────────────────────────────────
   REUSABLE LAYOUT CARD
   ───────────────────────────────────────────────────────── */
const ChartCard = ({ title, children, onRefresh }) => (
  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden p-4 sm:p-5 flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between gap-3 mb-4 flex-shrink-0">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
      {onRefresh && (
        <button onClick={onRefresh} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all" title="Refresh Chart">
          <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
        </button>
      )}
    </div>
    <div className="flex-1 min-h-0 flex items-center justify-center relative">
      {children}
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────
   PURE SVG CHART COMPONENTS
   ───────────────────────────────────────────────────────── */

const LineChart = ({ data, color = '#10B981' }) => {
  const maxValue = Math.max(...data.map(item => item.value), 1);
  const points = data.map((item, i) => {
    const x = 50 + (i * (230 / (data.length - 1 || 1)));
    const y = 130 - (item.value / maxValue) * 100;
    return { x, y, val: item.value, label: item.label };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} 130 L ${points[0].x} 130 Z`
    : '';

  return (
    <div className="w-full h-56 px-2">
      <svg viewBox="0 0 300 160" className="w-full h-full">
        <defs>
          <linearGradient id="lineGradDetail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="50" y1="30" x2="280" y2="30" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="50" y1="80" x2="280" y2="80" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="50" y1="130" x2="280" y2="130" stroke="#E2E8F0" strokeWidth="1.5" />

        {areaD && <path d={areaD} fill="url(#lineGradDetail)" />}
        {pathD && <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

        {points.map((p, i) => (
          <g key={i} className="group">
            <circle cx={p.x} cy={p.y} r="3.5" fill="#FFFFFF" stroke={color} strokeWidth="2" className="transition-all duration-200 group-hover:r-5" />
            <text x={p.x} y={p.y - 7} textAnchor="middle" className="text-[8px] font-bold fill-slate-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              ₹{p.val.toLocaleString('en-IN')}
            </text>
            <text x={p.x} y="145" textAnchor="middle" className="text-[9px] font-semibold fill-slate-500 pointer-events-none">{p.label}</text>
            <title>{`${p.label}: ₹${p.val.toLocaleString('en-IN')}`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
};

const DonutChart = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentOffset = 0;

  return (
    <div className="relative w-full h-52 flex flex-col sm:flex-row items-center justify-around gap-4 px-2">
      <div className="relative w-32 h-32 flex-shrink-0">
        <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90">
          <circle cx="70" cy="70" r="50" fill="transparent" stroke="#F8FAFC" strokeWidth="14" />
          {data.map((slice, i) => {
            const percentage = total > 0 ? (slice.value / total) * 100 : 0;
            const strokeLength = (percentage / 100) * 314.16;
            const strokeOffset = 314.16 - strokeLength + currentOffset;
            currentOffset -= strokeLength;

            return (
              <circle
                key={i}
                cx="70"
                cy="70"
                r="50"
                fill="transparent"
                stroke={slice.color}
                strokeWidth="14"
                strokeDasharray={`${strokeLength} 314.16`}
                strokeDashoffset={strokeOffset}
                className="transition-all duration-200 cursor-pointer hover:stroke-[16px]"
                style={{ transformOrigin: 'center' }}
              >
                <title>{`${slice.name}: ${slice.value.toLocaleString('en-IN')} (${Math.round(percentage)}%)`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none font-sans">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
          <span className="text-xs font-black text-slate-800">₹{total.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-xs text-slate-600 max-h-36 overflow-y-auto w-full max-w-[140px] hide-scrollbar">
        {data.map((slice, i) => (
          <div key={i} className="flex items-center justify-between gap-2 p-1 rounded-lg">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="font-semibold truncate text-[11px] text-slate-700">{slice.name}</span>
            </div>
            <span className="font-bold text-[11px] text-slate-900">₹{slice.value.toLocaleString('en-IN')}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const BarChart = ({ data }) => {
  const maxValue = Math.max(...data.map(item => item.value), 1);

  return (
    <div className="w-full h-52 px-2">
      <svg viewBox="0 0 300 160" className="w-full h-full">
        <line x1="40" y1="20" x2="290" y2="20" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="40" y1="60" x2="290" y2="60" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="40" y1="100" x2="290" y2="100" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="40" y1="130" x2="290" y2="130" stroke="#E2E8F0" strokeWidth="1.5" />

        {data.map((bar, i) => {
          const barWidth = Math.max(12, Math.min(24, 150 / data.length));
          const spacing = (250 - (data.length * barWidth)) / (data.length + 1);
          const x = 40 + spacing + i * (barWidth + spacing);
          const height = (bar.value / maxValue) * 110;
          const y = 130 - height;

          return (
            <g key={i} className="group cursor-pointer">
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={height}
                rx="2"
                fill={bar.color || '#3B82F6'}
                className="transition-all duration-300 hover:brightness-95"
              />
              <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" className="text-[8px] font-extrabold fill-slate-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                ₹{bar.value.toLocaleString('en-IN')}
              </text>
              <text x={x + barWidth / 2} y="143" textAnchor="middle" className="text-[9px] font-semibold fill-slate-500 pointer-events-none">
                {bar.label.length > 9 ? `${bar.label.substring(0, 7)}..` : bar.label}
              </text>
              <title>{`${bar.label}: ₹${bar.value.toLocaleString('en-IN')}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   MAIN VIEW
   ───────────────────────────────────────────────────────── */
const StoreOverview = ({ store, metrics }) => {
  const scale = metrics.mult || 0.15;
  const scaleValue = (val) => Math.round(val * scale);

  const revenueTrendData = useMemo(() => [
    { label: 'Wk 1', value: scaleValue(125000) },
    { label: 'Wk 2', value: scaleValue(168000) },
    { label: 'Wk 3', value: scaleValue(145000) },
    { label: 'Wk 4', value: scaleValue(195000) },
  ], [scale]);

  const salesByCategoryData = useMemo(() => [
    { name: 'Frames', value: scaleValue(284000), color: '#3B82F6' },
    { name: 'Lenses', value: scaleValue(197000), color: '#10B981' },
    { name: 'Other Products', value: scaleValue(98500), color: '#8B5CF6' },
  ], [scale]);

  const expenseVsRevenueData = useMemo(() => [
    { label: 'Revenue', value: scaleValue(420000), color: '#10B981' },
    { label: 'Rent', value: scaleValue(40000), color: '#EF4444' },
    { label: 'Salary', value: scaleValue(85000), color: '#F59E0B' },
    { label: 'Inventory', value: scaleValue(120000), color: '#3B82F6' },
    { label: 'Utilities', value: scaleValue(15000), color: '#6366F1' },
  ], [scale]);

  const customerGrowthData = useMemo(() => [
    { label: 'Jan', value: scaleValue(40) },
    { label: 'Feb', value: scaleValue(55) },
    { label: 'Mar', value: scaleValue(70) },
    { label: 'Apr', value: scaleValue(88) },
    { label: 'May', value: scaleValue(110) },
    { label: 'Jun', value: scaleValue(145) },
  ], [scale]);

  return (
    <div className="space-y-6">
      
      {/* Upper Grid: Revenue Trend & Sales Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Weekly Revenue Trend (Line Chart)">
          <LineChart data={revenueTrendData} color="#10B981" />
        </ChartCard>

        <ChartCard title="Sales by Category (Donut Chart)">
          <DonutChart data={salesByCategoryData} />
        </ChartCard>
      </div>

      {/* Lower Grid: Expense vs Revenue & Customer Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Expense Breakdown vs Revenue (Bar Chart)">
          <BarChart data={expenseVsRevenueData} />
        </ChartCard>

        <ChartCard title="Monthly Customer Acquisition (Line Chart)">
          <LineChart data={customerGrowthData} color="#6366F1" />
        </ChartCard>
      </div>

    </div>
  );
};

export default StoreOverview;
