import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, User, Mail, Phone, MapPin, Package,
  ShoppingCart, TrendingUp, Calendar, Building2, ArrowRightLeft,
  CheckCircle, Clock, XCircle, AlertTriangle, Layers, Tag, Edit2,
  Trash2, PackagePlus, CreditCard, Loader2,
} from 'lucide-react';
import AddTransactionModal from '../../components/admin/suppliers/AddTransactionModal';
import TransactionDetailModal from '../../components/admin/suppliers/TransactionDetailModal';
import AddEditSupplierModal from '../../components/admin/suppliers/AddEditSupplierModal';
import DeleteConfirmModal from '../../components/admin/suppliers/DeleteConfirmModal';
import AddPaymentModal from '../../components/admin/suppliers/AddPaymentModal';
import { useStoreStore } from '../../store/store';
import { useSupplier, useSupplierProducts, useSuppliers } from '../../hooks/useSuppliers';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import { useRoleContext } from '../../hooks/useRoleContext';

/* ── Helpers ── */
const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const STATUS_CFG = {
  Completed: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle },
  Pending:   { color: 'text-amber-700 bg-amber-50 border-amber-200',       dot: 'bg-amber-500',   icon: Clock      },
  Cancelled: { color: 'text-slate-600 bg-slate-100 border-slate-200',      dot: 'bg-slate-400',   icon: XCircle    },
  Failed:    { color: 'text-red-700 bg-red-50 border-red-200',             dot: 'bg-red-500',     icon: AlertTriangle },
};

