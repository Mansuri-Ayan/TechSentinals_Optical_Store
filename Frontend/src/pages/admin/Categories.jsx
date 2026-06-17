import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  Search, Plus, Layers, ChevronRight, Edit2, Trash2, Eye, 
  ArrowLeft, Package, Loader2, Glasses, ShoppingBag, Store, ChevronDown
} from 'lucide-react';
import Pagination from '../../components/shared/Pagination';
import AddEditCategoryModal from '../../components/admin/AddEditCategoryModal';
import { useStoreStore } from '../../store/store';
import { useCategories, useSubcategories } from '../../hooks/useCategories';

const ITEMS_PER_PAGE = 8;

/* ── Custom dynamic branding themes based on category names ── */
const getCategoryTheme = (name) => {
  const normalized = (name || '').toLowerCase();
  if (normalized.includes('frame')) {
    return {
      icon: Glasses,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      hover: 'hover:border-blue-300',
      activeBorder: 'border-blue-400',
      desc: 'Manage styles like Aviator, Round, Wayfarer'
    };
  }
  if (normalized.includes('lens') && !normalized.includes('contact')) {
    return {
      icon: Eye,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      hover: 'hover:border-emerald-300',
      activeBorder: 'border-emerald-400',
      desc: 'Manage types like Single Vision, Progressive Lenses'
    };
  }
  if (normalized.includes('sunglass')) {
    return {
      icon: Glasses,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      hover: 'hover:border-amber-300',
      activeBorder: 'border-amber-400',
      desc: 'Manage UV-protection and fashion sunglasses'
    };
  }
  if (normalized.includes('contact')) {
    return {
      icon: Eye,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
      border: 'border-cyan-100',
      hover: 'hover:border-cyan-300',
      activeBorder: 'border-cyan-400',
      desc: 'Manage daily, monthly and yearly contact lenses'
    };
  }
  return {
    icon: ShoppingBag,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    hover: 'hover:border-purple-300',
    activeBorder: 'border-purple-400',
    desc: 'Manage cases, cloths, solutions and accessories'
  };
};

