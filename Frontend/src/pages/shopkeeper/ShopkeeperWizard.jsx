import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PartyPopper, Plus, RotateCcw } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import WizardStepper from '../../components/shopkeeper/WizardStepper';
import WizardProductStep from '../../components/shopkeeper/WizardProductStep';
import WizardCustomerStep from '../../components/shopkeeper/WizardCustomerStep';
import OpticalPrescriptionForm from '../../components/shopkeeper/OpticalPrescriptionForm';
import WizardPaymentStep from '../../components/shopkeeper/WizardPaymentStep';

const ShopkeeperWizard = () => {
  const navigate = useNavigate();
  const {
    wizardStep,
    wizardCustomer,
    wizardPrescription,
    cart,
    setWizardStep,
    setWizardCustomer,
    setWizardPrescription,
    resetWizard,
  } = useCartStore();

  const [orderComplete, setOrderComplete] = useState(false);
  const [savedCustomer, setSavedCustomer] = useState(null);

  /* ── Step navigation handlers ── */
  const handleStepClick = (step) => {
    if (step < wizardStep) {
      setWizardStep(step);
    }
  };

  const handleProductNext = () => setWizardStep(1);
  const handleCustomerBack = () => setWizardStep(0);
  const handleCustomerNext = () => setWizardStep(2);
  const handlePrescriptionBack = () => setWizardStep(1);
  const handlePrescriptionNext = () => setWizardStep(3);
  const handlePaymentBack = () => setWizardStep(2);

  /* ── Complete order ── */
  const handleComplete = (paymentInfo) => {
    const now = new Date().toISOString().split('T')[0];
    const data = wizardCustomer || {};

    // Map cart items to orders array (same structure as Customers.jsx handleSave)
    const orders = cart.map((item) => ({
      id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
      productId: item.product.id,
      frameName: item.product.product_name,
      productName: item.product.product_name,
      productImage: item.product.image || null,
      brand: item.product.brand,
      category: item.product.category,
      subcategory: item.product.subcategory,
      quantity: item.quantity,
      price: item.product.selling_price,
      amount: item.product.selling_price * item.quantity,
      date: now,
      paymentMethod: paymentInfo?.method || 'Cash',
      paymentStatus: paymentInfo?.status || 'Paid',
      upiId: paymentInfo?.upiId || '',
      receivedAmount:
        paymentInfo?.receivedAmount !== undefined
          ? Number(paymentInfo.receivedAmount)
          : 0,
      remainingAmount:
        paymentInfo?.remainingAmount !== undefined
          ? Number(paymentInfo.remainingAmount)
          : 0,
      status: paymentInfo?.status === 'Paid' ? 'Delivered' : 'Pending',
    }));

    const totalAmount = orders.reduce((sum, o) => sum + o.amount, 0);
    const outstandingBalance =
      paymentInfo?.method === 'Cash'
        ? Number(paymentInfo.remainingAmount || 0)
        : paymentInfo?.status === 'Pending'
          ? totalAmount
          : 0;

    const newCustomer = {
      id: Date.now(),
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      email: data.email || '',
      phone: data.phone || '',
      dateOfBirth: data.dateOfBirth || '',
      gender: data.gender || '',
      address: data.address || '',
      city: data.city || '',
      state: data.state || '',
      pincode: data.pincode || '',
      status: 'Active',
      customerSince: now,
      lastVisit: now,
      remark: data.remark || '',
      totalOrders: orders.length,
      totalAmount: totalAmount,
      outstandingBalance: outstandingBalance,
      prescription: wizardPrescription || null,
      orders: orders,
      history: [
        {
          date: now,
          event: 'Customer Created',
          description: 'Customer profile created in the system',
        },
        ...(orders.length > 0
          ? [
              {
                date: now,
                event: 'New Order Created',
                description: `Placed order for ${orders.length} items. Total: ₹${totalAmount.toLocaleString('en-IN')}`,
              },
            ]
          : []),
      ],
    };

    // Save to localStorage
    const saved = localStorage.getItem('shopkeeper_customers');
    const existing = saved ? JSON.parse(saved) : [];
    const updated = [newCustomer, ...existing];
    localStorage.setItem('shopkeeper_customers', JSON.stringify(updated));

    setSavedCustomer(newCustomer);
    setOrderComplete(true);
    resetWizard();
  };

  /* ── Success Screen ── */
  if (orderComplete && savedCustomer) {
    const orderTotal = savedCustomer.totalAmount || 0;

    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto font-sans min-h-[60vh] flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-8 sm:p-12 max-w-lg w-full text-center animate-fade-in">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-100 mb-6 mx-auto animate-bounce">
            <PartyPopper className="w-10 h-10 text-emerald-500" />
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
            Order Created Successfully!
          </h1>
          <p className="text-slate-500 text-sm sm:text-base mb-6">
            The order has been saved to the system.
          </p>

          {/* Customer / Order Info */}
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 mb-8 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 font-medium">Customer</span>
              <span className="font-bold text-slate-800">
                {savedCustomer.firstName} {savedCustomer.lastName}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 font-medium">Order Total</span>
              <span className="font-bold text-emerald-600">
                ₹{orderTotal.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 font-medium">Items</span>
              <span className="font-bold text-slate-800">
                {savedCustomer.totalOrders}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                setOrderComplete(false);
                setSavedCustomer(null);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[#0A0F1F] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              <RotateCcw className="w-4 h-4" />
              Create Another Order
            </button>
            <button
              type="button"
              onClick={() =>
                navigate(`/shopkeeper/customers/${savedCustomer.id}`)
              }
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              View Customer
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Wizard Steps ── */
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in font-sans">
      {/* ── Page Header ── */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Plus className="w-8 h-8 text-blue-500" />
          New Order
        </h1>
        <p className="text-slate-500 mt-1.5 text-sm sm:text-base">
          Create a complete customer order
        </p>
      </div>

      {/* ── Stepper ── */}
      <WizardStepper currentStep={wizardStep} onStepClick={handleStepClick} />

      {/* ── Active Step ── */}
      <div className="mt-6">
        {wizardStep === 0 && (
          <WizardProductStep onNext={handleProductNext} />
        )}

        {wizardStep === 1 && (
          <WizardCustomerStep
            customer={wizardCustomer}
            onChange={setWizardCustomer}
            onBack={handleCustomerBack}
            onNext={handleCustomerNext}
          />
        )}

        {wizardStep === 2 && (
          <OpticalPrescriptionForm
            prescription={wizardPrescription}
            onChange={setWizardPrescription}
            onBack={handlePrescriptionBack}
            onNext={handlePrescriptionNext}
          />
        )}

        {wizardStep === 3 && (
          <WizardPaymentStep
            customer={wizardCustomer}
            prescription={wizardPrescription}
            onBack={handlePaymentBack}
            onComplete={handleComplete}
          />
        )}
      </div>
    </div>
  );
};

export default ShopkeeperWizard;
