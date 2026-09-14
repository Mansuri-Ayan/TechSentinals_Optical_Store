import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  ArchiveX,
  FileText,
  DollarSign,
  ShieldCheck,
  Building2,
  Wrench,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Calendar,
  Check
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useQCMutations, useDamagedItemHistory } from '../../../hooks/useQC';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ─────────────────────────────────────────────────────────────────────────────
   1. VERIFY & COMPLETE RESOLUTION MODAL
   ───────────────────────────────────────────────────────────────────────────── */
export function VerifyCompleteModal({ isOpen, onClose, item, onSuccess }) {
  const { verifyCompleteDamage, isVerifyingComplete } = useQCMutations();
  const [receivedQuantity, setReceivedQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReceivedQuantity(1);
      setNotes('');
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const isReplacement =
    item.compensation_type === 'REPLACEMENT_ITEM' ||
    item.compensation_type === 'EQUIVALENT_ITEM' ||
    item.status?.includes('REPLACED') ||
    item.status === 'PROMISED';

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await verifyCompleteDamage({
        damagedItemId: item.id,
        payload: {
          received_quantity: Number(receivedQuantity) || 1,
          notes: notes.trim() || undefined,
        },
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      // Handled by mutation toast
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[1200] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Verify & Complete Resolution</h3>
              <p className="text-xs text-slate-500">Confirm physical receipt or financial settlement</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Item Context Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-slate-700">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900 text-sm">{item.product_name}</span>
              <span className="font-mono font-bold text-slate-900">{fmt(item.product_cost || item.product_price)}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span>SKU: <span className="font-mono font-medium text-slate-700">{item.product_sku || 'N/A'}</span></span>
              <span>•</span>
              <span>Branch: <span className="font-medium text-slate-700">{item.store_name || `Store #${item.store_id}`}</span></span>
            </div>
            {item.supplier_name && (
              <p className="text-[11px] text-slate-500">
                Supplier: <span className="font-bold text-slate-700">{item.supplier_name}</span>
              </p>
            )}
            {item.lab_name && (
              <p className="text-[11px] text-slate-500">
                Lab: <span className="font-bold text-slate-700">{item.lab_name}</span>
              </p>
            )}
          </div>

          {/* Settlement Info Notice */}
          <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100 text-emerald-900 space-y-1">
            <div className="flex items-center gap-2 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                {item.compensation_amount && Number(item.compensation_amount) > 0
                  ? `Promised Compensation: ${fmt(item.compensation_amount)}`
                  : 'Promised Physical Replacement Unit'}
              </span>
            </div>
            <p className="text-[11px] text-emerald-800">
              Confirming this completion will finalize the claim status to <strong>RESOLVED</strong> and add physical units back to store inventory if this was a replacement.
            </p>
          </div>

          {/* Replacement Quantity Input */}
          {isReplacement && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Verified Received Quantity *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={receivedQuantity}
                onChange={(e) => setReceivedQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full sm:w-36 px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Quantity of replacement units physically unpacked and inspected in store stock.
              </p>
            </div>
          )}

          {/* Audit Notes */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Verification / Inward Delivery Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received via Blue Dart Docket #987654, condition verified pristine, credit memo #CM-44 posted..."
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifyingComplete}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isVerifyingComplete ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirm Verified & Complete</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. MARK RESOLUTION AS FAILED MODAL
   ───────────────────────────────────────────────────────────────────────────── */
export function MarkFailedModal({ isOpen, onClose, item, onSuccess }) {
  const { markFailedDamage, isMarkingFailed } = useQCMutations();
  const [reason, setReason] = useState('Supplier Failed to Deliver Replacement');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason(
        item?.stage === 'POST_LAB' || item?.damage_type === 'LAB_DAMAGE'
          ? 'Lab Refused / Failed to Deliver Promised Lens'
          : 'Supplier Failed to Deliver Replacement'
      );
      setCustomReason('');
      setNotes('');
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalReason = reason === 'Other (Specify)' ? customReason.trim() : reason;
    if (!finalReason) {
      toast.warning('Please specify a failure reason.');
      return;
    }

    try {
      await markFailedDamage({
        damagedItemId: item.id,
        payload: {
          reason: finalReason,
          notes: notes.trim() || undefined,
        },
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      // Handled by mutation toast
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[1200] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Mark Resolution as Failed</h3>
              <p className="text-xs text-slate-500">Record promised resolution default</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-100 text-rose-900 space-y-1">
            <p className="font-bold text-xs">Supplier / Lab Default Warning</p>
            <p className="text-[11px] text-rose-800">
              Marking this promise as failed transitions the item to <strong>FAILED</strong> status. You will be able to select a new resolution (e.g. choose alternate supplier, claim cash settlement, or write off as loss).
            </p>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Reason for Promise Failure *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="Supplier Failed to Deliver Replacement">Supplier Failed to Deliver Replacement</option>
              <option value="Promised Delivery Deadline Exceeded / Lapsed">Promised Delivery Deadline Exceeded / Lapsed</option>
              <option value="Supplier Reneged on Credit Note">Supplier Reneged on Credit Note</option>
              <option value="Lab Refused / Failed to Deliver Promised Lens">Lab Refused / Failed to Deliver Promised Lens</option>
              <option value="Product Discontinued by Manufacturer">Product Discontinued by Manufacturer</option>
              <option value="Vendor Insolvency / Closed Account">Vendor Insolvency / Closed Account</option>
              <option value="Other (Specify)">Other (Specify)</option>
            </select>
            {reason === 'Other (Specify)' && (
              <input
                type="text"
                placeholder="Specify failure reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full mt-2 px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Audit Notes / Vendor Communication Details
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Contacted supplier sales rep; informed us unit is out of stock indefinitely and credit memo was cancelled..."
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 bg-white"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isMarkingFailed}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isMarkingFailed ? (
                <span>Recording Failure...</span>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <span>Confirm Promise Failed</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. REOPEN DAMAGED ITEM MODAL
   ───────────────────────────────────────────────────────────────────────────── */
export function ReopenDamageModal({ isOpen, onClose, item, onSuccess }) {
  const { reopenDamagedItem, isReopeningDamagedItem } = useQCMutations();
  const isLoss = item?.status === 'WRITTEN_OFF';

  const defaultReason = isLoss
    ? 'Damaged Item Recovered / Found in Stock'
    : 'Replacement Unit Defective / Damaged Again';

  const [reason, setReason] = useState(defaultReason);
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason(isLoss ? 'Damaged Item Recovered / Found in Stock' : 'Replacement Unit Defective / Damaged Again');
      setCustomReason('');
      setNotes('');
    }
  }, [isOpen, isLoss]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalReason = reason === 'Other (Specify)' ? customReason.trim() : reason;
    if (!finalReason) {
      toast.warning('Please specify a reopening reason.');
      return;
    }

    try {
      await reopenDamagedItem({
        damagedItemId: item.id,
        payload: {
          reason: finalReason,
          notes: notes.trim() || undefined,
        },
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      // Handled by mutation toast
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[1200] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Reopen Damage Record</h3>
              <p className="text-xs text-slate-500">
                Current Status: <span className="font-bold text-slate-800">{item.status}</span>
                {item.reopen_count > 0 && ` • Previously Reopened ${item.reopen_count}x`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 text-amber-900 space-y-1">
            <p className="font-bold text-xs">Lifecycle Continuity Notice</p>
            <p className="text-[11px] text-amber-800">
              {isLoss
                ? 'Reopening this loss record permits recovering the stock or negotiating alternative supplier/lab compensation.'
                : 'Reopening this resolved damage record returns it to active lifecycle for re-investigation or replacement correction.'}
            </p>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Reopening Reason *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              {isLoss ? (
                <>
                  <option value="Damaged Item Recovered / Found in Stock">Damaged Item Recovered / Found in Stock</option>
                  <option value="Item Successfully Repaired In-House">Item Successfully Repaired In-House</option>
                  <option value="Supplier Later Agreed to Reopen & Settle Claim">Supplier Later Agreed to Reopen & Settle Claim</option>
                  <option value="Lab Acknowledged Incident After Re-evaluation">Lab Acknowledged Incident After Re-evaluation</option>
                  <option value="Accounting / Inventory Audit Correction">Accounting / Inventory Audit Correction</option>
                  <option value="Other (Specify)">Other (Specify)</option>
                </>
              ) : (
                <>
                  <option value="Replacement Unit Defective / Damaged Again">Replacement Unit Defective / Damaged Again</option>
                  <option value="Vendor Credit Note Disputed / Rejected by Accounts">Vendor Credit Note Disputed / Rejected by Accounts</option>
                  <option value="Customer Rejected Replacement Unit">Customer Rejected Replacement Unit</option>
                  <option value="Resolution Incomplete / Discrepancy Found">Resolution Incomplete / Discrepancy Found</option>
                  <option value="Promised Settlement Never Arrived">Promised Settlement Never Arrived</option>
                  <option value="Other (Specify)">Other (Specify)</option>
                </>
              )}
            </select>
            {reason === 'Other (Specify)' && (
              <input
                type="text"
                placeholder="Specify custom reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full mt-2 px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Audit Notes & Justification
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide background context on why this item is being reopened..."
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isReopeningDamagedItem}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isReopeningDamagedItem ? (
                <span>Reopening...</span>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Confirm Reopen Record</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. CHANGE RESOLUTION MODAL
   ───────────────────────────────────────────────────────────────────────────── */
export function ChangeResolutionModal({ isOpen, onClose, item, onSuccess }) {
  const { changeDamageResolution, isChangingResolution } = useQCMutations();

  const [resType, setResType] = useState('REPLACEMENT');
  const [compAmount, setCompAmount] = useState('');
  const [lossAmount, setLossAmount] = useState('');
  const [lossReason, setLossReason] = useState('Adjusted Resolution');
  const [customLossReason, setCustomLossReason] = useState('');
  const [isPromise, setIsPromise] = useState(false);
  const [expectedDate, setExpectedDate] = useState('');
  const [changeReason, setChangeReason] = useState('Supplier offered alternative settlement');
  const [customChangeReason, setCustomChangeReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && item) {
      setResType(item.compensation_type?.includes('REPLACEMENT') ? 'REPLACEMENT' : 'FULL_COMPENSATION');
      setCompAmount(item.compensation_amount || item.product_cost || item.product_price || '');
      setLossAmount(item.loss_amount || '');
      setLossReason(item.loss_reason || 'Adjusted Resolution');
      setCustomLossReason('');
      setIsPromise(Boolean(item.is_promise_pending));
      setExpectedDate(item.expected_resolution_date ? item.expected_resolution_date.slice(0, 10) : '');
      setChangeReason('Supplier offered alternative settlement');
      setCustomChangeReason('');
      setNotes('');
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalChangeReason = changeReason === 'Other (Specify)' ? customChangeReason.trim() : changeReason;
    if (!finalChangeReason) {
      toast.warning('Please specify a reason for changing the resolution.');
      return;
    }

    let finalComp = null;
    let finalLossAmt = null;
    let finalLossRsn = null;

    if (resType === 'FULL_COMPENSATION' || resType === 'PARTIAL_COMPENSATION') {
      if (!compAmount || Number(compAmount) <= 0) {
        toast.warning('Please enter a valid compensation amount.');
        return;
      }
      finalComp = Number(compAmount);
    }
    if (resType === 'PARTIAL_COMPENSATION' || resType === 'NO_COMPENSATION' || resType === 'MARK_AS_LOSS') {
      finalLossRsn = lossReason === 'Other (Specify)' ? customLossReason.trim() : lossReason;
      finalLossAmt = lossAmount ? Number(lossAmount) : null;
    }

    try {
      await changeDamageResolution({
        damagedItemId: item.id,
        payload: {
          resolution_type: resType,
          compensation_amount: finalComp,
          loss_reason: finalLossRsn,
          loss_amount: finalLossAmt,
          is_promise: isPromise,
          expected_date: isPromise && expectedDate ? expectedDate : null,
          change_reason: finalChangeReason,
          notes: notes.trim() || undefined,
        },
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      // Handled by mutation toast
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[1200] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Change Damage Resolution</h3>
              <p className="text-xs text-slate-500">
                Current Status: <span className="font-bold text-slate-800">{item.status}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Item Context */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-slate-700">
            <div>
              <span className="font-bold text-slate-900 text-sm block">{item.product_name}</span>
              <span className="font-mono text-[10px] text-slate-500">SKU: {item.product_sku || 'N/A'}</span>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-slate-900 text-sm block">
                {fmt(item.product_cost || item.product_price)}
              </span>
              <span className="text-[10px] text-slate-400">Product Cost</span>
            </div>
          </div>

          {/* New Resolution Type */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Select New Resolution Type *
            </label>
            <select
              value={resType}
              onChange={(e) => {
                setResType(e.target.value);
                const cost = Number(item.product_cost || item.product_price || 0);
                if (e.target.value === 'FULL_COMPENSATION') setCompAmount(cost);
                if (e.target.value === 'PARTIAL_COMPENSATION') {
                  const half = Math.round((cost / 2) * 100) / 100;
                  setCompAmount(half);
                  setLossAmount(cost - half);
                }
                if (e.target.value === 'NO_COMPENSATION' || e.target.value === 'MARK_AS_LOSS') {
                  setCompAmount('0');
                  setLossAmount(cost);
                }
              }}
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="REPLACEMENT">1. Replacement (Same or Equivalent Unit)</option>
              <option value="FULL_COMPENSATION">2. Full Compensation (Credit Note / Bank Refund)</option>
              <option value="PARTIAL_COMPENSATION">3. Partial Compensation (Partial Refund + Write-Off)</option>
              <option value="NO_COMPENSATION">4. No Compensation (Claim Rejected)</option>
              <option value="MARK_AS_LOSS">5. Mark as Loss (Direct Write-Off)</option>
            </select>
          </div>

          {/* Dynamic Financial Fields */}
          {(resType === 'FULL_COMPENSATION' || resType === 'PARTIAL_COMPENSATION') && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Settlement / Compensation Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                value={compAmount}
                onChange={(e) => setCompAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          )}

          {(resType === 'PARTIAL_COMPENSATION' || resType === 'NO_COMPENSATION' || resType === 'MARK_AS_LOSS') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Loss Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={lossAmount}
                  onChange={(e) => setLossAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Loss Reason *
                </label>
                <select
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="Vendor Refused Warranty / Rejected Claim">Vendor Refused Warranty / Rejected Claim</option>
                  <option value="Partial Settlement Approved">Partial Settlement Approved</option>
                  <option value="In-Store Handling / Accidental Breakage">In-Store Handling / Accidental Breakage</option>
                  <option value="Beyond Economic Repair">Beyond Economic Repair</option>
                  <option value="Internal Inventory Policy Write-off">Internal Inventory Policy Write-off</option>
                  <option value="Other (Specify)">Other (Specify)</option>
                </select>
              </div>
            </div>
          )}

          {/* Promise Pending Checkbox */}
          {resType !== 'MARK_AS_LOSS' && (
            <div className="p-3.5 bg-sky-50/60 rounded-xl border border-sky-200 space-y-2">
              <label className="font-bold text-sky-900 text-xs flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPromise}
                  onChange={(e) => setIsPromise(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                />
                <span>Resolution is Promised / Pending Fulfillment</span>
              </label>
              <p className="text-[11px] text-sky-800">
                Mark as pending if the vendor/lab promised fulfillment at a later date. Inventory will not be modified until confirmed.
              </p>
              {isPromise && (
                <div className="pt-1">
                  <label className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block mb-1">
                    Expected Completion Date
                  </label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full sm:w-48 px-3 py-1.5 text-xs font-semibold border border-sky-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-800"
                  />
                </div>
              )}
            </div>
          )}

          {/* Mandatory Reason for Change */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Reason for Changing Resolution *
            </label>
            <select
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="Supplier offered alternative settlement">Supplier offered alternative settlement</option>
              <option value="Supplier offered financial credit instead of physical replacement">Supplier offered financial credit instead of physical replacement</option>
              <option value="Item discontinued by vendor, switching to credit note">Item discontinued by vendor, switching to credit note</option>
              <option value="Negotiated higher / lower compensation with partner">Negotiated higher / lower compensation with partner</option>
              <option value="Previously written off item now approved by vendor">Previously written off item now approved by vendor</option>
              <option value="Reconciliation discrepancy / invoice adjustment">Reconciliation discrepancy / invoice adjustment</option>
              <option value="Other (Specify)">Other (Specify)</option>
            </select>
            {changeReason === 'Other (Specify)' && (
              <input
                type="text"
                placeholder="Specify reason for changing..."
                value={customChangeReason}
                onChange={(e) => setCustomChangeReason(e.target.value)}
                className="w-full mt-2 px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            )}
          </div>

          {/* Audit Notes */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Audit Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional remarks regarding terms change..."
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isChangingResolution}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isChangingResolution ? (
                <span>Updating...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirm New Resolution</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   5. DAMAGED ITEM LIFECYCLE AUDIT HISTORY MODAL
   ───────────────────────────────────────────────────────────────────────────── */
export function DamageItemHistoryModal({ isOpen, onClose, item }) {
  const { data: history = [], isLoading, refetch } = useDamagedItemHistory(isOpen && item ? item.id : null);

  if (!isOpen || !item) return null;

  const getActionBadge = (action) => {
    switch (action) {
      case 'CREATED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">CREATED</span>;
      case 'PROMISED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-200">PROMISED</span>;
      case 'VERIFIED_COMPLETED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">COMPLETED</span>;
      case 'FAILED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">FAILED</span>;
      case 'REOPENED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">REOPENED</span>;
      case 'RESOLUTION_CHANGED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">CHANGED</span>;
      case 'MARKED_AS_LOSS':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">LOSS</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">{action}</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[1200] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Resolution Lifecycle Timeline
              </h3>
              <p className="text-[11px] text-slate-500">
                Item #{item.id} • <span className="font-bold text-slate-700">{item.product_name}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline Content */}
        <div className="space-y-3 overflow-y-auto flex-1 pr-1">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 font-bold text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
              Loading lifecycle history...
            </div>
          ) : history.length === 0 ? (
            <div className="p-10 text-center text-slate-400 font-semibold text-xs bg-slate-50 rounded-xl border border-slate-100">
              No lifecycle modifications logged yet. The damage record is at its initial status.
            </div>
          ) : (
            history.map((log) => (
              <div key={log.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-2 transition-all hover:bg-slate-100/60">
                {/* Header Row: User, Action, Timestamp */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getActionBadge(log.action)}
                    <span className="font-bold text-slate-900">
                      {log.changed_by_name || 'System / Staff'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">
                      ({log.changed_by_type || 'User'})
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 font-medium">
                    {new Date(log.created_at).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Status Transitions */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                    <span className="text-slate-400 text-[10px]">Status:</span>
                    <span className="px-2 py-0.5 bg-slate-200/80 rounded text-[10px] font-bold text-slate-700">
                      {log.previous_status || 'INITIAL'}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded font-black text-[10px]">
                      {log.new_status}
                    </span>
                  </div>

                  {log.new_resolution_type && (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 pl-2 border-l border-slate-200">
                      <span className="text-slate-400 text-[10px]">Resolution:</span>
                      <span className="font-bold text-slate-800 text-[10px]">
                        {log.new_resolution_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}

                  {log.new_compensation_amount && Number(log.new_compensation_amount) > 0 && (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 pl-2 border-l border-slate-200">
                      <span className="text-slate-400 text-[10px]">Settlement:</span>
                      <span className="font-mono font-bold text-emerald-700 text-[10px]">
                        {fmt(log.new_compensation_amount)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Reason Callout */}
                {log.reason && (
                  <div className="p-2 bg-amber-50/80 rounded-lg border border-amber-200/60 text-amber-900 text-[11px]">
                    <span className="font-bold">Reason: </span>
                    <span>{log.reason}</span>
                  </div>
                )}

                {/* Notes */}
                {log.notes && (
                  <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded-lg border border-slate-100">
                    "{log.notes}"
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
