import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Users,
  UserCheck,
  UserMinus,
  UserPlus,
  ChevronRight,
  Search,
  Edit2,
  Trash2,
  Loader2,
  Mail,
  Phone,
  Calendar,
  Shield,
  Briefcase,
  X,
} from "lucide-react";
import AddStaffModal from "../../components/admin/AddStaffModal";
import Pagination from "../../components/shared/Pagination";
import InventoryDetailDrawer from "../../components/admin/InventoryDetailDrawer";
import { useAuthStore } from "../../store/store";
import { useStoreStaff } from "../../hooks/useStaff";
import { getWorkerById, getOpticianById, getManagerById } from "../../api/staff/staff.api";

const roleOptions = [
  { value: "all", label: "All Roles" },
  { value: "worker", label: "Worker" },
  { value: "manager", label: "Manager" },
  { value: "optician", label: "Optician" },
];

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const roleColorByRole = {
  worker: "border-blue-500",
  manager: "border-purple-500",
  optician: "border-emerald-500",
};

const formatRole = (role) => {
  if (!role) return "";
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const Staff = () => {
  const { user } = useAuthStore();
  const storeId = user?.store_id;

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingStaff, setEditingStaff] = useState(null);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const ITEMS_PER_PAGE = 10;

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
    if (roleFilter !== "all") {
      params.role = roleFilter;
    }
    if (statusFilter !== "all") {
      params.is_active = statusFilter === "active";
    }
    return params;
  }, [currentPage, debouncedSearch, roleFilter, statusFilter]);

  const {
    staffQuery,
    staff,
    total,
    isLoadingStaff,
    isStaffError,
    createStaffAsync,
    updateStaffAsync,
    deleteStaffAsync,
    isSavingStaff,
    isDeletingStaff,
    kpiStaff,
  } = useStoreStaff(storeId, apiParams);

  const formattedStaff = useMemo(
    () =>
      staff.map((person) => ({
        ...person,
        name: `${person.first_name} ${person.last_name}`.trim(),
        status: person.is_active ? "Active" : "Inactive",
        roleColor: roleColorByRole[person.role] || "border-slate-500",
      })),
    [staff]
  );

  const activeCount = useMemo(
    () => kpiStaff.filter((person) => person.is_active).length,
    [kpiStaff]
  );
  const inactiveCount = useMemo(
    () => kpiStaff.length - activeCount,
    [kpiStaff, activeCount]
  );
  const createdThisMonthCount = useMemo(
    () =>
      kpiStaff.filter((person) => {
        const createdAt = new Date(person.created_at);
        const now = new Date();
        return (
          createdAt.getMonth() === now.getMonth() &&
          createdAt.getFullYear() === now.getFullYear()
        );
      }).length,
    [kpiStaff]
  );

  const kpiData = useMemo(
    () => [
      {
        title: "Total Staff",
        value: kpiStaff.length,
        icon: Users,
        color: "text-blue-500",
        bg: "bg-blue-50",
        border: "border-blue-100",
      },
      {
        title: "Active Staff",
        value: activeCount,
        icon: UserCheck,
        color: "text-emerald-500",
        bg: "bg-emerald-50",
        border: "border-emerald-100",
      },
      {
        title: "Inactive Staff",
        value: inactiveCount,
        icon: UserMinus,
        color: "text-red-500",
        bg: "bg-red-50",
        border: "border-red-100",
      },
      {
        title: "New This Month",
        value: createdThisMonthCount,
        icon: UserPlus,
        color: "text-purple-500",
        bg: "bg-purple-50",
        border: "border-purple-100",
      },
    ],
    [kpiStaff, activeCount, inactiveCount, createdThisMonthCount]
  );

  const statusSelectClass =
    statusFilter === "all"
      ? "border-slate-200 text-slate-700 bg-white"
      : statusFilter === "active"
        ? "border-emerald-200 text-emerald-700 bg-emerald-50/50"
        : "border-red-200 text-red-700 bg-red-50/50";

  const handleDelete = async (e, person) => {
    e.stopPropagation();
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

  const handleStaffClick = async (staffMember) => {
    setSelectedStaff({ ...staffMember, type: 'staff' });
    setDrawerLoading(true);
    try {
      let res;
      const role = staffMember.role?.toLowerCase();
      if (role === 'worker') {
        res = await getWorkerById(staffMember.id);
      } else if (role === 'optician') {
        res = await getOpticianById(staffMember.id);
      } else if (role === 'manager') {
        res = await getManagerById(staffMember.id);
      }
      if (res) {
        setSelectedStaff({ ...res.data, type: 'staff' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDrawerLoading(false);
    }
  };

  if (!storeId) {
    return (
      <div className="p-8 text-center text-slate-500 font-semibold">
        No store association found for your account. Please contact the administrator.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans overflow-x-hidden">
      
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 gap-1.5">
          <Link to="/shopkeeper/dashboard" className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-semibold">Staff Directory</span>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight">
              Staff Directory
            </h1>
            <p className="text-slate-500 mt-1 text-sm sm:text-base">
              Manage optical store employees, roles, and contact information.
            </p>
          </div>

          <button
            onClick={() => setShowAddStaff(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 w-full sm:w-auto flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Staff
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {kpiData.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.title} className={`flex items-center gap-3 p-4 sm:p-5 bg-white border ${kpi.border} rounded-2xl shadow-sm`}>
              <div className={`p-2.5 rounded-xl flex-shrink-0 ${kpi.color} ${kpi.bg}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 truncate">{kpi.title}</p>
                <p className="text-lg sm:text-xl font-bold text-slate-900 truncate">{kpi.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:max-w-3xl">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search staff by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-medium transition-all shadow-sm placeholder:text-slate-400"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-44 px-3 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-sm"
          >
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`w-full sm:w-44 px-3 py-2.5 border rounded-xl text-sm font-semibold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-sm transition-colors ${statusSelectClass}`}
        >
          {statusOptions.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      {/* Main List */}
      <div className="space-y-4 relative">
        {staffQuery.isFetching && !isLoadingStaff && (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        )}

        {isLoadingStaff ? (
          <div className="flex flex-col items-center justify-center p-20 min-h-[200px] bg-white rounded-2xl border border-slate-100 shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
            <p className="text-slate-505 text-sm font-semibold">Loading staff directory...</p>
          </div>
        ) : isStaffError ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center text-red-700 font-semibold">
            Unable to load staff directory for this store.
          </div>
        ) : formattedStaff.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 sm:p-14 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
              <Users className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No staff members found</h3>
            <p className="text-slate-505 text-sm mb-4">Try adjusting your search or filters.</p>
            {(searchTerm || roleFilter !== "all" || statusFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setRoleFilter("all");
                  setStatusFilter("all");
                }}
                className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors text-sm"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {['Staff Name', 'Employee Code', 'Role', 'Phone Number', 'Email', 'Joining Date', 'Status', 'Actions'].map((col) => (
                        <th key={col} className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {formattedStaff.map((person) => (
                      <tr
                        key={`${person.role}-${person.id}`}
                        onClick={() => handleStaffClick(person)}
                        className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {person.profile_image ? (
                              <img
                                src={person.profile_image}
                                alt={person.name}
                                className="h-9 w-9 rounded-full object-cover shadow-inner"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                                {person.name.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-sm leading-tight truncate">{person.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-700 font-mono">
                            {person.role_id || person.id}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-50 border border-slate-100 text-slate-600">
                            {formatRole(person.role)}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-700">{person.phone || person.phone_number || '—'}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-500">{person.email}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-500">{fmtDate(person.joining_date || person.created_at)}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                            person.is_active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${person.is_active ? "bg-emerald-500" : "bg-red-500"}`}></span>
                            {person.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingStaff(person); }}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, person)}
                              disabled={isDeletingStaff}
                              className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3">
              {formattedStaff.map((person) => (
                <div
                  key={`${person.role}-${person.id}`}
                  onClick={() => handleStaffClick(person)}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3 cursor-pointer hover:shadow-md hover:border-emerald-200 active:scale-[0.99] transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {person.profile_image ? (
                        <img
                          src={person.profile_image}
                          alt={person.name}
                          className="h-10 w-10 rounded-full object-cover shadow-inner"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                          {person.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-slate-900 text-sm leading-tight">{person.name}</p>
                        <p className="text-[10px] text-slate-405 font-mono mt-0.5">CODE: {person.role_id || person.id}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${
                      person.is_active
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}>
                      {person.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <p className="text-slate-400 font-semibold mb-0.5">Role</p>
                      <p className="font-bold text-slate-700 truncate">{formatRole(person.role)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold mb-0.5">Phone</p>
                      <p className="font-bold text-slate-700 truncate">{person.phone || person.phone_number || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold mb-0.5">Email</p>
                      <p className="font-bold text-slate-700 truncate">{person.email}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold mb-0.5">Joined</p>
                      <p className="font-bold text-slate-700 truncate">{fmtDate(person.joining_date || person.created_at)}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingStaff(person); }}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-100 transition-colors flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, person)}
                      disabled={isDeletingStaff}
                      className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
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

      {/* Add / Edit Staff Modal */}
      {(showAddStaff || !!editingStaff) && (
        <AddStaffModal
          key={editingStaff ? `${editingStaff.role}-${editingStaff.id}` : "new-staff"}
          isOpen={showAddStaff || !!editingStaff}
          onClose={() => {
            setShowAddStaff(false);
            setEditingStaff(null);
          }}
          onSubmitStaff={handleSubmitStaff}
          initialData={editingStaff}
          isSaving={isSavingStaff}
        />
      )}

      {/* Detail Drawer */}
      <InventoryDetailDrawer
        item={selectedStaff}
        onClose={() => setSelectedStaff(null)}
        isLoading={drawerLoading}
      />
    </div>
  );
};

export default Staff;
