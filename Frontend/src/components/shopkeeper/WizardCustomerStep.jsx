import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, ArrowLeft, ArrowRight } from 'lucide-react';
import { GENDERS } from '../../data/customersData';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry',
];

const EMPTY = {
  firstName: '', lastName: '', email: '', phone: '',
  dateOfBirth: '', gender: '', address: '', city: '',
  state: '', pincode: '', remark: '',
};

const WizardCustomerStep = ({ customer, onChange, onBack, onNext }) => {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  // Sync local state from customer prop
  useEffect(() => {
    if (customer) {
      setForm(customer);
    } else {
      setForm(EMPTY);
    }
    setErrors({});
  }, [customer]);

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: '' }));
  };

  const inputCls = (f) =>
    `w-full px-3 py-2.5 text-sm font-medium rounded-xl border transition-all focus:outline-none focus:ring-4 bg-white ${
      errors[f]
        ? 'border-red-400 focus:ring-red-100 focus:border-red-500'
        : 'border-slate-200 focus:ring-blue-500/10 focus:border-blue-500 placeholder:text-slate-400'
    }`;

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    else if (!/^[+]?[\d\s\-()]{8,15}$/.test(form.phone)) e.phone = 'Enter a valid phone number';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) e.pincode = 'Enter a valid 6-digit pincode';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleBack = () => {
    onChange(form);
    onBack();
  };

  const handleNext = () => {
    if (!validate()) return;
    onChange(form);
    onNext();
  };

  return (
    <div className="animate-fade-in font-sans">
      {/* Section Header */}
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <User className="w-3.5 h-3.5" /> Customer Information
      </p>

      {/* Form Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
        <div className="space-y-4">
          {/* First Name / Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                placeholder="e.g. Rajesh"
                className={inputCls('firstName')}
              />
              {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                placeholder="e.g. Kumar"
                className={inputCls('lastName')}
              />
              {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
            </div>
          </div>

          {/* Email / Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="example@gmail.com"
                className={inputCls('email')}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+91 98765 43210"
                className={inputCls('phone')}
              />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>
          </div>

          {/* Date of Birth / Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Date of Birth
              </label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => set('dateOfBirth', e.target.value)}
                className={inputCls('dateOfBirth')}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Gender
              </label>
              <select
                value={form.gender}
                onChange={(e) => set('gender', e.target.value)}
                className={inputCls('gender')}
              >
                <option value="">Select gender…</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Address
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="e.g. 12, MG Road, Andheri West"
              className={inputCls('address')}
            />
          </div>

          {/* City / State / Pincode */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                City
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="e.g. Mumbai"
                className={inputCls('city')}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                State
              </label>
              <select
                value={form.state}
                onChange={(e) => set('state', e.target.value)}
                className={inputCls('state')}
              >
                <option value="">Select state…</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Pincode
              </label>
              <input
                type="text"
                value={form.pincode}
                onChange={(e) => set('pincode', e.target.value)}
                placeholder="e.g. 400001"
                className={inputCls('pincode')}
              />
              {errors.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode}</p>}
            </div>
          </div>

          {/* Remark */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Remark
            </label>
            <textarea
              value={form.remark}
              onChange={(e) => set('remark', e.target.value)}
              placeholder="Any notes about this customer…"
              rows={2}
              className={inputCls('remark')}
            />
          </div>
        </div>

        {/* Footer: Back / Next */}
        <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-100">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0A0F1F] hover:bg-slate-800 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WizardCustomerStep;
