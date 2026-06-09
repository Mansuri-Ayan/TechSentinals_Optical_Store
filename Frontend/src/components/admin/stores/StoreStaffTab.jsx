import { useState, useMemo } from 'react';
import { useStoreStaff } from '../../../hooks/useStaff';
import { Users, Mail, Phone, Calendar } from 'lucide-react';

const formatRole = (role) => role ? role.charAt(0).toUpperCase() + role.slice(1) : '';

const StoreStaffTab = ({ store }) => {
  const [activeSubTab, setActiveSubTab] = useState('all');
  const { staff, isLoadingStaff, isStaffError } = useStoreStaff(store.id, { paginate: false });

  const filteredStaff = useMemo(() => {
    if (activeSubTab === 'all') return staff;
    return staff.filter(member => (member.role || '').toLowerCase() === activeSubTab);
  }, [staff, activeSubTab]);

  const counts = useMemo(() => {
    return {
      all: staff.length,
      worker: staff.filter(m => (m.role || '').toLowerCase() === 'worker').length,
      manager: staff.filter(m => (m.role || '').toLowerCase() === 'manager').length,
      optician: staff.filter(m => (m.role || '').toLowerCase() === 'optician').length,
    };
  }, [staff]);

  if (isLoadingStaff) {
    return (
      <div className="py-12 text-center text-slate-500 font-semibold bg-white border border-slate-100 rounded-2xl shadow-sm">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading Store Rosters...
      </div>
    );
  }

  if (isStaffError) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center text-red-700 font-semibold">
        Unable to load employee list.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-tabs menu */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-1 overflow-x-auto hide-scrollbar">
        {[
          { id: 'all', label: 'All Staff', count: counts.all },
          { id: 'manager', label: 'Managers', count: counts.manager },
          { id: 'optician', label: 'Opticians', count: counts.optician },
          { id: 'worker', label: 'Workers', count: counts.worker },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border transition-all whitespace-nowrap ${
              activeSubTab === tab.id
                ? 'bg-slate-900 text-white border-slate-900 animate-pulse-once'
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

      {filteredStaff.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-slate-300" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">No staff found</h4>
          <p className="text-xs text-slate-500">There are no employees registered in this category for this store branch.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((person) => {
            const initials = `${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`.toUpperCase() || 'E';
            const role = person.role || 'worker';
            const isManager = role.toLowerCase() === 'manager';
            const isOptician = role.toLowerCase() === 'optician';

            return (
              <div
                key={person.id}
                className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden flex flex-col justify-between"
              >
                {/* Accent line depending on role */}
                <div className={`absolute top-0 left-0 bottom-0 w-1 ${
                  isManager ? 'bg-purple-500' : isOptician ? 'bg-emerald-500' : 'bg-blue-500'
                }`} />

                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
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
      )}
    </div>
  );
};

export default StoreStaffTab;
