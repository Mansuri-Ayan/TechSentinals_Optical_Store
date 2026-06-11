import { useMemo } from 'react';
import { Shield, ShieldCheck, Award, CheckCircle } from 'lucide-react';
import { TIERS, getLoyaltyTier } from '../../data/loyaltyData';

const LoyaltyTierCard = ({ customers }) => {
  const tierStats = useMemo(() => {
    let silverCount = 0;
    let goldCount = 0;
    let platinumCount = 0;

    customers.forEach(c => {
      const tier = getLoyaltyTier(c.points);
      if (tier === 'Silver') silverCount++;
      else if (tier === 'Gold') goldCount++;
      else if (tier === 'Platinum') platinumCount++;
    });

    return {
      Silver: silverCount,
      Gold: goldCount,
      Platinum: platinumCount,
    };
  }, [customers]);

  const cardsData = [
    {
      key: 'SILVER',
      title: 'Silver Card',
      tierName: TIERS.SILVER.name,
      range: '1 – 5,000 Points',
      count: tierStats.Silver,
      benefits: TIERS.SILVER.benefits,
      icon: Shield,
      gradient: 'from-slate-50 via-slate-100/50 to-slate-200/20',
      iconBg: 'bg-slate-200/50',
      iconColor: 'text-slate-600',
      borderColor: 'border-slate-200',
      badgeColor: 'bg-slate-100 text-slate-700',
    },
    {
      key: 'GOLD',
      title: 'Gold Card',
      tierName: TIERS.GOLD.name,
      range: '5,001 – 15,000 Points',
      count: tierStats.Gold,
      benefits: TIERS.GOLD.benefits,
      icon: ShieldCheck,
      gradient: 'from-amber-50/40 via-amber-100/20 to-amber-200/10',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-250',
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      key: 'PLATINUM',
      title: 'Platinum Card',
      tierName: TIERS.PLATINUM.name,
      range: '15,001+ Points',
      count: tierStats.Platinum,
      benefits: TIERS.PLATINUM.benefits,
      icon: Award,
      gradient: 'from-purple-50/40 via-purple-100/20 to-purple-200/10',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-250',
      badgeColor: 'bg-purple-100 text-purple-800',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 sm:mb-8">
      {cardsData.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className={`bg-gradient-to-br ${card.gradient} rounded-2xl border ${card.borderColor} p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between`}
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-5.5 h-5.5 ${card.iconColor}`} />
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${card.badgeColor}`}>
                  {card.count} Member{card.count !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Title & Info */}
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">{card.tierName} Membership</h3>
              <p className="text-xs font-semibold text-slate-500 mt-1">{card.range}</p>

              {/* Benefits list */}
              <div className="mt-5 space-y-2.5">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Tier Benefits</p>
                {card.benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-400 font-semibold">
              <span>Status Level</span>
              <span className="uppercase font-bold tracking-wider">{card.tierName}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LoyaltyTierCard;
