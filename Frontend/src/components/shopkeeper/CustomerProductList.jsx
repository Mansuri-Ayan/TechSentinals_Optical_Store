import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';

const GRAD_PALETTE = [
  'from-blue-400 to-indigo-600',
  'from-emerald-400 to-teal-600',
  'from-purple-400 to-violet-600',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-600',
  'from-cyan-400 to-sky-600',
];

const CustomerProductList = () => {
  const { cart, removeFromCart, updateQuantity } = useCartStore();

  if (cart.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 font-sans">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
        <ShoppingBag className="w-3.5 h-3.5" /> Selected Products
      </p>

      {/* Desktop Table View */}
      <div className="hidden sm:block border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm bg-white">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Attributes</th>
              <th className="px-4 py-3 text-center">Quantity</th>
              <th className="px-4 py-3 text-right">Unit Price</th>
              <th className="px-4 py-3 text-right">Total Price</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {cart.map((item, index) => {
              const { product, quantity, selectedColor, selectedSize } = item;
              const grad = GRAD_PALETTE[product.id % GRAD_PALETTE.length];
              const total = product.selling_price * quantity;

              return (
                <tr key={`${product.id}-${selectedColor}-${selectedSize}-${index}`} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* Image Thumbnail */}
                      <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center flex-shrink-0">
                        {product.image ? (
                          <img src={product.image} alt={product.product_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-extrabold text-[10px]`}>
                            {product.product_name[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 line-clamp-1">{product.product_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    <div className="flex flex-col gap-0.5">
                      {selectedColor && <span>Color: <span className="font-bold text-slate-700">{selectedColor}</span></span>}
                      {selectedSize && <span>Size: <span className="font-bold text-slate-700">{selectedSize}</span></span>}
                      {!selectedColor && !selectedSize && <span className="text-slate-300">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                      <button
                        onClick={() => updateQuantity(product.id, quantity - 1, selectedColor, selectedSize)}
                        disabled={quantity <= 1}
                        className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:bg-white disabled:opacity-30 transition-colors"
                        type="button"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="w-5 text-center font-bold text-slate-800">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.id, quantity + 1, selectedColor, selectedSize)}
                        disabled={quantity >= product.available_quantity}
                        className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:bg-white disabled:opacity-30 transition-colors"
                        type="button"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 font-semibold">
                    ₹{product.selling_price.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    ₹{total.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => removeFromCart(product.id, selectedColor, selectedSize)}
                      className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-all"
                      type="button"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="block sm:hidden space-y-2.5">
        {cart.map((item, index) => {
          const { product, quantity, selectedColor, selectedSize } = item;
          const grad = GRAD_PALETTE[product.id % GRAD_PALETTE.length];
          const total = product.selling_price * quantity;

          return (
            <div
              key={`${product.id}-${selectedColor}-${selectedSize}-${index}`}
              className="bg-white border border-slate-200 p-3 rounded-2xl flex flex-col gap-2.5 shadow-sm"
            >
              <div className="flex gap-2.5 items-center">
                {/* Image */}
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100 flex items-center justify-center flex-shrink-0">
                  {product.image ? (
                    <img src={product.image} alt={product.product_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-[10px]`}>
                      {product.product_name[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-xs truncate">{product.product_name}</p>
                  <p className="text-[10px] text-slate-400 font-semibold truncate">
                    {product.brand} {selectedColor && `· ${selectedColor}`} {selectedSize && `· ${selectedSize}`}
                  </p>
                </div>
                <button
                  onClick={() => removeFromCart(product.id, selectedColor, selectedSize)}
                  className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                  type="button"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex justify-between items-center pt-2.5 border-t border-slate-50 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Qty:</span>
                  <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                    <button
                      onClick={() => updateQuantity(product.id, quantity - 1, selectedColor, selectedSize)}
                      disabled={quantity <= 1}
                      className="w-4 h-4 rounded flex items-center justify-center text-slate-500 hover:bg-white disabled:opacity-30"
                      type="button"
                    >
                      -
                    </button>
                    <span className="w-4 text-center font-bold text-slate-800 text-[10px]">{quantity}</span>
                    <button
                      onClick={() => updateQuantity(product.id, quantity + 1, selectedColor, selectedSize)}
                      disabled={quantity >= product.available_quantity}
                      className="w-4 h-4 rounded flex items-center justify-center text-slate-500 hover:bg-white disabled:opacity-30"
                      type="button"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Total</span>
                  <span className="font-black text-slate-900">₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CustomerProductList;
