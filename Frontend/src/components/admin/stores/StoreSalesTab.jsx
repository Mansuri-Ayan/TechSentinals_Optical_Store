import { useState, useMemo } from 'react';
import { useSales } from '../../../hooks/useSales';
import { Search, ShoppingBag, Calendar, Phone, IndianRupee, Layers } from 'lucide-react';
import Pagination from '../../shared/Pagination';

const ITEMS_PER_PAGE = 8;

const StoreSalesTab = ({ store }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filters = useMemo(() => {
    return {
      storeId: store.id,
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      search: searchTerm.trim()
    };
  }, [store.id, currentPage, searchTerm]);

  const { sales, total, pages, isLoading, isError } = useSales(filters);

  const formatPrice = (p) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(p);
  };

  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border text-emerald-700 bg-emerald-50 border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Paid
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border text-amber-700 bg-amber-50 border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Partially Paid
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border text-red-700 bg-red-50 border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Unpaid
          </span>
        );
    }
  };

  const handlePageChange = (p) => {
    setCurrentPage(p);
  };

  if (isLoading && sales.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500 font-semibold bg-white border border-slate-100 rounded-2xl shadow-sm">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading Store Sales Ledger...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center text-red-700 font-semibold">
        Unable to load sales history.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          placeholder="Search sales transactions by invoice number, customer..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-xs sm:text-sm font-medium transition-all shadow-sm placeholder:text-slate-400"
        />
      </div>

      {sales.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <ShoppingBag className="w-6 h-6 text-slate-300" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">No sales recorded</h4>
          <p className="text-xs text-slate-500">There are no sales orders completed in this store branch matching your filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Invoice ID', 'Date & Time', 'Customer', 'Product Details', 'Total Amount', 'Payment Status', 'Status'].map(col => (
                    <th key={col} className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((sale) => {
                  const date = new Date(sale.orderDate);
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/40 transition-colors">
                      {/* Invoice ID */}
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-bold text-slate-700">
                        {sale.orderId || `INV-${sale.id}`}
                      </td>

                      {/* Date & Time */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-xs font-semibold text-slate-800">
                          {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>

                      {/* Customer */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-bold text-slate-900">{sale.customerName || 'Walk-in Customer'}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{sale.customerPhone}</p>
                      </td>

                      {/* Product details */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-semibold">
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          <div>
                            <p className="font-bold text-slate-800">{sale.productName || 'Optical Items'}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Qty: {sale.productQuantity || 1} • {sale.productCategory}</p>
                          </div>
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="px-6 py-4 whitespace-nowrap font-extrabold text-slate-950">
                        {formatPrice(sale.total_amount || sale.productPrice * (sale.productQuantity || 1))}
                      </td>

                      {/* Payment Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPaymentStatusBadge(sale.paymentStatus)}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          sale.status === 'Completed'
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : 'text-amber-700 bg-amber-50 border-amber-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sale.status === 'Completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          {sale.status || 'Processing'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <Pagination
                totalItems={total}
                itemsPerPage={ITEMS_PER_PAGE}
                currentPage={currentPage}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StoreSalesTab;
