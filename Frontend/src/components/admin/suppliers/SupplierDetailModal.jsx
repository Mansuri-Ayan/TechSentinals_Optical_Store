import { useState } from 'react';
import {
  X, User, Mail, Phone, MapPin, Package, ShoppingCart,
  TrendingUp, Calendar, Building2, ArrowRightLeft,
  CheckCircle, Clock, XCircle, AlertTriangle,
  Layers, Tag, Edit2, Trash2, PackagePlus, CreditCard,
} from 'lucide-react';
import AddGoodsModal from './AddGoodsModal';
import AddPaymentModal from './AddPaymentModal';

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

/* ─────────────────────────────────────────────────────────
   MAIN MODAL
───────────────────────────────────────────────────────── */
const SupplierDetailModal = ({ supplier, onClose, onEdit, onDelete }) => {
  const [activeTab, setActiveTab] = useState('info');
  const [showAddGoods, setShowAddGoods] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [localSupplier, setLocalSupplier] = useState(null);

  // Use localSupplier if available (for updated goods/payments), else prop
  const s = localSupplier || supplier;

  if (!s) return null;

  const lastPurchase = s.transactions?.length
    ? s.transactions.reduce((l, t) => t.date > l ? t.date : l, s.transactions[0].date)
    : null;

  const totalAmount = s.transactions?.reduce((a, t) => a + t.amount, 0) ?? 0;

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
    const updated = { ...s, transactions: [newEntry, ...(s.transactions || [])] };
    setLocalSupplier(updated);
    setShowAddGoods(false);
  };

  const handleAddPayment = (data) => {
    // Attach to most recent pending transaction if any
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
    const updated = { ...s, transactions: [newPayment, ...(s.transactions || [])] };
    setLocalSupplier(updated);
    setShowAddPayment(false);
  };

  // Reset local state when modal closes
  const handleClose = () => {
    setLocalSupplier(null);
    setActiveTab('info');
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative bg-white w-full sm:max-w-4xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[95dvh] sm:max-h-[90vh] overflow-hidden">

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-black text-lg shadow-md flex-shrink-0">
                {s.name[0]}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">{s.name}</h2>
                <p className="text-xs text-slate-500 truncate">{s.contactPerson} · {s.city}, {s.state}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2">
              {/* Add Goods */}
              <button
                onClick={() => setShowAddGoods(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors whitespace-nowrap"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Goods</span>
              </button>
              {/* Add Payment */}
              <button
                onClick={() => setShowAddPayment(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors whitespace-nowrap"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Payment</span>
              </button>
              {/* Edit */}
              {onEdit && (
                <button onClick={() => { handleClose(); onEdit(s); }}
                  className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-600 rounded-xl hover:bg-amber-50 hover:text-amber-600 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              {/* Delete */}
              {onDelete && (
                <button onClick={() => { handleClose(); onDelete(s); }}
                  className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              {/* Close */}
              <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex items-center gap-0.5 sm:gap-1 px-4 sm:px-6 pt-3 border-b border-slate-100 overflow-x-auto hide-scrollbar flex-shrink-0">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all border-b-2 -mb-px ${
                    isActive
                      ? 'text-slate-900 border-slate-900 bg-slate-50'
                      : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
                  }`}>
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── Tab Content ── */}
          <div className="overflow-y-auto flex-1">

            {/* ── INFO ── */}
            {activeTab === 'info' && (
              <div className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: Building2, label: 'Supplier Name',   value: s.name          },
                    { icon: User,      label: 'Contact Person',  value: s.contactPerson },
                    { icon: Mail,      label: 'Email',           value: s.email         },
                    { icon: Phone,     label: 'Phone',           value: s.phone         },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{item.label}</p>
                        <p className="text-sm font-bold text-slate-800 break-all">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Address</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[['City', s.city], ['State', s.state], ['Pincode', s.pincode]].map(([l, v]) => (
                      <div key={l}>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{l}</p>
                        <p className="text-sm font-bold text-slate-800">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap">
                  <span>Added: {fmtDate(s.createdAt)}</span>
                  <span>·</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold border ${s.status === 'Active' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-600 bg-slate-100 border-slate-200'}`}>
                    {s.status}
                  </span>
                </div>
              </div>
            )}

            {/* ── PRODUCTS ── */}
            {activeTab === 'products' && (
              <div className="p-4 sm:p-6">
                {(!s.products?.length) ? (
                  <div className="text-center py-12 text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                    <p className="font-semibold text-sm">No products on record</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {s.products.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <ProductAvatar name={p.name} idx={i} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-slate-900 truncate">{p.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                              <Layers className="w-3 h-3" />{p.category}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                              <Tag className="w-3 h-3" />{p.brand}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-semibold text-slate-500 mb-0.5">Qty Supplied</p>
                          <p className="text-lg font-bold text-slate-900">{p.quantitySupplied}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(p.lastPurchaseDate)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── HISTORY ── */}
            {activeTab === 'history' && (
              <div className="p-4 sm:p-6">
                {(!s.transactions?.length) ? (
                  <div className="text-center py-12 text-slate-400">
                    <ArrowRightLeft className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                    <p className="font-semibold text-sm">No purchase history yet</p>
                    <p className="text-xs mt-1">Click "Add Goods" to record the first entry</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden sm:block rounded-2xl border border-slate-100 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              {['Date', 'Product', 'Category', 'Qty', 'Amount', 'Method', 'Sent To', 'Status'].map(h => (
                                <th key={h} className="px-3 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {s.transactions.map(tx => (
                              <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-3 py-3 text-xs font-semibold text-slate-700 whitespace-nowrap">{fmtDate(tx.date)}</td>
                                <td className="px-3 py-3 max-w-[140px]"><p className="text-xs font-semibold text-slate-800 truncate">{tx.product}</p></td>
                                <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">{tx.category}</td>
                                <td className="px-3 py-3">
                                  {tx.quantity > 0
                                    ? <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">{tx.quantity}</span>
                                    : <span className="text-slate-300 text-xs">—</span>}
                                </td>
                                <td className="px-3 py-3 text-xs font-bold text-slate-900 whitespace-nowrap">
                                  {tx.amount > 0 ? fmt(tx.amount) : <span className="text-slate-300">—</span>}
                                </td>
                                <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">{tx.paymentMethod}</td>
                                <td className="px-3 py-3">
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                                    <Building2 className="w-3 h-3" />{tx.sentTo}
                                  </span>
                                </td>
                                <td className="px-3 py-3"><StatusBadge status={tx.status} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Mobile Cards */}
                    <div className="sm:hidden space-y-3">
                      {s.transactions.map(tx => (
                        <div key={tx.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{tx.product}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{fmtDate(tx.date)}</p>
                            </div>
                            <StatusBadge status={tx.status} />
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-slate-400 font-medium">Category</p>
                              <p className="font-bold text-slate-700">{tx.category}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 font-medium">Qty</p>
                              <p className="font-bold text-slate-900">{tx.quantity > 0 ? tx.quantity : '—'}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 font-medium">Amount</p>
                              <p className="font-bold text-slate-900">{tx.amount > 0 ? fmt(tx.amount) : '—'}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                            <span>{tx.paymentMethod}</span>
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />{tx.sentTo}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── ANALYTICS ── */}
            {activeTab === 'analytics' && (
              <div className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Products',      value: s.totalProducts,    icon: Package,     color: 'text-blue-600 bg-blue-50 border-blue-200'          },
                    { label: 'Total Orders',        value: s.totalOrders,      icon: ShoppingCart, color: 'text-purple-600 bg-purple-50 border-purple-200'    },
                    { label: 'Total Purchase Amt.', value: fmt(totalAmount),   icon: TrendingUp,  color: 'text-emerald-600 bg-emerald-50 border-emerald-200'  },
                    { label: 'Last Purchase',       value: fmtDate(lastPurchase), icon: Calendar, color: 'text-amber-600 bg-amber-50 border-amber-200'        },
                  ].map(kpi => {
                    const Icon = kpi.icon;
                    return (
                      <div key={kpi.label} className={`p-4 rounded-2xl border ${kpi.color} space-y-2`}>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold opacity-70">{kpi.label}</p>
                          <div className="p-1.5 rounded-lg bg-white/50"><Icon className="w-4 h-4" /></div>
                        </div>
                        <p className="text-xl font-bold text-slate-900">{kpi.value}</p>
                      </div>
                    );
                  })}
                </div>

                {s.transactions?.length > 0 && (() => {
                  const byCategory = {};
                  s.transactions.forEach(t => {
                    if (t.amount > 0) byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
                  });
                  const total = Object.values(byCategory).reduce((a, b) => a + b, 0);
                  if (!total) return null;
                  return (
                    <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Spend by Category</p>
                      <div className="space-y-3">
                        {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
                          const pct = Math.round((amt / total) * 100);
                          return (
                            <div key={cat}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-slate-700">{cat}</span>
                                <span className="text-xs font-bold text-slate-900">{fmt(amt)} <span className="text-slate-400 font-medium">({pct}%)</span></span>
                              </div>
                              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
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
        </div>
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
    </>
  );
};

export default SupplierDetailModal;
