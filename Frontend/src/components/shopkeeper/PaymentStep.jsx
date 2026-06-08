import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import OrderSummary from './OrderSummary';
import PaymentForm from './PaymentForm';

const PaymentStep = ({ customer, cart, prescription, onBack, onComplete }) => {
  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.selling_price * item.quantity,
    0
  );

  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState({
    method: 'Cash',
    receivedAmount: subtotal,
    remainingAmount: 0,
    upiId: '',
    status: 'Paid',
  });

  const finalAmount = Math.max(0, subtotal - discount);

  // Auto-sync received amount on discount change
  useEffect(() => {
    setPayment((prev) => {
      let received = prev.receivedAmount;
      let remaining = prev.remainingAmount;

      if (prev.status === 'Paid') {
        received = finalAmount;
        remaining = 0;
      } else if (prev.status === 'Unpaid') {
        received = 0;
        remaining = finalAmount;
      } else if (prev.status === 'Partial') {
        // cap it
        received = Math.min(finalAmount, Number(prev.receivedAmount) || 0);
        remaining = Math.max(0, finalAmount - received);
      }

      return {
        ...prev,
        receivedAmount: received,
        remainingAmount: remaining,
      };
    });
  }, [discount, finalAmount]);

  const handleComplete = () => {
    // Validate UPI ID
    if (payment.method === 'UPI' && !payment.upiId.trim()) return;
    
    // Validate Received Amount for Cash or Partial
    if (payment.status === 'Partial' && (payment.receivedAmount === '' || payment.receivedAmount === undefined)) {
      return;
    }

    onComplete(payment, discount);
  };

  // Check if complete button should be disabled
  const isInvalid = () => {
    if (payment.method === 'UPI' && !payment.upiId.trim()) {
      return true;
    }
    if (payment.status === 'Partial') {
      if (payment.receivedAmount === '' || payment.receivedAmount === undefined) {
        return true;
      }
      const rec = Number(payment.receivedAmount);
      if (rec <= 0 || rec >= finalAmount) {
        return true;
      }
    }
    return false;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans animate-fade-in">
      {/* Left Column: Order Summary */}
      <div className="lg:col-span-6 xl:col-span-7">
        <OrderSummary
          customer={customer}
          cart={cart}
          prescription={prescription}
          subtotal={subtotal}
          discount={discount}
          finalAmount={finalAmount}
        />
      </div>

      {/* Right Column: Payment & Billing Form */}
      <div className="lg:col-span-6 xl:col-span-5 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
          <PaymentForm
            subtotal={subtotal}
            discount={discount}
            onDiscountChange={setDiscount}
            payment={payment}
            onPaymentChange={setPayment}
          />
        </div>

        {/* Footer actions inside the column for better layout flow */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Prescription
          </button>

          <button
            type="button"
            onClick={handleComplete}
            disabled={isInvalid()}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-md cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            Complete Order
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentStep;
