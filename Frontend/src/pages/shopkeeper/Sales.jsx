import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, ShoppingCart, UserCheck, ChevronRight,
  X as XIcon, Package, Clock, DollarSign, Loader2
} from 'lucide-react';
import Pagination from '../../components/shared/Pagination';
import { useSales } from '../../hooks/useSales';

const STATUS_CFG = {
  Completed:   { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  Cancelled:   { color: 'text-slate-650 bg-slate-100 border-slate-200',      dot: 'bg-slate-400' },
  Returned:    { color: 'text-red-700 bg-red-50 border-red-200',             dot: 'bg-red-500' },
  'Lab Pending': { color: 'text-amber-700 bg-amber-50 border-amber-200',     dot: 'bg-amber-500' },
  Delivered:   { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  Pending:     { color: 'text-amber-700 bg-amber-50 border-amber-200',       dot: 'bg-amber-500' },
  'In Progress': { color: 'text-blue-700 bg-blue-50 border-blue-250',         dot: 'bg-blue-500' },
  Ready:       { color: 'text-indigo-700 bg-indigo-50 border-indigo-250',     dot: 'bg-indigo-505' },
};

const PAYMENT_STATUS_CFG = {
  Paid:    { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  Partial: { color: 'text-amber-700 bg-amber-50 border-amber-200',       dot: 'bg-amber-500' },
  Unpaid:  { color: 'text-red-700 bg-red-50 border-red-200',             dot: 'bg-red-500' },
};

const STATUS_FILTERS = [
  { key: 'All', label: 'All Orders' },
  { key: 'Completed', label: 'Completed' },
  { key: 'Cancelled', label: 'Cancelled' },
  { key: 'Returned', label: 'Returned' },
  { key: 'Lab Pending', label: 'Lab Pending' },
];

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.Pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
};

const PaymentBadge = ({ status }) => {
  const cfg = PAYMENT_STATUS_CFG[status] || PAYMENT_STATUS_CFG.Paid;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
};

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const Sales = () => {
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedPayment, setSelectedPayment] = useState('All');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSale, setSelectedSale] = useState(null);

  const itemsPerPage = 8;

  // Load real API query states
  const { sales, total, kpis, isLoading } = useSales({
    page: currentPage,
    limit: itemsPerPage,
    search: searchInput,
    status: selectedStatus === 'All' ? undefined : selectedStatus,
    hasDue: selectedPayment === 'Remaining' ? true : selectedPayment === 'Paid' ? false : undefined,
  });

  // Normalize backend sales data for table and details drawer consumption
  const formattedSales = useMemo(() => {
    return sales.map(s => {
      let displayStatus = 'Pending';
      const rawStatus = (s.status?.value || s.status || 'PENDING').toUpperCase();
      if (rawStatus === 'COMPLETED' || rawStatus === 'DELIVERED') displayStatus = 'Delivered';
      else if (rawStatus === 'PARTIALLY_PAID' || rawStatus === 'PROCESSING' || rawStatus === 'READY') displayStatus = 'In Progress';

      let displayPayStatus = 'Unpaid';
      const rawPayStatus = (s.paymentStatus || s.payment_status || 'UNPAID').toUpperCase();
      if (rawPayStatus === 'PAID') displayPayStatus = 'Paid';
      else if (rawPayStatus === 'PARTIAL' || rawPayStatus === 'PARTIALLY_PAID') displayPayStatus = 'Partial';

      const itemsList = s.items || [
        {
          productName: s.productName || s.product_name || 'Optical Item',
          price: Number(s.productPrice || s.product_price || s.total_amount || s.amount || 0),
          quantity: Number(s.productQuantity || s.product_quantity || 1),
          selectedColor: s.product_color || '',
          selectedSize: s.product_size || '',
        }
      ];

      return {
        ...s,
        id: s.id || s.orderId,
        orderId: s.orderId || s.invoice_number || 'ORD-0000',
        customerName: s.customerName || s.customer_name || 'Walk-in Customer',
        customerPhone: s.customerPhone || s.customer_phone || '—',
        customerEmail: s.customerEmail || s.customer_email || '',
        productName: s.productName || s.product_name || 'Optical Item',
        items: itemsList,
        subtotal: Number(s.total_amount || s.amount || 0),
        discount: Number(s.discount_amount || 0),
        total_amount: Number(s.total_amount || s.amount || 0),
        receivedAmount: Number(s.paid_amount || s.receivedAmount || 0),
        remainingAmount: Number(s.due_amount || 0),
        orderDate: s.orderDate || s.sale_date || '',
        paymentMethod: s.paymentMethod || s.payment_method || 'Cash',
        paymentStatus: displayPayStatus,
        status: displayStatus,
        upiId: s.upi_transaction_id || s.upiId || '',
      };
    });
  }, [sales]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans overflow-x-hidden">
      {/* ── Breadcrumbs ── */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-semibold mb-3 space-x-2">
          <Link to="/shopkeeper/dashboard" className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-extrabold">Sales History</span>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <ShoppingCart className="w-8 h-8 text-blue-500" />
              Sales History
            </h1>
            <p className="text-slate-505 mt-1.5 text-xs sm:text-sm font-semibold">
              Track and monitor optical customer sales, pending orders, and store revenues.
            </p>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          { label: 'Total Revenue (Paid)', value: fmt(kpis?.revenue || 0), icon: DollarSign, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
          { label: 'Total Orders Billed', value: kpis?.totalOrders || 0, icon: ShoppingCart, color: 'text-blue-700 bg-blue-50 border-blue-100' },
          { label: 'Delivered Orders', value: kpis?.completed || 0, icon: UserCheck, color: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
          { label: 'Active Orders', value: kpis?.active || 0, icon: Clock, color: 'text-amber-700 bg-amber-50 border-amber-100' },
        ].map((kpi, idx) => (
          <div key={idx} className="p-4 sm:p-5 rounded-2xl border bg-white shadow-sm flex items-center justify-between gap-3 border-slate-100">
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-500 mb-1">{kpi.label}</p>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">{kpi.value}</h3>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.color.split(' ').slice(0, 2).join(' ')}`}>
              <kpi.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Search Bar & Filter ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        {/* Payment Selector */}
        <div className="flex gap-3 items-center">
          <label className="text-xs sm:text-sm font-bold text-slate-650 flex items-center gap-1.5 whitespace-nowrap">
            <DollarSign className="w-4 h-4 text-slate-400" /> Payment:
          </label>
          <div className="relative w-full sm:w-48">
            <select
              value={selectedPayment}
              onChange={(e) => {
                setSelectedPayment(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white appearance-none pr-8 cursor-pointer"
            >
              <option value="All">All Payments</option>
              <option value="Remaining">Remaining Payment</option>
              <option value="Paid">Fully Paid</option>
            </select>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
          </div>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md w-full">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by customer, product, order ID..."
            className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm font-medium border border-slate-250 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white transition-all placeholder:text-slate-400 shadow-sm"
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors">
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Status Filters ── */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto hide-scrollbar pb-1">
        {STATUS_FILTERS.map((f) => {
          const isActive = selectedStatus === f.key;
          return (
            <button
              key={f.key}
              onClick={() => {
                setSelectedStatus(f.key);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 border ${
                isActive
                  ? 'bg-slate-950 text-white border-slate-950 shadow-md shadow-slate-950/20'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* ── Listing ── */}
      {isLoading ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-20 flex flex-col items-center justify-center text-center shadow-sm">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-3" />
          <p className="text-slate-500 text-sm font-semibold">Loading transactions list...</p>
        </div>
      ) : formattedSales.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <Package className="w-12 h-12 text-slate-350 mb-3" />
          <h3 className="text-base font-bold text-slate-900 mb-1">No sales records found</h3>
          <p className="text-slate-500 text-sm">No orders matching selected criteria exist.</p>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          {/* Responsive Table View with Horizontal Scroll Container */}
          <div className="border border-slate-100 rounded-2xl overflow-x-auto shadow-sm bg-white">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-105 text-left">
                  {['Order ID', 'Customer Name', 'Product Description', 'Order Date', 'Total Amount', 'Received', 'Order Status', 'Payment Status'].map((col) => (
                    <th key={col} className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {formattedSales.map((sale) => (
                  <tr
                    key={sale.orderId}
                    onClick={() => setSelectedSale(sale)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4 text-xs font-mono font-bold text-slate-705 whitespace-nowrap">{sale.orderId}</td>
                    <td className="px-5 py-4 font-bold text-slate-900 whitespace-nowrap">{sale.customerName}</td>
                    <td className="px-5 py-4 font-semibold text-slate-600 max-w-[200px] truncate whitespace-nowrap">{sale.productName}</td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-505 whitespace-nowrap">{fmtDate(sale.orderDate)}</td>
                    <td className="px-5 py-4 text-xs sm:text-sm font-black text-slate-900 whitespace-nowrap">{fmt(sale.total_amount)}</td>
                    <td className="px-5 py-4 text-xs sm:text-sm font-bold text-emerald-600 whitespace-nowrap">{fmt(sale.receivedAmount)}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <StatusBadge status={sale.status} />
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <PaymentBadge status={sale.paymentStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > itemsPerPage && (
            <Pagination
              totalItems={total}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}

      {/* ── Order Receipt details Modal Overlay ── */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
          <div className="relative bg-white w-full sm:max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[85vh] border border-slate-150 overflow-hidden animate-fade-in animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0 bg-slate-50">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order Details</span>
                <h4 className="font-bold text-slate-800 text-sm">{selectedSale.orderId}</h4>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                type="button"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="overflow-y-auto p-5 sm:p-6 flex-1 space-y-5 text-sm font-medium">
              {/* Customer summary */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Customer Details</span>
                <p className="font-extrabold text-slate-900 text-sm">{selectedSale.customerName}</p>
                <p className="text-slate-550 mt-0.5 text-xs">Phone: {selectedSale.customerPhone} &middot; {selectedSale.customerEmail || 'No email'}</p>
              </div>

              {/* Items listing */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Ordered Items</span>
                <div className="divide-y divide-slate-100 border-y border-slate-100 py-1">
                  {selectedSale.items && selectedSale.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{item.productName || 'Optical Items'}</p>
                        <p className="text-[10px] text-slate-450 mt-0.5">
                          {item.selectedColor && `Color: ${item.selectedColor}`} {item.selectedSize && `· Size: ${item.selectedSize}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{fmt(item.price * item.quantity)}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{item.quantity} units &times; {fmt(item.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Billing summary */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Billing Particulars</span>
                <div className="space-y-1.5 bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
                    <span>Subtotal</span>
                    <span>{fmt(selectedSale.subtotal)}</span>
                  </div>
                  {selectedSale.discount > 0 && (
                    <div className="flex justify-between items-center text-xs text-red-505 font-semibold">
                      <span>Discount</span>
                      <span>- {fmt(selectedSale.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs text-slate-800 font-bold border-t border-slate-200/60 pt-1.5">
                    <span>Total Amount Billed</span>
                    <span className="text-sm font-black text-slate-950">{fmt(selectedSale.total_amount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-emerald-600 font-bold pt-1.5">
                    <span>Amount Received ({selectedSale.paymentMethod})</span>
                    <span>{fmt(selectedSale.receivedAmount)}</span>
                  </div>
                  {selectedSale.remainingAmount > 0 && (
                    <div className="flex justify-between items-center text-xs text-amber-600 font-bold">
                      <span>Remaining Balance Due</span>
                      <span>{fmt(selectedSale.remainingAmount)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* UPI fields */}
              {selectedSale.paymentMethod === 'UPI' && selectedSale.upiId && (
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs flex justify-between items-center">
                  <span className="text-blue-700 font-bold">UPI Transaction ID</span>
                  <span className="font-mono font-extrabold text-blue-900">{selectedSale.upiId}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
