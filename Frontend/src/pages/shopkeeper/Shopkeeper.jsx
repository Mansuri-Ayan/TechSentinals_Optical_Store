import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import StepIndicator from '../../components/shopkeeper/StepIndicator';
import ProductSelectionStep from '../../components/shopkeeper/ProductSelectionStep';
import CustomerDetailsStep from '../../components/shopkeeper/CustomerDetailsStep';
import OpticalPrescriptionForm from '../../components/shopkeeper/OpticalPrescriptionForm';
import PaymentStep from '../../components/shopkeeper/PaymentStep';
import CompletedStep from '../../components/shopkeeper/CompletedStep';
import { createCustomerApi, updateCustomerApi, createPrescriptionApi } from '../../api/customer/customer.api';
import { createSaleApi } from '../../api/sales/sales.api';
import { useAuthStore, useStoreStore } from '../../store/store';
import { toast } from 'react-toastify';
import NotificationBell from '../../components/shared/NotificationBell';

const POS_KEYS = {
  step: 'pos_activeStep',
  cart: 'pos_cart',
  customer: 'pos_customer',
  prescription: 'pos_prescription',
};

const safeParse = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

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
  current_points: 0,
  membership_tier: 'NONE',
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
  const [activeStep, setActiveStep] = useState(() => safeParse(POS_KEYS.step, 1));
  const [cart, setCart] = useState(() => safeParse(POS_KEYS.cart, []));
  const [customer, setCustomer] = useState(() => safeParse(POS_KEYS.customer, defaultCustomer));
  const [prescription, setPrescription] = useState(() => safeParse(POS_KEYS.prescription, defaultPrescription));

  const [savedCustomer, setSavedCustomer] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuthStore();

  /* ── Persist wizard state to localStorage ── */
  useEffect(() => { localStorage.setItem(POS_KEYS.step, JSON.stringify(activeStep)); }, [activeStep]);
  useEffect(() => { localStorage.setItem(POS_KEYS.cart, JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem(POS_KEYS.customer, JSON.stringify(customer)); }, [customer]);
  useEffect(() => { localStorage.setItem(POS_KEYS.prescription, JSON.stringify(prescription)); }, [prescription]);

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

  /* ── Step 1 → 2: Immediately register / update customer ── */
  const handleCustomerStepNext = useCallback(async (formDetails = null) => {
    try {
      const storeId = user?.store_id || useStoreStore.getState().selectedStore?.id;
      if (!storeId) {
        toast.error('Store information not found.');
        return;
      }
      const currentCustomer = formDetails || customer;
      const customerPayload = {
        first_name: currentCustomer.firstName,
        last_name: currentCustomer.lastName,
        email: currentCustomer.email || null,
        phone: currentCustomer.phone,
        date_of_birth: currentCustomer.dateOfBirth || null,
        gender: currentCustomer.gender === 'Male' ? 'MALE' : currentCustomer.gender === 'Female' ? 'FEMALE' : currentCustomer.gender === 'Other' ? 'OTHER' : 'NOT_SPECIFIED',
        address: currentCustomer.address || null,
        city: currentCustomer.city || null,
        state: currentCustomer.state || null,
        pincode: currentCustomer.pincode || null,
        remark: currentCustomer.remark || null,
        store_id: storeId,
      };

      if (currentCustomer.id) {
        const updatedCust = await updateCustomerApi(currentCustomer.id, customerPayload);
        toast.success('Customer updated!');
        setCustomer({
          ...currentCustomer,
          firstName: updatedCust.first_name || currentCustomer.firstName,
          lastName: updatedCust.last_name || currentCustomer.lastName,
          email: updatedCust.email || currentCustomer.email,
          phone: updatedCust.phone || currentCustomer.phone,
          current_points: updatedCust.current_points ?? currentCustomer.current_points,
          membership_tier: updatedCust.membership_tier ?? currentCustomer.membership_tier,
        });
      } else {
        const newCust = await createCustomerApi(customerPayload);
        setCustomer({
          ...currentCustomer,
          id: newCust.id,
          firstName: newCust.first_name || currentCustomer.firstName,
          lastName: newCust.last_name || currentCustomer.lastName,
          email: newCust.email || currentCustomer.email,
          phone: newCust.phone || currentCustomer.phone,
          dateOfBirth: newCust.date_of_birth || currentCustomer.dateOfBirth,
          gender: newCust.gender || currentCustomer.gender,
          address: newCust.address || currentCustomer.address,
          city: newCust.city || currentCustomer.city,
          state: newCust.state || currentCustomer.state,
          pincode: newCust.pincode || currentCustomer.pincode,
          remark: newCust.remark || currentCustomer.remark,
          current_points: newCust.current_points || 0,
          membership_tier: newCust.membership_tier || 'NONE',
        });
        toast.success('Customer registered!');
      }
      setActiveStep(2);
    } catch (err) {
      console.error('Customer save failed:', err);
      toast.error(err.response?.data?.detail || 'Failed to save customer. Please try again.');
    }
  }, [customer, user]);

  /* ── Step 2 → 3: Immediately save prescription ── */
  const handlePrescriptionStepNext = useCallback(async (formDetails = null) => {
    const currentPres = formDetails || prescription;
    const hasPrescription =
      currentPres &&
      (currentPres.lensType ||
        currentPres.doctorName ||
        currentPres.lensMaterial ||
        currentPres.lensCoating ||
        currentPres.framePreference ||
        currentPres.notes ||
        currentPres.rightEye?.sph ||
        currentPres.rightEye?.cyl ||
        currentPres.rightEye?.axis ||
        currentPres.rightEye?.addPower ||
        currentPres.rightEye?.pd ||
        currentPres.leftEye?.sph ||
        currentPres.leftEye?.cyl ||
        currentPres.leftEye?.axis ||
        currentPres.leftEye?.addPower ||
        currentPres.leftEye?.pd);

    if (currentPres) {
      setPrescription(currentPres);
    }

    const customerId = customer.id || safeParse(POS_KEYS.customer, {}).id;

    if (hasPrescription && customerId) {
      try {
        const prescriptionPayload = {
          customer_id: Number(customerId),
          sph_right: currentPres.rightEye?.sph !== '' && currentPres.rightEye?.sph !== undefined ? String(currentPres.rightEye.sph) : null,
          cyl_right: currentPres.rightEye?.cyl !== '' && currentPres.rightEye?.cyl !== undefined ? String(currentPres.rightEye.cyl) : null,
          axis_right: currentPres.rightEye?.axis !== '' && currentPres.rightEye?.axis !== undefined ? String(currentPres.rightEye.axis) : null,
          sph_left: currentPres.leftEye?.sph !== '' && currentPres.leftEye?.sph !== undefined ? String(currentPres.leftEye.sph) : null,
          cyl_left: currentPres.leftEye?.cyl !== '' && currentPres.leftEye?.cyl !== undefined ? String(currentPres.leftEye.cyl) : null,
          axis_left: currentPres.leftEye?.axis !== '' && currentPres.leftEye?.axis !== undefined ? String(currentPres.leftEye.axis) : null,
          addition: currentPres.rightEye?.addPower !== '' && currentPres.rightEye?.addPower !== undefined ? String(currentPres.rightEye.addPower) : null,
          pupillary_distance: currentPres.rightEye?.pd !== '' && currentPres.rightEye?.pd !== undefined ? String(currentPres.rightEye.pd) : null,
          prescription_date: currentPres.prescriptionDate || new Date().toISOString().split('T')[0],
          notes: currentPres.notes || null,
          lens_type: currentPres.lensType || null,
          lens_material: currentPres.lensMaterial || null,
          lens_coating: currentPres.lensCoating || null,
          frame_preference: currentPres.framePreference || null,
          expiry_date: currentPres.expiryDate || null,
          recommended_usage: currentPres.recommendedUsage || null,
          doctor_name: currentPres.doctorName || null,
        };
        const savedPres = await createPrescriptionApi(prescriptionPayload);
        setPrescription(prev => ({ ...prev, id: savedPres.id }));
        toast.success('Prescription saved!');
      } catch (err) {
        console.error('Prescription save failed:', err);
        toast.error(err.response?.data?.detail || 'Failed to save prescription.');
      }
    }
    setActiveStep(3);
  }, [prescription, customer]);

  /* ── Step 4: Final checkout – customer & prescription already saved ── */
  const handleComplete = async (payment, discount, loyaltyData = {}) => {
    setIsSubmitting(true);
    try {
      const storeId = user?.store_id || useStoreStore.getState().selectedStore?.id;
      if (!storeId) {
        toast.error('Store information not found. Please select a store or log in again.');
        setIsSubmitting(false);
        return;
      }

      // Customer was already registered at Step 1
      const customerId = customer.id;
      if (!customerId) {
        toast.error('Customer not registered. Please go back to Step 1.');
        setIsSubmitting(false);
        return;
      }

      // Create Sale
      const roleMap = {
        'manager': 'MANAGER',
        'worker': 'WORKER',
        'optician': 'OPTICIAN',
        'admin': 'MANAGER',
      };
      const soldByType = roleMap[user?.role?.toLowerCase()] || 'MANAGER';
      const soldById = user?.id || 1;

      const paymentMethodMap = {
        'Cash': 'CASH',
        'Card': 'CARD',
        'UPI': 'UPI',
        'Net Banking': 'BANK_TRANSFER',
      };
      const backendPaymentMethod = paymentMethodMap[payment.method] || 'CASH';

      const saleItems = cart.map((item) => {
        return {
          product_id: Number(item.product.id),
          inventory_id: item.product.inventory_id ? Number(item.product.inventory_id) : null,
          quantity: Number(item.quantity),
          unit_price: Number(item.product.selling_price),
          discount_percent: 0,
          tax_percent: 0,
        };
      });

      const subtotal = cart.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0);
      const discountAmt = Number(discount) || 0;
      const loyaltyDiscountAmt = Number(loyaltyData.loyaltyDiscount) || 0;
      const finalAmount = Math.max(0, subtotal - discountAmt - loyaltyDiscountAmt);

      let paidAmount = 0;
      if (payment.status === 'Paid') {
        paidAmount = finalAmount;
      } else if (payment.status === 'Partial') {
        paidAmount = Number(payment.receivedAmount) || 0;
      }

      const payments = [];
      if (paidAmount > 0) {
        payments.push({
          amount: paidAmount,
          payment_method: backendPaymentMethod,
          reference_number: payment.upiId || null,
          remarks: payment.status === 'Partial' ? 'Partial downpayment' : 'Full payment',
        });
      }

      const salePayload = {
        store_id: storeId,
        customer_id: customerId,
        sold_by_type: soldByType,
        sold_by_id: soldById,
        sale_date: new Date().toISOString().split('T')[0],
        prescription_id: prescription?.id || null,
        notes: prescription.notes || null,
        items: saleItems,
        payments: payments,
        discount_amount: discountAmt,
        // Loyalty fields
        points_to_redeem: loyaltyData.pointsToRedeem || 0,
        custom_points: loyaltyData.customPoints || 0,
        category_points_enabled_override: loyaltyData.categoryPointsEnabled !== false,
        price_points_enabled_override: loyaltyData.pricePointsEnabled !== false,
        enabled_category_points_ids: loyaltyData.enabledCategoryIds || null,
      };

      const saleResult = await createSaleApi(salePayload);

      // Construct a resultCustomer object matching mock customer response
      const resultCustomer = {
        ...customer,
        id: customerId,
        orders: [
          {
            id: saleResult.invoice_number,
            date: saleResult.sale_date,
          }
        ]
      };

      const paymentInfoObj = {
        ...payment,
        discount,
        loyaltyDiscount: loyaltyDiscountAmt,
      };

      setSavedCustomer(resultCustomer);
      setPaymentInfo(paymentInfoObj);
      toast.success('Order completed and submitted successfully!');
      setActiveStep(5);
    } catch (err) {
      console.error('Failed to complete transaction:', err);
      toast.error(err.response?.data?.detail || 'Failed to complete transaction. Please check stock and details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCart([]);
    setCustomer(defaultCustomer);
    setPrescription(defaultPrescription);
    setPaymentInfo(null);
    setSavedCustomer(null);
    setActiveStep(1);
    // Clear localStorage
    Object.values(POS_KEYS).forEach((k) => localStorage.removeItem(k));
  };

  /* ── Stepper Navigation Click Handlers ── */
  const handleStepClick = (step) => {
    // Only allow clicking to steps that have already been visited / validated
    if (step < activeStep) {
      setActiveStep(step);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in font-sans relative">
      {isSubmitting && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[9999] flex flex-col items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-slate-900"></div>
            <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Processing Checkout...</p>
          </div>
        </div>
      )}
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
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <NotificationBell role="shopkeeper" />
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
            onSaveState={(updatedCustomer) => {
              setCustomer(updatedCustomer);
              if (updatedCustomer.prescription) {
                const p = updatedCustomer.prescription;
                setPrescription({
                  rightEye: p.rightEye || { sph: '', cyl: '', axis: '', addPower: '', pd: '' },
                  leftEye: p.leftEye || { sph: '', cyl: '', axis: '', addPower: '', pd: '' },
                  lensType: p.lensType || '',
                  framePreference: p.framePreference || '',
                  lensCoating: p.lensCoating || '',
                  doctorName: p.doctorName || '',
                  prescriptionDate: p.prescriptionDate || new Date().toISOString().split('T')[0],
                  notes: p.notes || '',
                });
              }
            }}
            onBack={() => navigate('/shopkeeper/dashboard')}
            onNext={handleCustomerStepNext}
          />
        )}

        {activeStep === 2 && (
          <OpticalPrescriptionForm
            prescription={prescription}
            onChange={setPrescription}
            onBack={() => setActiveStep(1)}
            onNext={handlePrescriptionStepNext}
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

