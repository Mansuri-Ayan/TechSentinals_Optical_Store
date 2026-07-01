import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  ChevronLeft, ChevronRight, User, Mail, Phone, MapPin,
  ShoppingBag, Calendar, Eye, Clock, AlertTriangle,
  CheckCircle, TrendingUp, Info, FileText, History, Plus, Wrench, X
} from 'lucide-react';
import { useCustomer, useCustomerMutations } from '../../hooks/useCustomers';
import { useStoreStaff } from '../../hooks/useStaff';
import { useRepairs, useRepairMutations } from '../../hooks/useRepairs';
import { useAuthStore, useStoreStore } from '../../store/store';
import { toast } from 'react-toastify';
import AddOpticalModal from '../../components/shopkeeper/AddOpticalModal';
import AddOrderModal from '../../components/shopkeeper/AddOrderModal';
import PermissionGuard from '../../components/shared/PermissionGuard';
import { usePagePermissions } from '../../hooks/usePermissions';

/* ── Helpers ── */
const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const getDiffStr = (newVal, oldVal) => {
  if (newVal === '' || oldVal === '' || newVal === undefined || oldVal === undefined) return '—';
  const diff = Number(newVal) - Number(oldVal);
  if (diff === 0) return 'No change';
  return diff > 0 ? `+${diff.toFixed(2)}D` : `${diff.toFixed(2)}D`;
};

const CUSTOMER_STATUS_CFG = {
  Active:   'text-emerald-700 bg-emerald-50 border-emerald-200',
  Inactive: 'text-slate-600 bg-slate-100 border-slate-200',
  VIP:      'text-amber-700 bg-amber-50 border-amber-200',
};

const TABS = [
  { id: 'info',         label: 'Info',         icon: Info     },
  { id: 'orders',       label: 'Orders',       icon: ShoppingBag },
  { id: 'prescription', label: 'Prescription', icon: Eye      },
  { id: 'history',      label: 'History',      icon: History   },
  { id: 'warranty',     label: 'Warranty Claims', icon: Wrench   },
];

