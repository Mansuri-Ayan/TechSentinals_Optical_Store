import React from 'react';

const BADGE_THEMES = {
  // Positive / Active states
  paid: { text: 'text-emerald-700 bg-emerald-50/70 border-emerald-250/30', dot: 'bg-emerald-500' },
  approved: { text: 'text-emerald-700 bg-emerald-50/70 border-emerald-250/30', dot: 'bg-emerald-500' },
  completed: { text: 'text-emerald-700 bg-emerald-50/70 border-emerald-250/30', dot: 'bg-emerald-500' },
  active: { text: 'text-emerald-700 bg-emerald-50/70 border-emerald-250/30', dot: 'bg-emerald-500' },
  credit: { text: 'text-emerald-700 bg-emerald-50/70 border-emerald-250/30', dot: 'bg-emerald-500' },

  // Warning / Processing states
  due: { text: 'text-amber-700 bg-amber-50/70 border-amber-250/30', dot: 'bg-amber-500' },
  pending: { text: 'text-amber-700 bg-amber-50/70 border-amber-250/30', dot: 'bg-amber-500' },
  partial: { text: 'text-amber-700 bg-amber-50/70 border-amber-250/30', dot: 'bg-amber-500' },

  // Danger / Error states
  overdue: { text: 'text-rose-700 bg-rose-50/70 border-rose-250/30', dot: 'bg-rose-500' },
  rejected: { text: 'text-rose-700 bg-rose-50/70 border-rose-250/30', dot: 'bg-rose-500' },
  cancelled: { text: 'text-rose-700 bg-rose-50/70 border-rose-250/30', dot: 'bg-rose-500' },
  debit: { text: 'text-rose-700 bg-rose-50/70 border-rose-250/30', dot: 'bg-rose-500' }
};

const StatusBadge = ({ status = '' }) => {
  const normStatus = String(status).toLowerCase().trim();
  const theme = BADGE_THEMES[normStatus] || {
    text: 'text-slate-600 bg-slate-50 border-slate-200/50',
    dot: 'bg-slate-400'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${theme.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${theme.dot}`} />
      <span>{status}</span>
    </span>
  );
};

export default StatusBadge;
