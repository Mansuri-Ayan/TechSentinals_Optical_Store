import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Package, IndianRupee, CreditCard, Building2, CheckCircle, Clock, XCircle, AlertTriangle, Layers, FileText, Hash, ArrowRightLeft, ShoppingCart, TrendingUp, RotateCcw, Trash2 } from 'lucide-react';

const TRANSACTION_TYPES = [
  { value: 'Inventory Transfer', icon: ArrowRightLeft, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'Sale', icon: ShoppingCart, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { value: 'Purchase', icon: TrendingUp, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { value: 'Return', icon: RotateCcw, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'Damage', icon: Trash2, color: 'text-red-600 bg-red-50 border-red-200' },
  { value: 'Loss', icon: Trash2, color: 'text-rose-600 bg-rose-50 border-rose-200' },
];

const STATUS_CFG = {
  Completed: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle },
  Approved:  { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle },
  Pending:   { color: 'text-amber-700 bg-amber-50 border-amber-200',       dot: 'bg-amber-500',   icon: Clock      },
  Rejected:  { color: 'text-rose-700 bg-rose-50 border-rose-200',          dot: 'bg-rose-500',    icon: XCircle    },
  Cancelled: { color: 'text-slate-600 bg-slate-100 border-slate-200',      dot: 'bg-slate-400',   icon: XCircle    },
  Failed:    { color: 'text-red-700 bg-red-50 border-red-200',             dot: 'bg-red-500',     icon: AlertTriangle },
};

const StatusBadge = ({ status, rejectionReason }) => {
  const c = STATUS_CFG[status] || STATUS_CFG.Pending;
  return (
    <span 
      title={status === 'Rejected' && rejectionReason ? `Rejection reason: ${rejectionReason}` : undefined}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${status === 'Rejected' ? 'cursor-help' : ''} ${c.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
};

const TypeBadge = ({ type }) => {
  const cfg = TRANSACTION_TYPES.find(t => t.value === type) || TRANSACTION_TYPES[0];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {type}
    </span>
  );
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
    blue:    'bg-blue-500/10 border-blue-500/20 text-blue-600',
    purple:  'bg-purple-500/10 border-purple-500/20 text-purple-600',
    amber:   'bg-amber-500/10 border-amber-500/20 text-amber-600',
    rose:    'bg-rose-500/10 border-rose-500/20 text-rose-600',
    slate:   'bg-slate-500/10 border-slate-500/20 text-slate-600',
    violet:  'bg-violet-500/10 border-violet-500/20 text-violet-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden w-full">
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

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const TransactionDetailModal = ({ 
  isOpen, 
  transaction, 
  onClose,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
  canApprove,
  onRecordPayment
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionError, setDecisionError] = useState('');

  useEffect(() => {
    if (transaction) {
      setDecisionReason('');
      setDecisionError('');
      const timer = setTimeout(() => setIsDrawerOpen(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsDrawerOpen(false);
    }
  }, [transaction]);
  if (!isOpen || !transaction) return null;

  const date = new Date(transaction.date || transaction.created_at);
  const formattedDate = `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;

  const isTransfer = transaction.type === 'Inventory Transfer' || 
                     transaction.transferDirection || 
                     transaction.transaction_type === 'ADMIN_TRANSFER_OUT' ||
                     transaction.transaction_type === 'ADMIN_TRANSFER_IN' ||
                     transaction.transaction_type === 'STORE_TRANSFER_OUT' ||
                     transaction.transaction_type === 'STORE_TRANSFER_IN' ||
                     transaction.transaction_type === 'TRANSFER';

  const handleApproveClick = async () => {
    try {
      await onApprove(transaction.rawId);
    } catch (err) {
      // error handled by mutation
    }
  };

  const handleRejectClick = async () => {
    if (!decisionReason.trim()) {
      setDecisionError('Rejection reason is required.');
      return;
    }
    try {
      await onReject(transaction.rawId, decisionReason.trim());
    } catch (err) {
      // error handled by mutation
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex justify-end animate-fade-in font-sans">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      
      <div className={`relative w-full sm:max-w-md h-full bg-slate-50 shadow-2xl flex flex-col transition-transform duration-300 transform ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate">Transaction Details</h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{transaction.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors flex-shrink-0 ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status strip */}
        <div className="px-5 py-3 bg-white border-b border-slate-100 flex-shrink-0 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <StatusBadge status={transaction.status} rejectionReason={transaction.rejectionReason} />
            <TypeBadge type={transaction.type} />
          </div>
          <span className="text-xs text-slate-400 font-semibold">{formattedDate}</span>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-4 space-y-3">
          
          {/* Section 1 - Transfer / Store */}
          {isTransfer ? (
            <Section icon={ArrowRightLeft} title="Transfer" color="blue">
              <div className="py-3">
                 <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl border border-slate-200">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">From</p>
                    <p className="font-bold text-slate-900 text-sm truncate">{transaction.sender}</p>
                  </div>
                  <div className="flex-shrink-0 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm">
                    <ArrowRightLeft className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">To</p>
                    <p className="font-bold text-slate-900 text-sm truncate">{transaction.receiver}</p>
                  </div>
                </div>
              </div>
            </Section>
          ) : (
            <Section icon={Building2} title="Store / Entity" color="blue">
              <DetailRow label="Sent To" value={transaction.sentTo || 'Admin Store'} />
            </Section>
          )}

          {/* Section 2 - Details */}
          <Section icon={FileText} title="Details" color="violet">
            <DetailRow label="Category" value={transaction.category} />
            <DetailRow label="Subcategory / Product" value={transaction.product} />
            <DetailRow label="Qty Supplied" value={
              transaction.quantity > 0 ? (
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-black">
                  {transaction.quantity}
                </span>
              ) : '—'
            } />
            {!isTransfer && (
              <>
                <DetailRow label="Total Amount" value={transaction.amount > 0 ? fmt(transaction.amount) : '—'} />
                <DetailRow label="Paid Amount" value={transaction.paidAmount !== undefined ? fmt(transaction.paidAmount) : (transaction.amount > 0 ? fmt(transaction.amount) : '—')} />
                <DetailRow label="Due Amount" value={transaction.dueAmount !== undefined ? fmt(transaction.dueAmount) : '₹0'} />
                <DetailRow label="Payment Method" value={transaction.paymentMethod || '—'} />
                <DetailRow label="Payment Date" value={fmtDate(transaction.paymentDate || transaction.date)} />
              </>
            )}
          </Section>

          {/* Section 3 - Remarks */}
          {transaction.remarks && (
            <div className="px-5 py-4 bg-amber-50 border border-amber-200 rounded-2xl shadow-sm">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Remarks</p>
              <p className="text-sm text-amber-900 font-medium leading-relaxed">{transaction.remarks}</p>
            </div>
          )}

          {/* Decision Section */}
          {canApprove && (
            <div className="px-5 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Approval Actions</h3>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
                  Rejection Reason / Notes <span className="text-red-500">* (only for rejection)</span>
                </label>
                <textarea
                  rows={2}
                  value={decisionReason}
                  onChange={e => {
                    setDecisionReason(e.target.value);
                    setDecisionError('');
                  }}
                  placeholder="Enter decision notes or rejection reason..."
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 resize-none transition-all bg-white"
                />
                {decisionError && <p className="text-[10px] text-red-500 mt-1">{decisionError}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleApproveClick}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  disabled={isApproving || isRejecting}
                >
                  {isApproving ? 'Approving...' : 'Approve'}
                </button>
                <button
                  onClick={handleRejectClick}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  disabled={isApproving || isRejecting}
                >
                  {isRejecting ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex-shrink-0 flex gap-3 justify-end items-center">
          <button onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-all shadow-sm">
            Close Details
          </button>
          {!isTransfer && transaction.dueAmount > 0 && onRecordPayment && (
            <button type="button" onClick={() => onRecordPayment(transaction)}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-md">
              Record Payment
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TransactionDetailModal;
