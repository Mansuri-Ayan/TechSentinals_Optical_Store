import { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getStoreOverviewApi } from '../../../api/stores/store.api';

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
  const maxValue = Math.max(...data.map(item => item.value || item.count || 0), 1);
  const points = data.map((item, i) => {
    const val = item.value !== undefined ? item.value : (item.count !== undefined ? item.count : 0);
    const x = 50 + (i * (230 / (data.length - 1 || 1)));
    const y = 130 - (val / maxValue) * 100;
    const label = item.label || item.week || item.month;
    return { x, y, val, label };
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
              {p.val.toLocaleString('en-IN')}
            </text>
            <text x={p.x} y="145" textAnchor="middle" className="text-[9px] font-semibold fill-slate-500 pointer-events-none">{p.label}</text>
            <title>{`${p.label}: ${p.val.toLocaleString('en-IN')}`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
};

const DonutChart = ({ data }) => {
  const total = data.reduce((sum, item) => sum + (item.value || item.amount || 0), 0);
  let currentOffset = 0;
  const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6366F1'];

  return (
    <div className="relative w-full h-52 flex flex-col sm:flex-row items-center justify-around gap-4 px-2">
      <div className="relative w-32 h-32 flex-shrink-0">
        <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90">
          <circle cx="70" cy="70" r="50" fill="transparent" stroke="#F8FAFC" strokeWidth="14" />
          {data.map((slice, i) => {
            const val = slice.value || slice.amount || 0;
            const percentage = total > 0 ? (val / total) * 100 : 0;
            const strokeLength = (percentage / 100) * 314.16;
            const strokeOffset = 314.16 - strokeLength + currentOffset;
            currentOffset -= strokeLength;
            const color = slice.color || colors[i % colors.length];

            return (
              <circle
                key={i}
                cx="70"
                cy="70"
                r="50"
                fill="transparent"
                stroke={color}
                strokeWidth="14"
                strokeDasharray={`${strokeLength} 314.16`}
                strokeDashoffset={strokeOffset}
                className="transition-all duration-200 cursor-pointer hover:stroke-[16px]"
                style={{ transformOrigin: 'center' }}
              >
                <title>{`${slice.name || slice.category}: ${val.toLocaleString('en-IN')} (${Math.round(percentage)}%)`}</title>
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
        {data.map((slice, i) => {
          const val = slice.value || slice.amount || 0;
          const color = slice.color || colors[i % colors.length];
          return (
            <div key={i} className="flex items-center justify-between gap-2 p-1 rounded-lg">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="font-semibold truncate text-[11px] text-slate-700">{slice.name || slice.category}</span>
              </div>
              <span className="font-bold text-[11px] text-slate-900">₹{val.toLocaleString('en-IN')}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BarChart = ({ data }) => {
  const maxValue = Math.max(...data.map(item => item.value || item.amount || 0), 1);

  return (
    <div className="w-full h-52 px-2">
      <svg viewBox="0 0 300 160" className="w-full h-full">
        <line x1="40" y1="20" x2="290" y2="20" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="40" y1="60" x2="290" y2="60" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="40" y1="100" x2="290" y2="100" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="40" y1="130" x2="290" y2="130" stroke="#E2E8F0" strokeWidth="1.5" />

        {data.map((bar, i) => {
          const val = bar.value || bar.amount || 0;
          const label = bar.label || bar.category || bar.week || bar.month;
          const barWidth = Math.max(12, Math.min(24, 150 / data.length));
          const spacing = (250 - (data.length * barWidth)) / (data.length + 1);
          const x = 40 + spacing + i * (barWidth + spacing);
          const height = (val / maxValue) * 110;
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
                ₹{val.toLocaleString('en-IN')}
              </text>
              <text x={x + barWidth / 2} y="143" textAnchor="middle" className="text-[9px] font-semibold fill-slate-500 pointer-events-none">
                {label.length > 9 ? `${label.substring(0, 7)}..` : label}
              </text>
              <title>{`${label}: ₹${val.toLocaleString('en-IN')}`}</title>
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
const StoreOverview = ({ storeId }) => {
  const { data: overview, isLoading, refetch } = useQuery({
    queryKey: ['storeOverview', storeId],
    queryFn: () => getStoreOverviewApi(storeId),
  });

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-400 font-semibold animate-pulse">
        Generating store analytics...
      </div>
    );
  }

  if (!overview) return null;

  return (
    <div className="space-y-6">
      
      {/* Upper Grid: Revenue Trend & Sales Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Weekly Revenue Trend (Current Month)" onRefresh={refetch}>
          <LineChart data={overview.weekly_revenue.map(item => ({ label: item.week, value: item.amount }))} color="#10B981" />
        </ChartCard>

        <ChartCard title="Sales by Category (Donut Chart)" onRefresh={refetch}>
          <DonutChart data={overview.sales_by_category} />
        </ChartCard>
      </div>

      {/* Lower Grid: Expense vs Revenue & Customer Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Expense Breakdown vs Revenue (Bar Chart)" onRefresh={refetch}>
          <BarChart data={overview.expense_breakdown} />
        </ChartCard>

        <ChartCard title="Monthly Customer Acquisition (Last 6 Months)" onRefresh={refetch}>
          <LineChart data={overview.monthly_customers} color="#6366F1" />
        </ChartCard>
      </div>

    </div>
  );
};

export default StoreOverview;
