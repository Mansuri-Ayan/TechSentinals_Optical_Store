/** @format */

import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { useAuthStore, useStoreStore } from "../store/store";
import Login from "../pages/auth/Login";
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
import LabOrders from "../pages/admin/LabOrders";
import Labs from "../pages/admin/Labs";
import LabDetail from "../pages/admin/LabDetail";
import Expenses from "../pages/admin/Expenses";
import Analyses from "../pages/admin/Analyses";
import Stores from "../pages/admin/Stores";
import StoreDetail from "../pages/admin/StoreDetail";
import AdminLoyalty from "../pages/admin/Loyalty";
import AdminLoyaltyCustomerDetail from "../pages/admin/LoyaltyCustomerDetail";
import AdminRepair from "../pages/admin/Repair";
import AdminCustomers from "../pages/admin/Customers";
import AdminCustomerDetail from "../pages/admin/CustomerDetail";
import Warehouse from "../pages/admin/Warehouse";
import StaffDetail from "../pages/admin/StaffDetail";
import BillTemplate from "../pages/admin/BillTemplate";
import Permissions from "../pages/admin/Permissions";
import PermissionRoute from "../components/shared/PermissionRoute";

// Shopkeeper imports
import ShopKeeperLayout from "../layouts/ShopKeeperLayout";
import ShopkeeperDashboard from "../pages/shopkeeper/Dashboard";
import Shopkeeper from "../pages/shopkeeper/Shopkeeper";

