import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const DetailDrawer = ({
  isOpen = false,
  onClose,
  title = 'Details',
  children,
  footerActions
}) => {
  // Prevent page scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-fade-in animate-slide-up sm:animate-none">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-extrabold text-slate-800 tracking-tight uppercase">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 hide-scrollbar">
          {children}
        </div>

        {/* Footer Actions */}
        {footerActions && (
          <div className="px-6 py-4.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 flex-shrink-0">
            {footerActions}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default DetailDrawer;
