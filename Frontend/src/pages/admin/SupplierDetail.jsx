import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, User, Mail, Phone, MapPin, Package,
  ShoppingCart, TrendingUp, Calendar, Building2, ArrowRightLeft,
  CheckCircle, Clock, XCircle, AlertTriangle, Layers, Tag, Edit2,
  Trash2, PackagePlus, CreditCard,
} from 'lucide-react';
import { MOCK_SUPPLIERS } from '../../data/suppliersData';
import AddGoodsModal from '../../components/admin/suppliers/AddGoodsModal';
import AddPaymentModal from '../../components/admin/suppliers/AddPaymentModal';
import AddEditSupplierModal from '../../components/admin/suppliers/AddEditSupplierModal';
import DeleteConfirmModal from '../../components/admin/suppliers/DeleteConfirmModal';

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
  const { id } = useParams();
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState(() => {
    const saved = localStorage.getItem('suppliers');
    return saved ? JSON.parse(saved) : MOCK_SUPPLIERS;
  });

  const [activeTab, setActiveTab] = useState('info');
  const [showAddGoods, setShowAddGoods] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Sync back to localStorage if list changes
  useEffect(() => {
    localStorage.setItem('suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  // Find supplier in state list
  const s = useMemo(() => {
    return suppliers.find(item => String(item.id) === String(id));
  }, [suppliers, id]);

  if (!s) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto text-center font-sans">
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 max-w-md mx-auto">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-1">Supplier Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">The supplier you are looking for does not exist or has been deleted.</p>
          <Link to="/admin/suppliers" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Suppliers
          </Link>
        </div>
      </div>
    );
  }

  const lastPurchase = s.transactions?.length
    ? s.transactions.reduce((l, t) => t.date > l ? t.date : l, s.transactions[0].date)
    : null;

  const totalAmount = s.transactions?.reduce((a, t) => a + (t.amount || 0), 0) ?? 0;

  const handleAddGoods = (data) => {
    const newEntry = {
      id: `PO-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      product: data.subcategory,
      category: data.category,
      quantity: data.quantity,
      amount: 0,
      paymentMethod: '—',
      paymentDate: '—',
      sentTo: 'Admin Store',
      status: 'Pending',
      remarks: data.remarks,
    };

    // Update products list
    let updatedProducts = [...(s.products || [])];
    const prodIndex = updatedProducts.findIndex(p => p.name === data.subcategory);
    if (prodIndex >= 0) {
      updatedProducts[prodIndex] = {
        ...updatedProducts[prodIndex],
        quantitySupplied: updatedProducts[prodIndex].quantitySupplied + data.quantity,
        lastPurchaseDate: new Date().toISOString().split('T')[0]
      };
    } else {
      updatedProducts.push({
        id: Date.now(),
        name: data.subcategory,
        category: data.category,
        brand: 'Generic',
        quantitySupplied: data.quantity,
        lastPurchaseDate: new Date().toISOString().split('T')[0]
      });
    }

    const updatedSupplier = {
      ...s,
      transactions: [newEntry, ...(s.transactions || [])],
      products: updatedProducts,
      totalProducts: updatedProducts.length,
      totalOrders: (s.totalOrders || 0) + 1
    };

    setSuppliers(prev => prev.map(item => String(item.id) === String(id) ? updatedSupplier : item));
    setShowAddGoods(false);
  };

  const handleAddPayment = (data) => {
    const newPayment = {
      id: `PAY-${Date.now()}`,
      date: data.date,
      product: 'Payment Record',
      category: 'Payment',
      quantity: 0,
      amount: data.amount,
      paymentMethod: data.method,
      paymentDate: data.date,
      sentTo: '—',
      status: 'Completed',
      remarks: data.remarks || '',
    };

    const updatedSupplier = {
      ...s,
      transactions: [newPayment, ...(s.transactions || [])],
      totalAmount: (s.totalAmount || 0) + data.amount
    };

    setSuppliers(prev => prev.map(item => String(item.id) === String(id) ? updatedSupplier : item));
    setShowAddPayment(false);
  };

  const handleEditSupplier = (data) => {
    const updatedSupplier = {
      ...s,
      ...data
    };
    setSuppliers(prev => prev.map(item => String(item.id) === String(id) ? updatedSupplier : item));
    setShowEditModal(false);
  };

  const handleDeleteConfirm = () => {
    setSuppliers(prev => prev.filter(item => String(item.id) !== String(id)));
    setShowDeleteModal(false);
    navigate('/admin/suppliers');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">
      {/* Breadcrumbs */}
      <div className="mb-6">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 space-x-2 flex-wrap">
          <Link to="/admin/dashboard" className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <Link to="/admin/suppliers" className="hover:text-slate-800 transition-colors">Suppliers</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-semibold truncate max-w-[150px] sm:max-w-xs">{s.name}</span>
        </div>
      </div>

      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 sm:mb-8 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => navigate('/admin/suppliers')}
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
                {s.contactPerson} &middot; {s.city}, {s.state}
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setShowAddGoods(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow-md whitespace-nowrap"
          >
            <PackagePlus className="w-4 h-4" />
            Add Goods
          </button>
          <button
            onClick={() => setShowAddPayment(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow-md whitespace-nowrap"
          >
            <CreditCard className="w-4 h-4" />
            Add Payment
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
                    <p className="text-sm sm:text-base font-bold text-slate-800">{val}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold px-1">
              <span>Supplier Created: {fmtDate(s.createdAt)}</span>
              <span>&middot;</span>
              <span>Status: <span className={s.status === 'Active' ? 'text-emerald-600' : 'text-slate-500'}>{s.status}</span></span>
            </div>
          </div>
        )}

        {/* ── PRODUCTS TAB ── */}
        {activeTab === 'products' && (
          <div>
            {!s.products?.length ? (
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
                      {s.products.map((p, idx) => (
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
                  {s.products.map((p, idx) => (
                    <div key={p.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                      <ProductAvatar name={p.name} idx={idx} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-900 truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-semibold text-slate-500">{p.category}</span>
                          <span className="text-slate-300">&middot;</span>
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
          <div>
            {!s.transactions?.length ? (
              <div className="text-center py-16 text-slate-400">
                <ArrowRightLeft className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                <p className="font-bold text-base text-slate-700">No transactions recorded</p>
                <p className="text-xs text-slate-400 mt-1">Click "Add Goods" or "Add Payment" to register history.</p>
              </div>
            ) : (
              <>
                {/* Desktop History Table */}
                <div className="hidden md:block border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {['Date', 'Reference ID', 'Product / Description', 'Category', 'Qty', 'Amount', 'Payment Method', 'Store', 'Status'].map(col => (
                          <th key={col} className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {s.transactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
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
                  {s.transactions.map(tx => (
                    <div key={tx.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
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
                          <p className="font-bold text-slate-700">{tx.category}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-semibold mb-0.5">Qty</p>
                          <p className="font-bold text-slate-900">{tx.quantity > 0 ? tx.quantity : '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-semibold mb-0.5">Amount</p>
                          <p className="font-bold text-slate-900">{tx.amount > 0 ? fmt(tx.amount) : '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-200/50">
                        <span>{fmtDate(tx.date)} &middot; {tx.paymentMethod}</span>
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Products',      value: s.totalProducts,    icon: Package,     color: 'text-blue-700 bg-blue-50 border-blue-200'          },
                { label: 'Total Orders',        value: s.totalOrders,      icon: ShoppingCart, color: 'text-purple-700 bg-purple-50 border-purple-200'    },
                { label: 'Total Purchase Amt.', value: fmt(totalAmount),   icon: TrendingUp,  color: 'text-emerald-700 bg-emerald-50 border-emerald-200'  },
                { label: 'Last Purchase',       value: fmtDate(lastPurchase), icon: Calendar, color: 'text-amber-700 bg-amber-50 border-amber-200'        },
              ].map(kpi => {
                const Icon = kpi.icon;
                return (
                  <div key={kpi.label} className={`p-5 rounded-2xl border ${kpi.color} space-y-3 transition-transform hover:-translate-y-0.5`}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold opacity-75">{kpi.label}</p>
                      <div className="p-2 rounded-xl bg-white/70 shadow-sm"><Icon className="w-4 h-4" /></div>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-slate-900">{kpi.value}</p>
                  </div>
                );
              })}
            </div>

            {/* Spend Breakdown Graph */}
            {s.transactions?.length > 0 && (() => {
              const byCategory = {};
              s.transactions.forEach(t => {
                if (t.amount > 0) byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
              });
              const total = Object.values(byCategory).reduce((a, b) => a + b, 0);
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
      <AddGoodsModal
        isOpen={showAddGoods}
        supplierName={s.name}
        onClose={() => setShowAddGoods(false)}
        onSubmit={handleAddGoods}
      />

      <AddPaymentModal
        isOpen={showAddPayment}
        supplierName={s.name}
        onClose={() => setShowAddPayment(false)}
        onSubmit={handleAddPayment}
      />

      <AddEditSupplierModal
        isOpen={showEditModal}
        supplier={s}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditSupplier}
      />

      <DeleteConfirmModal
        supplier={s}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

export default SupplierDetail;
