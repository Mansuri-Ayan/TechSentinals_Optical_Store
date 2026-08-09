/** @format */

import { useState, useRef, useEffect, useCallback } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  LogOut,
  Glasses,
  ChevronDown,
  Check,
  X,
  Archive,
  Tag,
  Layers,
  ArrowRightLeft,
  Truck,
  ShoppingCart,
  Receipt,
  Store,
  ChevronLeft,
  BarChart3,
  UserCheck,
  Clock,
  Award,
  Warehouse,
  FileText,
  Beaker,
  Shield,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useAuthStore, useStoreStore } from "../../store/store";
import { useStores } from "../../hooks/useStores";
import { useHasPermission } from "../../hooks/usePermissions";

const Sidebar = ({ isOpen, onClose, isCollapsed, onToggleCollapse }) => {
  const { stores, selectedStore, setSelectedStore, setStores } =
    useStoreStore();

  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem("admin-sidebar-width");
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

  const resize = useCallback(
    (e) => {
      if (isResizing) {
        const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
        if (clientX) {
          const newWidth = Math.max(200, Math.min(450, clientX));
          setWidth(newWidth);
          localStorage.setItem("admin-sidebar-width", String(newWidth));
        }
      }
    },
    [isResizing],
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
      window.addEventListener("touchmove", resize);
      window.addEventListener("touchend", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      window.removeEventListener("touchmove", resize);
      window.removeEventListener("touchend", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);
  const {
    stores: fetchedStores,
    isLoadingStores,
    isStoresError,
  } = useStores({ page: 1, limit: 100 });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const { logout, isLoggingOut } = useAuth();
  const { user } = useAuthStore();

  const hasStoresRead = useHasPermission('stores:read');
  const hasWarehouseRead = useHasPermission('inventory:read'); // Using inventory read for warehouse
  const hasWorkersRead = useHasPermission('workers:read');
  const hasManagersRead = useHasPermission('managers:read');
  const hasOpticiansRead = useHasPermission('opticians:read');
  const hasAccountantsRead = useHasPermission('accountants:read');
  const hasStaffRead = hasWorkersRead || hasManagersRead || hasOpticiansRead || hasAccountantsRead;
  const hasInventoryRead = useHasPermission('inventory:read');
  const hasSalesRead = useHasPermission('sales:read');
  const hasOrdersRead = useHasPermission('prescriptions:read');
  const hasCustomersRead = useHasPermission('customers:read');
  const hasBrandsRead = useHasPermission('brands:read');
  const hasCategoriesRead = useHasPermission('categories:read');
  const hasTransferRead = useHasPermission('inventory:transfer');
  const hasTransactionsRead = useHasPermission('transactions:read');
  const hasSuppliersRead = useHasPermission('suppliers:read');
  const hasExpensesRead = useHasPermission('expenses:read');
  const hasLoyaltyRead = useHasPermission('loyalty:read');
  const hasPermissionsRead = useHasPermission('permissions:read');
  const hasAnalysesRead = useHasPermission('reports:read');
  const hasExchangesRead = useHasPermission('exchanges:read');
  const hasDeadstockRead = useHasPermission('deadstock:read');
  const hasLabsRead = useHasPermission('labs:read');

  useEffect(() => {
    if (fetchedStores) {
      const allStores = [
        { id: "admin", store_name: "Admin Warehouse" },
        ...(fetchedStores.items || fetchedStores || []),
      ];
      setStores(allStores);
    }
  }, [fetchedStores, setStores]);

  // Set default selected store
  useEffect(() => {
    if (!selectedStore && stores.length > 0) {
      setSelectedStore(stores[0]);
    }
  }, [stores, selectedStore, setSelectedStore]);

  const getInitials = (name) => {
    if (!name) return "AM";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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

  const currentStore = selectedStore ||
    stores[0] || { id: "1", store_name: "Main Branch" };
  const getStoreName = (store) =>
    store?.store_name || store?.name || "Select Store";
  const staffRoute = currentStore
    ? `/admin/store/${currentStore.id}/staff`
    : "/admin/dashboard";
  const inventoryRoute = currentStore
    ? `/admin/store/${currentStore.id}/inventory`
    : "/admin/dashboard";
  const brandsRoute = currentStore
    ? `/admin/store/${currentStore.id}/brands`
    : "/admin/dashboard";
  const categoriesRoute = currentStore
    ? `/admin/store/${currentStore.id}/categories`
    : "/admin/dashboard";
  const transactionsRoute = currentStore
    ? `/admin/store/${currentStore.id}/transactions`
    : "/admin/dashboard";
  const suppliersRoute = currentStore
    ? `/admin/store/${currentStore.id}/suppliers`
    : "/admin/dashboard";
  const expensesRoute =
    currentStore && currentStore.id !== "admin"
      ? `/admin/store/${currentStore.id}/expenses`
      : "/admin/dashboard";
  const repairsRoute = currentStore
    ? `/admin/store/${currentStore.id}/repairs`
    : "/admin/dashboard";
  const customersRoute = currentStore
    ? `/admin/store/${currentStore.id}/customers`
    : "/admin/dashboard";
  const labOrdersRoute = currentStore
    ? `/admin/store/${currentStore.id}/lab-orders`
    : "/admin/dashboard";
  const loyaltyRoute = currentStore
    ? `/admin/store/${currentStore.id}/loyalty`
    : "/admin/dashboard";
  const billTemplateRoute = currentStore
    ? `/admin/store/${currentStore.id}/bill-template`
    : "/admin/dashboard";
  const labsRoute = currentStore
    ? `/admin/store/${currentStore.id}/labs`
    : "/admin/dashboard";
  const exchangesRoute = currentStore
    ? `/admin/store/${currentStore.id}/exchanges`
    : "/admin/dashboard";
  const deadstockRoute = currentStore && currentStore.id !== "admin"
    ? `/admin/store/${currentStore.id}/deadstock`
    : "/admin/deadstock";


  const handleStoreSelect = (store) => {
    setSelectedStore(store);
    setIsDropdownOpen(false);

    // If on Stores Directory or Store Detail, navigate to the new store's detail
    if (location.pathname.startsWith("/admin/stores")) {
      if (store.id === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate(`/admin/stores/${store.id}`);
      }
      return;
    }

    if (
      location.pathname.startsWith("/admin/store/") &&
      location.pathname.endsWith("/staff")
    ) {
      if (store.id === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate(`/admin/store/${store.id}/staff`);
      }
    } else if (
      location.pathname.startsWith("/admin/store/") &&
      location.pathname.endsWith("/inventory")
    ) {
      navigate(`/admin/store/${store.id}/inventory`);
    } else if (
      location.pathname.startsWith("/admin/store/") &&
      location.pathname.endsWith("/brands")
    ) {
      navigate(`/admin/store/${store.id}/brands`);
    } else if (
      location.pathname.startsWith("/admin/store/") &&
      location.pathname.endsWith("/categories")
    ) {
      navigate(`/admin/store/${store.id}/categories`);
    } else if (
      location.pathname.startsWith("/admin/store/") &&
      location.pathname.includes("/transactions")
    ) {
      navigate(`/admin/store/${store.id}/transactions`);
    } else if (
      location.pathname.startsWith("/admin/store/") &&
      location.pathname.includes("/suppliers")
    ) {
      navigate(`/admin/store/${store.id}/suppliers`);
    } else if (
      location.pathname.startsWith("/admin/store/") &&
      location.pathname.includes("/labs")
    ) {
      navigate(`/admin/store/${store.id}/labs`);
    } else if (
      location.pathname.startsWith("/admin/store/") &&
      location.pathname.includes("/expenses")
    ) {
      if (store.id === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate(`/admin/store/${store.id}/expenses`);
      }
    } else if (
      location.pathname.startsWith("/admin/store/") &&
      location.pathname.includes("/repairs")
    ) {
      navigate(`/admin/store/${store.id}/repairs`);
    } else if (
      location.pathname.startsWith("/admin/store/") &&
      location.pathname.includes("/customers")
    ) {
      navigate(`/admin/store/${store.id}/customers`);
    } else if (
      location.pathname.startsWith("/admin/store/") &&
      location.pathname.includes("/lab-orders")
    ) {
      navigate(`/admin/store/${store.id}/lab-orders`);
    } else if (
      location.pathname.startsWith("/admin/store/") &&
      location.pathname.includes("/loyalty")
    ) {
      navigate(`/admin/store/${store.id}/loyalty`);
    } else if (
      location.pathname.startsWith("/admin/store/") &&
      location.pathname.includes("/bill-template")
    ) {
      if (store.id === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate(`/admin/store/${store.id}/bill-template`);
      }
    } else if (
      location.pathname.startsWith("/admin/store/") &&
      location.pathname.includes("/exchanges")
    ) {
      if (store.id === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate(`/admin/store/${store.id}/exchanges`);
      }
    } else {
      // Default fallback
      if (store.id === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate(`/admin/stores/${store.id}`);
      }
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
          shrink-0 bg-[#0A0F1F] text-slate-300 flex flex-col border-r border-white/5 shadow-2xl
          lg:translate-x-0 lg:static lg:z-20
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          ${isResizing ? "" : "transition-all duration-300 ease-in-out"}
        `}
        style={{ width: isCollapsed ? "88px" : `${width}px` }}
      >
        {/* Sidebar Header / Store Selector */}
        <div
          className={`h-24 flex items-center ${isCollapsed ? "justify-center px-2" : "px-6"} border-b border-white/10 relative`}
        >
          <div
            onClick={() => isCollapsed && onToggleCollapse()}
            className={`flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] flex-shrink-0 ${
              isCollapsed
                ? "cursor-pointer hover:bg-emerald-500/20 hover:border-emerald-500/30"
                : "mr-3"
            }`}
            title={isCollapsed ? "Expand Sidebar" : undefined}
          >
            <Glasses className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          </div>

          {isLoadingStores ? (
            !isCollapsed && (
              <h2 className="text-base font-semibold tracking-tight text-slate-400 truncate">
                Loading stores...
              </h2>
            )
          ) : isStoresError ? (
            !isCollapsed && (
              <h2 className="text-base font-semibold tracking-tight text-red-300 truncate">
                Error
              </h2>
            )
          ) : stores.length === 0 ? (
            !isCollapsed && (
              <h2 className="text-base font-semibold tracking-tight text-slate-400 truncate flex-shrink-0">
                No stores
              </h2>
            )
          ) : stores.length === 1 ? (
            !isCollapsed && (
              <h2 className="text-lg font-semibold tracking-tight text-white truncate">
                {getStoreName(stores[0])}
              </h2>
            )
          ) : (
            !isCollapsed && (
              <div className="relative flex-1 min-w-0" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center justify-between w-full bg-transparent text-white font-semibold focus:outline-none py-2 text-left"
                >
                  <span className="truncate text-base">
                    {getStoreName(currentStore)}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ml-2 ${isDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Custom Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#1E293B] border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in max-h-60 overflow-y-auto hide-scrollbar">
                    {stores.map((store) => (
                      <button
                        key={store.id}
                        onClick={() => {
                          handleStoreSelect(store);
                        }}
                        className={`w-full text-left px-4 py-3 flex items-center justify-between text-sm transition-colors ${
                          currentStore?.id === store.id
                            ? "bg-emerald-500/10 text-emerald-400 font-semibold"
                            : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                        }`}
                      >
                        <span className="truncate">{getStoreName(store)}</span>
                        {currentStore?.id === store.id && (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
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
            className="lg:hidden ml-2 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close sidebar"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav
          className={`flex-1 ${isCollapsed ? "px-2" : "px-4"} py-6 sm:py-8 space-y-1.5 overflow-y-auto hide-scrollbar`}
        >
          {!isCollapsed && (
            <div className="px-4 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider animate-fade-in">
              Overview
            </div>
          )}

          <NavLink
            to="/admin/dashboard"
            title={isCollapsed ? "Dashboard" : undefined}
            className={({ isActive }) =>
              `flex items-center ${isCollapsed ? "justify-center px-0" : "px-4"} py-2.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-202 border border-transparent"
              }`
            }
          >
            <LayoutDashboard
              className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? "" : "mr-3"}`}
            />
            {!isCollapsed && (
              <span className="font-medium text-sm">Dashboard</span>
            )}
          </NavLink>

          {hasAnalysesRead && (
            <NavLink
              to="/admin/analyses"
              title={isCollapsed ? "Analyses" : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? "justify-center px-0" : "px-4"} py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-202 border border-transparent"
                }`
              }
            >
              <BarChart3
                className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? "" : "mr-3"}`}
              />
              {!isCollapsed && (
                <span className="font-medium text-sm">Analyses</span>
              )}
            </NavLink>
          )}

          {hasStoresRead && (
            <NavLink
              to="/admin/stores"
              title={isCollapsed ? "Stores" : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? "justify-center px-0" : "px-4"} py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive || location.pathname.startsWith("/admin/stores")
                    ? "bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-202 border border-transparent"
                }`
              }
            >
              <Store
                className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? "" : "mr-3"}`}
              />
              {!isCollapsed && (
                <span className="font-medium text-sm">Stores</span>
              )}
            </NavLink>
          )}

          {hasWarehouseRead && (
            <NavLink
              to="/admin/warehouse"
              title={isCollapsed ? "Warehouse" : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? "justify-center px-0" : "px-4"} py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive || location.pathname.startsWith("/admin/warehouse")
                    ? "bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-202 border border-transparent"
                }`
              }
            >
              <Warehouse
                className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? "" : "mr-3"}`}
              />
              {!isCollapsed && (
                <span className="font-medium text-sm">Warehouse</span>
              )}
            </NavLink>
          )}



          {hasStaffRead && (
            <NavLink
              to={staffRoute}
              title={isCollapsed ? "Staff Directory" : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? "justify-center px-0" : "px-4"} py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-202 border border-transparent"
                }`
              }
            >
              <Users
                className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? "" : "mr-3"}`}
              />
              {!isCollapsed && (
                <span className="font-medium text-sm">Staff Directory</span>
              )}
            </NavLink>
          )}

          {hasInventoryRead && (
            <NavLink
              to={inventoryRoute}
              title={isCollapsed ? "Inventory" : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? "justify-center px-0" : "px-4"} py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-202 border border-transparent"
                }`
              }
            >
              <Archive
                className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? "" : "mr-3"}`}
              />
              {!isCollapsed && (
                <span className="font-medium text-sm">Inventory</span>
              )}
            </NavLink>
          )}


          <NavLink
            to="/admin/bill-template"
            end
            title={isCollapsed ? "Bill Settings" : undefined}
            className={({ isActive }) => {
              const isBillActive =
                isActive || location.pathname.includes("/bill-template");
              return `flex items-center ${isCollapsed ? "justify-center px-0" : "px-4"} py-2.5 rounded-xl transition-all duration-200 group ${
                isBillActive
                  ? "bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-202 border border-transparent"
              }`;
            }}
            onClick={(e) => {
              if (currentStore) {
                e.preventDefault();
                navigate(billTemplateRoute);
              }
            }}
          >
            <FileText
              className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? "" : "mr-3"}`}
            />
            {!isCollapsed && (
              <span className="font-medium text-sm">Bill Settings</span>
            )}
          </NavLink>


          {hasSalesRead && (
            <NavLink
              to="/admin/sales"
              title={isCollapsed ? "Sales" : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? "justify-center px-0" : "px-4"} py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-202 border border-transparent"
                }`
              }
            >
              <ShoppingCart
                className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? "" : "mr-3"}`}
              />
              {!isCollapsed && <span className="font-medium text-sm">Sales</span>}
            </NavLink>
          )}

          {hasExchangesRead && (
            <NavLink
              to={exchangesRoute}
              title={isCollapsed ? "Exchanges" : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? "justify-center px-0" : "px-4"} py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive || location.pathname.includes("/exchanges")
                    ? "bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-202 border border-transparent"
                }`
              }
            >
              <RefreshCw
                className={`w-5 h-5 transition-transform group-hover:rotate-180 duration-500 flex-shrink-0 ${isCollapsed ? "" : "mr-3"}`}
              />
              {!isCollapsed && <span className="font-medium text-sm">Exchanges</span>}
            </NavLink>
          )}

          {hasDeadstockRead && (
            <NavLink
              to={deadstockRoute}
              title={isCollapsed ? "Deadstock" : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? "justify-center px-0" : "px-4"} py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive || location.pathname.includes("/deadstock")
                    ? "bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-202 border border-transparent"
                }`
              }
            >
              <Archive
                className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? "" : "mr-3"}`}
              />
              {!isCollapsed && <span className="font-medium text-sm">Deadstock</span>}
            </NavLink>
          )}


          {hasOrdersRead && (
            <NavLink
              to={labOrdersRoute}
              title={isCollapsed ? "Orders" : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? "justify-center px-0" : "px-4"} py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive || location.pathname.includes("/lab-orders")
                    ? "bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-202 border border-transparent"
                }`
              }
            >
              <Clock
                className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? "" : "mr-3"}`}
              />
              {!isCollapsed && (
                <span className="font-medium text-sm">Orders</span>
              )}
            </NavLink>
          )}

          {hasLabsRead && (
            <NavLink
              to={labsRoute}
              title={isCollapsed ? "Labs" : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? "justify-center px-0" : "px-4"} py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive || location.pathname.includes("/labs")
                    ? "bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-202 border border-transparent"
                }`
              }
            >
              <Beaker
                className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? "" : "mr-3"}`}
              />
              {!isCollapsed && (
                <span className="font-medium text-sm">Labs</span>
              )}
            </NavLink>
          )}

          {hasCustomersRead && (
            <NavLink
              to="/admin/customers"
              end
              title={isCollapsed ? "Customers" : undefined}
              className={({ isActive }) => {
                const isCustomersActive =
                  isActive || location.pathname.includes("/customers");
                return `flex items-center ${isCollapsed ? "justify-center px-0" : "px-4"} py-2.5 rounded-xl transition-all duration-200 group ${
                  isCustomersActive
                    ? "bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-202 border border-transparent"
                }`;
              }}
              onClick={(e) => {
                if (currentStore) {
                  e.preventDefault();
                  navigate(customersRoute);
                }
              }}
            >
              <UserCheck
                className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? "" : "mr-3"}`}
              />
              {!isCollapsed && (
                <span className="font-medium text-sm">Customers</span>
              )}
            </NavLink>
          )}

          {hasBrandsRead && (
            <NavLink
              to="/admin/brands"
              end
              title={isCollapsed ? "Brands" : undefined}
              className={({ isActive }) => {
                const isBrandsActive =
                  isActive || location.pathname.includes("/brands");
                return `flex items-center ${isCollapsed ? "justify-center px-0" : "px-4"} py-2.5 rounded-xl transition-all duration-200 group ${
                  isBrandsActive
                    ? "bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent"
                }`;
              }}
              onClick={(e) => {
                if (currentStore) {
                  e.preventDefault();
                  navigate(brandsRoute);
                }
              }}
            >
              <Tag
                className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? "" : "mr-3"}`}
              />
              {!isCollapsed && (
                <span className="font-medium text-sm">Brands</span>
              )}
            </NavLink>
          )}

          {hasCategoriesRead && (
            <NavLink
              to="/admin/categories"
              end
              title={isCollapsed ? "Categories" : undefined}
              className={({ isActive }) => {
                const isCategoriesActive =
                  isActive || location.pathname.includes("/categories");
                return `flex items-center ${isCollapsed ? "justify-center px-0" : "px-4"} py-2.5 rounded-xl transition-all duration-200 group ${
                  isCategoriesActive
                    ? "bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent"
                }`;
              }}
              onClick={(e) => {
                if (currentStore) {
                  e.preventDefault();
                  navigate(categoriesRoute);
                }
              }}
            >
              <Layers
                className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? "" : "mr-3"}`}
              />
              {!isCollapsed && (
                <span className="font-medium text-sm">Categories</span>
              )}
            </NavLink>
          )}

          {hasTransactionsRead && (
            <NavLink
              to={transactionsRoute}
              title={isCollapsed ? "Transactions" : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? "justify-center px-0" : "px-4"} py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-202 border border-transparent"
                }`
              }
            >
              <ArrowRightLeft
                className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? "" : "mr-3"}`}
              />
              {!isCollapsed && (
                <span className="font-medium text-sm">Transactions</span>
              )}
            </NavLink>
          )}

          {hasSuppliersRead && (
            <NavLink
              to={suppliersRoute}
              title={isCollapsed ? "Suppliers" : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? "justify-center px-0" : "px-4"} py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-202 border border-transparent"
                }`
              }
            >
              <Truck
                className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? "" : "mr-3"}`}
              />
              {!isCollapsed && (
                <span className="font-medium text-sm">Suppliers</span>
              )}
            </NavLink>
          )}

          {hasExpensesRead && (
            <NavLink
              to="/admin/expenses"
              end
              title={isCollapsed ? "Expenses" : undefined}
              className={({ isActive }) => {
                const isExpensesActive =
                  isActive || location.pathname.includes("/expenses");
                return `flex items-center ${isCollapsed ? "justify-center px-0" : "px-4"} py-2.5 rounded-xl transition-all duration-200 group ${
                  isExpensesActive
                    ? "bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-202 border border-transparent"
                }`;
              }}
              onClick={(e) => {
                if (currentStore) {
                  e.preventDefault();
                  navigate(expensesRoute);
                }
              }}
            >
              <Receipt
                className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? "" : "mr-3"}`}
              />
              {!isCollapsed && (
                <span className="font-medium text-sm">Expenses</span>
              )}
            </NavLink>
          )}

          {hasLoyaltyRead && (
            <NavLink
              to="/admin/loyalty"
              end
              title={isCollapsed ? "Loyalty" : undefined}
              className={({ isActive }) => {
                const isLoyaltyActive =
                  isActive || location.pathname.includes("/loyalty");
                return `flex items-center ${isCollapsed ? "justify-center px-0" : "px-4"} py-2.5 rounded-xl transition-all duration-200 group ${
                  isLoyaltyActive
                    ? "bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-202 border border-transparent"
                }`;
              }}
              onClick={(e) => {
                if (currentStore) {
                  e.preventDefault();
                  navigate(loyaltyRoute);
                }
              }}
            >
              <Award
                className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? "" : "mr-3"}`}
              />
              {!isCollapsed && (
                <span className="font-medium text-sm">Loyalty</span>
              )}
            </NavLink>
          )}

          {hasPermissionsRead && (
            <NavLink
              to="/admin/permissions"
              title={isCollapsed ? "Permissions" : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? "justify-center px-0" : "px-4"} py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent"
                }`
              }
            >
              <Shield
                className={`w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${isCollapsed ? "" : "mr-3"}`}
              />
              {!isCollapsed && (
                <span className="font-medium text-sm">Permissions</span>
              )}
            </NavLink>
          )}

        </nav>

        {/* User Profile & Footer */}
        <div
          className={`p-4 border-t border-white/10 bg-[#060a16] ${isCollapsed ? "flex flex-col items-center gap-2" : ""}`}
        >
          {/* Profile Card */}
          <div
            title={isCollapsed ? user?.full_name || "Admin Manager" : undefined}
            className={`flex items-center ${isCollapsed ? "justify-center w-10 h-10 p-0 rounded-full" : "px-3 sm:px-4 py-3 rounded-xl"} mb-2 bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer w-full`}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
              {getInitials(user?.full_name)}
            </div>
            {!isCollapsed && (
              <div className="ml-3 flex-1 overflow-hidden min-w-0 flex-shrink-0 animate-fade-in">
                <p className="text-sm font-semibold text-white truncate">
                  {user?.full_name || "Admin Manager"}
                </p>
                <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider truncate mt-0.5">
                  {user?.role || "Admin"}
                </p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {user?.email || "admin@gmail.com"}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={logout}
            disabled={isLoggingOut}
            title={isCollapsed ? "Sign Out" : undefined}
            className={`flex items-center ${isCollapsed ? "justify-center px-0 w-10 h-10" : "px-4 py-2.5 w-full"} text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors group text-left cursor-pointer focus:outline-none disabled:opacity-50`}
            type="button"
          >
            <LogOut
              className={`w-5 h-5 group-hover:-translate-x-1 transition-transform flex-shrink-0 ${isCollapsed ? "" : "mr-3"}`}
            />
            {!isCollapsed && (
              <span className="font-medium text-sm animate-fade-in">
                {isLoggingOut ? "Signing Out..." : "Sign Out"}
              </span>
            )}
          </button>
        </div>

        {/* Resizer Handle */}
        {!isCollapsed && (
          <div
            onMouseDown={startResizing}
            onTouchStart={startResizing}
            className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-emerald-500/30 transition-colors z-50 ${
              isResizing ? "bg-emerald-500/50" : ""
            }`}
            title="Drag to resize sidebar"
          />
        )}
      </div>
    </>
  );
};

export default Sidebar;
