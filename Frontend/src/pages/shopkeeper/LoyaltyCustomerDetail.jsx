import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Award, Coins, ShoppingBag, DollarSign, Gift, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';

import LoyaltyCustomerCard from '../../components/loyalty/LoyaltyCustomerCard';
import LoyaltyProgress from '../../components/loyalty/LoyaltyProgress';
import LoyaltyHistoryTable from '../../components/loyalty/LoyaltyHistoryTable';
import LoyaltyTimeline from '../../components/loyalty/LoyaltyTimeline';
import RewardsCard from '../../components/loyalty/RewardsCard';
import PermissionGuard from '../../components/shared/PermissionGuard';

import { useLoyaltyCustomerDetail } from '../../hooks/useLoyalty';
const LoyaltyCustomerDetail = () => {
  const { id } = useParams();
  const { data: rawCustomer, isLoading, isError } = useLoyaltyCustomerDetail(id, null, 'shopkeeper');

  const mapCustomer = (raw) => {
    if (!raw) return null;
    return {
      id: raw.customer_id,
      name: raw.customer_name,
      phone: raw.customer_phone,
      email: raw.customer_email,
      joinDate: raw.join_date,
      points: raw.current_points,
      tier: raw.membership_tier,
      totalOrders: raw.lifetime_orders,
      totalSpent: raw.lifetime_spend,
      history: (raw.transactions || []).map((t) => ({
        id: t.id,
        date: t.created_at,
        type: t.points > 0 ? 'earned' : 'redeemed',
        points: Math.abs(t.points),
        activity: t.note || t.category_name || t.type,
        balance: null,
        rupeeValue: t.rupee_value,
      })),
      timeline: (raw.transactions || []).slice(0, 5).map((t) => {
        let eventName = 'Earned Points';
        if (t.type === 'REDEEMED') eventName = 'Redeemed Reward';
        else if (t.type === 'MANUAL_ADJUSTMENT') eventName = t.points > 0 ? 'Earned Points' : 'Redeemed Reward';
        return {
          id: t.id,
          date: t.created_at,
          event: eventName,
          desc: t.note || (t.points > 0 ? `+${t.points} pts` : `${Math.abs(t.points)} pts`),
        };
      }),
    };
  };

  const customer = mapCustomer(rawCustomer);

  const handleRedeem = (rewardId) => {
    toast.info('Reward redemption coming soon.');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (isError || (!isLoading && !customer)) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto text-center font-sans">
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 max-w-md mx-auto">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-1">Customer Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">The customer profile you are looking for is missing.</p>
          <Link to="/shopkeeper/loyalty" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
            Back to Loyalty Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const redeemedCount = rawCustomer?.transactions?.filter((t) => t.type === 'REDEEMED').length ?? 0;

  return (
    <PermissionGuard permission="loyalty:read" fallback={
      <div className="p-8 text-center text-slate-500">
        You do not have permission to view loyalty details.
      </div>
    }>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">
        {/* Breadcrumbs */}
      <div className="mb-6">
        <div className="flex items-center text-sm text-slate-500 font-semibold mb-3 space-x-2 flex-wrap">
          <Link to="/shopkeeper/dashboard" className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <Link to="/shopkeeper/loyalty" className="hover:text-slate-800 transition-colors">Loyalty Program</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-extrabold truncate">{customer.name}</span>
        </div>
      </div>

      {/* Profile Header */}
      <LoyaltyCustomerCard customer={customer} backPath="/shopkeeper/loyalty" />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 sm:mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="flex justify-between items-start z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Points</p>
            <Coins className="w-4.5 h-4.5 text-slate-400" />
          </div>
          <div className="space-y-1.5 mt-2 z-10">
            <h3 className="text-2xl font-black text-slate-855 tracking-tight leading-none">
              {customer.points.toLocaleString('en-IN')}
            </h3>
            <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded border text-blue-600 bg-blue-50 border-blue-100">
              Active points
            </span>
          </div>
          <Coins className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-200 opacity-[0.06] pointer-events-none group-hover:scale-110 transition-transform duration-300" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="flex justify-between items-start z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lifetime Orders</p>
            <ShoppingBag className="w-4.5 h-4.5 text-slate-400" />
          </div>
          <div className="space-y-1.5 mt-2 z-10">
            <h3 className="text-2xl font-black text-slate-855 tracking-tight leading-none">{customer.totalOrders}</h3>
            <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded border text-indigo-600 bg-indigo-50 border-indigo-100">
              Completed orders
            </span>
          </div>
          <ShoppingBag className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-200 opacity-[0.06] pointer-events-none group-hover:scale-110 transition-transform duration-300" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="flex justify-between items-start z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lifetime Spend</p>
            <DollarSign className="w-4.5 h-4.5 text-slate-400" />
          </div>
          <div className="space-y-1.5 mt-2 z-10">
            <h3 className="text-2xl font-black text-slate-855 tracking-tight leading-none">
              ₹{customer.totalSpent.toLocaleString('en-IN')}
            </h3>
            <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded border text-emerald-600 bg-emerald-50 border-emerald-100">
              Total invoiced
            </span>
          </div>
          <DollarSign className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-200 opacity-[0.06] pointer-events-none group-hover:scale-110 transition-transform duration-300" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="flex justify-between items-start z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rewards Claimed</p>
            <Gift className="w-4.5 h-4.5 text-slate-400" />
          </div>
          <div className="space-y-1.5 mt-2 z-10">
            <h3 className="text-2xl font-black text-slate-855 tracking-tight leading-none">{redeemedCount}</h3>
            <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded border text-purple-655 bg-purple-50 border-purple-100">
              Vouchers claimed
            </span>
          </div>
          <Gift className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-200 opacity-[0.06] pointer-events-none group-hover:scale-110 transition-transform duration-300" />
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 sm:mb-8">
        <div className="lg:col-span-2 space-y-6">
          <RewardsCard
            currentPoints={customer.points}
            onRedeem={handleRedeem}
            isRedeeming={false}
          />
          <LoyaltyHistoryTable history={customer.history} />
        </div>

        <div className="space-y-6">
          <LoyaltyProgress points={customer.points} />
          <LoyaltyTimeline timeline={customer.timeline} />
        </div>
        </div>
      </div>
    </PermissionGuard>
  );
};

export default LoyaltyCustomerDetail;