const StatusBadge = ({ status }) => {
  const c = STATUS_CFG[status] || STATUS_CFG.Pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${c.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
};

const GRAD = [
  'from-blue-400 to-indigo-600', 'from-emerald-400 to-teal-600',
  'from-purple-400 to-violet-600', 'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-600', 'from-cyan-400 to-sky-600',
];

const ProductAvatar = ({ name, idx }) => (
  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${GRAD[idx % GRAD.length]} flex items-center justify-center flex-shrink-0 shadow-md`}>
    <span className="text-sm font-black text-white">{name?.[0] ?? 'P'}</span>
  </div>
);

const TABS = [
  { id: 'info',      label: 'Info',      icon: User          },
  { id: 'products',  label: 'Products',  icon: Package        },
  { id: 'history',   label: 'History',   icon: ArrowRightLeft },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp     },
];

const SupplierDetail = () => {
  const { storeId, buildPath, showStoreSwitcher, isPathAdmin } = useRoleContext();
  const { id } = useParams();
  const navigate = useNavigate();

  const { stores, selectedStore, setSelectedStore } = useStoreStore();
  
  // Active store check and auto-sync
  useEffect(() => {
    if (isPathAdmin && storeId && stores.length > 0) {
      const urlStore = stores.find(st => String(st.id) === String(storeId));
      if (urlStore && (!selectedStore || String(selectedStore.id) !== String(storeId))) {
        setSelectedStore(urlStore);
      }
    }
  }, [storeId, stores, selectedStore, setSelectedStore, isPathAdmin]);

  const activeStoreName = useMemo(() => {
    const matched = stores.find(st => String(st.id) === String(storeId));
    return matched ? matched.store_name : 'Active Store';
  }, [stores, storeId]);

  // React Query queries
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState('All');
  const { supplier, isLoadingSupplier, isSupplierError } = useSupplier(id);
  const { products: catalogueProducts, addProductAsync } = useSupplierProducts(id);
  const { purchaseOrders, recordPurchaseAsync, recordPaymentAsync, isLoadingPurchaseOrders } = usePurchaseOrders({
    supplier_id: id,
    has_due: selectedPaymentFilter === 'Remaining' ? true : selectedPaymentFilter === 'Paid' ? false : undefined,
  });
  const { updateSupplierAsync, deleteSupplierAsync } = useSuppliers(storeId);

  const [activeTab, setActiveTab] = useState('info');
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentTargetTransaction, setPaymentTargetTransaction] = useState(null);

  const handleRecordPaymentSubmit = async (poId, payload) => {
    await recordPaymentAsync({ poId, payload });
    setShowAddPayment(false);
    setPaymentTargetTransaction(null);
    setSelectedTransaction(null);
  };

  const handleOpenPaymentFromDetail = (tx) => {
    setPaymentTargetTransaction(tx);
    setShowAddPayment(true);
  };

  // Map API Supplier to UI Model
  const s = useMemo(() => {
    if (!supplier) return null;
    return {
      ...supplier,
      name: supplier.company_name,
      contactPerson: supplier.contact_person || 'No contact person',
      status: supplier.status === 'ACTIVE' ? 'Active' : supplier.status,
      createdAt: supplier.created_at,
    };
  }, [supplier]);

  // Compute PO Stats
  const { totalAmount, lastPurchase, totalOrders } = useMemo(() => {
    if (!purchaseOrders || purchaseOrders.length === 0) {
      return { totalAmount: 0, lastPurchase: null, totalOrders: 0 };
    }
    const sumAmount = purchaseOrders.reduce((a, t) => a + Number(t.total_amount || 0), 0);
    const lastDate = purchaseOrders.reduce((l, t) => t.order_date > l ? t.order_date : l, purchaseOrders[0].order_date);
    return { totalAmount: sumAmount, lastPurchase: lastDate, totalOrders: purchaseOrders.length };
  }, [purchaseOrders]);

  // Map API Products catalogue to UI Products
  const productsList = useMemo(() => {
    if (!catalogueProducts) return [];
    return catalogueProducts.map((p, idx) => {
      // Sum the quantity received for this product across all POs
      const qtySupplied = purchaseOrders
        .filter(po => po.status === 'RECEIVED' || po.status === 'PARTIALLY_RECEIVED')
        .flatMap(po => po.items || [])
        .filter(item => Number(item.product_id) === Number(p.product_id))
        .reduce((sum, item) => sum + (item.quantity_received || 0), 0);

      // Latest purchase date for this product
      const matchingPos = purchaseOrders
        .filter(po => (po.status === 'RECEIVED' || po.status === 'PARTIALLY_RECEIVED') &&
                      (po.items || []).some(item => Number(item.product_id) === Number(p.product_id)));
      const lastDate = matchingPos.length > 0
        ? matchingPos.reduce((latest, po) => po.order_date > latest ? po.order_date : latest, matchingPos[0].order_date)
        : null;

      return {
        id: p.id,
        name: p.product_name || `Product #${p.product_id}`,
        category: p.category_name || 'Generic',
        brand: p.brand_name || 'Generic',
        quantitySupplied: qtySupplied,
        lastPurchaseDate: lastDate,
      };
    });
  }, [catalogueProducts, purchaseOrders]);

  // Map API Purchase Orders to UI Transactions
  const transactionsList = useMemo(() => {
    if (!purchaseOrders) return [];
    return purchaseOrders.map(po => {
      let mappedStatus = 'Pending';
      if (po.status === 'RECEIVED') mappedStatus = 'Completed';
      else if (po.status === 'CANCELLED') mappedStatus = 'Cancelled';

      const firstItem = po.items?.[0];
      return {
        id: po.po_number,
        rawId: po.id,
        date: po.order_date,
        product: firstItem?.product_name || 'Multiple Products',
        category: firstItem?.category_name || '—',
        quantity: firstItem?.quantity_ordered || 0,
        amount: Number(po.total_amount),
        paidAmount: Number(po.paid_amount),
        dueAmount: Number(po.due_amount),
        paymentMethod: po.payments?.[0]?.payment_method || 'Credit',
        paymentDate: po.payments?.[0]?.payment_date || po.order_date,
        sentTo: po.store_name || 'All Store',
        status: mappedStatus,
        remarks: po.notes,
      };
    });
  }, [purchaseOrders]);

  const handleAddTransaction = async (data) => {
    // 1. If product is not in supplier catalogue, register it dynamically first
    const exists = catalogueProducts.some(p => Number(p.product_id) === Number(data.productId));
    if (!exists) {
      await addProductAsync({
        product_id: data.productId,
        unit_price: data.amount / data.quantity,
        minimum_order_quantity: 1,
        lead_time_days: 1,
      });
    }

    // 2. Raise, receive, and pay for purchase order
    await recordPurchaseAsync({
      supplierId: id,
      storeId: data.storeId || storeId,
      productId: data.productId,
      quantity: data.quantity,
      totalAmount: data.amount,
      paidAmount: data.paidAmount,
      paymentMethod: data.method,
      date: data.date,
      remarks: data.remarks,
      costPrice: data.costPrice,
      sellingPrice: data.sellingPrice,
      discountPercent: data.discountPercent,
    });

    setShowAddTransaction(false);
  };

  const handleEditSupplier = async (data) => {
    const payload = {
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
    };
    await updateSupplierAsync({ id, payload });
    setShowEditModal(false);
  };

  const handleDeleteConfirm = async () => {
    await deleteSupplierAsync(id);
    setShowDeleteModal(false);
    navigate(buildPath('suppliers'));
  };

  if (isLoadingSupplier) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 font-sans">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-semibold text-sm">Loading supplier details…</p>
      </div>
    );
  }

  if (isSupplierError || !s) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto text-center font-sans">
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 max-w-md mx-auto">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-1">Supplier Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">The supplier you are looking for does not exist or has been deleted.</p>
          <Link to={buildPath('suppliers')} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Suppliers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">
      {/* Breadcrumbs */}
      <div className="mb-6">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 space-x-2 flex-wrap">
          <Link to={buildPath('dashboard')} className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <Link to={buildPath('suppliers')} className="hover:text-slate-800 transition-colors">Suppliers</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-semibold truncate max-w-[150px] sm:max-w-xs">{s.name}</span>
        </div>
      </div>

      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 sm:mb-8 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => navigate(buildPath('suppliers'))}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex-shrink-0"
            title="Back to list"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            {/* Large Avatar */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-md flex-shrink-0">
              {s.name[0]}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight truncate max-w-[200px] sm:max-w-md lg:max-w-xl">
                  {s.name}
                </h1>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${s.status === 'Active' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-600 bg-slate-100 border-slate-200'}`}>
                  {s.status}
                </span>
              </div>
              <p className="text-slate-500 mt-1 text-xs sm:text-sm font-semibold truncate">
                {s.contactPerson} · {s.city}, {s.state}
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setShowAddTransaction(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow-md whitespace-nowrap animate-in fade-in duration-200"
          >
            <PackagePlus className="w-4 h-4" />
            Record Purchase
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200 transition-all shadow-sm flex-shrink-0"
            title="Edit supplier"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm flex-shrink-0"
            title="Delete supplier"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-100 overflow-x-auto hide-scrollbar pb-px">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-bold text-sm whitespace-nowrap transition-all -mb-px ${
                isActive
                  ? 'text-slate-900 border-slate-900'
                  : 'text-slate-400 border-transparent hover:text-slate-700 hover:border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 lg:p-8">

        {/* ── INFO TAB ── */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: Building2, label: 'Supplier Name',   value: s.name          },
                { icon: User,      label: 'Contact Person',  value: s.contactPerson },
                { icon: Mail,      label: 'Email Address',   value: s.email         },
                { icon: Phone,     label: 'Phone Number',    value: s.phone         },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-4 p-5 bg-slate-50 border border-slate-100 rounded-2xl transition-all hover:bg-slate-100/50">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <item.icon className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{item.label}</p>
                    <p className="text-sm sm:text-base font-bold text-slate-800 break-all">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Address Details Card */}
            <div className="p-5 sm:p-6 bg-slate-50 border border-slate-100 rounded-2xl relative overflow-hidden transition-all hover:bg-slate-100/50">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-slate-500" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Store Address</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[['City', s.city], ['State', s.state], ['Pincode', s.pincode]].map(([lbl, val]) => (
                  <div key={lbl} className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{lbl}</p>
                    <p className="text-sm sm:text-base font-bold text-slate-800">{val || '—'}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold px-1">
              <span>Supplier Created: {fmtDate(s.createdAt)}</span>
              <span>·</span>
              <span>Status: <span className={s.status === 'Active' ? 'text-emerald-600' : 'text-slate-500'}>{s.status}</span></span>
            </div>
          </div>
        )}

        {/* ── PRODUCTS TAB ── */}
        {activeTab === 'products' && (
          <div>
            {productsList.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Package className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                <p className="font-bold text-base text-slate-700">No products on record</p>
                <p className="text-xs text-slate-400 mt-1">Add goods to log the first product association.</p>
              </div>
            ) : (
              <>
                {/* Desktop Product Table */}
                <div className="hidden md:block border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {['Product Name', 'Category', 'Brand', 'Total Supplied', 'Last Purchase Date'].map(col => (
                          <th key={col} className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {productsList.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <ProductAvatar name={p.name} idx={idx} />
                              <span className="font-bold text-slate-900">{p.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-600">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200/60 rounded-lg text-slate-600 text-xs">
                              <Layers className="w-3.5 h-3.5" />
                              {p.category}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-600">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200/60 rounded-lg text-slate-600 text-xs">
                              <Tag className="w-3.5 h-3.5" />
                              {p.brand}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center justify-center px-3 py-1 bg-purple-50 border border-purple-100 text-purple-700 text-xs font-bold rounded-lg">
                              {p.quantitySupplied}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-500 font-semibold">{fmtDate(p.lastPurchaseDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Product List */}
                <div className="md:hidden space-y-3">
                  {productsList.map((p, idx) => (
                    <div key={p.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                      <ProductAvatar name={p.name} idx={idx} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-900 truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-semibold text-slate-500">{p.category}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-[10px] font-semibold text-slate-500">{p.brand}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Supplied</p>
                        <p className="text-sm font-bold text-slate-900">{p.quantitySupplied}</p>
                        <p className="text-[9px] text-slate-400">{fmtDate(p.lastPurchaseDate)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* Payment Filter Bar */}
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 flex-wrap gap-3">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Purchase Order History</span>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600">Payment Status:</label>
                <select
                  value={selectedPaymentFilter}
                  onChange={(e) => setSelectedPaymentFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white cursor-pointer"
                >
                  <option value="All">All Transactions</option>
                  <option value="Remaining">Remaining Payment (Due)</option>
                  <option value="Paid">Fully Paid</option>
                </select>
              </div>
            </div>

            {transactionsList.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-white border border-dashed border-slate-200 rounded-2xl">
                <ArrowRightLeft className="w-12 h-12 mx-auto mb-4 text-slate-250" />
                <p className="font-bold text-base text-slate-700">No transactions recorded</p>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedPaymentFilter !== 'All'
                    ? 'No transactions match the selected payment status.'
                    : 'Click "Record Purchase" to register history.'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop History Table */}
                <div className="hidden md:block border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {['Date', 'Reference ID', 'Product / Description', 'Category', 'Qty', 'Total Amount', 'Paid', 'Due', 'Payment Method', 'Store', 'Status'].map(col => (
                          <th key={col} className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {transactionsList.map(tx => (
                        <tr
                          key={tx.id}
                          onClick={() => setSelectedTransaction(tx)}
                          className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3.5 text-xs font-semibold text-slate-600 whitespace-nowrap">{fmtDate(tx.date)}</td>
                          <td className="px-4 py-3.5 text-xs font-mono font-bold text-slate-700 whitespace-nowrap">{tx.id}</td>
                          <td className="px-4 py-3.5 font-bold text-slate-900 max-w-[160px] truncate">{tx.product}</td>
                          <td className="px-4 py-3.5 text-xs text-slate-500">{tx.category}</td>
                          <td className="px-4 py-3.5">
                            {tx.quantity > 0 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                                {tx.quantity}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-xs font-bold text-slate-800">
                            {tx.amount > 0 ? fmt(tx.amount) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3.5 text-xs font-bold text-emerald-700">
                            {tx.paidAmount !== undefined ? fmt(tx.paidAmount) : (tx.amount > 0 ? fmt(tx.amount) : <span className="text-slate-300">—</span>)}
                          </td>
                          <td className="px-4 py-3.5 text-xs font-bold text-amber-700">
                            {tx.dueAmount !== undefined ? fmt(tx.dueAmount) : <span className="text-slate-300">₹0</span>}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-500">{tx.paymentMethod}</td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              {tx.sentTo}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={tx.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile History Cards */}
                <div className="md:hidden space-y-3">
                  {transactionsList.map(tx => (
                    <div
                      key={tx.id}
                      onClick={() => setSelectedTransaction(tx)}
                      className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3 cursor-pointer hover:border-slate-300 hover:bg-slate-100/50 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-slate-900 text-sm truncate">{tx.product}</p>
                          <p className="text-xs font-mono font-semibold text-slate-400 mt-0.5">{tx.id}</p>
                        </div>
                        <StatusBadge status={tx.status} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-slate-400 font-semibold mb-0.5">Category</p>
                          <p className="font-bold text-slate-700 truncate">{tx.category}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-semibold mb-0.5">Qty</p>
                          <p className="font-bold text-slate-900">{tx.quantity > 0 ? tx.quantity : '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-semibold mb-0.5">Total Amount</p>
                          <p className="font-bold text-slate-900">{tx.amount > 0 ? fmt(tx.amount) : '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-semibold mb-0.5">Paid Amount</p>
                          <p className="font-bold text-emerald-700">{tx.paidAmount !== undefined ? fmt(tx.paidAmount) : (tx.amount > 0 ? fmt(tx.amount) : '—')}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-semibold mb-0.5">Due Amount</p>
                          <p className="font-bold text-amber-700">{tx.dueAmount !== undefined ? fmt(tx.dueAmount) : '₹0'}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-200/50">
                        <span>{fmtDate(tx.date)} · {tx.paymentMethod}</span>
                        <span className="flex items-center gap-1 font-semibold text-slate-500">
                          <Building2 className="w-3.5 h-3.5" />
                          {tx.sentTo}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: 'Total Products',      value: productsList.length, icon: Package,     color: 'text-blue-700 bg-blue-50 border-blue-200'          },
                { label: 'Total Orders',        value: totalOrders,        icon: ShoppingCart, color: 'text-purple-700 bg-purple-50 border-purple-200'    },
                { label: 'Total Purchase Amt.', value: fmt(totalAmount),   icon: TrendingUp,  color: 'text-emerald-700 bg-emerald-50 border-emerald-200'  },
                { label: 'Last Purchase',       value: fmtDate(lastPurchase), icon: Calendar, color: 'text-amber-700 bg-amber-50 border-amber-200'        },
              ].map(kpi => {
                const Icon = kpi.icon;
                return (
                  <div key={kpi.label} className={`p-3 sm:p-5 rounded-2xl border ${kpi.color} space-y-1.5 sm:space-y-3 transition-transform hover:-translate-y-0.5`}>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] sm:text-xs font-bold opacity-75 truncate">{kpi.label}</p>
                      <div className="p-1.5 sm:p-2 rounded-xl bg-white/70 shadow-sm flex-shrink-0"><Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></div>
                    </div>
                    <p className="text-base sm:text-2xl font-black text-slate-900 leading-none">{kpi.value}</p>
                  </div>
                );
              })}
            </div>

            {/* Spend Breakdown Graph */}
            {transactionsList.length > 0 && (() => {
              const byCategory = {};
              transactionsList.forEach(t => {
                if (t.amount > 0) byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
              });
              const total = Object.values(byCategory).reduce((a, b) => a + Number(b), 0);
              if (!total) return null;
              return (
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6">Spend Breakdown by Category</h3>
                  <div className="space-y-4">
                    {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
                      const pct = Math.round((amt / total) * 100);
                      return (
                        <div key={cat} className="bg-white p-4 rounded-xl border border-slate-200/50 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-700">{cat}</span>
                            <span className="text-xs sm:text-sm font-bold text-slate-900">
                              {fmt(amt)} <span className="text-slate-400 font-medium ml-1">({pct}%)</span>
                            </span>
                          </div>
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Sub-modals */}
      <AddTransactionModal
        isOpen={showAddTransaction}
        supplierName={s.name}
        defaultSupplierId={id}
        storeName={activeStoreName}
        activeStoreId={storeId}
        onClose={() => setShowAddTransaction(false)}
        onSubmit={handleAddTransaction}
      />

      <TransactionDetailModal
        isOpen={Boolean(selectedTransaction)}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onRecordPayment={handleOpenPaymentFromDetail}
      />

      <AddPaymentModal
        isOpen={showAddPayment}
        po={paymentTargetTransaction}
        supplierName={s.name}
        onClose={() => {
          setShowAddPayment(false);
          setPaymentTargetTransaction(null);
        }}
        onSubmit={handleRecordPaymentSubmit}
      />

      <AddEditSupplierModal
        isOpen={showEditModal}
        supplier={s}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditSupplier}
      />

      {showDeleteModal && (
        <DeleteConfirmModal
          supplier={s}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
};

export default SupplierDetail;
