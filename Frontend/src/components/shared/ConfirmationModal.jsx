import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react';

const ConfirmationModal = ({
  isOpen = false,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning' // 'warning', 'danger', 'info', 'success'
}) => {
  if (!isOpen) return null;

  const iconMap = {
    warning: <AlertTriangle className="w-6 h-6 text-amber-600" />,
    danger: <AlertTriangle className="w-6 h-6 text-red-650" />,
    info: <Info className="w-6 h-6 text-blue-600" />,
    success: <CheckCircle className="w-6 h-6 text-emerald-600" />
  };

  const colorMap = {
    warning: 'bg-amber-50 border-amber-100',
    danger: 'bg-red-50 border-red-100',
    info: 'bg-blue-50 border-blue-100',
    success: 'bg-emerald-50 border-emerald-100'
  };

  const buttonMap = {
    warning: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500',
    danger: 'bg-red-650 hover:bg-red-750 text-white focus:ring-red-500',
    info: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500'
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/55 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200/60 overflow-hidden z-10 animate-fade-in p-6">
        <div className="flex gap-4">
          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center flex-shrink-0 ${colorMap[type]}`}>
            {iconMap[type]}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-extrabold text-slate-800 tracking-tight mb-1.5">{title}</h3>
            <p className="text-slate-500 text-xs sm:text-sm font-semibold leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-650 hover:bg-slate-100 rounded-xl transition-all cursor-pointer border border-slate-200"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm && onConfirm();
              onClose();
            }}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm ${buttonMap[type]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmationModal;
