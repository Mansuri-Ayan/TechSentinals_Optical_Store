# Frontend Module Catalog

`Frontend/src/` — React 19 + Vite, React Router 7, TanStack Query, Zustand. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the folder-structure/layering overview and [MODULES_BACKEND.md](./MODULES_BACKEND.md) for the backend counterpart.

## 1. Route Map

Guards found in `Frontend/src/routes/AppRouter.jsx`:
- **`GuestRoute`** — only unauthenticated users; redirects logged-in users to their role's home (`admin`→`/admin/dashboard`, `accountant`→`/accountant/dashboard`, else→`/shopkeeper`).
- **`PrivateRoute`** — requires `isAuthenticated`; redirects to `/login` otherwise. Wraps `/`.
- **`AdminRoute`** — requires `isAuthenticated` **and** `user.role === "admin"`; redirects non-admins to `/`. Wraps the entire `/admin` layout subtree.
- **`PermissionRoute`** (`components/shared/PermissionRoute.jsx`) — fine-grained permission gate used per-route inside `/shopkeeper`; checks `useHasPermission(permission)` and redirects to the caller's dashboard if the permission is missing. **The `/shopkeeper` route group itself has no role/layout-level guard** — access control there is delegated entirely to per-route `PermissionRoute` wrappers.
- **`/accountant` has no visible route guard at all** — nothing stops a non-accountant from navigating to `/accountant/*` directly if they know the URL, beyond the login-redirect logic steering accountants there by default.
- A cluster of `*RouteRedirect` components (`StaffRouteRedirect`, `InventoryRouteRedirect`, `BrandsRouteRedirect`, `CategoriesRouteRedirect`, `TransactionsRouteRedirect`, `StoreRouteRedirect`, `LabDetailRedirect`, `RepairsRouteRedirect`, `SuppliersRouteRedirect`, `LoyaltyRouteRedirect`) rewrite legacy non-store-scoped admin URLs into the store-scoped form using the selected store from `useStoreStore`.

### `/login` (public)
| Path | Component | Access |
|---|---|---|
| `/login` | `pages/auth/Login.jsx` | `GuestRoute` |
| `/` | `HomeRoute` (inline redirect logic) | `PrivateRoute` — redirects by role |

### `/admin/*` — layout `AdminLayout`, guard `AdminRoute` (role must be `admin`)
26 routed pages: `dashboard`, `store/:storeId/staff` (+`staff/:staffId` detail), `store/:storeId/inventory` (+`manage/:productId`), `store/:storeId/brands`, `store/:storeId/categories`, `store/:storeId/transactions`, `store/:storeId/suppliers` (+`:id` detail), `stores` (+`:storeId` detail — **registered twice in `AppRouter.jsx`**, lines 287-288 and 318-319), `sales` (not store-scoped), `store/:storeId/exchanges`, `store/:storeId/deadstock`, `store/:storeId/lab-orders`, `store/:storeId/bill-template`, `store/:storeId/labs` (+`:id` detail), `analyses` (not store-scoped), `warehouse` (not store-scoped — central warehouse), `store/:store_id/expenses` (**note the inconsistent param name `store_id` vs. `storeId` used everywhere else**), `store/:storeId/repairs`, `store/:storeId/loyalty` (+`customer/:id` detail), `store/:storeId/customers` (+`:customerId` detail), `permissions` (not store-scoped — RBAC admin console). Every non-store-scoped legacy path (`staff`, `inventory`, `brands`, etc.) has a matching `*RouteRedirect` that 302s into the store-scoped form.

### `/shopkeeper/*` — layout `ShopKeeperLayout`, guard: **none at layout level**, per-route `PermissionRoute`
24 routed pages, almost all gated by a specific permission string (e.g. `inventory:read`, `sales:read`, `customers:read`, `exchanges:read`, `deadstock:read`, `workers:read`, `expenses:read`, `repairs:read`, `brands:read`, `categories:read`, `loyalty:read`, `transactions:read`, `suppliers:read`, `labs:read`, `bill_settings:read`, `prescriptions:read`, `reports:read`). `/shopkeeper` (index, the POS checkout wizard) and `dashboard` have no permission gate.

