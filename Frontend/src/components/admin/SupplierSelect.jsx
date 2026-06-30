import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, User, Mail, Phone, MapPin, Building, ShieldCheck, FileText } from 'lucide-react';
import { useSuppliers } from '../../hooks/useSuppliers';

const SupplierSelect = ({ selectedSupplierId, onChange, error, disabled }) => {
  const { suppliers, isLoadingSuppliers } = useSuppliers('admin', { limit: 200 });
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedSupplier = suppliers.find(
    (sup) => String(sup.id) === String(selectedSupplierId)
  );

  const filteredSuppliers = suppliers.filter((sup) => {
    const term = searchTerm.toLowerCase();
    return (
      (sup.company_name || '').toLowerCase().includes(term) ||
      (sup.contact_person || '').toLowerCase().includes(term) ||
      (sup.phone || '').includes(term) ||
      (sup.email || '').toLowerCase().includes(term)
    );
  });

  const handleSelect = (supplier) => {
    onChange(supplier);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="space-y-4" ref={dropdownRef}>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
        <Building className="w-4 h-4 text-slate-400" />
        Select Supplier <span className="text-red-500">*</span>
      </label>

      {/* Select Box */}
      <div className="relative">
        <button
          type="button"
          disabled={disabled || isLoadingSuppliers}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-4 py-2.5 bg-white border rounded-xl flex items-center justify-between text-left focus:outline-none focus:ring-4 transition-all text-sm font-medium ${
            error
              ? 'border-red-400 focus:ring-red-500/10 focus:border-red-500'
              : 'border-slate-300 focus:ring-emerald-500/10 focus:border-emerald-500'
          } ${disabled ? 'opacity-55 cursor-not-allowed bg-slate-50' : 'cursor-pointer'}`}
        >
          <span className={selectedSupplier ? 'text-slate-900' : 'text-slate-400'}>
            {isLoadingSuppliers
              ? 'Loading suppliers...'
              : selectedSupplier
              ? selectedSupplier.company_name
              : 'Choose a supplier...'}
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-[99] overflow-hidden divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
            {/* Search Input */}
            <div className="p-2 bg-slate-50 relative">
              <input
                type="text"
                autoFocus
                placeholder="Search by name, contact, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-250 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>

            {/* List */}
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
              {filteredSuppliers.length === 0 ? (
                <div className="px-4 py-3 text-xs text-slate-400 text-center font-medium">
                  No suppliers found
                </div>
              ) : (
                filteredSuppliers.map((sup) => (
                  <button
                    key={sup.id}
                    type="button"
                    onClick={() => handleSelect(sup)}
                    className={`w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between text-xs transition-colors ${
                      String(sup.id) === String(selectedSupplierId) ? 'bg-slate-50 font-bold' : 'font-medium'
                    }`}
                  >
                    <div>
                      <p className="text-slate-800 font-bold text-sm">{sup.company_name}</p>
                      {sup.contact_person && (
                        <p className="text-slate-550 font-semibold mt-0.5">Contact: {sup.contact_person}</p>
                      )}
                    </div>
                    {sup.city && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-bold">
                        {sup.city}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-xs font-medium text-red-500 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
          {error}
        </p>
      )}

      {/* Selected Supplier Details Card */}
      {selectedSupplier && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm space-y-3 animate-fade-in font-sans">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
            <h4 className="text-xs font-bold text-slate-705 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              Supplier Details
            </h4>
            {selectedSupplier.status && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase border ${
                selectedSupplier.status === 'ACTIVE'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : selectedSupplier.status === 'BLACKLISTED'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}>
                {selectedSupplier.status}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {selectedSupplier.contact_person && (
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Contact Person</p>
                  <p className="font-bold text-slate-800">{selectedSupplier.contact_person}</p>
                </div>
              </div>
            )}

            {selectedSupplier.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Phone</p>
                  <p className="font-bold text-slate-800">{selectedSupplier.phone}</p>
                </div>
              </div>
            )}

            {selectedSupplier.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Email Address</p>
                  <p className="font-bold text-slate-800 break-all">{selectedSupplier.email}</p>
                </div>
              </div>
            )}

            {selectedSupplier.gst_number && (
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">GST Number</p>
                  <p className="font-bold text-slate-800 font-mono">{selectedSupplier.gst_number}</p>
                </div>
              </div>
            )}

            {(selectedSupplier.address || selectedSupplier.city) && (
              <div className="flex items-start gap-2 sm:col-span-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Address</p>
                  <p className="font-bold text-slate-800">
                    {[selectedSupplier.address, selectedSupplier.city, selectedSupplier.state, selectedSupplier.pincode]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              </div>
            )}

            {selectedSupplier.notes && (
              <div className="flex items-start gap-2 sm:col-span-2 pt-1 border-t border-dashed border-slate-200">
                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Internal Notes</p>
                  <p className="font-medium text-slate-600 italic">{selectedSupplier.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierSelect;
