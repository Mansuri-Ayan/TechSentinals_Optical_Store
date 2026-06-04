import { useState } from 'react';
import {
  X, Package, ChevronDown, Layers, Hash, FileText, Plus, Check,
} from 'lucide-react';

const CATEGORIES = ['Frames', 'Lenses', 'Contact Lens', 'Accessories', 'Cleaning Kit', 'Cases'];

const SUBCATEGORIES = {
  Frames:       ['Full Rim', 'Half Rim', 'Rimless', 'Round', 'Square', 'Rectangle', 'Cat Eye', 'Aviator', 'Wayfarer'],
  Lenses:       ['Single Vision', 'Bifocal', 'Progressive', 'Blue Cut', 'Photochromic', 'Polarized', 'Computer Lens'],
  'Contact Lens': ['Daily', 'Bi-Weekly', 'Monthly', 'Coloured'],
  Accessories:  ['Chains', 'Cords', 'Repair Kits', 'Straps', 'Nose Pads'],
  'Cleaning Kit': ['Microfibre Cloth', 'Spray Cleaner', 'Wet Wipes', 'Ultrasonic Cleaner'],
  Cases:        ['Hard Case', 'Soft Case', 'Pouch', 'Zip Case'],
};

const EMPTY = { category: '', subcategory: '', quantity: '', remarks: '' };

const AddGoodsModal = ({ isOpen, supplierName, onClose, onSubmit }) => {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v, ...(k === 'category' ? { subcategory: '' } : {}) }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.category)   e.category   = 'Category is required';
    if (!form.subcategory) e.subcategory = 'Sub-category is required';
    if (!form.quantity || isNaN(form.quantity) || Number(form.quantity) < 1)
      e.quantity = 'Enter a valid quantity (≥ 1)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ ...form, quantity: Number(form.quantity) });
    setForm(EMPTY);
    setErrors({});
  };

  const handleClose = () => { setForm(EMPTY); setErrors({}); onClose(); };

  const inputCls = (f) =>
    `w-full px-3 py-2.5 text-sm font-medium rounded-xl border transition-all focus:outline-none focus:ring-4 bg-white appearance-none ${
      errors[f]
        ? 'border-red-400 focus:ring-red-100 focus:border-red-500'
        : 'border-slate-200 focus:ring-emerald-500/10 focus:border-emerald-500 placeholder:text-slate-400'
    }`;

  const subcats = SUBCATEGORIES[form.category] || [];

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl shadow-2xl flex flex-col max-h-[95dvh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <Package className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add Goods</h2>
              <p className="text-xs text-slate-500 truncate max-w-[220px]">From: {supplierName}</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-5 py-5 space-y-4">
            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" /> Product Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select value={form.category} onChange={e => set('category', e.target.value)} className={inputCls('category')}>
                  <option value="">Select category…</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
            </div>

            {/* Sub-category */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" /> Sub Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select value={form.subcategory} onChange={e => set('subcategory', e.target.value)} className={inputCls('subcategory')} disabled={!form.category}>
                  <option value="">{form.category ? 'Select sub-category…' : 'Select a category first'}</option>
                  {subcats.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              {errors.subcategory && <p className="text-xs text-red-500 mt-1">{errors.subcategory}</p>}
            </div>

            {/* Quantity */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" /> Quantity <span className="text-red-500">*</span>
              </label>
              <input type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)}
                placeholder="e.g. 20" className={inputCls('quantity')} />
              {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
            </div>

            {/* Remarks */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" /> Remarks <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea rows={3} value={form.remarks} onChange={e => set('remarks', e.target.value)}
                placeholder="Any additional notes…"
                className="w-full px-3 py-2.5 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all bg-white resize-none placeholder:text-slate-400" />
            </div>

            {/* Preview chip */}
            {form.category && form.subcategory && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-emerald-700">{form.category} → {form.subcategory}</span>
                {form.quantity && <span className="ml-auto text-xs font-bold text-emerald-700">×{form.quantity}</span>}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50 flex-shrink-0">
            <button type="button" onClick={handleClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Goods
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddGoodsModal;
