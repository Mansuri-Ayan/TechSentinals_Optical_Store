import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';

const DataTable = ({
  columns = [],
  data = [],
  onRowClick,
  sortConfig = { key: '', direction: 'asc' },
  onSort,
  isLoading = false,
  emptyTitle = 'No data available',
  emptyDescription = 'There are no records matching the criteria.',
  mobileCardRender
}) => {
  if (isLoading) {
    return <LoadingState />;
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  // Renders the sort indicator icon
  const renderSortIcon = (colKey) => {
    if (!onSort || !colKey) return null;
    if (sortConfig.key !== colKey) {
      return <ArrowUpDown className="w-3.5 h-3.5 ml-1.5 opacity-40 text-slate-400 group-hover:opacity-100 transition-opacity" />;
    }
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 ml-1.5 text-[#10B981]" />
      : <ArrowDown className="w-3.5 h-3.5 ml-1.5 text-[#10B981]" />;
  };

  return (
    <div className="space-y-4">
      {/* Desktop/Tablet view: Normal Table */}
      <div className="hidden md:block bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/60">
                {columns.map((col, idx) => (
                  <th
                    key={col.key || idx}
                    onClick={() => col.sortable && onSort && onSort(col.key)}
                    className={`px-6 py-4.5 text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-wider select-none ${
                      col.sortable ? 'cursor-pointer hover:bg-slate-100/60 group' : ''
                    } ${col.className || ''}`}
                  >
                    <div className="flex items-center">
                      <span>{col.header}</span>
                      {col.sortable && renderSortIcon(col.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {data.map((row, rowIdx) => (
                <tr
                  key={row.id || rowIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors ${
                    onRowClick ? 'hover:bg-slate-50/60 cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key || colIdx}
                      className={`px-6 py-4.5 text-slate-600 ${col.className || ''}`}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile view: Stacked Cards */}
      <div className="md:hidden space-y-4">
        {data.map((row, rowIdx) => {
          if (mobileCardRender) {
            return (
              <div key={row.id || rowIdx} onClick={() => onRowClick && onRowClick(row)}>
                {mobileCardRender(row)}
              </div>
            );
          }

          // Fallback basic card representation
          return (
            <div
              key={row.id || rowIdx}
              onClick={() => onRowClick && onRowClick(row)}
              className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm space-y-3 active:scale-[0.99] transition-transform cursor-pointer"
            >
              {columns.map((col, colIdx) => {
                // Skip rendering headings that are strictly action buttons in the fallback card
                if (col.header === 'Actions' || col.header === '') return null;
                const value = col.render ? col.render(row) : row[col.key];

                // Render the first column as a prominent title
                if (colIdx === 0) {
                  return (
                    <div key={col.key || colIdx} className="flex justify-between items-start gap-2 border-b border-slate-100 pb-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">{col.header}</p>
                        <div className="font-bold text-slate-800 text-sm truncate">{value}</div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={col.key || colIdx} className="flex justify-between items-center text-xs gap-3">
                    <span className="text-slate-400 font-bold">{col.header}</span>
                    <span className="font-semibold text-slate-700 text-right">{value}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DataTable;
