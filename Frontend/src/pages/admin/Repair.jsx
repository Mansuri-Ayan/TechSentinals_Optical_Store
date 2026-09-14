import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import {
  Search, Wrench, Plus, X, AlertTriangle, Calendar,
  ChevronRight, Check, Clock, User, DollarSign, Package, RefreshCw, Store, ChevronDown,
  Printer, FileText
} from 'lucide-react';
import { useCustomers } from '../../hooks/useCustomers';
import { useRepairs, useRepairMutations } from '../../hooks/useRepairs';
import { useAuthStore, useStoreStore } from '../../store/store';
import Pagination from '../../components/shared/Pagination';
import PermissionGuard from '../../components/shared/PermissionGuard';
import { usePagePermissions } from '../../hooks/usePermissions';
import { useRoleContext } from '../../hooks/useRoleContext';
import RepairBillModal from '../../components/shared/RepairBillModal';
import EditRepairModal from '../../components/admin/EditRepairModal';

/* ── Constants ── */
const REPAIR_TYPES = [
  { value: 'FRAME_REPAIR', label: 'Frame Repair' },
  { value: 'LENS_REPLACEMENT', label: 'Lens Replacement' },
  { value: 'ACCESSORY_REPAIR', label: 'Accessory Repair' },
  { value: 'WARRANTY_SERVICE', label: 'Warranty Service' },
  { value: 'OTHER', label: 'Other' },
];
const REPAIR_STATUSES = [
  { value: 'RECEIVED', label: 'Received' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtCurrency = (val) =>
  `₹${Number(val || 0).toLocaleString('en-IN')}`;

const isWithinWarrantyMonths = (orderDate, warrantyMonths = 12) => {
  if (!orderDate || !warrantyMonths) return false;
  const expiry = new Date(orderDate);
  expiry.setMonth(expiry.getMonth() + warrantyMonths);
  return new Date() <= expiry;
};

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'RECEIVED': return 'text-slate-700 bg-slate-50 border-slate-200';
    case 'IN_PROGRESS': return 'text-blue-700 bg-blue-50 border-blue-200';
    case 'COMPLETED': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    case 'DELIVERED': return 'text-emerald-800 bg-emerald-100/50 border-emerald-300';
    case 'CANCELLED': return 'text-red-700 bg-red-50 border-red-200';
    default: return 'text-slate-700 bg-slate-50 border-slate-200';
  }
};

const getTypeBadge = (type) =>
  REPAIR_TYPES.find(t => t.value === type)?.label || type;

const getStatusLabel = (status) =>
  REPAIR_STATUSES.find(s => s.value === status)?.label || status;

