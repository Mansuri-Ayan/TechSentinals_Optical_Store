import React, { useState, useEffect, useRef } from 'react';
import { Search, User, X, Loader2 } from 'lucide-react';
import { getCustomersApi } from '../../api/customer/customer.api';

const LoyaltyCustomerSearch = ({ selectedCustomer, onSelectCustomer, onClear }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    const fetchCustomers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getCustomersApi({ search: searchTerm, global_search: true, limit: 10 });
        setResults(data || []);
        setIsOpen(true);
      } catch (err) {
        setError('Failed to search customers');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchCustomers, 400);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const handleSelect = (customer) => {
    onSelectCustomer(customer);
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div className="relative w-full text-left" ref={wrapperRef}>
      {selectedCustomer ? (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700">
                {selectedCustomer.first_name} {selectedCustomer.last_name || ''}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">{selectedCustomer.phone}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            ) : (
              <Search className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <input
            type="text"
            className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            placeholder="Search family member by phone or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setIsOpen(true);
            }}
          />

          {isOpen && (results.length > 0 || error) && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {error ? (
                <div className="p-3 text-xs text-red-500 text-center">{error}</div>
              ) : (
                <ul className="py-1">
                  {results.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(c)}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-3 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">
                            {c.first_name} {c.last_name || ''}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">{c.phone}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs font-black text-amber-500">{c.current_points || 0} pts</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LoyaltyCustomerSearch;
