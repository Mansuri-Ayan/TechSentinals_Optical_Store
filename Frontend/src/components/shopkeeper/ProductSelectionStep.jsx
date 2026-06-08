import { useState, useMemo } from 'react';
import { ShoppingBag, ArrowRight, X, Glasses, Eye, HelpCircle } from 'lucide-react';
import { MOCK_PRODUCTS } from '../../data/productsData';
import ProductSearch from './ProductSearch';
import ProductFilter from './ProductFilter';
import ProductGallery from './ProductGallery';
import ProductDetailComp from './ProductDetail';

const getCategoryConfig = (name) => {
  const normalized = (name || '').toLowerCase();
  return normalized.includes('frame')
    ? { icon: Glasses, badge: 'bg-blue-50 text-blue-700 border-blue-200' }
    : { icon: Eye, badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
};

const statusConfig = {
  'In Stock':     { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  'Low Stock':    { color: 'text-amber-700 bg-amber-50 border-amber-200',       dot: 'bg-amber-500' },
  'Out Of Stock': { color: 'text-red-700 bg-red-50 border-red-200',             dot: 'bg-red-500' },
};

const getStatus = (qty, reorder) => {
  if (qty === 0) return 'Out Of Stock';
  if (qty <= reorder) return 'Low Stock';
  return 'In Stock';
};

const GRAD_PALETTE = [
  'from-blue-400 to-indigo-600',
  'from-emerald-400 to-teal-600',
  'from-purple-400 to-violet-600',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-600',
  'from-cyan-400 to-sky-600',
];

const ProductSelectionStep = ({ cart, onAddToCart, onRemoveFromCart, onUpdateQuantity, onNext }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Frames');
  const [viewProduct, setViewProduct] = useState(null);

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

  const totalAmount = cart.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0);

  return (
    <div className="grid grid-cols-12 gap-6 items-start font-sans">
      {/* Left Side: Product Catalog */}
      <div className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-6">
        {/* Search and Filter Toggles */}
        <div className="flex flex-col gap-4">
          <ProductSearch value={searchTerm} onChange={setSearchTerm} placeholder="Search optical products..." />
          <ProductFilter activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
        </div>

        {/* Product Cards Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
              <Glasses className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No products found</h3>
            <p className="text-slate-500 text-sm">Try adjusting your filters or search keywords.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => {
              const status = getStatus(product.available_quantity, product.reorder_level);
              const config = getCategoryConfig(product.category);
              const grad = GRAD_PALETTE[product.id % GRAD_PALETTE.length];
              const sc = statusConfig[status];

              return (
                <div
                  key={product.id}
                  onClick={() => setViewProduct(product)}
                  className="bg-white rounded-2xl border border-slate-150 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group overflow-hidden flex flex-col cursor-pointer"
                >
                  <div className="relative h-40 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
                    {product.image ? (
                      <img src={product.image} alt={product.product_name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                        <span className="text-xl font-black text-white">{product.product_name[0]}</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sc.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {status}
                      </span>
                    </div>
                    <div className="absolute bottom-3 right-3">
                      <span className="bg-white/95 px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-sm border border-slate-100 text-slate-700">
                        Stock: {product.available_quantity}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-1 gap-1.5">
                    <span className={`self-start inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-extrabold border ${config.badge}`}>
                      {product.subcategory}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-emerald-600 transition-colors">
                      {product.product_name}
                    </h3>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span className="font-semibold">{product.brand}</span>
                      <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{product.sku}</span>
                    </div>
                    <div className="border-t border-slate-50 mt-auto pt-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">₹{product.selling_price.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Side: Cart Summary Panel */}
      <div className="col-span-12 lg:col-span-4 xl:col-span-3 lg:sticky lg:top-6">
        <div className="bg-white border border-slate-150 rounded-2xl shadow-xl flex flex-col max-h-[calc(100vh-180px)] overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5 bg-slate-50 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-850 uppercase tracking-wider">Order Cart</h3>
              <p className="text-[10px] text-slate-400 font-semibold">{cart.length} item(s) selected</p>
            </div>
          </div>

          {/* List of items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] hide-scrollbar">
            {cart.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4">
                <ShoppingBag className="w-8 h-8 text-slate-350 mb-2" />
                <p className="text-xs font-bold text-slate-500">Cart is empty</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Click products to customize and add them here.</p>
              </div>
            ) : (
              cart.map((item, index) => {
                const grad = GRAD_PALETTE[item.product.id % GRAD_PALETTE.length];
                return (
                  <div key={index} className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                    {/* Img */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-white flex items-center justify-center flex-shrink-0">
                      {item.product.image ? (
                        <img src={item.product.image} alt={item.product.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-[10px]`}>
                          {item.product.product_name[0]}
                        </div>
                      )}
                    </div>
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.product.product_name}</p>
                      <p className="text-[9px] text-slate-400 truncate">
                        {item.selectedColor && `${item.selectedColor}`} {item.selectedSize && `· Size ${item.selectedSize}`}
                      </p>
                      <div className="flex items-center justify-between text-xs font-black text-slate-900 mt-1">
                        <span>₹{item.product.selling_price.toLocaleString('en-IN')}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">Qty: {item.quantity}</span>
                      </div>
                    </div>
                    {/* Delete */}
                    <button
                      onClick={() => onRemoveFromCart(item.product.id, item.selectedColor, item.selectedSize)}
                      className="text-slate-400 hover:text-red-500 p-1"
                      type="button"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Subtotal & Next trigger */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex-shrink-0 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Subtotal</span>
              <span className="text-sm text-slate-900 font-black">₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
            <button
              onClick={onNext}
              disabled={cart.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#0A0F1F] hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              type="button"
            >
              Continue to Customer Details
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Product Customizer Detail Modal */}
      {viewProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
          <div className="relative bg-white w-full sm:max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] border border-slate-150 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{viewProduct.brand}</span>
              <button
                onClick={() => setViewProduct(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-5 sm:p-6 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <ProductGallery product={viewProduct} />
                </div>
                <div>
                  <ProductDetailComp
                    product={viewProduct}
                    isSelectionMode={true}
                    onAddToCart={(qty, color, size) => {
                      onAddToCart(viewProduct, qty, color, size);
                      setViewProduct(null);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSelectionStep;
