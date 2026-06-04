import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

const Pagination = ({
  totalItems,
  itemsPerPage = 10,
  currentPage,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Don't render if only 1 page
  if (totalPages <= 1) return null;

  const handlePrevious = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  // Smart page number generation
  const getPageNumbers = () => {
    const delta = 1; // pages on each side of current
    const pages = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);

    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    if (left > 2) pages.push('...');

    for (let i = left; i <= right; i++) pages.push(i);

    if (right < totalPages - 1) pages.push('...');

    pages.push(totalPages);
    return pages;
  };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-100 rounded-2xl px-4 sm:px-6 py-3.5 shadow-sm">
      {/* Info text */}
      <p className="text-sm text-slate-500 font-medium whitespace-nowrap">
        Showing{' '}
        <span className="font-bold text-slate-800">{startItem}</span>
        {' – '}
        <span className="font-bold text-slate-800">{endItem}</span>
        {' of '}
        <span className="font-bold text-slate-800">{totalItems}</span>
        {' results'}
      </p>

      {/* Controls */}
      <div className="flex items-center gap-1.5">
        {/* Previous */}
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, idx) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="flex items-center justify-center w-9 h-9 text-slate-400"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </span>
              );
            }

            const isActive = page === currentPage;
            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center justify-center w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-[#0A0F1F] text-white shadow-md scale-105'
                    : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Next */}
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
