/** @format */

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore, useStoreStore } from "../store/store";
import Login from "../pages/auth/Login";
import ProfileHome from "../pages/auth/ProfileHome";
import AdminLayout from "../layouts/AdminLayout";
import Dashboard from "../pages/admin/Dashboard";
import Staff from "../pages/admin/Staff";
import Inventory from "../pages/admin/Inventory";
import Brands from "../pages/admin/Brands";
import Categories from "../pages/admin/Categories";
import Transactions from "../pages/admin/Transactions";
import Suppliers from "../pages/admin/Suppliers";
import SupplierDetail from "../pages/admin/SupplierDetail";
import Sales from "../pages/admin/Sales";
import Expenses from "../pages/admin/Expenses";
import Analyses from "../pages/admin/Analyses";
import Stores from "../pages/admin/Stores";
import StoreDetail from "../pages/admin/StoreDetail";
import AdminLoyalty from "../pages/admin/Loyalty";
import AdminLoyaltyCustomerDetail from "../pages/admin/LoyaltyCustomerDetail";

// Shopkeeper imports
import ShopKeeperLayout from "../layouts/ShopKeeperLayout";
import ShopkeeperDashboard from "../pages/shopkeeper/Dashboard";
import Customers from "../pages/shopkeeper/Customers";
import CustomerDetail from "../pages/shopkeeper/CustomerDetail";
import ShopkeeperInventory from "../pages/shopkeeper/Inventory";
import ShopkeeperSales from "../pages/shopkeeper/Sales";
import Shopkeeper from "../pages/shopkeeper/Shopkeeper";
import ShopkeeperStaff from "../pages/shopkeeper/Staff";
import ShopkeeperExpenses from "../pages/shopkeeper/Expenses";
import Repair from "../pages/shopkeeper/Repair";
import ShopkeeperAnalyses from "../pages/shopkeeper/Analyses";
import ShopkeeperBrands from "../pages/shopkeeper/Brands";
import ShopkeeperCategories from "../pages/shopkeeper/Categories";
import ShopkeeperLoyalty from "../pages/shopkeeper/Loyalty";
import ShopkeeperLoyaltyCustomerDetail from "../pages/shopkeeper/LoyaltyCustomerDetail";
import ShopkeeperTransactions from "../pages/shopkeeper/Transactions";

// Responsive loading spinner component
const LoadingSpinner = () => (
  <div className="min-h-screen bg-navy flex items-center justify-center text-slate-300 px-4">
    <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Route for non-logged in users (Guests)
const GuestRoute = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated && user) {
    return user.role === "admin" ? (
      <Navigate to="/admin/dashboard" replace />
    ) : (
      <Navigate to="/shopkeeper" replace />
    );
  }

  return children;
};

// Route for authenticated users
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Route specifically for Admins
/* eslint-disable-next-line no-unused-vars */
const AdminRoute = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Route specifically for Home (Redirects admin to dashboard, others to ProfileHome)
const HomeRoute = () => {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (user && user.role === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/shopkeeper" replace />;
};

const StaffRouteRedirect = () => {
  const { selectedStore, stores } = useStoreStore();
  const targetStore = selectedStore || stores[0];

  if (!targetStore) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to={`/admin/store/${targetStore.id}/staff`} replace />;
};

const InventoryRouteRedirect = () => {
  const { selectedStore, stores } = useStoreStore();
  const targetStore = selectedStore || stores[0];

  if (!targetStore) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to={`/admin/store/${targetStore.id}/inventory`} replace />;
};

const BrandsRouteRedirect = () => {
  const { selectedStore, stores } = useStoreStore();
  const targetStore = selectedStore || stores[0];

  if (!targetStore) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to={`/admin/store/${targetStore.id}/brands`} replace />;
};

const CategoriesRouteRedirect = () => {
  const { selectedStore, stores } = useStoreStore();
  const targetStore = selectedStore || stores[0];

  if (!targetStore) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to={`/admin/store/${targetStore.id}/categories`} replace />;
};

const TransactionsRouteRedirect = () => {
  const { selectedStore, stores } = useStoreStore();
  const targetStore = selectedStore || stores[0];

  if (!targetStore) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <Navigate to={`/admin/store/${targetStore.id}/transactions`} replace />
  );
};
const StoreRouteRedirect = ({ path }) => {
  const { selectedStore, stores } = useStoreStore();
  const targetStore = selectedStore || stores[0];
  if (!targetStore) return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to={`/admin/store/${targetStore.id}/${path}`} replace />;
};

const SuppliersRouteRedirect = () => {
  const { selectedStore, stores } = useStoreStore();
  const targetStore = selectedStore || stores[0];

  if (!targetStore) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to={`/admin/store/${targetStore.id}/suppliers`} replace />;
};

function AppRouter() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        }
      />

      {/* Main home route - protected */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <HomeRoute />
          </PrivateRoute>
        }
      />

      {/* Admin Routes - protected to only admins */}
      <Route
        path="/admin"
        element={
          // <AdminRoute>
          <AdminLayout />
          // </AdminRoute>
        }
      >
        {/* Redirect /admin to /admin/dashboard */}
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="staff" element={<StaffRouteRedirect />} />
        <Route path="store/:storeId/staff" element={<Staff />} />
        <Route path="inventory" element={<InventoryRouteRedirect />} />
        <Route path="store/:storeId/inventory" element={<Inventory />} />
        <Route path="brands" element={<BrandsRouteRedirect />} />
        <Route path="store/:storeId/brands" element={<Brands />} />
        <Route path="categories" element={<CategoriesRouteRedirect />} />
        <Route path="store/:storeId/categories" element={<Categories />} />
        <Route path="transactions" element={<TransactionsRouteRedirect />} />
        <Route path="store/:storeId/transactions" element={<Transactions />} />
        <Route path="suppliers" element={<SuppliersRouteRedirect />} />
        <Route path="store/:storeId/suppliers" element={<Suppliers />} />
        <Route path="stores" element={<Stores />} />
        <Route path="stores/:storeId" element={<StoreDetail />} />
        <Route
          path="store/:storeId/suppliers/:id"
          element={<SupplierDetail />}
        />
        <Route path="sales" element={<Sales />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="analyses" element={<Analyses />} />
        <Route path="stores" element={<Stores />} />
        <Route path="stores/:storeId" element={<StoreDetail />} />

        {/* Expenses - Using store_id as requested */}
        <Route
          path="expenses"
          element={<StoreRouteRedirect path="expenses" />}
        />
        <Route path="store/:store_id/expenses" element={<Expenses />} />

        {/* Loyalty Program */}
        <Route path="loyalty" element={<AdminLoyalty />} />
        <Route path="loyalty/customer/:id" element={<AdminLoyaltyCustomerDetail />} />
      </Route>

      {/* Shopkeeper Routes */}
      <Route path="/shopkeeper" element={<ShopKeeperLayout />}>
        {/* Redirect /shopkeeper to /shopkeeper/dashboard */}
        <Route index element={<Shopkeeper />} />
        <Route path="dashboard" element={<ShopkeeperDashboard />} />
        <Route path="analyses" element={<ShopkeeperAnalyses />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:customerId" element={<CustomerDetail />} />
        <Route path="inventory" element={<ShopkeeperInventory />} />
        <Route path="sales" element={<ShopkeeperSales />} />
        <Route path="staff" element={<ShopkeeperStaff />} />
        <Route path="expenses" element={<ShopkeeperExpenses />} />
        <Route path="repairs" element={<Repair />} />
        <Route path="brands" element={<ShopkeeperBrands />} />
        <Route path="categories" element={<ShopkeeperCategories />} />
        <Route path="loyalty" element={<ShopkeeperLoyalty />} />
        <Route path="loyalty/customer/:id" element={<ShopkeeperLoyaltyCustomerDetail />} />
        <Route path="transactions" element={<ShopkeeperTransactions />} />
      </Route>

      {/* Fallback root redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRouter;
