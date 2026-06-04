import { useEffect, useMemo, useState } from 'react';
<<<<<<< Updated upstream
import { useParams } from 'react-router-dom';
import { Plus, Users, UserCheck, UserMinus, UserPlus, Download, Upload, ChevronRight, Search, Edit2, Trash2, Loader2 } from 'lucide-react';
=======
import { useParams, Link } from 'react-router-dom';
import { Plus, Users, UserCheck, UserMinus, UserPlus, Download, Upload, ChevronRight, Search, Edit2, Trash2 } from 'lucide-react';
>>>>>>> Stashed changes
import AddStaffModal from '../../components/admin/AddStaffModal';
import Pagination from '../../components/shared/Pagination';
import { useStoreStore } from '../../store/store';
import { useStoreStaff } from '../../hooks/useStaff';

const roleOptions = [
  { value: 'all', label: 'All Roles' },
  { value: 'worker', label: 'Worker' },
  { value: 'manager', label: 'Manager' },
  { value: 'optician', label: 'Optician' },
];

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const roleColorByRole = {
  worker: 'border-blue-500',
  manager: 'border-purple-500',
  optician: 'border-emerald-500',
};

const formatRole = (role) => role.charAt(0).toUpperCase() + role.slice(1);

const formatLastActive = (value) => {
  if (!value) return 'Never';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';

  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const Staff = () => {
  const { storeId } = useParams();
  const { stores, selectedStore, setSelectedStore } = useStoreStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingStaff, setEditingStaff] = useState(null);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, roleFilter, statusFilter]);

  const apiParams = useMemo(() => {
    const params = {
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      paginate: true,
    };
    if (debouncedSearch.trim()) {
      params.search = debouncedSearch.trim();
    }
    if (roleFilter !== 'all') {
      params.role = roleFilter;
    }
    if (statusFilter !== 'all') {
      params.is_active = statusFilter === 'active';
    }
    return params;
  }, [currentPage, debouncedSearch, roleFilter, statusFilter]);

  const {
    staffQuery,
    staff,
    total,
    pages,
    kpiStaff,
    isLoadingStaff,
    isStaffError,
    createStaffAsync,
    updateStaffAsync,
    deleteStaffAsync,
    isSavingStaff,
    isDeletingStaff,
  } = useStoreStaff(storeId, apiParams);

  useEffect(() => {
    const routeStore = stores.find((store) => String(store.id) === String(storeId));
    if (routeStore && selectedStore?.id !== routeStore.id) {
      setSelectedStore(routeStore);
    }
  }, [selectedStore?.id, setSelectedStore, storeId, stores]);

  const formattedStaff = useMemo(() => staff.map((person) => ({
    ...person,
    name: `${person.first_name} ${person.last_name}`.trim(),
    status: person.is_active ? 'Active' : 'Inactive',
    lastActive: formatLastActive(person.last_login_at),
    roleColor: roleColorByRole[person.role] || 'border-slate-500',
  })), [staff]);

  const activeCount = useMemo(() => kpiStaff.filter((person) => person.is_active).length, [kpiStaff]);
  const inactiveCount = useMemo(() => kpiStaff.length - activeCount, [kpiStaff, activeCount]);
  const createdThisMonthCount = useMemo(() => kpiStaff.filter((person) => {
    const createdAt = new Date(person.created_at);
    const now = new Date();
    return createdAt.getMonth() === now.getMonth() &&
      createdAt.getFullYear() === now.getFullYear();
  }).length, [kpiStaff]);

  const kpiData = useMemo(() => [
    { title: 'Total Staff', value: kpiStaff.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Active Staff', value: activeCount, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Inactive Staff', value: inactiveCount, icon: UserMinus, color: 'text-red-500', bg: 'bg-red-500/10' },
    { title: 'New This Month', value: createdThisMonthCount, icon: UserPlus, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ], [kpiStaff, activeCount, inactiveCount, createdThisMonthCount]);

  const statusSelectClass =
    statusFilter === 'all'
      ? 'border-slate-200 text-slate-700 bg-white'
      : statusFilter === 'active'
      ? 'border-emerald-200 text-emerald-700 bg-emerald-50/50'
      : 'border-red-200 text-red-700 bg-red-50/50';
  const handleDelete = async (person) => {
    if (window.confirm(`Are you sure you want to delete ${person.name}?`)) {
      await deleteStaffAsync({
        role: person.role,
        id: person.id,
      });
    }
  };

  const handleSubmitStaff = async ({ role, payload, staff: staffMember }) => {
    if (staffMember) {
      await updateStaffAsync({
        role,
        id: staffMember.id,
        payload,
      });
      return;
    }

    await createStaffAsync({
      storeId,
      role,
      payload,
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in font-sans">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 sm:mb-4 space-x-2">
          <Link to="/admin/dashboard" className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-semibold">Staff</span>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight">
              Staff Directory
            </h1>
            <p className="text-slate-500 mt-2 text-sm sm:text-base">
              Manage your optical store employees, roles, and permissions.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button className="flex items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
              <Upload className="w-4 h-4 mr-2 text-slate-400" />
              Import
            </button>
            <button className="flex items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
              <Download className="w-4 h-4 mr-2 text-slate-400" />
              Export
            </button>
            <button
              onClick={() => setShowAddStaff(true)}
              className="flex items-center px-5 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-10">
        {kpiData.map((kpi) => (
          <div key={kpi.title} className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-20 sm:w-24 h-20 sm:h-24 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="flex justify-between items-start relative z-10">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-slate-500 mb-0.5 sm:mb-1 truncate">{kpi.title}</p>
                <h3 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900">{kpi.value}</h3>
              </div>
              <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${kpi.bg} ${kpi.color} flex-shrink-0 ml-2`}>
                <kpi.icon className="w-4 h-4 sm:w-6 sm:h-6" />
              </div>
            </div>
            <div className="mt-2 sm:mt-4 flex items-center text-xs sm:text-sm relative z-10">
              <span className="text-slate-400 truncate">Current store</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:max-w-3xl">
          <div className="relative w-full group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-11 pr-16 py-3 bg-white/70 backdrop-blur-md border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 sm:text-sm font-medium transition-all shadow-sm placeholder:text-slate-400"
            />
            <div className="absolute inset-y-0 right-0 pr-3 hidden sm:flex items-center pointer-events-none">
              <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">Ctrl K</span>
            </div>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-40 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-sm"
          >
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`w-full sm:w-40 px-4 py-3 border rounded-xl text-sm font-semibold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-sm transition-colors ${statusSelectClass}`}
        >
          {statusOptions.map((status) => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3 relative">
        {staffQuery.isFetching && !isLoadingStaff && (
          <div className="absolute inset-0 bg-slate-50/40 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        )}

        {isLoadingStaff ? (
          <div className="flex flex-col items-center justify-center p-20 min-h-[200px] bg-white rounded-2xl border border-slate-100 shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
            <p className="text-slate-500 text-sm font-semibold">Loading staff directory...</p>
          </div>
        ) : isStaffError ? (
          <div className="bg-red-50 border border-red-100 rounded-xl p-8 text-center text-red-700 font-semibold">
            Unable to load staff for this store.
          </div>
        ) : (
          <div className={`space-y-3 transition-opacity duration-200 ${staffQuery.isFetching && !isLoadingStaff ? 'opacity-40 pointer-events-none' : ''}`}>
            {formattedStaff.length > 0 ? formattedStaff.map((person) => (
              <div key={`${person.role}-${person.id}`} className="bg-white border border-slate-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group relative overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${person.roleColor}`}></div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
                  <div className="flex items-center pl-2 min-w-0 md:flex-1">
                    <div className="relative flex-shrink-0">
                      {person.profile_image ? (
                        <img src={person.profile_image} alt={person.name} className="h-10 w-10 md:h-12 md:w-12 rounded-full object-cover shadow-inner" />
                      ) : (
                        <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gradient-to-tr from-slate-800 to-slate-600 flex items-center justify-center text-white font-bold text-base md:text-lg shadow-inner">
                          {person.name.charAt(0)}
                        </div>
                      )}
                      {person.is_active && (
                        <span className="absolute bottom-0 right-0 block h-3 w-3 md:h-3.5 md:w-3.5 rounded-full bg-emerald-400 ring-2 ring-white shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                      )}
                    </div>
                    <div className="ml-3 md:ml-5 min-w-0">
                      <div className="text-sm md:text-base font-bold text-slate-900 truncate">{person.name}</div>
                      <div className="text-xs md:text-sm font-medium text-slate-500 mt-0.5 truncate">{person.email || 'No email added'}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pl-2 md:pl-0 md:flex-nowrap md:gap-0">
                    <div className="md:w-40 flex items-center md:justify-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {formatRole(person.role)}
                      </span>
                    </div>

                    <div className="md:w-32 flex items-center md:justify-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                        person.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${person.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        {person.status}
                      </span>
                    </div>

                    <div className="hidden md:flex md:w-32 items-center justify-center text-sm font-medium text-slate-400">
                      {person.lastActive}
                    </div>

                    <div className="md:w-auto flex items-center space-x-1 md:space-x-2 md:opacity-0 group-hover:opacity-100 transition-opacity ml-auto md:ml-0">
                      <button
                        onClick={() => setEditingStaff(person)}
                        className="p-2 md:p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg md:rounded-xl transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(person)}
                        disabled={isDeletingStaff}
                        className="p-2 md:p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg md:rounded-xl transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="md:hidden mt-2 pl-2 text-xs font-medium text-slate-400">
                  Last active: {person.lastActive}
                </div>
              </div>
            )) : (
              <div className="bg-white border border-slate-200 border-dashed rounded-xl sm:rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3 sm:mb-4 border border-slate-100">
                  <Search className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">No staff members found</h3>
                <p className="text-slate-500 text-sm">No staff match the current search and filters.</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setRoleFilter('all');
                    setStatusFilter('all');
                  }}
                  className="mt-3 sm:mt-4 text-emerald-600 font-semibold hover:text-emerald-700 transition-colors text-sm"
                >
                  Clear filters
                </button>
              </div>
            )}

            {total > ITEMS_PER_PAGE && (
              <Pagination
                totalItems={total}
                itemsPerPage={ITEMS_PER_PAGE}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        )}
      </div>

      {(showAddStaff || !!editingStaff) && (
        <AddStaffModal
          key={editingStaff ? `${editingStaff.role}-${editingStaff.id}` : 'new-staff'}
          isOpen={showAddStaff || !!editingStaff}
          onClose={() => { setShowAddStaff(false); setEditingStaff(null); }}
          onSubmitStaff={handleSubmitStaff}
          initialData={editingStaff}
          isSaving={isSavingStaff}
        />
      )}
    </div>
  );
};

export default Staff;
