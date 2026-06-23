import React, { useState } from 'react';
import { FileText, Eye, FileDown, Table, FileSpreadsheet } from 'lucide-react';
import { ACCOUNTANT_STORES } from '../../data/accountantData';
import { toast } from 'react-toastify';

const REPORT_TYPES = [
  { id: 'sales', title: 'Sales Report', description: 'Complete sales data with invoice-wise breakdown, payment modes, and GST details.', color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
  { id: 'expense', title: 'Expense Report', description: 'Detailed expense ledger categorized by type, branch, and approval status.', color: 'bg-rose-50 border-rose-100 text-rose-700' },
  { id: 'profit', title: 'Profit Report', description: 'Revenue vs expenditure analysis with gross and net profit margins.', color: 'bg-blue-50 border-blue-100 text-blue-700' },
  { id: 'customer-due', title: 'Customer Due Report', description: 'Outstanding customer balances, overdue invoices, and aging analysis.', color: 'bg-amber-50 border-amber-100 text-amber-700' },
  { id: 'supplier-payment', title: 'Supplier Payment Report', description: 'Supplier-wise payment tracking with pending amounts and due dates.', color: 'bg-indigo-50 border-indigo-100 text-indigo-700' },
  { id: 'gst', title: 'GST Collection Report', description: 'GSTR-1 and GSTR-2 summaries with CGST, SGST, and IGST breakdowns.', color: 'bg-violet-50 border-violet-100 text-violet-700' },
  { id: 'store-performance', title: 'Store Performance Report', description: 'Branch-wise metrics including revenue, profit, orders, and customer count.', color: 'bg-teal-50 border-teal-100 text-teal-700' }
];

const Reports = () => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const handleAction = (action, reportTitle) => {
    toast.info(`${action} — ${reportTitle} ${storeFilter ? `(${storeFilter})` : '(All Stores)'}`, {
      position: 'bottom-right',
      autoClose: 2500,
      hideProgressBar: false,
      theme: 'light'
    });
  };

  return (
    <div className="p-3 sm:p-5 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans space-y-4 sm:space-y-6 lg:space-y-8 min-w-0 overflow-x-hidden">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0" />
          <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Reports</h1>
        </div>
        <p className="text-slate-500 text-[11px] sm:text-xs lg:text-sm font-semibold">Generate, preview, and export financial reports.</p>
      </div>

      {/* Global Filters */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm p-4 sm:p-5 lg:p-6">
        <h3 className="text-[10px] sm:text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3 sm:mb-4">Report Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Store</label>
            <select value={storeFilter} onChange={e => setStoreFilter(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10">
              <option value="">All Stores</option>
              {ACCOUNTANT_STORES.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10">
              <option value="">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
              <option value="Approved">Approved</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Report Cards Grid — 1 col mobile, 2 cols tablet, 3 cols desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
        {REPORT_TYPES.map(report => (
          <div key={report.id} className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all p-4 sm:p-5 lg:p-6 flex flex-col justify-between group">
            <div className="mb-3 sm:mb-5">
              <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-bold border mb-2 sm:mb-3 ${report.color}`}>
                <FileText className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span>Report</span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-800 tracking-tight mb-1 sm:mb-1.5 group-hover:text-slate-900">{report.title}</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-semibold leading-relaxed">{report.description}</p>
            </div>

            {/* Action Buttons — 2x2 grid */}
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              <button
                onClick={() => handleAction('Preview', report.title)}
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                <span>Preview</span>
              </button>
              <button
                onClick={() => handleAction('Export PDF', report.title)}
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
              >
                <FileDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                <span>PDF</span>
              </button>
              <button
                onClick={() => handleAction('Export Excel', report.title)}
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
              >
                <Table className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                <span>Excel</span>
              </button>
              <button
                onClick={() => handleAction('Export CSV', report.title)}
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
              >
                <FileSpreadsheet className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                <span>CSV</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Reports;
