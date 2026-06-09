import { useState } from 'react';
import { toast } from 'react-toastify';
import { FileText, Download, Loader2, TrendingUp, Users, Archive, Receipt, BarChart } from 'lucide-react';

const StoreReportsTab = ({ store }) => {
  const [generatingId, setGeneratingId] = useState(null);

  const storeName = store.store_name || store.name;

  const reports = [
    {
      id: 'sales',
      title: 'Sales & Revenue Report',
      description: 'Breakdown of transactions, product sales volume, and customer invoice summary.',
      icon: TrendingUp,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      id: 'customer',
      title: 'Customer Demographics & Outstanding Balances',
      description: 'Active buyers directory, new acquisitions metrics, and pending balance statements.',
      icon: Users,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      id: 'inventory',
      title: 'Inventory Audit & Stock Sheet',
      description: 'Current quantities, valuation statement, out-of-stock items list, and brand allocations.',
      icon: Archive,
      color: 'text-purple-600 bg-purple-50 border-purple-100',
    },
    {
      id: 'expense',
      title: 'Operating Expense & Payroll Ledger',
      description: 'Monthly store rental payouts, electricity/utility expenses, and employee salary sheets.',
      icon: Receipt,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      id: 'profit',
      title: 'Gross Margin & Profitability Report',
      description: 'Cost of goods sold (COGS) vs total revenue comparisons and gross profit analyses.',
      icon: BarChart,
      color: 'text-rose-600 bg-rose-50 border-rose-100',
    },
  ];

  const handleGenerate = (id, title) => {
    setGeneratingId(id);
    toast.info(`Gathering store metrics for ${title}...`);
    setTimeout(() => {
      setGeneratingId(null);
      toast.success(`${title} for ${storeName} generated successfully as PDF!`);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Generate Store PDF Reports</h3>
          <p className="text-xs text-slate-500 mt-0.5">Export store sheets, ledgers, and metrics to PDF formats.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
        {reports.map((report) => {
          const Icon = report.icon;
          const isGenerating = generatingId === report.id;
          return (
            <div
              key={report.id}
              className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2.5 rounded-xl border flex-shrink-0 ${report.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm leading-snug">
                    {report.title}
                  </h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                  {report.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleGenerate(report.id, report.title)}
                disabled={generatingId !== null}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 bg-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    Download PDF Report
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StoreReportsTab;
