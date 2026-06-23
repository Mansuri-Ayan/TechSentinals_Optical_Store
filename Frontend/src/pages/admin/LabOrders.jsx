import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Store, Clock, Calendar, CheckCircle, AlertTriangle,
  X, Package, User, CreditCard, Truck, ChevronRight, RefreshCw, BarChart3
} from 'lucide-react';
import { useStoreStore } from '../../store/store';
import Pagination from '../../components/shared/Pagination';
import InventoryDetailDrawer from '../../components/admin/InventoryDetailDrawer';
import { LAB_ORDERS_MOCK_DATA } from '../../data/labOrdersData';

// Static branches list to allow frontend-only manual testing
const STATIC_STORES = [
  { id: '1', store_name: 'Main Branch' },
  { id: '2', store_name: 'Branch 2' },
  { id: '3', store_name: 'Branch 3' },
];

// Status color configurations
const STATUS_CFG = {
  'Confirmed':        { color: 'text-blue-700 bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
  'Advance Paid':     { color: 'text-indigo-700 bg-indigo-50 border-indigo-200', dot: 'bg-indigo-500' },
  'Waiting For Lab':  { color: 'text-purple-700 bg-purple-50 border-purple-200', dot: 'bg-purple-500' },
  'Processing':       { color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  'Sent To Lab':      { color: 'text-sky-700 bg-sky-50 border-sky-200', dot: 'bg-sky-500' },
  'In Production':    { color: 'text-orange-700 bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
  'Quality Check':    { color: 'text-pink-700 bg-pink-50 border-pink-200', dot: 'bg-pink-500' },
  'Ready For Pickup': { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  'Delivered':        { color: 'text-slate-600 bg-slate-100 border-slate-200', dot: 'bg-slate-400' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.Confirmed;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
};

const LabOrders = () => {
  const [searchParams] = useSearchParams();
  const queryBranch = searchParams.get('branch');
  const queryTab = searchParams.get('tab');

  const { selectedStore } = useStoreStore();
  const stores = STATIC_STORES;

  // 1. Core State
  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('lab_orders_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error reading lab orders from localStorage:", e);
      }
    }
    return LAB_ORDERS_MOCK_DATA;
  });

  useEffect(() => {
    localStorage.setItem('lab_orders_list', JSON.stringify(orders));
  }, [orders]);

  // 2. Filter States
  const [activeTab, setActiveTab] = useState(queryTab || 'queue'); // 'queue' or 'pending'
  const [selectedBranch, setSelectedBranch] = useState(queryBranch || 'All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const itemsPerPage = 6;

  // Sync with global store selection
  useEffect(() => {
    if (selectedStore && selectedStore.id !== 'admin') {
      setSelectedBranch(String(selectedStore.id));
    }
  }, [selectedStore]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Reset page when filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedBranch, selectedStatus, dateFrom, dateTo, searchTerm]);

  // Status transitions handler
  const handleUpdateStatus = (id, newStatus) => {
    setOrders(prev => prev.map(order => {
      if (order.id === id) {
        const updated = { ...order, status: newStatus };
        if (newStatus === 'Sent To Lab') {
          updated.sentDate = new Date().toISOString().split('T')[0];
          updated.expectedDeliveryDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // +4 days
        }
        return updated;
      }
      return order;
    }));

    // Sync state for open details drawer if updated
    if (selectedOrder && selectedOrder.id === id) {
      setSelectedOrder(prev => {
        const updated = { ...prev, status: newStatus };
        if (newStatus === 'Sent To Lab') {
          updated.sentDate = new Date().toISOString().split('T')[0];
          updated.expectedDeliveryDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }
        return updated;
      });
    }
  };

  // Define tab categories
  const queueStatuses = ['Confirmed', 'Advance Paid', 'Waiting For Lab', 'Processing'];
  const pendingStatuses = ['Sent To Lab', 'In Production', 'Quality Check', 'Ready For Pickup'];

  const statusOptions = useMemo(() => {
    return activeTab === 'queue' ? queueStatuses : pendingStatuses;
  }, [activeTab]);

  // Reset status filter if tab changes and status doesn't match the new tab
  useEffect(() => {
    if (selectedStatus !== 'All' && !statusOptions.includes(selectedStatus)) {
      setSelectedStatus('All');
    }
  }, [activeTab, statusOptions, selectedStatus]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Tab categorization
      const matchesTab = activeTab === 'queue' 
        ? queueStatuses.includes(order.status)
        : pendingStatuses.includes(order.status);

      if (!matchesTab) return false;

      // Branch filter
      if (selectedBranch !== 'All' && String(order.storeId) !== String(selectedBranch)) return false;

      // Status filter
      if (selectedStatus !== 'All' && order.status !== selectedStatus) return false;

      // Date range filter
      if (dateFrom && order.orderDate < dateFrom) return false;
      if (dateTo && order.orderDate > dateTo) return false;

      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const matchesId = order.orderId.toLowerCase().includes(term);
        const matchesCustomer = order.customerName.toLowerCase().includes(term);
        const matchesProduct = order.productName.toLowerCase().includes(term);
        const matchesPhone = order.customerPhone.includes(term);
        if (!matchesId && !matchesCustomer && !matchesProduct && !matchesPhone) return false;
      }

      return true;
    });
  }, [orders, activeTab, selectedBranch, selectedStatus, dateFrom, dateTo, searchTerm]);

  // Paginated orders
  const paginatedOrders = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredOrders, currentPage]);

  const totalItems = filteredOrders.length;

  // KPI Calculations
  const kpis = useMemo(() => {
    const currentTabOrders = orders.filter(order => 
      activeTab === 'queue' 
        ? queueStatuses.includes(order.status)
        : pendingStatuses.includes(order.status)
    );
    const inProduction = currentTabOrders.filter(o => o.status === 'In Production').length;
    const readyForPickup = currentTabOrders.filter(o => o.status === 'Ready For Pickup').length;
    const totalAmount = currentTabOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    return {
      totalCount: currentTabOrders.length,
      inProduction,
      readyForPickup,
      totalValuation: totalAmount
    };
  }, [orders, activeTab]);

  const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans overflow-x-hidden">
      
      {/* Breadcrumb + Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 space-x-2">
          <span className="hover:text-slate-800 cursor-pointer transition-colors">Dashboard</span>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-semibold">Orders</span>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight">
              Orders
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm sm:text-base">
              Track custom spectacles production, optical laboratory work, and dispatch queues.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          { label: activeTab === 'queue' ? 'Queue Orders' : 'Lab Pending Orders', value: kpis.totalCount, icon: Clock, color: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
          { label: 'In Production', value: kpis.inProduction, icon: RefreshCw, color: 'text-amber-700 bg-amber-50 border-amber-100' },
          { label: 'Ready For Delivery', value: kpis.readyForPickup, icon: CheckCircle, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
          { label: 'Total Valuation', value: fmt(kpis.totalValuation), icon: Package, color: 'text-blue-700 bg-blue-50 border-blue-100' },
        ].map((kpi, idx) => (
          <div key={idx} className="p-4 sm:p-5 rounded-2xl border bg-white shadow-sm flex items-center justify-between gap-3 border-slate-100">
            <div>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 mb-1">{kpi.label}</p>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">{kpi.value}</h3>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.color}`}>
              <kpi.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-6 overflow-x-auto hide-scrollbar whitespace-nowrap">
        <button
          onClick={() => { setActiveTab('queue'); setSelectedStatus('All'); }}
          className={`pb-4 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'queue'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Order Queue
          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 font-semibold">
            {orders.filter(o => queueStatuses.includes(o.status)).length}
          </span>
        </button>
        <button
          onClick={() => { setActiveTab('pending'); setSelectedStatus('All'); }}
          className={`pb-4 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'pending'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Lab Pending
          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 font-semibold">
            {orders.filter(o => pendingStatuses.includes(o.status)).length}
          </span>
        </button>
      </div>

      {/* Sticky Filters & Search Section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between animate-fade-in">
        
        {/* Filters Wrapper */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3.5">
          
          {/* Branch Filter */}
          {selectedStore?.id === 'admin' && (
            <div className="flex items-center justify-between sm:justify-start gap-2 border border-slate-100 sm:border-0 p-2 sm:p-0 rounded-xl">
              <label className="text-xs sm:text-sm font-semibold text-slate-655 whitespace-nowrap flex items-center gap-1">
                <Store className="w-4 h-4 text-slate-400" /> Branch:
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-1.5 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white"
              >
                <option value="All">All Branches</option>
                {stores.filter(s => s.id !== 'admin' && s.store_name !== 'All Store' && s.name !== 'All Store').map(store => (
                  <option key={store.id} value={store.id}>{store.store_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center justify-between sm:justify-start gap-2 border border-slate-100 sm:border-0 p-2 sm:p-0 rounded-xl">
            <label className="text-xs sm:text-sm font-semibold text-slate-655 whitespace-nowrap flex items-center gap-1">
              <Clock className="w-4 h-4 text-slate-400" /> Status:
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white"
            >
              <option value="All">All Statuses</option>
              {statusOptions.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Date Filters */}
          <div className="flex items-center justify-between sm:justify-start gap-2 border border-slate-100 sm:border-0 p-2 sm:p-0 rounded-xl flex-wrap">
            <label className="text-xs sm:text-sm font-semibold text-slate-655 flex items-center gap-1">
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
                  className="p-1.5 text-slate-455 hover:text-red-500 transition-colors bg-slate-50 rounded-lg hover:bg-red-50"
                  title="Clear date filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative max-w-md w-full">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search Order ID, Customer, Phone..."
            className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white transition-all placeholder:text-slate-400 shadow-sm"
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Table / Grid Content */}
      {totalItems === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <Package className="w-6 h-6 text-slate-300" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No orders found</h3>
          <p className="text-slate-500 text-sm mb-4">No custom spectacles orders match your filter criteria.</p>
          <button
            onClick={() => {
              setSelectedBranch('All');
              setSelectedStatus('All');
              setDateFrom('');
              setDateTo('');
              setSearchInput('');
              setSearchTerm('');
            }}
            className="text-emerald-600 font-bold hover:text-emerald-700 transition-colors text-sm"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          
          {/* Desktop Table View */}
          <div className="hidden md:block border border-slate-100 rounded-2xl overflow-x-auto shadow-sm bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {activeTab === 'queue' ? (
                    // Queue headers
                    ['Order ID', 'Customer Name', 'Mobile Number', 'Product Name', 'Store', 'Order Date', 'Total', 'Paid', 'Due', 'Status'].map(col => (
                      <th key={col} className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {col}
                      </th>
                    ))
                  ) : (
                    // Lab pending headers
                    ['Order ID', 'Customer Name', 'Product', 'Lab Name', 'Sent Date', 'Expected Delivery', 'Status'].map(col => (
                      <th key={col} className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {col}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer text-slate-800"
                  >
                    {activeTab === 'queue' ? (
                      // Queue columns
                      <>
                        <td className="px-5 py-4 text-xs font-mono font-bold text-slate-700 whitespace-nowrap">{order.orderId}</td>
                        <td className="px-5 py-4 font-bold text-slate-900">{order.customerName}</td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-500 whitespace-nowrap">{order.customerPhone}</td>
                        <td className="px-5 py-4 font-medium text-slate-600 max-w-[150px] truncate">{order.productName}</td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-500 whitespace-nowrap">{order.storeName}</td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-500 whitespace-nowrap">{fmtDate(order.orderDate)}</td>
                        <td className="px-5 py-4 text-sm font-black text-slate-900">{fmt(order.totalAmount)}</td>
                        <td className="px-5 py-4 text-sm font-bold text-emerald-600">{fmt(order.paidAmount)}</td>
                        <td className="px-5 py-4 text-sm font-bold text-red-500">{fmt(order.dueAmount)}</td>
                        <td className="px-5 py-4">
                          <StatusBadge status={order.status} />
                        </td>
                      </>
                    ) : (
                      // Lab columns
                      <>
                        <td className="px-5 py-4 text-xs font-mono font-bold text-slate-700 whitespace-nowrap">{order.orderId}</td>
                        <td className="px-5 py-4 font-bold text-slate-900">{order.customerName}</td>
                        <td className="px-5 py-4 font-medium text-slate-600 max-w-[150px] truncate">{order.productName}</td>
                        <td className="px-5 py-4 font-semibold text-slate-700">{order.labName || '—'}</td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-500 whitespace-nowrap">{order.sentDate ? fmtDate(order.sentDate) : '—'}</td>
                        <td className="px-5 py-4 text-xs font-bold text-slate-800 whitespace-nowrap">{order.expectedDeliveryDate ? fmtDate(order.expectedDeliveryDate) : '—'}</td>
                        <td className="px-5 py-4">
                          <StatusBadge status={order.status} />
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Card View */}
          <div className="md:hidden space-y-3">
            {paginatedOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="bg-white p-4 border border-slate-100 rounded-2xl shadow-sm space-y-3 cursor-pointer hover:border-slate-350 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400">{order.orderId}</span>
                    <h3 className="font-bold text-slate-950 text-sm mt-0.5">{order.customerName}</h3>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                
                <div className="text-xs text-slate-600 space-y-1">
                  <div><span className="font-semibold text-slate-800">Product:</span> {order.productName}</div>
                  {activeTab === 'pending' && (
                    <div><span className="font-semibold text-slate-800">Lab:</span> {order.labName || '—'}</div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block">Store</span>
                    <span className="font-bold text-slate-700 truncate block">{order.storeName}</span>
                  </div>
                  {activeTab === 'queue' ? (
                    <>
                      <div>
                        <span className="text-slate-400 font-semibold block">Total Amount</span>
                        <span className="font-black text-slate-900">{fmt(order.totalAmount)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block">Paid / Due</span>
                        <span className="font-bold text-slate-700">
                          <span className="text-emerald-600">{fmt(order.paidAmount)}</span> / <span className="text-red-500">{fmt(order.dueAmount)}</span>
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-slate-400 font-semibold block">Sent Date</span>
                        <span className="font-bold text-slate-700">{order.sentDate ? fmtDate(order.sentDate) : '—'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 font-semibold block">Expected Delivery</span>
                        <span className="font-bold text-slate-900">{order.expectedDeliveryDate ? fmtDate(order.expectedDeliveryDate) : '—'}</span>
                      </div>
                    </>
                  )}
                  <div>
                    <span className="text-slate-400 font-semibold block">Order Date</span>
                    <span className="font-bold text-slate-700">{fmtDate(order.orderDate)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <Pagination
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />

        </div>
      )}

      {/* Reuse Details Drawer */}
      <InventoryDetailDrawer
        item={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onUpdateStatus={handleUpdateStatus}
      />

    </div>
  );
};

export default LabOrders;
