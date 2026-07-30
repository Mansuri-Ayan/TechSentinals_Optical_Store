import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search, Store, ShoppingCart, UserCheck, ChevronRight,
  X, Package, Clock, Users, DollarSign, Printer, Calendar,
  RefreshCw, RotateCcw, AlertTriangle, ArrowRightLeft, Check, Plus, Minus,
  Glasses, Eye, ShoppingBag
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useExchanges } from '../../hooks/useExchanges';
import { useStores } from '../../hooks/useStores';
import { useStoreStore, useAuthStore } from '../../store/store';
import Pagination from '../../components/shared/Pagination';
import { useRoleContext } from '../../hooks/useRoleContext';
import { usePagePermissions } from '../../hooks/usePermissions';
import { useCategories, useSubcategories } from '../../hooks/useCategories';
import { getSalesApi } from '../../api/sales/sales.api';
import { getInventoryApi, getUniversalInventoryApi } from '../../api/inventory/inventory.api';
import { createExchangeApi, cancelExchangeApi, getExchangeReceiptApi } from '../../api/exchange/exchange.api';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_CFG = {
  COMPLETED: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  CANCELLED: { color: 'text-slate-600 bg-slate-100 border-slate-200', dot: 'bg-slate-400' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.COMPLETED;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
};

const Exchanges = () => {
  const [searchParams] = useSearchParams();
  const queryBranch = searchParams.get('branch');
  const queryStatus = searchParams.get('status');

  const { storeId, buildPath, showStoreSwitcher, isPathAdmin } = useRoleContext();
  const { selectedStore } = useStoreStore();
  const perms = usePagePermissions('exchanges');

  const [selectedBranch, setSelectedBranch] = useState(queryBranch || storeId || 'All');
  const [selectedStatus, setSelectedStatus] = useState(queryStatus || 'All');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedExchange, setSelectedExchange] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [receiptHtml, setReceiptHtml] = useState(null);

  const { stores } = useStores();

  useEffect(() => {
    if (isPathAdmin && selectedStore && selectedStore.id !== 'admin') {
      setSelectedBranch(selectedStore.id);
    }
  }, [selectedStore, isPathAdmin]);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    if (queryBranch) setSelectedBranch(queryBranch);
    if (queryStatus) setSelectedStatus(queryStatus);
  }, [queryBranch, queryStatus]);

  // Reset page when filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBranch, selectedStatus, searchTerm, dateFrom, dateTo]);

  // Close notifications dropdown and hide bell when drawer or modal is opened
  useEffect(() => {
    if (selectedExchange || showNewModal) {
      window.dispatchEvent(new CustomEvent('close-notifications'));
      window.dispatchEvent(new CustomEvent('hide-notification-bell'));
    } else {
      window.dispatchEvent(new CustomEvent('show-notification-bell'));
    }
    return () => {
      window.dispatchEvent(new CustomEvent('show-notification-bell'));
    };
  }, [selectedExchange, showNewModal]);

  // Fetch exchanges from backend
  const { exchanges, total, pages, isLoading, exchangesQuery } = useExchanges({
    page: currentPage,
    limit: 8,
    storeId: selectedBranch,
    status: selectedStatus,
    search: searchTerm,
    dateFrom,
    dateTo,
  });

  const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const handlePrintReceipt = async (exchangeId) => {
    try {
      const res = await getExchangeReceiptApi(exchangeId);
      if (res && res.html_content) {
        const printWindow = window.open('', '_blank', 'width=800,height=800');
        printWindow.document.write(res.html_content);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      } else {
        toast.error("Failed to generate exchange receipt HTML.");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error loading exchange receipt.");
    }
  };

  const handleCancelExchange = async (exchangeId) => {
    if (!window.confirm("Are you sure you want to cancel this exchange? This will reverse all inventory and payment movements.")) return;
    try {
      await cancelExchangeApi(exchangeId);
      toast.success("Exchange cancelled successfully.");
      exchangesQuery.refetch();
      if (selectedExchange?.id === exchangeId) {
        setSelectedExchange(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to cancel exchange.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans overflow-x-hidden">
      {/* Breadcrumb + Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 space-x-2">
          <Link to={buildPath('dashboard')} className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-semibold">Exchanges</span>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight flex items-center gap-2">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin-slow" />
              Inventory Exchanges
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm sm:text-base">
              Manage product returns, generate exchange credits, and record replacement item logs.
            </p>
          </div>
          {perms.canCreate && (
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              New Exchange
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {showStoreSwitcher && (
            <>
              <label className="text-sm font-semibold text-slate-600 flex items-center gap-1.5 whitespace-nowrap">
                <Store className="w-4 h-4 text-slate-400" /> Branch:
              </label>
              <div className="relative w-full sm:w-48">
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white appearance-none pr-8 cursor-pointer"
                >
                  <option value="All">All Branches</option>
                  {stores.filter(s => s.id !== 'admin' && s.store_name !== 'All Store' && s.name !== 'All Store').map(store => (
                    <option key={store.id} value={store.id}>{store.store_name}</option>
                  ))}
                </select>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
              </div>
            </>
          )}

          <label className="text-sm font-semibold text-slate-600 flex items-center gap-1.5 whitespace-nowrap sm:ml-4">
            <Calendar className="w-4 h-4 text-slate-400" /> Dates:
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-2 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
            />
            <span className="text-slate-400 text-xs font-semibold">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-2 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md w-full">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by customer, exchange #..."
            className="w-full pl-10 pr-9 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white transition-all placeholder:text-slate-400 shadow-sm"
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Exchanges List / Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          <p className="text-slate-500 text-sm mt-4">Loading exchanges...</p>
        </div>
      ) : exchanges.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <Package className="w-6 h-6 text-slate-300" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No exchange records found</h3>
          <p className="text-slate-500 text-sm mb-4">Try clearing filters or checking other stores.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden lg:block border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Exchange #', 'Customer', 'Original Item', 'Exchange Credit', 'New Total', 'Additional Paid', 'Date', 'Status', 'Actions'].map(col => (
                    <th key={col} className={`px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap ${col === 'Actions' ? 'text-right' : 'text-left'}`}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {exchanges.map((exc) => (
                  <tr
                    key={exc.id}
                    onClick={() => setSelectedExchange(exc)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4 text-xs font-mono font-bold text-slate-700 whitespace-nowrap">{exc.exchange_number}</td>
                    <td className="px-5 py-4 font-bold text-slate-900">{exc.customer_name || 'Walk-in Customer'}</td>
                    <td className="px-5 py-4 font-medium text-slate-600 max-w-[200px] truncate">{exc.original_product_name || '—'}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-emerald-600">{fmt(exc.exchange_credit)}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">{fmt(exc.new_items_total)}</td>
                    <td className="px-5 py-4 text-sm font-black text-slate-900">{fmt(exc.additional_payment)}</td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-500 whitespace-nowrap">{fmtDate(exc.exchange_date)}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={exc.status} />
                    </td>
                    <td className="px-5 py-4 text-right flex items-center justify-end gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintReceipt(exc.id);
                        }}
                        className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg transition-colors cursor-pointer border border-slate-200"
                        title="Print Receipt"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      {exc.status === 'COMPLETED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelExchange(exc.id);
                          }}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors cursor-pointer border border-red-100"
                          title="Cancel/Reverse Exchange"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {exchanges.map((exc) => (
              <div
                key={exc.id}
                onClick={() => setSelectedExchange(exc)}
                className="bg-white p-4 border border-slate-100 rounded-2xl shadow-sm space-y-3 cursor-pointer hover:border-slate-350 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400">{exc.exchange_number}</span>
                    <h3 className="font-bold text-slate-950 text-sm mt-0.5">{exc.customer_name || 'Walk-in Customer'}</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrintReceipt(exc.id);
                      }}
                      className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg transition-colors cursor-pointer border border-slate-200"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <StatusBadge status={exc.status} />
                  </div>
                </div>

                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Returned Item:</span> {exc.original_product_name || '—'}
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block">Credit Value</span>
                    <span className="font-bold text-emerald-600">{fmt(exc.exchange_credit)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Additional Paid</span>
                    <span className="font-black text-slate-950">{fmt(exc.additional_payment)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Exchange Date</span>
                    <span className="font-bold text-slate-700">{fmtDate(exc.exchange_date)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            totalItems={total}
            itemsPerPage={8}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Exchange Detail Drawer */}
      {selectedExchange && (
        <ExchangeDetailDrawer
          exchange={selectedExchange}
          onClose={() => setSelectedExchange(null)}
          onPrint={handlePrintReceipt}
          onCancel={handleCancelExchange}
          canDelete={perms.canDelete}
        />
      )}

      {/* New Exchange Wizard Modal */}
      {showNewModal && (
        <NewExchangeWizard
          isOpen={showNewModal}
          onClose={() => setShowNewModal(false)}
          storeId={storeId === 'admin' ? selectedBranch : storeId}
          onSuccess={() => {
            setShowNewModal(false);
            exchangesQuery.refetch();
          }}
        />
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   EXCHANGE DETAIL DRAWER
   Visual drawer showing the details of the selected exchange
───────────────────────────────────────────────────────── */
const ExchangeDetailDrawer = ({ exchange, onClose, onPrint, onCancel, canDelete }) => {
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReceipt = async () => {
      setLoading(true);
      try {
        const res = await getExchangeReceiptApi(exchange.id);
        setReceipt(res.html_content);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReceipt();
  }, [exchange]);

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const handleDownloadPdf = () => {
    if (!receipt) return;
    const printWindow = window.open('', '_blank', 'width=800,height=800');
    printWindow.document.write(receipt);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const handleWhatsAppShare = () => {
    const text = [
      `📄 *Exchange Receipt — ${exchange.exchange_number}*`,
      `👤 Customer: ${exchange.customer_name || 'Walk-in Customer'}`,
      `📅 Date: ${new Date(exchange.exchange_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}`,
      ``,
      `🔄 *Returned Item:* ${exchange.original_product_name || '—'}`,
      `💰 Exchange Credit: ${fmt(exchange.exchange_credit)}`,
      ``,
      `🛒 *Replacement Items:*`,
      ...(exchange.new_sale?.items?.map(item =>
        `  • ${item.product_name} (x${item.quantity}) — ${fmt(item.line_total)}`
      ) || []),
      ``,
      `💵 New Total: ${fmt(exchange.new_items_total)}`,
      `✅ Additional Paid: ${fmt(exchange.additional_payment)}`,
      ``,
      `Status: ${exchange.status}`,
    ].join('\n');
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white text-slate-700 w-full max-w-xl h-full shadow-2xl flex flex-col animate-slide-left border-l border-slate-200">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50">
          <div>
            <span className="text-[10px] font-mono font-semibold tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase">
              Exchange Logs
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-1.5">{exchange.exchange_number}</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDownloadPdf}
              className="p-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded-xl transition-colors text-slate-700"
              title="Print / Download PDF"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={handleWhatsAppShare}
              className="p-2 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 rounded-xl transition-colors text-emerald-700"
              title="Share via WhatsApp"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status Alert */}
          {exchange.status === 'CANCELLED' && (
            <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Exchange Cancelled</p>
                <p className="text-xs opacity-80 mt-0.5">This transaction has been reversed. Inventory counts have been updated accordingly.</p>
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer</span>
              <span className="font-semibold text-slate-900 mt-1 block">{exchange.customer_name || 'Walk-in Customer'}</span>
              {exchange.customer_phone && <span className="text-xs text-slate-500 mt-0.5 block">{exchange.customer_phone}</span>}
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Exchange Date</span>
              <span className="font-semibold text-slate-900 mt-1 block">
                {new Date(exchange.exchange_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
              </span>
            </div>
          </div>

          {/* Financial details */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3.5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Financial Breakdown</h3>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Original Item Value</span>
              <span className="font-semibold text-red-600">₹{Number(exchange.original_item_value).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Replacement Items Total</span>
              <span className="font-semibold text-slate-900">₹{Number(exchange.new_items_total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-200 pt-3">
              <span className="text-slate-500 font-bold">Exchange Credit Applied</span>
              <span className="font-bold text-emerald-600">- ₹{Number(exchange.exchange_credit).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-200 pt-3">
              <span className="text-slate-900 font-black">Additional Amount Paid</span>
              <span className="font-black text-slate-900 text-base">₹{Number(exchange.additional_payment).toFixed(2)}</span>
            </div>
          </div>

          {/* Returned Item Info */}
          <div className="border border-red-100 rounded-2xl p-4 bg-red-50/50">
            <h4 className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-2">Returned Item (EXCHANGE IN)</h4>
            <p className="font-bold text-slate-900 text-sm">{exchange.original_product_name}</p>
            <p className="text-xs text-slate-500 mt-1">SKU: {exchange.original_product_sku || '—'}</p>
          </div>

          {/* Replacement Items list */}
          <div className="border border-blue-100 rounded-2xl p-4 bg-blue-50/50">
            <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">Issued Replacement Items (EXCHANGE OUT)</h4>
            <div className="space-y-3">
              {exchange.new_sale?.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{item.product_name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Qty: {item.quantity} · Price: {fmt(item.unit_price)}</p>
                  </div>
                  <span className="font-bold text-slate-900">{fmt(item.line_total)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive HTML Receipt Preview */}
          {receipt && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white p-4">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Live Receipt Preview</h4>
              <div 
                className="overflow-y-auto max-h-[300px] hide-scrollbar border border-slate-100 rounded-xl"
                dangerouslySetInnerHTML={{ __html: receipt }} 
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {exchange.status === 'COMPLETED' && canDelete && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
            <button
              onClick={() => onCancel(exchange.id)}
              className="px-5 py-2.5 border border-red-200 hover:border-red-300 text-red-600 hover:bg-red-50 rounded-xl text-sm font-semibold transition-colors cursor-pointer w-full"
            >
              Cancel & Reverse Exchange
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   WIZARD CATALOG CARD HELPERS
───────────────────────────────────────────────────────── */
const WIZARD_GRAD_PALETTE = [
  "from-blue-400 to-indigo-600",
  "from-emerald-400 to-teal-600",
  "from-purple-400 to-violet-600",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-600",
  "from-cyan-400 to-sky-600",
];

const getWizardStockStatus = (item) => {
  const qty = Number(item.available_quantity ?? item.quantity ?? 0);
  const reorder = Number(item.reorder_level ?? 0);
  if (qty === 0) return "out_of_stock";
  const threshold = reorder > 0 ? reorder : 10;
  if (qty <= threshold) return "low_stock";
  return "in_stock";
};

const getWizardCategoryConfig = (name) => {
  const normalized = (name || "").toLowerCase();
  if (normalized.includes("frame")) {
    return {
      icon: Glasses,
      badge: "bg-blue-50 text-blue-700 border-blue-200",
      color: "blue",
    };
  }
  if (normalized.includes("lens") && !normalized.includes("contact")) {
    return {
      icon: Eye,
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      color: "emerald",
    };
  }
  if (normalized.includes("sunglass")) {
    return {
      icon: Glasses,
      badge: "bg-amber-50 text-amber-700 border-amber-200",
      color: "amber",
    };
  }
  if (normalized.includes("contact")) {
    return {
      icon: Eye,
      badge: "bg-cyan-50 text-cyan-700 border-cyan-200",
      color: "cyan",
    };
  }
  return {
    icon: ShoppingBag,
    badge: "bg-purple-50 text-purple-700 border-purple-200",
    color: "purple",
  };
};

const wizardStatusConfig = {
  in_stock: {
    label: "In Stock",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
  },
  low_stock: {
    label: "Low Stock",
    color: "text-amber-700 bg-amber-50 border-amber-200",
    dot: "bg-amber-500",
  },
  out_of_stock: {
    label: "Out of Stock",
    color: "text-red-700 bg-red-50 border-red-200",
    dot: "bg-red-500",
  },
};

const StockStatusBadge = ({ status }) => {
  const sc = wizardStatusConfig[status] || wizardStatusConfig["in_stock"];
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${sc.color}`}
    >
      <span className={`w-1 h-1 rounded-full ${sc.dot} flex-shrink-0`} />
      {sc.label}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────
   NEW EXCHANGE WIZARD MODAL
   Wizard guiding the user through:
   1. Search Sale
   2. Select item to return
   3. Choose replacement items
   4. Add payment details
   5. Confirm exchange
───────────────────────────────────────────────────────── */
const NewExchangeWizard = ({ isOpen, onClose, storeId, onSuccess }) => {
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sales, setSales] = useState([]);
  const [searchingSales, setSearchingSales] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  
  // Return Selection
  const [returnedItems, setReturnedItems] = useState([]);

  // Replacement Items (Cart)
  const [cart, setCart] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeSubcategory, setActiveSubcategory] = useState('');

  const { categories } = useCategories(null, { limit: 1000, paginate: false, all_tenant: true });
  const { subcategories } = useSubcategories(
    activeCategory !== 'all' ? Number(activeCategory) : null,
    null,
    { limit: 1000, paginate: false }
  );

  // Payment splits
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [refNum, setRefNum] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch store inventory for product catalog selection (Universal search shows ALL products across categories)
  useEffect(() => {
    if (!isOpen) return;
    const targetStoreId = selectedSale?.store_id || selectedSale?.store?.id || storeId;
    const isWarehouse = targetStoreId === 'admin' || targetStoreId === 0 || targetStoreId === '0';
    const storeIdNum = Number(targetStoreId);

    const fetchInventory = async () => {
      setLoadingInventory(true);
      try {
        const ownerType = isWarehouse ? 'ADMIN' : 'STORE';
        const ownerId = isWarehouse ? undefined : (isNaN(storeIdNum) ? undefined : storeIdNum);
        
        let res;
        try {
          res = await getUniversalInventoryApi({
            owner_type: ownerType,
            owner_id: ownerId,
            paginate: false,
            limit: 500,
            search: inventorySearch || undefined,
            category_id: activeCategory !== 'all' ? Number(activeCategory) : undefined,
            subcategory_id: activeSubcategory ? Number(activeSubcategory) : undefined,
          });
        } catch (e) {
          res = await getInventoryApi({
            owner_type: ownerType,
            owner_id: ownerId,
            paginate: false,
            limit: 500,
            search: inventorySearch || undefined,
            category_id: activeCategory !== 'all' ? Number(activeCategory) : undefined,
            subcategory_id: activeSubcategory ? Number(activeSubcategory) : undefined,
          });
        }

        const itemsArray = Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : []);
        setInventory(itemsArray);
      } catch (err) {
        console.error("Failed to fetch inventory in exchange wizard:", err);
        setInventory([]);
      } finally {
        setLoadingInventory(false);
      }
    };

    const timer = setTimeout(() => {
      fetchInventory();
    }, 300);

    return () => clearTimeout(timer);
  }, [isOpen, storeId, selectedSale?.store_id, selectedSale?.store?.id, inventorySearch, activeCategory, activeSubcategory]);

  const searchSales = async (q = searchQuery) => {
    setSearchingSales(true);
    try {
      const res = await getSalesApi({
        search: q.trim() || undefined,
        store_id: storeId !== 'admin' ? storeId : undefined,
        paginate: false,
      });
      
      const mapped = (res || []).map(item => {
        let paymentStatus = 'Unpaid';
        const due = Number(item.due_amount || 0);
        const paid = Number(item.paid_amount || 0);
        if (due <= 0) {
          paymentStatus = 'Paid';
        } else if (paid > 0) {
          paymentStatus = 'Partially Paid';
        }

        const paymentMethod = item.payments && item.payments.length > 0
          ? item.payments.map(p => p.payment_method).join(' + ')
          : 'Credit';

        return {
          ...item,
          orderId: item.invoice_number,
          orderDate: item.sale_date,
          customerName: item.customer_name,
          customerPhone: item.customer_phone,
          customerAddress: item.customer_address,
          branchName: item.store_name,
          staffName: item.staff_name,
          staffCode: item.staff_code,
          staffRole: item.staff_role,
          productName: item.product_name,
          productCategory: item.product_category,
          productSubcategory: item.product_subcategory,
          productQuantity: item.product_quantity,
          productPrice: item.product_price,
          paymentStatus,
          paymentMethod,
          totalAmount: item.total_amount,
          subtotal: item.subtotal,
          discountAmount: item.discount_amount,
          paidAmount: item.paid_amount,
          dueAmount: item.due_amount,
          type: 'sales',
        };
      });

      const activeSales = mapped.filter(s => {
        const status = (s.status || '').toUpperCase();
        return status !== 'CANCELLED' && status !== 'REFUNDED' && status !== 'RETURNED';
      });
      setSales(activeSales);
    } catch (err) {
      toast.error("Failed to search sales.");
    } finally {
      setSearchingSales(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      searchSales('');
    }
  }, [isOpen, storeId]);

  const handleSelectSale = (sale) => {
    setSelectedSale(sale);
    setReturnedItems([]);
    setStep(2);
  };

  const handleSelectReturnedItem = (item) => {
    setReturnedItems(prev => {
      const exists = prev.some(i => i.id === item.id);
      if (exists) {
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, { ...item, exchange_quantity: Number(item.quantity || 1) }];
      }
    });
  };

  const updateReturnedItemQty = (itemId, newQty) => {
    setReturnedItems(prev => prev.map(i => {
      if (i.id !== itemId) return i;
      const maxQty = Number(i.quantity || 1);
      const validQty = Math.max(1, Math.min(maxQty, Number(newQty)));
      return { ...i, exchange_quantity: validQty };
    }));
  };

  // Cart operations
  const addToCart = (item) => {
    const prodId = item.product_id || item.id;
    const invId = item.id || item.inventory_id;
    const availQty = Number(item.available_quantity ?? item.quantity ?? 9999);

    setCart(prev => {
      const existing = prev.find(i => i.product_id === prodId);
      if (existing) {
        if (availQty > 0 && existing.quantity >= availQty) {
          toast.warning(`Cannot exceed available stock (${availQty})`);
          return prev;
        }
        return prev.map(i => i.product_id === prodId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        product_id: prodId,
        inventory_id: invId,
        name: item.product_name || item.name || 'Product',
        unit_price: Number(item.selling_price || item.price || 0),
        available_quantity: availQty,
        quantity: 1,
        tax_percent: 0,
        discount_percent: Number(item.discount_percent || 0),
      }];
    });
  };

  const updateCartQty = (productId, qty) => {
    const item = cart.find(i => i.product_id === productId);
    if (!item) return;
    if (item.available_quantity > 0 && qty > item.available_quantity) {
      toast.warning(`Cannot exceed available stock (${item.available_quantity})`);
      return;
    }
    if (qty < 1) {
      setCart(prev => prev.filter(i => i.product_id !== productId));
      return;
    }
    setCart(prev => prev.map(i => i.product_id === productId ? { ...i, quantity: qty } : i));
  };

  // Calculations
  const returnCredit = returnedItems.reduce((sum, item) => {
    const itemTotal = Number(item.line_total || 0);
    const maxQty = Number(item.quantity || 1);
    const exQty = Number(item.exchange_quantity || maxQty);
    const lineCredit = (itemTotal / maxQty) * exQty;
    return sum + lineCredit;
  }, 0);

  const cartTotal = cart.reduce((sum, item) => {
    const base = item.unit_price * item.quantity;
    const afterDisc = base * (1 - item.discount_percent / 100);
    const withTax = afterDisc * (1 + item.tax_percent / 100);
    return sum + withTax;
  }, 0);

  const additionalPaymentNeeded = Math.max(cartTotal - returnCredit, 0);

  const handleCompleteExchange = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        store_id: Number(selectedSale.store_id),
        customer_id: selectedSale.customer_id,
        original_sale_id: selectedSale.id,
        original_sale_item_ids: returnedItems.map(item => item.id),
        returned_items: returnedItems.map(item => ({
          sale_item_id: item.id,
          quantity: Number(item.exchange_quantity || item.quantity || 1)
        })),
        new_items: cart.map(item => ({
          product_id: item.product_id,
          inventory_id: item.inventory_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          tax_percent: item.tax_percent,
        })),
        payments: additionalPaymentNeeded > 0 ? [{
          amount: additionalPaymentNeeded,
          payment_method: paymentMethod,
          reference_number: refNum || null,
        }] : [],
        processed_by_type: (() => {
          const r = (user?.role || '').toLowerCase();
          if (r.includes('admin') || r.includes('owner')) return 'ADMIN';
          if (r.includes('manager')) return 'MANAGER';
          if (r.includes('optician')) return 'OPTICIAN';
          return 'WORKER';
        })(),
        processed_by_id: Number(user?.id || 1),
        exchange_date: new Date().toISOString().split('T')[0],
        reason: remarks || "Exchange items",
      };

      await createExchangeApi(payload);
      toast.success("Exchange processed successfully.");
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create exchange.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInventory = Array.isArray(inventory) ? inventory.map(item => {
    const prodName = item.product_name || item.name || 'Product';
    const prodSku = item.product_sku || item.sku || 'N/A';
    const categoryName = item.category_name || (typeof item.category === 'object' ? item.category?.name : item.category) || 'General';
    const subcategoryName = item.subcategory_name || (typeof item.subcategory === 'object' ? item.subcategory?.name : item.subcategory) || '';
    const brandName = item.brand_name || (typeof item.brand === 'object' ? item.brand?.name : item.brand) || '';
    const availQty = Number(item.available_quantity ?? item.quantity ?? 0);
    const priceVal = Number(item.selling_price ?? item.price ?? 0);

    return {
      ...item,
      product_id: item.product_id || item.id,
      id: item.id || item.inventory_id,
      product_name: prodName,
      sku: prodSku,
      category: categoryName,
      subcategory: subcategoryName,
      brand: brandName,
      image: item.image_url || item.image,
      quantity: availQty,
      available_quantity: availQty,
      selling_price: priceVal,
      store: item.owner_name || 'Store',
      supplier: item.supplier_name || 'No Supplier',
    };
  }).filter(item => {
    if (!item) return false;
    const name = (item.product_name || '').toLowerCase();
    const sku = (item.sku || '').toLowerCase();
    const query = (inventorySearch || '').toLowerCase();
    const matchesQuery = name.includes(query) || sku.includes(query);
    if (!matchesQuery) return false;

    if (activeCategory !== 'all') {
      const catId = String(item.category_id || item.product?.category_id || item.category?.id || '');
      const catName = String(item.category || item.category_name || item.product?.category_name || '').toLowerCase();
      const selCat = (categories || []).find(c => String(c.id) === String(activeCategory));
      const selCatName = (selCat?.name || '').toLowerCase();
      if (catId) {
        if (catId !== String(activeCategory)) return false;
      } else if (selCatName && catName) {
        if (!catName.includes(selCatName) && !selCatName.includes(catName)) return false;
      }
    }

    if (activeSubcategory) {
      const subCatId = String(item.subcategory_id || item.product?.subcategory_id || item.subcategory?.id || '');
      const subCatName = String(item.subcategory || item.subcategory_name || item.product?.subcategory_name || '').toLowerCase();
      const selSub = (subcategories || []).find(s => String(s.id) === String(activeSubcategory));
      const selSubName = (selSub?.name || '').toLowerCase();
      if (subCatId) {
        if (subCatId !== String(activeSubcategory)) return false;
      } else if (selSubName && subCatName) {
        if (!subCatName.includes(selSubName) && !selSubName.includes(subCatName)) return false;
      }
    }

    return true;
  }) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog container */}
      <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Exchange Wizard</h2>
                <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">V2 Verified</span>
              </div>
              <p className="text-xs text-slate-500">Step {step} of 5: {
                step === 1 ? "Select Original Purchase Sale" :
                step === 2 ? "Select Item & Quantity to Return" :
                step === 3 ? "Select Replacement Items" :
                step === 4 ? "Additional Amount Payment" : "Review & Complete"
              }</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: Search and select original Sale */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-700">Find the customer's original receipt/sale:</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Enter Invoice number or customer phone..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
                    onKeyDown={e => e.key === 'Enter' && searchSales(searchQuery)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => searchSales(searchQuery)}
                  disabled={searchingSales}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  {searchingSales ? "Searching..." : "Search"}
                </button>
              </div>

              {sales.length > 0 ? (
                <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100">
                  {sales.map(sale => {
                    const isExchanged = sale.is_exchanged;
                    return (
                      <div
                        key={sale.id}
                        onClick={() => !isExchanged && handleSelectSale(sale)}
                        className={`p-4 transition-colors flex justify-between items-center ${
                          isExchanged
                            ? 'bg-orange-50/50 cursor-not-allowed opacity-70'
                            : 'hover:bg-slate-50 cursor-pointer'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-mono font-bold text-slate-900">{sale.invoice_number}</p>
                            {isExchanged && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold text-orange-700 bg-orange-100 border border-orange-200 uppercase tracking-wider">
                                <ArrowRightLeft className="w-2.5 h-2.5" /> Exchanged
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-slate-800 mt-1">{sale.customerName || 'Walk-in Customer'}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {sale.customerPhone && sale.customerPhone !== '—' ? `📞 ${sale.customerPhone} · ` : ''}
                            {fmtDate(sale.sale_date)} · {sale.branchName || '—'}
                          </p>
                          {sale.productName && (
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">🛍 {sale.productName}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-black text-slate-900">₹{Number(sale.total_amount).toFixed(2)}</p>
                          {isExchanged ? (
                            <span className="text-[10px] font-bold text-orange-500">Already exchanged</span>
                          ) : (
                            <span className="text-[10px] font-bold text-blue-500">Select →</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : searchQuery && !searchingSales && (
                <p className="text-center text-sm text-slate-400 py-6">No matching completed sales found.</p>
              )}
            </div>
          )}

          {/* STEP 2: Select returned item and partial quantity */}
          {step === 2 && selectedSale && (
            <div className="space-y-4 animate-fade-in">
              {/* Sale summary card */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-mono font-bold text-slate-500">{selectedSale.invoice_number}</p>
                    <p className="text-base font-bold text-slate-900 mt-0.5">{selectedSale.customerName || 'Walk-in Customer'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedSale.customerPhone && selectedSale.customerPhone !== '—' ? `📞 ${selectedSale.customerPhone} · ` : ''}
                      {fmtDate(selectedSale.sale_date)} · {selectedSale.branchName || '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">₹{Number(selectedSale.total_amount).toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{selectedSale.items?.length || 0} item(s)</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Select items & choose exchange quantity:</p>
                {returnedItems.length > 0 && (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    Total Credit: ₹{returnCredit.toFixed(2)}
                  </span>
                )}
              </div>

              <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                {selectedSale.items?.map(item => {
                  const selectedObj = returnedItems.find(i => i.id === item.id);
                  const isSelected = !!selectedObj;
                  const maxQty = Number(item.quantity || 1);
                  const exQty = selectedObj ? (selectedObj.exchange_quantity || maxQty) : maxQty;
                  const itemTotal = Number(item.line_total || 0);
                  const exCredit = (itemTotal / maxQty) * exQty;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectReturnedItem(item)}
                      className={`p-4 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer ${
                        isSelected ? 'bg-blue-50/30' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500/20 cursor-pointer"
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{item.product_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Purchased Qty: <span className="font-bold">{item.quantity}</span> · 
                            SKU: <span className="font-mono">{item.product_sku || '—'}</span>
                            {item.product_category && (
                              <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold">
                                {item.product_category}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-right flex-shrink-0 self-end sm:self-center" onClick={e => e.stopPropagation()}>
                        {isSelected && maxQty > 1 && (
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded-xl shadow-xs">
                            <span className="text-[11px] font-bold text-slate-500 mr-1">Exchange Qty:</span>
                            <button
                              type="button"
                              onClick={() => updateReturnedItemQty(item.id, exQty - 1)}
                              className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={maxQty}
                              value={exQty}
                              onChange={e => updateReturnedItemQty(item.id, Number(e.target.value))}
                              className="w-10 text-center font-extrabold text-xs text-slate-800 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateReturnedItemQty(item.id, exQty + 1)}
                              className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                            >
                              +
                            </button>
                            <span className="text-[10px] text-slate-400 font-semibold">/ {maxQty}</span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-red-600">₹{exCredit.toFixed(2)}</p>
                          {isSelected && maxQty > 1 && (
                            <p className="text-[10px] text-slate-400 font-semibold">₹{(itemTotal / maxQty).toFixed(2)} / unit</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  ← Back to search
                </button>
                <button
                  type="button"
                  disabled={returnedItems.length === 0}
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  Proceed to Replacement ({returnedItems.length} Selected)
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Cart / Select replacement items with Product Cards UI */}
          {step === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              {/* Product catalog list - independent scrollable box */}
              <div className="flex flex-col border border-slate-100 rounded-2xl p-4 bg-slate-50 h-[520px]">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5 flex-shrink-0">
                  <Package className="w-4 h-4 text-blue-500" /> Choose Replacement Products
                </h3>

                {/* Category & Subcategory Select filters */}
                <div className="grid grid-cols-2 gap-2 mb-3 flex-shrink-0">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Category</label>
                    <select
                      value={activeCategory}
                      onChange={e => {
                        setActiveCategory(e.target.value);
                        setActiveSubcategory('');
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-blue-500 font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="all">All Categories</option>
                      {(categories || []).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Subcategory</label>
                    <select
                      value={activeSubcategory}
                      disabled={activeCategory === 'all'}
                      onChange={e => setActiveSubcategory(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-blue-500 font-semibold text-slate-700 cursor-pointer disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                      <option value="">All Subcategories</option>
                      {(subcategories || []).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="relative mb-3 flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={inventorySearch}
                    onChange={e => setInventorySearch(e.target.value)}
                    placeholder="Search store inventory..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-blue-500"
                  />
                </div>

                {/* Grid of Product Cards - Only this catalog list scrolls */}
                <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 p-1 pr-1.5">
                  {loadingInventory ? (
                    <div className="col-span-2 flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-500 mb-2" />
                      <p className="text-xs text-slate-400 font-semibold">Loading available items...</p>
                    </div>
                  ) : filteredInventory.length === 0 ? (
                    <div className="col-span-2 text-center py-12">
                      <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-500">No items available in stock.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Try clearing category or search filters.</p>
                    </div>
                  ) : (
                    filteredInventory.map(item => {
                      const status = getWizardStockStatus(item);
                      const config = getWizardCategoryConfig(item.category);
                      const gradIdx = Number(item.id || item.product_id || 0) % WIZARD_GRAD_PALETTE.length;
                      const grad = WIZARD_GRAD_PALETTE[isNaN(gradIdx) ? 0 : gradIdx];
                      const priceVal = Number(item.selling_price || item.price || 0);

                      return (
                        <div
                          key={item.id ? `inv-${item.id}` : `prod-${item.product_id || item.id}`}
                          onClick={() => addToCart(item)}
                          className="bg-white rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group overflow-hidden flex flex-col cursor-pointer border-l-4 border-l-blue-500"
                        >
                          {/* Top Banner / Image thumbnail area */}
                          <div className="relative bg-slate-100/70 h-28 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.product_name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-md`}>
                                <span className="text-xl font-black text-white">
                                  {(item.product_name || "P")[0]}
                                </span>
                              </div>
                            )}

                            {/* Status badge */}
                            <div className="absolute top-2 left-2">
                              <StockStatusBadge status={status} />
                            </div>

                            {/* Available Qty badge */}
                            <div className="absolute bottom-2 right-2">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-white/90 text-slate-800 shadow-xs border border-slate-200">
                                Stock: {item.quantity}
                              </span>
                            </div>
                          </div>

                          {/* Card details */}
                          <div className="p-3 flex flex-col flex-1 justify-between gap-1.5">
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${config.badge}`}>
                                  {item.subcategory || item.category || 'General'}
                                </span>
                                {Number(item.discount_percent || 0) > 0 && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
                                    {item.discount_percent}% Off
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-1 group-hover:text-blue-600 transition-colors" title={item.product_name}>
                                {item.product_name}
                              </h4>
                              <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                                SKU: {item.sku || '—'} {item.brand ? `· ${item.brand}` : ''}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between mt-auto">
                              <span className="text-xs font-black text-slate-900">
                                ₹{priceVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                                + Add <Plus className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Cart review - independent scrollable box */}
              <div className="flex flex-col border border-slate-100 rounded-2xl p-4 bg-white justify-between h-[520px]">
                <div className="flex flex-col flex-1 min-h-0">
                  <h3 className="text-sm font-bold text-slate-800 mb-3 flex-shrink-0">Replacement Cart</h3>
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
                    {cart.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-10">Cart is empty. Select products from left catalog.</p>
                    ) : (
                      cart.map(item => (
                        <div key={item.product_id} className="py-2.5 flex justify-between items-center">
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">₹{item.unit_price.toFixed(2)} each</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center border border-slate-200 rounded-lg">
                              <button
                                type="button"
                                onClick={() => updateCartQty(item.product_id, item.quantity - 1)}
                                className="p-1 hover:bg-slate-50 text-slate-500"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-2 text-xs font-bold text-slate-800">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => addToCart(item)}
                                className="p-1 hover:bg-slate-50 text-slate-500"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="font-bold text-xs text-slate-900 min-w-[50px] text-right">
                              ₹{(item.unit_price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Return Summary / Validation */}
                <div className="border-t border-slate-100 pt-4 bg-slate-50 p-3.5 rounded-xl space-y-2 flex-shrink-0">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Exchange Return Credit</span>
                    <span className="font-bold text-red-500">₹{returnCredit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-semibold">New Replacement Total</span>
                    <span className="font-bold text-slate-800">₹{cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t border-slate-200/60 pt-2 text-slate-900">
                    <span>Payable Extra</span>
                    <span>₹{additionalPaymentNeeded.toFixed(2)}</span>
                  </div>

                  {cartTotal < returnCredit && cart.length > 0 && (
                    <p className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      Must add replacement items of value &ge; ₹{returnCredit.toFixed(2)}.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Collect additional payment */}
          {step === 4 && (
            <div className="space-y-6 max-w-md mx-auto animate-fade-in">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Exchange Payable Summary</h4>
                <div className="flex justify-between text-sm">
                  <span>Replacement Items Total</span>
                  <span className="font-semibold">₹{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Exchange Credit</span>
                  <span className="font-semibold text-emerald-600">- ₹{returnCredit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-200 pt-2.5">
                  <span>Balance Extra Payable</span>
                  <span>₹{additionalPaymentNeeded.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-800">Enter Payment Method for Remaining Balance:</p>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Payment Mode</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
                  >
                    {['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE'].map(m => (
                      <option key={m} value={m}>{m.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Transaction reference number / notes</label>
                  <input
                    type="text"
                    value={refNum}
                    onChange={e => setRefNum(e.target.value)}
                    placeholder="Enter UPI ID or Card reference (optional)"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Final Review */}
          {step === 5 && (
            <div className="space-y-6 max-w-xl mx-auto animate-fade-in">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Review Exchange Details</h3>
                <p className="text-xs text-slate-500 mt-1">Please double check everything before confirming exchange transaction.</p>
              </div>

              <div className="border border-slate-100 rounded-2xl divide-y divide-slate-150 overflow-hidden bg-white">
                <div className="p-4">
                  <span className="text-slate-500 font-semibold text-xs block mb-2">Returning Items</span>
                  <div className="space-y-1.5">
                    {returnedItems.map((item, idx) => {
                      const maxQty = Number(item.quantity || 1);
                      const exQty = Number(item.exchange_quantity || maxQty);
                      const exCredit = (Number(item.line_total || 0) / maxQty) * exQty;
                      return (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="text-slate-600 font-medium">{item.product_name} (x{exQty} of {maxQty})</span>
                          <span className="font-semibold text-red-500">₹{exCredit.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="p-4 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">Total Exchange Credit Given</span>
                  <span className="font-bold text-emerald-650">₹{returnCredit.toFixed(2)}</span>
                </div>
                <div className="p-4">
                  <span className="text-slate-500 font-semibold text-xs block mb-2">Replacement Items</span>
                  <div className="space-y-1.5">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 font-medium">{item.name} (x{item.quantity})</span>
                        <span className="font-semibold text-slate-850">₹{(item.unit_price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4 flex justify-between items-center text-xs bg-slate-50">
                  <span className="text-slate-900 font-bold">Remaining Amount Paid</span>
                  <div className="text-right">
                    <span className="font-black text-slate-950 text-sm">₹{additionalPaymentNeeded.toFixed(2)}</span>
                    {additionalPaymentNeeded > 0 && <p className="text-[10px] text-slate-500 mt-0.5">Via {paymentMethod}</p>}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Exchange notes/remarks</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="Reason for exchange, condition of returned item, warranty notes..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 resize-none p-2"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50">
          <button
            type="button"
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>

          <div className="flex gap-2">
            {step === 3 && (
              <button
                type="button"
                disabled={cart.length === 0 || cartTotal < returnCredit}
                onClick={() => {
                  if (additionalPaymentNeeded > 0) {
                    setStep(4);
                  } else {
                    setStep(5);
                  }
                }}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Proceed &rarr;
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                onClick={() => setStep(5)}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                Review &rarr;
              </button>
            )}

            {step === 5 && (
              <button
                type="button"
                onClick={handleCompleteExchange}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-md"
              >
                <Check className="w-4 h-4" />
                {isSubmitting ? "Processing..." : "Complete Exchange"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Exchanges;
