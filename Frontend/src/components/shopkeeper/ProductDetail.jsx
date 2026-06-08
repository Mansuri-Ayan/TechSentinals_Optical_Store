import { useState } from 'react';
import { Tag, CheckCircle2, AlertTriangle, AlertCircle, ShoppingCart } from 'lucide-react';

const statusConfig = {
  'In Stock':     { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  'Low Stock':    { color: 'text-amber-700 bg-amber-50 border-amber-200',       icon: AlertTriangle },
  'Out Of Stock': { color: 'text-red-700 bg-red-50 border-red-200',             icon: AlertCircle },
};

const getStatus = (qty, reorder) => {
  if (qty === 0) return 'Out Of Stock';
  if (qty <= reorder) return 'Low Stock';
  return 'In Stock';
};

const ProductDetail = ({ product, onAddToCart, isSelectionMode }) => {
  const status = getStatus(product.available_quantity, product.reorder_level);
  const StatusIcon = (statusConfig[status] || statusConfig['In Stock']).icon;
  const statusColor = (statusConfig[status] || statusConfig['In Stock']).color;

  const [qty, setQty] = useState(1);
  const [selectedColor, setSelectedColor] = useState(product.availableColors?.[0] || '');
  const [selectedSize, setSelectedSize] = useState(product.availableSizes?.[0] || '');

  const handleAdd = () => {
    onAddToCart(qty, selectedColor, selectedSize);
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-6 font-sans">
      {/* Brand & Category */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{product.brand}</span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mt-1">{product.product_name}</h1>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${statusColor}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {status}
        </span>
      </div>

      {/* Pricing and SKU */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-4 rounded-2xl">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Selling Price</p>
          <p className="text-2xl font-black text-slate-900 mt-0.5">₹{product.selling_price.toLocaleString('en-IN')}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Product Code (SKU)</p>
          <p className="text-xs font-mono font-bold text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded-lg mt-1 inline-block">{product.sku}</p>
        </div>
      </div>

      {/* Description */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</h3>
        <p className="text-slate-600 text-sm leading-relaxed font-medium">{product.description}</p>
      </div>

      {/* Features */}
      {product.features && product.features.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Key Features</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
            {product.features.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Selectors Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
        {/* Colors Selector */}
        {product.availableColors && product.availableColors.length > 0 && (
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Select Color</label>
            <div className="flex flex-wrap gap-2">
              {product.availableColors.map((color) => {
                const isSelected = color === selectedColor;
                return (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      isSelected
                        ? 'bg-slate-950 text-white border-slate-950 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-350'
                    }`}
                    type="button"
                  >
                    {color}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sizes Selector */}
        {product.availableSizes && product.availableSizes.length > 0 && (
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Select Size</label>
            <div className="flex flex-wrap gap-2">
              {product.availableSizes.map((size) => {
                const isSelected = size === selectedSize;
                return (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      isSelected
                        ? 'bg-slate-950 text-white border-slate-950 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-350'
                    }`}
                    type="button"
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Quantity & Buy controls */}
      <div className="flex items-center gap-4 border-t border-slate-100 pt-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500">Quantity</label>
          <div className="flex items-center border border-slate-200 rounded-xl p-1 bg-white">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              disabled={qty <= 1 || status === 'Out Of Stock'}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30 transition-colors font-extrabold"
              type="button"
            >
              -
            </button>
            <span className="w-8 text-center text-sm font-black text-slate-800">{qty}</span>
            <button
              onClick={() => setQty(Math.min(product.available_quantity, qty + 1))}
              disabled={qty >= product.available_quantity || status === 'Out Of Stock'}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30 transition-colors font-extrabold"
              type="button"
            >
              +
            </button>
          </div>
        </div>

        {/* Add To Cart Button for Detail page inline */}
        {isSelectionMode && (
          <div className="flex-1 flex flex-col justify-end pt-5">
            <button
              onClick={handleAdd}
              disabled={status === 'Out Of Stock'}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#0A0F1F] hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              type="button"
            >
              <ShoppingCart className="w-4 h-4" />
              Add To Cart
            </button>
          </div>
        )}
      </div>

      {/* Extra details list */}
      <div className="border-t border-slate-100 pt-4 text-xs font-semibold text-slate-400 space-y-1.5">
        <div className="flex justify-between"><span>Product Type:</span><span className="text-slate-600">{product.category} ({product.subcategory})</span></div>
        <div className="flex justify-between"><span>Availability:</span><span className="text-slate-600">{product.available_quantity} units in stock</span></div>
      </div>
    </div>
  );
};

export default ProductDetail;
