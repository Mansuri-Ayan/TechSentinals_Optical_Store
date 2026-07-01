import { Gift, Award, Coins } from 'lucide-react';
import { REWARDS } from '../../data/loyaltyData';

const RewardsCard = ({ currentPoints, onRedeem, isRedeeming, canRedeem = true }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
      <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5 mb-6 pb-2 border-b border-slate-100">
        <Gift className="w-4 h-4 text-emerald-500" />
        Available Rewards
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {REWARDS.map((reward) => {
          const isEligible = currentPoints >= reward.points;
          return (
            <div
              key={reward.id}
              className={`border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group ${
                isEligible
                  ? 'border-emerald-200 bg-emerald-50/10 hover:shadow-md'
                  : 'border-slate-200 bg-slate-50/50 opacity-75'
              }`}
            >
              {/* Decorative side ticket-notch cutouts for premium look */}
              <div className="absolute top-1/2 -left-2 w-4 h-4 bg-white border-r border-slate-200/60 rounded-full transform -translate-y-1/2" />
              <div className="absolute top-1/2 -right-2 w-4 h-4 bg-white border-l border-slate-200/60 rounded-full transform -translate-y-1/2" />

              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className={`px-2.5 py-0.5 rounded-lg border text-[10px] font-black tracking-wide ${
                    isEligible 
                      ? 'text-emerald-700 bg-emerald-100/50 border-emerald-200' 
                      : 'text-slate-500 bg-slate-100 border-slate-200'
                  }`}>
                    {reward.points.toLocaleString()} PTS
                  </div>
                  <Coins className={`w-4 h-4 ${isEligible ? 'text-emerald-500' : 'text-slate-400'}`} />
                </div>

                <h4 className="text-base font-black text-slate-800 tracking-tight">{reward.label}</h4>
                <p className="text-xs font-semibold text-slate-500 mt-2 line-clamp-2">{reward.description}</p>
              </div>

              <div className="mt-5">
                {canRedeem && (
                  <button
                    onClick={() => onRedeem(reward.id)}
                    disabled={!isEligible || isRedeeming}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      isEligible
                        ? 'bg-emerald-600 hover:bg-emerald-755 text-white cursor-pointer hover:shadow-md hover:-translate-y-0.5'
                        : 'bg-slate-100 text-slate-400 border border-slate-200/60 cursor-not-allowed'
                    }`}
                  >
                    {isRedeeming ? 'Redeeming...' : isEligible ? 'Redeem Reward' : 'Insufficient Points'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RewardsCard;
