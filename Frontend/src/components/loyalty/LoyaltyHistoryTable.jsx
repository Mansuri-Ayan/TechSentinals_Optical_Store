import { useState, useMemo } from 'react';
import { Coins, PlusCircle, MinusCircle, ArrowDown, ArrowUp } from 'lucide-react';
import Pagination from '../shared/Pagination';

const ITEMS_PER_PAGE = 5;

const LoyaltyHistoryTable = ({ history }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState('all');

  const filteredHistory = useMemo(() => {
    return history.filter(h => {
      if (filterType === 'all') return true;
      return h.type === filterType;
    });
  }, [history, filterType]);

  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredHistory.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredHistory, currentPage]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
          <Coins className="w-4 h-4 text-emerald-500" />
          Points Ledger
        </h3>
        
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
          className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 cursor-pointer"
        >
          <option value="all">All Activities</option>
          <option value="earned">Earned Points</option>
          <option value="redeemed">Redeemed Points</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left min-w-[500px]">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-455 uppercase tracking-wider bg-slate-50/20">
              <th className="px-5 py-3.5">Date</th>
              <th className="px-5 py-3.5">Activity Description</th>
              <th className="px-5 py-3.5 text-center">Points Delta</th>
              <th className="px-5 py-3.5 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedHistory.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/40">
                <td className="px-5 py-3.5 text-xs font-semibold text-slate-550">
                  {new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-5 py-3.5 text-sm font-bold text-slate-800">{row.activity}</td>
                <td className="px-5 py-3.5 text-center">
                  {row.type === 'earned' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      <PlusCircle className="w-3.5 h-3.5" />
                      +{row.points}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                      <MinusCircle className="w-3.5 h-3.5" />
                      -{row.points}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right font-black text-slate-900 text-sm">
                  {row.balance.toLocaleString()}
                </td>
              </tr>
            ))}
            {paginatedHistory.length === 0 && (
              <tr>
                <td colSpan="4" className="px-5 py-10 text-center text-slate-400 font-semibold">
                  No points activities logged.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredHistory.length > ITEMS_PER_PAGE && (
        <div className="border-t border-slate-100 bg-slate-50/20 p-4">
          <Pagination
            totalItems={filteredHistory.length}
            itemsPerPage={ITEMS_PER_PAGE}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};

export default LoyaltyHistoryTable;
