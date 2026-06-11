import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, ShoppingCart, Package, Tag, Layers, Star,
  ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, XCircle,
  Store, Truck, Shield,
} from 'lucide-react';

/* ── gradient palette for placeholder images ── */
const GRAD_PALETTE = [
  'from-blue-400 to-indigo-600',
  'from-emerald-400 to-teal-600',
  'from-purple-400 to-violet-600',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-600',
  'from-cyan-400 to-sky-600',
];

const VARIANT_GRADS = [
  'from-slate-300 to-slate-500',
  'from-zinc-400 to-stone-600',
  'from-neutral-300 to-neutral-600',
];

const statusConfig = {
  'in_stock':     { label: 'In Stock',     color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle },
  'low_stock':    { label: 'Low Stock',    color: 'text-amber-700 bg-amber-50 border-amber-200',       dot: 'bg-amber-500',   icon: AlertTriangle },
  'out_of_stock': { label: 'Out of Stock', color: 'text-red-700 bg-red-50 border-red-200',             dot: 'bg-red-500',     icon: XCircle },
};

const getStockStatus = (item) => {
  const qty = item.available_quantity ?? item.quantity ?? 0;
  if (qty === 0) return 'out_of_stock';
  const threshold = (item.reorder_level && item.reorder_level > 0)
    ? item.reorder_level
    : 10;
  if (qty <= threshold) return 'low_stock';
  return 'in_stock';
};

const categoryLabel = { frames: 'Frames', lenses: 'Lenses', other: 'Other Products' };

/* ── Slide-in image carousel ── */
const ImageCarousel = ({ item }) => {
  const [active, setActive] = useState(0);
  const grad = GRAD_PALETTE[item.id % GRAD_PALETTE.length];

  /* Build "images": real image + 3 colour variant placeholders */
  const slides = item.image
    ? [{ type: 'real', src: item.image }, ...VARIANT_GRADS.map(g => ({ type: 'grad', grad: g }))]
    : [{ type: 'grad', grad }, ...VARIANT_GRADS.map(g => ({ type: 'grad', grad: g }))];

  const prev = () => setActive(i => (i - 1 + slides.length) % slides.length);
  const next = () => setActive(i => (i + 1) % slides.length);

  return (
    <div className="relative select-none">
      {/* Main image */}
      <div className="relative h-56 sm:h-64 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl overflow-hidden flex items-center justify-center">
        {slides[active].type === 'real' ? (
          <img src={slides[active].src} alt={item.product_name} className="w-full h-full object-contain" />
        ) : (
          <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${slides[active].grad} flex items-center justify-center shadow-xl`}>
            <span className="text-4xl font-black text-white">{item.product_name[0]}</span>
          </div>
        )}

        {/* Arrows */}
        {slides.length > 1 && (
          <>
            <button onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center text-slate-600 hover:bg-white transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center text-slate-600 hover:bg-white transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Slide counter */}
        <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-black/40 backdrop-blur-sm rounded-full text-[10px] text-white font-bold">
          {active + 1} / {slides.length}
        </div>
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-2 mt-3">
        {slides.map((slide, i) => (
          <button key={i} onClick={() => setActive(i)}
            className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
              active === i ? 'border-emerald-500 shadow-md scale-105' : 'border-slate-200 opacity-60 hover:opacity-100'
            }`}>
            {slide.type === 'real' ? (
              <img src={slide.src} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${slide.grad} flex items-center justify-center`}>
                <span className="text-xs font-black text-white">{item.product_name[0]}</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ── Main modal ── */
const ProductViewModal = ({ item, onClose, onPlaceOrder }) => {
  if (!item) return null;

  const status = getStockStatus(item);
  const sc = statusConfig[status] || statusConfig['in_stock'];

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[999] p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col border border-slate-100 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Product Preview</p>
            <h2 className="text-base font-bold text-slate-900 truncate">{item.product_name}</h2>
          </div>
          <button onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-colors flex-shrink-0 ml-3">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 hide-scrollbar px-5 py-5 space-y-5">

          {/* Image carousel */}
          <ImageCarousel item={item} />

          {/* Name + Status */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-900 leading-tight">{item.product_name}</h3>
              <p className="text-sm font-semibold text-slate-500 mt-0.5">{item.brand}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border flex-shrink-0 ${sc.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
              {sc.label}
            </span>
          </div>

          {/* Price */}
          <div className="flex items-end gap-3 py-3 px-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
            <div>
              <p className="text-xs text-slate-500 font-semibold mb-0.5">Selling Price</p>
              <p className="text-3xl font-black text-emerald-700">₹{Number(item.selling_price).toLocaleString()}</p>
            </div>
            {item.cost_price && (
              <div className="pb-1">
                <p className="text-xs text-slate-400 font-medium line-through">MRP ₹{Number(item.cost_price).toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Layers,  label: 'Category',       value: categoryLabel[item.category] || item.category },
              { icon: Tag,     label: 'Product Type',    value: item.subcategory },
              { icon: Package, label: 'Available Stock', value: `${item.quantity} units` },
              { icon: Store,   label: 'Store',           value: item.store || '—' },
            ].map(info => (
              <div key={info.label} className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="p-1.5 bg-white rounded-lg border border-slate-100 flex-shrink-0">
                  <info.icon className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{info.label}</p>
                  <p className="text-xs font-bold text-slate-800 truncate mt-0.5">{info.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* SKU + Supplier + Discount + Warranty */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-mono font-semibold">
              <Package className="w-3 h-3" />
              {item.sku}
            </span>
            {item.supplier && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">
                <Truck className="w-3 h-3" />
                {item.supplier}
              </span>
            )}
            {Number(item.discount_percent) > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold border border-rose-100">
                <Tag className="w-3 h-3" />
                {item.discount_percent}% Off
              </span>
            )}
            {Number(item.warranty_months) > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold border border-blue-100">
                <Shield className="w-3 h-3" />
                {item.warranty_months} Months Warranty
              </span>
            )}
          </div>

          {/* Description */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</p>
            <p className="text-sm text-slate-700 leading-relaxed">
              {item.description ||
                `${item.product_name} by ${item.brand} — a premium ${item.subcategory?.toLowerCase() || item.category} product. Available at ${item.store}. SKU: ${item.sku}.`}
            </p>
          </div>

          {/* Rating (decorative) */}
          <div className="flex items-center gap-2">
            <div className="flex">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`w-4 h-4 ${s <= 4 ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} />
              ))}
            </div>
            <span className="text-xs text-slate-500 font-medium">4.0 · Premium Quality</span>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0 flex flex-col sm:flex-row gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-semibold text-sm transition-all">
            Close
          </button>
          <button
            onClick={() => onPlaceOrder(item)}
            disabled={status === 'out_of_stock'}
            className="flex-[2] py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            {status === 'out_of_stock' ? 'Out of Stock' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProductViewModal;
