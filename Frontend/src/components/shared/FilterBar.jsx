import React from 'react';
import { Filter, X, Check } from 'lucide-react';

const FilterBar = ({
  showFilters = false,
  onToggle,
  onClear,
  hasActiveFilters = false,
  children
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-3">
        {onToggle && (
          <button
            onClick={onToggle}
            className={`flex items-center gap-2 px-4.5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold border transition-all flex-shrink-0 cursor-pointer ${
              showFilters || hasActiveFilters
                ? 'bg-emerald-50/70 text-emerald-700 border-emerald-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
          </button>
        )}
      </div>

      {showFilters && (
        <div className="p-5 bg-white border border-slate-200/60 rounded-3xl shadow-sm animate-slide-up space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {children}
          </div>

          {(onClear || hasActiveFilters) && (
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              {onClear && (
                <button
                  onClick={onClear}
                  className="px-4 py-2 text-xs font-bold text-red-650 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
