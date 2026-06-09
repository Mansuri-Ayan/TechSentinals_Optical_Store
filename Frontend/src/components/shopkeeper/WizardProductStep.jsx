/* eslint-disable */
import { useState, useMemo } from 'react';
import { ShoppingBag, Glasses, ShoppingCart } from 'lucide-react';
import { MOCK_PRODUCTS } from '../../data/productsData';
import { useCartStore } from '../../store/cartStore';
import ProductSearch from './ProductSearch';
import ProductFilter from './ProductFilter';
import ProductGrid from './ProductGrid';
import CustomerCart from './CustomerCart';

const WizardProductStep = ({ onNext }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Frames');

  const { cart } = useCartStore();

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

  return (
    <div className="animate-fade-in font-sans">
      {/* Section Header */}
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <ShoppingBag className="w-3.5 h-3.5" /> Select Products
      </p>

      {/* Main Grid: Content (Left) + Cart (Right) */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left Side: Product Grid */}
        <div className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Controls: Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="w-full sm:flex-1">
              <ProductSearch value={searchTerm} onChange={setSearchTerm} placeholder="Search products..." />
            </div>
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

        {/* Right Side: Cart Panel */}
        <div className="col-span-12 lg:col-span-4 xl:col-span-3 lg:sticky lg:top-6 h-[calc(100vh-120px)] lg:h-[calc(100vh-150px)]">
          <CustomerCart onDone={onNext} />
        </div>
      </div>
    </div>
  );
};

export default WizardProductStep;
