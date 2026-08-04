import { useState, useEffect } from 'react';
import { createPortal as portal } from 'react-dom';
import {
  X, Package, Tag, Truck, BarChart3, DollarSign, Plus,
  Store, CheckCircle, AlertTriangle, XCircle, Image as ImageIcon, Sliders,
  User, Users, CreditCard, UserCheck, Calendar, IndianRupee, ShoppingCart,
  Receipt, FileText, RefreshCw, Shield, ThumbsUp, ThumbsDown,
  Briefcase, Clock, Phone, Mail, Pencil, Printer, Share2, Eye, Sparkles, Beaker, Search, ChevronRight, ChevronDown, List
} from 'lucide-react';
import { useCustomer } from '../../hooks/useCustomers';
import { useBillSettings } from '../../hooks/useBillSettings';
import { defaultSettings } from '../../utils/billSettings';
import { addSalePaymentApi } from '../../api/customer/customer.api';
import { toast } from 'react-toastify';
import { getSaleBillApi } from '../../api/sales/sales.api';
import { getInventoryBatchesApi } from '../../api/inventory/inventory.api';

const statusConfig = {
  'in_stock': { label: 'In Stock', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle },
  'low_stock': { label: 'Low Stock', color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500', icon: AlertTriangle },
  'out_of_stock': { label: 'Out of Stock', color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500', icon: XCircle },
};

const getStockStatus = (item) => {
  const qty = item.available_quantity ?? item.quantity ?? 0;
  if (qty === 0) return 'out_of_stock';
  const threshold = (item.reorder_level && item.reorder_level > 0)
    ? item.reorder_level
    : 10;
  if (qty <= threshold) return 'low_stock';
  return 'in_stock';
};

const categoryLabel = { frames: 'Frames', lenses: 'Lenses', other: 'Other Products' };

const formatDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtPrice = (n) => {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const DetailRow = ({ label, value, mono }) => (
  <div className="flex items-start justify-between py-2.5 border-b border-slate-50 last:border-0 gap-3">
    <span className="text-sm text-slate-500 font-medium shrink-0">{label}</span>
    <span className={`text-sm font-semibold text-slate-900 text-right break-words min-w-0 ${mono ? 'font-mono' : ''}`}>
      {value ?? '—'}
    </span>
  </div>
);

const Section = ({ icon: Icon, title, children, color = 'emerald' }) => {
  const colours = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-600',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-600',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-600',
    rose: 'bg-rose-500/10 border-rose-500/20 text-rose-600',
    slate: 'bg-slate-500/10 border-slate-500/20 text-slate-600',
    violet: 'bg-violet-500/10 border-violet-500/20 text-violet-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-50">
        <div className={`p-2 rounded-xl border ${colours[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      </div>
      <div className="px-5 pt-1 pb-2">{children}</div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   INLINE REJECTION REASON PROMPT (shown inside drawer footer)
───────────────────────────────────────────────────────── */
const RejectReasonPrompt = ({ onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) { setError('Rejection reason is required.'); return; }
    onConfirm(reason.trim());
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
          Rejection Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={3}
          value={reason}
          onChange={e => { setReason(e.target.value); setError(''); }}
          placeholder="Provide a reason for rejecting this expense..."
          className={`w-full px-3 py-2.5 text-sm font-medium border rounded-xl focus:outline-none focus:ring-4 resize-none transition-all bg-white ${error
            ? 'border-red-400 focus:ring-red-100 focus:border-red-500'
            : 'border-slate-200 focus:ring-red-500/10 focus:border-red-500'
            }`}
        />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all shadow-sm"
        >
          Confirm Rejection
        </button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   MAIN DRAWER COMPONENT
   Props: item, onClose, onApprove, onReject, isApproving, isRejecting, isLoading, canApprove, canUpdateStatus
───────────────────────────────────────────────────────── */
const InventoryDetailDrawer = ({ item, onClose, onEdit, onRestockSupplier, onApprove, onReject, isApproving, isRejecting, isLoading, onUpdateStatus, labs = [], canApprove = true, canUpdateStatus = true }) => {
  const storeId = item?.store_id || item?.storeId;
  const { settings: fetchedSettings } = useBillSettings(storeId);
  const billSettings = fetchedSettings ? {
    headerText: fetchedSettings.header_text ?? defaultSettings.headerText,
    subHeaderText: fetchedSettings.sub_header_text ?? defaultSettings.subHeaderText,
    address: fetchedSettings.address ?? defaultSettings.address,
    contactEmail: fetchedSettings.contact_email ?? defaultSettings.contactEmail,
    contactPhone: fetchedSettings.contact_phone ?? defaultSettings.contactPhone,
    gstNumber: fetchedSettings.gst_number ?? defaultSettings.gstNumber,
    logo: fetchedSettings.logo,
    qrCode: fetchedSettings.qr_code,
    showPrescription: fetchedSettings.show_prescription ?? defaultSettings.showPrescription,
    showGst: fetchedSettings.show_gst ?? defaultSettings.showGst,
    themeColor: fetchedSettings.theme_color ?? defaultSettings.themeColor,
    footerText: fetchedSettings.footer_text ?? defaultSettings.footerText,
  } : defaultSettings;

  const [showRejectPrompt, setShowRejectPrompt] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('Final payment collected at delivery');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [selectedLabId, setSelectedLabId] = useState('');
  const [selectedLabName, setSelectedLabName] = useState('');
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [labSearchTerm, setLabSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [billHtml, setBillHtml] = useState('');
  const [loadingBill, setLoadingBill] = useState(false);

  useEffect(() => {
    if (item && item.type === 'sales' && activeTab === 'bill') {
      setLoadingBill(true);
      getSaleBillApi(item.id)
        .then((res) => {
          setBillHtml(res.html_content);
        })
        .catch((err) => {
          console.error("Failed to fetch bill HTML for drawer:", err);
        })
        .finally(() => {
          setLoadingBill(false);
        });
    } else {
      setBillHtml('');
    }
  }, [item, activeTab]);

  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [expandedSkus, setExpandedSkus] = useState({});

  const toggleSkuExpand = (key) => {
    setExpandedSkus(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  useEffect(() => {
    if (item) {
      setActiveTab(item.initialTab || 'details');
      setSelectedLabId(item.labId ? String(item.labId) : '');
      setSelectedLabName(item.labName || '');
      setIsLabModalOpen(false);
      setLabSearchTerm('');

      // Fetch batches if it's an inventory record
      if (item.product_name && item.id && !item.type) {
        setLoadingBatches(true);
        const params = {};
        if (item.product_id) params.product_id = item.product_id;
        if (item.owner_type) params.owner_type = item.owner_type;
        if (item.owner_id) params.owner_id = item.owner_id;
        if (item.store === "Central Warehouse") params.warehouse_only = true;

        getInventoryBatchesApi(item.id, params)
          .then(data => {
            setBatches(data);
          })
          .catch(err => {
            console.error("Failed to load batches:", err);
            setBatches([]);
          })
          .finally(() => {
            setLoadingBatches(false);
          });
      } else {
        setBatches([]);
      }
    } else {
      setSelectedLabId('');
      setSelectedLabName('');
      setIsLabModalOpen(false);
      setLabSearchTerm('');
      setBatches([]);
    }
  }, [item]);

  // Hook to fetch customer prescription details for sales bills
  const customerIdForPrescription = item?.type === 'sales' ? item.customer_id : null;
  const { customer: customerDetails } = useCustomer(customerIdForPrescription);

  if (!item) return null;

  /* ── STAFF DRAWER ──────────────────────────────────────── */
  if (item.type === 'staff') {
    const initials = item.first_name ? item.first_name.charAt(0) : (item.name ? item.name.charAt(0) : '?');
    const formatRole = (role) => {
      if (!role) return "";
      return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    };
    const formatLastActive = (value) => {
      if (!value) return "Never";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "Never";
      return date.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };
    const fmtDateLocal = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    return portal(
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex justify-end animate-fade-in font-sans">
        <div className="absolute inset-0" onClick={onClose} aria-hidden />

        <div className="relative w-full sm:max-w-md h-full bg-slate-50 shadow-2xl flex flex-col animate-slide-up">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-slate-800 to-slate-600 flex items-center justify-center text-white font-bold text-lg shadow-inner flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 truncate">{item.first_name ? `${item.first_name} ${item.last_name}` : item.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                    {item.role}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose}
              className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors flex-shrink-0 ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status strip */}
          <div className="px-5 py-3 bg-white border-b border-slate-100 flex-shrink-0 flex items-center justify-between gap-3 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${item.is_active ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {item.is_active ? 'Active' : 'Inactive'}
            </span>
            <span className="text-xs text-slate-400 font-semibold">Joined: {fmtDateLocal(item.created_at || item.joining_date)}</span>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-4 space-y-3">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 animate-pulse">
                    <div className="h-4 bg-slate-100 rounded-full w-1/3" />
                    <div className="space-y-3">
                      <div className="h-3 bg-slate-50 rounded-full w-full" />
                      <div className="h-3 bg-slate-50 rounded-full w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <Section icon={User} title="Personal Info" color="emerald">
                  <DetailRow label="Full Name" value={item.first_name ? `${item.first_name} ${item.last_name}` : item.name} />
                  <DetailRow label="Email" value={item.email} />
                  <DetailRow label="Phone" value={item.phone || item.phone_number} />
                  <DetailRow label="Role" value={formatRole(item.role)} />
                  {item.qualification && <DetailRow label="Qualification" value={item.qualification} />}
                </Section>

                <Section icon={Briefcase} title="Employment" color="blue">
                  <DetailRow label="Store / Branch" value={item.store_name} />
                  <DetailRow label="Status" value={
                    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  } />
                  <DetailRow label="Joined" value={fmtDateLocal(item.created_at || item.joining_date)} />
                  <DetailRow label="Last Login" value={item.last_login_at ? formatLastActive(item.last_login_at) : "Never"} />
                </Section>

                <Section icon={Shield} title="Account" color="purple">
                  <DetailRow label="Username" value={item.username || item.email} mono />
                  <DetailRow label="Role ID" value={item.role_id || item.id} mono />
                  {item.permissions && <DetailRow label="Permissions" value={item.permissions.join(', ')} />}
                </Section>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 bg-white border-t border-slate-100 flex-shrink-0">
            <button onClick={onClose}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-700 transition-all shadow-md hover:shadow-lg">
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  /* ── LAB DRAWER ────────────────────────────────────────── */
  if (item.type === 'lab') {
    const initials = item.name ? item.name.charAt(0) : '?';
    const fmtDateLocal = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    return portal(
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex justify-end animate-fade-in font-sans">
        <div className="absolute inset-0" onClick={onClose} aria-hidden />

        <div className="relative w-full sm:max-w-md h-full bg-slate-50 shadow-2xl flex flex-col animate-slide-up">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-slate-800 to-slate-600 flex items-center justify-center text-white font-bold text-lg shadow-inner flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 truncate">{item.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                    Lab Partner
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose}
              className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors flex-shrink-0 ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status strip */}
          <div className="px-5 py-3 bg-white border-b border-slate-100 flex-shrink-0 flex items-center justify-between gap-3 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${item.is_active ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {item.is_active ? 'Active' : 'Inactive'}
            </span>
            <span className="text-xs text-slate-400 font-semibold">Created: {fmtDateLocal(item.created_at)}</span>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-4 space-y-3">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 animate-pulse">
                    <div className="h-4 bg-slate-100 rounded-full w-1/3" />
                    <div className="space-y-3">
                      <div className="h-3 bg-slate-50 rounded-full w-full" />
                      <div className="h-3 bg-slate-50 rounded-full w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Section icon={Beaker} title="Lab Specifications" color="emerald">
                <DetailRow label="Lab Name" value={item.name} />
                <DetailRow label="Contact Number" value={item.contact_number} />
                <DetailRow label="Email Address" value={item.email} />
              </Section>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-4 bg-white border-t border-slate-100 flex-shrink-0 space-y-2">
            <button onClick={onClose}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-700 transition-all shadow-md hover:shadow-lg">
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  /* ── LAB ORDER DRAWER ──────────────────────────────────── */
  if (item.type === 'lab_order') {
    const fmt = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';
    const fmtDate = formatDate;

    const nextStatuses = {
      'Confirmed': 'Sent To Lab',
      'Sent To Lab': 'Ready For Pickup',
      'Ready For Pickup': 'Delivered'
    };
    const nextStatus = nextStatuses[item.status];

    // Timeline steps
    const timelineSteps = [
      { key: 'Confirmed', label: 'Order Created' },
      { key: 'Sent To Lab', label: 'Sent To Lab' },
      { key: 'Ready For Pickup', label: 'Ready For Pickup' },
      { key: 'Delivered', label: 'Delivered' }
    ];

    const getStatusIndex = (status) => {
      const idx = timelineSteps.findIndex(s => s.key === status);
      return idx !== -1 ? idx : 0;
    };

    const currentStepIndex = getStatusIndex(item.status);



    const handleCollectPaymentAndDeliver = async () => {
      setIsSubmittingPayment(true);
      try {
        await addSalePaymentApi(item.id, {
          amount: Number(item.dueAmount),
          payment_method: paymentMethod,
          reference_number: referenceNumber || null,
          remarks: paymentRemarks,
        });
        toast.success(`Collected payment of ₹${item.dueAmount} successfully!`);
        setShowPaymentModal(false);
        setReferenceNumber('');
        setPaymentMethod('CASH');
        onUpdateStatus(item.id, 'Delivered');
      } catch (err) {
        console.error(err);
        toast.error(err.response?.data?.detail || 'Failed to record final payment.');
      } finally {
        setIsSubmittingPayment(false);
      }
    };

    const handleAdvanceClick = () => {
      if (nextStatus === 'Sent To Lab') {
        if (!selectedLabId) {
          toast.warning('Please select a spectacles processing lab partner.');
          return;
        }
        onUpdateStatus(item.id, nextStatus, {
          lab_id: Number(selectedLabId),
          lab_name: selectedLabName
        });
      } else if (nextStatus === 'Delivered' && Number(item.dueAmount || 0) > 0) {
        setShowPaymentModal(true);
      } else {
        onUpdateStatus(item.id, nextStatus);
      }
    };

    return portal(
      <>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex justify-end animate-fade-in font-sans">
          <div className="absolute inset-0" onClick={onClose} aria-hidden />
          <div className="relative w-full sm:max-w-md h-full bg-slate-50 shadow-2xl flex flex-col animate-slide-up">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-550 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 bg-emerald-500/10">
                  <Clock className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-900 truncate">Order Details</h2>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{item.orderId}</p>
                </div>
              </div>
              <button onClick={onClose}
                className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors flex-shrink-0 ml-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status strip */}
            <div className="px-5 py-3 bg-white border-b border-slate-100 flex-shrink-0 flex items-center justify-between">
              <div className="flex flex-col gap-1 items-start">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-emerald-250 text-emerald-700 bg-emerald-50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {item.status}
                </span>
                {item.is_exchange_sale && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 uppercase tracking-wider">
                    Exchange
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 font-semibold">Order Date: {fmtDate(item.orderDate)}</span>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-4 space-y-3">

              {/* Customer Information */}
              <Section icon={User} title="Customer Information" color="emerald">
                <DetailRow label="Customer Name" value={item.customerName} />
                <DetailRow label="Phone Number" value={item.customerPhone} />
                <DetailRow label="Address" value={item.customerAddress} />
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Billing Account</h3>
                  {item.billedOnAccountOf ? (
                    <>
                      <DetailRow label="Billed To" value={item.billedOnAccountOf.name} />
                      <DetailRow label="Billing Phone" value={item.billedOnAccountOf.phone} />
                      {item.billedOnAccountOf.address && <DetailRow label="Billing Address" value={item.billedOnAccountOf.address} />}
                    </>
                  ) : (
                    <>
                      <DetailRow label="Billed To" value={item.customerName || 'Direct Customer'} />
                      <DetailRow label="Account Type" value="Direct Customer Billing" />
                    </>
                  )}
                </div>
              </Section>

              {/* Order Information */}
              <Section icon={Package} title="Order Information" color="blue">
                <DetailRow label="Order ID" value={item.orderId} mono />
                <DetailRow label="Order Date" value={fmtDate(item.orderDate)} />
              </Section>

              {/* Purchased Items Section */}
              <Section icon={ShoppingCart} title="Purchased Items" color="blue">
                <div className="max-h-68 overflow-y-auto overflow-x-auto pr-1">
                  <table className="min-w-[750px] w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2 pr-4 font-semibold w-[35%]">Product Name</th>
                        <th className="py-2 px-2 font-semibold w-[15%]">Category</th>
                        <th className="py-2 px-2 font-semibold text-center w-[8%]">Qty</th>
                        <th className="py-2 px-2 font-semibold text-right w-[10%]">Cost</th>
                        <th className="py-2 px-2 font-semibold text-right w-[10%]">Price</th>
                        <th className="py-2 px-2 font-semibold text-right w-[10%]">Discount</th>
                        <th className="py-2 px-2 font-semibold text-right w-[10%]">Final</th>
                        <th className="py-2 pl-4 font-semibold text-right w-[12%]">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                      {item.items && item.items.map((subItem, idx) => {
                        const discountStr = subItem.discount_percent > 0
                          ? `${Number(subItem.discount_percent).toLocaleString('en-IN')}%`
                          : '₹0.00';
                        const unitDiscount = (Number(subItem.unit_price) * Number(subItem.discount_percent || 0)) / 100;
                        const finalUnitPrice = Number(subItem.unit_price) - unitDiscount;

                        return (
                          <tr key={subItem.id || idx} className="hover:bg-slate-50/50 transition-colors align-top">
                            <td className="py-3 pr-4 font-semibold text-slate-900">
                              <div>{subItem.product_name || 'Optical Item'}</div>
                              <div className="text-[10px] text-slate-450 mt-0.5 font-medium">
                                Brand: {subItem.product_brand || '—'} &middot; Catalog SKU: {subItem.product_sku || '—'}
                              </div>
                              {subItem.unit_skus && subItem.unit_skus.length > 0 && (() => {
                                const rowKey = `lab-${subItem.id || idx}`;
                                const isExpanded = !!expandedSkus[rowKey];
                                return (
                                  <div className="mt-1.5">
                                    <button
                                      onClick={() => toggleSkuExpand(rowKey)}
                                      className="inline-flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold text-indigo-750 bg-indigo-50 border border-indigo-150 hover:bg-indigo-100/70 active:bg-indigo-150 rounded transition-all cursor-pointer shadow-sm select-none"
                                    >
                                      <List className="w-2.5 h-2.5" />
                                      <span>{subItem.unit_skus.length} Unit SKUs</span>
                                      <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isExpanded && (
                                      <div className="mt-1.5 flex flex-wrap gap-1 max-w-[280px] bg-slate-50 border border-slate-200/60 p-1.5 rounded-lg animate-fade-in">
                                        {subItem.unit_skus.map((sku) => (
                                          <span key={sku} className="inline-flex items-center text-[9px] font-mono font-bold text-indigo-700 bg-white border border-indigo-100 px-1.5 py-0.5 rounded shadow-sm">
                                            {sku}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="py-3 px-2 text-slate-550">
                              <div>{subItem.product_category || '—'}</div>
                              <div className="text-[10px] text-slate-450 mt-0.5">{subItem.product_subcategory || '—'}</div>
                            </td>
                            <td className="py-3 px-2 text-center text-slate-900 font-bold">{subItem.quantity}</td>
                            <td className="py-3 px-2 text-right text-slate-600">{fmtPrice(subItem.unit_cost)}</td>
                            <td className="py-3 px-2 text-right text-slate-650">{fmtPrice(subItem.unit_price)}</td>
                            <td className="py-3 px-2 text-right text-red-500 font-bold">{discountStr}</td>
                            <td className="py-3 px-2 text-right font-bold text-slate-900">{fmtPrice(finalUnitPrice)}</td>
                            <td className="py-3 pl-4 text-right font-black text-slate-950">{fmtPrice(subItem.line_total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Section>

              {/* Prescription Information */}
              <Section icon={FileText} title="Prescription & Lens Specs" color="purple">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-1">Prescription Details</div>
                <div className="grid grid-cols-2 gap-x-4 border-b border-slate-50 pb-2">
                  <div>
                    <div className="font-bold text-slate-800 text-xs">Right Eye (OD)</div>
                    <DetailRow label="SPH" value={item.prescriptionDetails?.sphRight} />
                    <DetailRow label="CYL" value={item.prescriptionDetails?.cylRight} />
                    <DetailRow label="AXIS" value={item.prescriptionDetails?.axisRight} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-xs">Left Eye (OS)</div>
                    <DetailRow label="SPH" value={item.prescriptionDetails?.sphLeft} />
                    <DetailRow label="CYL" value={item.prescriptionDetails?.cylLeft} />
                    <DetailRow label="AXIS" value={item.prescriptionDetails?.axisLeft} />
                  </div>
                </div>
                <DetailRow label="Addition" value={item.prescriptionDetails?.addition} />
                <DetailRow label="PD" value={item.prescriptionDetails?.pd ? `${item.prescriptionDetails.pd} mm` : '—'} />

                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-3">Lens Details</div>
                <DetailRow label="Lens Type" value={item.lensDetails?.type} />
                <DetailRow label="Material" value={item.lensDetails?.material} />
                <DetailRow label="Coating" value={item.lensDetails?.coating} />
              </Section>

              {/* Payment Information */}
              <Section icon={CreditCard} title="Payment Information" color="rose">
                <DetailRow label="Subtotal" value={fmtPrice(item.subtotal)} />
                <DetailRow label="Discount" value={fmtPrice(item.discountAmount)} />
                <DetailRow label="Final Amount" value={fmtPrice(item.totalAmount)} />
                <DetailRow label="Paid Amount" value={fmtPrice(item.paidAmount)} />
                <DetailRow label="Due Amount" value={fmtPrice(item.dueAmount)} />
                <DetailRow label="Payment Status" value={
                  <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${item.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700' :
                    item.paymentStatus === 'Partially Paid' ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                    {item.paymentStatus}
                  </span>
                } />
                {item.payments && item.payments.length > 0 && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <div className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-2">Payment History</div>
                    <div className="space-y-2">
                      {item.payments.map((p, idx) => (
                        <div key={p.id || idx} className="flex justify-between items-center text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                          <div className="font-semibold text-slate-700">
                            {p.payment_method}
                            {p.reference_number && <span className="text-[10px] text-slate-400 block font-mono">Ref: {p.reference_number}</span>}
                          </div>
                          <div className="text-right">
                            <span className="font-black text-slate-900">₹{Number(p.amount).toLocaleString('en-IN')}</span>
                            <span className="text-[10px] text-slate-450 block font-medium">{fmtDate(p.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Section>

              {/* Lab Information */}
              <Section icon={Truck} title="Lab Information" color="amber">
                <DetailRow label="Lab Name" value={item.labName} />
                <DetailRow label="Sent Date" value={item.sentDate ? fmtDate(item.sentDate) : '—'} />
                <DetailRow label="Expected Delivery Date" value={item.expectedDeliveryDate ? fmtDate(item.expectedDeliveryDate) : '—'} />
                {item.status === 'Delivered' && (
                  <DetailRow label="Delivery Date" value={item.deliveryDate ? fmtDate(item.deliveryDate) : '—'} />
                )}
                <DetailRow label="Current Status" value={item.status} />
              </Section>

              {/* Order Timeline */}
              <Section icon={Calendar} title="Order Timeline" color="violet">
                <div className="relative pl-6 space-y-4 py-2">
                  {timelineSteps.map((step, idx) => {
                    const isCompleted = idx <= currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    return (
                      <div key={step.key} className="relative flex items-center gap-3">
                        {idx < timelineSteps.length - 1 && (
                          <div className={`absolute top-5 left-[-17px] w-0.5 h-6 ${idx < currentStepIndex ? 'bg-emerald-500' : 'bg-slate-200'
                            }`} />
                        )}
                        <div className={`absolute left-[-22px] w-3 h-3 rounded-full border-2 ${isCompleted ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-white border-slate-300'
                          } ${isCurrent ? 'ring-4 ring-emerald-500/20' : ''}`} />
                        <div className="flex-1">
                          <p className={`text-xs font-bold ${isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                            {step.label}
                          </p>
                          {isCurrent && (
                            <p className="text-[10px] text-emerald-600 font-semibold uppercase mt-0.5">Current Stage</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            </div>

            {/* Footer Actions */}
            <div className="px-5 py-4 bg-white border-t border-slate-100 flex-shrink-0 space-y-4">
              {onUpdateStatus && (
                <div className="space-y-3">

                  {/* Confirmed -> Sent To Lab: must show Lab Partner Selection */}
                  {item.status === 'Confirmed' && (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 mb-2 animate-fade-in">
                      <label className="block text-[10px] font-extrabold text-slate-450 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Beaker className="w-3.5 h-3.5 text-blue-600 font-bold" />
                        Select Processing Lab Partner <span className="text-red-500 font-bold">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsLabModalOpen(true)}
                        className="w-full flex items-center justify-between pl-4 pr-3 py-2 bg-white border border-slate-200 hover:border-slate-350 text-slate-850 rounded-xl text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-left"
                      >
                        <span className="truncate">{selectedLabName || '-- Choose Lab Partner --'}</span>
                        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      </button>
                    </div>
                  )}

                  {/* Render the next single transition button */}
                  {(() => {
                    const nextStatuses = {
                      'Confirmed': { key: 'Sent To Lab', label: 'Send to Processing Lab', color: 'bg-amber-600 hover:bg-amber-700 text-white shadow-md' },
                      'Sent To Lab': { key: 'Ready For Pickup', label: 'Mark Ready For Pickup', color: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' },
                      'Ready For Pickup': { key: 'Delivered', label: 'Deliver & Complete Order', color: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md' }
                    };

                    const next = nextStatuses[item.status];
                    if (!next) return null; // No status updates if already Delivered or others

                    return (
                      <button
                        type="button"
                        onClick={() => {
                          if (next.key === 'Sent To Lab') {
                            if (!selectedLabId) {
                              toast.warning('Please select a spectacles processing lab partner.');
                              return;
                            }
                            onUpdateStatus(item.id, 'Sent To Lab', {
                              lab_id: Number(selectedLabId),
                              lab_name: selectedLabName,
                              sent_to_lab_date: new Date().toISOString().split('T')[0],
                              expected_delivery_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                            });
                          } else if (next.key === 'Delivered') {
                            if (Number(item.dueAmount || 0) > 0) {
                              setShowPaymentModal(true);
                            } else {
                              onUpdateStatus(item.id, 'Delivered');
                            }
                          } else {
                            onUpdateStatus(item.id, next.key);
                          }
                        }}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${next.color}`}
                      >
                        <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
                        {next.label}
                      </button>
                    );
                  })()}
                </div>
              )}
              <button onClick={onClose}
                className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold text-xs hover:bg-slate-200 transition-all border border-slate-200">
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Lab Selection Modal */}
        {isLabModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in font-sans">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-scale-in relative">

              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Beaker className="w-5 h-5 text-blue-600 animate-pulse" /> Select Lab Partner
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Assign spectacles order to a processing laboratory</p>
                </div>
                <button
                  onClick={() => setIsLabModalOpen(false)}
                  className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search input */}
              <div className="p-6 pb-2">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search laboratory name or contact..."
                    value={labSearchTerm}
                    onChange={(e) => setLabSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm font-semibold border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white placeholder:text-slate-400 transition-all"
                  />
                  {labSearchTerm && (
                    <button
                      onClick={() => setLabSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Lab List Content */}
              <div className="p-6 pt-2 max-h-80 overflow-y-auto space-y-2.5">
                {(() => {
                  const filteredLabs = labs.filter(lab =>
                    lab.name.toLowerCase().includes(labSearchTerm.toLowerCase()) ||
                    (lab.contact_number && lab.contact_number.includes(labSearchTerm))
                  );

                  if (filteredLabs.length === 0) {
                    return (
                      <div className="py-10 text-center flex flex-col items-center justify-center">
                        <Truck className="w-8 h-8 text-slate-300 mb-2.5" />
                        <p className="text-sm font-bold text-slate-500">No matching labs found</p>
                        <p className="text-xs text-slate-400 mt-0.5">Check spelling or add a new lab partner.</p>
                      </div>
                    );
                  }

                  return filteredLabs.map(lab => {
                    const isSelected = String(lab.id) === String(selectedLabId);
                    return (
                      <div
                        key={lab.id}
                        onClick={() => {
                          setSelectedLabId(String(lab.id));
                          setSelectedLabName(lab.name);
                          setIsLabModalOpen(false);
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 group ${isSelected
                          ? 'bg-blue-50/50 border-blue-200 text-blue-900 shadow-sm'
                          : 'bg-white border-slate-100 hover:bg-slate-50/80 hover:border-slate-200 text-slate-800'
                          }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                            }`}>
                            <Store className="w-4.5 h-4.5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm truncate">{lab.name}</h4>
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                              <span className="truncate max-w-[150px]">{lab.email || 'No email'}</span>
                              <span className="text-slate-300 shrink-0">•</span>
                              <span className="shrink-0">{lab.contact_number || 'No contact'}</span>
                            </p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-200 group-hover:border-slate-300 bg-white'
                          }`}>
                          {isSelected && <svg className="w-3 h-3 fill-current stroke-[3px]" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsLabModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setIsLabModalOpen(false)}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md"
                >
                  Done
                </button>
              </div>

            </div>
          </div>
        )}

        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4 animate-fade-in font-sans">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100">
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-500" /> Collect Balance Payment
                </h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Content */}
              <div className="p-5 space-y-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                  <p className="text-xs text-emerald-700 font-semibold mb-1">Remaining Due Amount</p>
                  <h4 className="text-2xl font-black text-emerald-600">₹{Number(item.dueAmount).toLocaleString('en-IN')}</h4>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Reference Number (Optional)</label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={e => setReferenceNumber(e.target.value)}
                    placeholder="e.g. UPI Transaction ID, Card Receipt"
                    className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Remarks</label>
                  <input
                    type="text"
                    value={paymentRemarks}
                    onChange={e => setPaymentRemarks(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white"
                  />
                </div>
              </div>
              {/* Actions */}
              <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2 text-sm font-semibold text-slate-650 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={isSubmittingPayment}
                  onClick={handleCollectPaymentAndDeliver}
                  className="flex-1 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingPayment ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>Collect & Deliver</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </>,
      document.body
    );
  }

  /* ── SALES DRAWER ──────────────────────────────────────── */
  if (item.type === 'sales') {

    const handleWhatsAppShare = () => {
      const cleanPhone = (item.customerPhone || '').replace(/\D/g, '');
      const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      const shareText = `Dear ${item.customerName || 'Customer'},\nHere is your Optical Invoice from ${billSettings.headerText}.\nInvoice No: ${item.orderId}\nDate: ${item.orderDate}\nTotal Amount: ₹${Number(item.totalAmount).toLocaleString('en-IN')}\nOutstanding Due: ₹${Number(item.dueAmount || 0).toLocaleString('en-IN')}\nStatus: ${item.paymentStatus}\nThank you for choosing us!`;
      const url = `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodeURIComponent(shareText)}`;
      window.open(url, '_blank');
    };

    return portal(
      <div id="sales-detail-drawer-overlay" className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex justify-end animate-fade-in font-sans">
        <div className="absolute inset-0" onClick={onClose} aria-hidden />

        {/* CSS style injection to optimize browser printing of the drawer bill */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #print-drawer-bill, #print-drawer-bill * {
              visibility: visible;
            }
            #sales-detail-drawer-overlay {
              position: static !important;
              display: block !important;
              width: 100% !important;
              height: auto !important;
              background: transparent !important;
              backdrop-filter: none !important;
            }
            #sales-detail-drawer-content {
              position: static !important;
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              background: transparent !important;
              box-shadow: none !important;
              transform: none !important;
            }
            #print-drawer-bill {
              position: absolute;
              left: 0;
              top: 0;
              width: 100% !important;
              max-width: 100% !important;
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        <div id="sales-detail-drawer-content" className="relative w-full sm:max-w-md h-full bg-slate-50 shadow-2xl flex flex-col animate-slide-up">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 truncate">Sale Details</h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{item.orderId}</p>
              </div>
            </div>
            <button onClick={onClose}
              className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors flex-shrink-0 ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub tabs inside drawer */}
          <div className="flex bg-white px-5 border-b border-slate-100 flex-shrink-0 no-print">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-3.5 text-xs font-bold text-center border-b-2 transition-all cursor-pointer ${activeTab === 'details'
                ? 'border-slate-900 text-slate-900 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
            >
              Details Info
            </button>
            <button
              onClick={() => setActiveTab('bill')}
              className={`flex-1 py-3.5 text-xs font-bold text-center border-b-2 transition-all cursor-pointer ${activeTab === 'bill'
                ? 'border-slate-900 text-slate-900 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
            >
              Printable Bill
            </button>
          </div>

          {/* Status badge strip (only for Details tab) */}
          {activeTab === 'details' && (
            <div className="px-5 py-3 bg-white border-b border-slate-100 flex-shrink-0 flex items-center justify-between no-print animate-fade-in">
              <div className="flex flex-col gap-1 items-start">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  item.status === 'Completed' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                  item.status === 'Cancelled' ? 'text-slate-600 bg-slate-100 border-slate-200' :
                  item.status === 'Returned'  ? 'text-red-700 bg-red-50 border-red-200' :
                  'text-amber-700 bg-amber-50 border-amber-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    item.status === 'Completed' ? 'bg-emerald-500' :
                    item.status === 'Cancelled' ? 'bg-slate-400' :
                    item.status === 'Returned'  ? 'bg-red-500' :
                    'bg-amber-500'
                  }`} />
                  {item.status}
                </span>
                {item.is_exchange_sale && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 uppercase tracking-wider">
                    Exchange
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 font-semibold">Order Date: {item.orderDate}</span>
            </div>
          )}

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-4">

            {/* ── DETAILS TAB CONTENT ── */}
            {activeTab === 'details' && (
              <div className="space-y-3 animate-fade-in no-print">
                <Section icon={User} title="Customer Information" color="emerald">
                  <DetailRow label="Customer Name" value={item.customerName} />
                  <DetailRow label="Phone Number" value={item.customerPhone} />
                  <DetailRow label="Address" value={item.customerAddress} />
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Billing Account</h3>
                    {item.billedOnAccountOf ? (
                      <>
                        <DetailRow label="Billed To" value={item.billedOnAccountOf.name} />
                        <DetailRow label="Billing Phone" value={item.billedOnAccountOf.phone} />
                        {item.billedOnAccountOf.email && <DetailRow label="Billing Email" value={item.billedOnAccountOf.email} />}
                        {item.billedOnAccountOf.address && <DetailRow label="Billing Address" value={item.billedOnAccountOf.address} />}
                      </>
                    ) : (
                      <>
                        <DetailRow label="Billed To" value={item.customerName || 'Direct Customer'} />
                        <DetailRow label="Account Type" value="Direct Customer Billing" />
                      </>
                    )}
                  </div>
                </Section>
                <Section icon={CreditCard} title="Payment Information" color="rose">
                  <DetailRow label="Subtotal" value={fmtPrice(item.subtotal)} />
                  <DetailRow label="Discount" value={fmtPrice(item.discountAmount)} />
                  <DetailRow label="Final Amount" value={fmtPrice(item.totalAmount)} />
                  <DetailRow label="Paid Amount" value={fmtPrice(item.paidAmount)} />
                  <DetailRow label="Due Amount" value={fmtPrice(item.dueAmount)} />
                  <DetailRow label="Payment Status" value={
                    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${item.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700' :
                      item.paymentStatus === 'Partially Paid' ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                      {item.paymentStatus}
                    </span>
                  } />
                  <DetailRow label="Payment Method" value={item.paymentMethod} />
                  {item.payments && item.payments.length > 0 && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <div className="text-xs font-bold text-slate-455 uppercase tracking-wider mb-2">Payment History</div>
                      <div className="space-y-2">
                        {item.payments.map((p, idx) => (
                          <div key={p.id || idx} className="flex justify-between items-center text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                            <div className="font-semibold text-slate-700">
                              {p.payment_method}
                              {p.reference_number && <span className="text-[10px] text-slate-400 block font-mono">Ref: {p.reference_number}</span>}
                            </div>
                            <div className="text-right">
                              <span className="font-black text-slate-900">₹{Number(p.amount).toLocaleString('en-IN')}</span>
                              <span className="text-[10px] text-slate-455 block font-medium">{formatDate(p.created_at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Section>
                {/* Purchased Items Section */}
                <Section icon={ShoppingCart} title="Purchased Items" color="blue">
                  <div className="max-h-68 overflow-y-auto overflow-x-auto pr-1">
                    <table className="min-w-[750px] w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2 pr-4 font-semibold w-[35%]">Product Name</th>
                          <th className="py-2 px-2 font-semibold w-[15%]">Category</th>
                          <th className="py-2 px-2 font-semibold text-center w-[8%]">Qty</th>
                          <th className="py-2 px-2 font-semibold text-right w-[10%]">Cost</th>
                          <th className="py-2 px-2 font-semibold text-right w-[10%]">Price</th>
                          <th className="py-2 px-2 font-semibold text-right w-[10%]">Discount</th>
                          <th className="py-2 px-2 font-semibold text-right w-[10%]">Final</th>
                          <th className="py-2 pl-4 font-semibold text-right w-[12%]">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                        {item.items && item.items.map((subItem, idx) => {
                          const discountStr = subItem.discount_percent > 0
                            ? `${Number(subItem.discount_percent).toLocaleString('en-IN')}%`
                            : '₹0.00';
                          const unitDiscount = (Number(subItem.unit_price) * Number(subItem.discount_percent || 0)) / 100;
                          const finalUnitPrice = Number(subItem.unit_price) - unitDiscount;

                          return (
                            <tr key={subItem.id || idx} className="hover:bg-slate-50/50 transition-colors align-top">
                              <td className="py-3 pr-4 font-semibold text-slate-900">
                                <div>{subItem.product_name || 'Optical Item'}</div>
                                <div className="text-[10px] text-slate-455 mt-0.5 font-medium">
                                  Brand: {subItem.product_brand || '—'} &middot; Catalog SKU: {subItem.product_sku || '—'}
                                </div>
                                {subItem.unit_skus && subItem.unit_skus.length > 0 && (() => {
                                  const rowKey = `sale-${subItem.id || idx}`;
                                  const isExpanded = !!expandedSkus[rowKey];
                                  return (
                                    <div className="mt-1.5">
                                      <button
                                        onClick={() => toggleSkuExpand(rowKey)}
                                        className="inline-flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold text-indigo-750 bg-indigo-50 border border-indigo-150 hover:bg-indigo-100/70 active:bg-indigo-150 rounded transition-all cursor-pointer shadow-sm select-none"
                                      >
                                        <List className="w-2.5 h-2.5" />
                                        <span>{subItem.unit_skus.length} Unit SKUs</span>
                                        <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                      </button>
                                      {isExpanded && (
                                        <div className="mt-1.5 flex flex-wrap gap-1 max-w-[280px] bg-slate-50 border border-slate-200/60 p-1.5 rounded-lg animate-fade-in">
                                          {subItem.unit_skus.map((sku) => (
                                            <span key={sku} className="inline-flex items-center text-[9px] font-mono font-bold text-indigo-700 bg-white border border-indigo-100 px-1.5 py-0.5 rounded shadow-sm">
                                              {sku}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="py-3 px-2 text-slate-550">
                                <div>{subItem.product_category || '—'}</div>
                                <div className="text-[10px] text-slate-455 mt-0.5">{subItem.product_subcategory || '—'}</div>
                              </td>
                              <td className="py-3 px-2 text-center text-slate-900 font-bold">{subItem.quantity}</td>
                              <td className="py-3 px-2 text-right text-slate-600">{fmtPrice(subItem.unit_cost)}</td>
                              <td className="py-3 px-2 text-right text-slate-650">{fmtPrice(subItem.unit_price)}</td>
                              <td className="py-3 px-2 text-right text-red-500 font-bold">{discountStr}</td>
                              <td className="py-3 px-2 text-right font-bold text-slate-900">{fmtPrice(finalUnitPrice)}</td>
                              <td className="py-3 pl-4 text-right font-black text-slate-950">{fmtPrice(subItem.line_total)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Section>
                <Section icon={UserCheck} title="Staff Information" color="purple">
                  <DetailRow label="Staff Name" value={item.staffName} />
                  <DetailRow label="Employee Code" value={item.staffCode} mono />
                  <DetailRow label="Role" value={item.staffRole} />
                </Section>
                <Section icon={Truck} title="Delivery Information" color="amber">
                  <DetailRow label="Store/Branch Name" value={item.branchName} />
                  <DetailRow label="Delivery Date" value={item.deliveryDate ? new Date(item.deliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
                  <DetailRow label="Order Status" value={item.status} />
                </Section>
                {item.lab_status && (
                  <Section icon={Beaker} title="Lab Routing Information" color="blue">
                    <DetailRow label="Processing Lab" value={item.labName || '—'} />
                    <DetailRow label="Sent Date" value={item.sentDate ? formatDate(item.sentDate) : '—'} />
                    <DetailRow label="Expected Delivery Date" value={item.expectedDeliveryDate ? formatDate(item.expectedDeliveryDate) : '—'} />
                    <DetailRow label="Lab workflow Status" value={item.lab_status} />
                  </Section>
                )}
              </div>
            )}

            {/* ── BILL TAB CONTENT (PRINTABLE INVOICE) ── */}
            {activeTab === 'bill' && (
              <div
                id="print-drawer-bill"
                style={!billHtml ? { borderTop: `5px solid ${billSettings.themeColor}` } : {}}
                className={!billHtml ? "bg-white rounded-2xl border border-slate-200/80 p-5 space-y-5 text-slate-800 shadow-sm font-sans animate-fade-in" : ""}
              >
                {loadingBill ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                    <p className="text-slate-500 text-xs mt-3 font-semibold uppercase tracking-wider">Loading invoice...</p>
                  </div>
                ) : billHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: billHtml }} />
                ) : (
                  <>
                    {/* Invoice Header */}
                    <div className="flex justify-between items-start gap-4 border-b border-slate-100 pb-4">
                      <div className="min-w-0">
                        {billSettings.logo ? (
                          <img src={billSettings.logo} alt="Logo" className="max-h-10 mb-2 object-contain" />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mb-2">
                            <Sparkles className="w-4 h-4 text-emerald-500" />
                          </div>
                        )}
                        <h2 className="text-sm font-black text-slate-900 tracking-tight leading-tight">
                          {billSettings.headerText}
                        </h2>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">{billSettings.subHeaderText}</p>
                        <p className="text-[9px] text-slate-500 font-semibold mt-1 leading-snug max-w-[200px]">{billSettings.address}</p>
                        <p className="text-[8px] text-slate-405 font-semibold mt-0.5">Phone: {billSettings.contactPhone} · Email: {billSettings.contactEmail}</p>
                        {billSettings.showGst && billSettings.gstNumber && (
                          <p className="text-[8px] text-slate-450 font-bold uppercase tracking-wider mt-0.5">GSTIN: {billSettings.gstNumber}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] font-mono font-bold text-slate-800 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg inline-block leading-none">
                          {item.orderId}
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold mt-1">
                          Date: {new Date(item.orderDate || item.sale_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* Billing Summary */}
                    <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100 text-xs">
                      <div>
                        <h3 className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          <User className="w-3.5 h-3.5" /> Customer Details
                        </h3>
                        <div className="font-semibold text-slate-500 space-y-0.5 leading-tight">
                          <p className="font-bold text-slate-900">{item.billedOnAccountOf ? item.billedOnAccountOf.name : item.customerName}</p>
                          <p>Phone: {item.billedOnAccountOf ? item.billedOnAccountOf.phone : (item.customerPhone || '—')}</p>
                          {(item.billedOnAccountOf?.address || item.customerAddress) && <p className="truncate max-w-[170px]" title={item.billedOnAccountOf?.address || item.customerAddress}>Address: {item.billedOnAccountOf?.address || item.customerAddress}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <h3 className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1 justify-end">
                          Payment Details
                        </h3>
                        <div className="font-semibold text-slate-500 space-y-0.5 leading-tight">
                          <p className="font-bold text-slate-900">Paid via: <span style={{ color: billSettings.themeColor }} className="font-black">{item.paymentMethod || 'Cash'}</span></p>
                          <p>Outstanding: ₹{Number(item.dueAmount || 0).toLocaleString('en-IN')}</p>
                          <p>Status: <span style={{ backgroundColor: `${billSettings.themeColor}10`, color: billSettings.themeColor, borderColor: `${billSettings.themeColor}30` }} className="inline-flex px-1.5 py-0.5 rounded font-extrabold border text-[9px] leading-none">{item.paymentStatus}</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Prescription Specifications */}
                    {billSettings.showPrescription ? (
                      customerDetails?.prescription ? (
                        <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-xs space-y-2">
                          <h3 className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-purple-500" /> Lens & Prescription Specs
                          </h3>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-semibold text-slate-500">
                            {customerDetails.prescription.lensType && <div>Lens Type: <span className="text-slate-950 font-bold">{customerDetails.prescription.lensType}</span></div>}
                            {customerDetails.prescription.framePreference && <div>Frame Pref: <span className="text-slate-950 font-bold">{customerDetails.prescription.framePreference}</span></div>}
                            {customerDetails.prescription.doctorName && <div>Doctor Name: <span className="text-slate-950 font-bold">{customerDetails.prescription.doctorName}</span></div>}
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-1 pt-1.5 border-t border-slate-200/40">
                            {customerDetails.prescription.rightEye && (
                              <div className="bg-white rounded-lg p-2 border border-slate-100">
                                <p className="text-[8px] font-black text-blue-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> OD (Right)
                                </p>
                                <div className="grid grid-cols-3 gap-1 text-[9px] font-bold text-slate-400">
                                  <div>SPH: <span className="text-slate-800 font-black">{customerDetails.prescription.rightEye.sph ?? '—'}</span></div>
                                  <div>CYL: <span className="text-slate-800 font-black">{customerDetails.prescription.rightEye.cyl ?? '—'}</span></div>
                                  <div>AXIS: <span className="text-slate-800 font-black">{customerDetails.prescription.rightEye.axis ?? '—'}</span></div>
                                </div>
                              </div>
                            )}
                            {customerDetails.prescription.leftEye && (
                              <div className="bg-white rounded-lg p-2 border border-slate-100">
                                <p className="text-[8px] font-black text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> OS (Left)
                                </p>
                                <div className="grid grid-cols-3 gap-1 text-[9px] font-bold text-slate-400">
                                  <div>SPH: <span className="text-slate-800 font-black">{customerDetails.prescription.leftEye.sph ?? '—'}</span></div>
                                  <div>CYL: <span className="text-slate-800 font-black">{customerDetails.prescription.leftEye.cyl ?? '—'}</span></div>
                                  <div>AXIS: <span className="text-slate-800 font-black">{customerDetails.prescription.leftEye.axis ?? '—'}</span></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 text-center text-[10px] font-semibold text-slate-400">
                          No prescription details attached
                        </div>
                      )
                    ) : null}

                    {/* Particulars Items Table */}
                    <div className="space-y-2">
                      <h3 className="text-[9px] font-extrabold text-slate-455 uppercase tracking-widest flex items-center gap-1">
                        <ShoppingCart className="w-3.5 h-3.5" /> Particulars Items
                      </h3>
                      <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                              <th className="px-3 py-2">Product Description</th>
                              <th className="px-2 py-2 text-center">Qty</th>
                              <th className="px-3 py-2 text-right">Price</th>
                              <th className="px-3 py-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                            {item.items && item.items.length > 0 ? (
                              item.items.map((saleItem, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="px-3 py-2">
                                    <p className="font-bold text-slate-900">{saleItem.product_name || item.productName || 'Optical Product'}</p>
                                    {saleItem.notes && <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{saleItem.notes}</p>}
                                  </td>
                                  <td className="px-2 py-2 text-center font-mono font-bold text-slate-800">{saleItem.quantity}</td>
                                  <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">₹{Number(saleItem.unit_price).toLocaleString('en-IN')}</td>
                                  <td className="px-3 py-2 text-right font-mono font-black text-slate-950">₹{Number(saleItem.line_total).toLocaleString('en-IN')}</td>
                                </tr>
                              ))
                            ) : (
                              <tr className="hover:bg-slate-50/50">
                                <td className="px-3 py-2">
                                  <p className="font-bold text-slate-900">{item.productName || 'Optical Product'}</p>
                                </td>
                                <td className="px-2 py-2 text-center font-mono font-bold text-slate-800">{item.productQuantity || 1}</td>
                                <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">₹{Number(item.productPrice || item.totalAmount || 0).toLocaleString('en-IN')}</td>
                                <td className="px-3 py-2 text-right font-mono font-black text-slate-950">₹{Number(item.totalAmount || 0).toLocaleString('en-IN')}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Calculations and QR Code layout */}
                    <div className="flex gap-4 justify-between items-end border-t border-slate-100 pt-3">
                      {/* Payment QR Code */}
                      {billSettings.qrCode ? (
                        <div className="text-left bg-white border border-slate-150 p-2 text-slate-400 rounded-xl flex flex-col items-center shadow-sm w-20 shrink-0">
                          <img src={billSettings.qrCode} alt="Scan to pay" className="w-16 h-16 object-contain" />
                          <span className="text-[6px] font-black text-slate-405 uppercase tracking-widest block text-center mt-0.5">Scan to Pay</span>
                        </div>
                      ) : (
                        <div />
                      )}

                      {/* Calculations */}
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-1.5 max-w-[240px] ml-auto text-xs font-semibold flex-1 w-full">
                        <div className="flex justify-between items-center text-slate-500">
                          <span>Subtotal</span>
                          <span className="font-mono font-bold">₹{Number(item.subtotal || item.totalAmount || 0).toLocaleString('en-IN')}</span>
                        </div>
                        {Number(item.discount_amount || 0) > 0 && (
                          <div className="flex justify-between items-center text-red-500">
                            <span>Discount</span>
                            <span className="font-mono font-bold">- ₹{Number(item.discount_amount).toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        {billSettings.showGst && Number(item.tax_amount || 0) > 0 && (
                          <div className="flex justify-between items-center text-slate-500">
                            <span>GST (Tax)</span>
                            <span className="font-mono font-bold">+ ₹{Number(item.tax_amount).toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-slate-800 font-extrabold border-t border-slate-200/50 pt-1.5 mt-0.5">
                          <span>Final Total</span>
                          <span className="font-mono font-black text-slate-950">₹{Number(item.totalAmount).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between items-center text-emerald-600 font-extrabold">
                          <span>Amount Paid</span>
                          <span className="font-mono font-bold">₹{Number(item.paidAmount || item.totalAmount || 0).toLocaleString('en-IN')}</span>
                        </div>
                        {Number(item.dueAmount || 0) > 0 && (
                          <div className="flex justify-between items-center text-amber-600 font-extrabold">
                            <span>Balance Due</span>
                            <span className="font-mono font-bold">₹{Number(item.dueAmount).toLocaleString('en-IN')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Notes */}
                    <div className="text-center text-[9px] font-bold text-slate-400 border-t border-slate-50 pt-3 italic tracking-wide">
                      {billSettings.footerText}
                    </div>
                  </>
                )}
              </div>
            )}          </div>

          {/* Footer Actions */}
          <div className="px-5 py-4 bg-white border-t border-slate-100 flex-shrink-0 no-print">
            {activeTab === 'bill' ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print / PDF
                  </button>
                  <button
                    onClick={handleWhatsAppShare}
                    className="flex-1 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100/50 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    WhatsApp
                  </button>
                </div>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-700 transition-all shadow-md"
                >
                  Close Bill
                </button>
              </div>
            ) : (
              <button onClick={onClose}
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-700 transition-all shadow-md hover:shadow-lg">
                Close Details
              </button>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  /* ── EXPENSE DRAWER ──────────────────────────────────────── */
  if (item.type === 'expense') {
    const APPROVAL_CFG = {
      Approved: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
      Pending: { color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
      Rejected: { color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500' },
    };
    const PAY_CFG = {
      Paid: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
      Pending: { color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
      Failed: { color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500' },
    };
    const approvalCfg = APPROVAL_CFG[item.approvalStatus] || APPROVAL_CFG.Pending;
    const payCfg = PAY_CFG[item.paymentStatus] || PAY_CFG.Pending;
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const fmt = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';

    const isPending = item.approvalStatus === 'Pending';
    const isApproved = item.approvalStatus === 'Approved';
    const isRejected = item.approvalStatus === 'Rejected';

    const handleApprove = () => {
      if (onApprove) onApprove(item);
    };
    const handleRejectConfirm = (reason) => {
      setShowRejectPrompt(false);
      if (onReject) onReject(item, reason);
    };

    return portal(
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex justify-end animate-fade-in font-sans">
        <div className="absolute inset-0" onClick={() => { setShowRejectPrompt(false); onClose(); }} aria-hidden />

        <div className="relative w-full sm:max-w-md h-full bg-slate-50 shadow-2xl flex flex-col animate-slide-up">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0">
                <Receipt className="w-5 h-5 text-violet-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 truncate">Expense Details</h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{item.expenseId}</p>
              </div>
            </div>
            <button
              onClick={() => { setShowRejectPrompt(false); onClose(); }}
              className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors flex-shrink-0 ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status strip */}
          <div className="px-5 py-3 bg-white border-b border-slate-100 flex-shrink-0 flex items-center justify-between gap-3 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${approvalCfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${approvalCfg.dot}`} />
              {item.approvalStatus === 'Pending' ? 'Pending Approval' : item.approvalStatus}
            </span>
            <span className="text-xs text-slate-400 font-semibold">{fmtDate(item.expenseDate)}</span>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-4 space-y-3">

            {/* Info */}
            <Section icon={FileText} title="Info" color="violet">
              <DetailRow label="Expense Title" value={item.title} />
              <DetailRow label="Category" value={item.category} />
              {item.description && <DetailRow label="Description" value={item.description} />}
              <DetailRow label="Amount" value={fmt(item.amount)} />
              <DetailRow label="Expense Date" value={fmtDate(item.expenseDate)} />
              <DetailRow label="Store / Branch" value={item.store} />

            </Section>

            {/* Payment */}
            <Section icon={CreditCard} title="Payment" color="blue">
              <DetailRow label="Payment Method" value={item.paymentMethod} />
              <DetailRow label="Reference No." value={item.referenceNumber || '—'} mono />
              <DetailRow label="Payment Status" value={
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${payCfg.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${payCfg.dot}`} />
                  {item.paymentStatus}
                </span>
              } />
              <DetailRow label="Amount" value={fmt(item.amount)} />
            </Section>

            {/* Receipt */}
            <Section icon={ImageIcon} title="Receipt" color="amber">
              {item.receiptUrl ? (
                <div className="py-2">
                  <img src={item.receiptUrl} alt="Receipt" className="w-full rounded-xl object-cover max-h-48 border border-slate-100" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <ImageIcon className="w-8 h-8 text-slate-200" />
                  <p className="text-xs font-medium text-slate-400">No receipt uploaded</p>
                </div>
              )}
            </Section>

            {/* Approval section */}
            <Section icon={Shield} title="Approval" color="emerald">
              {/* Status badge row */}
              <div className="py-2.5 border-b border-slate-50">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${approvalCfg.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${approvalCfg.dot}`} />
                  {item.approvalStatus === 'Pending' ? 'Pending Approval' : item.approvalStatus}
                </span>
              </div>

              {/* Pending: show action buttons */}
              {isPending && !showRejectPrompt && canApprove && (
                <div className="pt-3 pb-1 space-y-2">
                  <p className="text-xs text-slate-500 font-medium mb-3">Review and take action on this expense:</p>
                  <div className="flex gap-2">
                    <button
                      disabled={isApproving}
                      onClick={handleApprove}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isApproving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                      {isApproving ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      disabled={isRejecting}
                      onClick={() => setShowRejectPrompt(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <ThumbsDown className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Inline reject reason form */}
              {isPending && showRejectPrompt && canApprove && (
                <div className="pt-3 pb-1">
                  <RejectReasonPrompt
                    onConfirm={handleRejectConfirm}
                    onCancel={() => setShowRejectPrompt(false)}
                  />
                </div>
              )}

              {/* Approved details */}
              {isApproved && (
                <>
                  <DetailRow label="Approved By" value={item.approvedBy || '—'} />
                  <DetailRow label="Approved Date" value={fmtDate(item.approvedDate)} />
                </>
              )}

              {/* Rejected details */}
              {isRejected && (
                <>
                  <DetailRow label="Rejected By" value={item.rejectedBy || '—'} />
                  <DetailRow label="Rejected Date" value={fmtDate(item.rejectedDate)} />
                  <DetailRow label="Rejection Reason" value={item.rejectionReason || '—'} />
                </>
              )}

              {/* Always show Recorded By */}
              <DetailRow label="Recorded By" value={item.recordedBy} />
            </Section>

          </div>

          {/* Footer */}
          <div className="px-5 py-4 bg-white border-t border-slate-100 flex-shrink-0">
            <button
              onClick={() => { setShowRejectPrompt(false); onClose(); }}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-700 transition-all shadow-md hover:shadow-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  /* ── INVENTORY DRAWER ──────────────────────────────────── */
  const status = getStockStatus(item);
  const sc = statusConfig[status] || statusConfig['in_stock'];
  const profit = item.selling_price && item.cost_price
    ? (Number(item.selling_price) - Number(item.cost_price)).toFixed(2)
    : null;
  const margin = profit && item.selling_price
    ? ((profit / item.selling_price) * 100).toFixed(1)
    : null;

  return portal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex justify-end animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="relative w-full sm:max-w-md h-full bg-slate-50 shadow-2xl flex flex-col animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {item.image
                ? <img src={item.image} alt={item.product_name} className="w-full h-full object-cover" />
                : <Package className="w-5 h-5 text-slate-400" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate">{item.product_name}</h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{item.sku}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors flex-shrink-0 ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status badge */}
        <div className="px-5 py-3 bg-white border-b border-slate-100 flex-shrink-0">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${sc.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
          </span>
          <span className="ml-2 text-xs text-slate-400 font-medium">{categoryLabel[item.category] || item.category}</span>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-4 space-y-3">
          <Section icon={Package} title="Product Information" color="emerald">
            <DetailRow label="Product Name" value={item.product_name} />
            <DetailRow label="SKU" value={item.sku} mono />
            <DetailRow label="Category" value={categoryLabel[item.category] || item.category} />
            {item.subcategory && <DetailRow label="Subcategory" value={item.subcategory} />}
            {item.description && <DetailRow label="Description" value={item.description} />}
          </Section>

          {item.frame_product && (
            <Section icon={Sliders} title="Frame Specifications" color="blue">
              <DetailRow label="Frame Type" value={item.frame_product.frame_type} />
              <DetailRow label="Shape" value={item.frame_product.shape} />
              <DetailRow label="Material" value={item.frame_product.material} />
              <DetailRow label="Color" value={item.frame_product.color} />
              <DetailRow label="Lens Width" value={item.frame_product.lens_width ? `${item.frame_product.lens_width} mm` : null} />
              <DetailRow label="Bridge Width" value={item.frame_product.bridge_width ? `${item.frame_product.bridge_width} mm` : null} />
              <DetailRow label="Temple Length" value={item.frame_product.temple_length ? `${item.frame_product.temple_length} mm` : null} />
              <DetailRow label="Gender" value={item.frame_product.gender} />
              <DetailRow label="Age Group" value={item.frame_product.age_group} />
            </Section>
          )}

          {item.lens_product && (
            <Section icon={Sliders} title="Lens Specifications" color="blue">
              <DetailRow label="Lens Type" value={item.lens_product.lens_type} />
              <DetailRow label="Material" value={item.lens_product.material} />
              <DetailRow label="Index Value" value={item.lens_product.index_value} />
              <DetailRow label="Coating" value={item.lens_product.coating} />
              <DetailRow label="Tint Color" value={item.lens_product.tint_color} />
              <DetailRow label="UV Protection" value={item.lens_product.uv_protection} />
              <DetailRow label="Blue Cut" value={item.lens_product.blue_cut} />
              <DetailRow label="Photochromic" value={item.lens_product.photochromic} />
              <DetailRow label="Polarized" value={item.lens_product.polarized} />
            </Section>
          )}

          {item.accessory_product && (
            <Section icon={Sliders} title="Accessory Specifications" color="blue">
              <DetailRow label="Accessory Type" value={item.accessory_product.accessory_type} />
              <DetailRow label="Material" value={item.accessory_product.material} />
              <DetailRow label="Color" value={item.accessory_product.color} />
              <DetailRow label="Size" value={item.accessory_product.size} />
            </Section>
          )}

          <Section icon={Tag} title="Brand Information" color="blue">
            <DetailRow label="Brand" value={item.brand} />
          </Section>

          <Section icon={Truck} title="Supplier Information" color="purple">
            <DetailRow label="Supplier" value={item.supplier} />
          </Section>

          <Section icon={BarChart3} title="Stock Details" color="amber">
            <DetailRow label="Quantity" value={item.quantity} />
            <DetailRow label="Reorder Level" value={item.reorder_level} />
            <DetailRow label="Status" value={sc.label} />
          </Section>

          <Section icon={Clock} title="Purchase Batches (FIFO)" color="violet">
            {loadingBatches ? (
              <p className="text-xs font-semibold text-slate-500 py-3 text-center">Loading batches...</p>
            ) : batches.length === 0 ? (
              <p className="text-xs font-semibold text-slate-400 py-3 text-center">No batches found</p>
            ) : (
              <div className="space-y-3 py-2">
                {batches.map((batch) => {
                  const statusColors = {
                    Current: "text-emerald-700 bg-emerald-50 border-emerald-200",
                    Next: "text-blue-700 bg-blue-50 border-blue-200",
                    Upcoming: "text-slate-700 bg-slate-100 border-slate-200",
                    Consumed: "text-slate-400 bg-slate-50 border-slate-100 line-through opacity-70"
                  };
                  return (
                    <div key={batch.id} className="p-3 border border-slate-150 rounded-xl bg-slate-50/50 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Batch #{batch.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[batch.status] || 'bg-slate-100 text-slate-700'}`}>
                          {batch.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Purchased:</span>
                          <span className="font-semibold text-slate-800">{formatDate(batch.purchase_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Cost / Sell:</span>
                          <span className="font-bold text-slate-800">₹{Number(batch.purchase_cost).toLocaleString()} / ₹{Number(batch.selling_price || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between col-span-2 border-t border-slate-100 pt-1.5 mt-0.5">
                          <span className="text-slate-500 font-medium">Available Qty:</span>
                          <span className="font-semibold text-slate-800">{batch.available_quantity} / {batch.initial_quantity}</span>
                        </div>
                        {batch.store_name && (
                          <div className="flex justify-between col-span-2">
                            <span className="text-slate-500 font-medium">Location:</span>
                            <span className="font-bold text-slate-800 truncate">{batch.store_name}</span>
                          </div>
                        )}
                        <div className="flex justify-between col-span-2">
                          <span className="text-slate-500 font-medium">Supplier:</span>
                          <span className="font-semibold text-slate-800 truncate max-w-[180px]">{batch.supplier_name}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          <Section icon={DollarSign} title="Pricing & Warranty Details" color="rose">
            <DetailRow label="Cost Price" value={item.cost_price ? `₹${Number(item.cost_price).toLocaleString()}` : null} />
            <DetailRow label="Selling Price" value={item.selling_price ? `₹${Number(item.selling_price).toLocaleString()}` : null} />
            {item.discount_percent !== undefined && Number(item.discount_percent) > 0 && (
              <DetailRow label="Default Discount" value={`${item.discount_percent}%`} />
            )}
            {item.warranty_months !== undefined && Number(item.warranty_months) > 0 && (
              <DetailRow label="Warranty Duration" value={`${item.warranty_months} Months`} />
            )}
            {profit !== null && <DetailRow label="Gross Profit" value={`₹${Number(profit).toLocaleString()}`} />}
            {margin !== null && <DetailRow label="Margin" value={`${margin}%`} />}
          </Section>

          {item.store && (
            <Section icon={Store} title="Store Information" color="slate">
              <DetailRow label="Store" value={item.store} />
            </Section>
          )}
        </div>

        <div className="px-5 py-4 bg-white border-t border-slate-100 flex-shrink-0 space-y-3">
          {onRestockSupplier && (
            <button
              onClick={() => onRestockSupplier(item)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" /> Add Stock
            </button>
          )}
          {onEdit ? (
            <div className="flex gap-3">
              <button
                onClick={() => onEdit(item)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-xl font-bold transition-all text-sm shadow-sm"
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-700 transition-all shadow-md hover:shadow-lg"
              >
                Close
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-700 transition-all shadow-md hover:shadow-lg"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InventoryDetailDrawer;
