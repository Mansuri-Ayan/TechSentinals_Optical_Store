import { useState, useMemo } from 'react';
import { EXPENSE_MOCK_DATA } from '../../../data/expensesData';
import { Search, Receipt, Calendar, CreditCard, Tag, IndianRupee } from 'lucide-react';
import Pagination from '../../shared/Pagination';

const ITEMS_PER_PAGE = 8;

const StoreExpensesTab = ({ store }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const storeName = store.store_name || store.name;

  const filteredExpenses = useMemo(() => {
    // Filter by store name match
    return EXPENSE_MOCK_DATA.filter((exp) => {
      const isStoreMatch = 
        String(exp.store).trim().toLowerCase() === String(storeName).trim().toLowerCase();
      
      if (!isStoreMatch) return false;

      const title = (exp.title || '').toLowerCase();
      const cat = (exp.category || '').toLowerCase();
      const ref = (exp.referenceNumber || '').toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      return !query || title.includes(query) || cat.includes(query) || ref.includes(query);
    });
  }, [storeName, searchTerm]);

  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredExpenses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredExpenses, currentPage]);

  const formatPrice = (p) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(p);
  };

  const getApprovalStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border text-emerald-700 bg-emerald-50 border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Approved
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border text-red-700 bg-red-50 border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border text-amber-700 bg-amber-50 border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Pending Approval
          </span>
        );
    }
  };

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
          onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          placeholder="Search expenses by title, category, invoice reference..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-xs sm:text-sm font-medium transition-all shadow-sm placeholder:text-slate-400"
        />
      </div>

      {filteredExpenses.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Receipt className="w-6 h-6 text-slate-300" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">No expenses found</h4>
          <p className="text-xs text-slate-500">There are no expense records logged for this store branch matching your filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Expense Title', 'Category', 'Amount', 'Date', 'Payment Method', 'Approval Status'].map(col => (
                    <th key={col} className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedExpenses.map((exp) => {
                  const date = new Date(exp.expenseDate);
                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/40 transition-colors">
                      {/* Title */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="font-bold text-slate-950">{exp.title}</p>
                          <p className="font-mono text-[10px] text-slate-400 mt-0.5">{exp.expenseId}</p>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-650">
                          <Tag className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          {exp.category}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 whitespace-nowrap font-extrabold text-slate-950">
                        {formatPrice(exp.amount)}
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-650 font-semibold">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-650">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          {exp.paymentMethod}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getApprovalStatusBadge(exp.approvalStatus)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredExpenses.length > ITEMS_PER_PAGE && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <Pagination
                totalItems={filteredExpenses.length}
                itemsPerPage={ITEMS_PER_PAGE}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StoreExpensesTab;
