import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, Calendar, Save, FileText } from 'lucide-react';
import { LENS_TYPES, FRAME_PREFERENCES } from '../../data/customersData';

const EMPTY = {
  rightSph: '', rightCyl: '', rightAxis: '', rightAddPower: '', rightPd: '',
  leftSph: '', leftCyl: '', leftAxis: '', leftAddPower: '', leftPd: '',
  lensType: '', lensMaterial: '', lensCoating: '', framePreference: '',
  doctorName: '', prescriptionDate: '', expiryDate: '', recommendedUsage: '',
  notes: '',
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
        step="any"
        value={form[field]}
        onChange={e => set(field, e.target.value)}
        placeholder={placeholder}
        className={inputCls(field)}
      />
    )}
    {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]}</p>}
  </div>
);

const AddOpticalModal = ({ isOpen, prescription, onClose, onSubmit }) => {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (prescription) {
        /* eslint-disable-next-line react-hooks/set-state-in-effect */
        setForm({
          rightSph: prescription.rightEye?.sph ?? '',
          rightCyl: prescription.rightEye?.cyl ?? '',
          rightAxis: prescription.rightEye?.axis ?? '',
          rightAddPower: prescription.rightEye?.addPower ?? '',
          rightPd: prescription.rightEye?.pd ?? '',
          leftSph: prescription.leftEye?.sph ?? '',
          leftCyl: prescription.leftEye?.cyl ?? '',
          leftAxis: prescription.leftEye?.axis ?? '',
          leftAddPower: prescription.leftEye?.addPower ?? '',
          leftPd: prescription.leftEye?.pd ?? '',
          lensType: prescription.lensType ?? '',
          lensMaterial: prescription.lensMaterial ?? '',
          lensCoating: prescription.lensCoating ?? '',
          framePreference: prescription.framePreference ?? '',
          doctorName: prescription.doctorName ?? '',
          prescriptionDate: prescription.prescriptionDate ?? '',
          expiryDate: prescription.expiryDate ?? '',
          recommendedUsage: prescription.recommendedUsage ?? '',
          notes: prescription.notes ?? '',
        });
      } else {
        setForm(EMPTY);
      }
      setErrors({});
    }
  }, [isOpen, prescription]);

  if (!isOpen) return null;

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    // SPH, CYL, Axis are optional but must be valid numbers if entered
    const numericFields = [
      'rightSph', 'rightCyl', 'rightAxis', 'rightAddPower', 'rightPd',
      'leftSph', 'leftCyl', 'leftAxis', 'leftAddPower', 'leftPd',
    ];
    numericFields.forEach(f => {
      if (form[f] !== '' && isNaN(Number(form[f]))) {
        e[f] = 'Must be a valid number';
      }
    });

    if (form.rightAxis !== '' && (Number(form.rightAxis) < 0 || Number(form.rightAxis) > 180)) {
      e.rightAxis = 'Axis must be 0-180';
    }
    if (form.leftAxis !== '' && (Number(form.leftAxis) < 0 || Number(form.leftAxis) > 180)) {
      e.leftAxis = 'Axis must be 0-180';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Convert flat fields back into structured prescription object
    const structuredData = {
      rightEye: {
        sph: form.rightSph !== '' ? Number(form.rightSph) : 0,
        cyl: form.rightCyl !== '' ? Number(form.rightCyl) : 0,
        axis: form.rightAxis !== '' ? Number(form.rightAxis) : 0,
        addPower: form.rightAddPower !== '' ? Number(form.rightAddPower) : 0,
        pd: form.rightPd !== '' ? Number(form.rightPd) : 0,
      },
      leftEye: {
        sph: form.leftSph !== '' ? Number(form.leftSph) : 0,
        cyl: form.leftCyl !== '' ? Number(form.leftCyl) : 0,
        axis: form.leftAxis !== '' ? Number(form.leftAxis) : 0,
        addPower: form.leftAddPower !== '' ? Number(form.leftAddPower) : 0,
        pd: form.leftPd !== '' ? Number(form.leftPd) : 0,
      },
      lensType: form.lensType,
      lensMaterial: form.lensMaterial,
      lensCoating: form.lensCoating,
      framePreference: form.framePreference,
      doctorName: form.doctorName,
      prescriptionDate: form.prescriptionDate || new Date().toISOString().split('T')[0],
      expiryDate: form.expiryDate,
      recommendedUsage: form.recommendedUsage,
      notes: form.notes,
    };

    onSubmit(structuredData);
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
              <Eye className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{prescription ? 'Edit Prescription' : 'Add Prescription'}</h2>
              <p className="text-xs text-slate-500">Record optical measurements & lens details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 min-h-0">
          <div className="px-5 sm:px-6 py-5 space-y-6">

            {/* Section: Right Eye */}
            <div>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Eye className="w-3.5 h-3.5" /> Right Eye (OD)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <Field field="rightSph" label="SPH" placeholder="0.00" type="number" {...fieldProps} />
                <Field field="rightCyl" label="CYL" placeholder="0.00" type="number" {...fieldProps} />
                <Field field="rightAxis" label="Axis" placeholder="0" type="number" {...fieldProps} />
                <Field field="rightAddPower" label="Add Power" placeholder="0.00" type="number" {...fieldProps} />
                <Field field="rightPd" label="PD (mm)" placeholder="0" type="number" {...fieldProps} />
              </div>
            </div>

            {/* Section: Left Eye */}
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Eye className="w-3.5 h-3.5" /> Left Eye (OS)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <Field field="leftSph" label="SPH" placeholder="0.00" type="number" {...fieldProps} />
                <Field field="leftCyl" label="CYL" placeholder="0.00" type="number" {...fieldProps} />
                <Field field="leftAxis" label="Axis" placeholder="0" type="number" {...fieldProps} />
                <Field field="leftAddPower" label="Add Power" placeholder="0.00" type="number" {...fieldProps} />
                <Field field="leftPd" label="PD (mm)" placeholder="0" type="number" {...fieldProps} />
              </div>
            </div>

            {/* Section: Additional Information */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Additional Information
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field field="lensType" label="Lens Type" {...fieldProps}>
                    <select value={form.lensType} onChange={e => set('lensType', e.target.value)} className={inputCls('lensType')}>
                      <option value="">Select lens type…</option>
                      {LENS_TYPES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </Field>
                  <Field field="lensMaterial" label="Lens Material" placeholder="e.g. Polycarbonate, CR-39" {...fieldProps} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field field="lensCoating" label="Lens Coating" placeholder="e.g. Anti-Reflective, Blue Cut" {...fieldProps} />
                  <Field field="framePreference" label="Frame Preference" {...fieldProps}>
                    <select value={form.framePreference} onChange={e => set('framePreference', e.target.value)} className={inputCls('framePreference')}>
                      <option value="">Select frame preference…</option>
                      {FRAME_PREFERENCES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field field="doctorName" label="Doctor Name" placeholder="Dr. Anil Sharma" {...fieldProps} />
                  <Field field="prescriptionDate" label="Prescription Date" icon={Calendar} {...fieldProps}>
                    <input type="date" value={form.prescriptionDate} onChange={e => set('prescriptionDate', e.target.value)} className={inputCls('prescriptionDate')} />
                  </Field>
                  <Field field="expiryDate" label="Expiry Date" icon={Calendar} {...fieldProps}>
                    <input type="date" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} className={inputCls('expiryDate')} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field field="recommendedUsage" label="Recommended Usage" placeholder="e.g. Constant Wear, Reading Only" {...fieldProps} />
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                      Notes / Remarks
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={e => set('notes', e.target.value)}
                      placeholder="Add notes about this prescription…"
                      rows={2}
                      className={inputCls('notes')}
                    />
                  </div>
                </div>
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
              className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2 bg-[#0A0F1F] hover:bg-slate-800">
              <Save className="w-4 h-4" />
              Save Prescription
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddOpticalModal;
