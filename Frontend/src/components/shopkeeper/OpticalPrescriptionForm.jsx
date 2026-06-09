import { useState } from 'react';
import { Eye, ArrowLeft, ArrowRight, Stethoscope, Calendar, FileText, Sparkles } from 'lucide-react';
import { LENS_TYPES, FRAME_PREFERENCES, LENS_COATINGS } from '../../data/customersData';

const defaultPrescription = {
  rightEye: { sph: '', cyl: '', axis: '', addPower: '', pd: '' },
  leftEye: { sph: '', cyl: '', axis: '', addPower: '', pd: '' },
  lensType: '',
  framePreference: '',
  lensCoating: '',
  doctorName: '',
  prescriptionDate: new Date().toISOString().split('T')[0],
  notes: '',
};

const inputClass =
  'w-full px-3 py-2.5 text-sm font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 placeholder:text-slate-400 bg-white transition-all';

const eyeFields = [
  { key: 'sph', label: 'SPH', type: 'number', step: '0.25', placeholder: '-2.50' },
  { key: 'cyl', label: 'CYL', type: 'number', step: '0.25', placeholder: '-0.75' },
  { key: 'axis', label: 'AXIS', type: 'number', step: '1', min: '0', max: '180', placeholder: '180' },
  { key: 'addPower', label: 'ADD', type: 'number', step: '0.25', placeholder: '1.50' },
  { key: 'pd', label: 'PD', type: 'number', placeholder: '32' },
];

function OpticalPrescriptionForm({ prescription, onChange, onBack, onNext }) {
  const [form, setForm] = useState(() => {
    if (prescription) {
      return {
        ...defaultPrescription,
        ...prescription,
        rightEye: { ...defaultPrescription.rightEye, ...prescription.rightEye },
        leftEye: { ...defaultPrescription.leftEye, ...prescription.leftEye },
      };
    }
    return { ...defaultPrescription };
  });

  const [prevPrescription, setPrevPrescription] = useState(prescription);
  if (prescription !== prevPrescription) {
    setForm({
      ...defaultPrescription,
      ...prescription,
      rightEye: { ...defaultPrescription.rightEye, ...prescription.rightEye },
      leftEye: { ...defaultPrescription.leftEye, ...prescription.leftEye },
    });
    setPrevPrescription(prescription);
  }

  const handleEyeChange = (eye, field, value) => {
    setForm((prev) => ({
      ...prev,
      [eye]: { ...prev[eye], [field]: value },
    }));
  };

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSkip = () => {
    const emptyPres = {
      ...defaultPrescription,
      prescriptionDate: '', // make it empty/falsy so hasPrescription returns false
    };
    onChange?.(emptyPres);
    onNext?.();
  };

  const handleNext = () => {
    onChange?.(form);
    onNext?.();
  };

  const handleBack = () => {
    onChange?.(form);
    onBack?.();
  };

  const renderEyeCard = (eyeKey, label, shortLabel, colorScheme) => {
    const colors = colorScheme === 'blue'
      ? { badge: 'bg-blue-50 text-blue-700 border-blue-200', ring: 'ring-blue-500/10 border-blue-500', dot: 'bg-blue-500' }
      : { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', ring: 'ring-emerald-500/10 border-emerald-500', dot: 'bg-emerald-500' };

    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 transition-all duration-300 hover:shadow-md">
        {/* Card header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border ${colors.badge}`}>
            {shortLabel}
          </span>
          <span className="text-sm font-semibold text-slate-700">{label}</span>
        </div>

        {/* Eye fields grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {eyeFields.map((field) => (
            <div key={field.key}>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                {field.label}
              </label>
              <input
                type={field.type}
                step={field.step}
                min={field.min}
                max={field.max}
                placeholder={field.placeholder}
                value={form[eyeKey][field.key]}
                onChange={(e) => handleEyeChange(eyeKey, field.key, e.target.value)}
                className={inputClass}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="font-sans space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50">
          <Eye className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Optical Prescription</h2>
          <p className="text-xs text-slate-400">Enter prescription details for both eyes (all fields optional)</p>
        </div>
      </div>

      {/* Eye cards — side by side on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderEyeCard('rightEye', 'Right Eye', 'OD', 'blue')}
        {renderEyeCard('leftEye', 'Left Eye', 'OS', 'emerald')}
      </div>

      {/* Additional preferences */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-5 transition-all duration-300 hover:shadow-md">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-slate-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Additional Preferences</span>
        </div>

        {/* Three dropdowns in a row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Lens Type */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Lens Type
            </label>
            <select
              value={form.lensType}
              onChange={(e) => handleFieldChange('lensType', e.target.value)}
              className={inputClass}
            >
              <option value="">Select lens type</option>
              {LENS_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Frame Preference */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Frame Preference
            </label>
            <select
              value={form.framePreference}
              onChange={(e) => handleFieldChange('framePreference', e.target.value)}
              className={inputClass}
            >
              <option value="">Select frame</option>
              {FRAME_PREFERENCES.map((pref) => (
                <option key={pref} value={pref}>{pref}</option>
              ))}
            </select>
          </div>

          {/* Lens Coating */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Lens Coating
            </label>
            <select
              value={form.lensCoating}
              onChange={(e) => handleFieldChange('lensCoating', e.target.value)}
              className={inputClass}
            >
              <option value="">Select coating</option>
              {LENS_COATINGS.map((coat) => (
                <option key={coat} value={coat}>{coat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Doctor Name + Prescription Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Doctor Name
            </label>
            <div className="relative">
              <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Dr. John Smith"
                value={form.doctorName}
                onChange={(e) => handleFieldChange('doctorName', e.target.value)}
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Prescription Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={form.prescriptionDate}
                onChange={(e) => handleFieldChange('prescriptionDate', e.target.value)}
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            Notes
          </label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <textarea
              rows={2}
              placeholder="Any additional notes about the prescription..."
              value={form.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              className={`${inputClass} pl-9 resize-none`}
            />
          </div>
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSkip}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-300 cursor-pointer"
          >
            Skip Prescription
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0A0F1F] rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default OpticalPrescriptionForm;
