import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Award, Coins, ShoppingBag, DollarSign, Gift, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';

import LoyaltyCustomerCard from '../../components/loyalty/LoyaltyCustomerCard';
import LoyaltyProgress from '../../components/loyalty/LoyaltyProgress';
import LoyaltyHistoryTable from '../../components/loyalty/LoyaltyHistoryTable';
import LoyaltyTimeline from '../../components/loyalty/LoyaltyTimeline';
import RewardsCard from '../../components/loyalty/RewardsCard';

import { getLoyaltyData, redeemCustomerReward } from '../../data/loyaltyData';

const LoyaltyCustomerDetail = () => {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const loadCustomer = () => {
    setIsLoading(true);
    try {
      const { customers } = getLoyaltyData();
      const found = customers.find((c) => c.id === Number(id));
      setCustomer(found || null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const handleRedeem = (rewardId) => {
    setIsRedeeming(true);
    setTimeout(() => {
      try {
        const updated = redeemCustomerReward(id, rewardId);
        setCustomer(updated);
        toast.success('Reward redeemed successfully!');
      } catch (err) {
        toast.error(err.message || 'Failed to redeem reward.');
      } finally {
        setIsRedeeming(false);
      }
    }, 400);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!customer) {
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

  const redeemedCount = customer.history.filter((h) => h.type === 'redeemed').length;

  return (
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
            isRedeeming={isRedeeming}
          />
          <LoyaltyHistoryTable history={customer.history} />
        </div>

        <div className="space-y-6">
          <LoyaltyProgress points={customer.points} />
          <LoyaltyTimeline timeline={customer.timeline} />
        </div>
      </div>
    </div>
  );
};

export default LoyaltyCustomerDetail;
