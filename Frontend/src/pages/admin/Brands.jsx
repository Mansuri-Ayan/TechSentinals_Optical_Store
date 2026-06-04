import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, Plus, Tag, ChevronRight, Edit2, Trash2, Eye,
} from 'lucide-react';
import Pagination from '../../components/shared/Pagination';
import AddEditBrandModal from '../../components/admin/AddEditBrandModal';

const MOCK_BRANDS = [
  { id: 1, brand_name: 'Ray-Ban', products_count: 45, status: 'Active', created_at: '2023-01-15' },
  { id: 2, brand_name: 'Oakley', products_count: 22, status: 'Active', created_at: '2023-02-10' },
  { id: 3, brand_name: 'John Jacobs', products_count: 38, status: 'Active', created_at: '2023-03-05' },
  { id: 4, brand_name: 'Titan', products_count: 50, status: 'Active', created_at: '2023-04-12' },
  { id: 5, brand_name: 'Fastrack', products_count: 15, status: 'Inactive', created_at: '2023-05-20' },
  { id: 6, brand_name: 'Vincent Chase', products_count: 42, status: 'Active', created_at: '2023-06-18' },
  { id: 7, brand_name: 'Carrera', products_count: 18, status: 'Active', created_at: '2023-07-22' },
  { id: 8, brand_name: 'Vogue', products_count: 25, status: 'Active', created_at: '2023-08-30' },
  { id: 9, brand_name: 'Police', products_count: 12, status: 'Active', created_at: '2023-09-14' },
  { id: 10, brand_name: 'Essilor', products_count: 60, status: 'Active', created_at: '2023-10-01' },
  { id: 11, brand_name: 'Crizal', products_count: 55, status: 'Active', created_at: '2023-10-15' },
  { id: 12, brand_name: 'Hoya', products_count: 30, status: 'Inactive', created_at: '2023-11-05' },
];

const ITEMS_PER_PAGE = 8;

const StatusBadge = ({ status }) => {
  const isActive = status === 'Active';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${isActive ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-600 bg-slate-100 border-slate-200'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'} flex-shrink-0`} />
      {status}
    </span>
  );
};

const Brands = () => {
  const navigate = useNavigate();
  const [brandsData, setBrandsData] = useState(MOCK_BRANDS);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalState, setModalState] = useState({ isOpen: false, item: null });

  /* ── Filter & Paginate ── */
  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return brandsData.filter(b => 
      !q || b.brand_name.toLowerCase().includes(q) || b.status.toLowerCase().includes(q)
    );
  }, [brandsData, searchTerm]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  /* ── Handlers ── */
  const handleSaveBrand = (data) => {
    if (data.id) {
      setBrandsData(prev => prev.map(b => b.id === data.id ? data : b));
    } else {
      setBrandsData(prev => [{ ...data, id: Date.now(), products_count: 0, created_at: new Date().toISOString().split('T')[0] }, ...prev]);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this brand?')) {
      setBrandsData(prev => prev.filter(b => b.id !== id));
    }
  };

  const handleViewBrandItems = (brandName) => {
    navigate(`/admin/inventory?brand=${encodeURIComponent(brandName)}`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in font-sans">
      {/* ── Breadcrumb + Header ── */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 space-x-2">
          <Link to="/admin/dashboard" className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-semibold">Brands</span>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Tag className="w-8 h-8 text-blue-500" />
              Brands Management
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm sm:text-base">
              Manage product brands, tracking active status and inventory associations.
            </p>
          </div>
          <button
            onClick={() => setModalState({ isOpen: true, item: null })}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex-shrink-0 w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            Add Brand
          </button>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
          <span className="text-2xl font-bold text-slate-900">{brandsData.length}</span>
          <span className="text-sm text-slate-500 font-medium">Total Brands</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm">
          <span className="text-2xl font-bold text-emerald-700">{brandsData.filter(b => b.status === 'Active').length}</span>
          <span className="text-sm text-emerald-600 font-medium">Active</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl shadow-sm">
          <span className="text-2xl font-bold text-slate-600">{brandsData.filter(b => b.status === 'Inactive').length}</span>
          <span className="text-sm text-slate-500 font-medium">Inactive</span>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="relative w-full mb-6 group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          placeholder="Search brands by name or status..."
          className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-medium transition-all shadow-sm placeholder:text-slate-400"
        />
      </div>

      {/* ── Results count ── */}
      {searchTerm && (
        <p className="text-xs text-slate-500 font-medium mb-4">
          {filtered.length} brand{filtered.length !== 1 ? 's' : ''} found for "{searchTerm}"
        </p>
      )}

      {/* ── Data Views ── */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <Tag className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No brands found</h3>
          <p className="text-slate-500 text-sm mb-4">Try adjusting your search criteria.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
            {paginated.map(brand => (
              <div key={brand.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-4 sm:p-5 flex flex-col group h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 text-xl flex-shrink-0">
                      {brand.brand_name[0]}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-base truncate">
                        {brand.brand_name}
                      </h3>
                      <div className="text-xs text-slate-500 font-medium mt-0.5 truncate">Added {new Date(brand.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <StatusBadge status={brand.status} />
                </div>
                
                <div className="flex-1" />

                <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
                  {/* Products count */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm flex flex-col">
                      <span className="text-slate-500 font-medium text-xs">Products in Inventory</span>
                      <span className="font-bold text-slate-900 text-lg">{brand.products_count}</span>
                    </div>
                  </div>

                  {/* Action buttons row */}
                  <div className="flex items-center gap-2">
                    {/* View Inventory Items */}
                    <button
                      onClick={() => handleViewBrandItems(brand.brand_name)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors border border-blue-100"
                      title={`View all ${brand.brand_name} items in inventory`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Items
                    </button>
                    {/* Edit */}
                    <button
                      onClick={() => setModalState({ isOpen: true, item: brand })}
                      className="flex items-center justify-center w-9 h-9 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200"
                      title="Edit brand"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(brand.id)}
                      className="flex items-center justify-center w-9 h-9 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
                      title="Delete brand"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* Add/Edit Modal */}
      <AddEditBrandModal
        isOpen={modalState.isOpen}
        item={modalState.item}
        onClose={() => setModalState({ isOpen: false, item: null })}
        onSubmit={handleSaveBrand}
      />
    </div>
  );
};

export default Brands;