**Notable pattern**: most `/shopkeeper/*` routes render the **exact same admin page components** (`Inventory`, `Sales`, `Exchanges`, `Brands`, `Categories`, `Loyalty`, `Transactions`, `Warehouse`, `Suppliers`, `SupplierDetail`, `Labs`, `LabDetail`, `Staff`, `Expenses`, `Repair`, `BillTemplate`, `LabOrders`, `Analyses`, `Customers`, `CustomerDetail`) rather than shopkeeper-specific variants — these components branch internally on route/role context to adjust available actions. Only `Dashboard.jsx`, `Deadstock.jsx`, `Shopkeeper.jsx`, and the unrouted `ShopkeeperWizard.jsx`/`EyeTest.jsx` are shopkeeper-exclusive files. **This means the existing frontend already leans heavily on permission-based route gating for the "shopkeeper" side** — relevant groundwork for the Phase 4 plan (the gap is more likely inside individual pages' button-level logic and on the backend, not at the route layer).

### `/accountant/*` — layout `AccountantLayout`, guard: **none**
10 routed pages (`dashboard`, `sales-ledger`, `expenses`, `customer-dues`, `supplier-payments`, `payment-collection`, `refunds`, `profit-loss`, `reports`, `store-performance`).

**8 additional page files exist on disk but are not registered in any route**: `BalanceSheet.jsx`, `BankBook.jsx`, `CashBook.jsx`, `ChartOfAccounts.jsx`, `GeneralLedger.jsx`, `GstReports.jsx`, `JournalEntries.jsx`, `TrialBalance.jsx`, plus a second, unrouted `Transactions.jsx` — a more complete double-entry-bookkeeping module built ahead of routing/backend wiring.

**Major finding, carried into BUG_AUDIT.md**: every accountant page — routed or not — is built against **mock data** (`data/accountantData.js`, 764 lines, `MOCK_SALES_LEDGER`/`MOCK_EXPENSES`/`MOCK_CUSTOMER_DUES`/`MOCK_SUPPLIER_PAYMENTS`/`MOCK_TRANSACTIONS`) via `hooks/useCalculations.js` and `hooks/useTable.js` — both are **generic local-state utilities, not react-query wrappers**. No file under `pages/accountant/` imports anything from `api/`. **The entire accountant module, routed and unrouted, is a UI-only prototype not yet connected to the backend**, unlike admin/shopkeeper pages which are fully wired through domain hooks + `api/*.api.js` + TanStack Query.

### `pages/auth/`, `pages/user/`, `pages/shared/` — mostly dead/unrouted
- `pages/auth/Login.jsx` (205 lines) — the only routed file in this group.
- `pages/auth/ProfileHome.jsx` (154 lines) — exists but not wired into any route.
- `pages/auth/Dashboard.jsx` — empty stub (`// Removed`).
- `pages/user/Home.jsx` — empty file; `layouts/UserLayout.jsx` also exists but is never imported by `AppRouter.jsx` — the "user" portal appears scaffolded but never built out.
- `pages/shared/Dashboard.jsx` — empty file, not routed.
- `pages/shopkeeper/ShopkeeperWizard.jsx` (257 lines, **not routed**) — an alternate/newer checkout wizard driven by `store/cartStore.js`'s wizard state, appears to be a work-in-progress successor to `Shopkeeper.jsx`.
- `pages/shopkeeper/EyeTest.jsx` (1 line, **not routed**) — stub (`// Removed`).

## 2. Page-by-Page Catalog (summary — see route map above for paths)

**Admin** (26 files, all routed): `Dashboard` (820 lines, executive KPIs) · `Staff`/`StaffDetail` (760/337, staff directory & profile) · `Inventory` (1571, core product/stock catalog — largest single-purpose admin page) · `ManageUnits` (792, serialized-unit management + barcode export) · `Brands`/`Categories` (366/598, catalog CRUD) · `Transactions` (1270, financial/inventory ledger) · `Suppliers`/`SupplierDetail` (592/747) · `Stores`/`StoreDetail` (481/274, branch directory + tabbed overview) · `Sales` (487) · `Exchanges` (1717, product-exchange wizard — **largest file in the frontend**) · `Expenses` (661) · `LabOrders`/`Labs`/`LabDetail` (553/395/318) · `Analyses` (608, deeper analytics than the dashboard) · `Warehouse` (980, central stock independent of stores, transfer workflows) · `Loyalty`/`LoyaltyCustomerDetail` (364/196) · `Repair` (971, repair job pipeline) · `Customers`/`CustomerDetail` (352/1208, customer 360 view — 2nd-largest admin page) · `BillTemplate` (581, invoice design) · `Permissions` (416, RBAC admin console).

**Shopkeeper** (5 files): `Shopkeeper.jsx` (556, primary POS/checkout wizard — business-critical) · `Dashboard.jsx` (476, store-level ops) · `Deadstock.jsx` (851, reuse dead stock into active inventory) · `ShopkeeperWizard.jsx`/`EyeTest.jsx` (unrouted, see above).

**Accountant** (18 files, 10 routed — see mock-data finding above): `Dashboard`, `SalesLedger`, `Expenses`, `CustomerDues`, `SupplierPayments`, `PaymentCollection`, `Refunds`, `ProfitLoss`, `Reports`, `StorePerformance`, plus 8 unrouted bookkeeping pages (`BalanceSheet`, `BankBook`, `CashBook`, `ChartOfAccounts`, `GeneralLedger`, `GstReports`, `JournalEntries`, `TrialBalance`) and a second unrouted `Transactions`.

## 3. `components/` Subfolder Inventory

- **`components/admin/`** — entity CRUD modals (Brand/Category/Lab/Expense/Inventory/Staff/Store add-edit), stock-transfer modals, detail views (`InventoryDetailDrawer`, `CategoryDetailModal`, `ProductViewModal`), `Sidebar.jsx`, `SupplierSelect.jsx`. Sub-domains: `admin/permissions/` (`PermissionMatrix`, `PermissionTemplates`, `RolePermissions`, `StaffPermissions` — drives `Permissions.jsx`), `admin/stores/` (per-store tabs: Overview/Staff/Inventory/Sales/Expenses/Suppliers/Customers/Reports + `StoreSwitcher`), `admin/suppliers/` (6 supplier-related modals).
- **`components/shopkeeper/`** — two parallel checkout flows: classic step components (`CustomerDetailsStep`, `ProductSelectionStep`, `PaymentStep`, `CompletedStep`, `StepIndicator` — used by `Shopkeeper.jsx`) and newer wizard components (`WizardStepper`, `WizardCustomerStep`, `WizardProductStep`, `WizardPaymentStep` — used by unrouted `ShopkeeperWizard.jsx`); product browsing, cart, customer/worker modals, prescription forms, manager tooling, `ShopkeeperSidebar.jsx`.
- **`components/loyalty/`** — shared by admin and shopkeeper loyalty pages: stat cards, tier card, distribution/growth charts, customer card/table, history table, progress/timeline, rewards card, config modals.
- **`components/accountant/`** — minimal: only `AccountantSidebar.jsx`. All page content is built inline per-page rather than decomposed — consistent with its prototype/mock-data status.
- **`components/customer/`** — **empty folder**, likely reserved for a future customer-facing portal that hasn't been built.
- **`components/shared/`** — generic primitives reused across all role modules: `DataTable`, `Pagination`, `FormModal`, `ConfirmationModal`, `FilterBar`, `SearchBar`, `StatusBadge`, `EmptyState`, `LoadingState`, `DetailDrawer`, `Charts`, `NotificationBell`, and the two access-control components: `PermissionGuard.jsx` (conditionally render UI by permission) and `PermissionRoute.jsx` (route-level guard).
- **`components/Footer/`, `components/Input/`, `components/Navbar/`** — top-level shared UI (`Footer.jsx` unused/dead, `Input.jsx` empty/dead, `Navbar.jsx`).

## 4. State Management & Hooks/API Pattern

**Zustand** (`store/store.js`, `store/cartStore.js`): `useAuthStore` (`user`/`isAuthenticated`/`isLoading`) is the single source of truth for the logged-in user and every route guard in `AppRouter.jsx`. `useStoreStore` (`stores`/`selectedStore`, persisted to `localStorage`) tracks the multi-branch context and drives the `*RouteRedirect` components and `useCalculations.js`'s store filtering. `useCartStore` holds POS cart state plus a newer, parallel "wizard" state shape (`wizardStep`/`wizardCustomer`/`wizardPrescription`) used only by the unrouted `ShopkeeperWizard.jsx`.

**Hooks/API pattern**: `api/<domain>/<domain>.api.js` files are thin axios wrappers over the shared `lib/axios.js` client, one function per REST call. Several domains provide parallel `shopkeeper*Api` variants of the same calls, selected at runtime by the hook based on `location.pathname` (`isPathAdmin` checks). `hooks/use<Domain>.js` files wrap these in TanStack Query (`useQuery`/`useMutation`/`useQueryClient`), standardizing query keys, `staleTime`, and toast notifications on mutation success/error — the dominant pattern across admin and shopkeeper pages (which share hooks/components, since shopkeeper routes largely reuse admin page components gated by `PermissionRoute`). **The accountant module is the outlier**: its pages consume `hooks/useTable.js` (generic client-side search/filter/sort/paginate, no network call) and `hooks/useCalculations.js` (derives figures from static mock arrays, filtered by the zustand-selected store) instead of `api/`+react-query — confirming the accounting UI was built ahead of backend integration.
