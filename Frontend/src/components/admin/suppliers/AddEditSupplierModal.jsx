import { useState, useEffect } from 'react';
import { X, Building2, User, Mail, Phone, MapPin, Save, Plus } from 'lucide-react';

const EMPTY = {
  name: '', contactPerson: '', email: '', phone: '',
  city: '', state: '', pincode: '',
};

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry',
];

const AddEditSupplierModal = ({ isOpen, supplier, onClose, onSubmit }) => {
  const isEdit = Boolean(supplier?.id);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setForm(supplier
        ? { name: supplier.name, contactPerson: supplier.contactPerson, email: supplier.email, phone: supplier.phone, city: supplier.city, state: supplier.state, pincode: supplier.pincode }
        : EMPTY
      );
      setErrors({});
    }
  }, [isOpen, supplier]);

  if (!isOpen) return null;

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())          e.name          = 'Supplier name is required';
    if (!form.contactPerson.trim()) e.contactPerson = 'Contact person name is required';
    if (!form.email.trim())         e.email         = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.phone.trim())         e.phone         = 'Phone number is required';
    else if (!/^[+]?[\d\s\-()]{8,15}$/.test(form.phone))     e.phone = 'Enter a valid phone number';
    if (!form.city.trim())          e.city          = 'City is required';
    if (!form.state)                e.state         = 'State is required';
    if (!form.pincode.trim())       e.pincode       = 'Pincode is required';
    else if (!/^\d{6}$/.test(form.pincode))                   e.pincode = 'Enter a valid 6-digit pincode';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ ...form, ...(isEdit ? { id: supplier.id } : {}) });
  };

  const inputCls = (f) =>
    `w-full px-3 py-2.5 text-sm font-medium rounded-xl border transition-all focus:outline-none focus:ring-4 bg-white ${
      errors[f]
        ? 'border-red-400 focus:ring-red-100 focus:border-red-500'
        : 'border-slate-200 focus:ring-blue-500/10 focus:border-blue-500 placeholder:text-slate-400'
    }`;

  const Field = ({ label, field, icon: Icon, placeholder, type = 'text', children }) => (
    <div>
      <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
        {label} <span className="text-red-500">*</span>
      </label>
      {children || (
        <input
          type={type}
          value={form[field]}
          onChange={e => set(field, e.target.value)}
          placeholder={placeholder}
          className={inputCls(field)}
        />
      )}
      {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[95dvh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isEdit ? 'bg-amber-50 border border-amber-100' : 'bg-blue-50 border border-blue-100'}`}>
              {isEdit ? <Save className="w-4 h-4 text-amber-600" /> : <Plus className="w-4 h-4 text-blue-600" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{isEdit ? 'Edit Supplier' : 'Add New Supplier'}</h2>
              <p className="text-xs text-slate-500">{isEdit ? `Editing: ${supplier.name}` : 'Fill in the details below'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-5 sm:px-6 py-5 space-y-4">

            {/* Section: Supplier Info */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" /> Supplier Information
              </p>
              <div className="space-y-4">
                <Field field="name" label="Supplier Name" icon={Building2} placeholder="e.g. Vision Supply Co." />
                <Field field="contactPerson" label="Contact Person Name" icon={User} placeholder="e.g. Rahul Mehta" />
              </div>
            </div>

            {/* Section: Contact */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" /> Contact Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field field="email" label="Email Address" icon={Mail} placeholder="example@company.com" type="email" />
                <Field field="phone" label="Phone Number" icon={Phone} placeholder="+91 98765 43210" />
              </div>
            </div>

            {/* Section: Address */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" /> Address
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field field="city" label="City" icon={MapPin} placeholder="e.g. Mumbai" />
                <Field field="state" label="State" icon={MapPin}>
                  <select value={form.state} onChange={e => set('state', e.target.value)} className={inputCls('state')}>
                    <option value="">Select state…</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field field="pincode" label="Pincode" icon={MapPin} placeholder="e.g. 400001" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 flex-shrink-0 bg-slate-50">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className={`px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2 ${isEdit ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#0A0F1F] hover:bg-slate-800'}`}>
              {isEdit ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isEdit ? 'Save Changes' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditSupplierModal;
