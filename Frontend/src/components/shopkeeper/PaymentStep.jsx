import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ArrowLeft, CheckCircle, Award, Zap, Gift, Star, ChevronDown, ChevronUp,
  Info, Link, UserPlus, Archive, Tag, Workflow, KeyRound, ShieldCheck,
  Loader2, RefreshCw, X, Lock, AlertTriangle
} from 'lucide-react';
import { toast } from 'react-toastify';

import OrderSummary from './OrderSummary';
import PaymentForm from './PaymentForm';
import {
  useLoyaltyConfig,
  useSendLoyaltyOtp,
  useVerifyLoyaltyOtp,
  useCheckLoyaltyOtpStatus,
} from '../../hooks/useLoyalty';
import { loyaltyApi } from '../../api/loyalty/loyalty.api';
import LoyaltyCustomerSearch from './LoyaltyCustomerSearch';
import { useLinkedMembers } from '../../hooks/useCustomerLinks';

const safeNum = (val) => {
  const n = Number(val);
  return isNaN(n) || val === null || val === undefined ? 0 : n;
};

const safeFmt = (val) => {
  return safeNum(val).toLocaleString('en-IN');
};

const PaymentStep = ({ customer, cart, prescription, onBack, onComplete }) => {
  const subtotal = cart.reduce(
    (sum, item) => sum + safeNum(item.product?.selling_price_before_gst ?? item.product?.selling_price) * safeNum(item.quantity),
    0
  );

  const agingDiscountTotal = cart.reduce(
    (sum, item) => sum + (safeNum(item.product?.selling_price_before_gst ?? item.product?.selling_price) * (safeNum(item.product?.aging_discount_percent) / 100) * safeNum(item.quantity)),
    0
  );

  const gstTotal = cart.reduce((sum, item) => {
    const price = safeNum(item.product?.selling_price_before_gst ?? item.product?.selling_price);
    const agingRate = safeNum(item.product?.aging_discount_percent);
    const afterAging = price * (1 - agingRate / 100);
    const gstRate = item.product?.gst_percent !== undefined && item.product?.gst_percent !== null ? Number(item.product.gst_percent) : 18;
    return sum + (afterAging * (gstRate / 100) * safeNum(item.quantity));
  }, 0);

  const cartAnalysis = useMemo(() => {
    const hasOrderOnly = cart.some(item => {
      const catName = (item.product?.category || item.category || '').toLowerCase();
      const wfType = item.product?.sales_workflow_type || item.sales_workflow_type;
      return wfType === 'ORDER_ONLY' || catName.includes('lens');
    });

    const hasDirectOnly = cart.some(item => {
      const wfType = item.product?.sales_workflow_type || item.sales_workflow_type;
      return wfType === 'DIRECT_ONLY';
    });

    const allDirectOnly = cart.length > 0 && cart.every(item => {
      const wfType = item.product?.sales_workflow_type || item.sales_workflow_type;
      return wfType === 'DIRECT_ONLY';
    });

    const isMixed = hasOrderOnly && hasDirectOnly;
    return { hasOrderOnly, hasDirectOnly, allDirectOnly, isMixed };
  }, [cart]);

  const hasPrescription = Boolean(
    prescription && (prescription.rightEye?.sph || prescription.leftEye?.sph || prescription.lensType)
  );

  const isMandatoryOrder = cartAnalysis.hasOrderOnly || hasPrescription || cartAnalysis.isMixed;
  const isMixedCart = cartAnalysis.isMixed;

  const [workflowChoice, setWorkflowChoice] = useState(() => {
    if (cartAnalysis.hasOrderOnly || hasPrescription || cartAnalysis.isMixed) {
      return 'ORDER';
    }
    return 'DIRECT';
  });

  // Auto-sync workflow choice when cart contents or prescription change
  useEffect(() => {
    if (cartAnalysis.hasOrderOnly || hasPrescription || cartAnalysis.isMixed) {
      setWorkflowChoice('ORDER');
    } else if (cartAnalysis.allDirectOnly && !hasPrescription) {
      setWorkflowChoice('DIRECT');
    }
  }, [cartAnalysis, hasPrescription]);

  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState(() => {
    const net = Math.max(0, subtotal - agingDiscountTotal + gstTotal);
    return {
      method: 'Cash',
      status: 'Paid',
      receivedAmount: net,
      remainingAmount: 0,
      upiId: '',
      notes: '',
    };
  });

  // --- Billing & Overrides State ---
  const [billingOptionsExpanded, setBillingOptionsExpanded] = useState(false);
  const [billingAccountCustomer, setBillingAccountCustomer] = useState(null);

  // --- Loyalty State ---
  const [loyaltyExpanded, setLoyaltyExpanded] = useState(true);
  const [categoryPointsEnabled, setCategoryPointsEnabled] = useState(true);
  const [pricePointsEnabled, setPricePointsEnabled] = useState(true);
  const [customPoints, setCustomPoints] = useState(0);
  const [pointsToRedeemSelf, setPointsToRedeemSelf] = useState(0);
  const [isRedeemingSelf, setIsRedeemingSelf] = useState(false);

  // --- Session-Preserved Co-Redemption State (Preserves selected Person B across refresh & backward navigation!) ---
  const [loyaltyCustomer, setLoyaltyCustomer] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`pos_co_redemption_customer_${customer?.id}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [pointsToRedeemOther, setPointsToRedeemOther] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`pos_co_redemption_pts_${customer?.id}`);
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });

  const [isRedeemingOther, setIsRedeemingOther] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`pos_co_redemption_active_${customer?.id}`);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // Persist selected Customer B details in sessionStorage
  useEffect(() => {
    if (customer?.id) {
      if (loyaltyCustomer) {
        sessionStorage.setItem(`pos_co_redemption_customer_${customer.id}`, JSON.stringify(loyaltyCustomer));
      } else {
        sessionStorage.removeItem(`pos_co_redemption_customer_${customer.id}`);
      }
    }
  }, [customer?.id, loyaltyCustomer]);

  useEffect(() => {
    if (customer?.id) {
      sessionStorage.setItem(`pos_co_redemption_pts_${customer.id}`, String(pointsToRedeemOther));
    }
  }, [customer?.id, pointsToRedeemOther]);

  useEffect(() => {
    if (customer?.id) {
      sessionStorage.setItem(`pos_co_redemption_active_${customer.id}`, String(isRedeemingOther));
    }
  }, [customer?.id, isRedeemingOther]);

  const [enabledCategoryIds, setEnabledCategoryIds] = useState(null); // null = all
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  // --- Inline Loyalty OTP Verification States (No Modals, Backend-Preserved State!) ---
  const [loyaltyVerificationToken, setLoyaltyVerificationToken] = useState(null);
  const [loyaltyOtpSent, setLoyaltyOtpSent] = useState(false); // Controls inline entry panel
  const [loyaltyOtp, setLoyaltyOtp] = useState(['', '', '', '', '', '']);
  const [loyaltyOtpExpiry, setLoyaltyOtpExpiry] = useState(600);
  const [loyaltyOtpMaskedEmail, setLoyaltyOtpMaskedEmail] = useState('');
  const loyaltyOtpInputRefs = useRef([]);

  const { mutateAsync: sendLoyaltyOtpAsync, isPending: isSendingLoyaltyOtp } = useSendLoyaltyOtp();
  const { mutateAsync: verifyLoyaltyOtpAsync, isPending: isVerifyingLoyaltyOtp } = useVerifyLoyaltyOtp();
  const { mutateAsync: checkLoyaltyOtpStatusAsync } = useCheckLoyaltyOtpStatus();

  // Fetch store loyalty config
  const { data: loyaltyConfig } = useLoyaltyConfig(null, 'shopkeeper');
  const isLoyaltyEnabled = loyaltyConfig?.is_enabled ?? false;

  // Fetch linked members for billing suggestions
  const { data: linkedMembers = [] } = useLinkedMembers(customer?.id);

  // Compute values for redemption calculations
  const pointsPerRupee = loyaltyConfig?.points_per_rupee || 50;
  const minPoints = loyaltyConfig?.min_redemption_points || 0;
  const maxRedemptionPercentage = loyaltyConfig?.max_redemption_percentage ?? 100;
  
  // Calculate max points they can redeem combined
  const maxRupeeDiscount = (subtotal - discount) * (maxRedemptionPercentage / 100);
  const maxPointsForDiscount = Math.floor(maxRupeeDiscount * pointsPerRupee);

  // Main customer (Self) available points
  const availablePointsSelf = customer?.current_points ?? 0;
  const maxPointsRedeemableSelf = Math.min(availablePointsSelf, maxPointsForDiscount);
  const maxSavingsSelf = Math.floor(maxPointsRedeemableSelf / pointsPerRupee);
  const hasMinPointsSelf = availablePointsSelf >= minPoints;

  // Other customer (Person B) available points
  const availablePointsOther = loyaltyCustomer?.current_points ?? 0;
  const remainingLimitForOther = Math.max(0, maxPointsForDiscount - (isRedeemingSelf ? pointsToRedeemSelf : 0));
  const maxPointsRedeemableOther = Math.min(availablePointsOther, remainingLimitForOther);
  const maxSavingsOther = Math.floor(maxPointsRedeemableOther / pointsPerRupee);
  const hasMinPointsOther = availablePointsOther >= minPoints;

  // --- Deadstock Deduction State ---
  const deadstockCartItems = useMemo(() => {
    return cart.filter((item) => item.product?.is_deadstock || item.product?.deadstock_item_id);
  }, [cart]);

  const maxDeadstockDeduction = useMemo(() => {
    return deadstockCartItems.reduce(
      (sum, item) => sum + (safeNum(item.product?.selling_price)) * safeNum(item.quantity),
      0
    );
  }, [deadstockCartItems]);

  const [isDeadstockDeductionEnabled, setIsDeadstockDeductionEnabled] = useState(true);
  const [deadstockDeductionAmount, setDeadstockDeductionAmount] = useState(maxDeadstockDeduction);

  useEffect(() => {
    setDeadstockDeductionAmount(maxDeadstockDeduction);
  }, [maxDeadstockDeduction]);

  const activeDeadstockDeduction = isDeadstockDeductionEnabled ? deadstockDeductionAmount : 0;

  // Compute redemption discount from preview
  const loyaltyDiscount = preview?.redemption_valid ? Number(preview.rupee_discount || 0) : 0;

  const finalAmount = Math.max(0, subtotal - agingDiscountTotal - discount - loyaltyDiscount - activeDeadstockDeduction + gstTotal);

  // Timers for Loyalty OTP Expiry Countdown
  useEffect(() => {
    let t;
    if (loyaltyOtpSent && loyaltyOtpExpiry > 0) t = setInterval(() => setLoyaltyOtpExpiry(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [loyaltyOtpSent, loyaltyOtpExpiry]);

  // Check Backend Verification Status on Customer B / Points Change or Component Mount (Preserves Verification across Refresh/Nav)
  useEffect(() => {
    if (!loyaltyCustomer?.id || pointsToRedeemOther <= 0) {
      setLoyaltyVerificationToken(null);
      setLoyaltyOtpSent(false);
      setLoyaltyOtp(['', '', '', '', '', '']);
      return;
    }

    let isMounted = true;
    checkLoyaltyOtpStatusAsync({
      target_customer_id: loyaltyCustomer.id,
      points_to_redeem: pointsToRedeemOther,
    })
      .then((res) => {
        if (!isMounted) return;
        if (res?.is_verified && res?.loyalty_verification_token) {
          setLoyaltyVerificationToken(res.loyalty_verification_token);
          if (res.email_masked) setLoyaltyOtpMaskedEmail(res.email_masked);
          setLoyaltyOtpSent(false);
        } else {
          setLoyaltyVerificationToken(null);
        }
      })
      .catch(() => {
        if (isMounted) setLoyaltyVerificationToken(null);
      });

    return () => {
      isMounted = false;
    };
  }, [loyaltyCustomer?.id, pointsToRedeemOther]);

  // Handle Send Loyalty OTP (No 60-second cooldown rule!)
  const handleSendLoyaltyOtp = async () => {
    if (!loyaltyCustomer?.id || pointsToRedeemOther <= 0) return;
    try {
      const res = await sendLoyaltyOtpAsync({
        target_customer_id: loyaltyCustomer.id,
        points_to_redeem: pointsToRedeemOther,
        buyer_customer_id: customer?.id || null,
      });
      setLoyaltyOtpMaskedEmail(res.email_masked);
      setLoyaltyOtpExpiry(res.expires_in_seconds || 600);

      if (res.already_verified && res.loyalty_verification_token) {
        setLoyaltyVerificationToken(res.loyalty_verification_token);
        setLoyaltyOtpSent(false);
        toast.success(res.message || 'Redemption request is already authorized.');
      } else {
        setLoyaltyOtp(['', '', '', '', '', '']);
        setLoyaltyOtpSent(true);
        toast.success(res.message || `Authorization code sent to ${loyaltyCustomer.first_name}'s email.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send loyalty verification code.');
    }
  };

  // Handle Verify Loyalty OTP
  const handleVerifyLoyaltyOtp = async () => {
    const code = loyaltyOtp.join('');
    if (code.length !== 6 || !loyaltyCustomer?.id) return;
    try {
      const res = await verifyLoyaltyOtpAsync({
        target_customer_id: loyaltyCustomer.id,
        points_to_redeem: pointsToRedeemOther,
        otp: code,
      });
      setLoyaltyVerificationToken(res.loyalty_verification_token);
      setLoyaltyOtpSent(false);
      toast.success(res.message || 'Loyalty redemption authorized successfully!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid or expired authorization code.');
    }
  };

  // OTP paste handler
  const handleLoyaltyOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;
    const digits = pastedData.split('');
    const newOtp = ['', '', '', '', '', ''];
    digits.forEach((d, i) => {
      newOtp[i] = d;
    });
    setLoyaltyOtp(newOtp);
    const focusIdx = Math.min(digits.length, 5);
    if (loyaltyOtpInputRefs.current[focusIdx]) loyaltyOtpInputRefs.current[focusIdx].focus();
  };

  // Sync payment amounts when finalAmount changes
  const [prevFinalAmount, setPrevFinalAmount] = useState(finalAmount);
  if (finalAmount !== prevFinalAmount) {
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
        received = Math.min(finalAmount, Number(prev.receivedAmount) || 0);
        remaining = Math.max(0, finalAmount - received);
      }

      return {
        ...prev,
        receivedAmount: received,
        remainingAmount: remaining,
      };
    });
    setPrevFinalAmount(finalAmount);
  }

  // Build sale items for preview
  const saleItemsForPreview = useMemo(() => {
    return cart.map(item => ({
      category_id: item.product.category_id,
      quantity: item.quantity,
    }));
  }, [cart]);

  // Unique categories in cart
  const cartCategories = useMemo(() => {
    const map = new Map();
    cart.forEach(item => {
      const catId = item.product.category_id;
      const catName = item.product.category;
      if (catId && !map.has(catId)) {
        map.set(catId, { id: catId, name: catName });
      }
    });
    return Array.from(map.values());
  }, [cart]);

  // Loyalty Preview Fetch
  const fetchPreview = useCallback(async () => {
    if (!isLoyaltyEnabled || !customer?.id) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const previewFinalAmount = Math.max(0, subtotal - discount);
      const result = await loyaltyApi.calculateLoyaltyPreview({
        customer_id: customer.id,
        loyalty_redeem_customer_id: customer.id,
        loyalty_redeem_other_customer_id: loyaltyCustomer?.id,
        loyalty_awarded_to_customer_id: billingAccountCustomer?.id,
        sale_items: saleItemsForPreview,
        final_amount: previewFinalAmount,
        points_to_redeem_self: pointsToRedeemSelf,
        points_to_redeem_other: pointsToRedeemOther,
        custom_points: customPoints,
        category_points_override: categoryPointsEnabled,
        price_points_override: pricePointsEnabled,
        enabled_category_ids: enabledCategoryIds,
      });
      setPreview(result);
      if (result.error) {
        setPreviewError(result.error);
      }
    } catch (err) {
      setPreviewError(err?.response?.data?.detail || 'Failed to calculate loyalty preview');
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [isLoyaltyEnabled, customer?.id, loyaltyCustomer?.id, billingAccountCustomer?.id, saleItemsForPreview, subtotal, discount, pointsToRedeemSelf, pointsToRedeemOther, customPoints, categoryPointsEnabled, pricePointsEnabled, enabledCategoryIds]);

  // Debounced preview fetch
  useEffect(() => {
    if (!isLoyaltyEnabled || !customer?.id) return;
    const timer = setTimeout(fetchPreview, 400);
    return () => clearTimeout(timer);
  }, [fetchPreview]);

  // Category toggle
  const handleCategoryToggle = (catId) => {
    setEnabledCategoryIds(prev => {
      if (prev === null) {
        const allIds = cartCategories.map(c => c.id);
        return allIds.filter(id => id !== catId);
      }
      if (prev.includes(catId)) {
        return prev.filter(id => id !== catId);
      }
      return [...prev, catId];
    });
  };

  const isCategoryEnabled = (catId) => {
    if (enabledCategoryIds === null) return true;
    return enabledCategoryIds.includes(catId);
  };

  const handleComplete = () => {
    // Validate UPI ID
    if (payment.method === 'UPI' && !payment.upiId.trim()) return;
    
    // Validate Received Amount for Cash or Partial
    if (payment.status === 'Partial' && (payment.receivedAmount === '' || payment.receivedAmount === undefined)) {
      return;
    }

    // OTP Guard for Customer B points redemption
    if (isRedeemingOther && pointsToRedeemOther > 0 && loyaltyCustomer) {
      if (!loyaltyVerificationToken) {
        toast.error(`Authorization required: Send OTP to ${loyaltyCustomer.first_name}'s email before completing order.`);
        if (!loyaltyOtpSent) {
          handleSendLoyaltyOtp();
        }
        return;
      }
    }

    // Clear session storage co-redemption items upon order completion
    if (customer?.id) {
      sessionStorage.removeItem(`pos_co_redemption_customer_${customer.id}`);
      sessionStorage.removeItem(`pos_co_redemption_pts_${customer.id}`);
      sessionStorage.removeItem(`pos_co_redemption_active_${customer.id}`);
    }

    // Pass loyalty and deadstock data along with payment and discount
    onComplete(payment, discount, {
      isDirectSale: workflowChoice === 'DIRECT',
      billing_account_customer: billingAccountCustomer,
      billing_account_customer_id: billingAccountCustomer?.id,
      loyalty_awarded_to_customer_id: billingAccountCustomer?.id,
      loyalty_redeem_customer_id: customer?.id,
      loyalty_redeem_other_customer_id: loyaltyCustomer?.id,
      pointsToRedeemSelf,
      pointsToRedeemOther,
      loyaltyVerificationToken,
      customPoints,
      categoryPointsEnabled,
      pricePointsEnabled,
      enabledCategoryIds,
      loyaltyDiscount,
      deadstockDeduction: activeDeadstockDeduction,
    });
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

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Workflow Choice Selection Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 text-white shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">Order Execution Workflow</span>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Workflow className="w-5 h-5 text-emerald-400" />
              Select Sale Fulfillment Mode
            </h3>
          </div>
          <div className="flex items-center gap-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-700/60 w-full sm:w-auto">
            <button
              type="button"
              disabled={isMandatoryOrder}
              onClick={() => setWorkflowChoice('DIRECT')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                workflowChoice === 'DIRECT'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-extrabold'
                  : 'text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              ⚡ Instant Direct Sale
            </button>
            <button
              type="button"
              onClick={() => setWorkflowChoice('ORDER')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                workflowChoice === 'ORDER'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📋 Order-Based Sale
            </button>
          </div>
        </div>

        {isMixedCart && (
          <div className="mt-3 p-3.5 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-200 animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-amber-300">Mixed Cart Detected — Order-Based Sale Auto-Selected</p>
              <p className="text-amber-200/80 text-[11px] mt-0.5 leading-relaxed">
                Your cart contains both Instant Direct Sale items and Order-Based lab items. Direct items (e.g. sunglasses) will bypass the lab process after quality check, while order items follow the full lab workflow. The order remains pending until all items complete their processes.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
        {/* Left Column: Order Summary + Payment Form */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-6">
          <OrderSummary
            customer={customer}
            cart={cart}
            prescription={prescription}
            subtotal={subtotal}
            discount={discount}
            onDiscountChange={setDiscount}
            loyaltyDiscount={loyaltyDiscount}
            agingDiscountTotal={agingDiscountTotal}
            deadstockDeduction={activeDeadstockDeduction}
            finalAmount={finalAmount}
          />

          {/* Payment Form */}
          <PaymentForm
            subtotal={subtotal}
            gstTotal={gstTotal}
            discount={discount}
            onDiscountChange={setDiscount}
            totalAmount={finalAmount}
            payment={payment}
            onChange={setPayment}
            loyaltyDiscount={loyaltyDiscount}
          />
        </div>

        {/* Right Column: Loyalty & Overrides */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-6">

          {/* Deadstock Item Deduction Box */}
          {deadstockCartItems.length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden animate-fade-in">
              <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-50 to-orange-50/40 border-b border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
                    <Archive className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">Deadstock Deduction</h3>
                    <p className="text-[10px] text-amber-700 font-semibold mt-0.5">
                      {deadstockCartItems.length} deadstock item(s) selected in cart
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-200">
                  - ₹{safeFmt(activeDeadstockDeduction)}
                </span>
              </div>

              <div className="p-5 sm:p-6 space-y-4">
                <label className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/60 rounded-xl border border-slate-200 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={isDeadstockDeductionEnabled}
                    onChange={(e) => setIsDeadstockDeductionEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800">Apply Deadstock Price Deduction</p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Subtract deadstock item original value from order total
                    </p>
                  </div>
                </label>

                {isDeadstockDeductionEnabled && (
                  <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl space-y-2.5 animate-fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-800">Deduction Amount:</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-500">₹</span>
                        <input
                          type="number"
                          min="0"
                          max={maxDeadstockDeduction}
                          value={deadstockDeductionAmount}
                          onChange={(e) => setDeadstockDeductionAmount(Math.max(0, Math.min(maxDeadstockDeduction, Number(e.target.value) || 0)))}
                          className="w-24 text-right px-2.5 py-1.5 text-xs font-bold border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-amber-700 font-semibold">
                      Max deductible value: ₹{safeFmt(maxDeadstockDeduction)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Billing Account Override Box */}
          {customer?.id && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <button
                onClick={() => setBillingOptionsExpanded(!billingOptionsExpanded)}
                className={`w-full flex items-center justify-between p-5 sm:p-6 cursor-pointer hover:bg-slate-50/50 transition-colors rounded-t-2xl ${!billingOptionsExpanded ? 'rounded-b-2xl' : ''}`}
                type="button"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                    <Link className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Billing Account</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      {billingAccountCustomer ? `Billed to: ${billingAccountCustomer.first_name}` : 'Default: Billed to buyer'}
                    </p>
                  </div>
                </div>
                {billingOptionsExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              
              {billingOptionsExpanded && (
                <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-5 border-t border-slate-100 pt-5 animate-in fade-in slide-in-from-top-4 rounded-b-2xl">
                  
                  {/* Billing Account Override */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <UserPlus className="w-3 h-3 text-blue-500" /> Billing Account
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Select if this purchase is being paid by or billed to someone else's account.
                    </p>
                    <LoyaltyCustomerSearch 
                      excludeCustomerId={customer?.id}
                      allowQuickCreateButton={true}
                      selectedCustomer={billingAccountCustomer} 
                      onSelectCustomer={(c) => {
                        setBillingAccountCustomer(c);
                        setLoyaltyCustomer(c);
                      }} 
                      onClear={() => {
                        setBillingAccountCustomer(null);
                        setLoyaltyCustomer(null);
                      }} 
                      suggestedCustomers={linkedMembers}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loyalty Section */}
          {isLoyaltyEnabled && customer?.id && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Header */}
              <button
                onClick={() => setLoyaltyExpanded(!loyaltyExpanded)}
                className="w-full flex items-center justify-between p-5 sm:p-6 cursor-pointer hover:bg-slate-50/50 transition-colors"
                type="button"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                    <Award className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Loyalty Rewards & Co-Redemption</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      {preview ? `${preview.customer_current_points} pts available` : 'Configure earning & redemption'}
                    </p>
                  </div>
                </div>
                {loyaltyExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {loyaltyExpanded && (
                <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-5 border-t border-slate-100 pt-5">

                  {/* Points Earning Section */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-amber-500" /> Points Earning Config
                    </h4>

                    {/* Category Points Toggle */}
                    {loyaltyConfig?.category_points_enabled && (
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100/50 transition-colors">
                          <input
                            type="checkbox"
                            checked={categoryPointsEnabled}
                            onChange={(e) => setCategoryPointsEnabled(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <p className="text-xs font-bold text-slate-700">Category-based Points</p>
                            <p className="text-[10px] text-slate-400 font-medium">Earn points per item based on product category</p>
                          </div>
                          {preview && (
                            <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
                              +{preview.category_points} pts
                            </span>
                          )}
                        </label>

                        {/* Per-category toggles */}
                        {categoryPointsEnabled && cartCategories.length > 0 && (
                          <div className="ml-7 space-y-1.5">
                            {cartCategories.map(cat => (
                              <label key={cat.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                  checked={isCategoryEnabled(cat.id)}
                                  onChange={() => handleCategoryToggle(cat.id)}
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-[11px] font-semibold text-slate-600">{cat.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Price Points Toggle */}
                    {loyaltyConfig?.price_points_enabled && (
                      <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={pricePointsEnabled}
                          onChange={(e) => setPricePointsEnabled(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-700">Price-based Points</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Earn {loyaltyConfig.price_points} pts per ₹{loyaltyConfig.price_interval} spent
                          </p>
                        </div>
                        {preview && (
                          <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
                            +{preview.price_points} pts
                          </span>
                        )}
                      </label>
                    )}

                    {/* Custom Points Input */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0">
                        <Star className="w-4 h-4 text-purple-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-700">Custom Bonus Points</p>
                        <p className="text-[10px] text-slate-400 font-medium">Add extra bonus points to award</p>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={customPoints || ''}
                        onChange={(e) => setCustomPoints(Math.max(0, parseInt(e.target.value) || 0))}
                        placeholder="0"
                        className="w-20 text-right px-2.5 py-1.5 text-xs font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                      />
                    </div>
                  </div>

                  {/* Points Redemption Section */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Gift className="w-3 h-3 text-emerald-500" /> Points Redemption
                    </h4>

                    {/* Main Customer Points Box */}
                    {customer && (
                      <div className="space-y-2">
                        {!hasMinPointsSelf ? (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-[11px] font-medium flex items-center gap-2">
                            <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span>
                              {customer.first_name} has <span className="font-extrabold">{availablePointsSelf}</span> points. Minimum <span className="font-extrabold">{minPoints}</span> points required to redeem.
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <label className="flex items-center gap-3 p-3 bg-emerald-50/40 hover:bg-emerald-50 rounded-xl border border-emerald-100 cursor-pointer transition-colors">
                              <input
                                type="checkbox"
                                checked={isRedeemingSelf}
                                onChange={(e) => {
                                  setIsRedeemingSelf(e.target.checked);
                                  if (e.target.checked) {
                                    setPointsToRedeemSelf(maxPointsRedeemableSelf);
                                  } else {
                                    setPointsToRedeemSelf(0);
                                  }
                                }}
                                className="w-4 h-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                              />
                              <div className="flex-1">
                                <p className="text-xs font-bold text-slate-700">Apply {customer.first_name}'s Points</p>
                                <p className="text-[10px] text-slate-400 font-semibold">
                                  Available: {availablePointsSelf} pts (Save up to ₹{safeFmt(maxSavingsSelf)})
                                </p>
                              </div>
                              {isRedeemingSelf && pointsToRedeemSelf > 0 && (
                                <span className="text-xs font-black text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-lg border border-emerald-200">
                                  -{pointsToRedeemSelf} pts
                                </span>
                              )}
                            </label>

                            {isRedeemingSelf && (
                              <div className="ml-7 p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Points to Redeem</p>
                                    <p className="text-[9px] text-slate-400 font-medium">
                                      Max redeemable: {maxPointsRedeemableSelf} pts
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      min="0"
                                      max={availablePointsSelf}
                                      value={pointsToRedeemSelf || ''}
                                      onChange={(e) => setPointsToRedeemSelf(Math.max(0, parseInt(e.target.value) || 0))}
                                      placeholder="0"
                                      className="w-20 text-right px-2.5 py-1.5 text-xs font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                                    />
                                    <span className="text-xs font-bold text-slate-400">pts</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Other Person's Points Redemption Box (Co-Redemption + Inline OTP Interface) */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Redeem Another Person's Points (OTP Required)</p>
                      <div className="pb-1">
                        <LoyaltyCustomerSearch 
                          excludeCustomerId={customer?.id}
                          selectedCustomer={loyaltyCustomer} 
                          onSelectCustomer={(c) => {
                            setLoyaltyCustomer(c);
                            setPointsToRedeemOther(0);
                            setIsRedeemingOther(false);
                          }} 
                          onClear={() => { 
                            setLoyaltyCustomer(null); 
                            setPointsToRedeemOther(0); 
                            setIsRedeemingOther(false); 
                          }} 
                        />
                      </div>

                      {loyaltyCustomer && (
                        <>
                          {!hasMinPointsOther ? (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-[11px] font-medium flex items-center gap-2">
                              <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <span>
                                Redemption for {loyaltyCustomer.first_name} requires at least <span className="font-extrabold">{minPoints}</span> points. Customer has <span className="font-extrabold">{availablePointsOther}</span> points.
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-2 animate-fade-in">
                              <label className="flex items-center gap-3 p-3 bg-indigo-50/40 hover:bg-indigo-50 rounded-xl border border-indigo-100 cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                  checked={isRedeemingOther}
                                  onChange={(e) => {
                                    setIsRedeemingOther(e.target.checked);
                                    if (e.target.checked) {
                                      setPointsToRedeemOther(maxPointsRedeemableOther);
                                    } else {
                                      setPointsToRedeemOther(0);
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div className="flex-1">
                                  <p className="text-xs font-bold text-slate-700">Apply {loyaltyCustomer.first_name}'s Points</p>
                                  <p className="text-[10px] text-slate-400 font-semibold">
                                    Redeem points for instant discount (Save up to ₹{safeFmt(maxSavingsOther)})
                                  </p>
                                </div>
                                {isRedeemingOther && pointsToRedeemOther > 0 && (
                                  <span className="text-xs font-black text-indigo-700 bg-indigo-100/70 px-2.5 py-1 rounded-lg border border-indigo-200">
                                    -{pointsToRedeemOther} pts
                                  </span>
                                )}
                              </label>

                              {isRedeemingOther && (
                                <div className="ml-7 p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-3 animate-fade-in">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="text-[10px] font-bold text-slate-500 uppercase">Points to Redeem</p>
                                      <p className="text-[9px] text-slate-400 font-medium">
                                        Max redeemable: {maxPointsRedeemableOther} pts (Min: {minPoints} pts)
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="number"
                                        min="0"
                                        max={availablePointsOther}
                                        value={pointsToRedeemOther || ''}
                                        onChange={(e) => setPointsToRedeemOther(Math.max(0, parseInt(e.target.value) || 0))}
                                        placeholder="0"
                                        className="w-20 text-right px-2.5 py-1.5 text-xs font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                                      />
                                      <span className="text-xs font-bold text-slate-400">pts</span>
                                    </div>
                                  </div>

                                  {/* Customer B OTP Authorization Section (Inline inside page, No Modals/Popups!) */}
                                  {pointsToRedeemOther > 0 && (
                                    <div className="pt-3 border-t border-slate-200/60">
                                      {loyaltyVerificationToken ? (
                                        /* Verified State (Preserved across page refresh & navigation) */
                                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs animate-fade-in">
                                          <div className="flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                            <div>
                                              <span className="font-bold text-emerald-900 block">Redemption Authorized</span>
                                              <span className="text-[10px] text-emerald-700">Code verified for {loyaltyCustomer.first_name}</span>
                                            </div>
                                          </div>
                                          <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-extrabold shadow-2xs">
                                            Verified 🟢
                                          </span>
                                        </div>
                                      ) : loyaltyOtpSent ? (
                                        /* Inline OTP Entry Panel (Rendered directly in place of card!) */
                                        <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3.5 animate-fade-in shadow-2xs">
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                              <KeyRound className="w-4.5 h-4.5 text-indigo-600 flex-shrink-0" />
                                              <div>
                                                <h5 className="text-xs font-bold text-indigo-950">Enter Authorization Code</h5>
                                                <p className="text-[10px] text-indigo-700 font-semibold">
                                                  Sent to <span className="font-mono font-bold text-indigo-900">{loyaltyOtpMaskedEmail || loyaltyCustomer.first_name + "'s email"}</span>
                                                </p>
                                              </div>
                                            </div>
                                            <span className={`text-[10px] font-mono font-bold ${loyaltyOtpExpiry <= 60 ? 'text-rose-600 animate-pulse' : 'text-indigo-600'}`}>
                                              {formatTimer(loyaltyOtpExpiry)}
                                            </span>
                                          </div>

                                          {/* 6-Digit Box Grid */}
                                          <div className="flex items-center justify-center gap-1.5 py-1" onPaste={handleLoyaltyOtpPaste}>
                                            {loyaltyOtp.map((digit, idx) => (
                                              <input
                                                key={idx}
                                                ref={el => loyaltyOtpInputRefs.current[idx] = el}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={6}
                                                value={digit}
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  if (val.length > 1) {
                                                    const digits = val.replace(/\D/g, '').slice(0, 6).split('');
                                                    const newOtp = [...loyaltyOtp];
                                                    digits.forEach((d, i) => { newOtp[i] = d; });
                                                    setLoyaltyOtp(newOtp);
                                                    const nextIdx = Math.min(digits.length, 5);
                                                    if (loyaltyOtpInputRefs.current[nextIdx]) loyaltyOtpInputRefs.current[nextIdx].focus();
                                                    return;
                                                  }
                                                  const d = val.replace(/\D/g, '');
                                                  const newOtp = [...loyaltyOtp];
                                                  newOtp[idx] = d;
                                                  setLoyaltyOtp(newOtp);
                                                  if (d && idx < 5 && loyaltyOtpInputRefs.current[idx + 1]) {
                                                    loyaltyOtpInputRefs.current[idx + 1].focus();
                                                  }
                                                }}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Backspace' && !loyaltyOtp[idx] && idx > 0 && loyaltyOtpInputRefs.current[idx - 1]) {
                                                    loyaltyOtpInputRefs.current[idx - 1].focus();
                                                  }
                                                }}
                                                className="w-8.5 h-10 text-center font-mono font-black text-lg bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 shadow-2xs"
                                              />
                                            ))}
                                          </div>

                                          {/* Action Controls */}
                                          <div className="space-y-2 pt-1">
                                            <button
                                              type="button"
                                              onClick={handleVerifyLoyaltyOtp}
                                              disabled={loyaltyOtp.join('').length !== 6 || isVerifyingLoyaltyOtp}
                                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-2xs disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                                            >
                                              {isVerifyingLoyaltyOtp && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                              Verify Authorization Code
                                            </button>

                                            <div className="flex items-center justify-between text-[10px] px-1">
                                              <button
                                                type="button"
                                                onClick={handleSendLoyaltyOtp}
                                                disabled={isSendingLoyaltyOtp}
                                                className="font-bold text-indigo-700 hover:text-indigo-900 disabled:text-slate-400 flex items-center gap-1 cursor-pointer"
                                              >
                                                <RefreshCw className={`w-3 h-3 ${isSendingLoyaltyOtp ? 'animate-spin' : ''}`} />
                                                Resend Code
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() => setLoyaltyOtpSent(false)}
                                                className="text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        /* Initial Unverified State: Send OTP Code Button */
                                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-fade-in">
                                          <div className="flex items-center gap-2">
                                            <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                            <div>
                                              <span className="font-bold text-amber-900 block">OTP Authorization Required</span>
                                              <span className="text-[10px] text-amber-700">Code will be sent to {loyaltyCustomer.first_name}'s email</span>
                                            </div>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={handleSendLoyaltyOtp}
                                            disabled={isSendingLoyaltyOtp}
                                            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-end sm:self-center"
                                          >
                                            {isSendingLoyaltyOtp && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                            Send OTP Code
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {previewError && (
                      <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-100 rounded-lg">
                        <Info className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] font-semibold text-red-600">{previewError}</p>
                      </div>
                    )}
                  </div>

                  {/* Preview Summary */}
                  {preview && !previewLoading && (
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/60 p-4 space-y-2.5">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Transaction Preview</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Points to Earn</p>
                          <p className="text-sm font-black text-amber-600">+{preview.total_points_to_earn}</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Redemption Discount</p>
                          <p className="text-sm font-black text-emerald-600">
                            {loyaltyDiscount > 0 ? `- ₹${safeFmt(loyaltyDiscount)}` : '—'}
                          </p>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Points After</p>
                          <p className="text-sm font-black text-slate-800">{preview.points_after_transaction}</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Tier After</p>
                          <p className={`text-sm font-black ${
                            preview.tier_after_transaction === 'PLATINUM' ? 'text-purple-600' :
                            preview.tier_after_transaction === 'GOLD' ? 'text-amber-600' :
                            preview.tier_after_transaction === 'SILVER' ? 'text-slate-600' : 'text-slate-400'
                          }`}>
                            {preview.tier_after_transaction || 'NONE'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {previewLoading && (
                    <div className="flex items-center justify-center py-3 gap-2">
                      <div className="w-4 h-4 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                      <span className="text-[10px] font-bold text-slate-400">Calculating preview...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer"
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
  );
};

export default PaymentStep;
