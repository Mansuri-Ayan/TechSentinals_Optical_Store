import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import {
  X, Building2, User, Mail, Phone, MapPin, Save, Plus,
  FileText, CreditCard, Percent, Landmark
} from 'lucide-react';

const EMPTY = {
  name: '', contactPerson: '', email: '', phone: '',
  city: '', state: '', pincode: '',
  alternate_phone: '', gst_number: '', pan_number: '',
  bank_name: '', bank_account_number: '', bank_ifsc: '',
  credit_days: '', notes: '',
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (isOpen) {
      if (supplier) {
        reset({
          name: supplier.name || supplier.company_name || '',
          contactPerson: (supplier.contactPerson || supplier.contact_person) === 'No contact person' ? '' : (supplier.contactPerson || supplier.contact_person || ''),
          email: supplier.email || '',
          phone: supplier.phone || '',
          city: supplier.city || '',
          state: supplier.state || '',
          pincode: supplier.pincode || '',
          alternate_phone: supplier.alternate_phone || '',
          gst_number: supplier.gst_number || '',
          pan_number: supplier.pan_number || '',
          bank_name: supplier.bank_name || '',
          bank_account_number: supplier.bank_account_number || '',
          bank_ifsc: supplier.bank_ifsc || '',
          credit_days: supplier.credit_days !== undefined && supplier.credit_days !== null ? String(supplier.credit_days) : '',
          notes: supplier.notes || '',
        });
      } else {
        reset(EMPTY);
      }
    }
  }, [isOpen, supplier, reset]);

  if (!isOpen) return null;

  const handleCancel = () => {
    reset(EMPTY);
    onClose();
  };

  const onSubmitHandler = (data) => {
    onSubmit({
      name: data.name.trim(),
      contactPerson: data.contactPerson.trim(),
      email: data.email?.trim() || '',
      phone: data.phone?.trim() || '',
      city: data.city?.trim() || '',
      state: data.state || '',
      pincode: data.pincode?.trim() || '',
      alternate_phone: data.alternate_phone?.trim() || '',
      gst_number: data.gst_number?.trim().toUpperCase() || '',
      pan_number: data.pan_number?.trim().toUpperCase() || '',
      bank_name: data.bank_name?.trim() || '',
      bank_account_number: data.bank_account_number?.trim() || '',
      bank_ifsc: data.bank_ifsc?.trim().toUpperCase() || '',
      credit_days: data.credit_days !== '' && data.credit_days !== undefined && data.credit_days !== null ? Number(data.credit_days) : 0,
      notes: data.notes?.trim() || '',
      ...(isEdit ? { id: supplier.id } : {})
    });
  };

  const inputCls = (f) =>
    `w-full px-3 py-2.5 text-sm font-medium rounded-xl border transition-all focus:outline-none focus:ring-4 bg-white ${
      errors[f]
        ? 'border-red-400 focus:ring-red-100 focus:border-red-500'
        : 'border-slate-200 focus:ring-blue-500/10 focus:border-blue-500 placeholder:text-slate-400'
    }`;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-3 sm:p-4 animate-fade-in font-sans">
      <div className="relative bg-white w-full sm:max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] min-h-0 border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isEdit ? 'bg-amber-50 border border-amber-100' : 'bg-blue-50 border border-blue-100'}`}>
              {isEdit ? <Save className="w-4 h-4 text-amber-600" /> : <Plus className="w-4 h-4 text-blue-600" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{isEdit ? 'Edit Supplier' : 'Add New Supplier'}</h2>
              <p className="text-xs text-slate-500">{isEdit ? `Editing: ${supplier?.name || supplier?.company_name}` : 'Fill in the details below'}</p>
            </div>
          </div>
          <button onClick={handleCancel} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmitHandler)} className="overflow-y-auto flex-1 min-h-0">
          <div className="px-5 sm:px-6 py-5 space-y-5">

            {/* Section: Supplier Info */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" /> Supplier Information
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Supplier Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('name', { required: 'Supplier name is required' })}
                    type="text"
                    placeholder="e.g. Vision Supply Co."
                    className={inputCls('name')}
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Contact Person Name
                  </label>
                  <input
                    {...register('contactPerson')}
                    type="text"
                    placeholder="e.g. Rahul Mehta"
                    className={inputCls('contactPerson')}
                  />
                  {errors.contactPerson && <p className="text-xs text-red-500 mt-1">{errors.contactPerson.message}</p>}
                </div>
              </div>
            </div>

            {/* Section: Contact */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" /> Contact Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Email Address
                  </label>
                  <input
                    {...register('email', {
                      validate: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Enter a valid email address'
                    })}
                    type="email"
                    placeholder="example@company.com"
                    className={inputCls('email')}
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Phone Number
                  </label>
                  <input
                    {...register('phone', {
                      validate: (v) => !v || /^\d{10}$/.test(v) || 'Phone number must be exactly 10 digits'
                    })}
                    type="text"
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    className={inputCls('phone')}
                  />
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Alternate Phone
                  </label>
                  <input
                    {...register('alternate_phone', {
                      validate: (v) => !v || /^\d{10}$/.test(v) || 'Alternate phone must be exactly 10 digits'
                    })}
                    type="text"
                    placeholder="e.g. 9876543211"
                    maxLength={10}
                    className={inputCls('alternate_phone')}
                  />
                  {errors.alternate_phone && <p className="text-xs text-red-500 mt-1">{errors.alternate_phone.message}</p>}
                </div>
              </div>
            </div>

            {/* Section: Address */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" /> Address
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    City
                  </label>
                  <input
                    {...register('city')}
                    type="text"
                    placeholder="e.g. Mumbai"
                    className={inputCls('city')}
                  />
                  {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    State
                  </label>
                  <select
                    {...register('state')}
                    className={inputCls('state')}
                  >
                    <option value="">Select state…</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Pincode
                  </label>
                  <input
                    {...register('pincode', {
                      validate: (v) => !v || /^\d{6}$/.test(v) || 'Enter a valid 6-digit pincode'
                    })}
                    type="text"
                    placeholder="e.g. 400001"
                    className={inputCls('pincode')}
                  />
                  {errors.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode.message}</p>}
                </div>
              </div>
            </div>

            {/* Section: Tax & Credit */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Percent className="w-3.5 h-3.5" /> Tax & Credit Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    GSTIN
                  </label>
                  <input
                    {...register('gst_number', {
                      validate: (v) => !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(v) || 'Enter a valid GSTIN format (e.g. 27AAAAA1111A1Z1)'
                    })}
                    type="text"
                    placeholder="e.g. 27AAAAA1111A1Z1"
                    className={inputCls('gst_number')}
                  />
                  {errors.gst_number && <p className="text-xs text-red-500 mt-1">{errors.gst_number.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    PAN
                  </label>
                  <input
                    {...register('pan_number', {
                      validate: (v) => !v || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(v) || 'Enter a valid PAN format (e.g. ABCDE1234F)'
                    })}
                    type="text"
                    placeholder="e.g. ABCDE1234F"
                    className={inputCls('pan_number')}
                  />
                  {errors.pan_number && <p className="text-xs text-red-500 mt-1">{errors.pan_number.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    Credit Days
                  </label>
                  <input
                    {...register('credit_days', {
                      validate: (v) => !v || Number(v) >= 0 || 'Credit days must be non-negative'
                    })}
                    type="number"
                    placeholder="e.g. 30"
                    className={inputCls('credit_days')}
                  />
                  {errors.credit_days && <p className="text-xs text-red-500 mt-1">{errors.credit_days.message}</p>}
                </div>
              </div>
            </div>

            {/* Section: Bank details */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Landmark className="w-3.5 h-3.5" /> Bank Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-slate-400" />
                    Bank Name
                  </label>
                  <input
                    {...register('bank_name')}
                    type="text"
                    placeholder="e.g. HDFC Bank"
                    className={inputCls('bank_name')}
                  />
                  {errors.bank_name && <p className="text-xs text-red-500 mt-1">{errors.bank_name.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    Account Number
                  </label>
                  <input
                    {...register('bank_account_number')}
                    type="text"
                    placeholder="e.g. 501001234567"
                    className={inputCls('bank_account_number')}
                  />
                  {errors.bank_account_number && <p className="text-xs text-red-500 mt-1">{errors.bank_account_number.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    IFSC Code
                  </label>
                  <input
                    {...register('bank_ifsc', {
                      validate: (v) => !v || /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(v) || 'Enter a valid IFSC code (e.g. HDFC0000123)'
                    })}
                    type="text"
                    placeholder="e.g. HDFC0000123"
                    className={inputCls('bank_ifsc')}
                  />
                  {errors.bank_ifsc && <p className="text-xs text-red-500 mt-1">{errors.bank_ifsc.message}</p>}
                </div>
              </div>
            </div>

            {/* Section: Notes */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Additional Notes
              </p>
              <div>
                <textarea
                  {...register('notes')}
                  rows={2}
                  placeholder="Payment terms, delivery schedules, or miscellaneous notes..."
                  className="w-full px-3 py-2.5 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-white resize-none placeholder:text-slate-400"
                />
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 flex-shrink-0 bg-slate-50">
            <button type="button" onClick={handleCancel}
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
    </div>,
    document.body
  );
};

export default AddEditSupplierModal;
