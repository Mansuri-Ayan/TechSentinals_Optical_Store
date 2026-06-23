import { useEffect } from 'react';
import { Coins, Smartphone, CreditCard, CheckCircle2, Clock, AlertCircle, Sparkles } from 'lucide-react';

const PaymentForm = ({
  subtotal,
  discount,
  onDiscountChange,
  payment,
  onPaymentChange,
  loyaltyDiscount = 0,
}) => {
  const totalDiscount = (Number(discount) || 0) + (Number(loyaltyDiscount) || 0);
  const finalAmount = Math.max(0, subtotal - totalDiscount);

  // Synchronize payment amounts when finalAmount changes
  useEffect(() => {
    let received = payment.receivedAmount;
    let remaining = payment.remainingAmount;

    if (payment.status === 'Paid') {
      received = finalAmount;
      remaining = 0;
    } else if (payment.status === 'Unpaid') {
      received = 0;
      remaining = finalAmount;
    } else if (payment.status === 'Partial') {
      if (payment.receivedAmount === '') {
        received = '';
        remaining = finalAmount;
      } else {
        const curRec = Number(payment.receivedAmount) || 0;
        received = Math.min(finalAmount, curRec);
        remaining = Math.max(0, finalAmount - received);
      }
    }

    if (received !== payment.receivedAmount || remaining !== payment.remainingAmount) {
      onPaymentChange(prev => ({
        ...prev,
        receivedAmount: received,
        remainingAmount: remaining,
      }));
    }
  }, [finalAmount]);

  const handleMethodChange = (method) => {
    onPaymentChange({
      ...payment,
      method,
      upiId: method === 'UPI' ? payment.upiId : '',
    });
  };

  const handleStatusChange = (status) => {
    let received = payment.receivedAmount;
    let remaining = payment.remainingAmount;
    if (status === 'Paid') {
      received = finalAmount;
      remaining = 0;
    } else if (status === 'Unpaid') {
      received = 0;
      remaining = finalAmount;
    } else if (status === 'Partial') {
      received = Math.round(finalAmount / 2);
      remaining = finalAmount - received;
    }
    onPaymentChange({
      ...payment,
      status,
      receivedAmount: received,
      remainingAmount: remaining,
    });
  };

  const handleReceivedAmountChange = (val) => {
    if (val === '') {
      onPaymentChange({
        ...payment,
        receivedAmount: '',
        remainingAmount: finalAmount,
      });
      return;
    }
    const num = Number(val);
    // Allow user to type beyond limits temporarily without clamping, let validation handle it
    const remaining = Math.max(0, finalAmount - num);
    onPaymentChange({
      ...payment,
      receivedAmount: val,
      remainingAmount: remaining,
    });
  };

  const handleUpiIdChange = (upiId) => {
    onPaymentChange({
      ...payment,
      upiId,
    });
  };

  const inputCls =
    'w-full px-3.5 py-2.5 text-xs font-semibold border rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 border-slate-200 placeholder:text-slate-400 bg-white transition-all';

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <CreditCard className="w-5 h-5 text-blue-500" />
        <h3 className="text-sm font-extrabold text-slate-850 uppercase tracking-wider">
          Payment & Billing Options
        </h3>
      </div>

      {/* Pricing Form Row: Discount and totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-150">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Subtotal
          </label>
          <div className="text-sm font-bold text-slate-700 bg-slate-100/80 px-3.5 py-2.5 rounded-xl border border-slate-200 border-dashed">
            ₹{subtotal.toLocaleString('en-IN')}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Discount (₹)
          </label>
          <input
            type="number"
            min="0"
            max={subtotal}
            value={discount === '' || discount === null || discount === undefined ? '' : discount}
            onChange={(e) => {
              const val = e.target.value;
              onDiscountChange(val === '' ? '' : Math.min(subtotal, Math.max(0, Number(val))));
            }}
            placeholder="Enter discount amount"
            className={`${inputCls} font-bold text-slate-800 focus:border-blue-500 focus:ring-blue-500/10`}
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Final Amount
          </label>
          <div className="text-sm font-black text-slate-900 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-sm">
            ₹{finalAmount.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Loyalty Discount Display */}
      {loyaltyDiscount > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            Loyalty Points Discount
          </span>
          <span className="text-xs font-black text-emerald-700">- ₹{loyaltyDiscount.toLocaleString('en-IN')}</span>
        </div>
      )}

      {/* Payment Method Selector */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          Select Payment Method
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleMethodChange('Cash')}
            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border text-center transition-all cursor-pointer ${
              payment.method === 'Cash'
                ? 'border-blue-500 bg-blue-50/40 text-blue-700 font-bold ring-2 ring-blue-500/10'
                : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-white'
            }`}
          >
            <Coins className={`w-5 h-5 ${payment.method === 'Cash' ? 'text-blue-500' : 'text-slate-400'}`} />
            <span className="text-xs font-bold">Cash Payment</span>
          </button>

          <button
            type="button"
            onClick={() => handleMethodChange('UPI')}
            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border text-center transition-all cursor-pointer ${
              payment.method === 'UPI'
                ? 'border-blue-500 bg-blue-50/40 text-blue-700 font-bold ring-2 ring-blue-500/10'
                : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-white'
            }`}
          >
            <Smartphone className={`w-5 h-5 ${payment.method === 'UPI' ? 'text-blue-500' : 'text-slate-400'}`} />
            <span className="text-xs font-bold">UPI / QR Code</span>
          </button>
        </div>
      </div>

      {/* Payment Status Selector */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          Select Payment Status
        </label>
        <div className="grid grid-cols-3 gap-3">
          {/* Paid Button */}
          <button
            type="button"
            onClick={() => handleStatusChange('Paid')}
            className={`flex items-center justify-center gap-1.5 py-3 px-4 border rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              payment.status === 'Paid'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/10'
                : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Paid
          </button>

          {/* Partial Button */}
          <button
            type="button"
            onClick={() => handleStatusChange('Partial')}
            className={`flex items-center justify-center gap-1.5 py-3 px-4 border rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              payment.status === 'Partial'
                ? 'border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-500/10'
                : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            Partial
          </button>

          {/* Unpaid Button */}
          <button
            type="button"
            onClick={() => handleStatusChange('Unpaid')}
            className={`flex items-center justify-center gap-1.5 py-3 px-4 border rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              payment.status === 'Unpaid'
                ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-500/10'
                : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-white'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            Unpaid
          </button>
        </div>
      </div>

      {/* Conditional Inputs: Cash Details or UPI ID */}
      <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 sm:p-5 space-y-4">
        {/* UPI ID Field */}
        {payment.method === 'UPI' && (
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              UPI Transaction ID *
            </label>
            <input
              type="text"
              value={payment.upiId || ''}
              onChange={(e) => handleUpiIdChange(e.target.value)}
              placeholder="Enter 12-digit transaction Reference Number"
              className={`${inputCls} font-mono`}
            />
          </div>
        )}

        {/* Amount Breakdowns */}
        <div className="grid grid-cols-2 gap-4">
          {/* Received/Paid Amount */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Received Amount
            </label>
            <input
              type="number"
              min="0"
              max={finalAmount}
              value={payment.receivedAmount === '' || payment.receivedAmount === null || payment.receivedAmount === undefined ? '' : payment.receivedAmount}
              disabled={payment.status === 'Paid' || payment.status === 'Unpaid'}
              onChange={(e) => handleReceivedAmountChange(e.target.value)}
              className={`${inputCls} font-bold text-slate-800 ${
                payment.status !== 'Partial' ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-dashed' : ''
              }`}
            />
          </div>

          {/* Balance Due (Outstanding Amount) */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Balance Due
            </label>
            <div
              className={`text-xs font-bold px-3.5 py-2.5 rounded-xl border border-dashed text-center flex items-center justify-center h-10 ${
                payment.remainingAmount > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-700 font-extrabold'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 font-extrabold'
              }`}
            >
              ₹{(payment.remainingAmount || 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;
