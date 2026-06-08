import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Store, ShoppingCart, TrendingUp, UserCheck, ChevronRight,
  Layers, Calendar, DollarSign, X, Package, Clock, Users
} from 'lucide-react';
import { SALES_MOCK_DATA } from '../../data/salesData';
import Pagination from '../../components/shared/Pagination';
import InventoryDetailDrawer from '../../components/admin/InventoryDetailDrawer';

const STATUS_CFG = {
  Completed: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  Cancelled: { color: 'text-slate-600 bg-slate-100 border-slate-200', dot: 'bg-slate-400' },
  Returned:  { color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500' },
  'Lab Pending': { color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  Repair:    { color: 'text-indigo-700 bg-indigo-50 border-indigo-200', dot: 'bg-indigo-500' },
  Exchange:  { color: 'text-purple-700 bg-purple-50 border-purple-200', dot: 'bg-purple-500' },
};

const STATUS_FILTERS = [
  { key: 'All', label: 'All Sales' },
  { key: 'Completed', label: 'Completed Orders' },
  { key: 'Cancelled', label: 'Cancelled Orders' },
  { key: 'Returned', label: 'Returned Orders' },
  { key: 'Lab Pending', label: 'Lab Pending' },
  { key: 'Repair', label: 'Repair Orders' },
  { key: 'Exchange', label: 'Exchange Orders' },
];

const ITEMS_PER_PAGE = 8;

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

  const [selectedBranch, setSelectedBranch] = useState(queryBranch || 'All');
  const [selectedStatus, setSelectedStatus] = useState(queryStatus || 'All');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSale, setSelectedSale] = useState(null);

  useEffect(() => {
    if (queryBranch) setSelectedBranch(queryBranch);
    if (queryStatus) setSelectedStatus(queryStatus);
  }, [queryBranch, queryStatus]);

  // Reset page when filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBranch, selectedStatus, searchTerm]);

  // Extract unique branches from mock data
  const branches = useMemo(() => {
    const set = new Set(SALES_MOCK_DATA.map(s => s.branchName));
    return ['All', ...Array.from(set)];
  }, []);

  // Filtered sales
  const filteredSales = useMemo(() => {
    let result = SALES_MOCK_DATA;

    if (selectedBranch !== 'All') {
      result = result.filter(s => s.branchName === selectedBranch);
    }

    if (selectedStatus !== 'All') {
      result = result.filter(s => s.status === selectedStatus);
    }

    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      result = result.filter(s =>
        s.orderId.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.productName.toLowerCase().includes(q)
      );
    }

    return result;
  }, [selectedBranch, selectedStatus, searchTerm]);

  // Paginated list
  const paginatedSales = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSales.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSales, currentPage]);

  // KPIs
  const kpis = useMemo(() => {
    const list = selectedBranch === 'All' ? SALES_MOCK_DATA : SALES_MOCK_DATA.filter(s => s.branchName === selectedBranch);
    const revenue = list.filter(s => s.status !== 'Cancelled').reduce((sum, s) => sum + s.totalAmount, 0);
    const activeCount = list.filter(s => s.status === 'Lab Pending' || s.status === 'Repair').length;
    return {
      revenue,
      totalOrders: list.length,
      completed: list.filter(s => s.status === 'Completed').length,
      active: activeCount
    };
  }, [selectedBranch]);

  const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans overflow-x-hidden">
      {/* Breadcrumb + Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 space-x-2">
          <span className="hover:text-slate-800 cursor-pointer transition-colors">Dashboard</span>
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
        
        {/* Branch Selector */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <label className="text-sm font-semibold text-slate-600 flex items-center gap-1.5 whitespace-nowrap">
            <Store className="w-4 h-4 text-slate-400" /> Branch:
          </label>
          <div className="relative w-full sm:w-60">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white appearance-none"
            >
              {branches.map(b => (
                <option key={b} value={b}>{b === 'All' ? 'All Branches' : b}</option>
              ))}
            </select>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md w-full">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer, product, order ID..."
            className="w-full pl-10 pr-9 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white transition-all placeholder:text-slate-400 shadow-sm"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors">
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
      {filteredSales.length === 0 ? (
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
          <div className="hidden lg:block border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Order ID', 'Customer Name', 'Product Name', 'Branch', 'Staff', 'Order Date', 'Amount', 'Status'].map(col => (
                    <th key={col} className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedSales.map((sale) => (
                  <tr
                    key={sale.id}
                    onClick={() => setSelectedSale(sale)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4 text-xs font-mono font-bold text-slate-700 whitespace-nowrap">{sale.orderId}</td>
                    <td className="px-5 py-4 font-bold text-slate-900">{sale.customerName}</td>
                    <td className="px-5 py-4 font-medium text-slate-600 max-w-[200px] truncate">{sale.productName}</td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-500 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg">
                        <Store className="w-3.5 h-3.5 text-slate-400" />
                        {sale.branchName}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-600 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {sale.staffName}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-500 whitespace-nowrap">{fmtDate(sale.orderDate)}</td>
                    <td className="px-5 py-4 text-sm font-black text-slate-900">{fmt(sale.totalAmount)}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={sale.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Card View */}
          <div className="lg:hidden space-y-3">
            {paginatedSales.map((sale) => (
              <div
                key={sale.id}
                onClick={() => setSelectedSale(sale)}
                className="bg-white p-4 border border-slate-100 rounded-2xl shadow-sm space-y-3 cursor-pointer hover:border-slate-350 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400">{sale.orderId}</span>
                    <h3 className="font-bold text-slate-950 text-sm mt-0.5">{sale.customerName}</h3>
                  </div>
                  <StatusBadge status={sale.status} />
                </div>
                
                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Product:</span> {sale.productName}
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block">Branch</span>
                    <span className="font-bold text-slate-700">{sale.branchName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Staff</span>
                    <span className="font-bold text-slate-700">{sale.staffName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Date</span>
                    <span className="font-bold text-slate-700">{fmtDate(sale.orderDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Amount</span>
                    <span className="font-black text-slate-900">{fmt(sale.totalAmount)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <Pagination
            totalItems={filteredSales.length}
            itemsPerPage={ITEMS_PER_PAGE}
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
