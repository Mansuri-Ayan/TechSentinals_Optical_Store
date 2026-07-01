import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Search, Plus, Truck, ChevronRight,
  Edit2, Trash2, X as XIcon,
  Package, ShoppingCart, CheckCircle,
  Phone, MapPin, DollarSign, Store, ChevronDown
} from 'lucide-react';
import Pagination from '../../components/shared/Pagination';
import AddEditSupplierModal from '../../components/admin/suppliers/AddEditSupplierModal';
import DeleteConfirmModal from '../../components/admin/suppliers/DeleteConfirmModal';
import { useStoreStore } from '../../store/store';
import { useSuppliers } from '../../hooks/useSuppliers';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import { useRoleContext } from '../../hooks/useRoleContext';

const ITEMS_PER_PAGE = 12;

/* ── Status badge ── */
const StatusBadge = ({ status }) => {
  const active = status === 'Active';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${active ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-600 bg-slate-100 border-slate-200'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {status}
    </span>
  );
};

/* ── PO Status badge ── */
const POStatusBadge = ({ status }) => {
  let cls = 'text-slate-600 bg-slate-100 border-slate-200';
  if (status === 'RECEIVED' || status === 'Completed') {
    cls = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  } else if (status === 'CANCELLED' || status === 'Cancelled') {
    cls = 'text-rose-700 bg-rose-50 border-rose-200';
  } else if (status === 'PARTIALLY_RECEIVED' || status === 'DRAFT' || status === 'SENT') {
    cls = 'text-amber-700 bg-amber-50 border-amber-200';
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cls}`}>
      {status}
    </span>
  );
};

/* ── Supplier Card ── */
const SupplierCard = ({ supplier: s, onClick, onEdit, onDelete }) => (
  <div
    onClick={onClick}
    className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden"
  >
    {/* Top accent bar */}
    <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

    <div className="p-4 sm:p-5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-black text-xl shadow-md flex-shrink-0">
            {s.name[0]}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate">{s.name}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">{s.contactPerson}</p>
          </div>
        </div>
        <StatusBadge status={s.status} />
      </div>

      {/* Info rows */}
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span>{s.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="truncate">{s.city}, {s.state}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
        <div className="flex-1 flex items-center gap-1.5 px-3 py-2 bg-purple-50 border border-purple-100 rounded-xl">
          <DollarSign className="w-3.5 h-3.5 text-purple-600" />
          <div>
            <p className="text-[10px] font-semibold text-purple-500">Remaining Due</p>
            <p className="text-sm font-bold text-slate-900 leading-none">₹{(s.remainingDue || 0).toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl">
          <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
          <div>
            <p className="text-[10px] font-semibold text-blue-500">Orders to Receive</p>
            <p className="text-sm font-bold text-slate-900 leading-none">{s.totalOrders}</p>
          </div>
        </div>
      </div>
    </div>

    {/* Hover action buttons (top-right overlay) */}
    <div
      className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={e => e.stopPropagation()}
    >
      <button
        onClick={() => onEdit(s)}
        className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-xl shadow-sm text-slate-500 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 transition-colors"
        title="Edit supplier"
      >
        <Edit2 className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onDelete(s)}
        className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-xl shadow-sm text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors"
        title="Delete supplier"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────── */
const Suppliers = () => {
  const navigate = useNavigate();
  const { storeId, buildPath, showStoreSwitcher, isPathAdmin } = useRoleContext();
  const { selectedStore, setSelectedStore, stores } = useStoreStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('All');
  const [inPageStoreId, setInPageStoreId] = useState(storeId);

  useEffect(() => {
    setInPageStoreId(storeId);
  }, [storeId]);

  const targetStoreId = inPageStoreId === 'admin' ? undefined : Number(inPageStoreId);
  const { purchaseOrders } = usePurchaseOrders({ 
    limit: 1000, 
    include_nested: false,
    store_id: targetStoreId
  });

  const supplierDues = useMemo(() => {
    if (!purchaseOrders) return {};
    const dues = {};
    purchaseOrders.forEach(po => {
      const sId = po.supplier_id;
      const due = Number(po.due_amount || 0);
      dues[sId] = (dues[sId] || 0) + due;
    });
    return dues;
  }, [purchaseOrders]);

  const supplierOrdersToReceive = useMemo(() => {
    if (!purchaseOrders) return {};
    const counts = {};
    purchaseOrders.forEach(po => {
      const sId = po.supplier_id;
      if (po.status !== 'RECEIVED' && po.status !== 'CANCELLED') {
        counts[sId] = (counts[sId] || 0) + 1;
      }
    });
    return counts;
  }, [purchaseOrders]);

  const totalRemainingPayment = useMemo(() => {
    return Object.values(supplierDues).reduce((sum, val) => sum + val, 0);
  }, [supplierDues]);

  const isGlobalFetch = statusFilter === 'RemainingPayment' || statusFilter === 'TotalOrders';

  const {
    suppliers: backendSuppliers,
    totalSuppliers,
    isLoadingSuppliers,
    isSuppliersError,
    createSupplierAsync,
    updateSupplierAsync,
    deleteSupplierAsync,
  } = useSuppliers(inPageStoreId, {
    page: isGlobalFetch ? 1 : currentPage,
    limit: isGlobalFetch ? 1000 : ITEMS_PER_PAGE,
    search: searchTerm.trim(),
    status: statusFilter === 'Active' ? 'ACTIVE' : undefined,
    global: isGlobalFetch,
  });

  const suppliers = useMemo(() => {
    let list = backendSuppliers.map((supplier) => ({
      ...supplier,
      name: supplier.company_name,
      contactPerson: supplier.contact_person || 'No contact person',
      status: supplier.status === 'ACTIVE' ? 'Active' : supplier.status,
      totalProducts: supplier.totalProducts || 0,
      totalOrders: supplierOrdersToReceive[supplier.id] || 0,
      totalAmount: supplier.totalAmount || 0,
      remainingDue: supplierDues[supplier.id] || 0,
    }));

    if (statusFilter === 'RemainingPayment') {
      list = list.filter(s => s.remainingDue > 0);
    }
    return list;
  }, [backendSuppliers, supplierDues, supplierOrdersToReceive, statusFilter]);

  const displayedSuppliers = useMemo(() => {
    if (statusFilter === 'RemainingPayment') {
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      return suppliers.slice(start, start + ITEMS_PER_PAGE);
    }
    return suppliers;
  }, [suppliers, currentPage, statusFilter]);

  const filteredPurchaseOrders = useMemo(() => {
    if (!purchaseOrders) return [];
    let list = [...purchaseOrders];
    
    list.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(po => 
        (po.po_number || '').toLowerCase().includes(q) ||
        (po.supplier_name || '').toLowerCase().includes(q) ||
        (po.status || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [purchaseOrders, searchTerm]);

  const displayedPurchaseOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPurchaseOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPurchaseOrders, currentPage]);

  const [editSupplier, setEditSupplier]   = useState(null);
  const [deleteSupplier, setDeleteSupplier] = useState(null);
  const [showAddModal, setShowAddModal]   = useState(false);

  useEffect(() => {
    if (isPathAdmin && storeId && stores.length > 0) {
      const urlStore = stores.find(s => String(s.id) === String(storeId));
      if (urlStore && (!selectedStore || String(selectedStore.id) !== String(storeId))) {
        setSelectedStore(urlStore);
      }
    }
  }, [storeId, stores, selectedStore, setSelectedStore, isPathAdmin]);

  /* ── Filter ── */
  const toSupplierPayload = (data) => ({
    company_name: data.name.trim(),
    contact_person: data.contactPerson?.trim() || null,
    email: data.email?.trim() || null,
    phone: data.phone?.trim() || null,
    city: data.city?.trim() || null,
    state: data.state || null,
    pincode: data.pincode?.trim() || null,
    alternate_phone: data.alternate_phone?.trim() || null,
    gst_number: data.gst_number?.trim() || null,
    pan_number: data.pan_number?.trim() || null,
    bank_name: data.bank_name?.trim() || null,
    bank_account_number: data.bank_account_number?.trim() || null,
    bank_ifsc: data.bank_ifsc?.trim() || null,
    credit_days: data.credit_days !== '' && data.credit_days !== undefined && data.credit_days !== null ? Number(data.credit_days) : 0,
    notes: data.notes?.trim() || null,
    status: 'ACTIVE',
  });

  /* ── Handlers ── */
  const handleSave = async (data) => {
    try {
      const payload = toSupplierPayload(data);
      if (data.id) {
        await updateSupplierAsync({ id: data.id, payload });
      } else {
        await createSupplierAsync({ payload });
      }
      setShowAddModal(false);
      setEditSupplier(null);
    } catch {
      // Toast is handled in the mutation hook.
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteSupplierAsync(id);
      setDeleteSupplier(null);
    } catch {
      // Toast is handled in the mutation hook.
    }
  };

  /* ── KPI stats ── */
  const kpi = useMemo(() => {
    return {
      total: totalSuppliers,
      active: statusFilter === 'Active' ? totalSuppliers : backendSuppliers.filter(s => s.status === 'ACTIVE').length,
      orders: purchaseOrders ? purchaseOrders.length : 0,
    };
  }, [backendSuppliers, totalSuppliers, purchaseOrders, statusFilter]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">

      {/* ── Breadcrumb + Header ── */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 space-x-2">
          <Link to={buildPath('dashboard')} className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-semibold">Suppliers</span>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Truck className="w-8 h-8 text-blue-500" />
              Suppliers
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm sm:text-base">
              Manage all product suppliers and their purchase histories.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {showStoreSwitcher && (
              <div className="relative animate-fade-in">
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
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex-shrink-0 justify-center animate-fade-in"
            >
              <Plus className="w-4 h-4" />
              Add Supplier
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-6">
        {[
          { label: 'Total Suppliers', value: kpi.total, icon: Truck, color: 'text-blue-600 bg-blue-50 border-blue-200', activeColor: 'ring-2 ring-blue-500 bg-blue-100/80', onClick: () => { setStatusFilter('All'); setCurrentPage(1); }, active: statusFilter === 'All' },
          { label: 'Active', value: kpi.active, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', activeColor: 'ring-2 ring-emerald-500 bg-emerald-100/80', onClick: () => { setStatusFilter('Active'); setCurrentPage(1); }, active: statusFilter === 'Active' },
          { label: 'Remaining Payment', value: `₹${totalRemainingPayment.toLocaleString('en-IN')}`, icon: DollarSign, color: 'text-purple-600 bg-purple-50 border-purple-200', activeColor: 'ring-2 ring-purple-500 bg-purple-100/80', onClick: () => { setStatusFilter('RemainingPayment'); setCurrentPage(1); }, active: statusFilter === 'RemainingPayment' },
          { label: 'Total Orders', value: kpi.orders, icon: ShoppingCart, color: 'text-amber-600 bg-amber-50 border-amber-200', activeColor: 'ring-2 ring-amber-500 bg-amber-100/80', onClick: () => { setStatusFilter('TotalOrders'); setCurrentPage(1); }, active: statusFilter === 'TotalOrders' },
        ].map(card => {
          const Icon = card.icon;
          const content = (
            <>
              <div className="p-2 sm:p-2.5 rounded-xl bg-white/60 flex-shrink-0">
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-semibold opacity-70 truncate">{card.label}</p>
                <p className="text-lg sm:text-2xl font-bold text-slate-900 leading-tight">{card.value}</p>
              </div>
            </>
          );
          
          const cardCls = `flex items-center gap-2 sm:gap-4 p-3 sm:p-5 rounded-2xl border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${card.color} ${card.active ? card.activeColor : ''}`;

          if (card.link) {
            return (
              <Link key={card.label} to={card.link} className={cardCls}>
                {content}
              </Link>
            );
          }

          return (
            <div key={card.label} onClick={card.onClick} className={cardCls}>
              {content}
            </div>
          );
        })}
      </div>

      {/* ── Search Bar ── */}
      <div className="relative w-full mb-5 group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          placeholder="Search by name, contact, city, state or status…"
          className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-medium transition-all shadow-sm placeholder:text-slate-400"
        />
        {searchTerm && (
          <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
            className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Results info ── */}
      {searchTerm && (
        <p className="text-xs text-slate-500 font-medium mb-4">
          {totalSuppliers} supplier{totalSuppliers !== 1 ? 's' : ''} found for "{searchTerm}"
        </p>
      )}

      {/* ── Grid/Table Listing ── */}
      {statusFilter === 'TotalOrders' ? (
        filteredPurchaseOrders.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
              <ShoppingCart className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No transactions found</h3>
            <p className="text-slate-500 text-sm">Try adjusting your search or register a new purchase order.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm mb-6 animate-fade-in">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['PO Number / Date', 'Supplier', 'Items Qty', 'Total Amount', 'Paid', 'Due', 'Status', 'Action'].map(col => (
                      <th key={col} className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayedPurchaseOrders.map(po => (
                    <tr
                      key={po.id}
                      onClick={() => navigate(buildPath(`suppliers/${po.supplier_id}`)) }
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-slate-800">{po.po_number}</span>
                          <span className="text-xs text-slate-400 mt-0.5">{new Date(po.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-950">
                        {po.supplier_name}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg">
                          {po.items?.reduce((sum, item) => sum + (item.quantity_ordered || 0), 0) || 0} items
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900">
                        ₹{Number(po.total_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-4 font-semibold text-emerald-600">
                        ₹{Number(po.paid_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-4 font-semibold text-rose-600">
                        ₹{Number(po.due_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-4">
                        <POStatusBadge status={po.status} />
                      </td>
                      <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(buildPath(`suppliers/${po.supplier_id}`))}
                          className="px-3 py-1.5 bg-[#0A0F1F] text-white hover:bg-slate-800 text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                        >
                          View Supplier <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3 mb-6">
              {displayedPurchaseOrders.map(po => (
                <div
                  key={po.id}
                  onClick={() => navigate(buildPath(`suppliers/${po.supplier_id}`))}
                  className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-mono font-bold text-sm text-slate-800">{po.po_number}</p>
                      <p className="text-[10px] text-slate-400">{new Date(po.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <POStatusBadge status={po.status} />
                  </div>
                  <p className="font-bold text-slate-950 text-sm mb-2">{po.supplier_name}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-50 pt-2.5">
                    <div>
                      <p className="text-slate-400 font-semibold mb-0.5">Total Amount</p>
                      <p className="font-bold text-slate-900">₹{Number(po.total_amount).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold mb-0.5">Due Amount</p>
                      <p className="font-bold text-rose-600">₹{Number(po.due_amount).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              totalItems={filteredPurchaseOrders.length}
              itemsPerPage={ITEMS_PER_PAGE}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </>
        )
      ) : isLoadingSuppliers ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-500 font-semibold animate-pulse">
          Loading suppliers...
        </div>
      ) : isSuppliersError ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-12 text-center text-red-700 font-semibold">
          Unable to load suppliers for this store.
        </div>
      ) : suppliers.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <Truck className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No suppliers found</h3>
          <p className="text-slate-500 text-sm">Try adjusting your search or add a new supplier.</p>
        </div>
      ) : (
        <>
          {/* Card-based Grid Layout for all screen sizes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-6 animate-fade-in">
            {displayedSuppliers.map(s => (
              <SupplierCard
                key={s.id}
                supplier={s}
                onClick={() => navigate(buildPath(`suppliers/${s.id}`))}
                onEdit={setEditSupplier}
                onDelete={setDeleteSupplier}
              />
            ))}
          </div>

          <Pagination
            totalItems={statusFilter === 'RemainingPayment' ? suppliers.length : totalSuppliers}
            itemsPerPage={ITEMS_PER_PAGE}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* ── Modals ── */}
      <AddEditSupplierModal
        isOpen={showAddModal || Boolean(editSupplier)}
        supplier={editSupplier}
        onClose={() => { setShowAddModal(false); setEditSupplier(null); }}
        onSubmit={handleSave}
      />

      <DeleteConfirmModal
        supplier={deleteSupplier}
        onClose={() => setDeleteSupplier(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default Suppliers;
