import React from 'react';
import { Search, X } from 'lucide-react';

const SearchBar = ({
  value = '',
  onChange,
  placeholder = 'Search records...',
  className = ''
}) => {
  return (
    <div className={`relative flex-1 group ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-slate-400 group-focus-within:text-slate-650 group-focus-within:scale-105 transition-all" />
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-800 text-xs sm:text-sm font-semibold transition-all shadow-sm placeholder:text-slate-400 text-slate-700"
      />
      {value && (
        <button
          onClick={() => onChange && onChange('')}
          className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors p-1"
          title="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
