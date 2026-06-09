import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import StepIndicator from '../../components/shopkeeper/StepIndicator';
import ProductSelectionStep from '../../components/shopkeeper/ProductSelectionStep';
import CustomerDetailsStep from '../../components/shopkeeper/CustomerDetailsStep';
import OpticalPrescriptionForm from '../../components/shopkeeper/OpticalPrescriptionForm';
import PaymentStep from '../../components/shopkeeper/PaymentStep';
import CompletedStep from '../../components/shopkeeper/CompletedStep';
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

  const [savedCustomer, setSavedCustomer] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);

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
    const paymentInfoObj = {
      ...payment,
      discount,
    };

    // Save using customer service layer
    const result = saveCustomer(customer, cart, prescription, paymentInfoObj, 'Pending', 'Shopkeeper');

    setSavedCustomer(result);
    setPaymentInfo(paymentInfoObj);
    setActiveStep(5);
  };

  const handleReset = () => {
    setCart([]);
    setCustomer(defaultCustomer);
    setPrescription(defaultPrescription);
    setPaymentInfo(null);
    setSavedCustomer(null);
    setActiveStep(1);
  };

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
          <CustomerDetailsStep
            formState={customer}
            onSaveState={setCustomer}
            onBack={() => navigate('/shopkeeper/dashboard')}
            onNext={() => setActiveStep(2)}
          />
        )}

        {activeStep === 2 && (
          <OpticalPrescriptionForm
            prescription={prescription}
            onChange={setPrescription}
            onBack={() => setActiveStep(1)}
            onNext={() => setActiveStep(3)}
          />
        )}

        {activeStep === 3 && (
          <ProductSelectionStep
            cart={cart}
            onAddToCart={handleAddToCart}
            onRemoveFromCart={handleRemoveFromCart}
            onUpdateQuantity={handleUpdateQuantity}
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

        {activeStep === 5 && (
          <CompletedStep
            customer={customer}
            cart={cart}
            prescription={prescription}
            paymentInfo={paymentInfo}
            savedCustomer={savedCustomer}
            onReset={handleReset}
            onBackToPayment={() => setActiveStep(4)}
          />
        )}
      </div>
    </div>
  );
};

export default Shopkeeper;
