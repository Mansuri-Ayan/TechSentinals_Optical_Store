import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IndianRupee, ShoppingCart, TrendingUp, Users, ArrowUpRight, BarChart3, Clock, Package } from 'lucide-react';
import { useSales } from '../../hooks/useSales';
import { useCustomers } from '../../hooks/useCustomers';
import NotificationBell from '../../components/shared/NotificationBell';
import { useChartAnimation } from '../../hooks/useChartAnimation';

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const Dashboard = () => {
  const navigate = useNavigate();
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Load real API query states
  const { sales, isLoading: salesLoading } = useSales({ limit: 1000 });
  const { customers, isLoading: customersLoading } = useCustomers();

  // Dynamic KPI Metrics calculations
  const stats = useMemo(() => {
    const totalSalesVal = sales.reduce((sum, s) => sum + (Number(s.total_amount || s.amount) || 0), 0);
    const totalOrdersVal = sales.length;
    const paidRevenueVal = sales.reduce((sum, s) => sum + (Number(s.receivedAmount || s.paid_amount) || 0), 0);
    const activeCustomersVal = customers.filter(c => c.status === 'Active' || c.status === 'VIP').length;

    return [
      {
        title: 'Total Sales',
        value: `₹${totalSalesVal.toLocaleString('en-IN')}`,
        change: '+14.2%',
        icon: IndianRupee,
        color: 'text-blue-605',
      },
      {
        title: 'Total Orders',
        value: String(totalOrdersVal),
        change: '+8.1%',
        icon: ShoppingCart,
        color: 'text-indigo-605',
      },
      {
        title: 'Total Revenue (Paid)',
        value: `₹${paidRevenueVal.toLocaleString('en-IN')}`,
        change: '+12.5%',
        icon: TrendingUp,
        color: 'text-emerald-655',
      },
      {
        title: 'Active Customers',
        value: String(activeCustomersVal),
        change: '+2 new',
        icon: Users,
        color: 'text-amber-655',
      },
    ];
  }, [sales, customers]);

  /* ── Dynamic Monthly Sales Calculation from Database ── */
  const monthlySales = useMemo(() => {
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

    // Sum matching backend sales
    sales.forEach((s) => {
      const dateVal = s.orderDate || s.sale_date;
      if (dateVal) {
        const sDate = new Date(dateVal);
        const key = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}`;
        const match = last6.find((m) => m.key === key);
        if (match) {
          match.amount += Number(s.total_amount || s.amount) || 0;
        }
      }
    });

    // Scale chart rendering
    const maxVal = Math.max(...last6.map((m) => m.amount), 50000);
    last6.forEach((m) => {
      m.max = maxVal;
    });

    return last6;
  }, [sales]);

  const [animationProgress, elementRef] = useChartAnimation(monthlySales);

  // Dynamic Top Selling Products
  const topProducts = useMemo(() => {
    const map = {};
    sales.forEach(s => {
      const name = s.productName || s.product_name || 'Optical Item';
      const cat = s.productCategory || s.product_category || 'Optical';
      const qty = Number(s.productQuantity || s.product_quantity) || 1;
      const price = Number(s.productPrice || s.product_price || s.total_amount) || 0;

      if (!map[name]) {
        map[name] = { name, category: cat, sold: 0, revenue: 0 };
      }
      map[name].sold += qty;
      map[name].revenue += price * qty;
    });

    return Object.values(map)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 4)
      .map(p => ({
        name: p.name,
        category: p.category,
        sold: p.sold,
        revenue: `₹${p.revenue.toLocaleString('en-IN')}`,
      }));
  }, [sales]);

  // Dynamic Recent Transactions
  const recentOrders = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.orderDate || b.sale_date) - new Date(a.orderDate || a.sale_date))
      .slice(0, 5)
      .map(s => {
        let displayStatus = 'Pending';
        const rawStatus = (s.status?.value || s.status || 'PENDING').toUpperCase();
        if (rawStatus === 'COMPLETED' || rawStatus === 'DELIVERED') displayStatus = 'Delivered';
        else if (rawStatus === 'PARTIALLY_PAID' || rawStatus === 'PROCESSING' || rawStatus === 'READY') displayStatus = 'In Progress';

        return {
          id: s.orderId || s.invoice_number || 'ORD-0000',
          customer: s.customerName || s.customer_name || 'Walk-in Customer',
          product: s.productName || s.product_name || 'Optical Item',
          amount: `₹${(Number(s.total_amount || s.amount) || 0).toLocaleString('en-IN')}`,
          status: displayStatus,
          date: s.orderDate || s.sale_date || '',
        };
      });
  }, [sales]);

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

  if (salesLoading || customersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 sm:mb-8 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Inventory Dashboard</h1>
          <p className="text-slate-555 mt-1.5 text-xs sm:text-sm font-semibold">Welcome back! Here's a live overview of your optical store transactions and CRM activity.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <NotificationBell role="shopkeeper" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 sm:mb-8">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-40 relative overflow-hidden group"
          >
            <div className="flex justify-between items-start z-10">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.title}</p>
              <stat.icon className="w-4.5 h-4.5 text-slate-400" />
            </div>
            <div className="space-y-2 mt-2 z-10">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight leading-none">{stat.value}</h3>
              <span className="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded border text-emerald-600 bg-emerald-50 border-emerald-100">
                {stat.change}
              </span>
            </div>
            <stat.icon className="absolute -right-4 -bottom-4 w-32 h-32 text-slate-200 opacity-[0.06] pointer-events-none group-hover:scale-110 transition-transform duration-300" />
          </div>
        ))}
      </div>

      {/* Charts & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Sales Overview</h2>
            </div>
            <span className="text-xs font-semibold text-slate-455 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">Last 6 months</span>
          </div>
          
          <div className="relative h-48 sm:h-64 w-full">
            <svg ref={elementRef} className="w-full h-full" viewBox="0 0 600 240" preserveAspectRatio="none">
              <defs>
                <linearGradient id="salesAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines */}
              <line x1="55" y1="40" x2="580" y2="40" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="55" y1="93" x2="580" y2="93" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="55" y1="147" x2="580" y2="147" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="55" y1="200" x2="580" y2="200" stroke="#E2E8F0" strokeWidth="1" />

              {/* Y-Axis Value Labels */}
              <text x="45" y="44" textAnchor="end" className="text-[10px] font-bold fill-slate-400 font-sans">
                ₹{((monthlySales[0]?.max || 50000) / 1000).toFixed(0)}k
              </text>
              <text x="45" y="97" textAnchor="end" className="text-[10px] font-bold fill-slate-400 font-sans">
                ₹{(((monthlySales[0]?.max || 50000) * 0.66) / 1000).toFixed(0)}k
              </text>
              <text x="45" y="150" textAnchor="end" className="text-[10px] font-bold fill-slate-400 font-sans">
                ₹{(((monthlySales[0]?.max || 50000) * 0.33) / 1000).toFixed(0)}k
              </text>
              <text x="45" y="204" textAnchor="end" className="text-[10px] font-bold fill-slate-400 font-sans">
                ₹0
              </text>

              {/* Area Path under the line */}
              <path
                d={`M 55 200 ${monthlySales.map((item, idx) => `L ${55 + idx * 105} ${200 - (item.amount / item.max) * 160 * animationProgress}`).join(' ')} L 580 200 Z`}
                fill="url(#salesAreaGradient)"
              />

              {/* Smooth segmented line */}
              <path
                d={monthlySales.map((item, idx) => `${idx === 0 ? 'M' : 'L'} ${55 + idx * 105} ${200 - (item.amount / item.max) * 160 * animationProgress}`).join(' ')}
                stroke="#2563EB"
                strokeWidth="3.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Vertical Guide line on hover */}
              {hoveredPoint && (
                <line
                  x1={hoveredPoint.x}
                  y1="40"
                  x2={hoveredPoint.x}
                  y2="200"
                  stroke="#93C5FD"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              )}

              {/* Value Markers (dots) */}
              {monthlySales.map((item, idx) => {
                const x = 55 + idx * 105;
                const y = 200 - (item.amount / item.max) * 160 * animationProgress;
                const isHovered = hoveredPoint && hoveredPoint.key === item.key;
                return (
                  <g key={idx}>
                    {isHovered && (
                      <circle
                        cx={x}
                        cy={y}
                        r="8"
                        fill="#2563EB"
                        fillOpacity="0.25"
                        className="animate-ping"
                      />
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? "6.5" : "4.5"}
                      fill={isHovered ? "#2563EB" : "#FFFFFF"}
                      stroke="#2563EB"
                      strokeWidth={isHovered ? "2.5" : "3"}
                      style={{ transition: 'all 0.15s ease-in-out' }}
                    />
                  </g>
                );
              })}

              {/* Bottom Labels (X-Axis) */}
              {monthlySales.map((item, idx) => (
                <text
                  key={idx}
                  x={55 + idx * 105}
                  y="222"
                  textAnchor="middle"
                  className="text-xs font-bold fill-slate-500 font-sans"
                >
                  {item.month}
                </text>
              ))}

              {/* Invisible interactive columns for easy hovering */}
              {monthlySales.map((item, idx) => {
                const x = 55 + idx * 105;
                const y = 200 - (item.amount / item.max) * 160 * animationProgress;
                return (
                  <rect
                    key={idx}
                    x={x - 52.5}
                    y="30"
                    width="105"
                    height="180"
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint({ x, y, amount: item.amount, month: item.month, key: item.key })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              })}
            </svg>

            {/* Custom Tooltip */}
            {hoveredPoint && (
              <div
                className="absolute z-25 bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2 rounded-xl shadow-xl text-xs font-bold pointer-events-none flex flex-col border border-slate-700/50 transition-all duration-100 ease-out"
                style={{
                  left: `${(hoveredPoint.x / 600) * 100}%`,
                  top: `${(hoveredPoint.y / 240) * 100 - 55}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <span className="text-[10px] text-slate-350 font-bold uppercase tracking-wider mb-0.5">{hoveredPoint.month}</span>
                <span className="text-sm font-black text-blue-200">₹{hoveredPoint.amount.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <Package className="w-5 h-5 text-purple-500" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Top Selling Products</h2>
          </div>
          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-8">No products sold yet.</p>
            ) : (
              topProducts.map((product, idx) => (
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
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-xs text-slate-450 italic">No orders logged yet.</td>
                </tr>
              ) : (
                recentOrders.map((order) => (
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
          {recentOrders.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-400 italic">No orders logged.</p>
          ) : (
            recentOrders.map((order) => (
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
                <p className="text-slate-555 truncate">{order.product}</p>
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
