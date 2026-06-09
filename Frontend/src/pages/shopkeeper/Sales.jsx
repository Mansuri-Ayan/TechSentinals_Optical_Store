import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, ShoppingCart, UserCheck, ChevronRight,
  X as XIcon, Package, Clock, DollarSign
} from 'lucide-react';
import { getCustomers } from '../../services/customerService';
import Pagination from '../../components/shared/Pagination';

const STATUS_CFG = {
  Delivered:   { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  Completed:   { color: 'text-emerald-750 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  Pending:     { color: 'text-amber-700 bg-amber-50 border-amber-200',       dot: 'bg-amber-500' },
  'In Progress': { color: 'text-blue-700 bg-blue-50 border-blue-200',         dot: 'bg-blue-500' },
  Ready:       { color: 'text-indigo-700 bg-indigo-50 border-indigo-200',     dot: 'bg-indigo-505' },
};

const PAYMENT_STATUS_CFG = {
  Paid:    { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  Partial: { color: 'text-amber-700 bg-amber-50 border-amber-200',       dot: 'bg-amber-500' },
  Unpaid:  { color: 'text-red-700 bg-red-50 border-red-200',             dot: 'bg-red-500' },
};

const STATUS_FILTERS = [
  { key: 'All', label: 'All Orders' },
  { key: 'Pending', label: 'Pending' },
  { key: 'In Progress', label: 'In Progress' },
  { key: 'Ready', label: 'Ready' },
  { key: 'Delivered', label: 'Delivered' },
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
  const [customers] = useState(() => getCustomers());
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSale, setSelectedSale] = useState(null);

  // Flatten and build sales records
  const sales = useMemo(() => {
    const records = [];
    customers.forEach((c) => {
      if (c.orders) {
        c.orders.forEach((o) => {
          records.push({
            id: o.id,
            orderId: o.id,
            customerName: `${c.firstName} ${c.lastName}`,
            customerPhone: c.phone,
            customerEmail: c.email,
            customerId: c.id,
            productName: o.items?.[0]?.productName || o.frameName || 'Optical Items',
            items: o.items || [],
            subtotal: o.subtotal || o.amount,
            discount: o.discount || 0,
            total_amount: o.amount,
            receivedAmount: o.receivedAmount || 0,
            remainingAmount: o.remainingAmount || 0,
            orderDate: o.date,
            paymentMethod: o.paymentMethod || 'Cash',
            paymentStatus: o.paymentStatus || 'Paid',
            upiId: o.upiId || '',
            status: o.status || 'Pending',
          });
        });
      }
    });
    // Sort descending by date
    return records.sort((a, b) => b.orderDate.localeCompare(a.orderDate));
  }, [customers]);

  // KPI Calculations
  const kpis = useMemo(() => {
    let revenue = 0;
    let completed = 0;
    let pending = 0;

    sales.forEach((s) => {
      revenue += s.receivedAmount;
      if (s.status === 'Delivered') {
        completed++;
      } else {
        pending++;
      }
    });

    return {
      revenue,
      totalOrders: sales.length,
      completed,
      pending,
    };
  }, [sales]);

  // Filtering
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchStatus = selectedStatus === 'All' || s.status === selectedStatus;
      const q = searchInput.toLowerCase().trim();
      if (!q) return matchStatus;

      const matchSearch =
        s.orderId.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.productName.toLowerCase().includes(q) ||
        s.paymentMethod.toLowerCase().includes(q);

      return matchStatus && matchSearch;
    });
  }, [sales, selectedStatus, searchInput]);

  const itemsPerPage = 8;
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSales.slice(start, start + itemsPerPage);
  }, [filteredSales, currentPage]);

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);

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
          { label: 'Total Revenue (Paid)', value: fmt(kpis.revenue), icon: DollarSign, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
          { label: 'Total Orders Billed', value: kpis.totalOrders, icon: ShoppingCart, color: 'text-blue-700 bg-blue-50 border-blue-100' },
          { label: 'Delivered Orders', value: kpis.completed, icon: UserCheck, color: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
          { label: 'Active Orders', value: kpis.pending, icon: Clock, color: 'text-amber-700 bg-amber-50 border-amber-100' },
        ].map((kpi, idx) => (
          <div key={idx} className={`p-4 sm:p-5 rounded-2xl border bg-white shadow-sm flex items-center justify-between gap-3 ${kpi.color.split(' ').slice(2).join(' ')}`}>
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

      {/* ── Search Bar ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6 flex items-center gap-4">
        <div className="relative flex-1">
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
            className="w-full pl-10 pr-9 py-2.5 text-sm font-medium border border-slate-250 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white transition-all placeholder:text-slate-400 shadow-sm"
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
      {paginatedSales.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <Package className="w-12 h-12 text-slate-350 mb-3" />
          <h3 className="text-base font-bold text-slate-900 mb-1">No sales records found</h3>
          <p className="text-slate-500 text-sm">No orders matching selected criteria exist.</p>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          {/* Desktop Table View */}
          <div className="hidden lg:block border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-left">
                  {['Order ID', 'Customer Name', 'Product Description', 'Order Date', 'Total Amount', 'Received', 'Order Status', 'Payment Status'].map((col) => (
                    <th key={col} className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedSales.map((sale) => (
                  <tr
                    key={sale.id}
                    onClick={() => setSelectedSale(sale)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4 text-xs font-mono font-bold text-slate-700 whitespace-nowrap">{sale.orderId}</td>
                    <td className="px-5 py-4 font-bold text-slate-900">{sale.customerName}</td>
                    <td className="px-5 py-4 font-semibold text-slate-600 max-w-[200px] truncate">{sale.productName}</td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-500 whitespace-nowrap">{fmtDate(sale.orderDate)}</td>
                    <td className="px-5 py-4 text-xs sm:text-sm font-black text-slate-900">{fmt(sale.total_amount)}</td>
                    <td className="px-5 py-4 text-xs sm:text-sm font-bold text-emerald-600">{fmt(sale.receivedAmount)}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={sale.status} />
                    </td>
                    <td className="px-5 py-4">
                      <PaymentBadge status={sale.paymentStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="lg:hidden space-y-3">
            {paginatedSales.map((sale) => (
              <div
                key={sale.id}
                onClick={() => setSelectedSale(sale)}
                className="bg-white p-4 border border-slate-100 rounded-2xl shadow-sm space-y-3 cursor-pointer hover:border-slate-350 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400">{sale.orderId}</span>
                    <h3 className="font-bold text-slate-950 text-sm mt-0.5">{sale.customerName}</h3>
                  </div>
                  <StatusBadge status={sale.status} />
                </div>
                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Items:</span> {sale.productName}
                </div>
                <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Date</span>
                    <span className="font-bold text-slate-700">{fmtDate(sale.orderDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Amount Billed</span>
                    <span className="font-black text-slate-900">{fmt(sale.total_amount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Payment</span>
                    <span className="font-bold text-slate-700"><PaymentBadge status={sale.paymentStatus} /></span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Total Paid</span>
                    <span className="font-extrabold text-emerald-600">{fmt(sale.receivedAmount)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              totalItems={filteredSales.length}
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
          <div className="relative bg-white w-full sm:max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[85vh] border border-slate-150 overflow-hidden animate-fade-in">
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
                        <p className="font-bold text-slate-800">{item.productName || item.frameName || 'Optical Items'}</p>
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
                    <div className="flex justify-between items-center text-xs text-red-500 font-semibold">
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
