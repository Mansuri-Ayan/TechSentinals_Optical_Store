import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ShoppingCart, UserMinus, XCircle } from 'lucide-react';
import { useMemo } from 'react';
import { MOCK_PRODUCTS } from '../../data/productsData';
import { useCartStore } from '../../store/cartStore';
import ProductGallery from '../../components/shopkeeper/ProductGallery';
import ProductDetailComp from '../../components/shopkeeper/ProductDetail';
import CustomerCart from '../../components/shopkeeper/CustomerCart';

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { isSelectionMode, tempCustomerForm, addToCart, cancelSelection, completeSelection } = useCartStore();

  // Find active product
  const product = useMemo(() => {
    return MOCK_PRODUCTS.find((p) => String(p.id) === String(productId));
  }, [productId]);

  const handleDone = () => {
    completeSelection();
    navigate('/shopkeeper/customers');
  };

  const handleCancelSelection = () => {
    cancelSelection();
    navigate('/shopkeeper/products');
  };

  const handleAddToCart = (qty, color, size) => {
    if (!product) return;
    addToCart(product, qty, color, size);
  };

  if (!product) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto text-center font-sans">
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 max-w-md mx-auto">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-1">Product Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">The product you are looking for does not exist or is out of catalog.</p>
          <Link
            to="/shopkeeper/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans relative">
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

      {/* Breadcrumbs */}
      <div className="mb-6">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 space-x-2 flex-wrap">
          <Link to="/shopkeeper/dashboard" className="hover:text-slate-800 transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <Link to="/shopkeeper/products" className="hover:text-slate-800 transition-colors">
            Products
          </Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-semibold truncate max-w-[200px]">{product.product_name}</span>
        </div>
      </div>

      {/* Title & Back Header */}
      <div className="flex items-center gap-4 mb-6 sm:mb-8 pb-6 border-b border-slate-100">
        <button
          onClick={() => navigate('/shopkeeper/products')}
          className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex-shrink-0 cursor-pointer"
          title="Back to products list"
          type="button"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">Product Details</h2>
          <p className="text-slate-500 text-xs mt-0.5">View technical details and catalog specifications</p>
        </div>
      </div>

      {/* Main Grid: Content (Left/Center) + Cart (Right) */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left/Center Areas */}
        <div className={`col-span-12 ${isSelectionMode ? 'lg:col-span-8 xl:col-span-9' : ''} bg-white rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-6 lg:p-8`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Col: Gallery */}
            <div>
              <ProductGallery product={product} />
            </div>

            {/* Right Col: Details */}
            <div>
              <ProductDetailComp
                product={product}
                onAddToCart={handleAddToCart}
                isSelectionMode={isSelectionMode}
              />
            </div>
          </div>
        </div>

        {/* Right Area: Selection Mode Cart Panel */}
        {isSelectionMode && (
          <div className="col-span-12 lg:col-span-4 xl:col-span-3 lg:sticky lg:top-6 h-[calc(100vh-120px)] lg:h-[calc(100vh-150px)]">
            <CustomerCart onDone={handleDone} />
          </div>
        )}
      </div>

      {/* Floating Add To Cart Action Button in Bottom-Right Corner (E-Commerce design requirement) */}
      {isSelectionMode && product.available_quantity > 0 && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <button
            onClick={() => handleAddToCart(1, product.availableColors?.[0] || '', product.availableSizes?.[0] || '')}
            className="flex items-center gap-2.5 px-6 py-4 bg-[#0A0F1F] hover:bg-slate-800 text-white font-extrabold text-sm uppercase tracking-wider rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all border border-white/10"
            type="button"
            title="Quick add 1 unit with default colors/sizes to cart"
          >
            <ShoppingCart className="w-5 h-5 text-emerald-400" />
            Add To Cart
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
