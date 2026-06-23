import { useMemo } from 'react';

const LoyaltyDistributionChart = ({ tierDistribution }) => {
  const chartData = useMemo(() => {
    if (!tierDistribution) return [];

    return [
      { name: 'Silver Members', value: tierDistribution.silver, color: '#64748B' },
      { name: 'Gold Members', value: tierDistribution.gold, color: '#D97706' },
      { name: 'Platinum Members', value: tierDistribution.platinum, color: '#7C3AED' },
    ];
  }, [tierDistribution]);

  if (!tierDistribution) return null;

  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  let currentOffset = 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 sm:p-6 flex flex-col h-full justify-between">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight">Loyalty Tier Distribution</h3>
        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-lg">All Members</span>
      </div>

      <div className="relative w-full flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
        <div className="relative w-36 h-36 flex-shrink-0">
          <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90">
            <circle cx="70" cy="70" r="50" fill="transparent" stroke="#F8FAFC" strokeWidth="12" />
            {chartData.map((slice, i) => {
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
                  strokeWidth="12"
                  strokeDasharray={`${strokeLength} 314.16`}
                  strokeDashoffset={strokeOffset}
                  className="transition-all duration-200 cursor-pointer hover:stroke-[14px]"
                  style={{ transformOrigin: 'center' }}
                >
                  <title>{`${slice.name}: ${slice.value?.toLocaleString() || '0'} (${Math.round(percentage)}%)`}</title>
                </circle>
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">Members</span>
            <span className="text-xl font-black text-slate-800 leading-none mt-0.5">{total}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2 w-full sm:max-w-[150px]">
          {chartData.map((slice, i) => {
            const percentage = total > 0 ? Math.round((slice.value / total) * 100) : 0;
            return (
              <div key={i} className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100/50">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
                  <span className="font-extrabold truncate text-[10px] text-slate-700">{slice.name.split(' ')[0]}</span>
                </div>
                <span className="font-black text-[10px] text-slate-900 ml-auto">{slice.value} ({percentage}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LoyaltyDistributionChart;
