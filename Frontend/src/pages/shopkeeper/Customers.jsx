import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Users, ChevronRight, X as XIcon, UserCheck, UserPlus, Repeat } from 'lucide-react';
import Pagination from '../../components/shared/Pagination';
import { useCustomers } from '../../hooks/useCustomers';
import { useAuthStore, useStoreStore } from '../../store/store';

const ITEMS_PER_PAGE = 12;

/* ── Status badge ── */
const StatusBadge = ({ status }) => {
  const colors = {
    Active: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    Inactive: 'text-slate-655 bg-slate-100 border-slate-200',
    VIP: 'text-amber-700 bg-amber-50 border-amber-200',
  };
  const dots = {
    Active: 'bg-emerald-500',
    Inactive: 'bg-slate-400',
    VIP: 'bg-amber-500',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${colors[status] || colors.Active}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status] || dots.Active}`} />
      {status}
    </span>
  );
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/* ─────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────── */
const Customers = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { selectedStore } = useStoreStore();
  const storeId = user?.role === 'admin' ? selectedStore?.id : user?.store_id;
  
  // Load customers via service layer
  const { customers, isLoading } = useCustomers({ store_id: storeId });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('All');

  /* ── Filter ── */
  const filtered = useMemo(() => {
    let list = customers;
    if (statusFilter !== 'All') {
      list = list.filter(c => c.status === statusFilter);
    }
    const q = searchTerm.toLowerCase().trim();
    if (!q) return list;
    return list.filter(c => {
      const fName = c.firstName || c.first_name || '';
      const lName = c.lastName || c.last_name || '';
      const email = c.email || '';
      const phone = c.phone || '';
      const city = c.city || '';
      const status = c.status || '';
      return (
        `${fName} ${lName}`.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        phone.includes(q) ||
        city.toLowerCase().includes(q) ||
        status.toLowerCase().includes(q)
      );
    });
  }, [customers, searchTerm, statusFilter]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  /* ── KPI stats ── */
  const kpi = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    return {
      total: customers.length,
      active: customers.filter(c => c.status === 'Active' || c.status === 'VIP').length,
      newThisMonth: customers.filter(c => c.customerSince >= monthStart).length,
      repeat: customers.filter(c => c.totalOrders > 1).length,
    };
  }, [customers]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">

      {/* ── Breadcrumb + Header ── */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 space-x-2">
          <Link to="/shopkeeper/dashboard" className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-semibold">Customers</span>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-8 h-8 text-blue-500" />
              Customers
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm sm:text-base font-medium">
              Manage customer profiles, prescriptions, and order histories.
            </p>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-6">
        {[
          { label: 'Total Customers', value: kpi.total, icon: Users, color: 'text-blue-600 bg-blue-50 border-blue-200', activeColor: 'ring-2 ring-blue-500 bg-blue-100/80', onClick: () => { setStatusFilter('All'); setCurrentPage(1); }, active: statusFilter === 'All' },
          { label: 'Active Customers', value: kpi.active, icon: UserCheck, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', activeColor: 'ring-2 ring-emerald-500 bg-emerald-100/80', onClick: () => { setStatusFilter('Active'); setCurrentPage(1); }, active: statusFilter === 'Active' },
          { label: 'New This Month', value: kpi.newThisMonth, icon: UserPlus, color: 'text-purple-600 bg-purple-50 border-purple-200', onClick: () => { setStatusFilter('All'); setCurrentPage(1); } },
          { label: 'Repeat Customers', value: kpi.repeat, icon: Repeat, color: 'text-amber-600 bg-amber-50 border-amber-200', onClick: () => { setStatusFilter('All'); setCurrentPage(1); } },
        ].map(card => {
          const Icon = card.icon;
          const content = (
            <>
              <div className="p-2 sm:p-2.5 rounded-xl bg-white/60 flex-shrink-0">
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-bold opacity-70 truncate">{card.label}</p>
                <p className="text-lg sm:text-2xl font-bold text-slate-900 leading-tight">{card.value}</p>
              </div>
            </>
          );

          const cardCls = `flex items-center gap-2 sm:gap-4 p-3 sm:p-5 rounded-2xl border shadow-sm transition-all duration-205 hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${card.color} ${card.active ? card.activeColor : ''}`;

          return (
            <div key={card.label} onClick={card.onClick} className={cardCls}>
              {content}
            </div>
          );
        })}
      </div>

      {/* ── Search Bar ── */}
      <div className="relative w-full mb-5 group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          placeholder="Search by name, email, phone, city or status…"
          className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-medium transition-all shadow-sm placeholder:text-slate-400"
        />
        {searchTerm && (
          <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
            className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Results info ── */}
      {searchTerm && (
        <p className="text-xs text-slate-500 font-bold mb-4">
          {filtered.length} customer{filtered.length !== 1 ? 's' : ''} found for "{searchTerm}"
        </p>
      )}

      {/* ── Tabular Listing ── */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <Users className="w-8 h-8 text-slate-350" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No customers found</h3>
          <p className="text-slate-500 text-sm">No profiles found matching search criteria.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table Layout */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-105">
                    {['Customer', 'Phone Number', 'Email', 'Last Visit', 'Total Orders', 'Total Purchases', 'Status'].map(col => (
                      <th key={col} className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginated.map(c => {
                    const fName = c.firstName || c.first_name || '';
                    const lName = c.lastName || c.last_name || '';
                    const fullName = `${fName} ${lName}`.trim() || 'Unknown Customer';
                    const initials = fName ? fName[0].toUpperCase() : (lName ? lName[0].toUpperCase() : 'C');
                    return (
                      <tr
                        key={c.id}
                        onClick={() => navigate(`/shopkeeper/customers/${c.id}`)}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm leading-tight">{fullName}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">CUST-{String(c.id).slice(-6)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-700">{c.phone}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-500">{c.email || '—'}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-700">{fmtDate(c.lastVisit)}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-850 text-xs font-bold">
                            {c.totalOrders}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="text-xs font-bold text-slate-900">₹{c.totalAmount.toLocaleString('en-IN')}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <StatusBadge status={c.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card-List Layout */}
          <div className="md:hidden space-y-3 mb-6">
            {paginated.map(c => {
              const fName = c.firstName || c.first_name || '';
              const lName = c.lastName || c.last_name || '';
              const fullName = `${fName} ${lName}`.trim() || 'Unknown Customer';
              const initials = fName ? fName[0].toUpperCase() : (lName ? lName[0].toUpperCase() : 'C');
              return (
                <div
                  key={c.id}
                  onClick={() => navigate(`/shopkeeper/customers/${c.id}`)}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3 cursor-pointer hover:shadow-md hover:border-blue-200 active:scale-[0.99] transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                        {initials}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm leading-tight">{fullName}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">CUST-{String(c.id).slice(-6)}</p>
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <p className="text-slate-400 font-semibold mb-0.5">Phone</p>
                      <p className="font-bold text-slate-700 truncate">{c.phone}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold mb-0.5">Email</p>
                      <p className="font-bold text-slate-700 truncate">{c.email || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold mb-0.5">Last Visit</p>
                      <p className="font-bold text-slate-700">{fmtDate(c.lastVisit)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold mb-0.5">Purchases (Orders)</p>
                      <p className="font-bold text-slate-900 font-mono">₹{c.totalAmount.toLocaleString('en-IN')} <span className="text-slate-400 font-medium">({c.totalOrders})</span></p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
};

export default Customers;
