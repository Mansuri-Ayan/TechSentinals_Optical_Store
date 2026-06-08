import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PartyPopper, RotateCcw, User, ClipboardList } from 'lucide-react';
import StepIndicator from '../../components/shopkeeper/StepIndicator';
import ProductSelectionStep from '../../components/shopkeeper/ProductSelectionStep';
import CustomerDetailsStep from '../../components/shopkeeper/CustomerDetailsStep';
import OpticalPrescriptionForm from '../../components/shopkeeper/OpticalPrescriptionForm';
import PaymentStep from '../../components/shopkeeper/PaymentStep';
import { saveCustomer } from '../../services/customerService';

const defaultCustomer = {
  id: null,
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  remark: '',
};

const defaultPrescription = {
  rightEye: { sph: '', cyl: '', axis: '', addPower: '', pd: '' },
  leftEye: { sph: '', cyl: '', axis: '', addPower: '', pd: '' },
  lensType: '',
  framePreference: '',
  lensCoating: '',
  doctorName: '',
  prescriptionDate: new Date().toISOString().split('T')[0],
  notes: '',
};

const Shopkeeper = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(1);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(defaultCustomer);
  const [prescription, setPrescription] = useState(defaultPrescription);

  const [orderComplete, setOrderComplete] = useState(false);
  const [savedCustomer, setSavedCustomer] = useState(null);

  const handleAddToCart = (product, quantity, color, size) => {
    setCart((prev) => {
      const idx = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.selectedColor === color &&
          item.selectedSize === size
      );
      if (idx > -1) {
        const updated = [...prev];
        updated[idx].quantity += quantity;
        return updated;
      }
      return [...prev, { product, quantity, selectedColor: color, selectedSize: size }];
    });
  };

  const handleRemoveFromCart = (productId, color, size) => {
    setCart((prev) =>
      prev.filter(
        (item) =>
          !(
            item.product.id === productId &&
            item.selectedColor === color &&
            item.selectedSize === size
          )
      )
    );
  };

  const handleUpdateQuantity = (productId, color, size, qty) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId &&
        item.selectedColor === color &&
        item.selectedSize === size
          ? { ...item, quantity: qty }
          : item
      )
    );
  };

  const handleComplete = (payment, discount) => {
    const paymentInfo = {
      ...payment,
      discount,
    };

    // Save using customer service layer
    const result = saveCustomer(customer, cart, prescription, paymentInfo, 'Pending', 'Shopkeeper');

    setSavedCustomer(result);
    setOrderComplete(true);

    // Reset wizard state
    setCart([]);
    setCustomer(defaultCustomer);
    setPrescription(defaultPrescription);
    setActiveStep(1);
  };

  const handleCreateAnother = () => {
    setOrderComplete(false);
    setSavedCustomer(null);
  };

  /* ── Success Screen ── */
  if (orderComplete && savedCustomer) {
    const lastOrder = savedCustomer.orders?.[0] || {};

    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto font-sans min-h-[70vh] flex items-center justify-center">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8 sm:p-12 max-w-lg w-full text-center animate-fade-in">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-100 mb-6 mx-auto animate-bounce">
            <PartyPopper className="w-10 h-10 text-emerald-500" />
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Order Placed Successfully!
          </h1>
          <p className="text-slate-500 text-sm sm:text-base mb-6 font-medium">
            The customer profile and optical order have been updated.
          </p>

          {/* Customer / Order Info */}
          <div className="bg-slate-50 rounded-2xl border border-slate-150 p-5 mb-8 space-y-3 text-left">
            <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Order ID</span>
              <span className="font-mono font-bold text-slate-800">
                {lastOrder.id || 'ORD-UNKNOWN'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Customer</span>
              <span className="font-extrabold text-slate-850">
                {savedCustomer.firstName} {savedCustomer.lastName}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Items Purchased</span>
              <span className="font-bold text-slate-700">
                {lastOrder.items?.length || 0} items
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Total Received</span>
              <span className="font-black text-emerald-600 text-sm">
                ₹{(lastOrder.receivedAmount || 0).toLocaleString('en-IN')}
              </span>
            </div>
            {lastOrder.remainingAmount > 0 && (
              <div className="flex items-center justify-between text-xs pt-2 text-amber-600 font-bold">
                <span>Outstanding Balance</span>
                <span>₹{lastOrder.remainingAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleCreateAnother}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[#0A0F1F] text-white rounded-xl text-xs font-bold hover:bg-slate-850 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Create Another Order
            </button>
            <button
              type="button"
              onClick={() => navigate(`/shopkeeper/customers/${savedCustomer.id}`)}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 hover:border-slate-350 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
            >
              <User className="w-4 h-4" />
              View Customer Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Stepper Navigation Click Handlers ── */
  const handleStepClick = (step) => {
    // Only allow clicking to steps that have already been visited / validated
    if (step < activeStep) {
      setActiveStep(step);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in font-sans">
      {/* ── Page Header ── */}
      <div className="mb-6 sm:mb-8 flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            Optical Order Checkout
          </h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm font-medium">
            POS & CRM Unified Flow: Products selection, customer records, optical prescriptions, and billing.
          </p>
        </div>
      </div>

      {/* ── Stepper Indicator ── */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm mb-6">
        <StepIndicator activeStep={activeStep} onStepClick={handleStepClick} />
      </div>

      {/* ── Steps Container ── */}
      <div className="mt-6">
        {activeStep === 1 && (
          <ProductSelectionStep
            cart={cart}
            onAddToCart={handleAddToCart}
            onRemoveFromCart={handleRemoveFromCart}
            onUpdateQuantity={handleUpdateQuantity}
            onNext={() => setActiveStep(2)}
          />
        )}

        {activeStep === 2 && (
          <CustomerDetailsStep
            formState={customer}
            onSaveState={setCustomer}
            onBack={() => setActiveStep(1)}
            onNext={() => setActiveStep(3)}
          />
        )}

        {activeStep === 3 && (
          <OpticalPrescriptionForm
            prescription={prescription}
            onChange={setPrescription}
            onBack={() => setActiveStep(2)}
            onNext={() => setActiveStep(4)}
          />
        )}

        {activeStep === 4 && (
          <PaymentStep
            customer={customer}
            cart={cart}
            prescription={prescription}
            onBack={() => setActiveStep(3)}
            onComplete={handleComplete}
          />
        )}
      </div>
    </div>
  );
};

export default Shopkeeper;
