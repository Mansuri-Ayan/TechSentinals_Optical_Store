import { useState, useMemo, useEffect, useCallback } from 'react';
import { ShoppingBag, ArrowRight, ArrowLeft, X, Glasses, Eye, Trash2, Minus, Plus } from 'lucide-react';
import { useAuthStore, useStoreStore } from '../../store/store';
import { useInventory } from '../../hooks/useInventory';
import { useCategories, useSubcategories } from '../../hooks/useCategories';
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
  'Out Of Stock': { color: 'text-red-700 bg-red-50 border-red-200',             dot: 'bg-red-505' },
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

const ProductSelectionStep = ({
  cart,
  onAddToCart,
  onRemoveFromCart,
  onUpdateQuantity,
  onBack,
  onNext,
}) => {
  const { user } = useAuthStore();
  const { selectedStore } = useStoreStore();
  const storeId = user?.role === 'admin' ? selectedStore?.id : user?.store_id;

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubcategory, setActiveSubcategory] = useState('all');
  const [viewProduct, setViewProduct] = useState(null);
  const [showCartModal, setShowCartModal] = useState(false);

  // Draggable cart button state and logic
  const [btnPos, setBtnPos] = useState(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth - 80 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 - 28 : 0,
  }));
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [clickStartPos, setClickStartPos] = useState({ x: 0, y: 0 });

  const { kpiItems, isLoading } = useInventory(storeId);

  const { categories } = useCategories(null, { paginate: false });

  const activeCategoryObj = useMemo(() => {
    return (categories || []).find((c) => c.name === activeCategory);
  }, [categories, activeCategory]);

  const { subcategories } = useSubcategories(activeCategoryObj?.id, null, { paginate: false });

  const products = useMemo(() => {
    return (kpiItems || []).map((item) => {
      let availableColors;
      let availableSizes;
      let features;

      if (item.category_name === 'Frames') {
        const fp = item.frame_product;
        if (fp && fp.color) {
          availableColors = [fp.color];
        } else {
          availableColors = ['Classic Black', 'Matte Black', 'Gold', 'Silver'];
        }
        if (fp && fp.lens_width) {
          availableSizes = [`${fp.lens_width}-${fp.bridge_width}-${fp.temple_length}`, 'Standard'];
        } else {
          availableSizes = ['Small', 'Medium', 'Large'];
        }
        features = [
          fp?.material ? `Material: ${fp.material}` : 'Premium Build',
          fp?.shape ? `Shape: ${fp.shape}` : 'Trendy Shape',
          fp?.frame_type ? `Type: ${fp.frame_type}` : 'Durable Frame',
        ];
      } else if (item.category_name === 'Lenses') {
        const lp = item.lens_product;
        if (lp && lp.tint_color) {
          availableColors = [lp.tint_color];
        } else {
          availableColors = ['Clear'];
        }
        if (lp && lp.index_value) {
          availableSizes = [lp.index_value];
        } else {
          availableSizes = ['Standard (1.5)', 'Thin (1.6)'];
        }
        features = [
          lp?.lens_type ? `Type: ${lp.lens_type}` : 'Precision Optics',
          lp?.coating ? `Coating: ${lp.coating}` : 'Anti-Reflective',
          lp?.material ? `Material: ${lp.material}` : 'High Clarity',
        ];
      } else if (item.category_name === 'Accessories') {
        const ap = item.accessory_product;
        if (ap && ap.color) {
          availableColors = [ap.color];
        } else {
          availableColors = ['Default'];
        }
        if (ap && ap.size) {
          availableSizes = [ap.size];
        } else {
          availableSizes = ['Standard'];
        }
        features = [
          ap?.accessory_type ? `Type: ${ap.accessory_type}` : 'Useful Accessory',
          ap?.material ? `Material: ${ap.material}` : 'Premium Material',
        ];
      } else {
        availableColors = ['Default'];
        availableSizes = ['Standard'];
        features = ['High Quality'];
      }

      return {
        id: item.product_id,
        inventory_id: item.id,
        product_name: item.product_name,
        brand: item.brand_name || 'Generic',
        category: item.category_name,
        category_id: item.category_id || null,
        subcategory: item.subcategory_name || 'Standard',
        sku: item.product_sku,
        selling_price: Number(item.selling_price) || 0,
        available_quantity: item.available_quantity || 0,
        reorder_level: item.reorder_level || 0,
        description: item.product_description || 'No description available.',
        features,
        availableColors,
        availableSizes,
        image: item.image_url,
      };
    });
  }, [kpiItems]);

  // Clamping positioning when resizing or zooming
  useEffect(() => {
    const handleResize = () => {
      setBtnPos((prev) => {
        const padding = 20;
        const newX = Math.max(padding, Math.min(window.innerWidth - 80, prev.x));
        const newY = Math.max(padding, Math.min(window.innerHeight - 80, prev.y));
        return { x: newX, y: newY };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleStart = useCallback((clientX, clientY) => {
    setDragStart({ x: clientX - btnPos.x, y: clientY - btnPos.y });
    setClickStartPos({ x: clientX, y: clientY });
    setDragging(true);
  }, [btnPos]);

  const handleMove = useCallback((clientX, clientY) => {
    if (!dragging) return;
    const padding = 20;
    let newX = clientX - dragStart.x;
    let newY = clientY - dragStart.y;

    // Boundary check
    newX = Math.max(padding, Math.min(window.innerWidth - 80, newX));
    newY = Math.max(padding, Math.min(window.innerHeight - 80, newY));

    setBtnPos({ x: newX, y: newY });
  }, [dragging, dragStart]);

  const handleEnd = useCallback((clientX, clientY) => {
    if (!dragging) return;
    setDragging(false);

    // If movement is very small, treat as a click to open cart
    const distance = Math.sqrt(
      Math.pow(clientX - clickStartPos.x, 2) + Math.pow(clientY - clickStartPos.y, 2)
    );
    if (distance < 6) {
      setShowCartModal(true);
    }
  }, [dragging, clickStartPos]);

  // Drag listeners registered to window to handle quick movements
  useEffect(() => {
    if (!dragging) return;

    const onMouseMove = (e) => {
      handleMove(e.clientX, e.clientY);
    };

    const onMouseUp = (e) => {
      handleEnd(e.clientX, e.clientY);
    };

    const onTouchMove = (e) => {
      if (e.touches && e.touches[0]) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchEnd = (e) => {
      if (e.changedTouches && e.changedTouches[0]) {
        handleEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      } else {
        setDragging(false);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [dragging, handleMove, handleEnd]);

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setActiveSubcategory('all');
  };

  // Filter items based on active category, subcategory, and search text
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
      const matchesSubcategory = activeSubcategory === 'all' || product.subcategory === activeSubcategory;
      const q = searchTerm.toLowerCase().trim();
      if (!q) return matchesCategory && matchesSubcategory;

      const matchesSearch =
        product.product_name.toLowerCase().includes(q) ||
        product.brand.toLowerCase().includes(q) ||
        product.subcategory.toLowerCase().includes(q) ||
        product.sku.toLowerCase().includes(q);

      return matchesCategory && matchesSubcategory && matchesSearch;
    });
  }, [products, activeCategory, activeSubcategory, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900 mb-4"></div>
        <p className="text-slate-500 font-semibold text-sm">Loading store inventory...</p>
      </div>
    );
  }

  const totalAmount = cart.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0);
  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-6 font-sans">
      {/* ── Control Bar ── */}
      <div className="flex items-center justify-start bg-white p-4 rounded-2xl border border-slate-105 shadow-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer shadow-sm w-full sm:w-auto justify-center"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Prescription
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <ProductSearch value={searchTerm} onChange={setSearchTerm} placeholder="Search optical products..." />
        <ProductFilter categories={categories} activeCategory={activeCategory} onCategoryChange={handleCategoryChange} />
        
        {/* ── Subcategory Tabs ── */}
        {activeCategory !== 'all' && subcategories && subcategories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 text-xs">
            <button
              onClick={() => setActiveSubcategory('all')}
              className={`px-3.5 py-2 rounded-xl font-bold border transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
                activeSubcategory === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Subcategories
            </button>
            {subcategories.map((sub) => {
              const isActive = activeSubcategory === sub.name;
              return (
                <button
                  key={sub.id}
                  onClick={() => setActiveSubcategory(sub.name)}
                  className={`px-3.5 py-2 rounded-xl font-bold border transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {sub.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Results summary */}
      {searchTerm && (
        <p className="text-xs text-slate-400 font-bold px-1">
          {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found for "{searchTerm}"
        </p>
      )}

      {/* Product Grid - Full Width */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <Glasses className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No products found</h3>
          <p className="text-slate-500 text-sm">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
                    <img src={product.image} alt={product.product_name} className="w-full h-full object-cover transition-transform duration-305 group-hover:scale-105" />
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

      {/* ── Product Customizer Modal ── */}
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

      {/* ── Cart Popover Modal ── */}
      {showCartModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1200] flex items-center justify-center p-4 animate-fade-in">
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[80vh] border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Order Cart</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">{cart.length} unique item(s) selected</p>
                </div>
              </div>
              <button
                onClick={() => setShowCartModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-750 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] hide-scrollbar">
              {cart.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center p-4">
                  <ShoppingBag className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-500">Cart is empty</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Click products in catalog to configure and add them.</p>
                </div>
              ) : (
                cart.map((item, index) => {
                  const grad = GRAD_PALETTE[item.product.id % GRAD_PALETTE.length];
                  return (
                    <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      {/* Product Avatar */}
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
                        <p className="text-xs font-black text-slate-900 mt-1">₹{item.product.selling_price.toLocaleString('en-IN')}</p>
                      </div>

                      {/* Quantity Editor Inline */}
                      <div className="flex items-center border border-slate-200 bg-white rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.quantity > 1) {
                              onUpdateQuantity(item.product.id, item.selectedColor, item.selectedSize, item.quantity - 1);
                            } else {
                              onRemoveFromCart(item.product.id, item.selectedColor, item.selectedSize);
                            }
                          }}
                          className="px-2 py-1 text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-slate-800">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.product.id, item.selectedColor, item.selectedSize, item.quantity + 1)}
                          className="px-2 py-1 text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => onRemoveFromCart(item.product.id, item.selectedColor, item.selectedSize)}
                        className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-all"
                        type="button"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex-shrink-0 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Subtotal</span>
                <span className="text-sm text-slate-900 font-black">₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCartModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                  type="button"
                >
                  Continue Shopping
                </button>
                <button
                  onClick={() => {
                    setShowCartModal(false);
                    onNext();
                  }}
                  disabled={cart.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#0A0F1F] hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  type="button"
                >
                  Checkout
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating View Cart Button (Icon Only, Stable & Draggable) */}
      <button
        onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          if (e.touches && e.touches[0]) {
            handleStart(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        style={{ left: `${btnPos.x}px`, top: `${btnPos.y}px` }}
        className="fixed z-45 w-14 h-14 rounded-full bg-[#0A0F1F] hover:bg-slate-800 text-white shadow-2xl flex items-center justify-center border border-white/10 group cursor-grab active:cursor-grabbing select-none"
        type="button"
        title={`View Cart (${cartTotalItems})`}
      >
        <ShoppingBag className="w-6 h-6 text-emerald-400" />
        {cartTotalItems > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-emerald-500 text-white text-[11px] rounded-full flex items-center justify-center font-bold border-2 border-white animate-pulse">
            {cartTotalItems}
          </span>
        )}
      </button>

      {/* Floating Payment Button (Stable) */}
      <button
        onClick={onNext}
        disabled={cart.length === 0}
        className="fixed right-6 bottom-6 z-40 flex items-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm uppercase tracking-wider rounded-2xl shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 border border-white/10 cursor-pointer"
        type="button"
      >
        Payment
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ProductSelectionStep;
