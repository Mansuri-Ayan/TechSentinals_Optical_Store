import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Settings2, Info } from 'lucide-react';

const GlobalLoyaltyConfigModal = ({ isOpen, onClose, config, onSave, isPending }) => {
  const [formData, setFormData] = useState({
    price_interval: 200,
    price_points: 50,
    points_per_rupee: 50,
    min_redemption_points: 50,
    silver_max: 5000,
    gold_max: 15000,
    category_points_enabled: true,
    price_points_enabled: true,
    is_enabled: true,
    max_redemption_percentage: 100
  });

  useEffect(() => {
    if (isOpen && config) {
      setFormData({
        price_interval: config.price_interval,
        price_points: config.price_points,
        points_per_rupee: config.points_per_rupee,
        min_redemption_points: config.min_redemption_points,
        silver_max: config.silver_max,
        gold_max: config.gold_max,
        category_points_enabled: config.category_points_enabled,
        price_points_enabled: config.price_points_enabled,
        is_enabled: config.is_enabled !== undefined ? config.is_enabled : true,
        max_redemption_percentage: config.max_redemption_percentage !== undefined ? config.max_redemption_percentage : 100
      });
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : Number(value)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-3 sm:p-4 animate-fade-in font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl flex-shrink-0 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Program Rules & Thresholds</h2>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-colors flex-shrink-0 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto hide-scrollbar">
            
            {/* Earning Rules Section */}
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-1 h-3 bg-emerald-500 rounded-full" />
                Earning Rules
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Price Interval (₹)
                  </label>
                  <input
                    type="number"
                    name="price_interval"
                    value={formData.price_interval}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold text-slate-900 text-sm transition-all"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold italic">Earn points every X rupees spent.</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Points to Issue
                  </label>
                  <input
                    type="number"
                    name="price_points"
                    value={formData.price_points}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold text-slate-900 text-sm transition-all"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold italic">Points granted per interval.</p>
                </div>
              </div>
            </div>

            {/* Redemption Rules Section */}
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-1 h-3 bg-blue-500 rounded-full" />
                Redemption Rules
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Redemption Rate (Pts/₹)
                  </label>
                  <input
                    type="number"
                    name="points_per_rupee"
                    min="1"
                    value={formData.points_per_rupee}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-900 text-sm transition-all"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold italic">Points needed to redeem ₹1.</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Min. Redemption Points
                  </label>
                  <input
                    type="number"
                    name="min_redemption_points"
                    min="0"
                    value={formData.min_redemption_points}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-900 text-sm transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Max Invoice Discount (%)
                  </label>
                  <input
                    type="number"
                    name="max_redemption_percentage"
                    min="0"
                    max="100"
                    value={formData.max_redemption_percentage}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-900 text-sm transition-all"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold italic">Max invoice % payable with points.</p>
                </div>
              </div>
            </div>

            {/* Tier Thresholds Section */}
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-1 h-3 bg-purple-500 rounded-full" />
                Membership Tiers
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Silver Max Points
                  </label>
                  <input
                    type="number"
                    name="silver_max"
                    value={formData.silver_max}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 font-bold text-slate-900 text-sm transition-all"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold italic">Points above this = Gold.</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Gold Max Points
                  </label>
                  <input
                    type="number"
                    name="gold_max"
                    value={formData.gold_max}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 font-bold text-slate-900 text-sm transition-all"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold italic">Points above this = Platinum.</p>
                </div>
              </div>
            </div>

            {/* Feature Toggles */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
               <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Category vs Price Points</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-relaxed">System prioritizes category-specific points if enabled.</p>
                  </div>
               </div>
               <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      name="is_enabled"
                      checked={formData.is_enabled}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer" 
                    />
                    <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors">Program Enabled</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      name="category_points_enabled"
                      checked={formData.category_points_enabled}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer" 
                    />
                    <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors">Category Rules</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      name="price_points_enabled"
                      checked={formData.price_points_enabled}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer" 
                    />
                    <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors">Price Rules</span>
                  </label>
               </div>
            </div>

          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-semibold transition-all text-sm cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-all shadow-md hover:shadow-lg hover:bg-emerald-700 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
              {isPending ? 'Updating...' : (
                <>
                  <Save className="w-4 h-4" />
                  Apply Configuration
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

export default GlobalLoyaltyConfigModal;
