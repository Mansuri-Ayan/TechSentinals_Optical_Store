import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useRoleContext } from '../../hooks/useRoleContext';
import { 
  ArrowLeft, Beaker, Phone, Mail, Calendar, ChevronRight, 
  Package, Search, X, Loader2, RefreshCw
} from 'lucide-react';
import { useLabDetails } from '../../hooks/useLabDetails';
import Pagination from '../../components/shared/Pagination';
import StatusBadge from '../../components/shared/StatusBadge';
import InventoryDetailDrawer from '../../components/admin/InventoryDetailDrawer';
import { updateSaleApi } from '../../api/customer/customer.api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';

const ITEMS_PER_PAGE = 6;

const LabDetail = () => {
  const { id } = useParams();
  const { storeId, buildPath, isPathAdmin } = useRoleContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Set document title for SEO
  useEffect(() => {
    document.title = 'Lab Details | Optical Store';
  }, []);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    }, 450);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const {
    lab,
    orders,
    total,
    pages,
    isLoading,
    isFetching,
    isError,
  } = useLabDetails(id, {
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    search: searchTerm,
    status: activeTab
  });

  // Action status update callback for InventoryDetailDrawer
  const handleUpdateStatus = async (orderId, newStatus, extraData = {}) => {
    try {
      const payload = { lab_status: newStatus, ...extraData };
      if (newStatus === 'Sent To Lab') {
        payload.sent_to_lab_date = new Date().toISOString().split('T')[0];
        payload.expected_delivery_date = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }
      await updateSaleApi(orderId, payload);
      queryClient.invalidateQueries({ queryKey: ['labDetails', id] });
      queryClient.invalidateQueries({ queryKey: ['labOrders'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success(`Order advanced to "${newStatus}"`);

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({
          ...prev,
          status: newStatus,
          ...extraData,
          sentDate: newStatus === 'Sent To Lab' ? payload.sent_to_lab_date : prev.sentDate,
          expectedDeliveryDate: newStatus === 'Sent To Lab' ? payload.expected_delivery_date : prev.expectedDeliveryDate
        }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update order status.');
    }
  };

  const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans overflow-x-hidden">
      
      {/* Breadcrumb + Back Action */}
      <div className="mb-6">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-4 space-x-2">
          <Link to={buildPath('dashboard')} className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4" />
          <button onClick={() => navigate(-1)} className="hover:text-slate-800 transition-colors">Labs</button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-900 font-semibold truncate">{lab?.name || 'Lab Details'}</span>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-505 hover:text-slate-800 transition-colors bg-white border border-slate-200 py-1.5 px-3 rounded-xl shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Labs
        </button>
      </div>

      {/* Lab Information Banner */}
      {isLoading && !lab ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-3xl border border-slate-100 shadow-sm mb-6">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : isError ? (
        <div className="bg-white border border-dashed border-red-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-sm mb-6">
          <h3 className="text-base font-bold text-red-700 mb-1">Failed to load lab partner details</h3>
          <p className="text-red-500 text-sm">Please refresh the page and try again.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-fade-in relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 bg-gradient-to-br from-emerald-50 to-emerald-100/30 rounded-full opacity-60"></div>
          
          <div className="flex items-center gap-5 min-w-0 z-10">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/10 flex items-center justify-center font-bold text-emerald-600 text-3xl flex-shrink-0">
              {lab?.name ? lab.name[0]?.toUpperCase() : '?'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{lab?.name}</h1>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  lab?.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${lab?.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  {lab?.is_active ? 'Active Partner' : 'Inactive'}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-slate-400 animate-pulse" /> {lab?.contact_number}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-slate-400" /> {lab?.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" /> Partnered: {fmtDate(lab?.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders List Section */}
      <div className="space-y-4">
        
        {/* Navigation / Filter Tabs */}
        <div className="flex border-b border-slate-200 mb-6 gap-6 overflow-x-auto hide-scrollbar whitespace-nowrap">
          {['All', 'In Lab', 'Delivered'].map(tabName => (
            <button
              key={tabName}
              onClick={() => setActiveTab(tabName)}
              className={`pb-4 text-sm font-bold border-b-2 transition-all ${
                activeTab === tabName
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tabName === 'All' ? 'All Orders' : tabName}
            </button>
          ))}
        </div>

        {/* Sticky Filters & Search Section */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="text-sm text-slate-500 font-bold">
            Assigned Orders List ({total})
          </div>
          
          <div className="relative max-w-md w-full">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search Order ID, Customer Name, Phone..."
              className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white transition-all placeholder:text-slate-400 shadow-sm"
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        {isLoading && orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
            <p className="text-slate-500 text-sm mt-4">Loading assigned orders...</p>
          </div>
        ) : total === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
              <Package className="w-6 h-6 text-slate-300" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No orders found</h3>
            <p className="text-slate-505 text-sm">No custom lab orders match your filter criteria.</p>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in relative">
            {isFetching && (
              <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-2xl">
                <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
              </div>
            )}

            {/* Desktop Table */}
            <div className="hidden md:block border border-slate-100 rounded-2xl overflow-x-auto shadow-sm bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Order ID', 'Customer Name', 'Mobile Number', 'Product Name', 'Order Date', 'Total', 'Due', 'Status'].map(col => (
                      <th key={col} className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer text-slate-800"
                    >
                      <td className="px-5 py-4 text-xs font-mono font-bold text-slate-700 whitespace-nowrap">{order.orderId}</td>
                      <td className="px-5 py-4 font-bold text-slate-900">{order.customerName}</td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-500 whitespace-nowrap">{order.customerPhone}</td>
                      <td className="px-5 py-4 font-medium text-slate-600 max-w-[200px] truncate">{order.productName}</td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-505 whitespace-nowrap">{fmtDate(order.orderDate)}</td>
                      <td className="px-5 py-4 text-sm font-black text-slate-900">{fmt(order.totalAmount)}</td>
                      <td className="px-5 py-4 text-sm font-bold text-red-500">{fmt(order.dueAmount)}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm active:scale-[0.99] transition-all flex flex-col gap-3 cursor-pointer"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-extrabold text-slate-600">{order.orderId}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{order.customerName}</h4>
                    <p className="text-xs font-medium text-slate-500 mt-1">{order.productName}</p>
                  </div>
                  <div className="flex justify-between items-end border-t border-slate-50 pt-2.5 mt-1">
                    <span className="text-[11px] text-slate-400 font-semibold">{fmtDate(order.orderDate)}</span>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 font-semibold block">Balance Due</span>
                      <span className="text-sm font-black text-red-500">{fmt(order.dueAmount)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-6">
              <Pagination
                totalItems={total}
                itemsPerPage={ITEMS_PER_PAGE}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        )}

      </div>

      {/* Reusable Drawer Slider */}
      <InventoryDetailDrawer
        item={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onUpdateStatus={handleUpdateStatus}
        activeTab="queue" // Default mapping
        labs={[lab].filter(Boolean)}
      />

    </div>
  );
};

export default LabDetail;
