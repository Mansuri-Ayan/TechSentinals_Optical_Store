import { Check } from 'lucide-react';

const STEPS = [
  { label: 'Customer', description: 'Personal details' },
  { label: 'Prescription', description: 'Optical specs' },
  { label: 'Products', description: 'Selection' },
  { label: 'Payment', description: 'Checkout' },
  { label: 'Completed', description: 'Order Receipt' },
];

const StepIndicator = ({ activeStep, onStepClick }) => {
  return (
    <div className="w-full py-4 font-sans flex items-center justify-between relative max-w-4xl mx-auto">
      {/* Background Line Connecting Steps */}
      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-4 z-0 hidden sm:block" />
      
      {/* Active progress color line */}
      <div
        className="absolute top-1/2 left-0 h-0.5 bg-emerald-500 -translate-y-4 z-0 transition-all duration-350 hidden sm:block"
        style={{
          width: `${((activeStep - 1) / (STEPS.length - 1)) * 100}%`,
        }}
      />

      {STEPS.map((step, idx) => {
        const stepNum = idx + 1;
        const isCompleted = activeStep > stepNum;
        const isActive = activeStep === stepNum;
        const isClickable = stepNum < activeStep;

        return (
          <div
            key={step.label}
            onClick={() => isClickable && onStepClick && onStepClick(stepNum)}
            className={`flex flex-col items-center flex-1 z-10 relative ${
              isClickable ? 'cursor-pointer group' : ''
            }`}
          >
            {/* Step Circle */}
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                isCompleted
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.25)] group-hover:bg-emerald-650 group-hover:border-emerald-650'
                  : isActive
                  ? 'bg-white border-emerald-600 text-emerald-600 font-extrabold ring-4 ring-emerald-500/10'
                  : 'bg-white border-slate-200 text-slate-450'
              }`}
            >
              {isCompleted ? (
                <Check className="w-4.5 h-4.5 stroke-[3]" />
              ) : (
                <span className="text-xs sm:text-sm">{stepNum}</span>
              )}
            </div>

            {/* Labels */}
            <div className="text-center mt-2.5">
              <p
                className={`text-xs font-bold transition-colors ${
                  isActive
                    ? 'text-slate-900'
                    : isClickable
                    ? 'text-slate-500 group-hover:text-slate-800'
                    : 'text-slate-400'
                }`}
              >
                {step.label}
              </p>
              <p className="text-[10px] text-slate-450 font-semibold hidden md:block mt-0.5">
                {step.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StepIndicator;
