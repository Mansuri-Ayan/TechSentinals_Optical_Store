import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Eye, Shield, ShieldCheck, Award } from 'lucide-react';
import Pagination from '../shared/Pagination';
import { getLoyaltyTier } from '../../data/loyaltyData';

const ITEMS_PER_PAGE = 5;

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
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${styles}`}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      {tier}
    </span>
  );
};

const LoyaltyCustomerTable = ({ customers, routePrefix }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('points'); // 'points', 'spent', 'orders'
  const [sortOrder, setSortOrder] = useState('desc');

  // Filter & Search
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.phone.includes(searchTerm);
      const tier = getLoyaltyTier(c.points);
      const matchesTier = tierFilter === 'all' || tier.toLowerCase() === tierFilter.toLowerCase();
      
      return matchesSearch && matchesTier;
    }).sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      
      if (sortField === 'tier') {
        valA = getLoyaltyTier(a.points);
        valB = getLoyaltyTier(b.points);
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [customers, searchTerm, tierFilter, sortField, sortOrder]);

  // Pagination
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCustomers, currentPage]);

  const handleRowClick = (id) => {
    navigate(`${routePrefix}/customer/${id}`);
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

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
            <option value="all">All Tiers</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
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
              <th 
                className="px-5 py-4 font-bold cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleSort('totalOrders')}
              >
                Total Orders {sortField === 'totalOrders' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                className="px-5 py-4 font-bold cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleSort('totalSpent')}
              >
                Total Spent {sortField === 'totalSpent' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                className="px-5 py-4 font-bold cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleSort('points')}
              >
                Loyalty Points {sortField === 'points' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th className="px-5 py-4 font-bold">Membership Tier</th>
              <th className="px-5 py-4 font-bold">Last Visit</th>
              <th className="px-5 py-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedCustomers.map((c) => {
              const tier = getLoyaltyTier(c.points);
              return (
                <tr
                  key={c.id}
                  onClick={() => handleRowClick(c.id)}
                  className="hover:bg-slate-50/50 cursor-pointer transition-colors group"
                >
                  <td className="px-5 py-4">
                    <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {c.name}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500 font-semibold">{c.phone}</td>
                  <td className="px-5 py-4 text-sm text-slate-700 font-bold">{c.totalOrders}</td>
                  <td className="px-5 py-4 text-sm text-slate-900 font-black">₹{c.totalSpent.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4">
                    <span className="text-base font-extrabold text-slate-800">{c.points.toLocaleString('en-IN')}</span>
                  </td>
                  <td className="px-5 py-4">
                    <TierBadge tier={tier} />
                  </td>
                  <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                    {c.lastVisit ? new Date(c.lastVisit).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleRowClick(c.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors border border-blue-100"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Profile
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {paginatedCustomers.length === 0 && (
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
      {filteredCustomers.length > ITEMS_PER_PAGE && (
        <div className="border-t border-slate-100 bg-slate-50/20 p-4">
          <Pagination
            totalItems={filteredCustomers.length}
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
