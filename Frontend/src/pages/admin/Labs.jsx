import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useRoleContext } from '../../hooks/useRoleContext';
import { 
  Search, Plus, Beaker, ChevronRight, Edit2, Trash2, Loader2, Info,
  Users, UserCheck, UserMinus
} from 'lucide-react';
import Pagination from '../../components/shared/Pagination';
import SearchBar from '../../components/shared/SearchBar';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import AddEditLabModal from '../../components/admin/AddEditLabModal';
import ConfirmationModal from '../../components/shared/ConfirmationModal';
import { useStoreStore } from '../../store/store';
import { useLabs } from '../../hooks/useLabs';

const ITEMS_PER_PAGE = 8;

const Labs = () => {
  const { storeId, buildPath, isPathAdmin } = useRoleContext();
  const { stores } = useStoreStore();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeStatusFilter, setActiveStatusFilter] = useState('all');
  const [modalState, setModalState] = useState({ isOpen: false, item: null });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, labId: null });

  // Debounce search term to optimize query fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when active status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatusFilter]);

  const {
    labs,
    total,
    pages,
    activeCount,
    inactiveCount,
    isLoading,
    isFetching,
    isError,
    createLabAsync,
    updateLabAsync,
    deleteLabAsync,
    isSaving,
  } = useLabs({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    search: debouncedSearch || undefined,
    active_status: activeStatusFilter,
  });

  const handleSaveLab = useCallback(async (data) => {
    try {
      if (data.id) {
        await updateLabAsync({
          id: data.id,
          payload: { 
            name: data.name, 
            contact_number: data.contact_number, 
            email: data.email, 
            is_active: data.is_active 
          },
        });
      } else {
        await createLabAsync({ 
          name: data.name, 
          contact_number: data.contact_number, 
          email: data.email 
        });
      }
      return true;
    } catch {
      return false;
    }
  }, [createLabAsync, updateLabAsync]);

  const handleDelete = useCallback((e, id) => {
    e.stopPropagation(); // Avoid triggering row selection click
    setConfirmModal({ isOpen: true, labId: id });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmModal.labId) return;
    try {
      await deleteLabAsync(confirmModal.labId);
    } catch {
      // Error handled in hook/mutation
    }
  }, [confirmModal.labId, deleteLabAsync]);

  const handleEditClick = useCallback((e, item) => {
    e.stopPropagation(); // Avoid triggering row selection click
    setModalState({ isOpen: true, item });
  }, []);

  const handleRowClick = useCallback((row) => {
    navigate(isPathAdmin ? (storeId && storeId !== 'admin' ? `/admin/store/${storeId}/labs/${row.id}` : `/admin/labs/${row.id}`) : `/shopkeeper/labs/${row.id}`);
  }, [navigate, storeId, isPathAdmin]);

  // Columns definition for DataTable component
  const columns = useMemo(() => [
    {
      key: 'name',
      header: 'Lab Name',
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold text-emerald-600 text-lg flex-shrink-0">
            {row.name ? row.name[0]?.toUpperCase() : '?'}
          </div>
          <div className="min-w-0">
            <span className="font-bold text-slate-800 text-sm block truncate">{row.name}</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">ID: {row.id}</span>
          </div>
        </div>
      )
    },
    {
      key: 'contact_number',
      header: 'Contact Number',
      sortable: false,
      render: (row) => <span className="font-semibold text-slate-700 text-sm">{row.contact_number}</span>
    },
    {
      key: 'email',
      header: 'Email Address',
      sortable: false,
      render: (row) => <span className="text-slate-600 text-sm font-medium">{row.email}</span>
    },
    {
      key: 'is_active',
      header: 'Status',
      sortable: false,
      render: (row) => <StatusBadge status={row.is_active ? 'Active' : 'Inactive'} />
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      className: 'w-[100px] text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(e) => handleEditClick(e, row)}
            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-205 rounded-xl shadow-sm text-slate-500 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 transition-colors"
            title="Edit Lab"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => handleDelete(e, row.id)}
            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-205 rounded-xl shadow-sm text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors"
            title="Delete Lab"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ], [handleEditClick, handleDelete]);

  // Mobile layout rendering mapping
  const mobileCardRender = (row) => (
    <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm space-y-3 active:scale-[0.99] transition-transform cursor-pointer">
      <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold text-emerald-600 text-base flex-shrink-0">
            {row.name ? row.name[0]?.toUpperCase() : '?'}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-800 text-sm truncate">{row.name}</p>
            <p className="text-[9px] text-slate-400 font-semibold">ID: {row.id}</p>
          </div>
        </div>
        <StatusBadge status={row.is_active ? 'Active' : 'Inactive'} />
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-bold">Contact</span>
        <span className="font-semibold text-slate-700">{row.contact_number}</span>
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-bold">Email</span>
        <span className="font-medium text-slate-650 truncate max-w-[200px]">{row.email}</span>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100" onClick={e => e.stopPropagation()}>
        <button
          onClick={(e) => handleEditClick(e, row)}
          className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-all"
        >
          <Edit2 className="w-3 h-3" /> Edit
        </button>
        <button
          onClick={(e) => handleDelete(e, row.id)}
          className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-650 hover:border-red-200 transition-all"
        >
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in font-sans">
      {/* Breadcrumb + Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 space-x-2">
          <Link to={buildPath('dashboard')} className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-semibold">Labs</span>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Beaker className="w-8 h-8 text-emerald-500 animate-pulse" />
              Lab Partners Management
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm sm:text-base">
              Manage optical processing laboratories, contact specifications, and statuses.
            </p>
          </div>
          <button
            onClick={() => setModalState({ isOpen: true, item: null })}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex-shrink-0 justify-center w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Add Lab Partner
          </button>
        </div>
      </div>

      {/* Stats KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 sm:mb-8">
        <button
          onClick={() => setActiveStatusFilter('all')}
          className={`bg-white p-5 rounded-2xl border text-left transition-all duration-350 shadow-sm hover:shadow-md group relative overflow-hidden focus:outline-none flex justify-between items-start ${
            activeStatusFilter === 'all'
              ? 'border-blue-400 ring-2 ring-blue-50/50 bg-blue-50/10'
              : 'border-slate-100 hover:border-slate-300'
          }`}
        >
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="min-w-0 flex-1 relative z-10">
            <p className="text-xs font-semibold text-slate-500 mb-1 truncate">Total Lab Partners</p>
            <h3 className="text-3xl font-bold text-slate-900 leading-none">{activeCount + inactiveCount}</h3>
          </div>
          <div className={`p-3 rounded-xl border relative z-10 transition-colors ${
            activeStatusFilter === 'all'
              ? 'bg-blue-500/10 border-blue-500/20 text-blue-600'
              : 'bg-slate-50 border-slate-100 text-slate-400 group-hover:text-slate-600'
          }`}>
            <Users className="w-5 h-5" />
          </div>
        </button>

        <button
          onClick={() => setActiveStatusFilter('active')}
          className={`bg-white p-5 rounded-2xl border text-left transition-all duration-350 shadow-sm hover:shadow-md group relative overflow-hidden focus:outline-none flex justify-between items-start ${
            activeStatusFilter === 'active'
              ? 'border-emerald-400 ring-2 ring-emerald-50/50 bg-emerald-50/10'
              : 'border-slate-100 hover:border-slate-300'
          }`}
        >
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="min-w-0 flex-1 relative z-10">
            <p className="text-xs font-semibold text-slate-500 mb-1 truncate">Active Labs</p>
            <h3 className="text-3xl font-bold text-slate-900 leading-none">{activeCount}</h3>
          </div>
          <div className={`p-3 rounded-xl border relative z-10 transition-colors ${
            activeStatusFilter === 'active'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
              : 'bg-slate-50 border-slate-100 text-slate-400 group-hover:text-emerald-600'
          }`}>
            <UserCheck className="w-5 h-5" />
          </div>
        </button>

        <button
          onClick={() => setActiveStatusFilter('inactive')}
          className={`bg-white p-5 rounded-2xl border text-left transition-all duration-350 shadow-sm hover:shadow-md group relative overflow-hidden focus:outline-none flex justify-between items-start ${
            activeStatusFilter === 'inactive'
              ? 'border-red-400 ring-2 ring-red-50/50 bg-red-50/10'
              : 'border-slate-100 hover:border-slate-300'
          }`}
        >
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="min-w-0 flex-1 relative z-10">
            <p className="text-xs font-semibold text-slate-500 mb-1 truncate">Inactive Labs</p>
            <h3 className="text-3xl font-bold text-slate-900 leading-none">{inactiveCount}</h3>
          </div>
          <div className={`p-3 rounded-xl border relative z-10 transition-colors ${
            activeStatusFilter === 'inactive'
              ? 'bg-red-500/10 border-red-500/20 text-red-600'
              : 'bg-slate-50 border-slate-100 text-slate-400 group-hover:text-red-650'
          }`}>
            <UserMinus className="w-5 h-5" />
          </div>
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="mb-6">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search lab partners by name, email, or contact number..." />
      </div>

      {/* Results summary info */}
      {debouncedSearch && (
        <p className="text-xs text-slate-500 font-semibold mb-4">
          {total} lab partner{total !== 1 ? 's' : ''} found matching "{debouncedSearch}"
        </p>
      )}

      {/* Main Content Area: Loader / Error / Table grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : isError ? (
        <div className="bg-white border border-dashed border-red-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <h3 className="text-base font-bold text-red-700 mb-1">Failed to load lab partners</h3>
          <p className="text-red-500 text-sm">Please refresh the page and try again.</p>
        </div>
      ) : labs.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <Beaker className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No lab partners found</h3>
          <p className="text-slate-500 text-sm mb-4">Try adjusting your filters or create a new lab partner entry.</p>
        </div>
      ) : (
        <div className="relative">
          {isFetching && !isLoading && (
            <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-2xl">
              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
            </div>
          )}

          <DataTable
            columns={columns}
            data={labs}
            onRowClick={handleRowClick}
            emptyTitle="No lab partners match requirements"
            mobileCardRender={mobileCardRender}
          />

          <div className="mt-6">
            <Pagination
              totalItems={total}
              itemsPerPage={ITEMS_PER_PAGE}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      <AddEditLabModal
        isOpen={modalState.isOpen}
        item={modalState.item}
        onClose={() => setModalState({ isOpen: false, item: null })}
        onSubmit={handleSaveLab}
        isSaving={isSaving}
      />

      {/* Confirm Delete Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, labId: null })}
        onConfirm={handleConfirmDelete}
        type="danger"
        title="Delete Lab Partner?"
        message="Are you sure you want to delete this lab partner? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />

    </div>
  );
};

export default Labs;
