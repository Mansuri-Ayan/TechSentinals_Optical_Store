import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X } from 'lucide-react';

const DeleteConfirmModal = ({ supplier, onClose, onConfirm }) => {
  if (!supplier) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-3 sm:p-4 animate-fade-in font-sans">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Delete Supplier</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Are you sure you want to delete{' '}
            <span className="font-bold text-slate-900">"{supplier.name}"</span>?
            This action cannot be undone and will remove all associated data.
          </p>

          {/* Warning card */}
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-1">
            <p className="text-xs font-bold text-red-700">This will permanently delete:</p>
            <ul className="text-xs text-red-600 space-y-0.5 list-disc list-inside">
              <li>Supplier profile and contact details</li>
              <li>{supplier.totalOrders} purchase order records</li>
              <li>{supplier.totalProducts} product associations</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={() => onConfirm(supplier.id)}
            className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Yes, Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DeleteConfirmModal;
