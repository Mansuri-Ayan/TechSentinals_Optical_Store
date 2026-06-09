import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IndianRupee, ShoppingCart, TrendingUp, Users, ArrowUpRight, BarChart3, Clock, Package } from 'lucide-react';
import { getDashboardStats, getCustomers } from '../../services/customerService';

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const Dashboard = () => {
  const navigate = useNavigate();

  // Load stats and charts dynamically
  const [statsData] = useState(() => getDashboardStats());

  const stats = [
    {
      title: 'Total Sales',
      value: statsData.totalSales,
      change: '+14.2%',
      icon: IndianRupee,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border border-blue-100',
    },
    {
      title: 'Total Orders',
      value: statsData.totalOrders,
      change: '+8.1%',
      icon: ShoppingCart,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border border-indigo-100',
    },
    {
      title: 'Total Revenue (Paid)',
      value: statsData.revenue,
      change: '+12.5%',
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border border-emerald-100',
    },
    {
      title: 'Active Customers',
      value: statsData.activeCustomers,
      change: '+2 new',
      icon: Users,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border border-amber-100',
    },
  ];

  /* ── Dynamic Monthly Sales Calculation ── */
  const monthlySales = useMemo(() => {
    const customers = getCustomers();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const last6 = [];

    // Initialize the last 6 months chronologically
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = months[d.getMonth()];
      const yearMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      last6.push({ month: monthName, key: yearMonthKey, amount: 0, max: 100000 });
    }

    // Populate actual order sums
    customers.forEach((c) => {
      if (c.orders) {
        c.orders.forEach((o) => {
          if (o.date) {
            const oDate = new Date(o.date);
            const key = `${oDate.getFullYear()}-${String(oDate.getMonth() + 1).padStart(2, '0')}`;
            const match = last6.find((m) => m.key === key);
            if (match) {
              match.amount += o.amount;
            }
          }
        });
      }
    });

    // Determine scale max
    const maxVal = Math.max(...last6.map((m) => m.amount), 50000);
    last6.forEach((m) => {
      m.max = maxVal;
    });

    return last6;
  }, []);

  const getStatusColor = (status) => {
    const normalized = (status || '').toLowerCase();
    switch (normalized) {
      case 'delivered':
      case 'completed':
        return 'text-emerald-700 bg-emerald-50 border-emerald-250';
      case 'in progress':
      case 'processing':
      case 'ready':
        return 'text-blue-700 bg-blue-50 border-blue-250';
      case 'pending':
        return 'text-amber-700 bg-amber-50 border-amber-250';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-250';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 sm:mb-8 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Inventory Dashboard</h1>
          <p className="text-slate-500 mt-1.5 text-xs sm:text-sm font-semibold">Welcome back! Here's a live overview of your optical store transactions and CRM activity.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className={`p-3 sm:p-3.5 rounded-xl ${stat.bg} ${stat.color} mr-3 sm:mr-4 flex-shrink-0`}>
              <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">{stat.title}</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-none">{stat.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Sales Overview</h2>
            </div>
            <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">Last 6 months</span>
          </div>
          <div className="flex items-end justify-between gap-2 sm:gap-4 h-48 sm:h-64">
            {monthlySales.map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500">₹{(item.amount / 1000).toFixed(1)}k</span>
                <div className="w-full bg-slate-50 rounded-xl overflow-hidden relative" style={{ height: '80%' }}>
                  <div
                    className="absolute bottom-0 w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-xl transition-all duration-350 hover:from-blue-700 hover:to-indigo-600"
                    style={{ height: `${Math.max(5, (item.amount / item.max) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-500">{item.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <Package className="w-5 h-5 text-purple-500" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Top Selling Products</h2>
          </div>
          <div className="space-y-3">
            {statsData.topProducts && statsData.topProducts.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-8">No products sold yet.</p>
            ) : (
              statsData.topProducts && statsData.topProducts.map((product, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-slate-100/80 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    #{idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{product.name}</p>
                    <p className="text-[10px] text-slate-450 font-semibold">{product.category} · {product.sold} sold</p>
                  </div>
                  <span className="text-xs font-bold text-slate-700 whitespace-nowrap">{product.revenue}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Recent Transactions</h2>
          </div>
          <button
            onClick={() => navigate('/shopkeeper/customers')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
          >
            View Customer List <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
        
        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-left">
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Product Description</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Order Amount</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Order Status</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {statsData.recentOrders && statsData.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-xs text-slate-450 italic">No orders logged yet.</td>
                </tr>
              ) : (
                statsData.recentOrders && statsData.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-mono font-bold text-slate-800">{order.id}</td>
                    <td className="px-6 py-4 text-xs sm:text-sm font-bold text-slate-700">{order.customer}</td>
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-[200px] truncate">{order.product}</td>
                    <td className="px-6 py-4 text-xs sm:text-sm font-black text-slate-900">{order.amount}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(order.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          order.status === 'Delivered' || order.status === 'Completed' ? 'bg-emerald-500' : 
                          order.status === 'Pending' ? 'bg-amber-500' : 'bg-blue-500'
                        }`} />
                        {order.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-semibold">{fmtDate(order.date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="sm:hidden divide-y divide-slate-100">
          {statsData.recentOrders && statsData.recentOrders.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-400 italic">No orders logged.</p>
          ) : (
            statsData.recentOrders && statsData.recentOrders.map((order) => (
              <div key={order.id} className="p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900">{order.id}</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(order.status)}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      order.status === 'Delivered' || order.status === 'Completed' ? 'bg-emerald-500' : 
                      order.status === 'Pending' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                    {order.status || 'Pending'}
                  </span>
                </div>
                <p className="font-bold text-slate-700">{order.customer}</p>
                <p className="text-slate-500 truncate">{order.product}</p>
                <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                  <span className="font-black text-slate-900">{order.amount}</span>
                  <span className="text-slate-400 font-semibold">{fmtDate(order.date)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
