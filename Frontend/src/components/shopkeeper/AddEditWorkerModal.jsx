import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Mail, Phone, MapPin, Save, Plus, Briefcase, Calendar } from 'lucide-react';
import { ASSIGNED_WORK_OPTIONS, WORKER_STATUSES } from '../../data/workersData';

const EMPTY = {
  name: '', phone: '', email: '', address: '',
  assignedWork: '', joinDate: '', status: 'Active',
};

const Field = ({ label, field, icon: Icon, placeholder, type = 'text', form, errors, set, inputCls, children, maxLength }) => (
  <div>
    <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
      {label} <span className="text-red-500">*</span>
    </label>
    {children || (
      <input
        type={type}
        value={form[field]}
        onChange={e => {
          const val = e.target.value;
          if (maxLength && val.length > maxLength) return;
          set(field, val);
        }}
        placeholder={placeholder}
        maxLength={maxLength}
        className={inputCls(field)}
      />
    )}
    {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]}</p>}
  </div>
);

const AddEditWorkerModal = ({ isOpen, worker, onClose, onSubmit }) => {
  const isEdit = Boolean(worker?.id);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setForm(worker
        ? {
            name: worker.name,
            phone: worker.phone,
            email: worker.email,
            address: worker.address,
            assignedWork: worker.assignedWork,
            joinDate: worker.joinDate,
            status: worker.status,
          }
        : EMPTY
      );
      setErrors({});
    }
  }, [isOpen, worker]);

  if (!isOpen) return null;

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())          e.name          = 'Worker name is required';
    if (!form.phone.trim())         e.phone         = 'Phone number is required';
    else if (!/^\d{10}$/.test(form.phone)) e.phone = 'Phone number must be exactly 10 digits';
    if (!form.email.trim())         e.email         = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.address.trim())       e.address       = 'Address is required';
    if (!form.assignedWork)         e.assignedWork  = 'Assigned work is required';
    if (!form.joinDate)             e.joinDate      = 'Joining date is required';
    if (!form.status)               e.status        = 'Status is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ ...form, ...(isEdit ? { id: worker.id } : {}) });
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
      <div className="relative bg-white w-full sm:max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] min-h-0 border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isEdit ? 'bg-amber-50 border border-amber-100' : 'bg-blue-50 border border-blue-100'}`}>
              {isEdit ? <Save className="w-4 h-4 text-amber-600" /> : <Plus className="w-4 h-4 text-blue-600" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{isEdit ? 'Edit Worker' : 'Add New Worker'}</h2>
              <p className="text-xs text-slate-500">{isEdit ? `Editing: ${worker.name}` : 'Fill in the details below'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 min-h-0">
          <div className="px-5 sm:px-6 py-5 space-y-4">

            {/* Section: Worker Info */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <User className="w-3.5 h-3.5" /> Worker Information
              </p>
              <div className="space-y-4">
                <Field field="name" label="Worker Name" icon={User} placeholder="e.g. Rajesh Kumar" {...fieldProps} />
              </div>
            </div>

            {/* Section: Contact */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" /> Contact Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field field="phone" label="Phone Number" icon={Phone} placeholder="e.g. 9876543210" maxLength={10} {...fieldProps} />
                <Field field="email" label="Email Address" icon={Mail} placeholder="example@company.com" type="email" {...fieldProps} />
              </div>
            </div>

            {/* Section: Address */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" /> Address
              </p>
              <Field field="address" label="Full Address" icon={MapPin} placeholder="e.g. 12, MG Road, Andheri West, Mumbai" {...fieldProps} />
            </div>

            {/* Section: Work Details */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5" /> Work Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field field="assignedWork" label="Assigned Work" icon={Briefcase} {...fieldProps}>
                  <select value={form.assignedWork} onChange={e => set('assignedWork', e.target.value)} className={inputCls('assignedWork')}>
                    <option value="">Select work…</option>
                    {ASSIGNED_WORK_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </Field>
                <Field field="joinDate" label="Joining Date" icon={Calendar} {...fieldProps}>
                  <input
                    type="date"
                    value={form.joinDate}
                    onChange={e => set('joinDate', e.target.value)}
                    className={inputCls('joinDate')}
                  />
                </Field>
                <Field field="status" label="Status" icon={User} {...fieldProps}>
                  <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls('status')}>
                    <option value="">Select status…</option>
                    {WORKER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
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
              {isEdit ? 'Save Changes' : 'Save Worker'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddEditWorkerModal;
