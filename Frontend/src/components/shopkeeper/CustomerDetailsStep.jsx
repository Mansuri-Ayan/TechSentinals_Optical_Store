import { useState } from 'react';
import { Search, User, Mail, Phone, MapPin, Calendar, ArrowLeft, ArrowRight, UserCheck, Edit3, UserPlus, ShoppingBag, Eye } from 'lucide-react';
import { getCustomersApi, getCustomerApi } from '../../api/customer/customer.api';
import { useAuthStore, useStoreStore } from '../../store/store';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry',
];

const GENDERS = ['Male', 'Female', 'Other'];

const CustomerDetailsStep = ({ formState, onSaveState, onBack, onNext }) => {
  const { user } = useAuthStore();
  const { selectedStore } = useStoreStore();
  const storeId = user?.role === 'admin' ? selectedStore?.id : user?.store_id;

  const [form, setForm] = useState(formState);
  const [errors, setErrors] = useState({});
  const [isLocked, setIsLocked] = useState(formState.id ? true : false);

  // Search variables
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);

  const set = (field, val) => {
    setForm((p) => ({ ...p, [field]: val }));
    setErrors((p) => ({ ...p, [field]: '' }));
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const data = await getCustomersApi({ search: q, store_id: storeId });
      const matches = (data || []).map((c) => ({
        id: c.id,
        firstName: c.first_name,
        lastName: c.last_name || '',
        email: c.email || '',
        phone: c.phone,
        dateOfBirth: c.date_of_birth || '',
        gender: c.gender || '',
        address: c.address || '',
        city: c.city || '',
        state: c.state || '',
        pincode: c.pincode || '',
        remark: c.remark || '',
      }));
      setSearchResults(matches);
    } catch (err) {
      console.error('Failed to search customers:', err);
      setSearchResults([]);
    }
  };

  const handleSelectResult = async (c) => {
    try {
      const fullCust = await getCustomerApi(c.id);
      const mapped = {
        id: fullCust.id,
        firstName: fullCust.first_name,
        lastName: fullCust.last_name || '',
        email: fullCust.email || '',
        phone: fullCust.phone,
        dateOfBirth: fullCust.date_of_birth || '',
        gender: fullCust.gender || '',
        address: fullCust.address || '',
        city: fullCust.city || '',
        state: fullCust.state || '',
        pincode: fullCust.pincode || '',
        remark: fullCust.remark || '',
        prescription: fullCust.prescription || null,
        prescriptionHistory: fullCust.prescription_history || [],
        orders: fullCust.orders || [],
      };
      setSelectedResult(mapped);
      setSearchResults([]);
    } catch (err) {
      console.error('Failed to fetch customer detail:', err);
    }
  };

  const handleUseCustomer = (mode) => {
    if (!selectedResult) return;

    const populatedForm = {
      id: selectedResult.id,
      firstName: selectedResult.firstName,
      lastName: selectedResult.lastName,
      email: selectedResult.email || '',
      phone: selectedResult.phone,
      dateOfBirth: selectedResult.dateOfBirth || '',
      gender: selectedResult.gender || '',
      address: selectedResult.address || '',
      city: selectedResult.city || '',
      state: selectedResult.state || '',
      pincode: selectedResult.pincode || '',
      remark: selectedResult.remark || '',
      prescription: selectedResult.prescription || null,
      prescriptionHistory: selectedResult.prescriptionHistory || [],
    };

    setForm(populatedForm);
    setErrors({});
    setSearchQuery('');
    setSelectedResult(null);

    if (mode === 'lock') {
      setIsLocked(true);
    } else {
      setIsLocked(false);
    }
  };

  const handleCreateNewCustomer = () => {
    setForm({
      id: null,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      gender: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      remark: '',
      prescription: null,
      prescriptionHistory: [],
    });
    setErrors({});
    setIsLocked(false);
    setSelectedResult(null);
    setSearchQuery('');
  };

  const validate = () => {
    const e = {};
    if (!form.firstName?.trim()) e.firstName = 'First name is required';
    if (!form.lastName?.trim()) e.lastName = 'Last name is required';
    if (!form.phone?.trim()) e.phone = 'Mobile number is required';
    else if (!/^[+]?[\d\s\-()]{8,15}$/.test(form.phone)) e.phone = 'Enter a valid mobile number';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) e.pincode = 'Enter a valid 6-digit pincode';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = () => {
    if (!validate()) return;
    onSaveState(form);
    onNext(form);
  };

  const inputCls = (f) =>
    `w-full px-3 py-2.5 text-xs font-semibold rounded-xl border transition-all focus:outline-none focus:ring-4 bg-white ${isLocked ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed' :
      errors[f]
        ? 'border-red-400 focus:ring-red-100 focus:border-red-500'
        : 'border-slate-200 focus:ring-blue-500/10 focus:border-blue-500 placeholder:text-slate-400'
    }`;

  const renderField = (label, field, icon, placeholder, type = 'text', required = false) => {
    const Icon = icon;
    return (
      <div>
        <label className="text-[10px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
          type={type}
          disabled={isLocked}
          value={form[field] || ''}
          onChange={(e) => set(field, e.target.value)}
          placeholder={placeholder}
          className={inputCls(field)}
        />
        {errors[field] && <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors[field]}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      {/* ── Search Existing Section ── */}
      <div className="bg-slate-50 border border-slate-150 p-4 sm:p-5 rounded-2xl relative">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
          Search Existing Customer Database
        </label>
        <div className="relative group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by Mobile Number or Customer Name..."
            className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-slate-400 shadow-sm"
          />
          <Search className="w-4 h-4 text-slate-450 absolute left-3.5 top-3.5" />
        </div>

        {/* Dropdown search results */}
        {searchResults.length > 0 && (
          <div className="absolute left-4 right-4 mt-2 bg-white border border-slate-150 rounded-xl shadow-xl z-55 max-h-56 overflow-y-auto divide-y divide-slate-100 p-1">
            {searchResults.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelectResult(c)}
                className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs cursor-pointer rounded-lg"
                type="button"
              >
                <div>
                  <p className="font-bold text-slate-800">{c.firstName} {c.lastName}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{c.phone}</p>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-500 font-mono px-2 py-0.5 rounded">
                  CUST-{String(c.id).slice(-4)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Expanded Selected Profile Summary */}
        {selectedResult && (
          <div className="mt-4 p-4 bg-white border border-slate-200 rounded-xl shadow-inner space-y-4 animate-fade-in text-xs font-medium">
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">{selectedResult.firstName} {selectedResult.lastName}</h4>
                <p className="text-slate-550 mt-0.5">{selectedResult.phone} &middot; {selectedResult.email || 'No email'}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUseCustomer('lock')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] transition-colors"
                  type="button"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Use Customer
                </button>
                <button
                  onClick={() => handleUseCustomer('edit')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-white rounded-lg font-bold text-[10px] transition-colors"
                  type="button"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Details
                </button>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="px-2.5 py-1.5 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-lg font-bold text-[10px]"
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Profile Diffs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-[11px]">
              <div>
                <p className="text-slate-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Optical Specs
                </p>
                {selectedResult.prescription ? (
                  <p className="text-slate-700 font-semibold bg-slate-50 p-2 rounded-lg border border-slate-100">
                    Lens Type: <span className="font-extrabold text-slate-800">{selectedResult.prescription.lensType || '—'}</span> &middot;
                    Dr. {selectedResult.prescription.doctorName || 'Anil Sharma'} ({selectedResult.prescription.prescriptionDate && !isNaN(new Date(selectedResult.prescription.prescriptionDate).getTime()) ? new Date(selectedResult.prescription.prescriptionDate).toLocaleDateString('en-IN') : '—'})
                  </p>
                ) : (
                  <p className="text-slate-450 italic">No prescription logged</p>
                )}
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <ShoppingBag className="w-3.5 h-3.5" /> Previous Orders
                </p>
                {selectedResult.orders && selectedResult.orders.length > 0 ? (
                  <p className="text-slate-700 font-semibold bg-slate-50 p-2 rounded-lg border border-slate-100">
                    Last Order: <span className="font-bold text-slate-800">{selectedResult.orders[0].id}</span> &middot;
                    ₹{selectedResult.orders[0].amount.toLocaleString('en-IN')} ({selectedResult.orders[0].status})
                  </p>
                ) : (
                  <p className="text-slate-450 italic">No previous orders</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Customer Form ── */}
      <div className="bg-white border border-slate-150 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-extrabold text-slate-850 uppercase tracking-wider">
              {form.id ? (isLocked ? 'Loaded Customer Profile' : 'Edit Customer Profile') : 'New Customer Registration'}
            </h3>
          </div>
          {form.id && (
            <button
              onClick={handleCreateNewCustomer}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[10px] transition-all"
              type="button"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Create New Customer instead
            </button>
          )}
        </div>

        {/* Lock indicator banner */}
        {isLocked && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold rounded-xl flex justify-between items-center">
            <span>Customer fields are locked using existing database records.</span>
            <button
              onClick={() => setIsLocked(false)}
              className="text-blue-700 hover:text-blue-900 font-extrabold underline cursor-pointer"
              type="button"
            >
              Unlock and Edit Details
            </button>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {renderField('First Name', 'firstName', User, 'e.g. Rajesh', 'text', true)}
            {renderField('Last Name', 'lastName', User, 'e.g. Kumar', 'text', true)}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {renderField('Mobile Number', 'phone', Phone, 'e.g. +91 98765 43210', 'text', true)}
            {renderField('Email Address', 'email', Mail, 'example@gmail.com', 'email')}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date of Birth
              </label>
              <input
                type="date"
                disabled={isLocked}
                value={form.dateOfBirth || ''}
                onChange={(e) => set('dateOfBirth', e.target.value)}
                className={inputCls('dateOfBirth')}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" /> Gender
              </label>
              <select
                value={form.gender || ''}
                disabled={isLocked}
                onChange={(e) => set('gender', e.target.value)}
                className={inputCls('gender')}
              >
                <option value="">Select gender…</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {renderField('Address', 'address', MapPin, 'e.g. 12, MG Road, Andheri West')}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {renderField('City', 'city', MapPin, 'e.g. Mumbai')}
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> State
              </label>
              <select
                value={form.state || ''}
                disabled={isLocked}
                onChange={(e) => set('state', e.target.value)}
                className={inputCls('state')}
              >
                <option value="">Select state…</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {renderField('Pincode', 'pincode', MapPin, 'e.g. 400001')}
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> Remarks
            </label>
            <textarea
              disabled={isLocked}
              value={form.remark || ''}
              onChange={(e) => set('remark', e.target.value)}
              placeholder="Add any specific comments about customer preferences..."
              rows={2}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-white placeholder:text-slate-450 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel Checkout
        </button>

        <button
          onClick={handleContinue}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#0A0F1F] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md hover:shadow-lg"
          type="button"
        >
          Continue to Prescription
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default CustomerDetailsStep;
