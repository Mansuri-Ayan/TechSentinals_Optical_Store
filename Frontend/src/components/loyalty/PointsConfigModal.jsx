import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Sliders } from 'lucide-react';

const PointsConfigModal = ({ isOpen, onClose, categories, onSave, isPending }) => {
  const [formData, setFormData] = useState([]);

  useEffect(() => {
    if (isOpen && categories) {
      setFormData(JSON.parse(JSON.stringify(categories)));
    }
  }, [isOpen, categories]);

  if (!isOpen) return null;

  const handleChange = (index, val) => {
    const newFormData = [...formData];
    newFormData[index].points_per_unit = Number(val) || 0;
    setFormData(newFormData);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-3 sm:p-4 animate-fade-in font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl flex-shrink-0 bg-blue-500/10 border border-blue-500/20 text-blue-600">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Loyalty Points Configuration</h2>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-colors flex-shrink-0 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto hide-scrollbar">
            <p className="text-xs font-semibold text-slate-500 mb-2 leading-relaxed">
              Define the number of points issued per item purchased in each product category.
            </p>

            {formData.map((cat, index) => (
              <div key={cat.id}>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {cat.category_name} Points
                </label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={cat.points_per_unit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold text-slate-900 text-sm transition-all"
                  required
                />
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-semibold transition-all text-sm cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-2.5 bg-[#0A0F1F] text-white rounded-xl font-semibold text-sm transition-all shadow-md hover:shadow-lg hover:bg-slate-800 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
              {isPending ? 'Saving...' : (
                <>
                  <Save className="w-4 h-4" />
                  Save Rules
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default PointsConfigModal;
