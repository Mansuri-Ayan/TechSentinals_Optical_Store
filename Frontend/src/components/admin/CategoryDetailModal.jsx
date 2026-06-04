import { createPortal } from 'react-dom';
import { X, Layers, ShoppingCart, Info, Trash2 } from 'lucide-react';
import ProductViewModal from './ProductViewModal';
import InventoryDetailDrawer from './InventoryDetailDrawer';
import { useState } from 'react';

const categoryColor = {
  Frames: { badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  Lenses: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'Other Product': { badge: 'bg-purple-50 text-purple-700 border-purple-200' },
};

const statusConfig = {
  'In Stock': { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  'Low Stock': { color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  'Out of Stock': { color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500' },
};

const GRAD_PALETTE = [
  'from-blue-400 to-indigo-600',
  'from-emerald-400 to-teal-600',
  'from-purple-400 to-violet-600',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-600',
  'from-cyan-400 to-sky-600',
];

const StatusBadge = ({ status }) => {
  const sc = statusConfig[status] || statusConfig['In Stock'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${sc.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} flex-shrink-0`} />
      {status}
    </span>
  );
};

// Extracted ProductCard for Category View
const ProductCard = ({ item, onViewProduct, onViewDetails }) => {
  const status = item.status;
  const catConf = categoryColor[item.category_type] || { badge: 'bg-slate-50 text-slate-600 border-slate-200' };
  const grad = GRAD_PALETTE[item.id % GRAD_PALETTE.length];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group overflow-hidden flex flex-col">
      <div
        className="relative h-44 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden cursor-pointer"
        onClick={() => onViewProduct(item)}
      >
        {item.image ? (
          <img src={item.image} alt={item.product_name} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-lg`}>
            <span className="text-2xl font-black text-white">{item.product_name[0]}</span>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <StatusBadge status={status} />
        </div>
        <div className="absolute bottom-3 right-3">
          <span className={`px-2 py-0.5 rounded-lg text-xs font-bold shadow-sm border border-white/50 ${item.quantity === 0 ? 'bg-red-100 text-red-700' :
            item.quantity <= item.reorder_level ? 'bg-amber-100 text-amber-700' :
              'bg-white/90 text-slate-700'
            }`}>
            Qty: {item.quantity}
          </span>
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1 gap-2">
        <span className={`self-start inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${catConf.badge}`}>
          {item.subcategory}
        </span>
        <h3
          className="text-sm font-bold text-slate-900 leading-tight line-clamp-2 group-hover:text-emerald-700 transition-colors cursor-pointer"
          onClick={() => onViewProduct(item)}
        >
          {item.product_name}
        </h3>
        <p className="text-xs font-semibold text-slate-500">{item.brand}</p>
        <p className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md self-start">{item.sku}</p>
        <div className="border-t border-slate-50 mt-auto pt-2 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900">₹{Number(item.selling_price).toLocaleString()}</span>
          <span className="text-xs text-slate-400 truncate max-w-[90px]">{item.supplier}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            onClick={() => onViewProduct(item)}
            className="flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-xs font-bold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-sm hover:shadow-md"
          >
            <ShoppingCart className="w-7 h-3.5" />
            Product
          </button>
          <button
            onClick={() => onViewDetails(item)}
            className="flex items-center justify-center gap-1.5 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all border border-slate-200"
          >
            <Info className="w-7 h-3.5" />
            Details
          </button>
        </div>
      </div>
    </div>
  );
};

const CategoryDetailModal = ({ isOpen, onClose, category }) => {
  const [viewProductItem, setViewProductItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);

  if (!isOpen || !category) return null;

  // Mock products belonging to this category
  const products = Array.from({ length: category.products_count }).map((_, i) => ({
    id: i + 1,
    product_name: `${category.category_name} Item ${i + 1}`,
    sku: `SKU-${category.category_name.slice(0, 3).toUpperCase()}-${1000 + i}`,
    category_type: category.category_type,
    subcategory: category.category_name,
    brand: i % 2 === 0 ? 'Ray-Ban' : 'Fastrack',
    supplier: 'Vision Supply Co.',
    quantity: i % 3 === 0 ? 0 : (i % 2 === 0 ? 5 : 25),
    reorder_level: 10,
    cost_price: 1500,
    selling_price: 2999,
    status: i % 3 === 0 ? 'Out of Stock' : (i % 2 === 0 ? 'Low Stock' : 'In Stock'),
    image: null,
  }));

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-[1400px] h-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-white px-6 py-5 border-b border-slate-200 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{category.category_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase tracking-wider">
                  {category.category_type}
                </span>
                <span className="text-sm font-medium text-slate-500">{category.products_count} Products</span>
              </div>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors flex-shrink-0">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {category.description && (
            <div className="mb-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-2">Description</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{category.description}</p>
            </div>
          )}

          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900">Products in {category.category_name}</h3>
          </div>

          {products.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <Layers className="w-10 h-10 text-slate-300 mb-4" />
              <h3 className="text-base font-bold text-slate-900 mb-1">No products found</h3>
              <p className="text-slate-500 text-sm">This category doesn't have any products yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-10">
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  item={product}
                  onViewProduct={setViewProductItem}
                  onViewDetails={setDetailItem}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ProductViewModal
        item={viewProductItem}
        onClose={() => setViewProductItem(null)}
        onPlaceOrder={(item) => {
          setViewProductItem(null);
          alert(`Order initiated for ${item.product_name}`);
        }}
      />

      <InventoryDetailDrawer
        item={detailItem}
        onClose={() => setDetailItem(null)}
      />
    </div>,
    document.body
  );
};

export default CategoryDetailModal;
