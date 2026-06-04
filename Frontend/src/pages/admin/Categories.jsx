import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, Plus, Layers, ChevronRight, Edit2, Trash2, Eye, 
  Glasses, ShoppingBag, ArrowLeft, Package
} from 'lucide-react';
import Pagination from '../../components/shared/Pagination';
import AddEditCategoryModal from '../../components/admin/AddEditCategoryModal';

const MOCK_OPTIONS = [
  // Frames
  { id: 1, category_name: 'Full Rim', category_type: 'Frames', description: 'Sturdy frames that completely encircle the lens.', products_count: 120, status: 'Active', created_at: '2023-01-10' },
  { id: 2, category_name: 'Half Rim', category_type: 'Frames', description: 'Semi-rimless frames, lighter weight.', products_count: 85, status: 'Active', created_at: '2023-01-12' },
  { id: 3, category_name: 'Rimless', category_type: 'Frames', description: 'No frames, lenses mounted directly to bridge and temples.', products_count: 64, status: 'Active', created_at: '2023-01-15' },
  { id: 4, category_name: 'Round', category_type: 'Frames', description: 'Classic circular frame design.', products_count: 110, status: 'Active', created_at: '2023-02-01' },
  { id: 5, category_name: 'Square', category_type: 'Frames', description: 'Angular square frame design.', products_count: 95, status: 'Active', created_at: '2023-02-10' },
  { id: 6, category_name: 'Rectangle', category_type: 'Frames', description: 'Wider rectangular frames.', products_count: 150, status: 'Active', created_at: '2023-03-05' },
  { id: 7, category_name: 'Cat Eye', category_type: 'Frames', description: 'Retro style with upswept outer edges.', products_count: 75, status: 'Active', created_at: '2023-03-12' },
  { id: 8, category_name: 'Aviator', category_type: 'Frames', description: 'Teardrop shaped pilot glasses.', products_count: 130, status: 'Active', created_at: '2023-04-01' },
  { id: 9, category_name: 'Wayfarer', category_type: 'Frames', description: 'Iconic thick plastic frames.', products_count: 105, status: 'Active', created_at: '2023-04-10' },

  // Lenses
  { id: 10, category_name: 'Single Vision', category_type: 'Lenses', description: 'One optical prescription throughout the lens.', products_count: 320, status: 'Active', created_at: '2023-01-05' },
  { id: 11, category_name: 'Bifocal', category_type: 'Lenses', description: 'Two distinct optical powers.', products_count: 140, status: 'Active', created_at: '2023-01-15' },
  { id: 12, category_name: 'Progressive', category_type: 'Lenses', description: 'Seamless gradient of multiple lens powers.', products_count: 210, status: 'Active', created_at: '2023-02-20' },
  { id: 13, category_name: 'Blue Cut', category_type: 'Lenses', description: 'Blocks harmful blue light from screens.', products_count: 180, status: 'Active', created_at: '2023-03-10' },
  { id: 14, category_name: 'Photochromic', category_type: 'Lenses', description: 'Darkens automatically in sunlight.', products_count: 160, status: 'Active', created_at: '2023-04-05' },
  { id: 15, category_name: 'Polarized', category_type: 'Lenses', description: 'Reduces glare from reflective surfaces.', products_count: 90, status: 'Active', created_at: '2023-04-20' },
  { id: 16, category_name: 'Computer Lens', category_type: 'Lenses', description: 'Optimized for intermediate screen distances.', products_count: 200, status: 'Active', created_at: '2023-05-15' },

  // Other Products
  { id: 17, category_name: 'Contact Lens', category_type: 'Other Product', description: 'Daily, bi-weekly, and monthly disposables.', products_count: 80, status: 'Active', created_at: '2023-01-20' },
  { id: 18, category_name: 'Lens Solution', category_type: 'Other Product', description: 'Cleaning and disinfecting liquids.', products_count: 45, status: 'Active', created_at: '2023-02-15' },
  { id: 19, category_name: 'Eye Drops', category_type: 'Other Product', description: 'Lubricating and soothing drops.', products_count: 30, status: 'Active', created_at: '2023-03-01' },
  { id: 20, category_name: 'Accessories', category_type: 'Other Product', description: 'Chains, cords, and repair kits.', products_count: 120, status: 'Active', created_at: '2023-03-20' },
  { id: 21, category_name: 'Cleaning Kit', category_type: 'Other Product', description: 'Microfiber cloths and sprays.', products_count: 65, status: 'Active', created_at: '2023-04-10' },
  { id: 22, category_name: 'Cases', category_type: 'Other Product', description: 'Hard and soft protective cases.', products_count: 150, status: 'Active', created_at: '2023-05-05' },
];

