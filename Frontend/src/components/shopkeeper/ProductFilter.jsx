import { Glasses, Eye, ShoppingBag, Layers } from 'lucide-react';

const getCategoryConfig = (name) => {
  const normalized = (name || '').toLowerCase();
  if (normalized.includes('frame')) {
    return {
      icon: Glasses,
      activeCls: 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100',
      hoverCls: 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
    };
  }
  if (normalized.includes('lens') && !normalized.includes('contact')) {
    return {
      icon: Eye,
      activeCls: 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100',
      hoverCls: 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
    };
  }
  if (normalized.includes('sunglass')) {
    return {
      icon: Glasses,
      activeCls: 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-100',
      hoverCls: 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
    };
  }
  if (normalized.includes('contact')) {
    return {
      icon: Eye,
      activeCls: 'bg-cyan-600 text-white border-cyan-600 shadow-md shadow-cyan-100',
      hoverCls: 'bg-white text-slate-600 border-slate-200 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-200'
    };
  }
  return {
    icon: ShoppingBag,
    activeCls: 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-100',
    hoverCls: 'bg-white text-slate-600 border-slate-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200'
  };
};

const ProductFilter = ({ categories, activeCategory, onCategoryChange }) => {
  return (
    <div className="flex items-center gap-3 mb-6 overflow-x-auto hide-scrollbar pb-1">
      <button
        onClick={() => onCategoryChange('all')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 border ${
          activeCategory === 'all'
            ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/20'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
        }`}
        type="button"
      >
        <Layers className="w-4 h-4" />
        All Items
      </button>
      {categories.map((cat) => {
        const config = getCategoryConfig(cat.name);
        const Icon = config.icon;
        const isActive = activeCategory === cat.name;
        return (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.name)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 border ${
              isActive ? config.activeCls : config.hoverCls
            }`}
            type="button"
          >
            <Icon className="w-4 h-4" />
            {cat.name}
          </button>
        );
      })}
    </div>
  );
};

export default ProductFilter;
