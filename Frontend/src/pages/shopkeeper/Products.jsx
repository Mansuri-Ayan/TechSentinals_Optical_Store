import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Glasses, ShoppingCart, UserMinus } from 'lucide-react';
import { MOCK_PRODUCTS } from '../../data/productsData';
import { useCartStore } from '../../store/cartStore';
import ProductSearch from '../../components/shopkeeper/ProductSearch';
import ProductFilter from '../../components/shopkeeper/ProductFilter';
import ProductGrid from '../../components/shopkeeper/ProductGrid';
import CustomerCart from '../../components/shopkeeper/CustomerCart';

const Products = () => {
  const navigate = useNavigate();
  const { isSelectionMode, tempCustomerForm, cancelSelection, completeSelection } = useCartStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Frames');

  // Filter items based on active category and search text
  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter((product) => {
      const matchesCategory = product.category === activeCategory;
      const q = searchTerm.toLowerCase().trim();
      if (!q) return matchesCategory;

      const matchesSearch =
        product.product_name.toLowerCase().includes(q) ||
        product.brand.toLowerCase().includes(q) ||
        product.subcategory.toLowerCase().includes(q) ||
        product.sku.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchTerm]);

  const handleDone = () => {
    completeSelection();
    navigate('/shopkeeper/customers');
  };

  const handleCancelSelection = () => {
    cancelSelection();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">
      {/* Selection Mode Banner */}
      {isSelectionMode && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 shadow-sm">
          <div className="flex items-center gap-3 text-emerald-800">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 animate-pulse">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Product Selection Mode</p>
              <p className="text-sm font-semibold mt-0.5">
                Selecting products for{' '}
                <span className="font-extrabold">
                  {tempCustomerForm
                    ? `${tempCustomerForm.firstName} ${tempCustomerForm.lastName}`
                    : 'Customer'}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={handleCancelSelection}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm"
            type="button"
          >
            <UserMinus className="w-4 h-4" />
            Cancel Selection
          </button>
        </div>
      )}

      {/* Breadcrumb + Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 space-x-2">
          <Link to="/shopkeeper/dashboard" className="hover:text-slate-800 transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-semibold">Products</span>
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Glasses className="w-8 h-8 text-blue-500" />
            Products Catalog
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm">
            Browse optical frames and high-definition lenses.
          </p>
        </div>
      </div>

      {/* Main Grid: Content (Left) + Cart (Right) */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left Side: Product Grid */}
        <div className={`col-span-12 ${isSelectionMode ? 'lg:col-span-8 xl:col-span-9' : ''} space-y-6`}>
          {/* Controls: Search + Filter */}
          <div className="flex flex-col gap-4">
            <ProductSearch value={searchTerm} onChange={setSearchTerm} placeholder="Search products..." />
            <ProductFilter activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
          </div>

          {/* Results summary */}
          {searchTerm && (
            <p className="text-xs text-slate-400 font-bold">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found for "{searchTerm}"
            </p>
          )}

          {/* Products Grid list */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                <Glasses className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">No products found</h3>
              <p className="text-slate-500 text-sm">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <ProductGrid products={filteredProducts} />
          )}
        </div>

        {/* Right Side: Selection Mode Cart Panel */}
        {isSelectionMode && (
          <div className="col-span-12 lg:col-span-4 xl:col-span-3 lg:sticky lg:top-6 h-[calc(100vh-120px)] lg:h-[calc(100vh-150px)]">
            <CustomerCart onDone={handleDone} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;
