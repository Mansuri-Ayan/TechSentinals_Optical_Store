import { Glasses, Eye } from 'lucide-react';

const ProductFilter = ({ activeCategory, onCategoryChange }) => {
  return (
    <div className="flex items-center gap-3 mb-6 overflow-x-auto hide-scrollbar pb-1">
      {/* Frames Button */}
      <button
        onClick={() => onCategoryChange('Frames')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 border ${
          activeCategory === 'Frames'
            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
        }`}
      >
        <Glasses className="w-4 h-4" />
        Frames
      </button>

      {/* Lenses Button */}
      <button
        onClick={() => onCategoryChange('Lenses')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 border ${
          activeCategory === 'Lenses'
            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
        }`}
      >
        <Eye className="w-4 h-4" />
        Lenses
      </button>
    </div>
  );
};

export default ProductFilter;
