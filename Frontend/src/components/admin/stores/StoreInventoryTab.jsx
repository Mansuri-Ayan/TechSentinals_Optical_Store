import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStoreInventoryApi } from '../../../api/stores/store.api';
import { Package, Search, AlertTriangle, XCircle, IndianRupee, Tag, Layers, Loader2 } from 'lucide-react';
import Pagination from '../../shared/Pagination';

const ITEMS_PER_PAGE = 8;

const getStockStatus = (item) => {
  const qty = item.available_quantity ?? item.quantity ?? 0;
  if (qty === 0) return 'out_of_stock';
  const threshold = (item.reorder_level && item.reorder_level > 0)
    ? item.reorder_level
    : 10;
  if (qty <= threshold) return 'low_stock';
  return 'in_stock';
};

const StoreInventoryTab = ({ 
  storeId, 
  searchInput, 
  setSearchInput, 
  search, 
  stockFilter, 
  setStockFilter, 
  page, 
  setPage 
}) => {

  const filters = useMemo(() => {
    return {
      page: page,
      limit: ITEMS_PER_PAGE,
      search: search.trim(),
      stock_status: stockFilter !== 'all' ? stockFilter : undefined
    };
  }, [page, search, stockFilter]);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['storeInventory', storeId, filters],
    queryFn: () => getStoreInventoryApi(storeId, filters),
  });

  const formatRupee = (num) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  const kpis = useMemo(() => {
    if (!data) return { totalCount: 0, low: 0, out: 0, value: '₹0' };
    return {
      totalCount: data.total_products || 0,
      low: data.low_stock_count || 0,
      out: data.out_of_stock_count || 0,
      value: formatRupee(data.total_valuation || 0)
    };
  }, [data]);

  const formatPrice = (p) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(p);
  };

  const getStockStatusBadge = (item) => {
    const status = getStockStatus(item);
    const qty = item.available_quantity ?? item.quantity ?? 0;

    if (status === 'out_of_stock') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border text-red-700 bg-red-50 border-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Out of Stock
        </span>
      );
    }
    if (status === 'low_stock') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border text-amber-700 bg-amber-50 border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Low Stock ({qty})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border text-emerald-700 bg-emerald-50 border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        In Stock ({qty})
      </span>
    );
  };

  if (isLoading && !data) {
    return (
      <div className="py-24 text-center text-slate-500 font-semibold bg-white border border-slate-100 rounded-2xl shadow-sm animate-fade-in">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading Store Stock Sheets...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-12 text-center text-red-700 font-semibold">
        Unable to load store inventory.
      </div>
    );
  }

  const items = data?.items || [];
  const total = data?.total || 0;
  const pages = data?.pages || 0;

  return (
    <div className="space-y-6">
      
      {/* ── Inventory KPI Widgets ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { id: 'all', label: 'Total Products', value: kpis.totalCount, color: 'text-slate-700 bg-slate-50 border-slate-200', icon: Package },
          { id: 'low_stock', label: 'Low Stock Items', value: kpis.low, color: 'text-amber-700 bg-amber-50 border-amber-200', icon: AlertTriangle },
          { id: 'out_of_stock', label: 'Out of Stock', value: kpis.out, color: 'text-red-700 bg-red-50 border-red-200', icon: XCircle },
          { id: 'valuation', label: 'Total Stock Valuation', value: kpis.value, color: 'text-blue-700 bg-blue-50 border-blue-200', icon: IndianRupee },
        ].map(kpi => {
          const Icon = kpi.icon;
          const isFilter = kpi.id !== 'valuation';
          const isActive = stockFilter === kpi.id;
          
          return (
            <div
              key={kpi.label}
              onClick={() => isFilter && (setStockFilter(kpi.id), setPage(1))}
              className={`flex items-center gap-3 p-4 rounded-xl border shadow-sm bg-white transition-all ${kpi.color} ${isFilter ? 'cursor-pointer hover:opacity-80' : ''} ${isActive ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
            >
              <div className="p-2.5 rounded-xl bg-white/60 flex-shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold opacity-75">{kpi.label}</p>
                <p className="text-base sm:text-lg font-bold">{kpi.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            {isFetching ? (
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            ) : (
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            )}
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search store inventory by product name, SKU, brand..."
            className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-xs sm:text-sm font-medium transition-all shadow-sm placeholder:text-slate-400"
          />
        </div>

        {/* Stock status filter */}
        <select
          value={stockFilter}
          onChange={e => { setStockFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white text-slate-700 transition-all sm:w-44"
        >
          <option value="all">All Stock Levels</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
      </div>

      {/* ── Inventory Table ── */}
      {items.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Package className="w-6 h-6 text-slate-300" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">No products found</h4>
          <p className="text-xs text-slate-500">There are no inventory items matching the search query in this store branch.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className={`w-full text-sm transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Product Details', 'SKU / Code', 'Category', 'Brand', 'Price', 'Stock Status'].map(col => (
                    <th key={col} className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const status = getStockStatus(item);
                  const isLow = status === 'low_stock';
                  const isOut = status === 'out_of_stock';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                      {/* Product Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold text-sm shadow-sm flex-shrink-0">
                            {item.product_name?.[0]?.toUpperCase() || 'P'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{item.product_name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{item.brand_name || item.brand}</p>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                          {item.product_sku || item.sku || 'N/A'}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-semibold">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          {item.category_name || item.category || 'Eyewear'}
                        </span>
                      </td>

                      {/* Brand */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-semibold">
                        <span className="inline-flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5 text-slate-400" />
                          {item.brand_name || item.brand || 'Generic'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className={`px-6 py-4 whitespace-nowrap font-bold ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                        {formatPrice(item.price || item.product_price || 0)}
                      </td>

                      {/* Stock status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStockStatusBadge(item)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <Pagination
                totalItems={total}
                itemsPerPage={ITEMS_PER_PAGE}
                currentPage={page}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StoreInventoryTab;
