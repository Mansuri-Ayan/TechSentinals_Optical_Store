import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, useStoreStore } from '../store/store';
import Login from '../pages/auth/Login';
import AdminLayout from '../layouts/AdminLayout';
import Dashboard from '../pages/admin/Dashboard';
import Staff from '../pages/admin/Staff';
import Inventory from '../pages/admin/Inventory';
import Brands from '../pages/admin/Brands';
import Categories from '../pages/admin/Categories';
import Transactions from '../pages/admin/Transactions';
import Suppliers from '../pages/admin/Suppliers';
import SupplierDetail from '../pages/admin/SupplierDetail';
import Sales from '../pages/admin/Sales';
import Expenses from '../pages/admin/Expenses';

// Shopkeeper imports
import ShopKeeperLayout from '../layouts/ShopKeeperLayout';
import ShopkeeperDashboard from '../pages/shopkeeper/Dashboard';
import Customers from '../pages/shopkeeper/Customers';
import CustomerDetail from '../pages/shopkeeper/CustomerDetail';
import ShopkeeperInventory from '../pages/shopkeeper/Inventory';
import ShopkeeperSales from '../pages/shopkeeper/Sales';
import Shopkeeper from '../pages/shopkeeper/Shopkeeper';

// Responsive loading spinner component
const LoadingSpinner = () => (
  <div className="min-h-screen bg-navy flex items-center justify-center text-slate-300 px-4">
    <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Route for non-logged in users (Guests) 
const GuestRoute = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  if (isLoading) return <LoadingSpinner />;
  if (isAuthenticated && user) {
    return user.role === 'admin' ? (
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
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// Route specifically for Home (Redirects admin to dashboard, others to ProfileHome)
const HomeRoute = () => {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <LoadingSpinner />;
  if (user && user.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/shopkeeper" replace />;
};

// Redirect helpers
const StoreRouteRedirect = ({ path }) => {
  const { selectedStore, stores } = useStoreStore();
  const targetStore = selectedStore || stores[0];
  if (!targetStore) return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to={`/admin/store/${targetStore.id}/${path}`} replace />;
};

function AppRouter() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />

      {/* Main home route - protected */}
      <Route path="/" element={<PrivateRoute><HomeRoute /></PrivateRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* Store-scoped routes */}
        <Route path="staff" element={<StoreRouteRedirect path="staff" />} />
        <Route path="store/:storeId/staff" element={<Staff />} />
        
        <Route path="inventory" element={<StoreRouteRedirect path="inventory" />} />
        <Route path="store/:storeId/inventory" element={<Inventory />} />
        
        <Route path="brands" element={<StoreRouteRedirect path="brands" />} />
        <Route path="store/:storeId/brands" element={<Brands />} />
        
        <Route path="categories" element={<StoreRouteRedirect path="categories" />} />
        <Route path="store/:storeId/categories" element={<Categories />} />
        
        <Route path="transactions" element={<StoreRouteRedirect path="transactions" />} />
        <Route path="store/:storeId/transactions" element={<Transactions />} />
        
        <Route path="suppliers" element={<StoreRouteRedirect path="suppliers" />} />
        <Route path="store/:storeId/suppliers" element={<Suppliers />} />
        <Route path="store/:storeId/suppliers/:id" element={<SupplierDetail />} />
        
        <Route path="sales" element={<Sales />} />
        
        {/* Expenses - Using store_id as requested */}
        <Route path="expenses" element={<StoreRouteRedirect path="expenses" />} />
        <Route path="store/:store_id/expenses" element={<Expenses />} />
      </Route>

      {/* Shopkeeper Routes */}
      <Route path="/shopkeeper" element={<ShopKeeperLayout />}>
        <Route index element={<Shopkeeper />} />
        <Route path="dashboard" element={<ShopkeeperDashboard />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:customerId" element={<CustomerDetail />} />
        <Route path="inventory" element={<ShopkeeperInventory />} />
        <Route path="sales" element={<ShopkeeperSales />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRouter;
