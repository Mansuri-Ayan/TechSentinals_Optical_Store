import { Eye } from 'lucide-react';

const PrescriptionForm = ({ prescription, onChange }) => {
  const setEyeField = (eye, field, val) => {
    const numVal = val === '' ? '' : Number(val);
    onChange({
      ...prescription,
      [eye]: {
        ...prescription[eye],
        [field]: numVal,
      },
    });
  };

  const renderEyeCol = (eyeLabel, eyeKey, isBlue = true) => {
    const fields = [
      { label: 'SPH (Sphere)', key: 'sph', step: '0.25', placeholder: 'e.g. -2.00' },
      { label: 'CYL (Cylinder)', key: 'cyl', step: '0.25', placeholder: 'e.g. -0.50' },
      { label: 'Axis (Degrees)', key: 'axis', step: '1', min: '0', max: '180', placeholder: 'e.g. 180' },
      { label: 'Add Power', key: 'addPower', step: '0.25', placeholder: 'e.g. +1.50' },
      { label: 'PD (Pupillary Distance)', key: 'pd', step: '1', min: '20', max: '80', placeholder: 'e.g. 32' },
    ];

    const cardHeaderColor = isBlue
      ? 'bg-blue-50 border-blue-100 text-blue-800'
      : 'bg-emerald-50 border-emerald-100 text-emerald-800';

    return (
      <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden flex-1">
        <div className={`px-4 py-3 border-b font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 ${cardHeaderColor}`}>
          <Eye className="w-4 h-4 flex-shrink-0" />
          {eyeLabel}
        </div>
        <div className="p-4 space-y-3">
          {fields.map((f) => (
            <div key={f.key} className="grid grid-cols-3 items-center gap-3">
              <label className="col-span-1.5 text-[10px] font-bold text-slate-500">{f.label}</label>
              <input
                type="number"
                step={f.step}
                min={f.min}
                max={f.max}
                value={prescription[eyeKey]?.[f.key] ?? ''}
                onChange={(e) => setEyeField(eyeKey, f.key, e.target.value)}
                placeholder={f.placeholder}
                className="col-span-1.5 w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row gap-5 font-sans">
      {renderEyeCol('Right Eye (Oculus Dexter - OD)', 'rightEye', true)}
      {renderEyeCol('Left Eye (Oculus Sinister - OS)', 'leftEye', false)}
    </div>
  );
};

export default PrescriptionForm;
