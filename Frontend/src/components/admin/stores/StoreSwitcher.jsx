import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Store } from 'lucide-react';
import { useStoreStore } from '../../../store/store';

const StoreSwitcher = ({ selectedStoreFilter, onStoreChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { stores } = useStoreStore();
  const dropdownRef = useRef(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const getStoreName = (store) => store?.store_name || store?.name || 'Select Store';

  return (
    <div className="relative w-full sm:w-56" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full pl-9 pr-4 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white cursor-pointer shadow-sm hover:bg-slate-50 transition-all text-slate-800 text-left"
      >
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          <Store className="w-4 h-4" />
        </span>
        <span className="truncate pr-2">{selectedStoreFilter === 'All' ? 'All Stores' : selectedStoreFilter}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in max-h-60 overflow-y-auto hide-scrollbar">
          <button
            type="button"
            onClick={() => {
              onStoreChange('All');
              setIsOpen(false);
            }}
            className={`w-full text-left px-4 py-3 flex items-center justify-between text-sm transition-colors ${
              selectedStoreFilter === 'All'
                ? 'bg-emerald-50 text-emerald-600 font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className="truncate">All Stores</span>
            {selectedStoreFilter === 'All' && <Check className="w-4 h-4" />}
          </button>
          
          {stores.map((store) => {
            const name = getStoreName(store);
            const isSelected = selectedStoreFilter === name;
            return (
              <button
                key={store.id}
                type="button"
                onClick={() => {
                  onStoreChange(name);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 flex items-center justify-between text-sm transition-colors ${
                  isSelected
                    ? 'bg-emerald-50 text-emerald-600 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="truncate">{name}</span>
                {isSelected && <Check className="w-4 h-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StoreSwitcher;