const StatusBadge = ({ isActive }) => {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${isActive ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-600 bg-slate-100 border-slate-200'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'} flex-shrink-0`} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
};

const Categories = () => {
  const navigate = useNavigate();
  const { storeId } = useParams();
  const { selectedStore, setSelectedStore, stores } = useStoreStore();
  const [inPageStoreId, setInPageStoreId] = useState(storeId);

  useEffect(() => {
    setInPageStoreId(storeId);
  }, [storeId]);

  // Sync storeId from URL with global store state
  useEffect(() => {
    if (storeId && stores.length > 0) {
      const urlStore = stores.find(s => String(s.id) === String(storeId));
      if (urlStore && (!selectedStore || String(selectedStore.id) !== String(storeId))) {
        setSelectedStore(urlStore);
      }
    }
  }, [storeId, stores, selectedStore, setSelectedStore]);

  const [selectedCategory, setSelectedCategory] = useState(null); // full category object
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [catPage, setCatPage] = useState(1);
  const [addEditModal, setAddEditModal] = useState({ isOpen: false, item: null, mode: 'category' });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      if (selectedCategory) {
        setCurrentPage(1);
      } else {
        setCatPage(1);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedCategory]);

  // ── Categories query (View 1) ──
  const {
    categories,
    total: totalCategories,
    pages: catPages,
    isLoadingCategories,
    isFetchingCategories,
    isCategoriesError,
    createCategoryAsync,
    updateCategoryAsync,
    deleteCategoryAsync,
    isSavingCategory,
  } = useCategories(inPageStoreId, {
    page: catPage,
    limit: 100, // Load all on the dashboard view for simple display
  });

  // ── Subcategories query (View 2) ──
  const {
    subcategories,
    totalSubcategories,
    subcategoryPages,
    isLoadingSubcategories,
    isFetchingSubcategories,
    createSubcategoryAsync,
    updateSubcategoryAsync,
    deleteSubcategoryAsync,
    isSavingSubcategory,
  } = useSubcategories(
    selectedCategory?.id || null,
    inPageStoreId,
    {
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      search: selectedCategory ? (debouncedSearch || undefined) : undefined,
    }
  );

  /* ── Handlers ── */
  const handleBack = () => {
    setSelectedCategory(null);
    setSearchTerm('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  const handleSave = useCallback(async (data) => {
    try {
      if (data.mode === 'subcategory') {
        if (data.id) {
          await updateSubcategoryAsync({
            id: data.id,
            payload: { name: data.name, description: data.description || null, is_active: data.is_active },
          });
        } else {
          await createSubcategoryAsync({ name: data.name, description: data.description || null });
        }
      } else {
        if (data.id) {
          await updateCategoryAsync({
            id: data.id,
            payload: { name: data.name, description: data.description || null, is_active: data.is_active },
          });
        } else {
          await createCategoryAsync({ name: data.name, description: data.description || null });
        }
      }
      return true;
    } catch {
      return false;
    }
  }, [createCategoryAsync, updateCategoryAsync, createSubcategoryAsync, updateSubcategoryAsync]);

  const handleDeleteCategory = useCallback(async (id) => {
    if (window.confirm('Are you sure you want to deactivate this category?')) {
      try { await deleteCategoryAsync(id); } catch { /* handled by mutation */ }
    }
  }, [deleteCategoryAsync]);

  const handleDeleteSubcategory = useCallback(async (id) => {
    if (window.confirm('Are you sure you want to deactivate this subcategory?')) {
      try { await deleteSubcategoryAsync(id); } catch { /* handled by mutation */ }
    }
  }, [deleteSubcategoryAsync]);

  const handleViewCategoryItems = (categoryId) => {
    navigate(`/admin/store/${inPageStoreId}/inventory?category_id=${categoryId}`);
  };

  const handleViewSubcategoryItems = (subcategoryId) => {
    navigate(`/admin/store/${inPageStoreId}/inventory?category_id=${selectedCategory.id}&subcategory_id=${subcategoryId}`);
  };

  const selectedCatTheme = useMemo(() => {
    return selectedCategory ? getCategoryTheme(selectedCategory.name) : getCategoryTheme('');
  }, [selectedCategory]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in font-sans">
      {/* ── Breadcrumb + Header ── */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 space-x-2">
          <Link to="/admin/dashboard" className="hover:text-slate-800 transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <button onClick={handleBack} className={`hover:text-slate-800 transition-colors ${!selectedCategory ? 'text-slate-900 font-semibold' : ''}`}>
            Categories
          </button>
          {selectedCategory && (
            <>
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
              <span className="text-slate-900 font-semibold">{selectedCategory.name}</span>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div className="flex items-center gap-3">
            {selectedCategory && (
              <button onClick={handleBack} className="p-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors mr-1 shadow-sm">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Layers className="w-8 h-8 text-emerald-500" />
                {selectedCategory ? `${selectedCategory.name} Options` : 'Main Categories'}
              </h1>
              <p className="text-slate-500 mt-1.5 text-sm sm:text-base">
                {selectedCategory 
                  ? `Manage the available options and subcategories for ${selectedCategory.name}.` 
                  : 'Select a main category to manage its specific options and styles.'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {storeId === 'admin' && (
              <div className="relative">
                <select
                  value={inPageStoreId}
                  onChange={(e) => {
                    setInPageStoreId(e.target.value);
                    if (selectedCategory) {
                      setCurrentPage(1);
                    } else {
                      setCatPage(1);
                    }
                  }}
                  className="pl-9 pr-10 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm appearance-none cursor-pointer"
                >
                  <option value="admin">All Store</option>
                  {stores.filter(s => s.id !== 'admin' && s.store_name !== 'All Store' && s.name !== 'All Store').map(s => (
                    <option key={s.id} value={s.id}>{s.store_name}</option>
                  ))}
                </select>
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            )}
            
            {selectedCategory ? (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleViewCategoryItems(selectedCategory.id)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition-all flex-shrink-0"
                >
                  <Package className="w-4 h-4" />
                  View All in Inventory
                </button>
                <button
                  onClick={() => setAddEditModal({ isOpen: true, item: null, mode: 'subcategory' })}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex-shrink-0 justify-center"
                >
                  <Plus className="w-4 h-4" />
                  Add Option
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddEditModal({ isOpen: true, item: null, mode: 'category' })}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex-shrink-0 justify-center"
              >
                <Plus className="w-4 h-4" />
                Add Category
              </button>
            )}
          </div>
        </div>
      </div>

      {!selectedCategory ? (
        /* ══════════════ View 1: Main Category Grid (Restored UI) ══════════════ */
        <>
          {isLoadingCategories ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : isCategoriesError ? (
            <div className="bg-white border border-dashed border-red-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <h3 className="text-base font-bold text-red-700 mb-1">Failed to load categories</h3>
              <p className="text-red-500 text-sm">Please try refreshing the page.</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                <Layers className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">No categories found</h3>
              <p className="text-slate-500 text-sm mb-4">Add a category to get started.</p>
            </div>
          ) : (
            <div className="relative">
              {isFetchingCategories && !isLoadingCategories && (
                <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-2xl">
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {categories.map((cat) => {
                  const theme = getCategoryTheme(cat.name);
                  const Icon = theme.icon;
                  return (
                    <div
                      key={cat.id}
                      className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col group relative overflow-hidden text-left"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-slate-50 to-transparent rounded-bl-full opacity-50 pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                      
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl ${theme.bg} border ${theme.border} flex items-center justify-center font-bold ${theme.color} text-xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <StatusBadge isActive={cat.is_active} />
                      </div>
                      
                      <h2 className="text-xl font-bold text-slate-900 mb-1">{cat.name}</h2>
                      <p className="text-sm text-slate-500 mb-6 flex-1">{cat.description || theme.desc}</p>

                      {/* Stats row */}
                      <div className="flex items-center gap-4 mb-6">
                        <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-center">
                          <p className="text-xs text-slate-500 font-medium">Options</p>
                          <p className="text-lg font-bold text-slate-900">{cat.subcategories_count}</p>
                        </div>
                        <div className={`flex-1 ${theme.bg} border ${theme.border} rounded-xl px-3 py-2 text-center`}>
                          <p className={`text-xs font-medium ${theme.color}`}>Products</p>
                          <p className="text-lg font-bold text-slate-900">{cat.products_count}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 w-full pt-4 border-t border-slate-100">
                        <button
                          onClick={() => { setSelectedCategory(cat); setSearchTerm(''); setDebouncedSearch(''); setCurrentPage(1); }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors border border-slate-200"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Manage Options
                        </button>
                        <button
                          onClick={() => handleViewCategoryItems(cat.id)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 ${theme.bg} ${theme.color} rounded-xl text-xs font-bold hover:opacity-80 transition-colors border ${theme.border}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Inventory
                        </button>
                        
                        <button
                          onClick={() => setAddEditModal({ isOpen: true, item: cat, mode: 'category' })}
                          className="flex items-center justify-center w-8 h-8 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200"
                          title="Edit category name/details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="flex items-center justify-center w-8 h-8 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
                          title="Deactivate category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        /* ══════════════ View 2: Subcategories Grid (Restored Options Grid) ══════════════ */
        <div className="animate-fade-in">
          {/* Search */}
          <div className="relative w-full mb-6 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={`Search ${selectedCategory.name} options...`}
              className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-medium transition-all shadow-sm placeholder:text-slate-400"
            />
          </div>

          {debouncedSearch && (
            <p className="text-xs text-slate-500 font-medium mb-4">
              {totalSubcategories} subcategor{totalSubcategories !== 1 ? 'ies' : 'y'} found for "{debouncedSearch}"
            </p>
          )}

          {isLoadingSubcategories ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : subcategories.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                <Layers className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">No options found</h3>
              <p className="text-slate-500 text-sm mb-4">Try adjusting your search or add a new option.</p>
            </div>
          ) : (
            <div className="relative">
              {isFetchingSubcategories && !isLoadingSubcategories && (
                <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-2xl">
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                {subcategories.map(option => (
                  <div key={option.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-4 sm:p-5 flex flex-col group h-full text-left">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl ${selectedCatTheme.bg} border ${selectedCatTheme.border} flex items-center justify-center font-bold ${selectedCatTheme.color} text-xl flex-shrink-0`}>
                          {option.name[0]}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 text-base truncate">
                            {option.name}
                          </h3>
                          <div className="text-xs text-slate-500 font-medium mt-0.5 truncate">Added {new Date(option.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <StatusBadge isActive={option.is_active} />
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
                        <button
                          onClick={() => handleViewSubcategoryItems(option.id)}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 ${selectedCatTheme.bg} ${selectedCatTheme.color} rounded-xl text-xs font-bold hover:opacity-80 transition-colors border ${selectedCatTheme.border}`}
                          title={`View all ${option.name} items in inventory`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Items
                        </button>
                        <button
                          onClick={() => setAddEditModal({ isOpen: true, item: option, mode: 'subcategory' })}
                          className="flex items-center justify-center w-9 h-9 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200"
                          title="Edit option"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubcategory(option.id)}
                          className="flex items-center justify-center w-9 h-9 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
                          title="Deactivate option"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Pagination
                totalItems={totalSubcategories}
                itemsPerPage={ITEMS_PER_PAGE}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AddEditCategoryModal
        isOpen={addEditModal.isOpen}
        item={addEditModal.item}
        mode={addEditModal.mode}
        onClose={() => setAddEditModal({ isOpen: false, item: null, mode: 'category' })}
        onSubmit={handleSave}
        isSaving={isSavingCategory || isSavingSubcategory}
      />
    </div>
  );
};

export default Categories;
