import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Eye, Shield, ShieldCheck, Award } from 'lucide-react';
import Pagination from '../shared/Pagination';

const TierBadge = ({ tier }) => {
  let styles = 'text-slate-700 bg-slate-50 border-slate-200';
  let Icon = Shield;
  
  if (tier === 'GOLD') {
    styles = 'text-amber-700 bg-amber-50 border-amber-200';
    Icon = ShieldCheck;
  } else if (tier === 'PLATINUM') {
    styles = 'text-purple-700 bg-purple-50 border-purple-200';
    Icon = Award;
  } else if (tier === 'NONE') {
    styles = 'text-slate-500 bg-slate-50 border-slate-200';
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${styles}`}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      {tier}
    </span>
  );
};

const LoyaltyCustomerTable = ({ 
  data, 
  routePrefix, 
  searchTerm, 
  setSearchTerm, 
  tierFilter, 
  setTierFilter, 
  currentPage, 
  setCurrentPage, 
  onAdjustPoints 
}) => {
  const navigate = useNavigate();

  const handleRowClick = (id) => {
    navigate(`${routePrefix}/customer/${id}`);
  };

  const items = data?.items || [];
  const totalItems = data?.total || 0;
  const ITEMS_PER_PAGE = data?.limit || 10;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
      {/* Table Filters Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50/50">
        <div className="relative w-full sm:max-w-xs group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 text-sm font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white placeholder:text-slate-400 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">Tier:</span>
          <select
            value={tierFilter}
            onChange={(e) => { setTierFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 text-xs sm:text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Tiers</option>
            <option value="NONE">None</option>
            <option value="SILVER">Silver</option>
            <option value="GOLD">Gold</option>
            <option value="PLATINUM">Platinum</option>
          </select>
        </div>
      </div>

      {/* Table wrapper */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left min-w-[800px]">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-455 uppercase tracking-wider bg-slate-50/30">
              <th className="px-5 py-4 font-bold">Customer Name</th>
              <th className="px-5 py-4 font-bold">Phone</th>
              <th className="px-5 py-4 font-bold">Current Points</th>
              <th className="px-5 py-4 font-bold">Lifetime Earned</th>
              <th className="px-5 py-4 font-bold">Lifetime Redeemed</th>
              <th className="px-5 py-4 font-bold">Membership Tier</th>
              <th className="px-5 py-4 font-bold">Last Active</th>
              <th className="px-5 py-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((c) => {
              return (
                <tr
                  key={c.customer_id}
                  onClick={() => handleRowClick(c.customer_id)}
                  className="hover:bg-slate-50/50 cursor-pointer transition-colors group"
                >
                  <td className="px-5 py-4">
                    <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {c.customer_name}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500 font-semibold">{c.customer_phone || '—'}</td>
                  <td className="px-5 py-4">
                    <span className="text-base font-extrabold text-blue-600">{c.current_points.toLocaleString('en-IN')}</span>
                  </td>
                  <td className="px-5 py-4 text-sm text-emerald-600 font-black">+{c.lifetime_earned_points.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4 text-sm text-rose-500 font-black">-{c.lifetime_redeemed_points.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4">
                    <TierBadge tier={c.membership_tier} />
                  </td>
                  <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                    {c.last_transaction_date ? new Date(c.last_transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never'}
                  </td>
                  <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onAdjustPoints(c); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors border border-slate-200"
                      >
                        Adjust Points
                      </button>
                      <button
                        onClick={() => handleRowClick(c.customer_id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors border border-blue-100"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan="8" className="px-5 py-12 text-center text-slate-400 font-semibold">
                  No loyalty customers found matching the criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalItems > ITEMS_PER_PAGE && (
        <div className="border-t border-slate-100 bg-slate-50/20 p-4">
          <Pagination
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};

export default LoyaltyCustomerTable;
