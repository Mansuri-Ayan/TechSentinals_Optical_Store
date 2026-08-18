import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { X, UserPlus, Camera, Eye, EyeOff, Plus } from 'lucide-react';

/* ---------- Constants ---------- */
const roleOptions = [
  { value: 'manager', label: 'Manager' },
  { value: 'worker', label: 'Worker' },
  { value: 'optician', label: 'Optician' },
];

/* ---------- Default values ---------- */
const getDefaultValues = (initialData, storeId) => {
  if (!initialData) {
    return {
      firstName: '',
      lastName: '',
      role: 'manager',
      joiningDate: '',
      qualification: '',
      phone: '',
      email: '',
      isActive: true,
      password: '',
      confirmPassword: '',
      store_id: storeId === 'admin' ? '' : storeId,
      pfNumber: '',
    };
  }
  return {
    firstName: initialData.first_name || '',
    lastName: initialData.last_name || '',
    role: initialData.role || 'manager',
    phone: initialData.phone || '',
    joiningDate: initialData.joining_date || '',
    qualification: initialData.qualification || '',
    email: initialData.email || '',
    isActive: Boolean(initialData.is_active),
    password: '',
    confirmPassword: '',
    store_id: initialData.store_id || '',
    pfNumber: initialData.pf_number || '',
  };
};

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
const AddStaffModal = ({ isOpen, onClose, onSubmitStaff, initialData, isSaving = false, storeId, stores = [] }) => {
  const isEditing = Boolean(initialData);
  const [imagePreview, setImagePreview] = useState(initialData?.profile_image || null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const imageInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    setError,
    formState: { errors },
  } = useForm({ defaultValues: getDefaultValues(initialData, storeId) });

  const watchedRole = watch('role');
  const watchedIsActive = watch('isActive');
  const watchedPassword = watch('password');

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const resetAndClose = () => {
    reset();
    setImagePreview(initialData?.profile_image || null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  const onSubmit = async (data) => {
    const basePayload = {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      is_active: data.isActive,
      store_id: Number(data.store_id || storeId),
      pf_number: data.pfNumber || null,
    };

    const createPayload = {
      ...basePayload,
      password: data.password,
      joining_date: data.joiningDate,
      ...(data.role === 'optician' ? { qualification: data.qualification || null } : {}),
    };

    const updatePayload = {
      ...basePayload,
      profile_image: imagePreview || null,
      ...(data.role === 'optician' ? { qualification: data.qualification || null } : {}),
    };

    try {
      await onSubmitStaff({
        role: data.role,
        payload: isEditing ? updatePayload : createPayload,
        staff: initialData,
        setError,
      });
      resetAndClose();
    } catch {
      // Toast handled by the caller
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[999] p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col border border-slate-100">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 border-b border-slate-100 bg-slate-50/60 flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 flex-shrink-0">
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                {isEditing ? 'Edit Staff Member' : 'Add New Staff'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                {isEditing
                  ? 'Update the staff member details below.'
                  : 'Fill in all required fields to create a staff member.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
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

            {/* ── Section 1: Personal Information ── */}
            <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-5 h-5 bg-slate-800 text-white rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  1
                </span>
                Personal Information
              </h3>

              {/* Avatar Upload */}
              <div className="flex justify-center mb-5">
                <div className="relative">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-7 h-7 text-slate-400" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 p-1.5 bg-slate-900 text-white rounded-lg shadow-md hover:bg-slate-700 transition-colors"
                    title="Upload photo (optional)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('firstName', {
                      required: 'First name is required',
                      minLength: { value: 2, message: 'At least 2 characters required' },
                      maxLength: { value: 50, message: 'Maximum 50 characters allowed' },
                    })}
                    type="text"
                    placeholder="Enter first name"
                    className={inputCls(!!errors.firstName)}
                  />
                  <FieldError message={errors.firstName?.message} />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('lastName', {
                      required: 'Last name is required',
                      minLength: { value: 2, message: 'At least 2 characters required' },
                      maxLength: { value: 50, message: 'Maximum 50 characters allowed' },
                    })}
                    type="text"
                    placeholder="Enter last name"
                    className={inputCls(!!errors.lastName)}
                  />
                  <FieldError message={errors.lastName?.message} />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('role', { required: 'Role is required' })}
                    disabled={isEditing}
                    className={`${inputCls(!!errors.role)} disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed`}
                  >
                    {roleOptions.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <FieldError message={errors.role?.message} />
                </div>

                {/* Assign Store (Visible only in Admin Warehouse mode) */}
                {storeId === 'admin' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Assign Store <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('store_id', { required: 'Assigning a store is required' })}
                      disabled={isEditing}
                      className={`${inputCls(!!errors.store_id)} disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed`}
                    >
                      <option value="">Select Store...</option>
                      {stores
                        .filter(s => s.id !== 'admin') // Filter out central admin warehouse option
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.store_name || s.name}
                          </option>
                        ))
                      }
                    </select>
                    <FieldError message={errors.store_id?.message} />
                  </div>
                )}

                {/* Joining Date — create only */}
                {!isEditing && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Joining Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('joiningDate', { required: 'Joining date is required' })}
                      type="date"
                      className={inputCls(!!errors.joiningDate)}
                    />
                    <FieldError message={errors.joiningDate?.message} />
                  </div>
                )}

                {/* PF Number */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    PF Number
                  </label>
                  <input
                    {...register('pfNumber')}
                    type="text"
                    placeholder="Enter PF Number"
                    className={inputCls(!!errors.pfNumber)}
                  />
                  <FieldError message={errors.pfNumber?.message} />
                </div>

                {/* Qualification — optician only */}
                {watchedRole === 'optician' && (
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Qualification
                    </label>
                    <input
                      {...register('qualification')}
                      type="text"
                      placeholder="e.g. B.Optom, M.Optom"
                      className={inputCls(!!errors.qualification)}
                    />
                    <FieldError message={errors.qualification?.message} />
                  </div>
                )}


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
                      minLength: { value: 10, message: 'Phone number must be exactly 10 digits' },
                      maxLength: { value: 10, message: 'Phone number must be exactly 10 digits' },
                      pattern: {
                        value: /^[0-9]+$/,
                        message: 'Invalid phone number format (digits only)',
                      },
                    })}
                    type="tel"
                    placeholder="e.g. 9876543210"
                    maxLength={10}
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
                    placeholder="staff@example.com"
                    className={inputCls(!!errors.email)}
                  />
                  <FieldError message={errors.email?.message} />
                </div>
              </div>



              {/* Status Toggle */}
              <div className="mt-4 flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-sm font-semibold text-slate-700">Status</span>
                <button
                  type="button"
                  onClick={() => setValue('isActive', !watchedIsActive, { shouldDirty: true })}
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
                <span
                  className={`text-sm font-semibold ${
                    watchedIsActive ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {watchedIsActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </section>

            {/* ── Section 3: Authentication — create only ── */}
            {!isEditing && (
              <>
                <div className="border-t border-slate-100" />
                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-5 h-5 bg-slate-800 text-white rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      3
                    </span>
                    Authentication
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                    {/* Password */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          {...register('password', {
                            required: 'Password is required',
                            minLength: { value: 8, message: 'Minimum 8 characters required' },
                          })}
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min. 8 characters"
                          className={`${inputCls(!!errors.password)} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <FieldError message={errors.password?.message} />
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          {...register('confirmPassword', {
                            required: 'Please confirm your password',
                            validate: (value) =>
                              value === watchedPassword || 'Passwords do not match',
                          })}
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Re-enter password"
                          className={`${inputCls(!!errors.confirmPassword)} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <FieldError message={errors.confirmPassword?.message} />
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>

          {/* ── Footer Actions ── */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 px-5 sm:px-7 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0 rounded-b-2xl">
            <button
              type="button"
              onClick={resetAndClose}
              className="w-full sm:w-auto px-5 py-2.5 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl font-semibold transition-all text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 text-white hover:bg-slate-700 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-md"
            >
              {isSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Add Staff Member'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddStaffModal;
