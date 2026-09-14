import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, DollarSign, CheckCircle2, AlertCircle, Wrench, Loader2 } from 'lucide-react';
import { useRepairMutations } from '../../hooks/useRepairs';
import { toast } from 'react-toastify';

const fmtCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

const EditRepairModal = ({ isOpen, onClose, repair }) => {
  const { updateRepairAsync, isUpdating } = useRepairMutations();

  const [form, setForm] = useState({
    estimated_cost: '',
    final_cost: '',
    advance_paid: '',
    payment_method: 'CASH',
    is_warranty: false,
    notes: '',
    description: '',
  });

  useEffect(() => {
    if (repair) {
      setForm({
        estimated_cost: repair.estimated_cost ?? '',
        final_cost: repair.final_cost ?? repair.estimated_cost ?? '',
        advance_paid: repair.advance_paid ?? repair.paid_amount ?? '',
        payment_method: repair.payment_method || 'CASH',
        is_warranty: Boolean(repair.is_warranty),
        notes: repair.notes ?? '',
        description: repair.description ?? '',
      });
    }
  }, [repair]);

  if (!isOpen || !repair) return null;

  const totalCost = form.is_warranty ? 0 : Number(form.final_cost !== '' ? form.final_cost : (form.estimated_cost || 0));
  const paidAmount = Number(form.advance_paid || 0);
  const dueAmount = Math.max(0, totalCost - paidAmount);
  const isFinal = dueAmount <= 0 || form.is_warranty;

  const handleMarkPaidInFull = () => {
    setForm(prev => ({
      ...prev,
      advance_paid: totalCost.toString(),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        estimated_cost: form.is_warranty ? 0 : Number(form.estimated_cost || 0),
        final_cost: form.is_warranty ? 0 : (form.final_cost !== '' ? Number(form.final_cost) : Number(form.estimated_cost || 0)),
        advance_paid: form.is_warranty ? 0 : Number(form.advance_paid || 0),
        payment_method: form.payment_method,
        is_warranty: form.is_warranty,
        notes: form.notes || null,
        description: form.description || null,
      };

      await updateRepairAsync({ repairId: repair.id, payload });
      toast.success(isFinal ? 'Repair bill settled! Final Invoice generated.' : 'Repair payment updated! Temporary Invoice updated.');
      onClose();
    } catch (err) {
      toast.error('Failed to update repair record.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-6 animate-fade-in font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Update Repair & Payment</h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{repair.repair_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Live Billing Summary Banner */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            isFinal ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
          }`}>
            <div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold border mb-1 ${
                isFinal ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                {isFinal ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {isFinal ? 'FINAL INVOICE (PAID IN FULL)' : 'TEMPORARY INVOICE (OUTSTANDING)'}
              </span>
              <p className="text-xs text-slate-600 font-medium">
                {form.is_warranty
                  ? 'Covered under warranty (Free Service)'
                  : `Total: ${fmtCurrency(totalCost)} · Paid: ${fmtCurrency(paidAmount)}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Balance Due</p>
              <p className={`text-lg font-black ${dueAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {fmtCurrency(dueAmount)}
              </p>
            </div>
          </div>

          {/* Costs */}
          {!form.is_warranty && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Estimated Cost (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.estimated_cost}
                  onChange={e => setForm(p => ({ ...p, estimated_cost: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Final Repair Cost (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={form.estimated_cost || '0'}
                  value={form.final_cost}
                  onChange={e => setForm(p => ({ ...p, final_cost: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Payment Collection */}
          {!form.is_warranty && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600">Amount Paid (₹)</label>
                  {dueAmount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkPaidInFull}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      + Full Payment
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.advance_paid}
                  onChange={e => setForm(p => ({ ...p, advance_paid: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Payment Method</label>
                <select
                  value={form.payment_method}
                  onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white cursor-pointer"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="ONLINE">Online Payment</option>
                </select>
              </div>
            </div>
          )}

          {/* Internal Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Repair Notes</label>
            <textarea
              rows="2"
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Add payment method, technician notes, or parts replaced..."
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="px-5 py-2 text-xs font-bold text-white bg-[#0A0F1F] rounded-xl hover:bg-slate-800 transition-colors shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Payment & Bill Changes
            </button>
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
};

export default EditRepairModal;
