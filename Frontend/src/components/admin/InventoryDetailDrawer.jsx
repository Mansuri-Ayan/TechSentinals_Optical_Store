import { useState } from 'react';
import { createPortal as portal } from 'react-dom';
import {
  X, Package, Tag, Truck, BarChart3, DollarSign,
  Store, CheckCircle, AlertTriangle, XCircle, Image as ImageIcon, Sliders,
  User, Users, CreditCard, UserCheck, Calendar, IndianRupee, ShoppingCart,
  Receipt, FileText, RefreshCw, Shield, ThumbsUp, ThumbsDown,
  Briefcase, Clock, Phone, Mail,
} from 'lucide-react';

const statusConfig = {
  'in_stock':    { label: 'In Stock',     color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle },
  'low_stock':   { label: 'Low Stock',    color: 'text-amber-700 bg-amber-50 border-amber-200',       dot: 'bg-amber-500',   icon: AlertTriangle },
  'out_of_stock':{ label: 'Out of Stock', color: 'text-red-700 bg-red-50 border-red-200',             dot: 'bg-red-500',     icon: XCircle },
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
    blue:    'bg-blue-500/10 border-blue-500/20 text-blue-600',
    purple:  'bg-purple-500/10 border-purple-500/20 text-purple-600',
    amber:   'bg-amber-500/10 border-amber-500/20 text-amber-600',
    rose:    'bg-rose-500/10 border-rose-500/20 text-rose-600',
    slate:   'bg-slate-500/10 border-slate-500/20 text-slate-600',
    violet:  'bg-violet-500/10 border-violet-500/20 text-violet-600',
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
          className={`w-full px-3 py-2.5 text-sm font-medium border rounded-xl focus:outline-none focus:ring-4 resize-none transition-all bg-white ${
            error
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
   Props: item, onClose, onApprove, onReject, isApproving, isRejecting, isLoading
───────────────────────────────────────────────────────── */
const InventoryDetailDrawer = ({ item, onClose, onApprove, onReject, isApproving, isRejecting, isLoading }) => {
  const [showRejectPrompt, setShowRejectPrompt] = useState(false);

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

    return pojrtal(
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex justify-end animate-fade-in font-sans">
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
                  <DetailRow label="Email"     value={item.email} />
                  <DetailRow label="Phone"     value={item.phone || item.phone_number} />
                  <DetailRow label="Role"      value={formatRole(item.role)} />
                  {item.qualification && <DetailRow label="Qualification" value={item.qualification} />}
                </Section>

                <Section icon={Briefcase} title="Employment" color="blue">
                  <DetailRow label="Store / Branch" value={item.store_name} />
                  <DetailRow label="Status" value={
                    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  } />
                  <DetailRow label="Joined"     value={fmtDateLocal(item.created_at || item.joining_date)} />
                  <DetailRow label="Last Login"  value={item.last_login_at ? formatLastActive(item.last_login_at) : "Never"} />
                </Section>

                <Section icon={Shield} title="Account" color="purple">
                  <DetailRow label="Username"    value={item.username || item.email} mono />
                  <DetailRow label="Role ID"     value={item.role_id || item.id} mono />
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

  /* ── SALES DRAWER ──────────────────────────────────────── */
  if (item.type === 'sales') {
    return portal(
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex justify-end animate-fade-in font-sans">
        <div className="absolute inset-0" onClick={onClose} aria-hidden />
        <div className="relative w-full sm:max-w-md h-full bg-slate-50 shadow-2xl flex flex-col animate-slide-up">

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

          {/* Status badge */}
          <div className="px-5 py-3 bg-white border-b border-slate-100 flex-shrink-0 flex items-center justify-between">
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
            <span className="text-xs text-slate-400 font-semibold">Order Date: {item.orderDate}</span>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-4 space-y-3">
            <Section icon={User} title="Customer Information" color="emerald">
              <DetailRow label="Customer Name" value={item.customerName} />
              <DetailRow label="Phone Number"  value={item.customerPhone} />
              <DetailRow label="Address"       value={item.customerAddress} />
            </Section>
            <Section icon={CreditCard} title="Payment Information" color="rose">
              <DetailRow label="Total Amount"   value={`₹${Number(item.totalAmount).toLocaleString('en-IN')}`} />
              <DetailRow label="Paid Amount"    value={`₹${Number(item.paidAmount).toLocaleString('en-IN')}`} />
              <DetailRow label="Due Amount"     value={`₹${Number(item.dueAmount).toLocaleString('en-IN')}`} />
              <DetailRow label="Payment Status" value={
                <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                  item.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700' :
                  item.paymentStatus === 'Partially Paid' ? 'bg-amber-50 text-amber-700' :
                  'bg-red-50 text-red-700'
                }`}>
                  {item.paymentStatus}
                </span>
              } />
              <DetailRow label="Payment Method" value={item.paymentMethod} />
            </Section>
            <Section icon={Package} title="Product Information" color="blue">
              <DetailRow label="Product Name" value={item.productName} />
              <DetailRow label="Category"     value={item.productCategory} />
              <DetailRow label="Sub Category" value={item.productSubcategory} />
              <DetailRow label="Quantity"     value={item.productQuantity} />
              <DetailRow label="Price"        value={`₹${Number(item.productPrice).toLocaleString('en-IN')}`} />
            </Section>
            <Section icon={UserCheck} title="Staff Information" color="purple">
              <DetailRow label="Staff Name"    value={item.staffName} />
              <DetailRow label="Employee Code" value={item.staffCode} mono />
              <DetailRow label="Role"          value={item.staffRole} />
            </Section>
            <Section icon={Truck} title="Delivery Information" color="amber">
              <DetailRow label="Store/Branch Name" value={item.branchName} />
              <DetailRow label="Delivery Date"     value={item.deliveryDate ? new Date(item.deliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
              <DetailRow label="Order Status"      value={item.status} />
            </Section>
          </div>

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

  /* ── EXPENSE DRAWER ──────────────────────────────────────── */
  if (item.type === 'expense') {
    const APPROVAL_CFG = {
      Approved: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
      Pending:  { color: 'text-amber-700 bg-amber-50 border-amber-200',       dot: 'bg-amber-500'   },
      Rejected: { color: 'text-red-700 bg-red-50 border-red-200',             dot: 'bg-red-500'     },
    };
    const PAY_CFG = {
      Paid:    { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
      Pending: { color: 'text-amber-700 bg-amber-50 border-amber-200',       dot: 'bg-amber-500'   },
      Failed:  { color: 'text-red-700 bg-red-50 border-red-200',             dot: 'bg-red-500'     },
    };
    const approvalCfg = APPROVAL_CFG[item.approvalStatus] || APPROVAL_CFG.Pending;
    const payCfg      = PAY_CFG[item.paymentStatus]       || PAY_CFG.Pending;
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const fmt     = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';

    const isPending  = item.approvalStatus === 'Pending';
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex justify-end animate-fade-in font-sans">
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
              <DetailRow label="Category"      value={item.category} />
              {item.description && <DetailRow label="Description" value={item.description} />}
              <DetailRow label="Amount"        value={fmt(item.amount)} />
              <DetailRow label="Expense Date"  value={fmtDate(item.expenseDate)} />
              <DetailRow label="Store / Branch" value={item.store} />
              {item.isRecurring && (
                <DetailRow label="Recurring" value={
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-full text-[11px] font-bold">
                    <RefreshCw className="w-3 h-3" /> {item.recurringInterval}
                  </span>
                } />
              )}
            </Section>

            {/* Payment */}
            <Section icon={CreditCard} title="Payment" color="blue">
              <DetailRow label="Payment Method" value={item.paymentMethod} />
              <DetailRow label="Reference No."  value={item.referenceNumber || '—'} mono />
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
              {isPending && !showRejectPrompt && (
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
              {isPending && showRejectPrompt && (
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
                  <DetailRow label="Approved By"   value={item.approvedBy   || '—'} />
                  <DetailRow label="Approved Date" value={fmtDate(item.approvedDate)} />
                </>
              )}

              {/* Rejected details */}
              {isRejected && (
                <>
                  <DetailRow label="Rejected By"     value={item.rejectedBy   || '—'} />
                  <DetailRow label="Rejected Date"   value={fmtDate(item.rejectedDate)} />
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex justify-end animate-fade-in">
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
            <DetailRow label="SKU"          value={item.sku}          mono />
            <DetailRow label="Category"     value={categoryLabel[item.category] || item.category} />
            {item.subcategory  && <DetailRow label="Subcategory" value={item.subcategory} />}
            {item.description  && <DetailRow label="Description" value={item.description} />}
          </Section>

          {item.frame_product && (
            <Section icon={Sliders} title="Frame Specifications" color="blue">
              <DetailRow label="Frame Type"    value={item.frame_product.frame_type} />
              <DetailRow label="Shape"         value={item.frame_product.shape} />
              <DetailRow label="Material"      value={item.frame_product.material} />
              <DetailRow label="Color"         value={item.frame_product.color} />
              <DetailRow label="Lens Width"    value={item.frame_product.lens_width    ? `${item.frame_product.lens_width} mm`    : null} />
              <DetailRow label="Bridge Width"  value={item.frame_product.bridge_width  ? `${item.frame_product.bridge_width} mm`  : null} />
              <DetailRow label="Temple Length" value={item.frame_product.temple_length ? `${item.frame_product.temple_length} mm` : null} />
              <DetailRow label="Gender"        value={item.frame_product.gender} />
              <DetailRow label="Age Group"     value={item.frame_product.age_group} />
            </Section>
          )}

          {item.lens_product && (
            <Section icon={Sliders} title="Lens Specifications" color="blue">
              <DetailRow label="Lens Type"     value={item.lens_product.lens_type} />
              <DetailRow label="Material"      value={item.lens_product.material} />
              <DetailRow label="Index Value"   value={item.lens_product.index_value} />
              <DetailRow label="Coating"       value={item.lens_product.coating} />
              <DetailRow label="Tint Color"    value={item.lens_product.tint_color} />
              <DetailRow label="UV Protection" value={item.lens_product.uv_protection} />
              <DetailRow label="Blue Cut"      value={item.lens_product.blue_cut} />
              <DetailRow label="Photochromic"  value={item.lens_product.photochromic} />
              <DetailRow label="Polarized"     value={item.lens_product.polarized} />
            </Section>
          )}

          {item.accessory_product && (
            <Section icon={Sliders} title="Accessory Specifications" color="blue">
              <DetailRow label="Accessory Type" value={item.accessory_product.accessory_type} />
              <DetailRow label="Material"        value={item.accessory_product.material} />
              <DetailRow label="Color"           value={item.accessory_product.color} />
              <DetailRow label="Size"            value={item.accessory_product.size} />
            </Section>
          )}

          <Section icon={Tag} title="Brand Information" color="blue">
            <DetailRow label="Brand" value={item.brand} />
          </Section>

          <Section icon={Truck} title="Supplier Information" color="purple">
            <DetailRow label="Supplier" value={item.supplier} />
          </Section>

          <Section icon={BarChart3} title="Stock Details" color="amber">
            <DetailRow label="Quantity"      value={item.quantity} />
            <DetailRow label="Reorder Level" value={item.reorder_level} />
            <DetailRow label="Status"        value={sc.label} />
          </Section>

          <Section icon={DollarSign} title="Pricing Details" color="rose">
            <DetailRow label="Cost Price"    value={item.cost_price    ? `₹${Number(item.cost_price).toLocaleString()}`    : null} />
            <DetailRow label="Selling Price" value={item.selling_price ? `₹${Number(item.selling_price).toLocaleString()}` : null} />
            {profit !== null && <DetailRow label="Gross Profit" value={`₹${Number(profit).toLocaleString()}`} />}
            {margin !== null && <DetailRow label="Margin"       value={`${margin}%`} />}
          </Section>

          {item.store && (
            <Section icon={Store} title="Store Information" color="slate">
              <DetailRow label="Store" value={item.store} />
            </Section>
          )}
        </div>

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
};

export default InventoryDetailDrawer;
