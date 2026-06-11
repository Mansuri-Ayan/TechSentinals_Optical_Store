import { Clock, Star, Gift, ShieldAlert, Award } from 'lucide-react';

const TIMELINE_ICONS = {
  'Earned Points': { icon: Star, color: 'bg-blue-50 border-blue-200 text-blue-600' },
  'Redeemed Reward': { icon: Gift, color: 'bg-emerald-50 border-emerald-200 text-emerald-600' },
  'Moved to Gold Tier': { icon: Award, color: 'bg-amber-50 border-amber-200 text-amber-600' },
  'Moved to Platinum Tier': { icon: Award, color: 'bg-purple-50 border-purple-200 text-purple-600' },
  'Joined Loyalty Program': { icon: Clock, color: 'bg-slate-50 border-slate-200 text-slate-500' },
};

const LoyaltyTimeline = ({ timeline }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
      <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5 mb-6 pb-2 border-b border-slate-100">
        <Clock className="w-4 h-4 text-blue-500" />
        Activity Timeline
      </h3>

      <div className="relative pl-6 border-l-2 border-slate-100 ml-3 space-y-6">
        {timeline.map((item) => {
          // Find icon config or default
          const cfg = TIMELINE_ICONS[item.event] || (item.event.includes('Tier') 
            ? TIMELINE_ICONS['Moved to Gold Tier'] 
            : (item.event.includes('Redeemed') 
              ? TIMELINE_ICONS['Redeemed Reward'] 
              : TIMELINE_ICONS['Earned Points']));
          
          const Icon = cfg.icon;

          return (
            <div key={item.id} className="relative group">
              {/* Point Node Indicator */}
              <span className={`absolute -left-[35px] top-0.5 w-6.5 h-6.5 rounded-full border-2 bg-white flex items-center justify-center shadow-sm z-10 ${cfg.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </span>

              {/* Event Content */}
              <div className="flex flex-col gap-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="font-extrabold text-sm text-slate-800">
                    {item.event}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-md w-fit">
                    {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-500">{item.desc}</p>
              </div>
            </div>
          );
        })}
        {timeline.length === 0 && (
          <p className="text-sm text-slate-400 font-semibold text-center py-6">
            No events logged.
          </p>
        )}
      </div>
    </div>
  );
};

export default LoyaltyTimeline;
