import { useState } from 'react';
import { User, Eye, ShoppingBag, CheckCircle, Printer, Share2, ArrowLeft, RefreshCw, Sparkles } from 'lucide-react';


const CompletedStep = ({ customer, cart, prescription, paymentInfo, savedCustomer, onReset, onBackToPayment }) => {
  const [copied, setCopied] = useState(false);
  const orderId = savedCustomer?.orders?.[0]?.id || 'ORD-UNKNOWN';
  const orderDate = savedCustomer?.orders?.[0]?.date || new Date().toISOString().split('T')[0];

  const totalAmount = cart.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0);
  const discount = paymentInfo?.discount || 0;
  const loyaltyDiscount = paymentInfo?.loyaltyDiscount || 0;
  const finalAmount = Math.max(0, totalAmount - discount - loyaltyDiscount);
  const receivedAmount = Number(paymentInfo?.receivedAmount) || finalAmount;
  const remainingAmount = finalAmount - receivedAmount;

  const hasPrescription =
    prescription &&
    (prescription.lensType ||
      prescription.doctorName ||
      prescription.rightEye?.sph ||
      prescription.leftEye?.sph);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const shareText = `Optical Invoice for ${customer.firstName} ${customer.lastName}\nOrder ID: ${orderId}\nTotal: ₹${finalAmount.toLocaleString('en-IN')}\nStatus: Paid (Cash/UPI)`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Optical Store Receipt',
          text: shareText,
          url: window.location.href,
        });
      } catch {
        // Fallback
        copyToClipboard(shareText);
      }
    } else {
      copyToClipboard(shareText);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 font-sans max-w-3xl mx-auto">
      {/* CSS style injection to optimize browser printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-receipt-area, #print-receipt-area * {
            visibility: visible;
          }
          #print-receipt-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* ── Success Toast ── */}
      <div className="bg-emerald-50 border border-emerald-250 p-4 sm:p-5 rounded-2xl flex items-center gap-3.5 shadow-sm no-print">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 animate-pulse">
          <CheckCircle className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">Transaction Confirmed</p>
          <p className="text-sm font-semibold text-slate-800 mt-0.5">
            Order has been processed and saved successfully!
          </p>
        </div>
      </div>

      {/* ── Receipt/Bill Printable Area ── */}
      <div id="print-receipt-area" className="bg-white rounded-3xl border border-slate-150 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
        
        {/* Receipt Header */}
        <div className="flex justify-between items-start gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              TechSentinals Optical Store
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-1">Tax Invoice / Receipt</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono font-bold text-slate-850 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl inline-block">
              {orderId}
            </p>
            <p className="text-[10px] text-slate-400 font-bold mt-1">
              Date: {new Date(orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Customer & Billing Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-5 border-b border-slate-100">
          <div>
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Customer Details
            </h3>
            <div className="text-xs font-semibold text-slate-650 space-y-1">
              <p className="font-bold text-slate-900 text-sm">{customer.firstName || customer.first_name || ''} {customer.lastName || customer.last_name || ''}</p>
              <p>Phone: {customer.phone}</p>
              {customer.email && <p>Email: {customer.email}</p>}
              {customer.address && <p>Address: {customer.address}, {customer.city}</p>}
            </div>
          </div>

          <div className="md:text-right">
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 md:justify-end flex items-center gap-1">
              Payment Method
            </h3>
            <div className="text-xs font-semibold text-slate-650 space-y-1">
              <p className="font-bold text-slate-900">Paid via: <span className="text-emerald-600">{paymentInfo?.method || 'Cash'}</span></p>
              {paymentInfo?.method === 'UPI' && paymentInfo?.upiId && (
                <p className="font-mono">Ref ID: {paymentInfo.upiId}</p>
              )}
              <p>Outstanding Balance: ₹{remainingAmount.toLocaleString('en-IN')}</p>
              <p>Receipt Status: <span className="inline-flex px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200">Paid</span></p>
            </div>
          </div>
        </div>

        {/* Prescription Summary */}
        {hasPrescription ? (
          <div className="bg-slate-50/70 border border-slate-150 rounded-2xl p-4 sm:p-5">
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-purple-500" /> Lens & Prescription Details
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mb-3 font-semibold text-slate-650">
              {prescription.lensType && <div>Lens Type: <span className="text-slate-900 font-bold">{prescription.lensType}</span></div>}
              {prescription.framePreference && <div>Frame Pref: <span className="text-slate-900 font-bold">{prescription.framePreference}</span></div>}
              {prescription.doctorName && <div>Doctor Name: <span className="text-slate-900 font-bold">{prescription.doctorName}</span></div>}
            </div>

            {/* Matrix details */}
            {(prescription.rightEye?.sph !== '' || prescription.leftEye?.sph !== '') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {prescription.rightEye?.sph !== '' && (
                  <div className="bg-white rounded-xl p-3 border border-slate-150 shadow-sm">
                    <p className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Right Eye (OD)
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold text-slate-500">
                      <div>SPH: <span className="font-bold text-slate-800">{prescription.rightEye.sph ?? '—'}</span></div>
                      <div>CYL: <span className="font-bold text-slate-800">{prescription.rightEye.cyl ?? '—'}</span></div>
                      <div>AXIS: <span className="font-bold text-slate-800">{prescription.rightEye.axis ?? '—'}</span></div>
                    </div>
                  </div>
                )}
                {prescription.leftEye?.sph !== '' && (
                  <div className="bg-white rounded-xl p-3 border border-slate-150 shadow-sm">
                    <p className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Left Eye (OS)
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold text-slate-500">
                      <div>SPH: <span className="font-bold text-slate-800">{prescription.leftEye.sph ?? '—'}</span></div>
                      <div>CYL: <span className="font-bold text-slate-800">{prescription.leftEye.cyl ?? '—'}</span></div>
                      <div>AXIS: <span className="font-bold text-slate-800">{prescription.leftEye.axis ?? '—'}</span></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl p-4 text-center text-xs font-semibold text-slate-450">
            No Prescription Details Attached (Skipped)
          </div>
        )}

        {/* Invoice Items table */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <ShoppingBag className="w-3.5 h-3.5" /> Items Particulars
          </h3>
          <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="px-4 py-3">Product description</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                {cart.map((item, idx) => {
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-900">{item.product.product_name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {item.product.brand} {item.selectedColor && `· Color: ${item.selectedColor}`} {item.selectedSize && `· Size: ${item.selectedSize}`}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono">{item.quantity}</td>
                      <td className="px-4 py-3.5 text-right font-mono">₹{item.product.selling_price.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900 font-mono">₹{(item.product.selling_price * item.quantity).toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pricing calculations */}
        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 sm:p-5 flex flex-col gap-2.5 max-w-md ml-auto">
          <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
            <span>Subtotal</span>
            <span className="font-mono">₹{totalAmount.toLocaleString('en-IN')}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between items-center text-xs text-red-500 font-bold">
              <span>Discounts Applied</span>
              <span className="font-mono">- ₹{discount.toLocaleString('en-IN')}</span>
            </div>
          )}
          {loyaltyDiscount > 0 && (
            <div className="flex justify-between items-center text-xs text-emerald-600 font-bold">
              <span>Loyalty Points Discount</span>
              <span className="font-mono">- ₹{loyaltyDiscount.toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-xs text-slate-800 font-extrabold border-t border-slate-200/60 pt-2">
            <span>Final Total</span>
            <span className="text-sm font-black text-slate-950 font-mono">₹{finalAmount.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between items-center text-xs text-emerald-600 font-extrabold pt-1">
            <span>Amount Received</span>
            <span className="font-mono">₹{receivedAmount.toLocaleString('en-IN')}</span>
          </div>
          {remainingAmount > 0 && (
            <div className="flex justify-between items-center text-xs text-amber-600 font-extrabold">
              <span>Balance Due</span>
              <span className="font-mono">₹{remainingAmount.toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>

      </div>

      {/* ── Buttons Section ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={onBackToPayment}
            className="flex items-center justify-center gap-2 px-5 py-3 border border-slate-200 hover:border-slate-350 text-slate-650 hover:text-slate-900 bg-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer w-full sm:w-auto"
            type="button"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous Step
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 px-5 py-3 border border-slate-205 hover:bg-slate-50 text-slate-800 bg-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer w-full sm:w-auto"
            type="button"
          >
            <Printer className="w-4 h-4 text-slate-550" />
            Print Receipt
          </button>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 px-5 py-3 border border-blue-200 hover:bg-blue-50 text-blue-600 bg-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer w-full sm:w-auto"
            type="button"
          >
            <Share2 className="w-4 h-4 text-blue-500" />
            {copied ? 'Copied Details!' : 'Share Bill'}
          </button>

          <button
            onClick={onReset}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#0A0F1F] hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer w-full sm:w-auto"
            type="button"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            New Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompletedStep;
