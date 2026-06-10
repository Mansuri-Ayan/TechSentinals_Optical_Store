/* eslint-disable */
import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, User, Eye, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import PaymentSection from './PaymentSection';

const GRAD_PALETTE = [
  'from-blue-400 to-indigo-600',
  'from-emerald-400 to-teal-600',
  'from-purple-400 to-violet-600',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-600',
  'from-cyan-400 to-sky-600',
];

const WizardPaymentStep = ({ customer, prescription, onBack, onComplete }) => {
  const { cart } = useCartStore();

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.product.selling_price * item.quantity,
    0
  );

  const [payment, setPayment] = useState({
    method: 'Cash',
    receivedAmount: totalAmount,
    remainingAmount: 0,
    upiId: '',
    status: 'Paid',
  });

  useEffect(() => {
    setPayment((prev) => ({
      ...prev,
      receivedAmount: totalAmount,
      remainingAmount: 0,
      status: 'Paid',
    }));
  }, [totalAmount]);

  const hasPrescription =
    prescription &&
    (prescription.lensType ||
      prescription.doctorName ||
      prescription.prescriptionDate ||
      prescription.rightEye?.sph ||
      prescription.leftEye?.sph);

  const handleComplete = () => {
    if (payment.method === 'UPI' && !payment.upiId?.trim()) return;
    if (
      payment.method === 'Cash' &&
      (payment.receivedAmount === '' || payment.receivedAmount === undefined)
    )
      return;
    onComplete(payment);
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* ── Order Summary Card ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* ── Customer Summary ── */}
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Customer Details
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                Full Name
              </p>
              <p className="text-sm font-bold text-slate-800">
                {customer?.firstName || ''} {customer?.lastName || ''}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                Phone
              </p>
              <p className="text-sm font-semibold text-slate-700">
                {customer?.phone || '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                Email
              </p>
              <p className="text-sm font-semibold text-slate-700 truncate">
                {customer?.email || '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                City
              </p>
              <p className="text-sm font-semibold text-slate-700">
                {customer?.city || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="border-t border-slate-100" />

        {/* ── Selected Products ── */}
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
              <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Selected Products
            </h3>
            <span className="ml-auto text-[10px] font-bold text-slate-400">
              {cart.length} item{cart.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-2.5">
            {cart.map((item, index) => {
              const { product, quantity } = item;
              const grad = GRAD_PALETTE[product.id % GRAD_PALETTE.length];
              const lineTotal = product.selling_price * quantity;

              return (
                <div
                  key={`${product.id}-${index}`}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center flex-shrink-0">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.product_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-extrabold text-[10px]`}
                      >
                        {product.product_name[0]}
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {product.product_name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      {product.brand}
                    </p>
                  </div>

                  {/* Qty */}
                  <div className="text-center flex-shrink-0">
                    <p className="text-[10px] text-slate-400 font-semibold">
                      Qty
                    </p>
                    <p className="text-xs font-bold text-slate-700">
                      {quantity}
                    </p>
                  </div>

                  {/* Unit Price */}
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="text-[10px] text-slate-400 font-semibold">
                      Unit
                    </p>
                    <p className="text-xs font-semibold text-slate-600">
                      ₹{product.selling_price.toLocaleString('en-IN')}
                    </p>
                  </div>

                  {/* Line Total */}
                  <div className="text-right flex-shrink-0 w-20">
                    <p className="text-[10px] text-slate-400 font-semibold">
                      Total
                    </p>
                    <p className="text-xs font-bold text-slate-900">
                      ₹{lineTotal.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grand Total */}
          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-600">Grand Total</p>
            <p className="text-lg font-black text-slate-900">
              ₹{totalAmount.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* ── Prescription Summary ── */}
        {hasPrescription && (
          <>
            <div className="border-t border-slate-100" />
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center">
                  <Eye className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Prescription Summary
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 mb-3">
                {prescription.lensType && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Lens Type
                    </p>
                    <p className="text-sm font-semibold text-slate-700">
                      {prescription.lensType}
                    </p>
                  </div>
                )}
                {prescription.doctorName && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Doctor Name
                    </p>
                    <p className="text-sm font-semibold text-slate-700">
                      {prescription.doctorName}
                    </p>
                  </div>
                )}
                {prescription.prescriptionDate && !isNaN(new Date(prescription.prescriptionDate).getTime()) && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Prescription Date
                    </p>
                    <p className="text-sm font-semibold text-slate-700">
                      {new Date(prescription.prescriptionDate).toLocaleDateString(
                        'en-IN',
                        { day: '2-digit', month: 'short', year: 'numeric' }
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Eye Data */}
              {(prescription.rightEye?.sph || prescription.leftEye?.sph) && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {prescription.rightEye?.sph && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Right Eye (OD)
                      </p>
                      <div className="flex gap-4 text-xs">
                        <div>
                          <span className="text-slate-400 font-semibold">
                            SPH:{' '}
                          </span>
                          <span className="font-bold text-slate-700">
                            {prescription.rightEye.sph}
                          </span>
                        </div>
                        {prescription.rightEye.cyl && (
                          <div>
                            <span className="text-slate-400 font-semibold">
                              CYL:{' '}
                            </span>
                            <span className="font-bold text-slate-700">
                              {prescription.rightEye.cyl}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {prescription.leftEye?.sph && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Left Eye (OS)
                      </p>
                      <div className="flex gap-4 text-xs">
                        <div>
                          <span className="text-slate-400 font-semibold">
                            SPH:{' '}
                          </span>
                          <span className="font-bold text-slate-700">
                            {prescription.leftEye.sph}
                          </span>
                        </div>
                        {prescription.leftEye.cyl && (
                          <div>
                            <span className="text-slate-400 font-semibold">
                              CYL:{' '}
                            </span>
                            <span className="font-bold text-slate-700">
                              {prescription.leftEye.cyl}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Payment Section ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
        <PaymentSection
          totalAmount={totalAmount}
          payment={payment}
          onChange={setPayment}
        />
      </div>

      {/* ── Footer Actions ── */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          type="button"
          onClick={handleComplete}
          disabled={
            (payment.method === 'UPI' && !payment.upiId?.trim()) ||
            (payment.method === 'Cash' &&
              (payment.receivedAmount === '' ||
                payment.receivedAmount === undefined))
          }
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-md"
        >
          <CheckCircle className="w-4 h-4" />
          Complete Order
        </button>
      </div>
    </div>
  );
};

export default WizardPaymentStep;
