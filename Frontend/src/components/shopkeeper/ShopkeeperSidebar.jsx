import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, Glasses, X, Users, Store } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/store';

const ShopkeeperSidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { logout, isLoggingOut } = useAuth();
  const { user } = useAuthStore();

  const getInitials = (name) => {
    if (!name) return 'SK';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Auto-close mobile sidebar on route change
  useEffect(() => {
    if (onClose) {
      onClose();
    }
  }, [location.pathname, onClose]);

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
          w-[350px] shrink-0 bg-[#0A0F1F] text-slate-300 flex flex-col border-r border-white/5 shadow-2xl
          transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-20
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Sidebar Header */}
        <div className="h-24 flex items-center px-6 border-b border-white/10 relative">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mr-3 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <Glasses className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          </div>

          <h2 className="text-lg font-semibold tracking-tight text-white truncate">Shopkeeper</h2>

          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="lg:hidden ml-auto p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 sm:py-8 space-y-1.5 overflow-y-auto hide-scrollbar">
          <div className="px-4 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Overview</div>

          <NavLink
            to="/shopkeeper"
            end
            className={({ isActive }) =>
              `flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 group ${isActive
                ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
              }`
            }
          >
            <Store className="w-5 h-5 mr-3 transition-transform group-hover:scale-110" />
            <span className="font-medium text-sm">Shopkeeper</span>
          </NavLink>

          <NavLink
            to="/shopkeeper/dashboard"
            className={({ isActive }) =>
              `flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 group ${isActive
                ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
              }`
            }
          >
            <LayoutDashboard className="w-5 h-5 mr-3 transition-transform group-hover:scale-110" />
            <span className="font-medium text-sm">Dashboard</span>
          </NavLink>

          <NavLink
            to="/shopkeeper/customers"
            className={({ isActive }) => {
              const isCustomersActive = isActive || location.pathname.startsWith('/shopkeeper/customers');
              return `flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 group ${isCustomersActive
                ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
              }`;
            }}
          >
            <Users className="w-5 h-5 mr-3 transition-transform group-hover:scale-110" />
            <span className="font-medium text-sm">Customers</span>
          </NavLink>

          <NavLink
            to="/shopkeeper/products"
            className={({ isActive }) => {
              const isProductsActive = isActive || location.pathname.startsWith('/shopkeeper/products');
              return `flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 group ${isProductsActive
                ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
              }`;
            }}
          >
            <Glasses className="w-5 h-5 mr-3 transition-transform group-hover:scale-110" />
            <span className="font-medium text-sm">Products</span>
          </NavLink>
        </nav>

        {/* User Profile & Footer */}
        <div className="p-4 border-t border-white/10 bg-[#060a16]">
          {/* Profile Card */}
          <div className="flex items-center px-3 sm:px-4 py-3 mb-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
              {getInitials(user?.full_name)}
            </div>
            <div className="ml-3 flex-1 overflow-hidden min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.full_name || 'Shopkeeper'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email || 'shopkeeper@gmail.com'}</p>
            </div>
          </div>

          <button
            onClick={logout}
            disabled={isLoggingOut}
            className="w-full flex items-center px-4 py-2.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors group text-left cursor-pointer focus:outline-none disabled:opacity-50"
          >
            <LogOut className="w-5 h-5 mr-3 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium text-sm">{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default ShopkeeperSidebar;
