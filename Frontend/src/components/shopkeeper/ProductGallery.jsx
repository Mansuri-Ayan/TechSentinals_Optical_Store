import { useState } from 'react';

const GRAD_THEMES = [
  { name: 'Midnight Blue', grad: 'from-blue-600 to-indigo-900', bg: 'bg-blue-100', border: 'border-blue-300' },
  { name: 'Forest Teal', grad: 'from-emerald-500 to-teal-850', bg: 'bg-emerald-100', border: 'border-emerald-300' },
  { name: 'Royal Purple', grad: 'from-purple-500 to-violet-900', bg: 'bg-purple-100', border: 'border-purple-300' },
  { name: 'Warm Crimson', grad: 'from-rose-500 to-pink-900', bg: 'bg-rose-100', border: 'border-rose-300' },
];

const ProductGallery = ({ product }) => {
  const [activeThemeIdx, setActiveThemeIdx] = useState(0);
  const activeTheme = GRAD_THEMES[activeThemeIdx];

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* Large Main Display */}
      <div className="relative aspect-square w-full rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shadow-sm group">
        {product.image ? (
          <img
            src={product.image}
            alt={product.product_name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${activeTheme.grad} flex flex-col items-center justify-center p-8 text-white relative`}>
            {/* Geometric watermark */}
            <div className="absolute inset-0 bg-white/5 opacity-10 flex items-center justify-center pointer-events-none">
              <span className="text-[180px] font-black tracking-tighter select-none">
                {(product.product_name || 'P')[0]}
              </span>
            </div>
            
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-xl border border-white/20 relative z-10 transition-transform duration-300 group-hover:scale-110">
              <span className="text-4xl sm:text-5xl font-black">{(product.product_name || 'P')[0]}</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest mt-4 opacity-70 relative z-10">{product.brand}</p>
            <p className="text-sm font-bold text-center mt-1 max-w-[200px] line-clamp-2 relative z-10 leading-tight">{product.product_name}</p>
          </div>
        )}
      </div>

      {/* Thumbnail Previews */}
      <div className="grid grid-cols-4 gap-2.5">
        {GRAD_THEMES.map((theme, idx) => {
          const isActive = idx === activeThemeIdx;
          return (
            <button
              key={theme.name}
              onClick={() => setActiveThemeIdx(idx)}
              className={`aspect-square rounded-2xl border-2 flex items-center justify-center transition-all overflow-hidden ${
                isActive
                  ? 'border-emerald-500 scale-95 shadow-md shadow-emerald-50'
                  : 'border-slate-100 hover:border-slate-300'
              }`}
              type="button"
              title={`Switch to ${theme.name}`}
            >
              <div className={`w-full h-full bg-gradient-to-br ${theme.grad} flex items-center justify-center text-white text-[10px] font-black`}>
                {(product.product_name || 'P')[0]}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProductGallery;
