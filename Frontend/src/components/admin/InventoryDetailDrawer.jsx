import { createPortal } from 'react-dom';
import {
  X, Package, Tag, Truck, BarChart3, DollarSign,
  Store, CheckCircle, AlertTriangle, XCircle, Image as ImageIcon, Sliders,
} from 'lucide-react';

const statusConfig = {
  'In Stock':    { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle },
  'Low Stock':   { color: 'text-amber-700 bg-amber-50 border-amber-200',       dot: 'bg-amber-500',   icon: AlertTriangle },
  'Out of Stock':{ color: 'text-red-700 bg-red-50 border-red-200',             dot: 'bg-red-500',     icon: XCircle },
};

const categoryLabel = { frames: 'Frames', lenses: 'Lenses', other: 'Other Products' };

const DetailRow = ({ label, value, mono }) => (
  <div className="flex items-start justify-between py-2.5 border-b border-slate-50 last:border-0">
    <span className="text-sm text-slate-500 font-medium shrink-0 pr-4">{label}</span>
    <span className={`text-sm font-semibold text-slate-900 text-right ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
  </div>
);

const Section = ({ icon: Icon, title, children, color = 'emerald' }) => {
  const colours = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600',
    blue:    'bg-blue-500/10 border-blue-500/20 text-blue-600',
    purple:  'bg-purple-500/10 border-purple-500/20 text-purple-600',
    amber:   'bg-amber-500/10 border-amber-500/20 text-amber-600',
    rose:    'bg-rose-500/10 border-rose-500/20 text-rose-600',
    slate:   'bg-slate-500/10 border-slate-500/20 text-slate-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-50">
        <div className={`p-2 rounded-xl border ${colours[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      </div>
      <div className="px-5 pt-1 pb-2">{children}</div>
    </div>
  );
};

const InventoryDetailDrawer = ({ item, onClose }) => {
  if (!item) return null;

  const status = item.status || 'In Stock';
  const sc = statusConfig[status] || statusConfig['In Stock'];
  const profit = item.selling_price && item.cost_price
    ? (Number(item.selling_price) - Number(item.cost_price)).toFixed(2)
    : null;
  const margin = profit && item.selling_price
    ? ((profit / item.selling_price) * 100).toFixed(1)
    : null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex justify-end animate-fade-in">
      {/* Click-outside close */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      {/* Drawer panel */}
      <div className="relative w-full max-w-md h-full bg-slate-50 shadow-2xl flex flex-col animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {item.image
                ? <img src={item.image} alt={item.product_name} className="w-full h-full object-cover" />
                : <Package className="w-5 h-5 text-slate-400" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate">{item.product_name}</h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{item.sku}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors flex-shrink-0 ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status badge */}
        <div className="px-5 py-3 bg-white border-b border-slate-100 flex-shrink-0">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${sc.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            {status}
          </span>
          <span className="ml-2 text-xs text-slate-400 font-medium">{categoryLabel[item.category] || item.category}</span>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-4 space-y-3">

          <Section icon={Package} title="Product Information" color="emerald">
            <DetailRow label="Product Name" value={item.product_name} />
            <DetailRow label="SKU"          value={item.sku}          mono />
            <DetailRow label="Category"     value={categoryLabel[item.category] || item.category} />
            {item.subcategory && <DetailRow label="Subcategory" value={item.subcategory} />}
            {item.description && <DetailRow label="Description" value={item.description} />}
          </Section>

          {/* Frame Specifications */}
          {item.frame_product && (
            <Section icon={Sliders} title="Frame Specifications" color="blue">
              <DetailRow label="Frame Type" value={item.frame_product.frame_type} />
              <DetailRow label="Shape" value={item.frame_product.shape} />
              <DetailRow label="Material" value={item.frame_product.material} />
              <DetailRow label="Color" value={item.frame_product.color} />
              <DetailRow label="Lens Width" value={item.frame_product.lens_width ? `${item.frame_product.lens_width} mm` : null} />
              <DetailRow label="Bridge Width" value={item.frame_product.bridge_width ? `${item.frame_product.bridge_width} mm` : null} />
              <DetailRow label="Temple Length" value={item.frame_product.temple_length ? `${item.frame_product.temple_length} mm` : null} />
              <DetailRow label="Gender" value={item.frame_product.gender} />
              <DetailRow label="Age Group" value={item.frame_product.age_group} />
            </Section>
          )}

          {/* Lens Specifications */}
          {item.lens_product && (
            <Section icon={Sliders} title="Lens Specifications" color="blue">
              <DetailRow label="Lens Type" value={item.lens_product.lens_type} />
              <DetailRow label="Material" value={item.lens_product.material} />
              <DetailRow label="Index Value" value={item.lens_product.index_value} />
              <DetailRow label="Coating" value={item.lens_product.coating} />
              <DetailRow label="Tint Color" value={item.lens_product.tint_color} />
              <DetailRow label="UV Protection" value={item.lens_product.uv_protection} />
              <DetailRow label="Blue Cut" value={item.lens_product.blue_cut} />
              <DetailRow label="Photochromic" value={item.lens_product.photochromic} />
              <DetailRow label="Polarized" value={item.lens_product.polarized} />
            </Section>
          )}

          {/* Accessory Specifications */}
          {item.accessory_product && (
            <Section icon={Sliders} title="Accessory Specifications" color="blue">
              <DetailRow label="Accessory Type" value={item.accessory_product.accessory_type} />
              <DetailRow label="Material" value={item.accessory_product.material} />
              <DetailRow label="Color" value={item.accessory_product.color} />
              <DetailRow label="Size" value={item.accessory_product.size} />
            </Section>
          )}

          <Section icon={Tag} title="Brand Information" color="blue">
            <DetailRow label="Brand" value={item.brand} />
          </Section>

          <Section icon={Truck} title="Supplier Information" color="purple">
            <DetailRow label="Supplier" value={item.supplier} />
          </Section>

          <Section icon={BarChart3} title="Stock Details" color="amber">
            <DetailRow label="Quantity"      value={item.quantity} />
            <DetailRow label="Reorder Level" value={item.reorder_level} />
            <DetailRow label="Status"        value={status} />
          </Section>

          <Section icon={DollarSign} title="Pricing Details" color="rose">
            <DetailRow label="Cost Price"    value={item.cost_price    ? `₹${Number(item.cost_price).toLocaleString()}`    : null} />
            <DetailRow label="Selling Price" value={item.selling_price ? `₹${Number(item.selling_price).toLocaleString()}` : null} />
            {profit !== null && <DetailRow label="Gross Profit" value={`₹${Number(profit).toLocaleString()}`} />}
            {margin !== null && <DetailRow label="Margin"       value={`${margin}%`} />}
          </Section>

          {item.store && (
            <Section icon={Store} title="Store Information" color="slate">
              <DetailRow label="Store" value={item.store} />
            </Section>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-white border-t border-slate-100 flex-shrink-0">
          <button onClick={onClose}
            className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-700 transition-all shadow-md hover:shadow-lg">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InventoryDetailDrawer;
