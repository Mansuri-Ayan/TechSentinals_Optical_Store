import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Store, Clock, Calendar, CheckCircle, AlertTriangle,
  X, Package, User, CreditCard, Truck, ChevronRight, RefreshCw, BarChart3, Trash2
} from 'lucide-react';
import { deleteSaleApi } from '../../api/sales/sales.api';
import { useStoreStore } from '../../store/store';
import { useLabOrders } from '../../hooks/useLabOrders';
import { useStores } from '../../hooks/useStores';
import { useQueryClient } from '@tanstack/react-query';
import { updateSaleApi } from '../../api/customer/customer.api';
import { toast } from 'react-toastify';
import Pagination from '../../components/shared/Pagination';
import InventoryDetailDrawer from '../../components/admin/InventoryDetailDrawer';
import { useLabs } from '../../hooks/useLabs';
import { usePagePermissions } from '../../hooks/usePermissions';

// Status color configurations
const STATUS_CFG = {
  'Confirmed': { color: 'text-blue-700 bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
  'Sent To Lab': { color: 'text-sky-700 bg-sky-50 border-sky-200', dot: 'bg-sky-500' },
  'Ready For Pickup': { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  'Delivered': { color: 'text-slate-600 bg-slate-100 border-slate-200', dot: 'bg-slate-400' },
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
  const perms = usePagePermissions('lab_orders');
  const { stores } = useStores();

  // 2. Filter States
  const [activeTab, setActiveTab] = useState(queryTab || 'queue'); // 'queue', 'pending', or 'ready'
  const [selectedBranch, setSelectedBranch] = useState(queryBranch || 'All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const itemsPerPage = 6;
  const queryClient = useQueryClient();

  // Fetch active labs list
  const { labs } = useLabs({ active_status: 'active', paginate: false });

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
  }, [activeTab, selectedBranch, dateFrom, dateTo, searchTerm]);

  // Fetch orders from backend API
  const { orders, total, pages, kpis, isLoading } = useLabOrders({
    page: currentPage,
    limit: itemsPerPage,
    storeId: selectedBranch,
    tab: activeTab,
    search: searchTerm,
    dateFrom,
    dateTo
  });

  // Status transitions handler
  const handleUpdateStatus = async (id, newStatus, extraData = {}) => {
    try {
      const payload = { lab_status: newStatus, ...extraData };
      if (newStatus === 'Sent To Lab') {
        payload.sent_to_lab_date = new Date().toISOString().split('T')[0];
        payload.expected_delivery_date = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // +4 days
      }
      await updateSaleApi(id, payload);
      queryClient.invalidateQueries({ queryKey: ['labOrders'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success(`Order advanced to "${newStatus}"`);

      // Sync state for open details drawer if updated
      if (selectedOrder && selectedOrder.id === id) {
        setSelectedOrder(prev => {
          const updated = { ...prev, status: newStatus, ...extraData };
          if (newStatus === 'Sent To Lab') {
            updated.sentDate = payload.sent_to_lab_date;
            updated.expectedDeliveryDate = payload.expected_delivery_date;
          }
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status.');
    }
  };

  // Define tab categories
  const queueStatuses = ['Confirmed'];
  const pendingStatuses = ['Sent To Lab'];
  const readyStatuses = ['Ready For Pickup'];



  const handleDeleteOrder = async (orderId, invoiceNumber) => {
    if (window.confirm(`Are you sure you want to delete order ${invoiceNumber || ''}? This will permanently delete the order and restore all inventory stock batches & product units.`)) {
      try {
        await deleteSaleApi(orderId);
        queryClient.invalidateQueries({ queryKey: ['labOrders'] });
        queryClient.invalidateQueries({ queryKey: ['sales'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        toast.success('Order cancelled and all inventory rolled back successfully.');
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Failed to delete order.');
      }
    }
  };

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
          onClick={() => setActiveTab('queue')}
          className={`pb-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'queue'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          Order Queue
          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 font-semibold">
            {kpis.queueCount || 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'pending'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          Lab Pending
          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 font-semibold">
            {kpis.pendingCount || 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('ready')}
          className={`pb-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'ready'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          Ready for Delivery
          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 font-semibold">
            {kpis.readyCount || 0}
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
                {stores && stores.filter(s => s.id !== 'admin' && s.store_name !== 'All Store' && s.name !== 'All Store').map(store => (
                  <option key={store.id} value={store.id}>{store.store_name}</option>
                ))}
              </select>
            </div>
          )}



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
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
          <p className="text-slate-500 text-sm mt-4">Loading lab orders...</p>
        </div>
      ) : total === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <Package className="w-6 h-6 text-slate-300" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No orders found</h3>
          <p className="text-slate-500 text-sm mb-4">No custom spectacles orders match your filter criteria.</p>
          <button
            onClick={() => {
              setSelectedBranch('All');
              setActiveTab('queue');
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
                  {activeTab === 'pending' ? (
                    // Lab pending headers
                    ['Order ID', 'Customer Name', 'Product', 'Lab Name', 'Sent Date', 'Expected Delivery', 'Status', ''].map(col => (
                      <th key={col} className={`px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap ${col === '' ? 'text-right' : 'text-left'}`}>
                        {col}
                      </th>
                    ))
                  ) : (
                    // Queue & Ready headers
                    ['Order ID', 'Customer Name', 'Mobile Number', 'Billing Account', 'Product Name', 'Store', 'Order Date', 'Total', 'Paid', 'Due', 'Status', ''].map(col => (
                      <th key={col} className={`px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap ${col === '' ? 'text-right' : 'text-left'}`}>
                        {col}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer text-slate-800"
                  >
                    {activeTab === 'pending' ? (
                      // Lab columns
                      <>
                        <td className="px-5 py-4 text-xs font-mono font-bold text-slate-700 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span>{order.orderId}</span>
                            {order.is_exchange_sale && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 uppercase tracking-wider self-start">
                                Exchange
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-900">{order.customerName}</td>
                        <td className="px-5 py-4 font-medium text-slate-600 max-w-[150px] truncate">{order.productName}</td>
                        <td className="px-5 py-4 font-semibold text-slate-700">{order.labName || '—'}</td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-500 whitespace-nowrap">{order.sentDate ? fmtDate(order.sentDate) : '—'}</td>
                        <td className="px-5 py-4 text-xs font-bold text-slate-800 whitespace-nowrap">{order.expectedDeliveryDate ? fmtDate(order.expectedDeliveryDate) : '—'}</td>
                        <td className="px-5 py-4">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteOrder(order.id, order.orderId);
                            }}
                            className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center border border-red-100"
                            title="Delete Order & Rollback Stock"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </>
                    ) : (
                      // Queue and Ready columns
                      <>
                        <td className="px-5 py-4 text-xs font-mono font-bold text-slate-700 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span>{order.orderId}</span>
                            {order.is_exchange_sale && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 uppercase tracking-wider self-start">
                                Exchange
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900">{order.customerName}</div>
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-500 whitespace-nowrap">
                          <div>{order.customerPhone}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-700 whitespace-nowrap">
                            {order.billedOnAccountOf ? order.billedOnAccountOf.name : (order.customerName || 'Direct Customer')}
                          </div>
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-600 max-w-[150px] truncate">{order.productName}</td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-500 whitespace-nowrap">{order.branchName || order.storeName}</td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-500 whitespace-nowrap">{fmtDate(order.orderDate)}</td>
                        <td className="px-5 py-4 text-sm font-black text-slate-900">{fmt(order.totalAmount)}</td>
                        <td className="px-5 py-4 text-sm font-bold text-emerald-600">{fmt(order.paidAmount)}</td>
                        <td className="px-5 py-4 text-sm font-bold text-red-500">{fmt(order.dueAmount)}</td>
                        <td className="px-5 py-4">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteOrder(order.id, order.orderId);
                            }}
                            className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center border border-red-100"
                            title="Delete Order & Rollback Stock"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
            {orders.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="bg-white p-4 border border-slate-100 rounded-2xl shadow-sm space-y-3 cursor-pointer hover:border-slate-350 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-slate-400">{order.orderId}</span>
                      {order.is_exchange_sale && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 uppercase tracking-wider">
                          Exchange
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-950 text-sm mt-0.5">{order.customerName}</h3>
                    {order.billedOnAccountOf && (
                      <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                        Billed to: {order.billedOnAccountOf.name}
                      </p>
                    )}
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
                    <span className="font-bold text-slate-700 truncate block">{order.branchName || order.storeName}</span>
                  </div>
                  {activeTab === 'pending' ? (
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
                  ) : (
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
            totalItems={total}
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
        activeTab={activeTab}
        labs={labs}
        canUpdateStatus={perms?.canUpdate !== false}
      />

    </div>
  );
};

export default LabOrders;
