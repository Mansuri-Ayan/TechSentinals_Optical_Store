import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, useStoreStore } from '../store/store';
import Login from '../pages/auth/Login';
import ProfileHome from '../pages/auth/ProfileHome';
import AdminLayout from '../layouts/AdminLayout';
import Dashboard from '../pages/admin/Dashboard';
import Staff from '../pages/admin/Staff';
import Inventory from '../pages/admin/Inventory';
import Brands from '../pages/admin/Brands';
import Categories from '../pages/admin/Categories';
import Transactions from '../pages/admin/Transactions';
import Suppliers from '../pages/admin/Suppliers';
import SupplierDetail from '../pages/admin/SupplierDetail';

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
    return user.role === 'admin' ? (
      <Navigate to="/admin/dashboard" replace />
    ) : (
      <Navigate to="/" replace />
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
const AdminRoute = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && user.role !== 'admin') {
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

  if (user && user.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <ProfileHome />;
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
        <Route path="inventory" element={<Inventory />} />
        <Route path="brands" element={<Brands />} />
        <Route path="categories" element={<Categories />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="suppliers/:id" element={<SupplierDetail />} />
      </Route>

      {/* Fallback root redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRouter;
