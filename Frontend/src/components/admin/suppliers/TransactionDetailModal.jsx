import { createPortal } from 'react-dom';
import { X, Calendar, Package, IndianRupee, CreditCard, Building2, CheckCircle, Clock, XCircle, AlertTriangle, Layers, FileText, Hash } from 'lucide-react';

const STATUS_CFG = {
  Completed: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle },
  Pending:   { color: 'text-amber-700 bg-amber-50 border-amber-200',       dot: 'bg-amber-500',   icon: Clock      },
  Cancelled: { color: 'text-slate-600 bg-slate-100 border-slate-200',      dot: 'bg-slate-400',   icon: XCircle    },
  Failed:    { color: 'text-red-700 bg-red-50 border-red-200',             dot: 'bg-red-500',     icon: AlertTriangle },
};

const StatusBadge = ({ status }) => {
  const c = STATUS_CFG[status] || STATUS_CFG.Pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${c.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
};

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const TransactionDetailModal = ({ isOpen, transaction, onClose }) => {
  if (!isOpen || !transaction) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-3 sm:p-4 animate-fade-in font-sans">
      <div className="relative bg-white w-full sm:max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] min-h-0 border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Transaction Details</h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{transaction.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4 min-h-0">
          {/* Status and Store Row */}
          <div className="flex items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sent To</p>
                <p className="text-xs font-bold text-slate-700">{transaction.sentTo || 'Admin Store'}</p>
              </div>
            </div>
            <StatusBadge status={transaction.status} />
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Category */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-1.5 mb-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</span>
              </div>
              <p className="text-sm font-bold text-slate-800">{transaction.category}</p>
            </div>

            {/* Product */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-1.5 mb-1">
                <Package className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subcategory</span>
              </div>
              <p className="text-sm font-bold text-slate-800 truncate" title={transaction.product}>{transaction.product}</p>
            </div>

            {/* Quantity */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-1.5 mb-1">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Qty Supplied</span>
              </div>
              <p className="text-sm font-bold text-slate-800">
                {transaction.quantity > 0 ? (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-slate-200/60 text-slate-800 text-xs font-black">
                    {transaction.quantity}
                  </span>
                ) : '—'}
              </p>
            </div>

            {/* Amount */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-1.5 mb-1">
                <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Amount</span>
              </div>
              <p className="text-sm font-bold text-slate-800">
                {transaction.amount > 0 ? fmt(transaction.amount) : '—'}
              </p>
            </div>

            {/* Paid Amount */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-1.5 mb-1">
                <IndianRupee className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paid Amount</span>
              </div>
              <p className="text-sm font-bold text-emerald-700">
                {transaction.paidAmount !== undefined ? fmt(transaction.paidAmount) : (transaction.amount > 0 ? fmt(transaction.amount) : '—')}
              </p>
            </div>

            {/* Due Amount */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-1.5 mb-1">
                <IndianRupee className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Due Amount</span>
              </div>
              <p className="text-sm font-bold text-amber-700">
                {transaction.dueAmount !== undefined ? fmt(transaction.dueAmount) : '₹0'}
              </p>
            </div>

            {/* Payment Method */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-1.5 mb-1">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Method</span>
              </div>
              <p className="text-sm font-bold text-slate-800">{transaction.paymentMethod || '—'}</p>
            </div>

            {/* Payment Date */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Date</span>
              </div>
              <p className="text-sm font-bold text-slate-800">{fmtDate(transaction.paymentDate || transaction.date)}</p>
            </div>
            
          </div>

          {/* Remarks */}
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
            <div className="flex items-center gap-1.5 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remarks / Notes</span>
            </div>
            <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
              {transaction.remarks || <span className="text-slate-400 italic">No remarks provided.</span>}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
            Close Details
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default TransactionDetailModal;
