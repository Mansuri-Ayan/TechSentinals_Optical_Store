import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Search, Wrench, Plus, X, AlertTriangle, Calendar, ChevronRight, Check, Clock, User, DollarSign, Package } from 'lucide-react';
import { toast } from 'react-toastify';
import { useCustomers } from '../../hooks/useCustomers';
import Pagination from '../../components/shared/Pagination';

const REPAIR_TYPES = ['Frame Repair', 'Lens Replacement', 'Warranty Service'];
const REPAIR_STATUSES = ['Received', 'In Progress', 'Completed', 'Delivered'];

const MOCK_REPAIRS = [
  { id: 'REP-1001', customerName: 'Rajesh Kumar', customerId: 1, orderId: 'ORD-1001', type: 'Frame Repair', price: 450, isWarranty: false, status: 'Completed', date: '2026-06-08', notes: 'Replaced left temple screw and polished nose pads' },
  { id: 'REP-1002', customerName: 'Priya Sharma', customerId: 2, orderId: 'ORD-1030', type: 'Lens Replacement', price: 1800, isWarranty: false, status: 'In Progress', date: '2026-06-09', notes: 'Fitting blue cut single-vision lens in existing cat-eye frame' },
  { id: 'REP-1003', customerName: 'Amit Patel', customerId: 3, orderId: 'ORD-1038', type: 'Warranty Service', price: 0, isWarranty: true, status: 'Received', date: '2026-06-10', notes: 'Hinge adjustment under 1-year product warranty' },
  { id: 'REP-1004', customerName: 'Sneha Kapoor', customerId: 4, orderId: 'ORD-1020', type: 'Frame Repair', price: 600, isWarranty: false, status: 'Delivered', date: '2026-06-05', notes: 'Micro-soldering metal bridge joint' }
];

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const isOrderInWarranty = (orderDate) => {
  if (!orderDate) return false;
  const orderTime = new Date(orderDate).getTime();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return orderTime >= oneYearAgo.getTime();
};