const HISTORY_ICONS = {
  'Customer Created':      { icon: User,        color: 'bg-blue-50 text-blue-600 border-blue-200'    },
  'Eye Test Completed':    { icon: Eye,         color: 'bg-purple-50 text-purple-600 border-purple-200' },
  'Prescription Updated':  { icon: FileText,    color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  'New Order Created':     { icon: ShoppingBag, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  'Order Delivered':       { icon: CheckCircle, color: 'bg-green-50 text-green-600 border-green-200' },
  'Customer Visited Store':{ icon: MapPin,      color: 'bg-amber-50 text-amber-600 border-amber-200' },
  'Order Status Updated':  { icon: Clock,       color: 'bg-blue-50 text-blue-600 border-blue-200' },
  'Payment Status Updated': { icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
};

const GRAD_PALETTE = [
  'from-blue-400 to-indigo-600',
  'from-emerald-400 to-teal-600',
  'from-purple-400 to-violet-600',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-600',
  'from-cyan-400 to-sky-600',
];

const CustomerDetail = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();

  const { customer: c, isLoading } = useCustomer(customerId);
  const {
    createPrescriptionAsync,
    addSalePaymentAsync,
    updateSaleAsync,
    createManualOrderAsync
  } = useCustomerMutations(customerId);

  const [activeTab, setActiveTab] = useState('info');
  const [showOpticalModal, setShowOpticalModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);
  const [selectedClaimOrder, setSelectedClaimOrder] = useState('');

  // Fetch customer's repair records from backend (warranty claims)
  const { user } = useAuthStore();
  const { stores, selectedStore } = useStoreStore();
  const activeStoreId = selectedStore?.id || user?.store_id || c?.storeId || stores?.[0]?.id || 1;
  const { data: repairsData, isLoading: repairsLoading } = useRepairs(
    customerId ? { customer_id: customerId, limit: 50 } : {}
  );
  const claimsList = repairsData?.items?.filter(r => r.is_warranty) || [];
  const { createRepairAsync, isCreating: isSubmittingClaim } = useRepairMutations();

  const { staff } = useStoreStaff(c?.storeId || 1);

  const getCreatorName = () => {
    if (!c) return '—';
    if (c.createdBy) return c.createdBy;
    if (c.history) {
      const createdEvent = c.history.find(h => h.event === 'Customer Created');
      if (createdEvent && createdEvent.description) {
        const match = createdEvent.description.match(/created by (.+)/);
        if (match) return match[1];
      }
    }
    if (staff && staff.length > 0) {
      const index = Number(c.id || 0) % staff.length;
      const s = staff[index];
      return `${s.first_name} ${s.last_name || ''}`.trim();
    }
    return 'Rahul Sharma';
  };

  const isOrderInWarranty = (orderDate, warrantyMonths = 12) => {
    if (!orderDate || !warrantyMonths) return false;
    const expiry = new Date(orderDate);
    expiry.setMonth(expiry.getMonth() + warrantyMonths);
    return new Date() <= expiry;
  };

  const getOrderWarrantyMonths = (order) => {
    // Use product's warranty_months if available, else fallback to 12
    return order?.items?.[0]?.warrantyMonths ?? 12;
  };

  const hasActiveWarranty = (orders) => {
    if (!orders || orders.length === 0) return false;
    return orders.some(o => o.date && isOrderInWarranty(o.date, getOrderWarrantyMonths(o)));
  };

  const handleAddWarrantyClaim = async (claimData) => {
    const selectedOrder = c.orders?.find(o => String(o.id) === String(claimData.orderId));
    try {
      await createRepairAsync({
        store_id: activeStoreId,
        customer_id: Number(customerId),
        sale_id: selectedOrder?.dbId || null,
        customer_name: null,
        repair_type: 'WARRANTY_SERVICE',
        is_warranty: true,
        description: `[${claimData.claimTarget}] ${claimData.note}`,
        estimated_cost: 0,
        advance_paid: 0,
        received_date: claimData.date || new Date().toISOString().split('T')[0],
        notes: claimData.note,
      });
      setShowWarrantyModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdatePrescription = async (prescriptionData) => {
    try {
      await createPrescriptionAsync({
        customerId: Number(customerId),
        ...prescriptionData
      });
      setShowOpticalModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddOrder = async (orderData) => {
    try {
      await createManualOrderAsync({
        customerId: Number(customerId),
        payload: orderData
      });
      setShowOrderModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    const order = c.orders?.find(o => String(o.id) === String(orderId));
    if (!order) return;
    
    // Map status string: Pending, In Progress, Ready, Delivered -> PENDING, COMPLETED, etc.
    const backendStatusMap = {
      "Pending": "PENDING",
      "In Progress": "PARTIALLY_PAID",
      "Ready": "PARTIALLY_PAID",
      "Delivered": "COMPLETED",
    };
    const backendStatus = backendStatusMap[newStatus] || "PENDING";
    
    try {
      await updateSaleAsync({
        saleId: order.dbId,
        payload: { status: backendStatus }
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handlePaymentStatusChange = async (orderId, newPaymentStatus, additionalPaidAmount = 0) => {
    const order = c.orders?.find(o => String(o.id) === String(orderId));
    if (!order) return;

    try {
      if (newPaymentStatus === 'Paid') {
        await addSalePaymentAsync({
          saleId: order.dbId,
          payload: {
            amount: Number(order.remainingAmount),
            payment_method: 'CASH',
            remarks: 'Full payment balance closure'
          }
        });
      } else if (newPaymentStatus === 'Partial') {
        await addSalePaymentAsync({
          saleId: order.dbId,
          payload: {
            amount: Number(additionalPaidAmount),
            payment_method: 'CASH',
            remarks: 'Instalment cash receipt'
          }
        });
      } else if (newPaymentStatus === 'Unpaid') {
        alert('To mark a sale as unpaid, please cancel the sale or contact an admin.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!c) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto text-center font-sans">
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 max-w-md mx-auto">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-1">Customer Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">The customer profile you are looking for is missing.</p>
          <Link to="/shopkeeper/customers" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  const fName = c.firstName || c.first_name || '';
  const lName = c.lastName || c.last_name || '';
  const fullName = `${fName} ${lName}`.trim() || 'Unknown Customer';
  const initials = fName ? fName[0].toUpperCase() : (lName ? lName[0].toUpperCase() : 'C');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">
      {/* Breadcrumbs */}
      <div className="mb-6">
        <div className="flex items-center text-sm text-slate-500 font-semibold mb-3 space-x-2 flex-wrap">
          <Link to="/shopkeeper/dashboard" className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <Link to="/shopkeeper/customers" className="hover:text-slate-800 transition-colors">Customers</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-extrabold truncate max-w-[150px] sm:max-w-xs">{fullName}</span>
        </div>
      </div>

      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 sm:mb-8 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => navigate('/shopkeeper/customers')}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex-shrink-0 cursor-pointer"
            title="Back to list"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-md flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight truncate max-w-[200px] sm:max-w-md lg:max-w-xl">
                  {fullName}
                </h1>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${CUSTOMER_STATUS_CFG[c.status] || CUSTOMER_STATUS_CFG.Active}`}>
                  {c.status}
                </span>
              </div>
              <p className="text-slate-555 mt-1 text-xs sm:text-sm font-bold truncate">
                CUST-{String(c.id).slice(-6)} &middot; {c.city}, {c.state}
              </p>
            </div>
          </div>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto justify-end flex-wrap sm:flex-nowrap">
          <PermissionGuard permission="repairs:create">
            <button
              onClick={() => {
                setSelectedClaimOrder('');
                setShowWarrantyModal(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 whitespace-nowrap cursor-pointer"
            >
              <Wrench className="w-4 h-4" />
              Claim Warranty
            </button>
          </PermissionGuard>
          <PermissionGuard permission="customers:update">
            <button
              onClick={() => setShowOpticalModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 whitespace-nowrap cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              Add Optical Information
            </button>
          </PermissionGuard>
          <PermissionGuard permission="sales:create">
            <button
              onClick={() => setShowOrderModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Order
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          { label: 'Total Orders', value: c.totalOrders, icon: ShoppingBag, color: 'text-blue-700 bg-blue-50 border-blue-200' },
          { label: 'Last Visit', value: fmtDate(c.lastVisit), icon: Calendar, color: 'text-purple-700 bg-purple-50 border-purple-200' },
          { label: 'Total Purchase', value: fmt(c.totalAmount), icon: TrendingUp, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
          { label: 'Outstanding Balance', value: fmt(c.outstandingBalance || 0), icon: AlertTriangle, color: 'text-amber-700 bg-amber-50 border-amber-200' },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className={`p-3 sm:p-5 rounded-2xl border ${kpi.color} space-y-1.5 sm:space-y-3 transition-transform hover:-translate-y-0.5`}>
              <div className="flex items-center justify-between gap-1">
                <p className="text-[10px] sm:text-xs font-bold opacity-75 truncate">{kpi.label}</p>
                <div className="p-1.5 sm:p-2 rounded-xl bg-white/70 shadow-sm flex-shrink-0"><Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></div>
              </div>
              <p className="text-base sm:text-2xl font-black text-slate-900 leading-none">{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-100 overflow-x-auto hide-scrollbar pb-px">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-bold text-sm whitespace-nowrap transition-all -mb-px ${
                isActive
                  ? 'text-slate-900 border-slate-900'
                  : 'text-slate-400 border-transparent hover:text-slate-700 hover:border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 lg:p-8">

        {/* ── INFO TAB ── */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: User, label: 'First Name', value: fName },
                { icon: User, label: 'Last Name', value: lName },
                { icon: Mail, label: 'Email Address', value: c.email || '—' },
                { icon: Phone, label: 'Phone Number', value: c.phone },
                { icon: Calendar, label: 'Date of Birth', value: fmtDate(c.dateOfBirth) },
                { icon: User, label: 'Gender', value: c.gender || '—' },
                { icon: User, label: 'Registered By (Staff)', value: getCreatorName() },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-4 p-5 bg-slate-50 border border-slate-100 rounded-2xl transition-all hover:bg-slate-100/50">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <item.icon className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{item.label}</p>
                    <p className="text-sm sm:text-base font-bold text-slate-800 break-all">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Address Card */}
            <div className="p-5 sm:p-6 bg-slate-50 border border-slate-100 rounded-2xl relative overflow-hidden transition-all hover:bg-slate-100/50">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-slate-500" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Address</p>
              </div>
              {c.address && (
                <p className="text-sm font-semibold text-slate-700 mb-4">{c.address}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[['City', c.city || '—'], ['State', c.state || '—'], ['Pincode', c.pincode || '—']].map(([lbl, val]) => (
                  <div key={lbl} className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{lbl}</p>
                    <p className="text-sm sm:text-base font-bold text-slate-800">{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Remark & Meta */}
            {c.remark && (
              <div className="p-5 bg-amber-50/50 border border-amber-200 rounded-2xl">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Remark</p>
                <p className="text-sm font-medium text-amber-900">{c.remark}</p>
              </div>
            )}

            <div className="flex items-center gap-3 text-xs text-slate-400 font-bold px-1">
              <span>Customer Since: {fmtDate(c.customerSince)}</span>
              <span>&middot;</span>
              <span>Last Visit: {fmtDate(c.lastVisit)}</span>
              <span>&middot;</span>
              <span>Status: <span className={c.status === 'VIP' ? 'text-amber-600' : c.status === 'Active' ? 'text-emerald-600' : 'text-slate-500'}>{c.status}</span></span>
            </div>
          </div>
        )}

        {/* ── ORDERS TAB ── */}
        {activeTab === 'orders' && (
          <div>
            {!c.orders?.length ? (
              <div className="text-center py-16 text-slate-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                <p className="font-bold text-base text-slate-700">No orders recorded</p>
                <p className="text-xs text-slate-400 mt-1">Orders will appear here once placed.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table with editable status selects */}
                <div className="hidden md:block border border-slate-100 rounded-xl overflow-x-auto shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-left">
                        {['Product', 'Order ID', 'Qty', 'Unit Price', 'Total Amount', 'Order Date', 'Warranty', 'Method', 'Order Status', 'Payment Status'].map(col => (
                          <th key={col} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {c.orders.map((order, idx) => {
                        const productName = order.items?.[0]?.productName || order.frameName || 'Optical Items';
                        const qty = order.items?.[0]?.quantity || order.quantity || 1;
                        const unitPrice = order.items?.[0]?.price || order.price || (order.amount / qty);
                        const paymentMethod = order.paymentMethod || 'Cash';
                        const paymentStatus = order.paymentStatus || 'Paid';
                        const grad = GRAD_PALETTE[idx % GRAD_PALETTE.length];

                        return (
                          <tr key={order.id} className="hover:bg-blue-50/40 transition-colors">
                            {/* Product Info */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center flex-shrink-0 bg-slate-50">
                                  {order.productImage ? (
                                    <img src={order.productImage} alt={productName} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-extrabold text-xs`}>
                                      {productName[0]}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 text-xs sm:text-sm leading-tight">{productName}</p>
                                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{order.brand || 'Vision product'}</p>
                                </div>
                              </div>
                            </td>
                            {/* Order ID */}
                            <td className="px-4 py-3 text-xs font-mono font-bold text-slate-700">{order.id}</td>
                            {/* Quantity */}
                            <td className="px-4 py-3 text-slate-750 font-bold">{qty}</td>
                            {/* Unit Price */}
                            <td className="px-4 py-3 font-semibold text-slate-600">{fmt(unitPrice)}</td>
                            {/* Total Amount */}
                            <td className="px-4 py-3 font-bold text-slate-900">{fmt(order.amount)}</td>
                            {/* Order Date */}
                            <td className="px-4 py-3 text-slate-500 font-semibold">{fmtDate(order.date)}</td>
                            {/* Warranty */}
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1 items-start">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  isOrderInWarranty(order.date, getOrderWarrantyMonths(order))
                                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                    : 'text-slate-600 bg-slate-105 border-slate-200'
                                }`}>
                                  {isOrderInWarranty(order.date, getOrderWarrantyMonths(order)) ? 'In Warranty' : 'Out of Warranty'}
                                </span>
                                {isOrderInWarranty(order.date, getOrderWarrantyMonths(order)) && (
                                  <PermissionGuard permission="repairs:create">
                                    <button
                                      onClick={() => {
                                        setSelectedClaimOrder(order.id);
                                        setShowWarrantyModal(true);
                                      }}
                                      className="text-amber-600 hover:text-amber-800 font-bold text-[10px] flex items-center gap-0.5 cursor-pointer"
                                    >
                                      <Wrench className="w-2.5 h-2.5" /> Claim Warranty
                                    </button>
                                  </PermissionGuard>
                                )}
                              </div>
                            </td>
                            {/* Method */}
                            <td className="px-4 py-3 font-bold text-slate-600 text-xs">{paymentMethod}</td>
                            {/* Order Status (Dropdown) */}
                            <td className="px-4 py-3">
                              <select
                                value={order.status || 'Pending'}
                                onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer transition-all"
                              >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Ready">Ready</option>
                                <option value="Delivered">Delivered</option>
                              </select>
                            </td>
                            {/* Payment Status (Dropdown) */}
                            <td className="px-4 py-3">
                              <select
                                value={paymentStatus}
                                onChange={(e) => {
                                  const status = e.target.value;
                                  if (status === 'Partial') {
                                    const outAmt = order.remainingAmount ?? (order.amount - (order.receivedAmount || 0));
                                    const input = window.prompt(`Enter additional amount paid (Outstanding balance: ₹${outAmt.toLocaleString('en-IN')}):`);
                                    if (input === null) return;
                                    const parsed = Number(input) || 0;
                                    if (parsed <= 0) {
                                      alert('Please enter a valid amount greater than 0.');
                                      return;
                                    }
                                    handlePaymentStatusChange(order.id, 'Partial', parsed);
                                  } else {
                                    handlePaymentStatusChange(order.id, status);
                                  }
                                }}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-850 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer transition-all"
                              >
                                <option value="Paid">Paid</option>
                                <option value="Partial">Partial</option>
                                <option value="Unpaid">Unpaid</option>
                              </select>
                              {paymentStatus === 'Partial' && (
                                <p className="text-[9px] text-amber-600 font-bold mt-1">
                                  Bal: ₹{(order.remainingAmount || 0).toLocaleString('en-IN')}
                                </p>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards with Dropdowns */}
                <div className="md:hidden space-y-3">
                  {c.orders.map((order, idx) => {
                    const productName = order.items?.[0]?.productName || order.frameName || 'Optical Items';
                    const qty = order.items?.[0]?.quantity || order.quantity || 1;
                    const unitPrice = order.items?.[0]?.price || order.price || (order.amount / qty);
                    const paymentMethod = order.paymentMethod || 'Cash';
                    const paymentStatus = order.paymentStatus || 'Paid';
                    const grad = GRAD_PALETTE[idx % GRAD_PALETTE.length];

                    return (
                      <div key={order.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-mono text-xs font-bold text-slate-500">{order.id}</p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{fmtDate(order.date)}</p>
                          </div>
                          <span className="text-[10px] bg-slate-100 font-bold px-2 py-0.5 rounded text-slate-500">
                            {paymentMethod}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 py-2 border-t border-b border-slate-50">
                          <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center flex-shrink-0 bg-slate-50">
                            {order.productImage ? (
                              <img src={order.productImage} alt={productName} className="w-full h-full object-cover" />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-xs`}>
                                {productName[0]}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-xs truncate">{productName}</p>
                            <p className="text-[10px] text-slate-400 truncate">{order.brand || 'Vision product'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs border-b border-slate-50 pb-2">
                          <div>
                            <p className="text-slate-400 font-semibold mb-0.5">Quantity & Price</p>
                            <p className="font-bold text-slate-700">{qty} × {fmt(unitPrice)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-semibold mb-0.5">Total Amount</p>
                            <p className="font-bold text-slate-900">{fmt(order.amount)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-semibold mb-0.5">Warranty</p>
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isOrderInWarranty(order.date, getOrderWarrantyMonths(order))
                                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                : 'text-slate-600 bg-slate-105 border-slate-205'
                            }`}>
                              {isOrderInWarranty(order.date, getOrderWarrantyMonths(order)) ? 'In Warranty' : 'Out of Warranty'}
                            </span>
                          </div>
                          {isOrderInWarranty(order.date, getOrderWarrantyMonths(order)) && (
                            <div>
                              <p className="text-slate-400 font-semibold mb-0.5">Action</p>
                              <PermissionGuard permission="repairs:create">
                                <button
                                  onClick={() => {
                                    setSelectedClaimOrder(order.id);
                                    setShowWarrantyModal(true);
                                  }}
                                  className="text-amber-600 hover:text-amber-800 font-bold text-xs flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Wrench className="w-3 h-3" /> Claim Warranty
                                </button>
                              </PermissionGuard>
                            </div>
                          )}
                        </div>

                        {/* Interactive fields for Mobile */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div className="flex-1">
                            <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Order Status</label>
                            <select
                              value={order.status || 'Pending'}
                              onChange={(e) => handleStatusChange(order.id, e.target.value)}
                              className="w-full px-2 py-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none"
                            >
                              <option value="Pending">Pending</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Ready">Ready</option>
                              <option value="Delivered">Delivered</option>
                            </select>
                          </div>

                          <div className="flex-1">
                            <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Payment Status</label>
                            <select
                              value={paymentStatus}
                              onChange={(e) => {
                                const status = e.target.value;
                                if (status === 'Partial') {
                                  const outAmt = order.remainingAmount ?? (order.amount - (order.receivedAmount || 0));
                                  const input = window.prompt(`Enter additional amount paid (Outstanding balance: ₹${outAmt.toLocaleString('en-IN')}):`);
                                  if (input === null) return;
                                  const parsed = Number(input) || 0;
                                  if (parsed <= 0) {
                                    alert('Please enter a valid amount greater than 0.');
                                    return;
                                  }
                                  handlePaymentStatusChange(order.id, 'Partial', parsed);
                                } else {
                                  handlePaymentStatusChange(order.id, status);
                                }
                              }}
                              className="w-full px-2 py-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none"
                            >
                              <option value="Paid">Paid</option>
                              <option value="Partial">Partial</option>
                              <option value="Unpaid">Unpaid</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── PRESCRIPTION TAB ── */}
        {activeTab === 'prescription' && (
          <div className="space-y-6">
            {!c.prescription ? (
              <div className="text-center py-16 text-slate-400">
                <Eye className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                <p className="font-bold text-base text-slate-700">No prescription on record</p>
                <p className="text-xs text-slate-400 mt-1">Prescription details will appear here after an eye test.</p>
              </div>
            ) : (
              <>
                {/* Current Prescription Cards */}
                <div className="p-5 sm:p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-50">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                      <Eye className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Right Eye (OD)</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {[
                      ['SPH', c.prescription.rightEye?.sph],
                      ['CYL', c.prescription.rightEye?.cyl],
                      ['Axis', c.prescription.rightEye?.axis !== undefined && c.prescription.rightEye?.axis !== 0 && c.prescription.rightEye?.axis !== '' ? `${c.prescription.rightEye.axis}°` : '—'],
                      ['Add Power', c.prescription.rightEye?.addPower],
                      ['PD', c.prescription.rightEye?.pd ? `${c.prescription.rightEye.pd} mm` : '—'],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-100 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                        <p className="text-base sm:text-lg font-black text-slate-800">
                          {value !== undefined && value !== '' && value !== '—' && typeof value === 'number'
                            ? (value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2))
                            : (value ?? '—')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Left Eye Card */}
                <div className="p-5 sm:p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-50">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Eye className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Left Eye (OS)</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {[
                      ['SPH', c.prescription.leftEye?.sph],
                      ['CYL', c.prescription.leftEye?.cyl],
                      ['Axis', c.prescription.leftEye?.axis !== undefined && c.prescription.leftEye?.axis !== 0 && c.prescription.leftEye?.axis !== '' ? `${c.prescription.leftEye.axis}°` : '—'],
                      ['Add Power', c.prescription.leftEye?.addPower],
                      ['PD', c.prescription.leftEye?.pd ? `${c.prescription.leftEye.pd} mm` : '—'],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-100 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                        <p className="text-base sm:text-lg font-black text-slate-800">
                          {value !== undefined && value !== '' && value !== '—' && typeof value === 'number'
                            ? (value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2))
                            : (value ?? '—')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Information Card */}
                <div className="p-5 sm:p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-50">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-purple-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Additional Information</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      ['Lens Type', c.prescription.lensType],
                      ['Lens Material', c.prescription.lensMaterial],
                      ['Lens Coating', c.prescription.lensCoating],
                      ['Frame Preference', c.prescription.framePreference],
                      ['Doctor Name', c.prescription.doctorName],
                      ['Prescription Date', fmtDate(c.prescription.prescriptionDate)],
                      ['Expiry Date', fmtDate(c.prescription.expiryDate)],
                      ['Recommended Usage', c.prescription.recommendedUsage],
                    ].map(([lbl, val]) => (
                      <div key={lbl} className="bg-slate-50 p-4 rounded-xl border border-slate-100/60 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{lbl}</p>
                        <p className="text-sm font-bold text-slate-800">{val || '—'}</p>
                      </div>
                    ))}
                  </div>
                  {c.prescription.notes && (
                    <div className="mt-4 p-4 bg-amber-50/50 border border-amber-100 rounded-xl">
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Prescription Notes / Remarks</p>
                      <p className="text-sm text-amber-900 font-medium">{c.prescription.notes}</p>
                    </div>
                  )}
                </div>

                {/* Prescription History and Drift Comparisons */}
                {c.prescriptionHistory && c.prescriptionHistory.length > 1 && (
                  <div className="mt-8 space-y-6">
                    <div className="flex items-center gap-2 mb-2 pb-3 border-b border-slate-100">
                      <History className="w-5 h-5 text-slate-500" />
                      <h3 className="text-sm font-extrabold text-slate-850 uppercase tracking-widest">
                        Prescription Drift History
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {c.prescriptionHistory.slice(1).map((pres, idx) => {
                        const newerPres = c.prescriptionHistory[idx];
                        const odSphDiff = getDiffStr(newerPres.rightEye?.sph, pres.rightEye?.sph);
                        const odCylDiff = getDiffStr(newerPres.rightEye?.cyl, pres.rightEye?.cyl);
                        const osSphDiff = getDiffStr(newerPres.leftEye?.sph, pres.leftEye?.sph);
                        const osCylDiff = getDiffStr(newerPres.leftEye?.cyl, pres.leftEye?.cyl);

                        return (
                          <div key={idx} className="bg-slate-50 rounded-2xl border border-slate-150 p-5 space-y-4">
                            <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-200 pb-2.5">
                              <div>
                                <p className="text-xs font-bold text-slate-800">
                                  Prescription logged on {new Date(pres.prescriptionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                                <p className="text-[10px] text-slate-450 font-bold mt-0.5">Recorded by Dr. {pres.doctorName || 'Optician'}</p>
                              </div>
                              <span className="text-[9px] bg-slate-200 text-slate-600 font-mono font-bold px-2 py-0.5 rounded">
                                STEP {c.prescriptionHistory.length - 1 - idx}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Right Eye */}
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                                <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Right Eye (OD)
                                </p>
                                <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-500">
                                  <div>SPH: <span className="text-slate-850">{pres.rightEye?.sph !== '' && pres.rightEye?.sph !== undefined ? pres.rightEye.sph : '—'}</span></div>
                                  <div>CYL: <span className="text-slate-850">{pres.rightEye?.cyl !== '' && pres.rightEye?.cyl !== undefined ? pres.rightEye.cyl : '—'}</span></div>
                                  <div>AXIS: <span className="text-slate-850">{pres.rightEye?.axis !== '' && pres.rightEye?.axis !== undefined ? `${pres.rightEye.axis}°` : '—'}</span></div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[9px] border-t border-slate-100 pt-2 font-bold mt-1">
                                  <div className="text-slate-400">SPH Drift: <span className={odSphDiff.includes('+') ? 'text-emerald-600' : odSphDiff.includes('-') ? 'text-red-500' : 'text-slate-700'}>{odSphDiff}</span></div>
                                  <div className="text-slate-400">CYL Drift: <span className={odCylDiff.includes('+') ? 'text-emerald-600' : odCylDiff.includes('-') ? 'text-red-500' : 'text-slate-700'}>{odCylDiff}</span></div>
                                </div>
                              </div>

                              {/* Left Eye */}
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                                <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Left Eye (OS)
                                </p>
                                <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-500">
                                  <div>SPH: <span className="text-slate-850">{pres.leftEye?.sph !== '' && pres.leftEye?.sph !== undefined ? pres.leftEye.sph : '—'}</span></div>
                                  <div>CYL: <span className="text-slate-850">{pres.leftEye?.cyl !== '' && pres.leftEye?.cyl !== undefined ? pres.leftEye.cyl : '—'}</span></div>
                                  <div>AXIS: <span className="text-slate-850">{pres.leftEye?.axis !== '' && pres.leftEye?.axis !== undefined ? `${pres.leftEye.axis}°` : '—'}</span></div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[9px] border-t border-slate-100 pt-2 font-bold mt-1">
                                  <div className="text-slate-400">SPH Drift: <span className={osSphDiff.includes('+') ? 'text-emerald-600' : osSphDiff.includes('-') ? 'text-red-500' : 'text-slate-700'}>{osSphDiff}</span></div>
                                  <div className="text-slate-400">CYL Drift: <span className={osCylDiff.includes('+') ? 'text-emerald-600' : osCylDiff.includes('-') ? 'text-red-500' : 'text-slate-700'}>{osCylDiff}</span></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' && (
          <div>
            {!c.history?.length ? (
              <div className="text-center py-16 text-slate-400">
                <Clock className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                <p className="font-bold text-base text-slate-700">No activity recorded</p>
                <p className="text-xs text-slate-400 mt-1">Customer activity will appear here as events occur.</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 sm:left-6 top-0 bottom-0 w-0.5 bg-slate-105" />

                <div className="space-y-1">
                  {c.history.map((item, idx) => {
                    const cfg = HISTORY_ICONS[item.event] || { icon: Clock, color: 'bg-slate-50 text-slate-600 border-slate-200' };
                    const Icon = cfg.icon;
                    return (
                      <div key={idx} className="relative flex items-start gap-4 pl-0 py-3 group">
                        {/* Timeline dot */}
                        <div className={`relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-110 ${cfg.color}`}>
                          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 bg-slate-50 border border-slate-100 rounded-2xl p-4 hover:bg-slate-105 transition-colors">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <p className="text-sm font-bold text-slate-900">{item.event}</p>
                            <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">{fmtDate(item.date)}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 font-medium">{item.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── WARRANTY CLAIMS TAB ── */}
        {activeTab === 'warranty' && (
          <div className="space-y-6">
            {repairsLoading ? (
              <div className="text-center py-10 text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-3" />
                <p className="text-sm font-semibold">Loading warranty claims...</p>
              </div>
            ) : !claimsList || claimsList.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Wrench className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                <p className="font-bold text-base text-slate-700">No warranty claims logged</p>
                <p className="text-xs text-slate-400 mt-1">Submit a claim using the button above or on a specific order.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {claimsList.map(claim => (
                  <div key={claim.id} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl relative overflow-hidden transition-all hover:bg-slate-100/50">
                    <div className="flex justify-between items-start mb-3 border-b border-slate-200/60 pb-2">
                      <div>
                        <span className="text-[10px] bg-slate-200 text-slate-750 font-mono font-bold px-2 py-0.5 rounded">
                          {claim.repair_number}
                        </span>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">Sale Ref: <span className="font-mono text-slate-600 font-bold">{claim.sale_invoice_number || 'General Claim'}</span></p>
                      </div>
                      <span className="text-xs text-slate-400 font-semibold">{fmtDate(claim.received_date || claim.created_at)}</span>
                    </div>
                    
                    <div className="space-y-2 text-xs">
                      <div>
                        <p className="text-slate-400 font-semibold mb-0.5">Repair Type</p>
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px]">
                          {claim.repair_type?.replace('_', ' ') || 'WARRANTY SERVICE'}
                        </span>
                        <span className={`ml-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          claim.status === 'COMPLETED' || claim.status === 'DELIVERED'
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : claim.status === 'IN_PROGRESS'
                            ? 'text-blue-700 bg-blue-50 border-blue-200'
                            : 'text-slate-700 bg-slate-50 border-slate-200'
                        }`}>{claim.status?.replace('_', ' ')}</span>
                      </div>
                      <div>
                        <p className="text-slate-400 font-semibold mb-0.5">Description & Notes</p>
                        <p className="text-slate-700 font-medium whitespace-pre-wrap">{claim.description || claim.notes || 'No details provided.'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Prescription Modal */}
      <AddOpticalModal
        isOpen={showOpticalModal}
        prescription={c.prescription}
        onClose={() => setShowOpticalModal(false)}
        onSubmit={handleUpdatePrescription}
      />

      {/* Add Order Modal */}
      <AddOrderModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        onSubmit={handleAddOrder}
      />

      {/* Warranty Claim Modal */}
      <AddWarrantyClaimModal
        isOpen={showWarrantyModal}
        onClose={() => setShowWarrantyModal(false)}
        onSubmit={handleAddWarrantyClaim}
        orders={c.orders || []}
        initialOrderId={selectedClaimOrder}
      />
    </div>
  );
};

/* ── WARRANTY CLAIM MODAL COMPONENT ── */
const AddWarrantyClaimModal = ({ isOpen, onClose, onSubmit, orders, initialOrderId }) => {
  const [form, setForm] = useState({
    orderId: '',
    date: '',
    claimTarget: 'Both',
    note: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setForm({
        orderId: initialOrderId || (orders?.[0]?.id || ''),
        date: new Date().toISOString().split('T')[0],
        claimTarget: 'Both',
        note: '',
      });
      setErrors({});
    }
  }, [isOpen, initialOrderId, orders]);

  if (!isOpen) return null;

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.orderId) e.orderId = 'Please select an order';
    if (!form.date) e.date = 'Claim date is required';
    if (!form.note.trim()) e.note = 'Repair note / reason is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  };

  const inputCls = (f) =>
    `w-full px-3 py-2.5 text-sm font-medium rounded-xl border transition-all focus:outline-none focus:ring-4 bg-white ${
      errors[f]
        ? 'border-red-400 focus:ring-red-100 focus:border-red-500'
        : 'border-slate-200 focus:ring-blue-500/10 focus:border-blue-500 placeholder:text-slate-400'
    }`;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-3 sm:p-4 animate-fade-in font-sans">
      <div className="relative bg-white w-full sm:max-w-lg rounded-2xl shadow-2xl flex flex-col border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50 border border-amber-100">
              <Wrench className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Claim Warranty</h2>
              <p className="text-xs text-slate-500">File a new warranty repair or service claim</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-105 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-5 sm:px-6 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                  Select Order <span className="text-red-500">*</span>
                </label>
                <select value={form.orderId} onChange={e => set('orderId', e.target.value)} className={inputCls('orderId')}>
                  <option value="">Choose order...</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.id} ({o.items?.[0]?.productName || o.frameName || 'Order'}) - {o.date}
                    </option>
                  ))}
                </select>
                {errors.orderId && <p className="text-xs text-red-500 mt-1">{errors.orderId}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                  Claim Date <span className="text-red-500">*</span>
                </label>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls('date')} />
                {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                Claim Target <span className="text-red-500">*</span>
              </label>
              <select value={form.claimTarget} onChange={e => set('claimTarget', e.target.value)} className={inputCls('claimTarget')}>
                <option value="Lens">Lens Replacement Only</option>
                <option value="Frame">Frame Repair Only</option>
                <option value="Both">Both (Lens & Frame)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                Repair Details & Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.note}
                onChange={e => set('note', e.target.value)}
                placeholder="Describe what needs repair or service..."
                className={`${inputCls('note')} h-24 resize-none`}
              />
              {errors.note && <p className="text-xs text-red-500 mt-1">{errors.note}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 flex-shrink-0 bg-slate-50">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2 bg-[#0A0F1F] hover:bg-slate-800">
              <Plus className="w-4 h-4" />
              File Claim
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default CustomerDetail;
