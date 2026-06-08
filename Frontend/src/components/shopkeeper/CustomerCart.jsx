import { ShoppingCart, ArrowRight } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import CartItem from './CartItem';

const CustomerCart = ({ onDone }) => {
  const { cart, removeFromCart, updateQuantity } = useCartStore();

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.product.selling_price * item.quantity,
    0
  );

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-xl flex flex-col h-full overflow-hidden">
      {/* Cart Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5 bg-slate-50 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <ShoppingCart className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-slate-800">Customer Cart</h3>
          <p className="text-[10px] text-slate-400 font-semibold">
            {cart.length} item{cart.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 hide-scrollbar">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
              <ShoppingCart className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-xs font-bold text-slate-500">Cart is empty</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Select frames or lenses to add to this cart.</p>
          </div>
        ) : (
          cart.map((item, index) => (
            <CartItem
              key={`${item.product.id}-${item.selectedColor}-${item.selectedSize}-${index}`}
              item={item}
              onRemove={removeFromCart}
              onQtyChange={updateQuantity}
            />
          ))
        )}
      </div>

      {/* Cart Summary & Done Action */}
      <div className="p-4 border-t border-slate-100 bg-slate-50 flex-shrink-0 space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
          <span>Subtotal</span>
          <span className="text-sm text-slate-900 font-black">₹{totalAmount.toLocaleString('en-IN')}</span>
        </div>

        <button
          onClick={onDone}
          disabled={cart.length === 0}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#0A0F1F] hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          type="button"
        >
          Done Selection
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default CustomerCart;
