import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStoreSuppliersApi } from '../../../api/stores/store.api';
import { Truck, Search, Phone, Mail, MapPin } from 'lucide-react';
import Pagination from '../../shared/Pagination';

const ITEMS_PER_PAGE = 9;

const StoreSuppliersTab = ({ storeId }) => {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading: isLoadingSuppliers, isError: isSuppliersError } = useQuery({
    queryKey: ['storeSuppliers', storeId, search, page],
    queryFn: () => getStoreSuppliersApi(storeId, { search, page, limit: ITEMS_PER_PAGE }),
  });

  if (isLoadingSuppliers && !data) {
    return (
      <div className="py-12 text-center text-slate-500 font-semibold bg-white border border-slate-100 rounded-2xl shadow-sm">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading Supplier Network...
      </div>
    );
  }

  if (isSuppliersError) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center text-red-700 font-semibold">
        Unable to load suppliers list.
      </div>
    );
  }

  const suppliers = data?.items || [];
  const total = data?.total || 0;
  const pages = data?.pages || 0;

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search suppliers by name, representative, city..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-xs sm:text-sm font-medium transition-all shadow-sm placeholder:text-slate-400"
        />
      </div>

      {suppliers.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Truck className="w-6 h-6 text-slate-300" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">No suppliers found</h4>
          <p className="text-xs text-slate-500">There are no suppliers mapped to this store branch matching your filters.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {suppliers.map((sup) => {
              const status = sup.status === 'ACTIVE' ? 'Active' : sup.status;
              const initials = (sup.company_name || sup.name)?.[0]?.toUpperCase() || 'S';

              return (
                <div
                  key={sup.id}
                  className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-900 flex items-center justify-center text-white font-extrabold text-base shadow-sm flex-shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm leading-tight truncate">
                            {sup.company_name || sup.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                            {sup.contact_person || 'No Contact Rep'}
                          </p>
                        </div>
                      </div>

                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        status === 'Active'
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : 'text-slate-600 bg-slate-50 border-slate-200'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {status}
                      </span>
                    </div>

                    {/* Info lines */}
                    <div className="space-y-1.5 text-xs text-slate-500 mb-4 pl-1">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{sup.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{sup.email || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{sup.city}, {sup.state}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Supplied Products: <span className="font-bold text-slate-800">{sup.totalProducts || 0}</span></span>
                  </div>
                </div>
              );
            })}
          </div>
          {pages > 1 && (
            <Pagination
              totalItems={total}
              itemsPerPage={ITEMS_PER_PAGE}
              currentPage={page}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
};

export default StoreSuppliersTab;