const Repair = () => {
  const { customers, isLoading: customersLoading } = useCustomers();

  const [repairs, setRepairs] = useState(() => {
    const saved = localStorage.getItem('shopkeeper_repairs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    localStorage.setItem('shopkeeper_repairs', JSON.stringify(MOCK_REPAIRS));
    return MOCK_REPAIRS;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRepairForView, setSelectedRepairForView] = useState(null);

  // Form local states
  const [customerType, setCustomerType] = useState('new'); // 'new' | 'old'
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  const [form, setForm] = useState({
    customerName: '',
    type: 'Frame Repair',
    price: '',
    isWarranty: false,
    notes: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    localStorage.setItem('shopkeeper_repairs', JSON.stringify(repairs));
  }, [repairs]);

  // Sync isWarranty with type
  useEffect(() => {
    if (form.type === 'Warranty Service') {
      setForm(prev => ({ ...prev, isWarranty: true, price: '0' }));
    } else if (form.isWarranty) {
      setForm(prev => ({ ...prev, type: 'Warranty Service', price: '0' }));
    }
  }, [form.type, form.isWarranty]);

  const handleStatusChange = (id, newStatus) => {
    setRepairs(prev =>
      prev.map(item => (item.id === id ? { ...item, status: newStatus } : item))
    );
    toast.success(`Repair status updated to ${newStatus}`);
  };

  const handleCustomerTypeChange = (type) => {
    setCustomerType(type);
    setSelectedCustomerId('');
    setSelectedOrderId('');
    setCustomerSearchQuery('');
    setForm({
      customerName: '',
      type: 'Frame Repair',
      price: '',
      isWarranty: false,
      notes: '',
    });
    setErrors({});
  };

  const handleCustomerSelect = (customerId) => {
    setSelectedCustomerId(customerId);
    setSelectedOrderId('');
    const customer = customers.find(c => String(c.id) === String(customerId));
    setForm(prev => ({
      ...prev,
      customerName: customer ? `${customer.firstName} ${customer.lastName}`.trim() : '',
      isWarranty: false,
      price: '',
      type: 'Frame Repair',
    }));
    setErrors(prev => ({ ...prev, customer: '', order: '' }));
  };

  const handleOrderSelect = (orderId) => {
    setSelectedOrderId(orderId);
    const customer = customers.find(c => String(c.id) === String(selectedCustomerId));
    const order = customer?.orders?.find(o => String(o.id) === String(orderId) || String(o.orderId) === String(orderId));
    const inWarranty = order ? isOrderInWarranty(order.orderDate || order.date) : false;

    setForm(prev => ({
      ...prev,
      isWarranty: inWarranty,
      type: inWarranty ? 'Warranty Service' : 'Frame Repair',
      price: inWarranty ? '0' : '',
    }));
    setErrors(prev => ({ ...prev, order: '' }));
  };

  const validate = () => {
    const e = {};
    if (customerType === 'new') {
      if (!form.customerName.trim()) e.customerName = 'Customer name is required';
    } else {
      if (!selectedCustomerId) e.customer = 'Please select a customer';
      const customer = customers.find(c => String(c.id) === String(selectedCustomerId));
      if (customer && customer.orders?.length > 0 && !selectedOrderId) {
        e.order = 'Please select an order';
      }
    }

    if (!form.isWarranty) {
      if (!String(form.price).trim()) e.price = 'Price is required';
      else if (isNaN(Number(form.price)) || Number(form.price) < 0) {
        e.price = 'Enter a valid price';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddRepairSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const matchedCustomer = customerType === 'old' ? customers.find(c => String(c.id) === String(selectedCustomerId)) : null;

    const newRepair = {
      id: 'REP-' + Math.floor(1000 + Math.random() * 9000),
      customerName: customerType === 'new' ? form.customerName : `${matchedCustomer?.firstName} ${matchedCustomer?.lastName}`.trim(),
      customerId: customerType === 'old' ? Number(selectedCustomerId) : null,
      orderId: customerType === 'old' ? selectedOrderId || null : null,
      type: form.type,
      price: form.isWarranty ? 0 : Number(form.price),
      isWarranty: form.isWarranty,
      status: 'Received',
      date: new Date().toISOString().split('T')[0],
      notes: form.notes,
    };

    setRepairs(prev => [newRepair, ...prev]);
    setShowAddModal(false);
    handleCustomerTypeChange('new');
    toast.success('New repair task booked successfully.');
  };

  const filteredRepairs = repairs.filter(r => {
    const matchesSearch = r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || r.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    const matchesType = typeFilter === 'All' || r.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const paginatedRepairs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRepairs.slice(start, start + itemsPerPage);
  }, [filteredRepairs, currentPage, itemsPerPage]);

  const filteredCustomersForSelect = useMemo(() => {
    const q = customerSearchQuery.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(c => 
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || 
      c.phone.includes(q)
    );
  }, [customers, customerSearchQuery]);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Received':
        return 'text-slate-700 bg-slate-50 border-slate-205';
      case 'In Progress':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'Completed':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'Delivered':
        return 'text-emerald-800 bg-emerald-100/50 border-emerald-250';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const getStatusDotClass = (status) => {
    switch (status) {
      case 'Received':
        return 'bg-slate-400';
      case 'In Progress':
        return 'bg-blue-500';
      case 'Completed':
        return 'bg-emerald-500';
      case 'Delivered':
        return 'bg-emerald-600';
      default:
        return 'bg-slate-400';
    }
  };

  const selectedCustomerObj = customers.find(c => String(c.id) === String(selectedCustomerId));
  const selectedOrderObj = selectedCustomerObj?.orders?.find(o => String(o.id) === String(selectedOrderId) || String(o.orderId) === String(selectedOrderId));
  const isSelectedOrderWarrantyEligible = selectedOrderObj ? isOrderInWarranty(selectedOrderObj.orderDate || selectedOrderObj.date) : false;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">
      {/* Breadcrumbs */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 space-x-2">
          <Link to="/shopkeeper/dashboard" className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-semibold">Repairs</span>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Wrench className="w-8 h-8 text-amber-500 animate-pulse" />
              Repairs & Services
            </h1>
            <p className="text-slate-555 mt-1.5 text-sm sm:text-base font-semibold">
              Track and manage customer frame repairs, lens replacements, and warranty services.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Book Repair
          </button>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2 relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search by customer name or repair ID..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-205 rounded-xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer text-slate-700"
            >
              <option value="All">All Statuses</option>
              {REPAIR_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={e => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer text-slate-700"
            >
              <option value="All">All Repair Types</option>
              {REPAIR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Repairs Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredRepairs.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Wrench className="w-12 h-12 mx-auto mb-4 text-slate-200" />
            <p className="font-bold text-base text-slate-750">No repairs found</p>
            <p className="text-xs text-slate-455 mt-1">Try adjusting your filters or booking a new repair task.</p>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-[1050px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-left">
                    {['Repair ID', 'Customer Name', 'Type', 'Notes / Description', 'Date Received', 'Price', 'Warranty Check', 'Status'].map(col => (
                      <th key={col} className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                  {paginatedRepairs.map(repair => (
                    <tr
                      key={repair.id}
                      onClick={() => setSelectedRepairForView(repair)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-4 text-xs font-mono font-bold text-slate-900">{repair.id}</td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-800 hover:text-blue-650">
                        {repair.customerName}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold">
                          {repair.type}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-slate-500 max-w-[250px] truncate" title={repair.notes}>
                        {repair.notes || '—'}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-455">{fmtDate(repair.date)}</td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-900">
                        {repair.price === 0 ? 'Free' : `₹${repair.price.toLocaleString('en-IN')}`}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border ${
                          repair.isWarranty
                             ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                             : 'text-slate-505 bg-slate-50 border-slate-200'
                        }`}>
                          {repair.isWarranty ? 'Yes (Covered)' : 'No'}
                        </span>
                      </td>
                      <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                        <select
                          value={repair.status}
                          onChange={e => handleStatusChange(repair.id, e.target.value)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg border focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer transition-all ${getStatusBadgeClass(repair.status)}`}
                        >
                          {REPAIR_STATUSES.map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-slate-100">
              {paginatedRepairs.map(repair => (
                <div
                  key={repair.id}
                  onClick={() => setSelectedRepairForView(repair)}
                  className="p-4 space-y-3 cursor-pointer hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono text-xs font-bold text-slate-800">{repair.id}</p>
                      <p className="text-[10px] text-slate-400">{fmtDate(repair.date)}</p>
                    </div>
                    <span className="inline-block px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold">
                      {repair.type}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800 hover:text-blue-650">{repair.customerName}</p>
                    <p className="text-xs text-slate-550 leading-relaxed font-medium">{repair.notes}</p>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-50 text-xs" onClick={e => e.stopPropagation()}>
                    <div>
                      <span className="text-slate-450 block font-medium">Warranty</span>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                        repair.isWarranty
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : 'text-slate-500 bg-slate-50 border-slate-200'
                      }`}>
                        {repair.isWarranty ? 'In Warranty' : 'Paid'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-450 block font-medium">Price</span>
                      <span className="font-black text-slate-900">{repair.price === 0 ? 'Free' : `₹${repair.price.toLocaleString('en-IN')}`}</span>
                    </div>
                    <div>
                      <span className="text-slate-450 block font-medium mb-0.5">Status</span>
                      <select
                        value={repair.status}
                        onChange={e => handleStatusChange(repair.id, e.target.value)}
                        className={`w-full px-2 py-1 text-[11px] font-bold rounded-lg border focus:outline-none ${getStatusBadgeClass(repair.status)}`}
                      >
                        {REPAIR_STATUSES.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {filteredRepairs.length > itemsPerPage && (
        <div className="mt-6">
          <Pagination
            totalItems={filteredRepairs.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Book Repair Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-3 sm:p-4 animate-fade-in font-sans">
          <div className="relative bg-white w-full sm:max-w-lg rounded-2xl shadow-2xl flex flex-col border border-slate-100 overflow-hidden max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50 border border-amber-100">
                  <Wrench className="w-4 h-4 text-amber-600 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Book New Repair Task</h2>
                  <p className="text-xs text-slate-500">Record a repair task for frames, lenses, or warranty service</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-105 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddRepairSubmit} className="flex-1 overflow-y-auto">
              <div className="px-5 sm:px-6 py-5 space-y-4">
                
                {/* Old or New Customer Toggle */}
                <div>
                  <label className="text-xs font-semibold text-slate-655 mb-2 block">Customer Status</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-205">
                    <button
                      type="button"
                      onClick={() => handleCustomerTypeChange('new')}
                      className={`py-2 text-xs font-bold rounded-lg transition-all ${
                        customerType === 'new'
                          ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      New Customer (Walk-in)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCustomerTypeChange('old')}
                      className={`py-2 text-xs font-bold rounded-lg transition-all ${
                        customerType === 'old'
                          ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Old Customer (Registered)
                    </button>
                  </div>
                </div>

                {/* Customer Input Section */}
                {customerType === 'new' ? (
                  <div>
                    <label className="text-xs font-semibold text-slate-650 mb-1.5 flex items-center gap-1.5">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter new customer name"
                      value={form.customerName}
                      onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))}
                      className={`w-full px-3 py-2.5 text-sm font-semibold rounded-xl border focus:outline-none ${
                        errors.customerName ? 'border-red-400 focus:ring-4 focus:ring-red-100' : 'border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'
                      }`}
                    />
                    {errors.customerName && <p className="text-xs text-red-500 mt-1">{errors.customerName}</p>}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-650 mb-1.5 flex items-center gap-1.5">
                        Select Registered Customer <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Type name or phone to search..."
                        value={customerSearchQuery}
                        onChange={e => setCustomerSearchQuery(e.target.value)}
                        className="w-full px-3 py-2.5 mb-2.5 text-sm font-semibold rounded-xl border border-slate-205 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white placeholder:text-slate-400"
                      />
                      <select
                        value={selectedCustomerId}
                        onChange={e => handleCustomerSelect(e.target.value)}
                        className={`w-full px-3 py-2.5 text-sm font-semibold rounded-xl border focus:outline-none bg-white ${
                          errors.customer ? 'border-red-400 focus:ring-4 focus:ring-red-100' : 'border-slate-200 focus:ring-4 focus:ring-blue-500/10'
                        }`}
                      >
                        <option value="">Choose customer...</option>
                        {filteredCustomersForSelect.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.firstName} {c.lastName} ({c.phone})
                          </option>
                        ))}
                      </select>
                      {errors.customer && <p className="text-xs text-red-500 mt-1">{errors.customer}</p>}
                    </div>

                    {selectedCustomerId && (
                      <div>
                        <label className="text-xs font-semibold text-slate-650 mb-1.5 flex items-center gap-1.5">
                          Select Order / Invoice Reference <span className="text-red-500">*</span>
                        </label>
                        {!selectedCustomerObj?.orders || selectedCustomerObj.orders.length === 0 ? (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold">
                            No order history found for this customer. Warranty check is not available.
                          </div>
                        ) : (
                          <>
                            <select
                              value={selectedOrderId}
                              onChange={e => handleOrderSelect(e.target.value)}
                              className={`w-full px-3 py-2.5 text-sm font-semibold rounded-xl border focus:outline-none bg-white ${
                                errors.order ? 'border-red-400 focus:ring-4 focus:ring-red-100' : 'border-slate-200 focus:ring-4 focus:ring-blue-500/10'
                              }`}
                            >
                              <option value="">Choose order...</option>
                              {selectedCustomerObj.orders.map(o => (
                                <option key={o.id || o.orderId} value={o.id || o.orderId}>
                                  {o.id || o.orderId} · {o.items?.[0]?.productName || o.frameName || 'Product'} · {fmtDate(o.orderDate || o.date)}
                                </option>
                              ))}
                            </select>
                            {errors.order && <p className="text-xs text-red-500 mt-1">{errors.order}</p>}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Repair Details Form Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-650 mb-1.5 flex items-center gap-1.5">
                      Repair / Service Type
                    </label>
                    <select
                      value={form.type}
                      disabled={customerType === 'old' && selectedOrderId && isSelectedOrderWarrantyEligible && form.isWarranty}
                      onChange={e => setForm(p => ({ ...p, type: e.target.value, isWarranty: e.target.value === 'Warranty Service' }))}
                      className="w-full px-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      {customerType === 'old' && selectedOrderId && isSelectedOrderWarrantyEligible ? (
                        REPAIR_TYPES.map(t => <option key={t} value={t}>{t}</option>)
                      ) : (
                        REPAIR_TYPES.filter(t => t !== 'Warranty Service').map(t => <option key={t} value={t}>{t}</option>)
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-650 mb-1.5 flex items-center gap-1.5">
                      Price (₹) {!form.isWarranty && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      disabled={form.isWarranty}
                      value={form.isWarranty ? '0' : form.price}
                      onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                      className={`w-full px-3 py-2.5 text-sm font-semibold rounded-xl border focus:outline-none ${
                        form.isWarranty ? 'bg-slate-50 border-slate-200 text-slate-400' :
                        errors.price ? 'border-red-400 focus:ring-4 focus:ring-red-100' : 'border-slate-200 focus:ring-4 focus:ring-blue-500/10'
                      }`}
                    />
                    {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
                  </div>
                </div>

                {/* Warranty Eligibility Info Checkbox for Old Customers */}
                {customerType === 'old' && selectedOrderId && (
                  <div className="mt-2">
                    {isSelectedOrderWarrantyEligible ? (
                      <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <input
                          type="checkbox"
                          id="isWarranty"
                          checked={form.isWarranty}
                          onChange={e => {
                            const checked = e.target.checked;
                            setForm(p => ({
                              ...p,
                              isWarranty: checked,
                              type: checked ? 'Warranty Service' : 'Frame Repair',
                              price: checked ? '0' : '',
                            }));
                          }}
                          className="w-4.5 h-4.5 rounded border-slate-305 text-emerald-600 focus:ring-emerald-500 accent-emerald-500 cursor-pointer"
                        />
                        <label htmlFor="isWarranty" className="text-xs font-bold text-emerald-800 cursor-pointer">
                          Apply Active Warranty Service (Free Repair)
                        </label>
                      </div>
                    ) : (
                      <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-550 flex-shrink-0" />
                        <span>This product was ordered on {fmtDate(selectedOrderObj?.orderDate || selectedOrderObj?.date)}. The 1-year warranty has expired. Only paid services are available.</span>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-655 mb-1.5 flex items-center gap-1.5">
                    Repair Description & Issue Details
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Enter details of frame breakage, lens crack, scratch, parts required, etc..."
                    className="w-full px-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white h-24 resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 sm:px-6 py-4 border-t border-slate-105 flex items-center justify-end gap-3 flex-shrink-0 bg-slate-50">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2 bg-[#0A0F1F] hover:bg-slate-800">
                  <Check className="w-4 h-4" />
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Repair Detail Drawer (Right side) */}
      {selectedRepairForView && (
        <RepairDetailDrawer
          repair={selectedRepairForView}
          onClose={() => setSelectedRepairForView(null)}
        />
      )}
    </div>
  );
};

/* ── DETAIL ROW HELPER ── */
const DetailRow = ({ label, value, mono }) => (
  <div className="flex items-start justify-between py-2.5 border-b border-slate-50 last:border-0 gap-3">
    <span className="text-xs text-slate-500 font-semibold shrink-0">{label}</span>
    <span className={`text-xs sm:text-sm font-bold text-slate-900 text-right break-words min-w-0 ${mono ? 'font-mono' : ''}`}>
      {value ?? '—'}
    </span>
  </div>
);

/* ── SECTION CARD HELPER ── */
const Section = ({ icon: Icon, title, children, color = 'blue' }) => {
  const colours = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600',
    blue:    'bg-blue-500/10 border-blue-500/20 text-blue-600',
    purple:  'bg-purple-500/10 border-purple-500/20 text-purple-600',
    amber:   'bg-amber-500/10 border-amber-500/20 text-amber-600',
    rose:    'bg-rose-500/10 border-rose-500/20 text-rose-600',
    slate:   'bg-slate-500/10 border-slate-500/20 text-slate-655',
    violet:  'bg-violet-500/10 border-violet-500/20 text-violet-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 bg-slate-50/10">
        <div className={`p-1.5 rounded-lg border ${colours[color]}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="px-5 pt-0.5 pb-1.5">{children}</div>
    </div>
  );
};

/* ── REPAIR VIEW DETAIL DRAWER COMPONENT (RIGHT SIDE) ── */
const RepairDetailDrawer = ({ repair, onClose }) => {
  if (!repair) return null;

  const sc = repair.isWarranty
    ? { label: 'Warranty Covered (Free)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' }
    : { label: 'Out of Warranty (Paid)', color: 'text-slate-600 bg-slate-100 border-slate-205', dot: 'bg-slate-400' };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex justify-end animate-fade-in font-sans animate-fade-in">
      {/* Clickable Backdrop overlay to close */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      
      {/* Slide-in Drawer Container */}
      <div className="relative w-full sm:max-w-md h-full bg-slate-50 shadow-2xl flex flex-col animate-slide-up overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Wrench className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate">Repair Details</h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{repair.id}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors flex-shrink-0 ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Badge Strip */}
        <div className="px-5 py-3 bg-white border-b border-slate-100 flex-shrink-0 flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            repair.status === 'Completed' || repair.status === 'Delivered' ? 'text-emerald-700 bg-emerald-50 border-emerald-250' : 
            repair.status === 'In Progress' ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-slate-700 bg-slate-50 border-slate-205'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              repair.status === 'Completed' ? 'bg-emerald-500' : 
              repair.status === 'Delivered' ? 'bg-emerald-600' : 
              repair.status === 'In Progress' ? 'bg-blue-500' : 'bg-slate-400'
            }`} />
            {repair.status}
          </span>
          <span className="text-xs text-slate-400 font-semibold">Date Logged: {fmtDate(repair.date)}</span>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-4 space-y-4">
          
          {/* Section 1: Customer Info */}
          <Section icon={User} title="Customer Information" color="blue">
            <DetailRow label="Customer Name" value={
              repair.customerId ? (
                <Link to={`/shopkeeper/customers/${repair.customerId}`} className="text-blue-600 hover:text-blue-800 hover:underline font-bold">
                  {repair.customerName}
                </Link>
              ) : repair.customerName
            } />
            <DetailRow label="Customer Type" value={repair.customerId ? 'Registered Customer' : 'Walk-in / New Customer'} />
          </Section>

          {/* Section 2: Repair specifications */}
          <Section icon={Wrench} title="Repair Specifications" color="amber">
            <DetailRow label="Repair ID" value={repair.id} mono />
            <DetailRow label="Service Type" value={repair.type} />
            <DetailRow label="Date Received" value={fmtDate(repair.date)} />
          </Section>

          {/* Section 3: Warranty Details */}
          <Section icon={AlertTriangle} title="Warranty Verification" color="emerald">
            <DetailRow label="Warranty Eligible" value={
              <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                repair.isWarranty ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-550 text-slate-600'
              }`}>
                {repair.isWarranty ? 'Yes' : 'No'}
              </span>
            } />
            <DetailRow label="Associated Order" value={repair.orderId || '—'} mono />
            <DetailRow label="Warranty Status" value={sc.label} />
          </Section>

          {/* Section 4: Pricing Details */}
          <Section icon={DollarSign} title="Billing Details" color="rose">
            <DetailRow label="Service Price" value={repair.price === 0 ? 'Free' : `₹${repair.price.toLocaleString('en-IN')}`} />
            <DetailRow label="Warranty Discount" value={repair.isWarranty ? '100% (Free Warranty Repair)' : 'None'} />
            <DetailRow label="Net Due Amount" value={repair.price === 0 ? '₹0' : `₹${repair.price.toLocaleString('en-IN')}`} />
          </Section>

          {/* Section 5: Notes & Comments */}
          <Section icon={Package} title="Description & Issue details" color="purple">
            <div className="py-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {repair.notes || 'No description notes provided.'}
            </div>
          </Section>

        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-white border-t border-slate-100 flex-shrink-0">
          <button onClick={onClose}
            className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-700 transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer">
            Close Panel
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default Repair;