const MAIN_CATEGORIES = [
  { id: 'Frames', inventoryKey: 'frames', label: 'Frames', icon: Glasses, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', hover: 'hover:border-blue-300', activeBorder: 'border-blue-400', desc: 'Manage styles like Aviator, Round, Wayfarer' },
  { id: 'Lenses', inventoryKey: 'lenses', label: 'Lenses', icon: Eye, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', hover: 'hover:border-emerald-300', activeBorder: 'border-emerald-400', desc: 'Manage types like Single Vision, Progressive' },
  { id: 'Other Product', inventoryKey: 'other', label: 'Other Products', icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', hover: 'hover:border-purple-300', activeBorder: 'border-purple-400', desc: 'Manage Contact Lenses, Accessories, Cases' },
];

// Map category_type → inventory URL key
const CATEGORY_TYPE_TO_KEY = {
  'Frames': 'frames',
  'Lenses': 'lenses',
  'Other Product': 'other',
};

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

const Categories = () => {
  const navigate = useNavigate();
  const [categoriesData, setCategoriesData] = useState(MOCK_OPTIONS);
  const [selectedMainCategory, setSelectedMainCategory] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modals state
  const [addEditModal, setAddEditModal] = useState({ isOpen: false, item: null });

  /* ── Derive the current main-category config ── */
  const currentMainCat = MAIN_CATEGORIES.find(m => m.id === selectedMainCategory);

  /* ── Filter & Paginate (Only for selected category) ── */
  const filteredOptions = useMemo(() => {
    if (!selectedMainCategory) return [];
    const q = searchTerm.toLowerCase().trim();
    return categoriesData
      .filter(c => c.category_type === selectedMainCategory)
      .filter(c => 
        !q || 
        c.category_name.toLowerCase().includes(q) || 
        c.status.toLowerCase().includes(q)
      );
  }, [categoriesData, selectedMainCategory, searchTerm]);

  const paginatedOptions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOptions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOptions, currentPage]);

  /* ── Handlers ── */
  const handleSaveCategory = (data) => {
    if (data.id) {
      setCategoriesData(prev => prev.map(c => c.id === data.id ? data : c));
    } else {
      setCategoriesData(prev => [{ 
        ...data, 
        id: Date.now(), 
        products_count: 0, 
        created_at: new Date().toISOString().split('T')[0] 
      }, ...prev]);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this option?')) {
      setCategoriesData(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleBack = () => {
    setSelectedMainCategory(null);
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Navigate to inventory filtered by category + subcategory
  const handleViewCategoryItems = (option) => {
    const catKey = CATEGORY_TYPE_TO_KEY[option.category_type] || 'all';
    navigate(
      `/admin/inventory?category=${encodeURIComponent(catKey)}&subcategory=${encodeURIComponent(option.category_name)}`
    );
  };

  // Navigate to inventory filtered by main category only (from the big card)
  const handleViewMainCategoryItems = (main) => {
    navigate(`/admin/inventory?category=${encodeURIComponent(main.inventoryKey)}`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in font-sans">
      {/* ── Breadcrumb + Header ── */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 space-x-2">
          <Link to="/admin/dashboard" className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <button onClick={handleBack} className={`hover:text-slate-800 transition-colors ${!selectedMainCategory ? 'text-slate-900 font-semibold' : ''}`}>
            Categories
          </button>
          {selectedMainCategory && (
            <>
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
              <span className="text-slate-900 font-semibold">{selectedMainCategory}</span>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div className="flex items-center gap-3">
            {selectedMainCategory && (
              <button onClick={handleBack} className="p-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors mr-1 shadow-sm">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Layers className="w-8 h-8 text-emerald-500" />
                {selectedMainCategory ? `${selectedMainCategory} Options` : 'Main Categories'}
              </h1>
              <p className="text-slate-500 mt-1.5 text-sm sm:text-base">
                {selectedMainCategory 
                  ? `Manage the available options and subcategories for ${selectedMainCategory}.` 
                  : 'Select a main category to manage its specific options and styles.'}
              </p>
            </div>
          </div>
          
          {selectedMainCategory && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* View all items in this main category */}
              <button
                onClick={() => handleViewMainCategoryItems(currentMainCat)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition-all flex-shrink-0"
              >
                <Package className="w-4 h-4" />
                View All in Inventory
              </button>
              <button
                onClick={() => setAddEditModal({ isOpen: true, item: { category_type: selectedMainCategory } })}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex-shrink-0 justify-center"
              >
                <Plus className="w-4 h-4" />
                Add Option
              </button>
            </div>
          )}
        </div>
      </div>

      {!selectedMainCategory ? (
        /* ── View 1: Main Category Grid ── */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MAIN_CATEGORIES.map(main => {
            const count = categoriesData.filter(c => c.category_type === main.id).length;
            const totalProducts = categoriesData
              .filter(c => c.category_type === main.id)
              .reduce((sum, c) => sum + c.products_count, 0);
            return (
              <div
                key={main.id}
                className={`flex flex-col items-start p-6 bg-white border ${main.border} ${main.hover} rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 group text-left relative overflow-hidden`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-slate-50 to-transparent rounded-bl-full opacity-50 pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                
                <div className={`p-4 rounded-2xl ${main.bg} ${main.color} mb-5 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                  <main.icon className="w-8 h-8" />
                </div>
                
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{main.label}</h2>
                <p className="text-sm text-slate-500 mb-5 flex-1 line-clamp-2">{main.desc}</p>

                {/* Stats row */}
                <div className="flex items-center gap-3 mb-5 w-full">
                  <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-center">
                    <p className="text-xs text-slate-500 font-medium">Options</p>
                    <p className="text-lg font-bold text-slate-900">{count}</p>
                  </div>
                  <div className={`flex-1 ${main.bg} border ${main.border} rounded-xl px-3 py-2 text-center`}>
                    <p className={`text-xs font-medium ${main.color}`}>Products</p>
                    <p className="text-lg font-bold text-slate-900">{totalProducts.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 w-full pt-4 border-t border-slate-100">
                  {/* Manage options button */}
                  <button
                    onClick={() => setSelectedMainCategory(main.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors border border-slate-200"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Manage Options
                  </button>
                  {/* View in Inventory button */}
                  <button
                    onClick={() => handleViewMainCategoryItems(main)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 ${main.bg} ${main.color} rounded-xl text-xs font-bold hover:opacity-80 transition-colors border ${main.border}`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Inventory
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── View 2: Subcategory Options Grid ── */
        <div className="animate-fade-in">
          {/* Search */}
          <div className="relative w-full mb-6 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder={`Search ${selectedMainCategory} options...`}
              className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-medium transition-all shadow-sm placeholder:text-slate-400"
            />
          </div>

          {/* Results count */}
          {searchTerm && (
            <p className="text-xs text-slate-500 font-medium mb-4">
              {filteredOptions.length} option{filteredOptions.length !== 1 ? 's' : ''} found for "{searchTerm}"
            </p>
          )}

          {filteredOptions.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                <Layers className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">No options found</h3>
              <p className="text-slate-500 text-sm mb-4">Try adjusting your search or add a new option.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                {paginatedOptions.map(option => (
                  <div key={option.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-4 sm:p-5 flex flex-col group h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl ${currentMainCat?.bg || 'bg-emerald-50'} border ${currentMainCat?.border || 'border-emerald-100'} flex items-center justify-center font-bold ${currentMainCat?.color || 'text-emerald-600'} text-xl flex-shrink-0`}>
                          {option.category_name[0]}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 text-base truncate">
                            {option.category_name}
                          </h3>
                          <div className="text-xs text-slate-500 font-medium mt-0.5 truncate">Added {new Date(option.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <StatusBadge status={option.status} />
                    </div>
                    
                    {option.description && (
                      <p className="text-sm text-slate-500 mb-4 flex-1 line-clamp-2">
                        {option.description}
                      </p>
                    )}
                    {!option.description && <div className="flex-1" />}

                    <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
                      {/* Product count */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-slate-500 font-medium text-xs">Products in Inventory</span>
                          <span className="font-bold text-slate-900 text-lg">{option.products_count}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        {/* View Inventory Items — primary CTA */}
                        <button
                          onClick={() => handleViewCategoryItems(option)}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 ${currentMainCat?.bg || 'bg-emerald-50'} ${currentMainCat?.color || 'text-emerald-700'} rounded-xl text-xs font-bold hover:opacity-80 transition-colors border ${currentMainCat?.border || 'border-emerald-100'}`}
                          title={`View all ${option.category_name} items in inventory`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Items
                        </button>
                        {/* Edit */}
                        <button
                          onClick={() => setAddEditModal({ isOpen: true, item: option })}
                          className="flex items-center justify-center w-9 h-9 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200"
                          title="Edit option"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(option.id)}
                          className="flex items-center justify-center w-9 h-9 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
                          title="Delete option"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Pagination
                totalItems={filteredOptions.length}
                itemsPerPage={ITEMS_PER_PAGE}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AddEditCategoryModal
        isOpen={addEditModal.isOpen}
        item={addEditModal.item}
        onClose={() => setAddEditModal({ isOpen: false, item: null })}
        onSubmit={handleSaveCategory}
      />
    </div>
  );
};

export default Categories;
