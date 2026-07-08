import { useEffect, useState, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, Glasses, X, Users, Store, Package, ShoppingCart, ChevronLeft, ChevronRight, Wrench, BarChart3, Tag, Layers, Award, ArrowRightLeft, Clock, Warehouse, FileText, Receipt } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore, useStoreStore } from '../../store/store';
import { useHasPermission } from '../../hooks/usePermissions';
import { useStores } from '../../hooks/useStores';

const ShopkeeperSidebar = ({ isOpen, onClose, isCollapsed, onToggleCollapse }) => {
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem('shopkeeper-sidebar-width');
    return saved ? parseInt(saved, 10) : 280; // default 280px
  });
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e) => {
    if (isResizing) {
      const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
      if (clientX) {
        const newWidth = Math.max(200, Math.min(450, clientX));
        setWidth(newWidth);
        localStorage.setItem('shopkeeper-sidebar-width', String(newWidth));
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      window.addEventListener('touchmove', resize);
      window.addEventListener('touchend', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      window.removeEventListener('touchmove', resize);
      window.removeEventListener('touchend', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);
  const location = useLocation();
  const { logout, isLoggingOut } = useAuth();
  const { user } = useAuthStore();

  const getInitials = (name) => {
    if (!name) return 'SK';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  useEffect(() => {
    if (onClose) {
      onClose();
    }
  }, [location.pathname, onClose]);

  const { setStores } = useStoreStore();
  const { stores: fetchedStores } = useStores({ page: 1, limit: 100 });

  useEffect(() => {
    if (fetchedStores) {
      const allStores = [
        { id: "admin", store_name: "Admin Warehouse" },
        ...fetchedStores,
      ];
      setStores(allStores);
    }
  }, [fetchedStores, setStores]);

  const hasInventoryRead = useHasPermission('inventory:read');
  const hasSalesRead = useHasPermission('sales:read');
  const hasSalesWrite = useHasPermission('sales:create');
  const hasTransactionsRead = useHasPermission('transactions:read');
  const hasCustomersRead = useHasPermission('customers:read');
  const hasLoyaltyRead = useHasPermission('loyalty:read');
  const hasReportsRead = useHasPermission('reports:read');
  
  const hasWorkersRead = useHasPermission('workers:read');
  const hasManagersRead = useHasPermission('managers:read');
  const hasOpticiansRead = useHasPermission('opticians:read');
  const hasAccountantsRead = useHasPermission('accountants:read');
  const hasStaffRead = hasWorkersRead || hasManagersRead || hasOpticiansRead || hasAccountantsRead;

  const hasBrandsRead = useHasPermission('brands:read');
  const hasCategoriesRead = useHasPermission('categories:read');
  const hasSuppliersRead = useHasPermission('suppliers:read');
  const hasExpensesRead = useHasPermission('expenses:read');
  const hasRepairsRead = useHasPermission('repairs:read');
  const hasBillSettingsRead = useHasPermission('bill_settings:read');

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-full z-50
          shrink-0 bg-[#0A0F1F] text-slate-300 flex flex-col border-r border-white/5 shadow-2xl
          lg:translate-x-0 lg:static lg:z-20
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isResizing ? '' : 'transition-all duration-300 ease-in-out'}
        `}
        style={{ width: isCollapsed ? '88px' : `${width}px` }}
      >
        {/* Sidebar Header */}
        <div className={`h-24 flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-6'} border-b border-white/10 relative`}>
          <div
            onClick={() => isCollapsed && onToggleCollapse()}
            className={`flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] flex-shrink-0 ${
              isCollapsed ? 'cursor-pointer hover:bg-emerald-500/20 hover:border-emerald-500/30' : 'mr-3'
            }`}
            title={isCollapsed ? "Expand Sidebar" : undefined}
          >
            <Glasses className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          </div>

          {!isCollapsed && (
            <h2 className="text-lg font-semibold tracking-tight text-white truncate animate-fade-in">
              {user?.store_name || 'Inventory Portal'}
            </h2>
          )}

          {/* Toggle Button for collapsing on desktop */}
          {!isOpen && !isCollapsed && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 ml-auto"
              title="Collapse Sidebar"
              type="button"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="lg:hidden ml-auto p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close sidebar"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-4'} py-6 sm:py-8 space-y-1.5 overflow-y-auto hide-scrollbar`}>
          {!isCollapsed && (
            <div className="px-4 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider animate-fade-in">Overview</div>
          )}

          {hasSalesWrite && (
            <NavLink
              to="/shopkeeper"
              end
              title={isCollapsed ? "POS Checkout" : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-2.5 rounded-xl transition-all duration-200 group ${isActive
                  ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
                }`
              }
            >
              <Store className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && <span className="font-medium text-sm truncate animate-fade-in">POS Checkout</span>}
            </NavLink>
          )}

          <NavLink
            to="/shopkeeper/dashboard"
            title={isCollapsed ? "Dashboard" : undefined}
            className={({ isActive }) =>
              `flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-2.5 rounded-xl transition-all duration-200 group ${isActive
                ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-205 border border-transparent'
              }`
            }
          >
            <LayoutDashboard className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
            {!isCollapsed && <span className="font-medium text-sm truncate animate-fade-in">Dashboard</span>}
          </NavLink>

          {hasReportsRead && (
            <NavLink
              to="/shopkeeper/analyses"
              title={isCollapsed ? "Analyses" : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-2.5 rounded-xl transition-all duration-200 group ${isActive
                  ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-205 border border-transparent'
                }`
              }
            >
              <BarChart3 className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && <span className="font-medium text-sm truncate animate-fade-in">Analyses</span>}
            </NavLink>
          )}

          {hasCustomersRead && (
            <NavLink
              to="/shopkeeper/customers"
              title={isCollapsed ? "Customers" : undefined}
              className={({ isActive }) => {
                const isCustomersActive = isActive || location.pathname.startsWith('/shopkeeper/customers');
                return `flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-2.5 rounded-xl transition-all duration-200 group ${isCustomersActive
                  ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
                }`;
              }}
            >
              <Users className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && <span className="font-medium text-sm truncate animate-fade-in">Customers</span>}
            </NavLink>
          )}

          {hasStaffRead && (
            <NavLink
              to="/shopkeeper/staff"
              title={isCollapsed ? "Staff Directory" : undefined}
              className={({ isActive }) => {
                const isStaffActive = isActive || location.pathname.startsWith('/shopkeeper/staff');
                return `flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-2.5 rounded-xl transition-all duration-200 group ${isStaffActive
                  ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
                }`;
              }}
            >
              <Users className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && <span className="font-medium text-sm truncate animate-fade-in">Staff Directory</span>}
            </NavLink>
          )}

          {hasLoyaltyRead && (
            <NavLink
              to="/shopkeeper/loyalty"
              title={isCollapsed ? "Loyalty" : undefined}
              className={({ isActive }) => {
                const isLoyaltyActive = isActive || location.pathname.startsWith('/shopkeeper/loyalty');
                return `flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-2.5 rounded-xl transition-all duration-200 group ${isLoyaltyActive
                  ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-205 border border-transparent'
                }`;
              }}
            >
              <Award className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && <span className="font-medium text-sm truncate animate-fade-in">Loyalty</span>}
            </NavLink>
          )}

          {hasInventoryRead && (
            <>
              <NavLink
                to="/shopkeeper/inventory"
                title={isCollapsed ? "Inventory" : undefined}
                className={({ isActive }) => {
                  const isInventoryActive = isActive || location.pathname.startsWith('/shopkeeper/inventory');
                  return `flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-2.5 rounded-xl transition-all duration-200 group ${isInventoryActive
                    ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-205 border border-transparent'
                  }`;
                }}
              >
                <Package className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && <span className="font-medium text-sm truncate animate-fade-in">Inventory</span>}
              </NavLink>

              <NavLink
                to="/shopkeeper/warehouse"
                title={isCollapsed ? "Warehouse" : undefined}
                className={({ isActive }) => {
                  const isWarehouseActive = isActive || location.pathname.startsWith('/shopkeeper/warehouse');
                  return `flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-2.5 rounded-xl transition-all duration-200 group ${isWarehouseActive
                    ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-205 border border-transparent'
                  }`;
                }}
              >
                <Warehouse className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && <span className="font-medium text-sm truncate animate-fade-in">Warehouse</span>}
              </NavLink>
            </>
          )}

          {hasBrandsRead && (
            <NavLink
              to="/shopkeeper/brands"
              title={isCollapsed ? "Brands" : undefined}
              className={({ isActive }) => {
                const isBrandsActive = isActive || location.pathname.startsWith('/shopkeeper/brands');
                return `flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-2.5 rounded-xl transition-all duration-200 group ${isBrandsActive
                  ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-205 border border-transparent'
                }`;
              }}
            >
              <Tag className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && <span className="font-medium text-sm truncate animate-fade-in">Brands</span>}
            </NavLink>
          )}

          {hasCategoriesRead && (
            <NavLink
              to="/shopkeeper/categories"
              title={isCollapsed ? "Categories" : undefined}
              className={({ isActive }) => {
                const isCategoriesActive = isActive || location.pathname.startsWith('/shopkeeper/categories');
                return `flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-2.5 rounded-xl transition-all duration-200 group ${isCategoriesActive
                  ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-205 border border-transparent'
                }`;
              }}
            >
              <Layers className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && <span className="font-medium text-sm truncate animate-fade-in">Categories</span>}
            </NavLink>
          )}

          {hasBillSettingsRead && (
            <NavLink
              to="/shopkeeper/bill-template"
              title={isCollapsed ? "Bill Settings" : undefined}
              className={({ isActive }) => {
                const isBillActive = isActive || location.pathname.startsWith('/shopkeeper/bill-template');
                return `flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-2.5 rounded-xl transition-all duration-200 group ${isBillActive
                  ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-205 border border-transparent'
                }`;
              }}
            >
              <FileText className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && <span className="font-medium text-sm truncate animate-fade-in">Bill Settings</span>}
            </NavLink>
          )}

          {hasSalesRead && (
            <>
              <NavLink
                to="/shopkeeper/sales"
                title={isCollapsed ? "Sales" : undefined}
                className={({ isActive }) => {
                  const isSalesActive = isActive || location.pathname.startsWith('/shopkeeper/sales');
                  return `flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-2.5 rounded-xl transition-all duration-200 group ${isSalesActive
                    ? 'bg-emerald-50/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-50/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-205 border border-transparent'
                  }`;
                }}
              >
                <ShoppingCart className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && <span className="font-medium text-sm truncate animate-fade-in">Sales</span>}
              </NavLink>

              <NavLink
                to="/shopkeeper/lab-orders"
                title={isCollapsed ? "Orders" : undefined}
                className={({ isActive }) => {
                  const isLabOrdersActive = isActive || location.pathname.startsWith('/shopkeeper/lab-orders');
                  return `flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-2.5 rounded-xl transition-all duration-200 group ${isLabOrdersActive
                    ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-205 border border-transparent'
                  }`;
                }}
              >
                <Clock className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && <span className="font-medium text-sm truncate animate-fade-in">Orders</span>}
              </NavLink>
            </>
          )}

          {hasTransactionsRead && (
            <NavLink
              to="/shopkeeper/transactions"
              title={isCollapsed ? "Transactions" : undefined}
              className={({ isActive }) => {
                const isTxActive = isActive || location.pathname.startsWith('/shopkeeper/transactions');
                return `flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-2.5 rounded-xl transition-all duration-200 group ${isTxActive
                  ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-205 border border-transparent'
                }`;
              }}
            >
              <ArrowRightLeft className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && <span className="font-medium text-sm truncate animate-fade-in">Transactions</span>}
            </NavLink>
          )}

          {hasRepairsRead && (
            <NavLink
              to="/shopkeeper/repairs"
              title={isCollapsed ? "Repairs" : undefined}
              className={({ isActive }) => {
                const isRepairsActive = isActive || location.pathname.startsWith('/shopkeeper/repairs');
                return `flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-2.5 rounded-xl transition-all duration-200 group ${isRepairsActive
                  ? 'bg-emerald-50/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-50/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-205 border border-transparent'
                }`;
              }}
            >
              <Wrench className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && <span className="font-medium text-sm truncate animate-fade-in">Repairs</span>}
            </NavLink>
          )}

          {hasSuppliersRead && (
            <NavLink
              to="/shopkeeper/suppliers"
              title={isCollapsed ? "Suppliers" : undefined}
              className={({ isActive }) => {
                const isSuppliersActive = isActive || location.pathname.startsWith('/shopkeeper/suppliers');
                return `flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-2.5 rounded-xl transition-all duration-200 group ${isSuppliersActive
                  ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-205 border border-transparent'
                }`;
              }}
            >
              <Users className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && <span className="font-medium text-sm truncate animate-fade-in">Suppliers</span>}
            </NavLink>
          )}

          {hasExpensesRead && (
            <NavLink
              to="/shopkeeper/expenses"
              title={isCollapsed ? "Expenses" : undefined}
              className={({ isActive }) => {
                const isExpensesActive = isActive || location.pathname.startsWith('/shopkeeper/expenses');
                return `flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-2.5 rounded-xl transition-all duration-200 group ${isExpensesActive
                  ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-205 border border-transparent'
                }`;
              }}
            >
              <Receipt className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && <span className="font-medium text-sm truncate animate-fade-in">Expenses</span>}
            </NavLink>
          )}
        </nav>

        {/* User Profile & Footer */}
        <div className={`p-4 border-t border-white/10 bg-[#060a16] ${isCollapsed ? 'flex flex-col items-center gap-2' : ''}`}>
          {/* Profile Card */}
          <div 
            title={isCollapsed ? `${user?.full_name} (${user?.role || 'Staff'})` : undefined}
            className={`flex items-center ${isCollapsed ? 'justify-center w-10 h-10 p-0 rounded-full' : 'px-3 sm:px-4 py-3 rounded-xl'} mb-2 bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer w-full`}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
              {getInitials(user?.full_name)}
            </div>
            {!isCollapsed && (
              <div className="ml-3 flex-1 overflow-hidden min-w-0 flex-shrink-0 animate-fade-in">
                <p className="text-sm font-semibold text-white truncate">{user?.full_name || 'Staff Member'}</p>
                <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider truncate mt-0.5">{user?.role || 'Staff'}</p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{user?.email || 'inventory@gmail.com'}</p>
              </div>
            )}
          </div>

          <button
            onClick={logout}
            disabled={isLoggingOut}
            title={isCollapsed ? "Sign Out" : undefined}
            className={`flex items-center ${isCollapsed ? 'justify-center px-0 w-10 h-10' : 'px-4 py-2.5 w-full'} text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors group text-left cursor-pointer focus:outline-none disabled:opacity-50`}
            type="button"
          >
            <LogOut className={`w-5 h-5 group-hover:-translate-x-1 transition-transform flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
            {!isCollapsed && <span className="font-medium text-sm animate-fade-in">{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>}
          </button>
        </div>

        {/* Resizer Handle */}
        {!isCollapsed && (
          <div
            onMouseDown={startResizing}
            onTouchStart={startResizing}
            className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-emerald-500/30 transition-colors z-50 ${
              isResizing ? 'bg-emerald-500/50' : ''
            }`}
            title="Drag to resize sidebar"
          />
        )}
      </div>
    </>
  );
};

export default ShopkeeperSidebar;
