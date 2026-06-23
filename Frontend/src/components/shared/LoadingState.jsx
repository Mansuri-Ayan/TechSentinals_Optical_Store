import React from 'react';

const LoadingState = ({ count = 3 }) => {
  return (
    <div className="space-y-4 w-full animate-pulse">
      {/* Table skeleton */}
      <div className="hidden md:block bg-white rounded-3xl border border-slate-200/60 p-6 space-y-4.5 shadow-sm">
        <div className="h-6 bg-slate-100 rounded-lg w-full mb-4"></div>
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="flex gap-4">
            <div className="h-8 bg-slate-50 rounded-lg flex-1"></div>
            <div className="h-8 bg-slate-50 rounded-lg flex-1"></div>
            <div className="h-8 bg-slate-50 rounded-lg flex-1"></div>
            <div className="h-8 bg-slate-50 rounded-lg flex-1"></div>
          </div>
        ))}
      </div>

      {/* Mobile Card skeleton */}
      <div className="md:hidden space-y-4">
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-200/60 p-5 space-y-3.5 shadow-sm">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="h-4 bg-slate-100 rounded w-1/3"></div>
              <div className="h-4 bg-slate-100 rounded w-1/4"></div>
            </div>
            <div className="h-3 bg-slate-50 rounded w-1/2"></div>
            <div className="h-3 bg-slate-50 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoadingState;
