import { useMemo } from 'react';
import { ArrowUpRight, Award, CheckCircle } from 'lucide-react';
import { TIERS, getLoyaltyTier } from '../../data/loyaltyData';

const LoyaltyProgress = ({ points }) => {
  const progressInfo = useMemo(() => {
    const currentTier = getLoyaltyTier(points);
    
    if (currentTier === 'Silver') {
      const target = TIERS.GOLD.min;
      const pct = Math.min(100, Math.round((points / target) * 100));
      return {
        currentTier,
        nextTier: 'Gold',
        pointsNeeded: target - points,
        targetPoints: target,
        percentage: pct,
        maxed: false,
      };
    } else if (currentTier === 'Gold') {
      const target = TIERS.PLATINUM.min;
      const currentProgress = points - TIERS.GOLD.min;
      const targetSpan = TIERS.PLATINUM.min - TIERS.GOLD.min;
      const pct = Math.min(100, Math.round((currentProgress / targetSpan) * 100));
      return {
        currentTier,
        nextTier: 'Platinum',
        pointsNeeded: target - points,
        targetPoints: target,
        percentage: pct,
        maxed: false,
      };
    } else {
      return {
        currentTier: 'Platinum',
        nextTier: null,
        pointsNeeded: 0,
        targetPoints: points,
        percentage: 100,
        maxed: true,
      };
    }
  }, [points]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            <Award className="w-4 h-4 text-blue-500" />
            Tier Progress
          </h3>
          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
            {progressInfo.currentTier} Level
          </span>
        </div>

        {progressInfo.maxed ? (
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl text-center">
              <p className="text-sm font-bold text-purple-800">🎉 Maximum Tier Achieved!</p>
              <p className="text-xs text-purple-600 mt-1">You are a valued Platinum Member with access to all VIP perks.</p>
            </div>
            <div className="relative pt-1">
              <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-slate-150">
                <div className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full w-full" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-slate-500 font-bold">
                  Progress to <span className="text-slate-800 font-black">{progressInfo.nextTier}</span>
                </p>
                <p className="text-lg font-black text-slate-900 mt-1">
                  {points.toLocaleString()} <span className="text-xs text-slate-400 font-bold">/ {progressInfo.targetPoints.toLocaleString()} Points</span>
                </p>
              </div>
              <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                {progressInfo.percentage}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="relative pt-1">
              <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-slate-100 border border-slate-200/50">
                <div 
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500" 
                  style={{ width: `${progressInfo.percentage}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 p-3 bg-blue-50/50 border border-blue-100/50 rounded-xl">
              <ArrowUpRight className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <p className="text-xs text-blue-800 font-bold">
                Earn <span className="font-extrabold">{progressInfo.pointsNeeded.toLocaleString()} more points</span> to unlock {progressInfo.nextTier} benefits!
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-455 font-bold">
        <span>Current Benefits Status</span>
        <div className="flex items-center gap-1 text-emerald-600">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Active</span>
        </div>
      </div>
    </div>
  );
};

export default LoyaltyProgress;
