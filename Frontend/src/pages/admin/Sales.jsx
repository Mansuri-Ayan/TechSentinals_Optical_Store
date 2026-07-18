import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search, Store, ShoppingCart, UserCheck, ChevronRight,
  X, Package, Clock, Users, DollarSign, Printer, Calendar
} from 'lucide-react';
import { useSales } from '../../hooks/useSales';
import { useStores } from '../../hooks/useStores';
import { useStoreStore } from '../../store/store';
import Pagination from '../../components/shared/Pagination';
import InventoryDetailDrawer from '../../components/admin/InventoryDetailDrawer';
import { useRoleContext } from '../../hooks/useRoleContext';

const STATUS_CFG = {
  Completed: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  Cancelled: { color: 'text-slate-600 bg-slate-100 border-slate-200', dot: 'bg-slate-400' },
  Returned:  { color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500' },
  'Lab Pending': { color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  'Partially Paid': { color: 'text-blue-700 bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
  'Unpaid': { color: 'text-rose-700 bg-rose-50 border-rose-200', dot: 'bg-rose-500' },
};

const STATUS_FILTERS = [
  { key: 'All', label: 'All Sales' },
  { key: 'Completed', label: 'Completed Orders' },
  { key: 'Cancelled', label: 'Cancelled Orders' },
  { key: 'Returned', label: 'Returned Orders' },
  { key: 'Lab Pending', label: 'Lab Pending' },
  { key: 'Partially Paid', label: 'Partially Paid' },
  { key: 'Unpaid', label: 'Unpaid' },
];

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.Completed;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
};

const Sales = () => {
  const [searchParams] = useSearchParams();
  const queryBranch = searchParams.get('branch');
  const queryStatus = searchParams.get('status');

  const { storeId, buildPath, showStoreSwitcher, isPathAdmin } = useRoleContext();
  const { selectedStore } = useStoreStore();

  const [selectedBranch, setSelectedBranch] = useState(queryBranch || storeId || 'All');
  const [selectedStatus, setSelectedStatus] = useState(queryStatus || 'All');
  const [selectedPayment, setSelectedPayment] = useState('All');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSale, setSelectedSale] = useState(null);

  const { stores } = useStores();

  useEffect(() => {
    if (isPathAdmin && selectedStore && selectedStore.id !== 'admin') {
      setSelectedBranch(selectedStore.id);
    }
  }, [selectedStore, isPathAdmin]);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    if (queryBranch) setSelectedBranch(queryBranch);
    if (queryStatus) setSelectedStatus(queryStatus);
  }, [queryBranch, queryStatus]);

  // Reset page when filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBranch, selectedStatus, selectedPayment, searchTerm, dateFrom, dateTo]);

  // Fetch sales from backend
  const { sales, total, pages, kpis, isLoading } = useSales({
    page: currentPage,
    limit: 8,
    storeId: selectedBranch,
    status: selectedStatus,
    search: searchTerm,
    dateFrom,
    dateTo,
    hasDue: selectedPayment === 'Remaining' ? true : selectedPayment === 'Paid' ? false : undefined,
  });

  const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans overflow-x-hidden">
      {/* Breadcrumb + Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 space-x-2">
          <Link to={buildPath('dashboard')} className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-semibold">Sales History</span>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight">
              Sales Records
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm sm:text-base">
              Track and monitor optical customer sales, pending laboratory orders, and store revenues.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          { label: 'Total Revenue', value: fmt(kpis.revenue), icon: DollarSign, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
          { label: 'Total Sales Orders', value: kpis.totalOrders, icon: ShoppingCart, color: 'text-blue-700 bg-blue-50 border-blue-100' },
          { label: 'Completed Orders', value: kpis.completed, icon: UserCheck, color: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
          { label: 'Pending / Lab Orders', value: kpis.active, icon: Clock, color: 'text-amber-700 bg-amber-50 border-amber-100' },
        ].map((kpi, idx) => (
          <div key={idx} className={`p-4 sm:p-5 rounded-2xl border bg-white shadow-sm flex items-center justify-between gap-3 ${kpi.color.split(' ').slice(2).join(' ')}`}>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 mb-1">{kpi.label}</p>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">{kpi.value}</h3>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.color.split(' ').slice(0, 2).join(' ')}`}>
              <kpi.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Select Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        
        {/* Branch and Payment Selectors */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {showStoreSwitcher && (
            <>
              <label className="text-sm font-semibold text-slate-600 flex items-center gap-1.5 whitespace-nowrap">
                <Store className="w-4 h-4 text-slate-400" /> Branch:
              </label>
              <div className="relative w-full sm:w-48">
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white appearance-none pr-8"
                >
                  <option value="All">All Branches</option>
                  {stores.filter(s => s.id !== 'admin' && s.store_name !== 'All Store' && s.name !== 'All Store').map(store => (
                    <option key={store.id} value={store.id}>{store.store_name}</option>
                  ))}
                </select>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
              </div>
            </>
          )}

          <label className="text-sm font-semibold text-slate-600 flex items-center gap-1.5 whitespace-nowrap sm:ml-4">
            <DollarSign className="w-4 h-4 text-slate-400" /> Payment:
          </label>
          <div className="relative w-full sm:w-48">
            <select
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
              className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white appearance-none pr-8"
            >
              <option value="All">All Payments</option>
              <option value="Remaining">Remaining Payment</option>
              <option value="Paid">Fully Paid</option>
            </select>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
          </div>

          {/* Date Filters */}
          <div className="flex items-center justify-between sm:justify-start gap-2 border border-slate-100 sm:border-0 p-2 sm:p-0 rounded-xl flex-wrap sm:ml-4">
            <label className="text-sm font-semibold text-slate-600 flex items-center gap-1.5 whitespace-nowrap">
              <Calendar className="w-4 h-4 text-slate-400" /> Dates:
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="px-2 py-1 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500"
              />
              <span className="text-slate-400 text-xs font-semibold">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="px-2 py-1 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500"
              />
              {(dateFrom || dateTo) && (
                <button 
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 rounded-lg hover:bg-red-50"
                  title="Clear date filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md w-full">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by customer, product, order ID..."
            className="w-full pl-10 pr-9 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white transition-all placeholder:text-slate-400 shadow-sm"
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto hide-scrollbar pb-1">
        {STATUS_FILTERS.map(f => {
          const isActive = selectedStatus === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setSelectedStatus(f.key)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 border ${
                isActive
                  ? 'bg-slate-950 text-white border-slate-950 shadow-sm shadow-slate-950/20'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Sales List / Table View */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
          <p className="text-slate-500 text-sm mt-4">Loading sales history...</p>
        </div>
      ) : sales.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <Package className="w-6 h-6 text-slate-300" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No sales records found</h3>
          <p className="text-slate-500 text-sm mb-4">Try clearing or adjusting your branch, status, or search filters.</p>
          <button
            onClick={() => {
              setSelectedBranch('All');
              setSelectedStatus('All');
              setSelectedPayment('All');
              setDateFrom('');
              setDateTo('');
              setSearchInput('');
              setSearchTerm('');
            }}
            className="text-emerald-600 font-bold hover:text-emerald-700 transition-colors text-sm"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Desktop Table View */}
          <div className="hidden lg:block border border-slate-100 rounded-2xl shadow-sm bg-white overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Order ID', 'Customer', 'Billing Account', 'Product', 'Branch', 'Staff', 'Date', 'Amount', 'Status', ''].map(col => (
                    <th key={col} className={`px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap ${col === '' ? 'text-right w-12' : 'text-left'}`}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sales.map((sale) => (
                  <tr
                    key={sale.id}
                    onClick={() => setSelectedSale(sale)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                  >
                    <td className="px-3 py-3 text-[11px] font-mono font-bold text-slate-700 whitespace-nowrap">{sale.orderId}</td>
                    <td className="px-3 py-3 text-xs font-bold text-slate-900 max-w-[140px] truncate">{sale.customerName}</td>
                    <td className="px-3 py-3 text-xs max-w-[140px] truncate">
                      {sale.billedOnAccountOf ? (
                        <span className="font-bold text-slate-900">{sale.billedOnAccountOf.name}</span>
                      ) : (
                        <span className="font-semibold text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs font-medium text-slate-600 max-w-[160px] truncate">{sale.productName || '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded text-[10px] font-semibold text-slate-500">
                        <Store className="w-3 h-3 text-slate-400" />
                        {sale.branchName || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded text-[10px] font-semibold text-slate-600">
                        <Users className="w-3 h-3 text-slate-400" />
                        {sale.staffName || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[11px] font-semibold text-slate-500 whitespace-nowrap">{fmtDate(sale.orderDate)}</td>
                    <td className="px-3 py-3 text-xs font-black text-slate-900 whitespace-nowrap">{fmt(sale.total_amount)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-0.5 items-start">
                        <StatusBadge status={sale.status} />
                        {sale.is_exchanged && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold text-orange-700 bg-orange-50 border border-orange-200 uppercase tracking-wider">
                            Exchanged
                          </span>
                        )}
                        {sale.is_exchange_sale && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 uppercase tracking-wider">
                            Exchange
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSale({ ...sale, initialTab: 'bill' });
                        }}
                        className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center border border-slate-150"
                        title="Print / Share Bill"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Card View */}
          <div className="lg:hidden space-y-3">
            {sales.map((sale) => (
              <div
                key={sale.id}
                onClick={() => setSelectedSale(sale)}
                className="bg-white p-4 border border-slate-100 rounded-2xl shadow-sm space-y-3 cursor-pointer hover:border-slate-350 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400">{sale.orderId}</span>
                    <h3 className="font-bold text-slate-950 text-sm mt-0.5">{sale.customerName}</h3>
                    {sale.billedOnAccountOf && (
                      <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                        Billed to: {sale.billedOnAccountOf.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSale({ ...sale, initialTab: 'bill' });
                      }}
                      className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg transition-colors cursor-pointer border border-slate-200 inline-flex items-center justify-center"
                      title="Print / Share Bill"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <StatusBadge status={sale.status} />
                    {sale.is_exchanged && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold text-orange-700 bg-orange-55 border border-orange-200 uppercase tracking-wider">
                        Exchanged
                      </span>
                    )}
                    {sale.is_exchange_sale && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold text-blue-700 bg-blue-55 border border-blue-200 uppercase tracking-wider">
                        Exchange
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Product:</span> {sale.productName || '—'}
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block">Branch</span>
                    <span className="font-bold text-slate-700">{sale.branchName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Staff</span>
                    <span className="font-bold text-slate-700">{sale.staffName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Date</span>
                    <span className="font-bold text-slate-700">{fmtDate(sale.orderDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Amount</span>
                    <span className="font-black text-slate-900">{fmt(sale.total_amount)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <Pagination
            totalItems={total}
            itemsPerPage={8}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />

        </div>
      )}

      {/* Reused Details Drawer */}
      <InventoryDetailDrawer
        item={selectedSale}
        onClose={() => setSelectedSale(null)}
      />

    </div>
  );
};

export default Sales;
