/* eslint-disable */
import React from 'react';
import { ShoppingBag, User, Eye, CreditCard, Check } from 'lucide-react';

const steps = [
  { label: 'Products', shortLabel: 'Products', icon: ShoppingBag },
  { label: 'Customer Details', shortLabel: 'Customer', icon: User },
  { label: 'Optical Info', shortLabel: 'Optical', icon: Eye },
  { label: 'Payment', shortLabel: 'Payment', icon: CreditCard },
];

function WizardStepper({ currentStep = 0, onStepClick }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 font-sans">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          const isFuture = index > currentStep;
          const StepIcon = step.icon;

          return (
            <React.Fragment key={step.label}>
              {/* Step circle + label */}
              <div className="flex flex-col items-center relative">
                {/* Circle */}
                <button
                  type="button"
                  onClick={() => isCompleted && onStepClick?.(index)}
                  disabled={!isCompleted}
                  className={`
                    flex items-center justify-center transition-all duration-300
                    w-9 h-9 md:w-11 md:h-11 rounded-full
                    ${isCompleted
                      ? 'bg-emerald-500 cursor-pointer hover:scale-110 hover:shadow-lg hover:shadow-emerald-500/25'
                      : isActive
                        ? 'bg-emerald-500 ring-4 ring-emerald-500/20'
                        : 'bg-slate-200 cursor-default'
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 md:w-5 md:h-5 text-white" strokeWidth={2.5} />
                  ) : (
                    <StepIcon
                      className={`w-4 h-4 md:w-5 md:h-5 transition-all duration-300 ${
                        isActive ? 'text-white' : 'text-slate-400'
                      }`}
                      strokeWidth={2}
                    />
                  )}
                </button>

                {/* Label */}
                <span
                  className={`
                    mt-2 text-[10px] md:text-xs font-sans transition-all duration-300 text-center whitespace-nowrap
                    ${isCompleted || isActive
                      ? 'font-bold text-emerald-600'
                      : 'font-medium text-slate-400'
                    }
                  `}
                >
                  {/* Short label on mobile, full label on md+ */}
                  <span className="md:hidden">{step.shortLabel}</span>
                  <span className="hidden md:inline">{step.label}</span>
                </span>
              </div>

              {/* Connecting line (not after last step) */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-1 md:mx-3 mb-5">
                  <div
                    className={`h-0.5 w-full rounded-full transition-all duration-300 ${
                      index < currentStep ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default WizardStepper;
