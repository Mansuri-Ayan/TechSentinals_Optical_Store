import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStoreStaffApi } from '../../../api/stores/store.api';
import { Users, Mail, Phone, Calendar, Search, Loader2 } from 'lucide-react';
import Pagination from '../../shared/Pagination';

const formatRole = (role) => role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : '';

const StoreStaffTab = ({ storeId, searchInput, setSearchInput, search, page, setPage }) => {
  const [activeSubTab, setActiveSubTab] = useState('all');
  const limit = 9;

  const filters = useMemo(() => ({
    page,
    limit,
    search: search.trim(),
    role: activeSubTab !== 'all' ? activeSubTab.toUpperCase() : undefined
  }), [page, search, activeSubTab]);

  const { data, isLoading: isLoadingStaff, isFetching: isFetchingStaff, isError: isStaffError } = useQuery({
    queryKey: ['storeStaff', storeId, filters],
    queryFn: () => getStoreStaffApi(storeId, filters),
  });

  // Fetch counts for tabs (not filtered by search to keep UI stable)
  const { data: allData } = useQuery({ queryKey: ['storeStaffCount', storeId, 'all'], queryFn: () => getStoreStaffApi(storeId, { limit: 1 }) });
  const { data: managerData } = useQuery({ queryKey: ['storeStaffCount', storeId, 'MANAGER'], queryFn: () => getStoreStaffApi(storeId, { limit: 1, role: 'MANAGER' }) });
  const { data: opticianData } = useQuery({ queryKey: ['storeStaffCount', storeId, 'OPTICIAN'], queryFn: () => getStoreStaffApi(storeId, { limit: 1, role: 'OPTICIAN' }) });
  const { data: workerData } = useQuery({ queryKey: ['storeStaffCount', storeId, 'WORKER'], queryFn: () => getStoreStaffApi(storeId, { limit: 1, role: 'WORKER' }) });

  const counts = {
    all: allData?.total || 0,
    manager: managerData?.total || 0,
    optician: opticianData?.total || 0,
    worker: workerData?.total || 0,
  };

  const staff = data?.items || [];
  const total = data?.total || 0;
  const pages = data?.pages || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Sub-tabs menu */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-1 overflow-x-auto hide-scrollbar w-full sm:w-auto">
          {[
            { id: 'all', label: 'All Staff', count: counts.all },
            { id: 'manager', label: 'Managers', count: counts.manager },
            { id: 'optician', label: 'Opticians', count: counts.optician },
            { id: 'worker', label: 'Workers', count: counts.worker },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveSubTab(tab.id); setPage(1); }}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border transition-all whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${activeSubTab === tab.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative group w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            {isFetchingStaff ? (
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            ) : (
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            )}
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search staff..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-xs font-medium transition-all"
          />
        </div>
      </div>

      {isLoadingStaff && staff.length === 0 ? (
        <div className="py-24 text-center text-slate-500 font-semibold bg-white border border-slate-100 rounded-2xl shadow-sm">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading Store Rosters...
        </div>
      ) : isStaffError ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-12 text-center text-red-700 font-semibold">
          Unable to load employee list.
        </div>
      ) : staff.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-slate-300" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">No staff found</h4>
          <p className="text-xs text-slate-500">There are no employees registered in this category for this store branch.</p>
        </div>
      ) : (
        <>
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity duration-200 ${isFetchingStaff ? 'opacity-60' : 'opacity-100'}`}>
            {staff.map((person) => {
              const initials = `${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`.toUpperCase() || 'E';
              const role = person.role || 'worker';
              const isManager = role.toLowerCase() === 'manager';
              const isOptician = role.toLowerCase() === 'optician';

              return (
                <div
                  key={person.id}
                  className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden flex flex-col justify-between"
                >
                  <div className={`absolute top-0 left-0 bottom-0 w-1 ${
                    isManager ? 'bg-purple-500' : isOptician ? 'bg-emerald-500' : 'bg-blue-500'
                  }`} />

                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm shadow-inner flex-shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm leading-tight truncate">
                            {person.first_name} {person.last_name}
                          </h4>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-1 border ${
                            isManager ? 'text-purple-700 bg-purple-50 border-purple-200' :
                            isOptician ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                            'text-blue-700 bg-blue-50 border-blue-200'
                          }`}>
                            {formatRole(role)}
                          </span>
                        </div>
                      </div>

                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        person.is_active
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : 'text-slate-600 bg-slate-50 border-slate-200'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${person.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {person.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-500 mb-4 pl-1">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{person.email || 'No email added'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{person.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-300" />
                      Joined: {new Date(person.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {pages > 1 && (
            <Pagination
              totalItems={total}
              itemsPerPage={limit}
              currentPage={page}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
};

export default StoreStaffTab;
