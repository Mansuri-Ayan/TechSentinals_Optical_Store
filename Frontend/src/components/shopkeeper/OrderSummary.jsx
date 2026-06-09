import { User, Eye, ShoppingBag } from 'lucide-react';

const GRAD_PALETTE = [
  'from-blue-400 to-indigo-600',
  'from-emerald-400 to-teal-600',
  'from-purple-400 to-violet-600',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-600',
  'from-cyan-400 to-sky-600',
];

const OrderSummary = ({ customer, cart, prescription, subtotal, discount, finalAmount }) => {
  const hasPrescription =
    prescription &&
    (prescription.lensType ||
      prescription.doctorName ||
      prescription.prescriptionDate ||
      prescription.rightEye?.sph ||
      prescription.leftEye?.sph);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden font-sans">
      {/* Customer Info Header */}
      <div className="p-5 sm:p-6 border-b border-slate-50">
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

      {/* Selected Products List */}
      <div className="p-5 sm:p-6 border-b border-slate-50">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
            <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Selected Products
          </h3>
          <span className="ml-auto text-[10px] font-bold text-slate-450">
            {cart?.length || 0} item{cart?.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 hide-scrollbar">
          {cart && cart.map((item, index) => {
            const { product, quantity, selectedColor, selectedSize } = item;
            const grad = GRAD_PALETTE[product.id % GRAD_PALETTE.length];
            const lineTotal = product.selling_price * quantity;

            return (
              <div
                key={`${product.id}-${index}`}
                className="flex items-center gap-3 py-2 px-3 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition-colors border border-slate-100/50"
              >
                {/* Product Image/Avatar */}
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center flex-shrink-0 bg-white">
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

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {product.product_name}
                  </p>
                  <p className="text-[10px] text-slate-450 font-semibold truncate">
                    {product.brand} {selectedColor && `· ${selectedColor}`} {selectedSize && `· Size ${selectedSize}`}
                  </p>
                </div>

                {/* Qty */}
                <div className="text-center flex-shrink-0 px-2 border-r border-slate-105">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Qty</p>
                  <p className="text-xs font-extrabold text-slate-700">{quantity}</p>
                </div>

                {/* Unit Price */}
                <div className="text-right flex-shrink-0 hidden sm:block px-2">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Unit</p>
                  <p className="text-xs font-semibold text-slate-600">
                    ₹{product.selling_price.toLocaleString('en-IN')}
                  </p>
                </div>

                {/* Line Total */}
                <div className="text-right flex-shrink-0 w-20">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Total</p>
                  <p className="text-xs font-bold text-slate-900">
                    ₹{lineTotal.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Optical Prescription Info */}
      {hasPrescription && (
        <div className="p-5 sm:p-6 border-b border-slate-50 bg-slate-50/30">
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
                <p className="text-xs font-bold text-slate-700">
                  {prescription.lensType}
                </p>
              </div>
            )}
            {prescription.doctorName && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                  Doctor Name
                </p>
                <p className="text-xs font-bold text-slate-700">
                  {prescription.doctorName}
                </p>
              </div>
            )}
            {prescription.prescriptionDate && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                  Prescription Date
                </p>
                <p className="text-xs font-bold text-slate-700">
                  {new Date(prescription.prescriptionDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Eye Matrix Grid */}
          {(prescription.rightEye?.sph !== '' || prescription.leftEye?.sph !== '') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {prescription.rightEye?.sph !== '' && (
                <div className="bg-white rounded-xl p-3 border border-slate-150 shadow-sm">
                  <p className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Right Eye (OD)
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold text-slate-500">
                    <div>
                      SPH: <span className="font-bold text-slate-800">{prescription.rightEye.sph ?? '—'}</span>
                    </div>
                    <div>
                      CYL: <span className="font-bold text-slate-800">{prescription.rightEye.cyl ?? '—'}</span>
                    </div>
                    <div>
                      AXIS: <span className="font-bold text-slate-800">{prescription.rightEye.axis ?? '—'}</span>
                    </div>
                  </div>
                </div>
              )}
              {prescription.leftEye?.sph !== '' && (
                <div className="bg-white rounded-xl p-3 border border-slate-150 shadow-sm">
                  <p className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Left Eye (OS)
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold text-slate-500">
                    <div>
                      SPH: <span className="font-bold text-slate-800">{prescription.leftEye.sph ?? '—'}</span>
                    </div>
                    <div>
                      CYL: <span className="font-bold text-slate-800">{prescription.leftEye.cyl ?? '—'}</span>
                    </div>
                    <div>
                      AXIS: <span className="font-bold text-slate-800">{prescription.leftEye.axis ?? '—'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bill Totals Panel */}
      <div className="p-5 sm:p-6 bg-slate-50/70 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>Subtotal</span>
          <span className="font-bold text-slate-700">₹{subtotal.toLocaleString('en-IN')}</span>
        </div>
        {discount > 0 && (
          <div className="flex items-center justify-between text-xs font-semibold text-red-500">
            <span>Discount Applied</span>
            <span>- ₹{discount.toLocaleString('en-IN')}</span>
          </div>
        )}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800">Final Amount</span>
          <span className="text-lg font-black text-slate-900">₹{finalAmount.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
