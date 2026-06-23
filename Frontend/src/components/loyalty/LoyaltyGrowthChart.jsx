import { useMemo } from 'react';
import { useChartAnimation } from '../../hooks/useChartAnimation';

const LoyaltyGrowthChart = ({ trends }) => {
  const [progress, elementRef] = useChartAnimation(trends);
  const monthlyData = useMemo(() => {
    if (!trends || trends.length === 0) return [];
    
    return trends.map(t => ({
      label: t.month,
      awarded: t.points_awarded,
      redeemed: t.points_redeemed,
    }));
  }, [trends]);

  if (!monthlyData.length) return null;

  const maxPoints = Math.max(...monthlyData.map(d => Math.max(d.awarded, d.redeemed)), 1);

  // Compute SVG points
  const awardedPoints = monthlyData.map((d, i) => {
    const x = 40 + i * (235 / Math.max(1, monthlyData.length - 1));
    const y = 130 - (d.awarded / maxPoints) * 95 * progress;
    return `${x},${y}`;
  }).join(' ');

  const redeemedPoints = monthlyData.map((d, i) => {
    const x = 40 + i * (235 / Math.max(1, monthlyData.length - 1));
    const y = 130 - (d.redeemed / maxPoints) * 95 * progress;
    return `${x},${y}`;
  }).join(' ');

  const areaDPoints = awardedPoints ? `M 40,130 L ${awardedPoints} L 275,130 Z` : '';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 sm:p-6 flex flex-col h-full justify-between">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">Points Flow Trends</h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5 font-sans">Monthly points awarded vs redeemed</p>
        </div>
        <div className="flex items-center gap-3 text-[9px] font-bold">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-500">Awarded</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-slate-500">Redeemed</span>
          </div>
        </div>
      </div>

      <div className="w-full h-48 px-2 pt-2 relative">
        <svg ref={elementRef} viewBox="0 0 300 150" className="w-full h-full">
          <defs>
            <linearGradient id="pointsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="40" y1="35" x2="275" y2="35" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="40" y1="70" x2="275" y2="70" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="40" y1="105" x2="275" y2="105" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="40" y1="130" x2="275" y2="130" stroke="#E2E8F0" strokeWidth="1.25" />

          {/* Area */}
          {areaDPoints && <path d={areaDPoints} fill="url(#pointsGrad)" />}

          {/* Awarded Line */}
          {awardedPoints && <path d={`M 40,${130 - (monthlyData[0].awarded / maxPoints) * 95 * progress} L ${awardedPoints}`} fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
          
          {/* Redeemed Line */}
          {redeemedPoints && <path d={`M 40,${130 - (monthlyData[0].redeemed / maxPoints) * 95 * progress} L ${redeemedPoints}`} fill="none" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}

          {/* Data Points */}
          {monthlyData.map((d, i) => {
            const x = 40 + i * (235 / Math.max(1, monthlyData.length - 1));
            const yA = 130 - (d.awarded / maxPoints) * 95 * progress;
            const yR = 130 - (d.redeemed / maxPoints) * 95 * progress;
            
            return (
              <g key={i} className="group cursor-pointer">
                {/* Awarded indicators */}
                <circle cx={x} cy={yA} r="2.5" fill="#FFFFFF" stroke="#10B981" strokeWidth="1.5" className="transition-all duration-200 group-hover:r-3.5" />
                
                {/* Redeemed indicators */}
                <circle cx={x} cy={yR} r="2.5" fill="#FFFFFF" stroke="#F43F5E" strokeWidth="1.5" className="transition-all duration-200 group-hover:r-3.5" />

                {/* X Axis labels */}
                <text x={x} y="142" textAnchor="middle" className="text-[8px] font-extrabold fill-slate-400 pointer-events-none">{d.label}</text>
                
                {/* Tooltip labels */}
                <title>{`${d.label} - Awarded: ${d.awarded}, Redeemed: ${d.redeemed}`}</title>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default LoyaltyGrowthChart;