// Accountant imports
import AccountantLayout from "../layouts/AccountantLayout";
import AccountantDashboard from "../pages/accountant/Dashboard";
import AccountantSalesLedger from "../pages/accountant/SalesLedger";
import AccountantExpenses from "../pages/accountant/Expenses";
import AccountantCustomerDues from "../pages/accountant/CustomerDues";
import AccountantSupplierPayments from "../pages/accountant/SupplierPayments";
import AccountantPaymentCollection from "../pages/accountant/PaymentCollection";
import AccountantRefunds from "../pages/accountant/Refunds";
import AccountantProfitLoss from "../pages/accountant/ProfitLoss";
import AccountantReports from "../pages/accountant/Reports";
import AccountantStorePerformance from "../pages/accountant/StorePerformance";

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
    if (user.role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (user.role === "accountant") {
      return <Navigate to="/accountant/dashboard" replace />;
    } else {
      return <Navigate to="/shopkeeper" replace />;
    }
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

  if (user && user.role === "accountant") {
    return <Navigate to="/accountant/dashboard" replace />;
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
  const targetStore = selectedStore || stores[0] || { id: '1' };
  return <Navigate to={`/admin/store/${targetStore.id}/${path}`} replace />;
};

const LabDetailRedirect = () => {
  const { id } = useParams();
  const { selectedStore, stores } = useStoreStore();
  const targetStore = selectedStore || stores[0] || { id: '1' };
  return <Navigate to={`/admin/store/${targetStore.id}/labs/${id}`} replace />;
};

const RepairsRouteRedirect = () => {
  const { selectedStore, stores } = useStoreStore();
  const targetStore = selectedStore || stores[0];

  if (!targetStore) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to={`/admin/store/${targetStore.id}/repairs`} replace />;
};

const SuppliersRouteRedirect = () => {
  const { selectedStore, stores } = useStoreStore();
  const targetStore = selectedStore || stores[0];

  if (!targetStore) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to={`/admin/store/${targetStore.id}/suppliers`} replace />;
};

const LoyaltyRouteRedirect = () => {
  const { selectedStore, stores } = useStoreStore();
  const targetStore = selectedStore || stores[0];

  if (!targetStore) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to={`/admin/store/${targetStore.id}/loyalty`} replace />;
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

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        {/* Redirect /admin to /admin/dashboard */}
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="staff" element={<StaffRouteRedirect />} />
        <Route path="store/:storeId/staff" element={<Staff />} />
        <Route path="store/:storeId/staff/:staffId" element={<StaffDetail />} />
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
        <Route
          path="lab-orders"
          element={<StoreRouteRedirect path="lab-orders" />}
        />
        <Route path="store/:storeId/lab-orders" element={<LabOrders />} />
        <Route
          path="bill-template"
          element={<StoreRouteRedirect path="bill-template" />}
        />
        <Route path="store/:storeId/bill-template" element={<BillTemplate />} />
        <Route
          path="labs"
          element={<StoreRouteRedirect path="labs" />}
        />
        <Route path="store/:storeId/labs" element={<Labs />} />
        <Route path="labs/:id" element={<LabDetailRedirect />} />
        <Route path="store/:storeId/labs/:id" element={<LabDetail />} />
        <Route path="analyses" element={<Analyses />} />
        <Route path="warehouse" element={<Warehouse />} />
        <Route path="stores" element={<Stores />} />
        <Route path="stores/:storeId" element={<StoreDetail />} />

        {/* Expenses - Using store_id as requested */}
        <Route
          path="expenses"
          element={<StoreRouteRedirect path="expenses" />}
        />
        <Route path="store/:store_id/expenses" element={<Expenses />} />

        {/* Repairs */}
        <Route
          path="repairs"
          element={<RepairsRouteRedirect />}
        />
        <Route path="store/:storeId/repairs" element={<AdminRepair />} />

        {/* Loyalty Program */}
        <Route path="loyalty" element={<LoyaltyRouteRedirect />} />
        <Route path="store/:storeId/loyalty" element={<AdminLoyalty />} />
        <Route path="store/:storeId/loyalty/customer/:id" element={<AdminLoyaltyCustomerDetail />} />

        {/* Customers */}
        <Route
          path="customers"
          element={<StoreRouteRedirect path="customers" />}
        />
        <Route path="store/:storeId/customers" element={<AdminCustomers />} />
        <Route path="store/:storeId/customers/:customerId" element={<AdminCustomerDetail />} />
        
        {/* Permissions */}
        <Route path="permissions" element={<Permissions />} />
      </Route>

      {/* Shopkeeper Routes */}
      <Route path="/shopkeeper" element={<ShopKeeperLayout />}>
        {/* Redirect /shopkeeper to /shopkeeper/dashboard */}
        <Route index element={<Shopkeeper />} />
        <Route path="dashboard" element={<ShopkeeperDashboard />} />
        <Route path="analyses" element={<PermissionRoute permission="reports:read"><Analyses /></PermissionRoute>} />
        <Route path="customers" element={<PermissionRoute permission="customers:read"><AdminCustomers /></PermissionRoute>} />
        <Route path="customers/:customerId" element={<PermissionRoute permission="customers:read"><AdminCustomerDetail /></PermissionRoute>} />
        <Route path="inventory" element={<PermissionRoute permission="inventory:read"><Inventory /></PermissionRoute>} />
        <Route path="sales" element={<PermissionRoute permission="sales:read"><Sales /></PermissionRoute>} />
        <Route path="bill-template" element={<PermissionRoute permission="bill_settings:read"><BillTemplate /></PermissionRoute>} />
        <Route path="lab-orders" element={<PermissionRoute permission="prescriptions:read"><LabOrders /></PermissionRoute>} />
        <Route path="staff" element={<PermissionRoute permission="workers:read"><Staff /></PermissionRoute>} />
        <Route path="expenses" element={<PermissionRoute permission="expenses:read"><Expenses /></PermissionRoute>} />
        <Route path="repairs" element={<PermissionRoute permission="repairs:read"><AdminRepair /></PermissionRoute>} />
        <Route path="brands" element={<PermissionRoute permission="brands:read"><Brands /></PermissionRoute>} />
        <Route path="categories" element={<PermissionRoute permission="categories:read"><Categories /></PermissionRoute>} />
        <Route path="loyalty" element={<PermissionRoute permission="loyalty:read"><AdminLoyalty /></PermissionRoute>} />
        <Route path="loyalty/customer/:id" element={<PermissionRoute permission="loyalty:read"><AdminLoyaltyCustomerDetail /></PermissionRoute>} />
        <Route path="transactions" element={<PermissionRoute permission="transactions:read"><Transactions /></PermissionRoute>} />
        <Route path="warehouse" element={<PermissionRoute permission="inventory:read"><Warehouse /></PermissionRoute>} />
        <Route path="suppliers" element={<PermissionRoute permission="suppliers:read"><Suppliers /></PermissionRoute>} />
        <Route path="suppliers/:id" element={<PermissionRoute permission="suppliers:read"><SupplierDetail /></PermissionRoute>} />
      </Route>

      {/* Accountant Routes */}
      <Route path="/accountant" element={<AccountantLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AccountantDashboard />} />
        <Route path="sales-ledger" element={<AccountantSalesLedger />} />
        <Route path="expenses" element={<AccountantExpenses />} />
        <Route path="customer-dues" element={<AccountantCustomerDues />} />
        <Route path="supplier-payments" element={<AccountantSupplierPayments />} />
        <Route path="payment-collection" element={<AccountantPaymentCollection />} />
        <Route path="refunds" element={<AccountantRefunds />} />
        <Route path="profit-loss" element={<AccountantProfitLoss />} />
        <Route path="reports" element={<AccountantReports />} />
        <Route path="store-performance" element={<AccountantStorePerformance />} />
      </Route>

      {/* Fallback root redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRouter;
