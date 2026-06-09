import { useState, useMemo } from 'react';
import { useCustomers } from '../../../hooks/useCustomers';
import { Users, Search, Phone, Calendar, IndianRupee, ShoppingBag } from 'lucide-react';

const StoreCustomersTab = ({ store }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { customers, isLoading } = useCustomers();

  const filteredCustomers = useMemo(() => {
    const storeName = store.store_name || store.name;
    return customers.filter(c => {
      // Check storeName match
      const isStoreMatch = 
        String(c.storeName).trim().toLowerCase() === String(storeName).trim().toLowerCase() ||
        String(c.firstVisitStoreName).trim().toLowerCase() === String(storeName).trim().toLowerCase();

      if (!isStoreMatch) return false;

      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      return !query || name.includes(query) || phone.includes(query);
    });
  }, [customers, store, searchTerm]);

  const formatPrice = (p) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(p);
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-slate-500 font-semibold bg-white border border-slate-100 rounded-2xl shadow-sm">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading Store Customers...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search store customers by name or phone..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-xs sm:text-sm font-medium transition-all shadow-sm placeholder:text-slate-400"
        />
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-slate-300" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">No customers found</h4>
          <p className="text-xs text-slate-500">There are no customers registered in this store branch matching your filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Customer', 'Phone', 'Customer Since', 'Orders', 'Total Spent', 'Outstanding Balance', 'Status'].map(col => (
                    <th key={col} className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((c) => {
                  const name = `${c.firstName} ${c.lastName}`.trim();
                  const status = c.status || 'Active';
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/40 transition-colors">
                      {/* Customer Name */}
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm shadow-inner flex-shrink-0">
                            {name[0]?.toUpperCase() || 'C'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-950">{name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{c.email || 'No email'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-650 font-semibold">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {c.phone}
                        </span>
                      </td>

                      {/* Customer Since */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-semibold">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {c.customerSince}
                        </span>
                      </td>

                      {/* Orders */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <ShoppingBag className="w-4 h-4 text-emerald-500" />
                          {c.totalOrders || 0}
                        </span>
                      </td>

                      {/* Total spent */}
                      <td className="px-6 py-4 whitespace-nowrap font-extrabold text-slate-900">
                        {formatPrice(c.totalAmount || 0)}
                      </td>

                      {/* Balance */}
                      <td className="px-6 py-4 whitespace-nowrap font-extrabold text-slate-900">
                        <span className={c.outstandingBalance > 0 ? 'text-red-600' : 'text-slate-850'}>
                          {formatPrice(c.outstandingBalance || 0)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          status === 'VIP'
                            ? 'text-purple-750 bg-purple-50 border-purple-200'
                            : status === 'Active'
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : 'text-slate-600 bg-slate-100 border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            status === 'VIP' ? 'bg-purple-500' : status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`} />
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreCustomersTab;
