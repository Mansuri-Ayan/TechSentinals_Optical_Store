import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CreditCard, Calendar, IndianRupee, FileText, Check, Plus } from 'lucide-react';

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Credit'];

const METHOD_MAP = {
  'Cash': 'CASH',
  'Bank Transfer': 'BANK_TRANSFER',
  'UPI': 'UPI',
  'Cheque': 'CHEQUE',
  'Credit': 'CREDIT_NOTE',
};

const AddPaymentModal = ({ isOpen, po, supplierName, onClose, onSubmit }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [refNum, setRefNum] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen && po) {
      setAmount(String(po.dueAmount || ''));
      setMethod('Cash');
      setDate(new Date().toISOString().split('T')[0]);
      setRefNum('');
      setRemarks('');
      setErrors({});
    }
  }, [isOpen, po]);

  if (!isOpen || !po) return null;

  const validate = () => {
    const e = {};
    const amt = Number(amount);
    if (amount === '' || isNaN(amt) || amt <= 0) {
      e.amount = 'Enter a valid amount greater than 0';
    } else if (amt > po.dueAmount) {
      e.amount = `Amount cannot exceed outstanding due of ₹${po.dueAmount.toLocaleString('en-IN')}`;
    }

    if (!date) {
      e.date = 'Date is required';
    }

    if (!method) {
      e.method = 'Payment method is required';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit(po.rawId, {
      payment_date: date,
      amount: Number(amount),
      payment_method: METHOD_MAP[method] || 'CASH',
      reference_number: refNum.trim() || null,
      remarks: remarks.trim() || null,
    });
  };

  const inputCls = (field) =>
    `w-full px-3 py-2 text-sm font-medium rounded-xl border transition-all focus:outline-none focus:ring-4 ${
      errors[field]
        ? 'border-red-400 focus:ring-red-100 focus:border-red-500'
        : 'border-slate-200 focus:ring-blue-500/10 focus:border-blue-500 placeholder:text-slate-400'
    }`;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1100] p-3 sm:p-4 animate-fade-in font-sans">
      <div className="relative bg-white w-full sm:max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh] min-h-0 border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-sans">Record Payment</h2>
              <p className="text-xs text-slate-500 truncate max-w-[250px] font-sans">
                PO: {po.id} · Supplier: {supplierName}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 min-h-0">
          <div className="p-5 space-y-4">
            
            {/* Summary Information Card */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>Total PO Amount:</span>
                <span className="font-bold text-slate-700">₹{po.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>Amount Paid So Far:</span>
                <span className="font-bold text-emerald-600">₹{po.paidAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-slate-205/50 font-bold">
                <span className="text-slate-800">Outstanding Due:</span>
                <span className="text-amber-700">₹{po.dueAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Input: Payment Amount */}
            <div>
              <label className="text-xs font-semibold text-slate-650 mb-1.5 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-slate-400" /> Payment Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₹</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={po.dueAmount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={`${inputCls('amount')} pl-7`}
                />
              </div>
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
            </div>

            {/* Input: Payment Date */}
            <div>
              <label className="text-xs font-semibold text-slate-650 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls('date')}
              />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
            </div>

            {/* Input: Payment Method */}
            <div>
              <label className="text-xs font-semibold text-slate-650 mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Payment Method <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all text-center ${
                      method === m
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {errors.method && <p className="text-xs text-red-500 mt-1">{errors.method}</p>}
            </div>

            {/* Input: Reference Number */}
            <div>
              <label className="text-xs font-semibold text-slate-650 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" /> Reference / UTR Number <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={refNum}
                onChange={(e) => setRefNum(e.target.value)}
                placeholder="e.g. UTR12345678"
                className={inputCls('refNum')}
              />
            </div>

            {/* Input: Remarks */}
            <div>
              <label className="text-xs font-semibold text-slate-650 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" /> Remarks / Notes <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Payment notes or remarks…"
                className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-white resize-none placeholder:text-slate-400"
              />
            </div>

            {/* Live Preview / Confim Card */}
            {amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
              <div className="flex flex-col gap-1 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl animate-fade-in text-xs font-sans">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span className="font-bold text-emerald-700">
                    Paying ₹{Number(amount).toLocaleString('en-IN')} via {method}
                  </span>
                </div>
                <div className="text-emerald-600 font-medium pl-5">
                  Remaining Dues after payment: ₹{Math.max(0, po.dueAmount - Number(amount)).toLocaleString('en-IN')}
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50 flex-shrink-0 font-sans">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Save Payment
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddPaymentModal;
