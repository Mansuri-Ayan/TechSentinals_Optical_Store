import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Receipt, AlertTriangle, Truck,
  ArrowRightLeft, BarChart3, FileText, Glasses, LogOut, Check,
  ChevronDown, ChevronLeft, X, Coins, Store
} from 'lucide-react';
import { useAuthStore, useStoreStore } from '../../store/store';

const AccountantSidebar = ({ isOpen, onClose, isCollapsed, onToggleCollapse }) => {
  const { user, clearUser } = useAuthStore();
  const { stores, selectedStore, setSelectedStore, setStores } = useStoreStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Populate Zustand store with mock branches for accountant on mount
  useEffect(() => {
    const accountantBranches = [
      { id: 'all', store_name: 'All Branches', isAll: true },
      { id: 1, store_name: 'Main Branch' },
      { id: 2, store_name: 'Branch 2' },
      { id: 3, store_name: 'Branch 3' },
      { id: 4, store_name: 'Admin Store' }
    ];
    setStores(accountantBranches);
  }, [setStores]);

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

  const handleSignOut = () => {
    clearUser();
    navigate('/login', { replace: true });
  };

  const handleBranchSelect = (branch) => {
    setSelectedStore(branch);
    setIsDropdownOpen(false);
  };

  const currentBranchName = selectedStore?.store_name || 'All Branches';

  const menuItems = [
    { label: 'Dashboard', path: '/accountant/dashboard', icon: LayoutDashboard },
    { label: 'Sales Ledger', path: '/accountant/sales-ledger', icon: ShoppingCart },
    { label: 'Expenses', path: '/accountant/expenses', icon: Receipt },
    { label: 'Customer Dues', path: '/accountant/customer-dues', icon: AlertTriangle },
    { label: 'Supplier Payments', path: '/accountant/supplier-payments', icon: Truck },
    { label: 'Payment Collection', path: '/accountant/payment-collection', icon: Coins },
    { label: 'Refunds & Adjustments', path: '/accountant/refunds', icon: ArrowRightLeft },
    { label: 'Profit & Loss', path: '/accountant/profit-loss', icon: BarChart3 },
    { label: 'Reports', path: '/accountant/reports', icon: FileText },
    { label: 'Store Performance', path: '/accountant/store-performance', icon: Store }
  ];

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

      {/* Sidebar Panel */}
      <div
        className={`
          fixed top-0 left-0 h-full z-50 flex-shrink-0
          bg-[#0A0F1F] text-slate-300 flex flex-col border-r border-white/5 shadow-2xl
          transition-all duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-20
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ width: isCollapsed ? '88px' : '280px' }}
      >
        {/* Sidebar Header / Store Switcher */}
        <div className={`h-24 flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-6'} border-b border-white/10 relative`}>
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] flex-shrink-0 ${
              isCollapsed ? 'cursor-pointer' : 'mr-3'
            }`}
          >
            <Glasses className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          </div>

          {!isCollapsed && (
            <div className="relative flex-1 min-w-0" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-between w-full bg-transparent text-white font-semibold focus:outline-none py-2 text-left"
              >
                <span className="truncate text-sm sm:text-base">{currentBranchName}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ml-2 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Branch Selector Dropdown */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1E293B] border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in max-h-60 overflow-y-auto hide-scrollbar">
                  {stores.map(branch => (
                    <button
                      key={branch.id}
                      onClick={() => {
                        handleBranchSelect(branch);
                      }}
                      className={`w-full text-left px-4 py-3 flex items-center justify-between text-xs sm:text-sm transition-colors ${selectedStore?.id === branch.id
                        ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                        }`}
                    >
                      <span className="truncate">{branch.store_name}</span>
                      {selectedStore?.id === branch.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Collapse toggle (Desktop only) */}
          {!isOpen && !isCollapsed && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 ml-auto cursor-pointer"
              title="Collapse Sidebar"
              type="button"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Close button (Mobile only) */}
          <button
            onClick={onClose}
            className="lg:hidden ml-2 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
            aria-label="Close sidebar"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-4'} py-6 sm:py-8 space-y-1.5 overflow-y-auto hide-scrollbar`}>
          {!isCollapsed && (
            <div className="px-4 mb-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest animate-fade-in">
              Accountant Panel
            </div>
          )}

          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-2.5 rounded-xl transition-all duration-200 group ${isActive
                    ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-202 border border-transparent'
                  }`
                }
              >
                <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && <span className="font-semibold text-xs sm:text-sm">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Account Section */}
        <div className={`p-4 border-t border-white/10 bg-[#060a16] flex-shrink-0 ${isCollapsed ? 'flex flex-col items-center gap-2' : ''}`}>
          <div
            title={user?.full_name || 'Finley Ledger'}
            className={`flex items-center ${isCollapsed ? 'justify-center w-10 h-10 p-0 rounded-full' : 'px-3 sm:px-4 py-3 rounded-xl'} mb-2 bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer w-full`}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0 select-none">
              FL
            </div>
            {!isCollapsed && (
              <div className="ml-3 flex-1 overflow-hidden min-w-0 flex-shrink-0 animate-fade-in text-left">
                <p className="text-xs sm:text-sm font-semibold text-white truncate">{user?.full_name || 'Finley Ledger'}</p>
                <p className="text-[10px] sm:text-xs text-slate-400 truncate">{user?.email || 'accountant@opticalerp.com'}</p>
              </div>
            )}
          </div>

          <button
            onClick={handleSignOut}
            title={isCollapsed ? "Sign Out" : undefined}
            className={`flex items-center ${isCollapsed ? 'justify-center px-0 w-10 h-10' : 'px-4 py-2.5 w-full'} text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors group text-left cursor-pointer focus:outline-none`}
            type="button"
          >
            <LogOut className={`w-5 h-5 group-hover:-translate-x-1 transition-transform flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
            {!isCollapsed && <span className="font-semibold text-xs sm:text-sm animate-fade-in">Sign Out</span>}
          </button>
        </div>
      </div>
    </>
  );
};

export default AccountantSidebar;
