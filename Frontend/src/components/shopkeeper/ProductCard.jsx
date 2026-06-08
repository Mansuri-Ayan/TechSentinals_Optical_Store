import { Eye, Glasses } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const getCategoryConfig = (name) => {
  const normalized = (name || '').toLowerCase();
  if (normalized.includes('frame')) {
    return {
      icon: Glasses,
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }
  return {
    icon: Eye,
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
};

const statusConfig = {
  'In Stock':     { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  'Low Stock':    { color: 'text-amber-700 bg-amber-50 border-amber-200',       dot: 'bg-amber-500' },
  'Out Of Stock': { color: 'text-red-700 bg-red-50 border-red-200',             dot: 'bg-red-500' },
};

const GRAD_PALETTE = [
  'from-blue-400 to-indigo-600',
  'from-emerald-400 to-teal-600',
  'from-purple-400 to-violet-600',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-600',
  'from-cyan-400 to-sky-600',
];

const getStatus = (qty, reorder) => {
  if (qty === 0) return 'Out Of Stock';
  if (qty <= reorder) return 'Low Stock';
  return 'In Stock';
};

const StatusBadge = ({ status }) => {
  const sc = statusConfig[status] || statusConfig['In Stock'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sc.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} flex-shrink-0`} />
      {status}
    </span>
  );
};

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const status = getStatus(product.available_quantity, product.reorder_level);
  const config = getCategoryConfig(product.category);
  const grad = GRAD_PALETTE[product.id % GRAD_PALETTE.length];

  const handleClick = () => {
    navigate(`/shopkeeper/products/${product.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group overflow-hidden flex flex-col cursor-pointer"
    >
      {/* Product Image Box */}
      <div className="relative h-40 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
        {product.image ? (
          <img src={product.image} alt={product.product_name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110`}>
            <span className="text-xl font-black text-white">{(product.product_name || 'P')[0]}</span>
          </div>
        )}

        {/* Status Badge top-left */}
        <div className="absolute top-3 left-3">
          <StatusBadge status={status} />
        </div>

        {/* Qty Badge bottom-right */}
        <div className="absolute bottom-3 right-3">
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-sm border border-white/50 ${
            product.available_quantity === 0 ? 'bg-red-100 text-red-700' :
            product.available_quantity <= product.reorder_level ? 'bg-amber-100 text-amber-700' :
            'bg-white/90 text-slate-700'
          }`}>
            Qty: {product.available_quantity}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex flex-col flex-1 gap-1.5">
        <span className={`self-start inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-extrabold border ${config.badge}`}>
          {product.subcategory}
        </span>

        <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-emerald-600 transition-colors">
          {product.product_name}
        </h3>

        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
          <span className="font-semibold">{product.brand}</span>
          <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{product.sku}</span>
        </div>

        <div className="border-t border-slate-50 mt-auto pt-2 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900">₹{product.selling_price.toLocaleString('en-IN')}</span>
          <span className="text-[10px] font-medium text-slate-400">{product.category}</span>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
