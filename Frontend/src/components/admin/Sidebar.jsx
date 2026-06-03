import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, Glasses, ChevronDown, Check, X, Archive } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore, useStoreStore } from '../../store/store';
import { useStores } from '../../hooks/useStores';

const Sidebar = ({ isOpen, onClose }) => {
  const { stores, selectedStore, setSelectedStore, setStores } = useStoreStore();
  const { stores: fetchedStores, isLoadingStores, isStoresError } = useStores();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const { logout, isLoggingOut } = useAuth();
  const { user } = useAuthStore();

  useEffect(() => {
    setStores(fetchedStores);
  }, [fetchedStores, setStores]);

  // Set default selected store
  useEffect(() => {
    if (!selectedStore && stores.length > 0) {
      setSelectedStore(stores[0]);
    }
  }, [stores, selectedStore, setSelectedStore]);

  const getInitials = (name) => {
    if (!name) return 'AM';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  // Auto-close mobile sidebar on route change
  useEffect(() => {
    if (onClose) {
      onClose();
    }
  }, [location.pathname, onClose]);

  const currentStore = selectedStore || stores[0];
  const getStoreName = (store) => store?.store_name || store?.name || 'Select Store';
  const staffRoute = currentStore ? `/admin/store/${currentStore.id}/staff` : '/admin/dashboard';

  const handleStoreSelect = (store) => {
    setSelectedStore(store);
    setIsDropdownOpen(false);

    if (location.pathname.startsWith('/admin/store/') && location.pathname.endsWith('/staff')) {
      navigate(`/admin/store/${store.id}/staff`);
    }
  };

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
        {/* Sidebar Header / Store Selector */}
        <div className="h-24 flex items-center px-6 border-b border-white/10 relative">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mr-3 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <Glasses className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          </div>

          {isLoadingStores ? (
            <h2 className="text-base font-semibold tracking-tight text-slate-400 truncate">Loading stores...</h2>
          ) : isStoresError ? (
            <h2 className="text-base font-semibold tracking-tight text-red-300 truncate">Unable to load stores</h2>
          ) : stores.length === 0 ? (
            <h2 className="text-base font-semibold tracking-tight text-slate-400 truncate">No stores found</h2>
          ) : stores.length === 1 ? (
            <h2 className="text-lg font-semibold tracking-tight text-white truncate">{getStoreName(stores[0])}</h2>
          ) : (
            <div className="relative flex-1 min-w-0" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-between w-full bg-transparent text-white text-base font-semibold focus:outline-none py-2 text-left"
              >
                <span className="truncate">{getStoreName(currentStore)}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ml-2 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Custom Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1E293B] border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in max-h-60 overflow-y-auto hide-scrollbar">
                  { stores.map(store => (
                    <button
                      key={store.id}
                      onClick={() => {
                        handleStoreSelect(store);
                      }}
                      className={`w-full text-left px-4 py-3 flex items-center justify-between text-sm transition-colors ${currentStore?.id === store.id
                          ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                          : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                        }`}
                    >
                      <span className="truncate">
                        {getStoreName(store)}
                      </span>
                      {currentStore?.id === store.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="lg:hidden ml-2 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 sm:py-8 space-y-1.5 overflow-y-auto hide-scrollbar">
          <div className="px-4 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Overview</div>

          <NavLink
            to="/admin/dashboard"
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
            to={staffRoute}
            className={({ isActive }) =>
              `flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 group ${isActive
                ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
              }`
            }
          >
            <Users className="w-5 h-5 mr-3 transition-transform group-hover:scale-110" />
            <span className="font-medium text-sm">Staff Directory</span>
          </NavLink>

          <NavLink
            to="/admin/inventory"
            className={({ isActive }) =>
              `flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 group ${isActive
                ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
              }`
            }
          >
            <Archive className="w-5 h-5 mr-3 transition-transform group-hover:scale-110" />
            <span className="font-medium text-sm">Inventory</span>
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
              <p className="text-sm font-semibold text-white truncate">{user?.full_name || 'Admin Manager'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email || 'admin@gmail.com'}</p>
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

export default Sidebar;
