import { Coins, Smartphone, CreditCard, CheckCircle2, Clock } from 'lucide-react';

const PaymentSection = ({ totalAmount, payment, onChange }) => {
  const handleMethodChange = (method) => {
    const updated = {
      ...payment,
      method,
      totalAmount,
    };
    if (method === 'Cash') {
      updated.receivedAmount = totalAmount;
      updated.remainingAmount = 0;
      updated.status = 'Paid';
    } else {
      updated.upiId = '';
      updated.status = 'Paid';
    }
    onChange(updated);
  };

  const handleCashReceivedChange = (received) => {
    const val = Number(received) || 0;
    const remaining = Math.max(0, totalAmount - val);
    onChange({
      ...payment,
      receivedAmount: received,
      remainingAmount: remaining,
      status: remaining === 0 ? 'Paid' : 'Pending',
    });
  };

  const handleFieldChange = (key, val) => {
    onChange({
      ...payment,
      [key]: val,
    });
  };

  const inputCls =
    'w-full px-3 py-2 text-xs font-semibold border rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 border-slate-200 placeholder:text-slate-400 bg-white transition-all';

  return (
    <div className="space-y-4 font-sans">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
        <CreditCard className="w-3.5 h-3.5" /> Payment Information
      </p>

      {/* Selector Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Cash Card */}
        <button
          type="button"
          onClick={() => handleMethodChange('Cash')}
          className={`flex flex-col items-center gap-2 p-3 rounded-2xl border text-center transition-all cursor-pointer ${
            payment.method === 'Cash'
              ? 'border-blue-500 bg-blue-50/40 text-blue-700 font-bold ring-2 ring-blue-500/10'
              : 'border-slate-200 hover:border-slate-300 text-slate-500'
          }`}
        >
          <Coins className={`w-5 h-5 ${payment.method === 'Cash' ? 'text-blue-500' : 'text-slate-400'}`} />
          <span className="text-xs font-bold">Cash Payment</span>
        </button>

        {/* UPI Card */}
        <button
          type="button"
          onClick={() => handleMethodChange('UPI')}
          className={`flex flex-col items-center gap-2 p-3 rounded-2xl border text-center transition-all cursor-pointer ${
            payment.method === 'UPI'
              ? 'border-blue-500 bg-blue-50/40 text-blue-700 font-bold ring-2 ring-blue-500/10'
              : 'border-slate-200 hover:border-slate-300 text-slate-500'
          }`}
        >
          <Smartphone className={`w-5 h-5 ${payment.method === 'UPI' ? 'text-blue-500' : 'text-slate-400'}`} />
          <span className="text-xs font-bold">UPI / QR Code</span>
        </button>
      </div>

      {/* Cash Payment Details */}
      {payment.method === 'Cash' && (
        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Due</label>
              <input
                type="text"
                value={`₹${totalAmount.toLocaleString('en-IN')}`}
                disabled
                className={`${inputCls} bg-slate-100 font-bold text-slate-700 border-dashed`}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Received Amount *</label>
              <input
                type="number"
                min="0"
                max={totalAmount}
                value={payment.receivedAmount}
                onChange={(e) => handleCashReceivedChange(e.target.value)}
                placeholder="e.g. 1000"
                required
                className={`${inputCls} font-bold text-slate-800`}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Balance Due</label>
              <input
                type="text"
                value={`₹${(payment.remainingAmount || 0).toLocaleString('en-IN')}`}
                disabled
                className={`${inputCls} bg-slate-100 font-bold ${
                  payment.remainingAmount > 0 ? 'text-amber-600' : 'text-emerald-600'
                } border-dashed`}
              />
            </div>
          </div>
        </div>
      )}

      {/* UPI Payment Details */}
      {payment.method === 'UPI' && (
        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">UPI Transaction ID *</label>
              <input
                type="text"
                value={payment.upiId || ''}
                onChange={(e) => handleFieldChange('upiId', e.target.value)}
                placeholder="Enter 12-digit transaction ID"
                required
                className={`${inputCls} font-mono`}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Payment Status</label>
              <div className="grid grid-cols-2 gap-2 mt-0.5">
                {/* Status Paid */}
                <button
                  type="button"
                  onClick={() => handleFieldChange('status', 'Paid')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 border rounded-xl text-xs font-bold transition-all ${
                    payment.status === 'Paid'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/10'
                      : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-white'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Paid
                </button>

                {/* Status Pending */}
                <button
                  type="button"
                  onClick={() => handleFieldChange('status', 'Pending')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 border rounded-xl text-xs font-bold transition-all ${
                    payment.status === 'Pending'
                      ? 'border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-500/10'
                      : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Pending
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentSection;
