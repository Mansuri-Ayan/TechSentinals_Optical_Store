import { useMemo } from 'react';
import { Users, Award, Shield, ShieldCheck, Gift, Coins } from 'lucide-react';
import { getLoyaltyTier } from '../../data/loyaltyData';

const LoyaltyStatsCards = ({ customers }) => {
  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    
    // Total Points Issued = Sum of all earned points in history
    const totalPointsIssued = customers.reduce((sum, c) => {
      const earned = c.history
        .filter(h => h.type === 'earned')
        .reduce((s, h) => s + h.points, 0);
      return sum + earned;
    }, 0);

    // Total Points Redeemed = Sum of all redeemed points in history
    const totalPointsRedeemed = customers.reduce((sum, c) => {
      const redeemed = c.history
        .filter(h => h.type === 'redeemed')
        .reduce((s, h) => s + h.points, 0);
      return sum + redeemed;
    }, 0);

    let silverCount = 0;
    let goldCount = 0;
    let platinumCount = 0;

    customers.forEach(c => {
      const tier = getLoyaltyTier(c.points);
      if (tier === 'Silver') silverCount++;
      else if (tier === 'Gold') goldCount++;
      else if (tier === 'Platinum') platinumCount++;
    });

    return [
      {
        title: 'Loyalty Customers',
        value: String(totalCustomers),
        icon: Users,
        badgeText: 'Total Members',
        badgeColor: 'text-blue-600 bg-blue-50 border-blue-100',
        bgIconColor: 'text-blue-200',
      },
      {
        title: 'Total Points Issued',
        value: totalPointsIssued.toLocaleString('en-IN'),
        icon: Award,
        badgeText: 'Lifetime Earned',
        badgeColor: 'text-indigo-600 bg-indigo-50 border-indigo-100',
        bgIconColor: 'text-indigo-200',
      },
      {
        title: 'Silver Members',
        value: String(silverCount),
        icon: Shield,
        badgeText: '1 - 5,000 Points',
        badgeColor: 'text-slate-600 bg-slate-50 border-slate-100',
        bgIconColor: 'text-slate-200',
      },
      {
        title: 'Gold Members',
        value: String(goldCount),
        icon: ShieldCheck,
        badgeText: '5k - 15k Points',
        badgeColor: 'text-amber-600 bg-amber-50 border-amber-100',
        bgIconColor: 'text-amber-200',
      },
      {
        title: 'Platinum Members',
        value: String(platinumCount),
        icon: ShieldCheck,
        badgeText: '15,000+ Points',
        badgeColor: 'text-purple-655 bg-purple-50 border-purple-100',
        bgIconColor: 'text-purple-200',
      },
      {
        title: 'Points Redeemed',
        value: totalPointsRedeemed.toLocaleString('en-IN'),
        icon: Gift,
        badgeText: 'Total Redeemed',
        badgeColor: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        bgIconColor: 'text-emerald-200',
      },
    ];
  }, [customers]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-6 sm:mb-8">
      {stats.map((stat, i) => (
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
