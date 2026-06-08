import { Trash2, Plus, Minus } from 'lucide-react';

const GRAD_PALETTE = [
  'from-blue-400 to-indigo-600',
  'from-emerald-400 to-teal-600',
  'from-purple-400 to-violet-600',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-600',
  'from-cyan-400 to-sky-600',
];

const CartItem = ({ item, onRemove, onQtyChange }) => {
  const { product, quantity, selectedColor, selectedSize } = item;
  const grad = GRAD_PALETTE[product.id % GRAD_PALETTE.length];

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100/50 transition-colors">
      {/* Product Image Fallback */}
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
        {product.image ? (
          <img src={product.image} alt={product.product_name} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-xs`}>
            {product.product_name[0]}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold text-slate-800 truncate" title={product.product_name}>
          {product.product_name}
        </h4>
        <p className="text-[10px] text-slate-400 font-semibold truncate">
          {product.brand} {selectedColor && `· ${selectedColor}`} {selectedSize && `· ${selectedSize}`}
        </p>
        <div className="text-xs font-bold text-slate-900 mt-1">
          ₹{product.selling_price.toLocaleString('en-IN')}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end gap-2">
        {/* Quantity Controls */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-0.5">
          <button
            onClick={() => onQtyChange(product.id, quantity - 1, selectedColor, selectedSize)}
            disabled={quantity <= 1}
            className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 transition-colors"
            type="button"
            aria-label="Decrease quantity"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-5 text-center text-xs font-bold text-slate-700">{quantity}</span>
          <button
            onClick={() => onQtyChange(product.id, quantity + 1, selectedColor, selectedSize)}
            disabled={quantity >= product.available_quantity}
            className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 transition-colors"
            type="button"
            aria-label="Increase quantity"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Remove Button */}
        <button
          onClick={() => onRemove(product.id, selectedColor, selectedSize)}
          className="text-slate-400 hover:text-red-600 transition-colors"
          type="button"
          aria-label="Remove item"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default CartItem;
