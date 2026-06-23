import { useMemo } from 'react';
import { Users, Award, Shield, ShieldCheck, Gift, Coins } from 'lucide-react';

const LoyaltyStatsCards = ({ stats, tierDistribution, config }) => {
  const cardsData = useMemo(() => {
    if (!stats || !tierDistribution) return [];

    const silverMax = config?.silver_max ?? 5000;
    const goldMax = config?.gold_max ?? 15000;
    
    return [
      {
        title: 'Loyalty Customers',
        value: String(stats.total_customers_enrolled),
        icon: Users,
        badgeText: 'Total Members',
        badgeColor: 'text-blue-600 bg-blue-50 border-blue-100',
        bgIconColor: 'text-blue-200',
      },
      {
        title: 'Total Points Issued',
        value: stats.lifetime_points_awarded?.toLocaleString('en-IN') || '0',
        icon: Award,
        badgeText: 'Lifetime Earned',
        badgeColor: 'text-indigo-600 bg-indigo-50 border-indigo-100',
        bgIconColor: 'text-indigo-200',
      },
      {
        title: 'Silver Members',
        value: String(tierDistribution.silver),
        icon: Shield,
        badgeText: `1 – ${silverMax.toLocaleString('en-IN')} pts`,
        badgeColor: 'text-slate-600 bg-slate-50 border-slate-100',
        bgIconColor: 'text-slate-200',
      },
      {
        title: 'Gold Members',
        value: String(tierDistribution.gold),
        icon: ShieldCheck,
        badgeText: `${(silverMax + 1).toLocaleString('en-IN')} – ${goldMax.toLocaleString('en-IN')} pts`,
        badgeColor: 'text-amber-600 bg-amber-50 border-amber-100',
        bgIconColor: 'text-amber-200',
      },
      {
        title: 'Platinum Members',
        value: String(tierDistribution.platinum),
        icon: ShieldCheck,
        badgeText: `${(goldMax + 1).toLocaleString('en-IN')}+ pts`,
        badgeColor: 'text-purple-600 bg-purple-50 border-purple-100',
        bgIconColor: 'text-purple-200',
      },
      {
        title: 'Points Redeemed',
        value: stats.lifetime_points_redeemed?.toLocaleString('en-IN') || '0',
        icon: Gift,
        badgeText: 'Total Redeemed',
        badgeColor: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        bgIconColor: 'text-emerald-200',
      },
    ];
  }, [stats, tierDistribution, config]);

  if (!stats || !tierDistribution) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-6 sm:mb-8">
      {cardsData.map((stat, i) => (
        <div
          key={i}
          className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-36 relative overflow-hidden group"
        >
          <div className="flex justify-between items-start z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[85%]">{stat.title}</p>
            <stat.icon className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-1.5 mt-2 z-10">
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-none truncate">{stat.value}</h3>
            <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded border ${stat.badgeColor}`}>
              {stat.badgeText}
            </span>
          </div>
          <stat.icon className={`absolute -right-4 -bottom-4 w-24 h-24 ${stat.bgIconColor} opacity-[0.07] pointer-events-none group-hover:scale-115 transition-transform duration-300`} />
        </div>
      ))}
    </div>
  );
};

export default LoyaltyStatsCards;
