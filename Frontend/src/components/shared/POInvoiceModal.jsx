import { createPortal } from 'react-dom';
import { X, Printer, Download, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { usePOInvoice } from '../../hooks/usePurchaseOrders';
import { downloadPOInvoiceApi } from '../../api/purchase_order/purchase_order.api';
import { toast } from 'react-toastify';

const POInvoiceModal = ({ isOpen, onClose, poId, invoiceNumber }) => {
  const { data: invoiceData, isLoading, isError } = usePOInvoice(poId);

  if (!isOpen || !poId) return null;

  const handlePrint = () => {
    if (!invoiceData?.html_content) return;
    const printWindow = window.open('', '_blank', 'width=900,height=900');
    if (!printWindow) {
      toast.error('Popup blocker prevented opening print window.');
      return;
    }
    printWindow.document.write(invoiceData.html_content);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleDownload = async () => {
    try {
      await downloadPOInvoiceApi(poId, invoiceNumber || invoiceData?.invoice_number, invoiceData?.is_final);
      toast.success('Purchase invoice downloaded (PDF).');
    } catch (err) {
      toast.error('Failed to download purchase invoice.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-6 animate-fade-in font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              invoiceData?.is_final 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                : 'bg-amber-50 border-amber-100 text-amber-600'
            }`}>
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Purchase Order Invoice</h2>
                {invoiceData?.is_final ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> FINAL INVOICE
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> TEMPORARY INVOICE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {invoiceData?.invoice_number || invoiceNumber || `PO #${poId}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isLoading || !invoiceData?.html_content}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              Print
            </button>
            <button
              onClick={handleDownload}
              disabled={isLoading || !invoiceData?.html_content}
              className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 bg-slate-100/70 overflow-y-auto p-4 sm:p-6 min-h-[350px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-200/80 shadow-sm gap-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-xs font-semibold text-slate-500">Generating Supplier Invoice...</p>
            </div>
          ) : isError || !invoiceData?.html_content ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm">
              <p className="text-sm font-bold text-slate-700">Unable to load purchase order invoice.</p>
              <p className="text-xs text-slate-500 mt-1">Please try again or contact your system administrator.</p>
            </div>
          ) : (
            <div
              className="max-w-2xl mx-auto shadow-sm rounded-2xl overflow-hidden bg-white"
              dangerouslySetInnerHTML={{ __html: invoiceData.html_content }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
          <span>
            Invoice Status: <strong className="font-semibold text-slate-700">{invoiceData?.is_final ? 'Paid in Full (Final)' : 'Outstanding Balance (Temporary)'}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default POInvoiceModal;
