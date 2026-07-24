import { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, CheckCircle, Award, Zap, Gift, Star, ChevronDown, ChevronUp, Info, Link, UserPlus } from 'lucide-react';
import OrderSummary from './OrderSummary';
import PaymentForm from './PaymentForm';
import { useLoyaltyConfig } from '../../hooks/useLoyalty';
import { loyaltyApi } from '../../api/loyalty/loyalty.api';
import LoyaltyCustomerSearch from './LoyaltyCustomerSearch';
import { useLinkedMembers } from '../../hooks/useCustomerLinks';

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

  // --- Billing & Overrides State ---
  const [billingOptionsExpanded, setBillingOptionsExpanded] = useState(false);
  const [billingAccountCustomer, setBillingAccountCustomer] = useState(null);

  // --- Loyalty State ---
  const [loyaltyExpanded, setLoyaltyExpanded] = useState(true);
  const [categoryPointsEnabled, setCategoryPointsEnabled] = useState(true);
  const [pricePointsEnabled, setPricePointsEnabled] = useState(true);
  const [customPoints, setCustomPoints] = useState(0);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [enabledCategoryIds, setEnabledCategoryIds] = useState(null); // null = all
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [loyaltyCustomer, setLoyaltyCustomer] = useState(null);

  // Fetch store loyalty config
  const { data: loyaltyConfig } = useLoyaltyConfig(null, 'shopkeeper');
  const isLoyaltyEnabled = loyaltyConfig?.is_enabled ?? false;

  // Fetch linked members for billing suggestions
  const { data: linkedMembers = [] } = useLinkedMembers(customer?.id);

  // Compute values for redemption calculations
  const redeemableCustomer = loyaltyCustomer || customer;
  const availablePoints = preview?.customer_current_points ?? redeemableCustomer?.current_points ?? 0;
  const pointsPerRupee = loyaltyConfig?.points_per_rupee || 50;
  const minPoints = loyaltyConfig?.min_redemption_points || 0;
  const maxRedemptionPercentage = loyaltyConfig?.max_redemption_percentage ?? 100;
  
  // Calculate max points they can redeem
  const maxRupeeDiscount = (subtotal - discount) * (maxRedemptionPercentage / 100);
  const maxPointsForDiscount = Math.floor(maxRupeeDiscount * pointsPerRupee);
  const maxPointsRedeemable = Math.min(availablePoints, maxPointsForDiscount);
  const maxSavings = Math.floor(maxPointsRedeemable / pointsPerRupee);
  const hasMinPoints = availablePoints >= minPoints;

  // Compute redemption discount from preview
  const loyaltyDiscount = preview?.redemption_valid ? Number(preview.rupee_discount || 0) : 0;

  const finalAmount = Math.max(0, subtotal - discount - loyaltyDiscount);

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

  // --- Build sale items for preview ---
  const saleItemsForPreview = useMemo(() => {
    return cart.map(item => ({
      category_id: item.product.category_id,
      quantity: item.quantity,
    }));
  }, [cart]);

  // --- Unique categories in cart (for per-category toggle) ---
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

  // --- Loyalty Preview Fetch ---
  const fetchPreview = useCallback(async () => {
    if (!isLoyaltyEnabled || !customer?.id) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const previewFinalAmount = Math.max(0, subtotal - discount);
      const result = await loyaltyApi.calculateLoyaltyPreview({
        customer_id: customer.id,
        loyalty_redeem_customer_id: loyaltyCustomer?.id,
        loyalty_awarded_to_customer_id: billingAccountCustomer?.id,
        sale_items: saleItemsForPreview,
        final_amount: previewFinalAmount,
        points_to_redeem: pointsToRedeem,
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
  }, [isLoyaltyEnabled, customer?.id, loyaltyCustomer?.id, billingAccountCustomer?.id, saleItemsForPreview, subtotal, discount, pointsToRedeem, customPoints, categoryPointsEnabled, pricePointsEnabled, enabledCategoryIds]);



  // Debounced preview fetch
  useEffect(() => {
    if (!isLoyaltyEnabled || !customer?.id) return;
    const timer = setTimeout(fetchPreview, 400);
    return () => clearTimeout(timer);
  }, [fetchPreview]);

  // --- Category toggle ---
  const handleCategoryToggle = (catId) => {
    setEnabledCategoryIds(prev => {
      if (prev === null) {
        // Currently all enabled — toggle off this one
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

    // Pass loyalty data along with payment and discount
    onComplete(payment, discount, {
      billing_account_customer: billingAccountCustomer,
      billing_account_customer_id: billingAccountCustomer?.id,
      loyalty_awarded_to_customer_id: billingAccountCustomer?.id,
      loyalty_redeem_customer_id: loyaltyCustomer?.id,
      pointsToRedeem,
      customPoints,
      categoryPointsEnabled,
      pricePointsEnabled,
      enabledCategoryIds,
      loyaltyDiscount,
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
        {/* Left Column: Order Summary + Payment Form */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-6">
          <OrderSummary
            customer={customer}
            cart={cart}
            prescription={prescription}
            subtotal={subtotal}
            discount={discount + loyaltyDiscount}
            finalAmount={finalAmount}
          />
          {/* Payment Form */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
            <PaymentForm
              subtotal={subtotal}
              discount={discount}
              onDiscountChange={setDiscount}
              payment={payment}
              onPaymentChange={setPayment}
              loyaltyDiscount={loyaltyDiscount}
            />
          </div>
        </div>

        {/* Right Column: Loyalty & Overrides */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-6">

          {/* Billing Account */}
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
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Loyalty Rewards</h3>
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
                    <Zap className="w-3 h-3 text-amber-500" /> Points Earning
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
                      <p className="text-[10px] text-slate-400 font-medium">Award additional points manually</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={customPoints || ''}
                      onChange={(e) => setCustomPoints(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0"
                      className="w-20 text-right px-2.5 py-1.5 text-xs font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-dashed border-slate-200" />

                {/* Points Redemption Section */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Gift className="w-3 h-3 text-emerald-500" /> Points Redemption
                  </h4>

                  <div className="pt-1 pb-2">
                    <p className="text-[10px] text-slate-500 font-semibold mb-2">Want to use another person's points?</p>
                    <LoyaltyCustomerSearch 
                      selectedCustomer={loyaltyCustomer} 
                      onSelectCustomer={(c) => {
                        setLoyaltyCustomer(c);
                        setPointsToRedeem(0);
                        setIsRedeeming(false);
                      }} 
                      onClear={() => { 
                        setLoyaltyCustomer(null); 
                        setPointsToRedeem(0); 
                        setIsRedeeming(false); 
                      }} 
                    />
                  </div>

                  {!hasMinPoints ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-[11px] font-medium flex items-center gap-2">
                      <Info className="w-4 h-4 text-slate-405 flex-shrink-0" />
                      <span>
                        Redemption requires at least <span className="font-extrabold">{minPoints}</span> points. Customer has <span className="font-extrabold">{availablePoints}</span> points.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-3 bg-emerald-50/40 hover:bg-emerald-50 rounded-xl border border-emerald-100 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={isRedeeming}
                          onChange={(e) => {
                            setIsRedeeming(e.target.checked);
                            if (e.target.checked) {
                              setPointsToRedeem(maxPointsRedeemable);
                            } else {
                              setPointsToRedeem(0);
                            }
                          }}
                          className="w-4 h-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-700">Apply Points Redemption</p>
                          <p className="text-[10px] text-slate-400 font-semibold">
                            Redeem points for instant discount (Save up to ₹{maxSavings.toLocaleString('en-IN')})
                          </p>
                        </div>
                        {isRedeeming && pointsToRedeem > 0 && (
                          <span className="text-xs font-black text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-lg border border-emerald-200">
                            -{pointsToRedeem} pts
                          </span>
                        )}
                      </label>

                      {isRedeeming && (
                        <div className="ml-7 p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-3 animate-fade-in">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Points to Redeem</p>
                              <p className="text-[9px] text-slate-400 font-medium">
                                Max redeemable: {maxPointsRedeemable} pts (Min: {minPoints} pts)
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                max={availablePoints}
                                value={pointsToRedeem || ''}
                                onChange={(e) => setPointsToRedeem(Math.max(0, parseInt(e.target.value) || 0))}
                                placeholder="0"
                                className="w-20 text-right px-2.5 py-1.5 text-xs font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                              />
                              <span className="text-xs font-bold text-slate-400">pts</span>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setPointsToRedeem(maxPointsRedeemable)}
                              className="flex-1 py-1 px-2 text-[10px] font-bold text-emerald-700 bg-emerald-100/40 hover:bg-emerald-100/70 border border-emerald-150 rounded-lg transition-colors cursor-pointer"
                            >
                              Redeem Max ({maxPointsRedeemable})
                            </button>
                            {maxPointsRedeemable > minPoints * 2 && (
                              <button
                                type="button"
                                onClick={() => setPointsToRedeem(Math.floor(maxPointsRedeemable / 2))}
                                className="flex-1 py-1 px-2 text-[10px] font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                              >
                                Redeem Half ({Math.floor(maxPointsRedeemable / 2)})
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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
                          {loyaltyDiscount > 0 ? `- ₹${loyaltyDiscount.toLocaleString('en-IN')}` : '—'}
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
  );
};

export default PaymentStep;
