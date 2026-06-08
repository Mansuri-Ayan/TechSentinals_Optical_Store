import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, User, Mail, Phone, MapPin, Plus, Calendar, ShoppingBag } from 'lucide-react';
import { GENDERS } from '../../data/customersData';
import { useCartStore } from '../../store/cartStore';
import CustomerProductList from './CustomerProductList';
import PaymentSection from './PaymentSection';

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

const Field = ({ label, field, icon: Icon, placeholder, type = 'text', required, form, errors, set, inputCls, children }) => (
  <div>
    <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
      {label} {required && <span className="text-red-500">*</span>}
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

const AddCustomerModal = ({ isOpen, onClose, onSubmit }) => {
  const navigate = useNavigate();
  const { tempCustomerForm, startSelection, cart, clearCustomerForm } = useCartStore();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [payment, setPayment] = useState({
    method: 'Cash',
    receivedAmount: 0,
    remainingAmount: 0,
    upiId: '',
    status: 'Paid',
  });

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.product.selling_price * item.quantity,
    0
  );

  // Sync Form and Payment details when modal opens
  useEffect(() => {
    if (isOpen) {
      if (tempCustomerForm) {
        setForm(tempCustomerForm);
      } else {
        setForm(EMPTY);
      }
      setErrors({});
    }
  }, [isOpen, tempCustomerForm]);

  // Sync payment amounts when cart/total amount changes
  useEffect(() => {
    if (isOpen) {
      setPayment((p) => {
        if (p.method === 'Cash') {
          return {
            ...p,
            totalAmount,
            receivedAmount: totalAmount,
            remainingAmount: 0,
            status: 'Paid',
          };
        } else {
          return {
            ...p,
            totalAmount,
            status: 'Paid',
          };
        }
      });
    }
  }, [isOpen, totalAmount]);

  if (!isOpen) return null;

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

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

  const handleSelectProducts = () => {
    startSelection(form);
    onClose();
    navigate('/shopkeeper/products');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (cart.length > 0) {
      if (payment.method === 'UPI' && !payment.upiId.trim()) {
        alert('Please enter UPI Transaction ID');
        return;
      }
      if (payment.method === 'Cash' && payment.receivedAmount === '') {
        alert('Please enter Cash Received amount');
        return;
      }
    }

    onSubmit(form, cart, payment);
    clearCustomerForm();
  };

  const handleClose = () => {
    clearCustomerForm();
    onClose();
  };

  const inputCls = (f) =>
    `w-full px-3 py-2.5 text-sm font-medium rounded-xl border transition-all focus:outline-none focus:ring-4 bg-white ${
      errors[f]
        ? 'border-red-400 focus:ring-red-100 focus:border-red-500'
        : 'border-slate-200 focus:ring-blue-500/10 focus:border-blue-500 placeholder:text-slate-400'
    }`;

  const fieldProps = { form, errors, set, inputCls };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-3 sm:p-4 animate-fade-in font-sans">
      <div className="relative bg-white w-full sm:max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] min-h-0 border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-50 border border-blue-100">
              <Plus className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add New Customer</h2>
              <p className="text-xs text-slate-500">Fill in details and select order products</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 min-h-0">
          <div className="px-5 sm:px-6 py-5 space-y-5">

            {/* Section: Customer Information */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <User className="w-3.5 h-3.5" /> Customer Information
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field field="firstName" label="First Name" icon={User} placeholder="e.g. Rajesh" required {...fieldProps} />
                  <Field field="lastName" label="Last Name" icon={User} placeholder="e.g. Kumar" required {...fieldProps} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field field="email" label="Email Address" icon={Mail} placeholder="example@gmail.com" type="email" {...fieldProps} />
                  <Field field="phone" label="Phone Number" icon={Phone} placeholder="+91 98765 43210" required {...fieldProps} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field field="dateOfBirth" label="Date of Birth" icon={Calendar} {...fieldProps}>
                    <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} className={inputCls('dateOfBirth')} />
                  </Field>
                  <Field field="gender" label="Gender" icon={User} {...fieldProps}>
                    <select value={form.gender} onChange={e => set('gender', e.target.value)} className={inputCls('gender')}>
                      <option value="">Select gender…</option>
                      {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </Field>
                </div>
                <Field field="address" label="Address" icon={MapPin} placeholder="e.g. 12, MG Road, Andheri West" {...fieldProps} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field field="city" label="City" icon={MapPin} placeholder="e.g. Mumbai" {...fieldProps} />
                  <Field field="state" label="State" icon={MapPin} {...fieldProps}>
                    <select value={form.state} onChange={e => set('state', e.target.value)} className={inputCls('state')}>
                      <option value="">Select state…</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field field="pincode" label="Pincode" icon={MapPin} placeholder="e.g. 400001" {...fieldProps} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> Remark
                  </label>
                  <textarea
                    value={form.remark}
                    onChange={e => set('remark', e.target.value)}
                    placeholder="Any notes about this customer…"
                    rows={2}
                    className={inputCls('remark')}
                  />
                </div>
              </div>
            </div>

            {/* Select Products Button Trigger */}
            <div className="border-t border-slate-100 pt-4 flex flex-col items-center">
              <button
                type="button"
                onClick={handleSelectProducts}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                Select Products
              </button>
            </div>

            {/* Selected Products Table List */}
            {cart.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <CustomerProductList />
              </div>
            )}

            {/* Payment Section */}
            {cart.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <PaymentSection
                  totalAmount={totalAmount}
                  payment={payment}
                  onChange={setPayment}
                />
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 flex-shrink-0 bg-slate-50">
            <button type="button" onClick={handleClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2 bg-[#0A0F1F] hover:bg-slate-800">
              <Plus className="w-4 h-4" />
              Save Customer
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddCustomerModal;