/* ── MAIN COMPONENT ── */
const Repair = () => {
  const { storeId, buildPath, showStoreSwitcher, isPathAdmin } = useRoleContext();
  const { user } = useAuthStore();
  const { stores } = useStoreStore();
  const { customers, isLoading: customersLoading } = useCustomers();
  const { updateRepairStatusAsync, isUpdatingStatus } = useRepairMutations();
  const perms = usePagePermissions('repairs');

  /* ── Filters & Pagination ── */
  const [inPageStoreId, setInPageStoreId] = useState(storeId);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setInPageStoreId(storeId);
  }, [storeId]);

  /* ── Fetch repairs from backend ── */
  const repairsFilters = useMemo(() => {
    const f = { limit: itemsPerPage, offset: (currentPage - 1) * itemsPerPage };
    if (inPageStoreId && inPageStoreId !== 'admin') f.store_id = inPageStoreId;
    if (statusFilter) f.status = statusFilter;
    if (typeFilter) f.repair_type = typeFilter;
    if (searchTerm.trim()) f.search = searchTerm.trim();
    return f;
  }, [inPageStoreId, statusFilter, typeFilter, currentPage, searchTerm]);

  const { data: repairsData, isLoading: repairsLoading, refetch } = useRepairs(repairsFilters);

  const repairs = repairsData?.items || [];
  const totalRepairs = repairsData?.total || 0;

  /* ── Modal State ── */
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRepairForView, setSelectedRepairForView] = useState(null);
  const [selectedRepairForBill, setSelectedRepairForBill] = useState(null);
  const [selectedRepairForEdit, setSelectedRepairForEdit] = useState(null);

  /* ── Form State ── */
  const [customerType, setCustomerType] = useState('new');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [form, setForm] = useState({
    customer_name: '',
    repair_type: 'FRAME_REPAIR',
    estimated_cost: '',
    advance_paid: '',
    payment_method: 'CASH',
    is_warranty: false,
    description: '',
    notes: '',
    store_id: storeId === 'admin' ? '' : storeId,
    unit_sku: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      store_id: inPageStoreId === 'admin' ? '' : inPageStoreId
    }));
  }, [inPageStoreId, showAddModal]);

  /* ── Derived: selected customer's order warranty ── */
  const selectedCustomerObj = useMemo(() =>
    customers.find(c => String(c.id) === String(selectedCustomerId)),
    [customers, selectedCustomerId]
  );

  const selectedOrderObj = useMemo(() =>
    selectedCustomerObj?.orders?.find(o =>
      String(o.id) === String(selectedOrderId) || String(o.orderId) === String(selectedOrderId)
    ),
    [selectedCustomerObj, selectedOrderId]
  );
    
  const orderUnitSkus = useMemo(() => {
    if (!selectedOrderObj?.items) return [];
    const skus = [];
    selectedOrderObj.items.forEach(item => {
      if (item.productUnitSku) skus.push(item.productUnitSku);
      if (item.unitSku) skus.push(item.unitSku);
      if (item.unit_sku) skus.push(item.unit_sku);
    });
    return [...new Set(skus)];
  }, [selectedOrderObj]);

  /* ── Sync form when warranty changes ── */
  useEffect(() => {
    if (form.repair_type === 'WARRANTY_SERVICE') {
      setForm(prev => ({ ...prev, is_warranty: true, estimated_cost: '0', advance_paid: '0' }));
    } else if (form.is_warranty) {
      setForm(prev => ({ ...prev, repair_type: 'WARRANTY_SERVICE', estimated_cost: '0', advance_paid: '0' }));
    }
  }, [form.repair_type, form.is_warranty]);

  /* ── Handlers ── */
  const handleCustomerTypeChange = (type) => {
    setCustomerType(type);
    setSelectedCustomerId('');
    setSelectedOrderId('');
    setCustomerSearchQuery('');
    setForm({
      customer_name: '',
      repair_type: 'FRAME_REPAIR',
      estimated_cost: '',
      advance_paid: '',
      payment_method: 'CASH',
      is_warranty: false,
      description: '',
      notes: '',
      store_id: inPageStoreId === 'admin' ? '' : inPageStoreId,
      unit_sku: '',
    });
    setErrors({});
  };

  const handleCustomerSelect = (customerId) => {
    setSelectedCustomerId(customerId);
    setSelectedOrderId('');
    setForm(prev => ({
      ...prev,
      is_warranty: false,
      repair_type: 'FRAME_REPAIR',
      estimated_cost: '',
      advance_paid: '',
      unit_sku: '',
    }));
    setErrors(prev => ({ ...prev, customer: '', order: '' }));
  };

  const handleOrderSelect = (orderId) => {
    setSelectedOrderId(orderId);
    const order = selectedCustomerObj?.orders?.find(o =>
      String(o.id) === String(orderId) || String(o.orderId) === String(orderId)
    );
    const wMonths = order?.items?.[0]?.warrantyMonths ?? 12;
    const inWarranty = order ? isWithinWarrantyMonths(order.date || order.orderDate, wMonths) : false;
    setForm(prev => ({
      ...prev,
      is_warranty: inWarranty,
      repair_type: inWarranty ? 'WARRANTY_SERVICE' : 'FRAME_REPAIR',
      estimated_cost: inWarranty ? '0' : '',
      advance_paid: inWarranty ? '0' : prev.advance_paid,
      unit_sku: '',
    }));
    setErrors(prev => ({ ...prev, order: '' }));
  };

  const handleStatusChange = useCallback(async (repairId, newStatus) => {
    try {
      await updateRepairStatusAsync({ repairId, status: newStatus });
    } catch (e) {
      console.error(e);
    }
  }, [updateRepairStatusAsync]);

  const validate = () => {
    const e = {};
    if (storeId === 'admin' && !form.store_id) {
      e.store_id = 'Please select a store branch';
    }
    if (customerType === 'new') {
      if (!form.customer_name.trim()) e.customer_name = 'Customer name is required';
    } else {
      if (!selectedCustomerId) e.customer = 'Please select a customer';
    }
    if (!form.is_warranty) {
      if (!String(form.estimated_cost).trim()) e.estimated_cost = 'Cost is required';
      else if (isNaN(Number(form.estimated_cost)) || Number(form.estimated_cost) < 0) {
        e.estimated_cost = 'Enter a valid cost';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const { createRepairAsync, isCreating } = useRepairMutations();

  const handleAddRepairSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      store_id: storeId === 'admin' ? Number(form.store_id) : Number(inPageStoreId),
      customer_id: customerType === 'old' ? Number(selectedCustomerId) : null,
      sale_id: customerType === 'old' && selectedOrderId
        ? (selectedOrderObj?.dbId || null)
        : null,
      customer_name: customerType === 'new' ? form.customer_name : null,
      repair_type: form.repair_type,
      is_warranty: form.is_warranty,
      description: form.description || null,
      estimated_cost: form.is_warranty ? 0 : Number(form.estimated_cost),
      advance_paid: form.is_warranty ? 0 : Number(form.advance_paid || 0),
      payment_method: form.is_warranty ? 'CASH' : (form.payment_method || 'CASH'),
      received_date: new Date().toISOString().split('T')[0],
      notes: form.notes || null,
      unit_sku: form.unit_sku || null,
    };

    try {
      await createRepairAsync(payload);
      setShowAddModal(false);
      handleCustomerTypeChange('new');
    } catch (e) {
      console.error(e);
    }
  };

  const filteredCustomersForSelect = useMemo(() => {
    const q = customerSearchQuery.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q))
    );
  }, [customers, customerSearchQuery]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">
      {/* Breadcrumbs */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 space-x-2">
          <Link to={buildPath('dashboard')} className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-semibold">Repairs & Services</span>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Wrench className="w-8 h-8 text-amber-500 animate-pulse" />
              Repairs & Services
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm sm:text-base font-semibold">
              Track and manage customer frame repairs, lens replacements, and warranty services.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {showStoreSwitcher && (
              <div className="relative">
                <select
                  value={inPageStoreId}
                  onChange={(e) => {
                    setInPageStoreId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-10 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm appearance-none cursor-pointer"
                >
                  <option value="admin">All Store</option>
                  {stores.filter(s => s.id !== 'admin' && s.store_name !== 'All Store' && s.name !== 'All Store').map(s => (
                    <option key={s.id} value={s.id}>{s.store_name}</option>
                  ))}
                </select>
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            )}
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <PermissionGuard permission="repairs:create">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Book Repair
              </button>
            </PermissionGuard>
          </div>
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
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer text-slate-700"
            >
              <option value="">All Statuses</option>
              {REPAIR_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer text-slate-700"
            >
              <option value="">All Repair Types</option>
              {REPAIR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Repairs Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {repairsLoading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
            <span className="font-semibold text-sm">Loading repairs...</span>
          </div>
        ) : repairs.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Wrench className="w-12 h-12 mx-auto mb-4 text-slate-200" />
            <p className="font-bold text-base text-slate-700">No repairs found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or booking a new repair task.</p>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-[1100px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-left">
                    {['Repair ID', 'Customer', ...(isPathAdmin ? ['Store'] : []), 'Type', 'Unit SKU', 'Total Cost', 'Paid', 'Balance Due', 'Invoice Type', 'Status', 'Actions'].map(col => (
                      <th key={col} className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                  {repairs.map(repair => {
                    const total = repair.is_warranty ? 0 : Number(repair.total_cost ?? repair.estimated_cost ?? 0);
                    const paid = Number(repair.paid_amount ?? repair.advance_paid ?? 0);
                    const due = Number(repair.due_amount ?? Math.max(0, total - paid));
                    const isFinal = repair.is_final ?? (due <= 0 || repair.is_warranty);

                    return (
                      <tr
                        key={repair.id}
                        onClick={() => setSelectedRepairForView(repair)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-4 text-xs font-mono font-bold text-slate-900">{repair.repair_number}</td>
                        <td className="px-5 py-4 text-sm font-bold text-slate-800">
                          {repair.customer_full_name || repair.customer_name || '—'}
                        </td>
                        {isPathAdmin && (
                          <td className="px-5 py-4 text-xs font-bold">
                            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {repair.store_name || 'All Store'}
                            </span>
                          </td>
                        )}
                        <td className="px-5 py-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold">
                            {getTypeBadge(repair.repair_type)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs font-mono font-bold text-slate-800">
                          {repair.unit_sku || <span className="text-slate-400 font-medium">—</span>}
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-slate-900">
                          {repair.is_warranty ? 'Free (Warranty)' : fmtCurrency(total)}
                        </td>
                        <td className="px-5 py-4 text-xs font-bold text-emerald-700">
                          {fmtCurrency(paid)}
                        </td>
                        <td className="px-5 py-4 text-xs font-bold text-rose-700">
                          {due > 0 ? fmtCurrency(due) : <span className="text-emerald-600 font-extrabold">₹0.00</span>}
                        </td>
                        <td className="px-5 py-4">
                          {isFinal ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              FINAL
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                              TEMPORARY
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                          <select
                            value={repair.status}
                            onChange={e => handleStatusChange(repair.id, e.target.value)}
                            disabled={isUpdatingStatus || !perms.canUpdate}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg border focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer transition-all ${getStatusBadgeClass(repair.status)}`}
                          >
                            {REPAIR_STATUSES.map(st => (
                              <option key={st.value} value={st.value}>{st.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <PermissionGuard permission="repairs:update">
                              <button
                                type="button"
                                onClick={() => setSelectedRepairForEdit(repair)}
                                className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                                title="Update Repair Payment & Costs"
                              >
                                <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                                Pay / Edit
                              </button>
                            </PermissionGuard>
                            <button
                              type="button"
                              onClick={() => setSelectedRepairForBill(repair)}
                              className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="View & Download PDF Repair Bill"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Bill (PDF)
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-slate-100">
              {repairs.map(repair => {
                const total = repair.is_warranty ? 0 : Number(repair.total_cost ?? repair.estimated_cost ?? 0);
                const paid = Number(repair.paid_amount ?? repair.advance_paid ?? 0);
                const due = Number(repair.due_amount ?? Math.max(0, total - paid));
                const isFinal = repair.is_final ?? (due <= 0 || repair.is_warranty);

                return (
                  <div
                    key={repair.id}
                    onClick={() => setSelectedRepairForView(repair)}
                    className="p-4 space-y-3 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-mono text-xs font-bold text-slate-800">{repair.repair_number}</p>
                        <p className="text-[10px] text-slate-400">{fmtDate(repair.received_date)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="inline-block px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold">
                          {getTypeBadge(repair.repair_type)}
                        </span>
                        {isFinal ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            FINAL INVOICE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                            TEMPORARY INVOICE
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800">
                        {repair.customer_full_name || repair.customer_name || '—'}
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">{repair.description}</p>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-50 text-xs" onClick={e => e.stopPropagation()}>
                      <div>
                        <span className="text-slate-400 block font-medium">Total / Paid</span>
                        <span className="font-bold text-slate-800">
                          {repair.is_warranty ? 'Free' : `${fmtCurrency(total)} / ${fmtCurrency(paid)}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Due</span>
                        <span className={`font-black ${due > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {fmtCurrency(due)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedRepairForEdit(repair)}
                          className="px-2 py-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg flex items-center gap-1"
                        >
                          <DollarSign className="w-3 h-3 text-slate-500" /> Pay
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedRepairForBill(repair)}
                          className="px-2 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" /> Bill
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {totalRepairs > itemsPerPage && (
        <div className="mt-6">
          <Pagination
            totalItems={totalRepairs}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Book Repair Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-3 sm:p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900">Book New Repair / Service Job</h2>
                  <p className="text-xs text-slate-500 font-medium">Record frame repair, lens fitting, or warranty claim</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleAddRepairSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 hide-scrollbar">
              {errors.store_id && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {errors.store_id}
                </div>
              )}

              {/* Customer Selection Mode */}
              <div className="space-y-3">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="radio"
                      name="customerType"
                      value="new"
                      checked={customerType === 'new'}
                      onChange={() => handleCustomerTypeChange('new')}
                      className="accent-amber-500"
                    />
                    Walk-in / New Customer
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="radio"
                      name="customerType"
                      value="old"
                      checked={customerType === 'old'}
                      onChange={() => handleCustomerTypeChange('old')}
                      className="accent-amber-500"
                    />
                    Registered Customer (Order History)
                  </label>
                </div>

                {customerType === 'new' ? (
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                      Customer Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={form.customer_name}
                      onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))}
                      className={`w-full px-3 py-2.5 text-sm font-semibold rounded-xl border focus:outline-none ${errors.customer_name ? 'border-red-400 focus:ring-4 focus:ring-red-100' : 'border-slate-200 focus:ring-4 focus:ring-blue-500/10'
                        }`}
                    />
                    {errors.customer_name && <p className="text-xs text-red-500 mt-1">{errors.customer_name}</p>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                        Select Registered Customer <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Type name or phone to search..."
                        value={customerSearchQuery}
                        onChange={e => setCustomerSearchQuery(e.target.value)}
                        className="w-full px-3 py-2.5 mb-2.5 text-sm font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white placeholder:text-slate-400"
                      />
                      <select
                        value={selectedCustomerId}
                        onChange={e => handleCustomerSelect(e.target.value)}
                        className={`w-full px-3 py-2.5 text-sm font-semibold rounded-xl border focus:outline-none bg-white ${errors.customer ? 'border-red-400 focus:ring-4 focus:ring-red-100' : 'border-slate-200 focus:ring-4 focus:ring-blue-500/10'
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
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                          Select Order / Invoice Reference
                        </label>
                        {!selectedCustomerObj?.orders?.length ? (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold">
                            No order history found. Warranty check unavailable.
                          </div>
                        ) : (
                          <select
                            value={selectedOrderId}
                            onChange={e => handleOrderSelect(e.target.value)}
                            className="w-full px-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 bg-white"
                          >
                            <option value="">Choose order (optional)...</option>
                            {selectedCustomerObj.orders.map(o => (
                              <option key={o.id || o.orderId} value={o.id || o.orderId}>
                                {o.id || o.orderId} · {o.items?.[0]?.productName || o.frameName || 'Product'} · {fmtDate(o.date || o.orderDate)}
                              </option>
                            ))}
                          </select>
                        )}

                        {selectedOrderId && selectedOrderObj && (
                          <div className="mt-2">
                            {isSelectedOrderInWarranty ? (
                              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                                <input
                                  type="checkbox"
                                  id="isWarranty"
                                  checked={form.is_warranty}
                                  onChange={e => {
                                    const checked = e.target.checked;
                                    setForm(p => ({
                                      ...p,
                                      is_warranty: checked,
                                      repair_type: checked ? 'WARRANTY_SERVICE' : 'FRAME_REPAIR',
                                      estimated_cost: checked ? '0' : '',
                                    }));
                                  }}
                                  className="w-4 h-4 rounded border-slate-300 accent-emerald-500 cursor-pointer"
                                />
                                <label htmlFor="isWarranty" className="text-xs font-bold text-emerald-800 cursor-pointer">
                                  Apply Active Warranty Service (Free Repair)
                                </label>
                              </div>
                            ) : (
                              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                                <span>This product's warranty has expired. Only paid services available.</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Repair Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                      Repair / Service Type
                    </label>
                    <select
                      value={form.repair_type}
                      disabled={form.is_warranty}
                      onChange={e => setForm(p => ({ ...p, repair_type: e.target.value, is_warranty: e.target.value === 'WARRANTY_SERVICE' }))}
                      className="w-full px-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      {REPAIR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                      Estimated Cost (₹) {!form.is_warranty && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      disabled={form.is_warranty}
                      value={form.is_warranty ? '0' : form.estimated_cost}
                      onChange={e => setForm(p => ({ ...p, estimated_cost: e.target.value }))}
                      className={`w-full px-3 py-2.5 text-sm font-semibold rounded-xl border focus:outline-none ${form.is_warranty ? 'bg-slate-50 border-slate-200 text-slate-400' :
                          errors.estimated_cost ? 'border-red-400 focus:ring-4 focus:ring-red-100' : 'border-slate-200 focus:ring-4 focus:ring-blue-500/10'
                        }`}
                    />
                    {errors.estimated_cost && <p className="text-xs text-red-500 mt-1">{errors.estimated_cost}</p>}
                  </div>
                </div>

                {!form.is_warranty && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                          Advance Payment Collected (₹)
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 200 (leave 0 if unpaid)"
                          value={form.advance_paid}
                          onChange={e => setForm(p => ({ ...p, advance_paid: e.target.value }))}
                          className="w-full px-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                          Payment Method
                        </label>
                        <select
                          value={form.payment_method}
                          onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))}
                          className="w-full px-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white cursor-pointer"
                        >
                          <option value="CASH">Cash</option>
                          <option value="CARD">Credit / Debit Card</option>
                          <option value="UPI">UPI / QR Code</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="CHEQUE">Cheque</option>
                          <option value="ONLINE">Online Payment</option>
                        </select>
                      </div>
                    </div>

                    {/* Live Billing & Invoice Badge Summary */}
                    {(() => {
                      const costVal = Number(form.estimated_cost || 0);
                      const advVal = Number(form.advance_paid || 0);
                      const dueVal = Math.max(0, costVal - advVal);
                      const isFullyPaid = dueVal <= 0;

                      return (
                        <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                          isFullyPaid ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}>
                          <div className="space-y-0.5">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                              isFullyPaid ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}>
                              {isFullyPaid ? 'FINAL INVOICE (PAID IN FULL)' : 'TEMPORARY INVOICE (PARTIALLY PAID)'}
                            </span>
                            <p className="font-semibold text-slate-600">
                              Method: <strong className="text-slate-900">{form.payment_method}</strong>
                            </p>
                          </div>
                          <div className="text-right font-semibold">
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Balance Due</p>
                            <p className={`text-base font-black ${dueVal > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              ₹{dueVal.toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    Product Unit SKU (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Type Unit SKU (e.g. RB2025001U0030)"
                    value={form.unit_sku}
                    onChange={e => setForm(p => ({ ...p, unit_sku: e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase() }))}
                    className="w-full px-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    Repair Description & Issue Details
                  </label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Enter details of frame breakage, lens crack, scratch, parts required, etc..."
                    className="w-full px-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white h-24 resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 flex-shrink-0 bg-slate-50">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isCreating}
                  className="px-5 py-2 text-sm font-bold text-white bg-[#0A0F1F] rounded-xl hover:bg-slate-800 transition-colors shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer">
                  {isCreating ? 'Booking...' : 'Book Repair Job'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Repair Detail Drawer */}
      {selectedRepairForView && (
        <RepairDetailDrawer
          repair={selectedRepairForView}
          onClose={() => setSelectedRepairForView(null)}
          onStatusChange={handleStatusChange}
          onBillClick={(r) => {
            setSelectedRepairForView(null);
            setSelectedRepairForBill(r);
          }}
          onEditClick={(r) => {
            setSelectedRepairForView(null);
            setSelectedRepairForEdit(r);
          }}
          isUpdatingStatus={isUpdatingStatus}
          canUpdateStatus={perms.canUpdate}
        />
      )}

      {/* Repair Bill Modal */}
      {selectedRepairForBill && (
        <RepairBillModal
          isOpen={!!selectedRepairForBill}
          onClose={() => setSelectedRepairForBill(null)}
          repairId={selectedRepairForBill.id}
          billNumber={selectedRepairForBill.repair_number}
          isFinal={selectedRepairForBill.is_final}
        />
      )}

      {/* Edit Repair / Payment Modal */}
      {selectedRepairForEdit && (
        <EditRepairModal
          isOpen={!!selectedRepairForEdit}
          onClose={() => setSelectedRepairForEdit(null)}
          repair={selectedRepairForEdit}
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
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-600',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-600',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-600',
    rose: 'bg-rose-500/10 border-rose-500/20 text-rose-600',
    slate: 'bg-slate-500/10 border-slate-500/20 text-slate-600',
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

/* ── REPAIR VIEW DETAIL DRAWER ── */
const RepairDetailDrawer = ({ repair, onClose, onStatusChange, onBillClick, isUpdatingStatus, canUpdateStatus = true }) => {
  if (!repair) return null;

  const warrantyConfig = repair.is_warranty
    ? { label: 'Warranty Covered (Free)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
    : { label: 'Out of Warranty (Paid)', color: 'text-slate-600 bg-slate-100 border-slate-200' };

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[998] animate-fade-in font-sans" onClick={onClose} aria-hidden="true" />
      <div className="fixed top-0 right-0 w-full sm:max-w-md h-full bg-slate-50 shadow-2xl flex flex-col z-[1000] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Wrench className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate">Repair Details</h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{repair.repair_number}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors flex-shrink-0 ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Strip */}
        <div className="px-5 py-3 bg-white border-b border-slate-100 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(repair.status)}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {getStatusLabel(repair.status)}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${warrantyConfig.color}`}>
              {warrantyConfig.label}
            </span>
          </div>
          <span className="text-xs text-slate-400 font-semibold">Received: {fmtDate(repair.received_date)}</span>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-4 space-y-4">

          {/* Bill Action Banner */}
          <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 rounded-2xl border border-amber-200 p-4 shadow-sm flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-amber-900">Repair Job Bill Available</p>
              <p className="text-[11px] text-amber-700 font-medium">View, print, or download repair bill HTML</p>
            </div>
            <button
              type="button"
              onClick={() => onBillClick && onBillClick(repair)}
              className="px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all shadow-md flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              View Bill
            </button>
          </div>

          <Section icon={User} title="Customer Information" color="blue">
            <DetailRow label="Customer Name" value={
              repair.customer_id
                ? <Link to={`/admin/loyalty/customer/${repair.customer_id}`} className="text-blue-600 hover:underline font-bold">{repair.customer_full_name}</Link>
                : (repair.customer_full_name || repair.customer_name || '—')
            } />
            <DetailRow label="Customer Type" value={repair.customer_id ? 'Registered Customer' : 'Walk-in / New Customer'} />
            {repair.store_name && <DetailRow label="Store" value={repair.store_name} />}
          </Section>

          <Section icon={Wrench} title="Repair Information" color="amber">
            <DetailRow label="Type" value={getTypeBadge(repair.repair_type)} />
            <DetailRow label="Estimated Cost" value={repair.is_warranty ? 'Free (Warranty)' : fmtCurrency(repair.estimated_cost)} />
            {repair.final_cost && <DetailRow label="Final Cost" value={fmtCurrency(repair.final_cost)} />}
            {repair.unit_sku && <DetailRow label="Product Unit SKU" value={repair.unit_sku} mono />}
            {repair.sale_invoice_number && <DetailRow label="Sale Reference" value={repair.sale_invoice_number} mono />}
          </Section>

          {/* Billing & Payment Details */}
          {(() => {
            const tot = repair.is_warranty ? 0 : Number(repair.total_cost ?? repair.final_cost ?? repair.estimated_cost ?? 0);
            const pd = Number(repair.paid_amount ?? repair.advance_paid ?? 0);
            const due = Number(repair.due_amount ?? Math.max(0, tot - pd));
            const isFin = repair.is_final ?? (due <= 0 || repair.is_warranty);

            return (
              <Section icon={DollarSign} title="Billing & Payment Details" color="emerald">
                <DetailRow label="Total Cost" value={repair.is_warranty ? 'Free (Warranty)' : fmtCurrency(tot)} />
                <DetailRow label="Advance Paid" value={fmtCurrency(pd)} />
                <DetailRow label="Balance Due" value={due > 0 ? fmtCurrency(due) : '₹0 (Paid in Full)'} />
                <DetailRow label="Payment Method" value={(repair.payment_method || 'CASH').toUpperCase()} />
                <DetailRow label="Invoice Status" value={
                  isFin ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      FINAL INVOICE
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                      TEMPORARY INVOICE
                    </span>
                  )
                } />
              </Section>
            );
          })()}

          {repair.description && (
            <Section icon={Package} title="Description" color="slate">
              <p className="text-xs text-slate-700 font-medium py-3 leading-relaxed">{repair.description}</p>
            </Section>
          )}

          <Section icon={Clock} title="Timeline" color="purple">
            <DetailRow label="Received Date" value={fmtDate(repair.received_date)} />
            <DetailRow label="Est. Completion" value={fmtDate(repair.estimated_completion_date)} />
            <DetailRow label="Completed Date" value={fmtDate(repair.completed_date)} />
          </Section>

          {repair.notes && (
            <Section icon={DollarSign} title="Internal Notes" color="rose">
              <p className="text-xs text-slate-700 font-medium py-3 leading-relaxed">{repair.notes}</p>
            </Section>
          )}

          {/* Status Updater in Drawer */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Update Status</p>
            <select
              value={repair.status}
              onChange={e => onStatusChange(repair.id, e.target.value)}
              disabled={isUpdatingStatus || !canUpdateStatus}
              className={`w-full px-3 py-2 text-sm font-bold rounded-xl border focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer ${getStatusBadgeClass(repair.status)}`}
            >
              {REPAIR_STATUSES.map(st => (
                <option key={st.value} value={st.value}>{st.label}</option>
              ))}
            </select>
          </div>

        </div>
      </div>
    </>,
    document.body
  );
};

export default Repair;
