import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Shield, ShieldCheck, Award, Calendar, DollarSign, Coins, User } from 'lucide-react';
import { getLoyaltyTier } from '../../data/loyaltyData';
import PermissionGuard from '../shared/PermissionGuard';

const TierBadge = ({ tier }) => {
  let styles = 'text-slate-700 bg-slate-50 border-slate-200';
  let Icon = Shield;
  
  if (tier === 'Gold') {
    styles = 'text-amber-700 bg-amber-50 border-amber-200';
    Icon = ShieldCheck;
  } else if (tier === 'Platinum') {
    styles = 'text-purple-700 bg-purple-50 border-purple-200';
    Icon = Award;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${styles}`}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      {tier} Member
    </span>
  );
};

const LoyaltyCustomerCard = ({ customer, backPath, customerDetailPath }) => {
  const navigate = useNavigate();
  const tier = getLoyaltyTier(customer.points);
  const initials = customer.name ? customer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'C';

  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 sm:mb-8 pb-6 border-b border-slate-100">
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={() => navigate(backPath)}
          className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex-shrink-0 cursor-pointer"
          title="Back to Loyalty Dashboard"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-md flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight truncate max-w-[200px] sm:max-w-md lg:max-w-xl">
                {customer.name}
              </h1>
              <TierBadge tier={tier} />
            </div>
            <p className="text-slate-500 mt-1 text-xs sm:text-sm font-semibold truncate">
              Phone: {customer.phone} &middot; Joined {new Date(customer.joinDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Header Info summary row */}
      <div className="flex items-center gap-4 flex-wrap w-full lg:w-auto mt-2 lg:mt-0">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
          <Coins className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div className="text-xs">
            <p className="text-slate-400 font-extrabold uppercase tracking-wider text-[8px]">Current Points</p>
            <p className="font-bold text-slate-800 text-sm">{customer.points.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
          <DollarSign className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <div className="text-xs">
            <p className="text-slate-400 font-extrabold uppercase tracking-wider text-[8px]">Lifetime Spend</p>
            <p className="font-bold text-slate-800 text-sm">₹{customer.totalSpent.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
          <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <div className="text-xs">
            <p className="text-slate-400 font-extrabold uppercase tracking-wider text-[8px]">Join Date</p>
            <p className="font-bold text-slate-800 text-xs">{new Date(customer.joinDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>

        {customerDetailPath && (
          <PermissionGuard permission="customers:read">
            <button
              onClick={() => navigate(customerDetailPath)}
              className="flex items-center gap-2 bg-[#0A0F1F] hover:bg-slate-800 transition-colors text-white px-4 py-2 rounded-xl h-full shadow-sm cursor-pointer"
            >
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-bold whitespace-nowrap">View Profile</span>
            </button>
          </PermissionGuard>
        )}
      </div>
    </div>
  );
};

export default LoyaltyCustomerCard;
