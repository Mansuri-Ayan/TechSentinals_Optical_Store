import React, { useState, useEffect, useRef } from 'react';
import { Search, User, X, Loader2, UserPlus } from 'lucide-react';
import { getCustomersApi, quickCreateCustomerApi } from '../../api/customer/customer.api';
import { toast } from 'react-toastify';

const LoyaltyCustomerSearch = ({ selectedCustomer, onSelectCustomer, onClear, allowQuickCreateButton = false, suggestedCustomers = [], excludeCustomerId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState(null);
  
  // Quick Create State
  const [isQuickCreating, setIsQuickCreating] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDob, setNewDob] = useState('');
  const [newGender, setNewGender] = useState('NOT_SPECIFIED');
  const [conflictCustomer, setConflictCustomer] = useState(null);
  
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
      setConflictCustomer(null);
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
    setIsQuickCreating(false);
  };

  const handleQuickCreate = async (e) => {
    e.preventDefault();
    if (!newPhone || !newFirstName) return;
    
    setIsLoading(true);
    setConflictCustomer(null);
    try {
      const payload = {
        first_name: newFirstName.trim(),
        last_name: newLastName.trim() || null,
        phone: newPhone.trim(),
        email: newEmail.trim() || null,
        date_of_birth: newDob || null,
        gender: newGender,
      };
      const customer = await quickCreateCustomerApi(payload);
      toast.success("Customer created!");
      handleSelect(customer);
    } catch (err) {
      if (err.isConflict) {
        setConflictCustomer(err.data.customer);
      } else {
        console.error("Creation error:", err.response?.data);
        const detail = err.response?.data?.detail;
        if (Array.isArray(detail)) {
          setError(detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join(', '));
        } else if (typeof detail === 'string') {
          setError(detail);
        } else {
          setError(err.message || 'Failed to create customer');
        }
      }
    } finally {
      setIsLoading(false);
    }
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
          <div className="flex gap-2">
            <div className="relative flex-1">
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
                placeholder="Search by phone or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => {
                  if (results.length > 0) setIsOpen(true);
                }}
              />
            </div>
            {allowQuickCreateButton && !isQuickCreating && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(true);
                  setIsQuickCreating(true);
                  setResults([]);
                  const trimmed = searchTerm.trim();
                  if (/^\d+$/.test(trimmed)) {
                    setNewPhone(trimmed);
                    setNewFirstName('');
                  } else {
                    setNewFirstName(trimmed);
                    setNewPhone('');
                  }
                }}
                className="px-3 py-2 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                New
              </button>
            )}
          </div>

          {!searchTerm.trim() && suggestedCustomers.length > 0 && !selectedCustomer && !isQuickCreating && !conflictCustomer && (
            <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm animate-in fade-in zoom-in-95 duration-200">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Linked Members</span>
              </div>
              <ul className="py-1">
                {suggestedCustomers.filter(c => c.id !== excludeCustomerId).map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(c)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700">
                            {c.first_name} {c.last_name || ''}
                          </p>
                          <p className="text-[10px] text-slate-500">{c.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-500">{c.membership_tier}</p>
                          <p className="text-xs font-black text-amber-500">{c.current_points || 0} pts</p>
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Select</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isOpen && !isQuickCreating && !conflictCustomer && (results.length > 0 || error || (searchTerm.trim() !== '' && results.length === 0)) && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {error ? (
                <div className="p-3 text-xs text-red-500 text-center">{error}</div>
              ) : (
                <ul className="py-1">
                  {results.filter(c => c.id !== excludeCustomerId).map((c) => (
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
                  
                  {searchTerm.trim() !== '' && results.length === 0 && !isLoading && (
                    <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/50">
                      <button
                        type="button"
                        onClick={() => {
                          setIsQuickCreating(true);
                          const trimmed = searchTerm.trim();
                          if (/^\d+$/.test(trimmed)) {
                            setNewPhone(trimmed);
                            setNewFirstName('');
                          } else {
                            setNewFirstName(trimmed);
                            setNewPhone('');
                          }
                        }}
                        className="w-full py-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1.5 bg-white border border-blue-200 rounded-lg shadow-sm"
                      >
                        <User className="w-3.5 h-3.5" />
                        Add "{searchTerm}" as new customer
                      </button>
                    </div>
                  )}
                </ul>
              )}
            </div>
          )}

          {(isQuickCreating || conflictCustomer) && (
            <div className="mt-3">
              {conflictCustomer ? (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-center animate-in fade-in zoom-in-95">
                  <p className="text-xs text-red-600 font-medium mb-3">
                    This phone belongs to <strong>{conflictCustomer.first_name} {conflictCustomer.last_name || ''}</strong>. Use their account instead?
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        handleSelect(conflictCustomer);
                        setConflictCustomer(null);
                      }}
                      className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-red-700 transition-colors"
                    >
                      Use Existing
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConflictCustomer(null);
                        setIsQuickCreating(false);
                        setSearchTerm('');
                      }}
                      className="px-4 py-2 bg-white text-red-600 border border-red-200 text-xs font-bold rounded-lg shadow-sm hover:bg-red-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleQuickCreate} className="space-y-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2 relative">
                  <button type="button" onClick={() => setIsQuickCreating(false)} className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                  <h4 className="text-xs font-extrabold text-slate-700">Create New Account</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-1">
                      <label className="text-[10px] font-semibold text-slate-500">First Name <span className="text-red-500">*</span></label>
                      <input type="text" required autoFocus value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 mt-1 transition-all" />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-semibold text-slate-500">Last Name</label>
                      <input type="text" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 mt-1 transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-[10px] font-semibold text-slate-500">Email</label>
                      <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 mt-1 transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-1">
                      <label className="text-[10px] font-semibold text-slate-500">Date of Birth</label>
                      <input type="date" value={newDob} max={new Date().toISOString().split('T')[0]} onChange={(e) => setNewDob(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 mt-1 transition-all" />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-semibold text-slate-500">Gender</label>
                      <select value={newGender} onChange={(e) => setNewGender(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 mt-1 transition-all">
                        <option value="NOT_SPECIFIED">Select ▼</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setIsQuickCreating(false)} className="flex-1 px-3 bg-slate-100 text-slate-700 text-xs font-bold py-2 rounded-lg hover:bg-slate-200 transition-colors shadow-sm">
                      Cancel
                    </button>
                    <button type="submit" disabled={isLoading} className="flex-1 bg-blue-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2">
                      {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Create & Select
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LoyaltyCustomerSearch;
