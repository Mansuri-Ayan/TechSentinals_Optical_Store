import React, { useState, useEffect } from 'react';
import {
  X, AlertTriangle, CheckCircle2, Truck, Package, PhoneCall,
  UserCheck, RefreshCw, ChevronRight, Store, ArrowRight, DollarSign,
  AlertCircle, MessageSquare, Clock, Search
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useItemReplacementOptions, useQCMutations } from '../../../hooks/useQC';
import { useProducts } from '../../../hooks/useProducts';

const DamagedItemResolutionModal = ({
  isOpen,
  onClose,
  saleItemId,
  itemDetails,
  customer,
  onSuccess,
}) => {
  const { data: options, isLoading: isLoadingOptions, refetch } = useItemReplacementOptions(
    isOpen ? saleItemId : null
  );
  const { resolveSaleItemDamage, isResolvingDamage } = useQCMutations();

  // Active resolution path: 'LOCAL' | 'TRANSFER' | 'SUPPLIER' | 'CUSTOMER'
  const [activeTab, setActiveTab] = useState('LOCAL');

  // Form states
  const [selectedSisterStoreId, setSelectedSisterStoreId] = useState('');
  const [supplierNotes, setSupplierNotes] = useState('');

  // Customer decision states
  const [customerChoice, setCustomerChoice] = useState('WAIT_FOR_STOCK'); // 'WAIT_FOR_STOCK' | 'CHOOSE_DIFFERENT_ITEM' | 'CANCEL_ITEM'
  const [customerNotes, setCustomerNotes] = useState('');
  const [contactChannel, setContactChannel] = useState('PHONE');

  // Product swap catalog search
  const [productSearch, setProductSearch] = useState('');
  const [selectedNewProduct, setSelectedNewProduct] = useState(null);
  const { products: catalogProducts, isLoadingProducts } = useProducts({
    search: productSearch,
    limit: 30,
  });

  // Sync initial sister store selection
  useEffect(() => {
    if (options?.sister_stores?.length > 0) {
      setSelectedSisterStoreId(String(options.sister_stores[0].store_id));
    }
  }, [options]);

  if (!isOpen) return null;

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  // Execute resolution handlers
  const handleLocalReplace = async () => {
    try {
      await resolveSaleItemDamage({
        saleItemId,
        payload: {
          action: 'REPLACE_LOCAL',
          notes: 'Replaced with good unit from store stock.',
        },
      });
      toast.success('Replacement allocated from current store inventory! Item passed Pre-Lab QC.');
      onSuccess?.();
      onClose();
    } catch (err) {}
  };

  const handleSisterStoreTransfer = async () => {
    if (!selectedSisterStoreId) {
      toast.warning('Please select a sister store to request stock from.');
      return;
    }
    try {
      await resolveSaleItemDamage({
        saleItemId,
        payload: {
          action: 'REQUEST_TRANSFER',
          from_store_id: Number(selectedSisterStoreId),
          notes: `Transfer requested from sister store #${selectedSisterStoreId}.`,
        },
      });
      toast.success('Stock transfer request dispatched to sister store!');
      onSuccess?.();
      onClose();
    } catch (err) {}
  };

  const handleSupplierPurchase = async () => {
    try {
      await resolveSaleItemDamage({
        saleItemId,
        payload: {
          action: 'SUPPLIER_PURCHASE',
          notes: supplierNotes || 'Replacement unit requested from supplier.',
        },
      });
      toast.success('Flagged for supplier replacement purchase.');
      onSuccess?.();
      onClose();
    } catch (err) {}
  };

  const handleCustomerDecision = async () => {
    if (customerChoice === 'CHOOSE_DIFFERENT_ITEM' && !selectedNewProduct) {
      toast.warning('Please select an alternative product from the catalog.');
      return;
    }

    try {
      await resolveSaleItemDamage({
        saleItemId,
        payload: {
          action: 'CUSTOMER_DECISION',
          customer_choice: customerChoice,
          new_product_id: selectedNewProduct?.id || null,
          contact_channel: contactChannel,
          notes: customerNotes,
        },
      });
      if (customerChoice === 'CHOOSE_DIFFERENT_ITEM') {
        toast.success(`Swapped to ${selectedNewProduct?.name}. Order totals adjusted!`);
      } else if (customerChoice === 'CANCEL_ITEM') {
        toast.info('Item cancelled and order balance recalculated.');
      } else {
        toast.success('Customer waiting recorded successfully.');
      }
      onSuccess?.();
      onClose();
    } catch (err) {}
  };

  // Price delta calculations for item swap
  const currentPrice = Number(options?.unit_price || itemDetails?.unit_price || 0);
  const newPrice = Number(selectedNewProduct?.selling_price || 0);
  const priceDiff = newPrice - currentPrice;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-[3100] font-sans">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-scale-up">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                Damaged Item Resolution Selector
              </h2>
              <p className="text-[11px] text-slate-300 font-medium">
                Choose explicit stock replacement, transfer, or customer action
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Item Context Banner */}
        <div className="px-6 py-3 bg-amber-50/70 border-b border-amber-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span className="font-extrabold text-slate-900 block sm:inline">
              {options?.product_name || itemDetails?.product_name || 'Optical Item'}
            </span>
            <span className="text-slate-500 font-mono sm:ml-2">
              SKU: {options?.product_sku || itemDetails?.product_sku || 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-2 font-bold">
            <span className="text-slate-500">Unit Price:</span>
            <span className="px-2 py-0.5 bg-white border border-amber-200 rounded-md font-mono text-slate-900">
              {fmt(currentPrice)}
            </span>
          </div>
        </div>

        {/* Resolution Options Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50 gap-2 overflow-x-auto hide-scrollbar text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('LOCAL')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'LOCAL'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            1. Store Stock
            {options && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                options.can_replace_locally ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {options.current_store_stock}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TRANSFER')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'TRANSFER'
                ? 'border-blue-600 text-blue-700 bg-white shadow-2xs font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className="w-4 h-4" />
            2. Sister Store Transfer
            {options && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                options.has_sister_store_stock ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {options.sister_stores?.length || 0}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SUPPLIER')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'SUPPLIER'
                ? 'border-purple-600 text-purple-700 bg-white shadow-2xs font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            3. Supplier Purchase
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CUSTOMER')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'CUSTOMER'
                ? 'border-amber-600 text-amber-700 bg-white shadow-2xs font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            4. Customer Decision
          </button>
        </div>

        {/* Modal Body / Active Tab View */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {isLoadingOptions ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-xs font-semibold">Checking inventory availability across store network...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: LOCAL STORE REPLACEMENT */}
              {activeTab === 'LOCAL' && (
                <div className="space-y-4 animate-fade-in">
                  <div className={`p-4 rounded-2xl border ${
                    options?.can_replace_locally ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Store className="w-4 h-4 text-emerald-600" />
                          Current Store Inventory Check
                        </h4>
                        <p className="text-xs text-slate-600">
                          {options?.can_replace_locally
                            ? `This store has ${options.current_store_stock} good units available in inventory. You can immediately replace the damaged item with 1 unit from stock.`
                            : `This store has 0 units in stock. You can check sister stores, buy from supplier, or record customer decision.`
                          }
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                        options?.can_replace_locally ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {options?.current_store_stock || 0} Units Available
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      disabled={!options?.can_replace_locally || isResolvingDamage}
                      onClick={handleLocalReplace}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                        options?.can_replace_locally
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isResolvingDamage ? 'Replacing...' : 'Replace with 1 Unit from Store Stock'}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: SISTER STORE TRANSFER */}
              {activeTab === 'TRANSFER' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-2">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-600" />
                      Sister Stores Network (Same Admin)
                    </h4>
                    <p className="text-xs text-slate-600">
                      Search is restricted to stores under your organization. If available, you can fire a stock transfer request to pull 1 unit.
                    </p>
                  </div>

                  {options?.sister_stores?.length > 0 ? (
                    <div className="space-y-3">
                      <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                        Select Source Sister Branch *
                      </label>
                      <div className="grid gap-2">
                        {options.sister_stores.map((s) => (
                          <label
                            key={s.store_id}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              selectedSisterStoreId === String(s.store_id)
                                ? 'bg-blue-50 border-blue-500 shadow-2xs'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="sisterStore"
                                value={s.store_id}
                                checked={selectedSisterStoreId === String(s.store_id)}
                                onChange={(e) => setSelectedSisterStoreId(e.target.value)}
                                className="text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-xs font-bold text-slate-900">{s.store_name}</span>
                            </div>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono text-xs font-extrabold">
                              {s.available_quantity} available
                            </span>
                          </label>
                        ))}
                      </div>

                      <div className="flex justify-end pt-4">
                        <button
                          type="button"
                          disabled={!selectedSisterStoreId || isResolvingDamage}
                          onClick={handleSisterStoreTransfer}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Truck className="w-4 h-4" />
                          {isResolvingDamage ? 'Sending Request...' : 'Send Transfer Request to Sister Store'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-2">
                      <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                      <h5 className="text-xs font-bold text-slate-700">No Sister Stores Have Available Stock</h5>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        This item is currently out of stock across all other branches. Please proceed to supplier purchase or record customer decision.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SUPPLIER PURCHASE */}
              {activeTab === 'SUPPLIER' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-2">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Package className="w-4 h-4 text-purple-600" />
                      Supplier Re-Order & Warranty Claim
                    </h4>
                    <p className="text-xs text-slate-600">
                      Flag this order line item to request replacement stock from the primary vendor or supplier.
                    </p>
                  </div>

                  {options?.supplier ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">{options.supplier.company_name}</span>
                        <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-extrabold">
                          Catalog Vendor
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-slate-600">
                        <div>Phone: <span className="font-semibold text-slate-800">{options.supplier.phone || '—'}</span></div>
                        <div>Email: <span className="font-semibold text-slate-800">{options.supplier.email || '—'}</span></div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No direct supplier linked to this product in catalog.</p>
                  )}

                  <div>
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                      Purchase / Re-Order Notes
                    </label>
                    <textarea
                      rows={3}
                      value={supplierNotes}
                      onChange={(e) => setSupplierNotes(e.target.value)}
                      placeholder="Enter supplier communication notes, expected delivery timeframe, or order code..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-semibold"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={isResolvingDamage}
                      onClick={handleSupplierPurchase}
                      className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md shadow-purple-600/20 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Package className="w-4 h-4" />
                      {isResolvingDamage ? 'Saving...' : 'Confirm Supplier Purchase Request'}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: CUSTOMER DECISION */}
              {activeTab === 'CUSTOMER' && (
                <div className="space-y-4 animate-fade-in text-xs">
                  {/* Customer Contact Direct Bar */}
                  {customer && (
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-extrabold text-slate-900 block">{customer.name || 'Customer'}</span>
                        <span className="text-[11px] text-slate-500">{customer.phone || 'No phone recorded'}</span>
                      </div>
                      {customer.phone && (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${customer.phone}`}
                            className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-[11px] inline-flex items-center gap-1"
                          >
                            <PhoneCall className="w-3 h-3 text-blue-600" /> Call
                          </a>
                          <a
                            href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] inline-flex items-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" /> WhatsApp
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3 Customer Choices */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                      Customer Decision Outcome *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        {
                          id: 'WAIT_FOR_STOCK',
                          title: 'Wait for Stock',
                          desc: 'Customer agrees to wait for incoming stock arrival.',
                          color: 'border-amber-500 bg-amber-50/40 text-amber-900',
                          icon: Clock,
                        },
                        {
                          id: 'CHOOSE_DIFFERENT_ITEM',
                          title: 'Choose Different Item',
                          desc: 'Customer selects alternative product from catalog.',
                          color: 'border-blue-500 bg-blue-50/40 text-blue-900',
                          icon: RefreshCw,
                        },
                        {
                          id: 'CANCEL_ITEM',
                          title: 'Cancel Line Item',
                          desc: 'Cancel item & refund/reduce total. Order continues.',
                          color: 'border-rose-500 bg-rose-50/40 text-rose-900',
                          icon: AlertCircle,
                        },
                      ].map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCustomerChoice(c.id)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            customerChoice === c.id ? `${c.color} ring-2 ring-slate-900/10 shadow-xs font-bold` : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <c.icon className="w-4 h-4 flex-shrink-0" />
                            <span className="font-extrabold text-xs">{c.title}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium leading-tight">{c.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SUB-VIEW 1: WAIT FOR STOCK */}
                  {customerChoice === 'WAIT_FOR_STOCK' && (
                    <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-2">
                      <p className="text-xs text-amber-900 font-semibold">
                        Item will remain flagged with <span className="font-mono font-bold">CUSTOMER_DECISION: WAIT_FOR_STOCK</span>.
                      </p>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Notes / ETA</label>
                        <input
                          type="text"
                          value={customerNotes}
                          onChange={(e) => setCustomerNotes(e.target.value)}
                          placeholder="e.g. Customer informed; expected stock arrival in 3 days..."
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* SUB-VIEW 2: CHOOSE DIFFERENT ITEM (CATALOG SEARCH + PRICE DIFF) */}
                  {customerChoice === 'CHOOSE_DIFFERENT_ITEM' && (
                    <div className="space-y-3 p-3.5 bg-blue-50/40 border border-blue-200 rounded-2xl">
                      <div>
                        <label className="text-[11px] font-extrabold text-slate-600 block mb-1">
                          Search Replacement Product from Catalog
                        </label>
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            placeholder="Type product name, model, or SKU..."
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      </div>

                      {/* Product Results Dropdown / Picker */}
                      <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-100">
                        {isLoadingProducts ? (
                          <div className="p-3 text-center text-xs text-slate-400">Loading catalog products...</div>
                        ) : catalogProducts.length > 0 ? (
                          catalogProducts.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => setSelectedNewProduct(p)}
                              className={`p-2.5 flex items-center justify-between hover:bg-blue-50/60 cursor-pointer text-xs transition-colors ${
                                selectedNewProduct?.id === p.id ? 'bg-blue-50 font-bold text-blue-900' : 'text-slate-700'
                              }`}
                            >
                              <div>
                                <span className="font-bold block">{p.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">SKU: {p.sku || 'N/A'}</span>
                              </div>
                              <span className="font-mono font-black text-slate-900">{fmt(p.selling_price)}</span>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-center text-xs text-slate-400">No products match search query.</div>
                        )}
                      </div>

                      {/* Selected Alternative Product Comparison Card */}
                      {selectedNewProduct && (
                        <div className="p-3 bg-white rounded-xl border border-blue-300 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-bold">Old Item:</span>
                            <span className="font-mono font-bold text-slate-800">{fmt(currentPrice)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-bold">New Item ({selectedNewProduct.name}):</span>
                            <span className="font-mono font-bold text-blue-700">{fmt(newPrice)}</span>
                          </div>
                          <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-xs font-black text-slate-900">Price Adjustment:</span>
                            {priceDiff > 0 ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-black text-xs">
                                +{fmt(priceDiff)} (Customer owes extra)
                              </span>
                            ) : priceDiff < 0 ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded font-black text-xs">
                                -{fmt(Math.abs(priceDiff))} (Refund / credit to customer)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-black text-xs">
                                ₹0.00 (Equal Value)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-VIEW 3: CANCEL ITEM */}
                  {customerChoice === 'CANCEL_ITEM' && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-rose-800 font-extrabold">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        Cancel Line Item Warning
                      </div>
                      <p className="text-rose-700 leading-relaxed text-[11px]">
                        Cancelling this item will remove <span className="font-bold">{fmt(currentPrice)}</span> from the order total.
                        If customer has already paid in advance, excess balance will become refundable.
                        Any other line items in this order will proceed to processing uninterrupted.
                      </p>
                    </div>
                  )}

                  {/* Submit Customer Decision */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={isResolvingDamage}
                      onClick={handleCustomerDecision}
                      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-600/20 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      {isResolvingDamage ? 'Saving Decision...' : 'Confirm & Execute Customer Decision'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-[10px] text-slate-400 font-medium">
            Every resolution is logged in the permanent audit history.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-200 text-slate-600 hover:bg-white rounded-lg font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default DamagedItemResolutionModal;
