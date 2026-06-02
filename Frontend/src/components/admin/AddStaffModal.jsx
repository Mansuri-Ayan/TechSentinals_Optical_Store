import { useRef, useState } from 'react';
import { X, UserPlus, Camera, Eye, EyeOff, Plus } from 'lucide-react';

const emptyStaffForm = {
  firstName: '',
  lastName: '',
  role: 'manager',
  joiningDate: '',
  employeeCode: '',
  qualification: '',
  phone: '',
  email: '',
  isActive: true,
  password: '',
  confirmPassword: '',
  image: null,
  imagePreview: null,
};

const roleOptions = [
  { value: 'manager', label: 'Manager' },
  { value: 'worker', label: 'Worker' },
  { value: 'optician', label: 'Optician' },
];

const getInitialStaffForm = (initialData) => {
  if (!initialData) {
    return { ...emptyStaffForm };
  }

  return {
    ...emptyStaffForm,
    firstName: initialData.first_name || '',
    lastName: initialData.last_name || '',
    role: initialData.role || 'manager',
    phone: initialData.phone || '',
    joiningDate: initialData.joining_date || '',
    employeeCode: initialData.employee_code || '',
    qualification: initialData.qualification || '',
    email: initialData.email || '',
    isActive: Boolean(initialData.is_active),
    imagePreview: initialData.profile_image || null,
  };
};

const AddStaffModal = ({
  isOpen,
  onClose,
  onSubmitStaff,
  initialData,
  isSaving = false,
}) => {
  const [staffForm, setStaffForm] = useState(() => getInitialStaffForm(initialData));
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const imageInputRef = useRef(null);
  const isEditing = Boolean(initialData);

  if (!isOpen) return null;

  const handleStaffChange = (field, value) => {
    setStaffForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'password' || field === 'confirmPassword') {
      setPasswordError('');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStaffForm((prev) => ({
          ...prev,
          image: file,
          imagePreview: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const resetAndClose = () => {
    setStaffForm({ ...emptyStaffForm });
    setPasswordError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();

    if (!isEditing && staffForm.password !== staffForm.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    const basePayload = {
      first_name: staffForm.firstName,
      last_name: staffForm.lastName,
      email: staffForm.email || null,
      phone: staffForm.phone,
      is_active: staffForm.isActive,
    };

    const createPayload = {
      ...basePayload,
      password: staffForm.password,
      employee_code: staffForm.employeeCode,
      joining_date: staffForm.joiningDate,
      ...(staffForm.role === 'optician' ? { qualification: staffForm.qualification || null } : {}),
    };

    const updatePayload = {
      ...basePayload,
      profile_image: staffForm.imagePreview || null,
      ...(staffForm.role === 'optician' ? { qualification: staffForm.qualification || null } : {}),
    };

    try {
      await onSubmitStaff({
        role: staffForm.role,
        payload: isEditing ? updatePayload : createPayload,
        staff: initialData,
      });
      resetAndClose();
    } catch {
      // Toast feedback is handled by the caller mutation.
    }
  };

  return (
    <div className="fixed inset-0 glass flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] max-w-2xl w-full overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center px-5 sm:px-8 py-4 sm:py-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                {isEditing ? 'Edit Staff' : 'Add New Staff'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {isEditing ? 'Update the staff member details below.' : 'Fill in the staff member details below.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleStaffSubmit} className="p-5 sm:p-8 space-y-6 overflow-y-auto flex-1">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-slate-900 text-white rounded-md flex items-center justify-center text-xs">1</span>
              Personal Information
            </h3>

            <div className="flex justify-center mb-5">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                  {staffForm.imagePreview ? (
                    <img src={staffForm.imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 p-1.5 bg-[#0A0F1F] text-white rounded-lg shadow-md hover:bg-slate-800 transition-colors"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">First Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={staffForm.firstName}
                  onChange={(e) => handleStaffChange('firstName', e.target.value)}
                  placeholder="Enter first name"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-slate-900 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Last Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={staffForm.lastName}
                  onChange={(e) => handleStaffChange('lastName', e.target.value)}
                  placeholder="Enter last name"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-slate-900 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role <span className="text-red-500">*</span></label>
                <select
                  required
                  disabled={isEditing}
                  value={staffForm.role}
                  onChange={(e) => handleStaffChange('role', e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-slate-900 transition-all text-sm disabled:bg-slate-50 disabled:text-slate-500"
                >
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Joining Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required={!isEditing}
                  disabled={isEditing}
                  value={staffForm.joiningDate}
                  onChange={(e) => handleStaffChange('joiningDate', e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-slate-900 transition-all text-sm disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Employee Code <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required={!isEditing}
                  disabled={isEditing}
                  value={staffForm.employeeCode}
                  onChange={(e) => handleStaffChange('employeeCode', e.target.value)}
                  placeholder="e.g. MGR-001"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-slate-900 transition-all text-sm disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
              {staffForm.role === 'optician' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Qualification</label>
                  <input
                    type="text"
                    value={staffForm.qualification}
                    onChange={(e) => handleStaffChange('qualification', e.target.value)}
                    placeholder="e.g. B.Optom"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-slate-900 transition-all text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-slate-900 text-white rounded-md flex items-center justify-center text-xs">2</span>
              Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  required
                  value={staffForm.phone}
                  onChange={(e) => handleStaffChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-slate-900 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={staffForm.email}
                  onChange={(e) => handleStaffChange('email', e.target.value)}
                  placeholder="staff@example.com"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-slate-900 transition-all text-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <label className="text-sm font-semibold text-slate-700">Status</label>
              <button
                type="button"
                onClick={() => handleStaffChange('isActive', !staffForm.isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${staffForm.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${staffForm.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className={`text-sm font-semibold ${staffForm.isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                {staffForm.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {!isEditing && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-slate-900 text-white rounded-md flex items-center justify-center text-xs">3</span>
                Authentication
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={staffForm.password}
                      onChange={(e) => handleStaffChange('password', e.target.value)}
                      placeholder="Enter password"
                      className="w-full px-4 py-2.5 pr-10 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-slate-900 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={staffForm.confirmPassword}
                      onChange={(e) => handleStaffChange('confirmPassword', e.target.value)}
                      placeholder="Confirm password"
                      className={`w-full px-4 py-2.5 pr-10 bg-white border rounded-xl focus:ring-4 focus:ring-emerald-500/10 font-medium text-slate-900 transition-all text-sm ${passwordError ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-emerald-500'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="mt-1.5 text-sm text-red-600 font-medium">{passwordError}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={resetAndClose}
              className="w-full sm:w-auto px-5 py-2.5 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-semibold transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#0A0F1F] text-white hover:bg-slate-800 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-sm disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStaffModal;
