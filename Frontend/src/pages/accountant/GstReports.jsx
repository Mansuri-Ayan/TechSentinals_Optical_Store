import React, { useState, useMemo } from 'react';
import {
  Percent, FileText, CheckCircle, ArrowDownLeft, ArrowUpRight,
  TrendingUp, Calendar, Info, ShieldAlert, BarChart3
} from 'lucide-react';
import { useCalculations } from '../../hooks/useCalculations';
import { MOCK_GST_LEDGER } from '../../data/accountantData';
import { useStoreStore } from '../../store/store';
import DataTable from '../../components/shared/DataTable';
import SearchBar from '../../components/shared/SearchBar';
import FilterBar from '../../components/shared/FilterBar';
import Pagination from '../../components/shared/Pagination';
import StatusBadge from '../../components/shared/StatusBadge';
import { useTable } from '../../hooks/useTable';

const GstReports = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showFilters, setShowFilters] = useState(false);
  const { selectedStore } = useStoreStore();
  const { gstDetails, formatRupee } = useCalculations();

  // Tab setup for GST sections
  const tabs = [
    { id: 'dashboard', label: 'GST Dashboard', icon: Percent },
    { id: 'gstr1', label: 'GSTR-1 (Sales)', icon: FileText },
    { id: 'gstr2', label: 'GSTR-2 (Purchases)', icon: FileText },
    { id: 'gstr3b', label: 'GSTR-3B (Filing Summary)', icon: CheckCircle },
    { id: 'ledger', label: 'GST Ledger Logs', icon: Calendar }
  ];

  // Map stores to MOCK_GST_LEDGER records for filtering
  const gstLedgerWithStore = useMemo(() => {
    return MOCK_GST_LEDGER.map(item => {
      let storeName = 'Main Branch';
      if (item.invoiceNo === 'INV-2026-002' || item.invoiceNo === 'INV-2026-007' || item.invoiceNo === 'PUR-2026-109') {
        storeName = 'Branch 2';
      } else if (item.invoiceNo === 'INV-2026-004' || item.invoiceNo === 'INV-2026-008') {
        storeName = 'Branch 3';
      } else if (item.invoiceNo === 'INV-2026-005') {
        storeName = 'Admin Store';
      }
      return { ...item, storeName };
    });
  }, []);

  const filteredGstLedger = useMemo(() => {
    if (!selectedStore || selectedStore.id === 'all' || selectedStore.isAll || selectedStore.store_name === 'All Branches') {
      return gstLedgerWithStore;
    }
    return gstLedgerWithStore.filter(item => item.storeName === selectedStore.store_name);
  }, [gstLedgerWithStore, selectedStore]);

  // GST Ledger list with useTable hook
  const {
    paginatedData: ledgerData,
    totalItems: ledgerTotal,
    search: ledgerSearch,
    setSearch: setLedgerSearch,
    filters: ledgerFilters,
    setFilter: setLedgerFilter,
    clearFilters: clearLedgerFilters,
    currentPage: ledgerPage,
    setCurrentPage: setLedgerPage,
    totalPages: ledgerTotalPages,
    itemsPerPage: ledgerLimit,
    sortConfig: ledgerSort,
    requestSort: requestLedgerSort
  } = useTable({
    initialData: filteredGstLedger,
    searchKeys: ['invoiceNo', 'counterParty', 'type'],
    itemsPerPage: 6,
    initialSort: { key: 'date', direction: 'desc' },
    initialFilters: { type: '', status: '' }
  });

  const fmtDate = (d) => {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const salesLedgerInvoices = useMemo(() => {
    return filteredGstLedger.filter(item => item.type.includes('Sales'));
  }, [filteredGstLedger]);

  const purchaseLedgerInvoices = useMemo(() => {
    return filteredGstLedger.filter(item => item.type.includes('Purchase'));
  }, [filteredGstLedger]);

  // Calculate dynamic summaries
  const gstr1Summary = useMemo(() => {
    const invoices = filteredGstLedger.filter(item => item.type.includes('Sales'));
    const b2b = invoices.filter(item => item.rate === '18%').length;
    const taxableValue = invoices.reduce((s, r) => s + r.taxableValue, 0);
    const totalTax = invoices.reduce((s, r) => s + r.cgst + r.sgst + r.igst, 0);
    return {
      totalOutwardB2B: b2b,
      taxableValue,
      totalTax
    };
  }, [filteredGstLedger]);

  const gstr2Summary = useMemo(() => {
    const invoices = filteredGstLedger.filter(item => item.type.includes('Purchase'));
    const taxableValue = invoices.reduce((s, r) => s + r.taxableValue, 0);
    const totalITC = invoices.reduce((s, r) => s + r.cgst + r.sgst + r.igst, 0);
    return {
      totalInwardInvoices: invoices.length,
      taxableValue,
      totalITC
    };
  }, [filteredGstLedger]);

  const gstr3bDetails = useMemo(() => {
    const outTaxable = gstr1Summary.taxableValue;
    const outCGST = Math.round(gstr1Summary.totalTax / 2);
    const outSGST = Math.round(gstr1Summary.totalTax / 2);
    const outIGST = 0;

    const inTaxable = gstr2Summary.taxableValue;
    const inCGST = Math.round(gstr2Summary.totalITC / 2);
    const inSGST = Math.round(gstr2Summary.totalITC / 2);
    const inIGST = 0;

    return {
      outTaxable, outCGST, outSGST, outIGST,
      inTaxable, inCGST, inSGST, inIGST,
      netCGST: outCGST - inCGST,
      netSGST: outSGST - inSGST,
      netIGST: outIGST - inIGST
    };
  }, [gstr1Summary, gstr2Summary]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans space-y-6 sm:space-y-8">
      {/* Header Panel */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">GST Reports Centre</h1>
        <p className="text-slate-500 mt-1 text-xs sm:text-sm font-semibold">
          Calculate Output GST liabilities, track input tax credits (ITC), and prepare monthly GSTR-1, GSTR-2, and GSTR-3B audit returns.
        </p>
      </div>

      {/* Tabs list */}
      <div className="border-b border-slate-200 flex gap-2 overflow-x-auto hide-scrollbar scroll-smooth">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4.5 py-3 border-b-2 font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer focus:outline-none ${isActive
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Render Active Tab */}
      <div className="animate-fade-in">
        {activeTab === 'dashboard' && (
          <div className="space-y-6 sm:space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Output GST (Sales)</span>
                  <span className="text-xl sm:text-2xl font-black text-slate-800 block mt-1">
                    {formatRupee(gstDetails.outputGST)}
                  </span>
                  <span className="text-[10px] text-slate-450 mt-1 block font-bold">
                    CGST: {formatRupee(gstDetails.outputCGST)} | SGST: {formatRupee(gstDetails.outputSGST)}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl flex-shrink-0">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Input GST Credit (ITC)</span>
                  <span className="text-xl sm:text-2xl font-black text-slate-800 block mt-1">
                    {formatRupee(gstDetails.inputGST)}
                  </span>
                  <span className="text-[10px] text-slate-450 mt-1 block font-bold">
                    CGST: {formatRupee(gstDetails.inputCGST)} | SGST: {formatRupee(gstDetails.inputSGST)}
                  </span>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-650 border border-indigo-100 rounded-xl flex-shrink-0">
                  <ArrowDownLeft className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">GST Net Payable</span>
                  <span className={`text-xl sm:text-2xl font-black block mt-1 ${
                    gstDetails.gstPayable >= 0 ? 'text-rose-650' : 'text-emerald-700'
                  }`}>
                    {formatRupee(gstDetails.gstPayable)}
                  </span>
                  <span className="text-[10px] text-slate-450 mt-1 block font-bold">
                    {gstDetails.gstPayable >= 0 ? 'Due to Government' : 'Carried Forward ITC'}
                  </span>
                </div>
                <div className={`p-3 rounded-xl border flex-shrink-0 ${
                  gstDetails.gstPayable >= 0 ? 'bg-rose-50 text-rose-650 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                }`}>
                  <Percent className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Info notice banner */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 flex gap-4 border border-slate-800 shadow-md">
              <Info className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs sm:text-sm">
                <h4 className="font-extrabold text-emerald-400">Reconciliation Information</h4>
                <p className="leading-relaxed font-semibold text-slate-350">
                  TechSentinals ERP automatically reconciles GSTR-1 outward sales tax logs with GSTR-2 vendor purchase tax invoices. Net payable equals output tax liability minus eligible input tax credits.
                </p>
              </div>
            </div>

            {/* GST Summary graphic or table */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-6 sm:p-8 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 tracking-tight mb-4">GST Tax Breakdown Rates</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { title: 'CGST (Central Tax)', out: gstDetails.outputCGST, inp: gstDetails.inputCGST, net: gstDetails.outputCGST - gstDetails.inputCGST },
                  { title: 'SGST (State Tax)', out: gstDetails.outputSGST, inp: gstDetails.inputSGST, net: gstDetails.outputSGST - gstDetails.inputSGST },
                  { title: 'IGST (Integrated Tax)', out: gstDetails.outputIGST, inp: gstDetails.inputIGST, net: gstDetails.outputIGST - gstDetails.inputIGST }
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">{item.title}</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between font-semibold text-slate-550">
                        <span>GST Collected (Out):</span>
                        <span>{formatRupee(item.out)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-slate-550">
                        <span>ITC Paid (In):</span>
                        <span>{formatRupee(item.inp)}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-200 pt-2.5 font-bold text-slate-850">
                        <span>Net Payable:</span>
                        <span className={item.net >= 0 ? 'text-rose-600' : 'text-emerald-650'}>
                          {formatRupee(item.net)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gstr1' && (
          <div className="space-y-6">
            {/* GSTR-1 Summaries */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Outward B2B Invoices</span>
                <span className="text-lg font-black text-slate-800 mt-1 block">{gstr1Summary.totalOutwardB2B} Invoices</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Outward Taxable Value</span>
                <span className="text-lg font-black text-slate-800 mt-1 block">{formatRupee(gstr1Summary.taxableValue)}</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Total Output GST Collected</span>
                <span className="text-lg font-black text-emerald-600 mt-1 block">{formatRupee(gstr1Summary.totalTax)}</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Filing State Status</span>
                <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[10px] font-bold mt-1">Ready to Upload</span>
              </div>
            </div>

            {/* Sales invoices list */}
            <DataTable
              columns={[
                { header: 'Invoice No', key: 'invoiceNo', className: 'font-mono font-bold text-slate-800' },
                { header: 'Date', key: 'date', render: (row) => fmtDate(row.date) },
                { header: 'Customer Client', key: 'counterParty', className: 'font-bold text-slate-700' },
                { header: 'Tax Rate', key: 'rate' },
                { header: 'Taxable Amt', key: 'taxableValue', className: 'text-right', render: (row) => formatRupee(row.taxableValue) },
                { header: 'CGST (9%)', key: 'cgst', className: 'text-right', render: (row) => formatRupee(row.cgst) },
                { header: 'SGST (9%)', key: 'sgst', className: 'text-right', render: (row) => formatRupee(row.sgst) },
                { header: 'GST Total', key: 'total', className: 'font-black text-right text-slate-850', render: (row) => formatRupee(row.cgst + row.sgst) }
              ]}
              data={salesLedgerInvoices}
              emptyTitle="No invoices for GSTR-1"
              emptyDescription="No sales invoice recorded in this period."
            />
          </div>
        )}

        {activeTab === 'gstr2' && (
          <div className="space-y-6">
            {/* GSTR-2 Summaries */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Inward Procurement bills</span>
                <span className="text-lg font-black text-slate-800 mt-1 block">{gstr2Summary.totalInwardInvoices} Bills</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Inward Taxable Value</span>
                <span className="text-lg font-black text-slate-800 mt-1 block">{formatRupee(gstr2Summary.taxableValue)}</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Total Input ITC Claims</span>
                <span className="text-lg font-black text-indigo-650 mt-1 block">{formatRupee(gstr2Summary.totalITC)}</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase block">ITC Match Rate</span>
                <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-bold mt-1">100% Reconciled</span>
              </div>
            </div>

            {/* Purchase invoices list */}
            <DataTable
              columns={[
                { header: 'Invoice Reference', key: 'invoiceNo', className: 'font-mono font-bold text-slate-800' },
                { header: 'Date', key: 'date', render: (row) => fmtDate(row.date) },
                { header: 'Supplier Vendor', key: 'counterParty', className: 'font-bold text-slate-700' },
                { header: 'Tax Rate', key: 'rate' },
                { header: 'Taxable Purchase', key: 'taxableValue', className: 'text-right', render: (row) => formatRupee(row.taxableValue) },
                { header: 'CGST (9%)', key: 'cgst', className: 'text-right', render: (row) => formatRupee(row.cgst) },
                { header: 'SGST (9%)', key: 'sgst', className: 'text-right', render: (row) => formatRupee(row.sgst) },
                { header: 'ITC Credit Value', key: 'total', className: 'font-black text-right text-indigo-650', render: (row) => formatRupee(row.cgst + row.sgst) }
              ]}
              data={purchaseLedgerInvoices}
              emptyTitle="No invoices for GSTR-2"
              emptyDescription="No purchase invoice recorded in this period."
            />
          </div>
        )}

        {activeTab === 'gstr3b' && (
          <div className="space-y-6">
            {/* GSTR-3B consolidated return template */}
            <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center flex-wrap gap-3">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-800">GSTR-3B Self-Assessment consolidated Summary</h3>
                  <p className="text-[11px] text-slate-450 font-semibold mt-0.5">Summary of outward taxable supplies and eligible ITC claim offsets.</p>
                </div>
                <span className="bg-[#0A0F1F] text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer hover:bg-slate-850 transition-colors">
                  Prepare JSON Schema
                </span>
              </div>

              <div className="p-6 space-y-6">
                <div className="overflow-x-auto w-full border border-slate-200 rounded-2xl">
                  <table className="w-full text-xs sm:text-sm text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-widest text-slate-450 border-b border-slate-200">
                        <th className="px-6 py-3.5">Details of Supplies</th>
                        <th className="px-6 py-3.5 text-right">Total Taxable Value</th>
                        <th className="px-6 py-3.5 text-right">Integrated Tax (IGST)</th>
                        <th className="px-6 py-3.5 text-right">Central Tax (CGST)</th>
                        <th className="px-6 py-3.5 text-right">State Tax (SGST)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-650 font-semibold">
                      <tr>
                        <td className="px-6 py-3.5 font-bold text-slate-750">3.1 Outward Taxable supplies (other than zero rated, nil rated)</td>
                        <td className="px-6 py-3.5 text-right">{formatRupee(gstr3bDetails.outTaxable)}</td>
                        <td className="px-6 py-3.5 text-right">{formatRupee(gstr3bDetails.outIGST)}</td>
                        <td className="px-6 py-3.5 text-right">{formatRupee(gstr3bDetails.outCGST)}</td>
                        <td className="px-6 py-3.5 text-right">{formatRupee(gstr3bDetails.outSGST)}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-3.5 font-bold text-slate-750">4. Eligible Input Tax Credit (ITC Available)</td>
                        <td className="px-6 py-3.5 text-right">{formatRupee(gstr3bDetails.inTaxable)}</td>
                        <td className="px-6 py-3.5 text-right">{formatRupee(gstr3bDetails.inIGST)}</td>
                        <td className="px-6 py-3.5 text-right">{formatRupee(gstr3bDetails.inCGST)}</td>
                        <td className="px-6 py-3.5 text-right">{formatRupee(gstr3bDetails.inSGST)}</td>
                      </tr>
                      {/* Net Payable Row */}
                      <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200 text-xs">
                        <td className="px-6 py-4.5 text-slate-800">5. Net Tax Payable (3.1 Outward Liability minus 4. ITC Credit)</td>
                        <td className="px-6 py-4.5 text-right">—</td>
                        <td className="px-6 py-4.5 text-right">{formatRupee(gstr3bDetails.netIGST)}</td>
                        <td className="px-6 py-4.5 text-right font-black text-rose-650">
                          {formatRupee(gstr3bDetails.netCGST)}
                        </td>
                        <td className="px-6 py-4.5 text-right font-black text-rose-650">
                          {formatRupee(gstr3bDetails.netSGST)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4.5 text-amber-850 text-xs font-semibold">
                  <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div className="leading-relaxed">
                    Note: A negative value in Section 5 indicates an excess Input Tax Credit (ITC) balance. This will be carried forward to next month's electronic credit ledger instead of triggering cash pay liability.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="space-y-6">
            {/* Search and filter tools */}
            <div className="flex flex-col sm:flex-row gap-3">
              <SearchBar value={ledgerSearch} onChange={setLedgerSearch} placeholder="Search GST ledger by ID, client/supplier..." />
              <FilterBar
                showFilters={showFilters}
                onToggle={() => setShowFilters(!showFilters)}
                onClear={clearLedgerFilters}
                hasActiveFilters={Object.values(ledgerFilters).some(v => v !== '')}
              >
                <div>
                  <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest mb-1.5 block">Tax Entry Type</label>
                  <select
                    value={ledgerFilters.type}
                    onChange={e => setLedgerFilter('type', e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white cursor-pointer"
                  >
                    <option value="">All Types</option>
                    <option value="Sales">Sales (GSTR-1)</option>
                    <option value="Purchase">Purchase (GSTR-2)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-widest mb-1.5 block">Audit State</label>
                  <select
                    value={ledgerFilters.status}
                    onChange={e => setLedgerFilter('status', e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white cursor-pointer"
                  >
                    <option value="">All States</option>
                    <option value="Filed">Filed</option>
                    <option value="Reconciled">Reconciled</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </FilterBar>
            </div>

            <DataTable
              columns={[
                { header: 'Reference No', key: 'invoiceNo', className: 'font-mono font-bold text-slate-800' },
                { header: 'Date', key: 'date', render: (row) => fmtDate(row.date) },
                { header: 'Type Ledger', key: 'type', className: 'font-bold' },
                { header: 'Counterparty client/supplier', key: 'counterParty', className: 'font-bold text-slate-700' },
                { header: 'Taxable base', key: 'taxableValue', className: 'text-right', render: (row) => formatRupee(row.taxableValue) },
                { header: 'CGST (9%)', key: 'cgst', className: 'text-right', render: (row) => formatRupee(row.cgst) },
                { header: 'SGST (9%)', key: 'sgst', className: 'text-right', render: (row) => formatRupee(row.sgst) },
                { header: 'Audit Status', key: 'status', render: (row) => <StatusBadge status={row.status} /> }
              ]}
              data={ledgerData}
              emptyTitle="No GST ledger logs found"
              emptyDescription="No match found matching your search term."
            />

            <Pagination
              totalItems={ledgerTotal}
              itemsPerPage={ledgerLimit}
              currentPage={ledgerPage}
              onPageChange={setLedgerPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GstReports;
