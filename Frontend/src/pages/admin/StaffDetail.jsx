import { useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, User, Mail, Phone, ShoppingBag,
  Calendar, Eye, Clock, AlertTriangle, CheckCircle, TrendingUp, Info,
  Receipt, Wallet, Percent, Shield, MapPin, XCircle
} from 'lucide-react';
import { useStaffDetail } from '../../hooks/useStaff';
import { LineChart } from '../../components/shared/Charts';

/* ── Helpers ── */
const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const ROLE_COLOR_CFG = {
  manager: 'text-purple-700 bg-purple-50 border-purple-200',
  worker: 'text-blue-700 bg-blue-50 border-blue-200',
  optician: 'text-emerald-700 bg-emerald-50 border-emerald-200',
};

const TABS = [
  { id: 'info',     label: 'Info',     icon: Info     },
  { id: 'sales',    label: 'Sales',    icon: ShoppingBag },
  { id: 'expenses', label: 'Expenses Incurred', icon: Receipt },
];

const GRAD_PALETTE = [
  'from-blue-400 to-indigo-600',
  'from-emerald-400 to-teal-600',
  'from-purple-400 to-violet-600',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-600',
  'from-cyan-400 to-sky-600',
];

const StaffDetail = () => {
  const { storeId, staffId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const role = searchParams.get('role') || 'worker';

  const { data: staffData, isLoading, isError } = useStaffDetail(role, staffId);
  const [activeTab, setActiveTab] = useState('info');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (isError || !staffData) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto text-center font-sans">
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 max-w-md mx-auto shadow-sm">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-1">Staff Member Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">The staff member profile you are looking for is missing.</p>
          <Link to={`/admin/store/${storeId}/staff`} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Staff Directory
          </Link>
        </div>
      </div>
    );
  }

  const {
    staff_info: s,
    revenue,
    sales_count,
    discounts_given,
    unique_customers_served,
    total_expenses_incurred,
    sales,
    expenses,
    sales_trend
  } = staffData;

  const fName = s.first_name || '';
  const lName = s.last_name || '';
  const fullName = `${fName} ${lName}`.trim() || 'Staff Member';
  const initials = fName ? fName[0].toUpperCase() : (lName ? lName[0].toUpperCase() : 'S');
  const roleLabel = s.role ? s.role.charAt(0).toUpperCase() + s.role.slice(1).toLowerCase() : '';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">
      {/* Breadcrumbs */}
      <div className="mb-6">
        <div className="flex items-center text-sm text-slate-500 font-semibold mb-3 space-x-2 flex-wrap">
          <Link to="/admin/dashboard" className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <Link to={`/admin/store/${storeId}/staff`} className="hover:text-slate-800 transition-colors">Staff Directory</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-extrabold truncate max-w-[150px] sm:max-w-xs">{fullName}</span>
        </div>
      </div>

      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 sm:mb-8 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => navigate(`/admin/store/${storeId}/staff`)}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex-shrink-0 cursor-pointer"
            title="Back to staff list"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            {s.profile_image ? (
              <img src={s.profile_image} alt={fullName} className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover shadow-md flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-md flex-shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight truncate max-w-[200px] sm:max-w-md lg:max-w-xl">
                  {fullName}
                </h1>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${ROLE_COLOR_CFG[s.role] || 'text-slate-700 bg-slate-50 border-slate-200'}`}>
                  {roleLabel}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${s.is_active ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  {s.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-slate-500 mt-1 text-xs sm:text-sm font-bold truncate">
                Code: {s.employee_code} &middot; {s.store_name || 'All Store'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards & Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* KPI Cards */}
        <div className="lg:col-span-1 grid grid-cols-2 gap-4">
          {[
            { label: 'Sales Handled', value: sales_count, icon: ShoppingBag, color: 'text-blue-700 bg-blue-50 border-blue-200' },
            { label: 'Revenue Generated', value: fmt(revenue), icon: TrendingUp, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
            { label: 'Discounts Given', value: fmt(discounts_given), icon: Percent, color: 'text-amber-700 bg-amber-50 border-amber-200' },
            { label: 'Expenses Incurred', value: fmt(total_expenses_incurred), icon: Wallet, color: 'text-rose-700 bg-rose-50 border-rose-200' },
          ].map(kpi => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className={`p-4 rounded-2xl border ${kpi.color} flex flex-col justify-between space-y-3 transition-transform hover:-translate-y-0.5`}>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[10px] sm:text-xs font-bold opacity-75 leading-tight">{kpi.label}</p>
                  <div className="p-1.5 rounded-xl bg-white/70 shadow-sm flex-shrink-0"><Icon className="w-3.5 h-3.5" /></div>
                </div>
                <p className="text-lg sm:text-xl font-black text-slate-900 leading-none">{kpi.value}</p>
              </div>
            );
          })}
        </div>

        {/* Line Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-50 pb-2 mb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> Sales Trend (Current Year)
            </h3>
            <span className="text-[10px] font-bold text-slate-400">Monthly breakdown</span>
          </div>
          <div className="h-56 sm:h-64 w-full">
            <LineChart data={sales_trend} strokeColor="#10B981" gradientColor="#10B981" />
          </div>
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
                { icon: User, label: 'First Name', value: fName },
                { icon: User, label: 'Last Name', value: lName },
                { icon: Mail, label: 'Email Address', value: s.email || '—' },
                { icon: Phone, label: 'Phone Number', value: s.phone || '—' },
                { icon: Shield, label: 'Role Type', value: roleLabel },
                { icon: Shield, label: 'Employee Code', value: s.employee_code },
                { icon: Calendar, label: 'Joining Date', value: fmtDate(s.joining_date) },
                { icon: MapPin, label: 'Store Branch', value: s.store_name || 'All Store' },
                ...(s.qualification ? [{ icon: Info, label: 'Qualification (Optician)', value: s.qualification }] : []),
                { icon: Clock, label: 'Last Login Activity', value: s.last_login_at ? fmtDate(s.last_login_at) : 'Never' },
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

            <div className="flex items-center gap-3 text-xs text-slate-400 font-bold px-1">
              <span>Account Created: {fmtDate(s.created_at)}</span>
              <span>&middot;</span>
              <span>Profile Updated: {fmtDate(s.updated_at)}</span>
            </div>
          </div>
        )}

        {/* ── SALES TAB ── */}
        {activeTab === 'sales' && (
          <div>
            {!sales?.length ? (
              <div className="text-center py-16 text-slate-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                <p className="font-bold text-base text-slate-700">No sales handled</p>
                <p className="text-xs text-slate-400 mt-1">Orders processed by this staff will appear here.</p>
              </div>
            ) : (
              <div className="border border-slate-100 rounded-xl overflow-x-auto shadow-sm animate-fade-in">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-left">
                      {['Invoice Number', 'Customer Name', 'Total Amount', 'Order Date', 'Status'].map(col => (
                        <th key={col} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-4 py-3 text-xs font-mono font-bold text-slate-700">{sale.invoice_number}</td>
                        <td className="px-4 py-3 text-slate-800 font-bold">{sale.customer_name || 'Walk-in Customer'}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{fmt(sale.total_amount)}</td>
                        <td className="px-4 py-3 text-slate-500 font-semibold">{fmtDate(sale.sale_date)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            sale.status === 'COMPLETED' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                            sale.status === 'PENDING' ? 'text-amber-700 bg-amber-50 border-amber-200' :
                            sale.status === 'CANCELLED' ? 'text-red-700 bg-red-50 border-red-200' :
                            'text-slate-705 bg-slate-50 border-slate-200'
                          }`}>
                            {sale.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── EXPENSES TAB ── */}
        {activeTab === 'expenses' && (
          <div>
            {!expenses?.length ? (
              <div className="text-center py-16 text-slate-400">
                <Receipt className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                <p className="font-bold text-base text-slate-700">No expenses recorded</p>
                <p className="text-xs text-slate-400 mt-1">Expenses incurred by or spent on this staff member will appear here.</p>
              </div>
            ) : (
              <div className="border border-slate-100 rounded-xl overflow-x-auto shadow-sm animate-fade-in">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-left">
                      {['Title', 'Category', 'Amount', 'Date', 'Payment Method', 'Approval Status'].map(col => (
                        <th key={col} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">{exp.title}</td>
                        <td className="px-4 py-3 text-slate-600 font-semibold">{exp.category_name}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{fmt(exp.amount)}</td>
                        <td className="px-4 py-3 text-slate-500 font-semibold">{fmtDate(exp.expense_date)}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs font-semibold">{exp.payment_method}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            exp.is_approved ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                            exp.is_rejected ? 'text-red-700 bg-red-50 border-red-200' :
                            'text-amber-705 bg-amber-50 border-amber-200'
                          }`}>
                            {exp.is_approved ? 'Approved' : (exp.is_rejected ? 'Rejected' : 'Pending')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default StaffDetail;
