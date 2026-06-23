import React from 'react';
import { Archive } from 'lucide-react';

const EmptyState = ({
  title = 'No records found',
  description = 'Try adjusting your search query or filters to find what you are looking for.',
  icon: Icon = Archive,
  onAction,
  actionLabel = 'Reset Filters'
}) => {
  return (
    <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-10 sm:p-16 flex flex-col items-center justify-center text-center shadow-sm max-w-lg mx-auto my-6 animate-fade-in">
      <div className="w-16 h-16 bg-slate-50 border border-slate-200/60 rounded-full flex items-center justify-center mb-5 text-slate-350 shadow-inner">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-1.5 tracking-tight">{title}</h3>
      <p className="text-slate-500 text-xs sm:text-sm font-medium mb-6 leading-relaxed max-w-sm">
        {description}
      </p>
      {onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
