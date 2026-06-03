import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { Check, X, Store } from 'lucide-react';
import { useStores } from '../../hooks/useStores';
import { useAuthStore } from '../../store/store';

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi',
  'Jammu & Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

/* ---------- Field Error component ---------- */
const FieldError = ({ message }) =>
  message ? (
    <p className="mt-1.5 text-xs font-medium text-red-500 flex items-center gap-1">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
      {message}
    </p>
  ) : null;

/* ---------- Input class helper ---------- */
const inputCls = (hasError) =>
  `w-full px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-4 font-medium text-slate-900 transition-all text-sm placeholder:text-slate-400 ${
    hasError
      ? 'border-red-400 focus:ring-red-500/10 focus:border-red-500'
      : 'border-slate-300 focus:ring-emerald-500/10 focus:border-emerald-500'
  }`;

/* ---------- Component ---------- */
const AddStoreModal = ({ isOpen, onClose }) => {
  const [useExistingGst, setUseExistingGst] = useState(true);
  const { createStoreAsync, isCreatingStore } = useStores();
  const { user } = useAuthStore();
  const adminGstNumber = user?.gst_number || '';
  const isUsingExistingGst = useExistingGst && Boolean(adminGstNumber);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      store_name: '',
      gst_number: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      is_active: true,
    },
  });

  const watchedIsActive = watch('is_active');

  if (!isOpen) return null;

  const handleCancel = () => {
    reset();
    setUseExistingGst(true);
    onClose();
  };

  const onSubmit = async (data) => {
    const payload = {
      store_name: data.store_name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      gst_number: (isUsingExistingGst ? adminGstNumber : data.gst_number) || null,
      is_active: data.is_active,
    };

    try {
      await createStoreAsync(payload);
      reset();
      setUseExistingGst(true);
      onClose();
    } catch {
      // Toast feedback is handled by the store mutation.
    }
  };

  return createPortal(
    /* ── Dark blurred overlay ── */
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[999] p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col border border-slate-100">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 border-b border-slate-100 bg-slate-50/60 flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 flex-shrink-0">
              <Store className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">Add New Store</h2>
              <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                Fill in all required fields to create a store.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-colors flex-shrink-0 ml-2"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable Form Body ── */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="overflow-y-auto flex-1 hide-scrollbar"
        >
          <div className="px-5 sm:px-7 py-5 sm:py-6 space-y-7">

            {/* ── Section 1: Store Information ── */}
            <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-5 h-5 bg-slate-800 text-white rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  1
                </span>
                Store Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                {/* Store Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Store Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('store_name', {
                      required: 'Store name is required',
                      minLength: { value: 2, message: 'At least 2 characters required' },
                      maxLength: { value: 100, message: 'Maximum 100 characters allowed' },
                    })}
                    type="text"
                    placeholder="Enter store name"
                    className={inputCls(!!errors.store_name)}
                  />
                  <FieldError message={errors.store_name?.message} />
                </div>

                {/* Created By — read-only */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Created By
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={user?.full_name || 'Admin User'}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-500 cursor-not-allowed text-sm"
                  />
                </div>

                {/* Creator Email — read-only */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Creator Email
                  </label>
                  <input
                    type="email"
                    readOnly
                    value={user?.email || 'admin@techsentinals.com'}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-500 cursor-not-allowed text-sm"
                  />
                </div>

                {/* GST Number */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-sm font-semibold text-slate-700">
                      GST Number
                    </label>
                    {adminGstNumber && (
                      <button
                        type="button"
                        onClick={() => setUseExistingGst((v) => !v)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 shrink-0"
                      >
                        <span
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isUsingExistingGst
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-white border-slate-300 text-transparent'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                        </span>
                        Use existing
                      </button>
                    )}
                  </div>
                  <input
                    {...(!isUsingExistingGst
                      ? register('gst_number', {
                          pattern: {
                            value: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
                            message: 'Invalid GST number format (e.g. 22AAAAA0000A1Z5)',
                          },
                        })
                      : {})}
                    type="text"
                    readOnly={isUsingExistingGst}
                    value={isUsingExistingGst ? adminGstNumber : undefined}
                    placeholder={isUsingExistingGst ? 'Using admin GST number' : 'e.g. 22AAAAA0000A1Z5'}
                    className={`${inputCls(!!errors.gst_number)} ${
                      isUsingExistingGst ? 'bg-slate-50 border-slate-200 cursor-not-allowed text-slate-500' : ''
                    }`}
                  />
                  <FieldError message={errors.gst_number?.message} />
                </div>
              </div>
            </section>

            <div className="border-t border-slate-100" />

            {/* ── Section 2: Contact Information ── */}
            <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-5 h-5 bg-slate-800 text-white rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  2
                </span>
                Contact Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('phone', {
                      required: 'Phone number is required',
                      minLength: { value: 7, message: 'At least 7 digits required' },
                      maxLength: { value: 15, message: 'Maximum 15 digits allowed' },
                      pattern: {
                        value: /^[0-9+\-\s()]+$/,
                        message: 'Invalid phone number format',
                      },
                    })}
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    className={inputCls(!!errors.phone)}
                  />
                  <FieldError message={errors.phone?.message} />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('email', {
                      required: 'Email address is required',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Enter a valid email address',
                      },
                    })}
                    type="email"
                    placeholder="store@example.com"
                    className={inputCls(!!errors.email)}
                  />
                  <FieldError message={errors.email?.message} />
                </div>
              </div>
            </section>

            <div className="border-t border-slate-100" />

            {/* ── Section 3: Address Information ── */}
            <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-5 h-5 bg-slate-800 text-white rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  3
                </span>
                Address Information
              </h3>

              <div className="space-y-4">
                {/* Address */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Full Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register('address', {
                      required: 'Address is required',
                      minLength: { value: 10, message: 'Please enter a complete address (min 10 characters)' },
                    })}
                    rows={3}
                    placeholder="Enter full address"
                    className={`${inputCls(!!errors.address)} resize-none`}
                  />
                  <FieldError message={errors.address?.message} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-4">
                  {/* City */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('city', {
                        required: 'City is required',
                        minLength: { value: 2, message: 'At least 2 characters required' },
                        pattern: {
                          value: /^[a-zA-Z\s]+$/,
                          message: 'City must contain only letters',
                        },
                      })}
                      type="text"
                      placeholder="Enter city"
                      className={inputCls(!!errors.city)}
                    />
                    <FieldError message={errors.city?.message} />
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      State <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('state', { required: 'Please select a state' })}
                      className={inputCls(!!errors.state)}
                    >
                      <option value="">Select state</option>
                      {indianStates.map((state) => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                    <FieldError message={errors.state?.message} />
                  </div>

                  {/* Pincode */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('pincode', {
                        required: 'Pincode is required',
                        pattern: {
                          value: /^[1-9][0-9]{5}$/,
                          message: 'Enter a valid 6-digit pincode',
                        },
                      })}
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 400001"
                      className={inputCls(!!errors.pincode)}
                    />
                    <FieldError message={errors.pincode?.message} />
                  </div>
                </div>
              </div>
            </section>

            <div className="border-t border-slate-100" />

            {/* ── Section 4: Status ── */}
            <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-5 h-5 bg-slate-800 text-white rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  4
                </span>
                Status
              </h3>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-sm font-semibold text-slate-700">Store Status</span>
                <button
                  type="button"
                  onClick={() => setValue('is_active', !watchedIsActive, { shouldDirty: true })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                    watchedIsActive
                      ? 'bg-emerald-500 focus:ring-emerald-500'
                      : 'bg-slate-300 focus:ring-slate-400'
                  }`}
                  role="switch"
                  aria-checked={watchedIsActive}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      watchedIsActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm font-semibold ${watchedIsActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {watchedIsActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </section>
          </div>

          {/* ── Footer Actions ── */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 px-5 sm:px-7 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0 rounded-b-2xl">
            <button
              type="button"
              onClick={handleCancel}
              className="w-full sm:w-auto px-5 py-2.5 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl font-semibold transition-all text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingStore}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 text-white hover:bg-slate-700 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-md"
            >
              {isCreatingStore ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                'Save Store'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddStoreModal;
