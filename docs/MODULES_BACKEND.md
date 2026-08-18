# Backend Module Responsibility Catalog

Scope: `Backend/routes/*.py` → `Backend/apis/<module>/*.py` → `Backend/services/*.py`. Models are documented separately in [DATA_MODEL.md](./DATA_MODEL.md).

## How auth dependencies work (read this first)

Three dependency patterns gate endpoints in this codebase:

- **`get_current_user`** — accepts *any* authenticated role (Admin, Manager, Worker, Optician, Accountant, SuperAdmin). Used for self-service endpoints (`/auth/me`, notifications, `/permissions/me`) or where the handler does its own manual role/scope check afterward.
- **`get_current_admin`** — requires the caller to *be* an `Admin` row (tenant owner). No store-staff role can pass this dependency.
- **`require_permission(module, action)`** (or the newer `require_permission("module:action", "other:action")` OR-form) — resolves the caller's role, and:
  - **`SUPER_ADMIN`, `ADMIN`, and `ACCOUNTANT` actor types always pass, unconditionally** — the permission table is never even consulted for them (`core/deps.py:250`). Granular permissions (`stores:read`, `sales:create`, etc.) only actually constrain **Manager / Worker / Optician** users.
  - For those constrained roles, the dependency checks the admin's per-role/per-user permission overrides via `services/permission_service.py`.

Keep this in mind when reading "auth" in the tables below: a `require_permission('x','y')` endpoint is **always open to the tenant Admin**, and only conditionally open to lower roles.

---

## 1. Core / Staff

### auth — `/auth`
Handles staff login (role-scoped), JWT access/refresh token issuance and rotation, cookie-based session management, and the "who am I" identity endpoint. Supports four login roles: admin, manager, worker, optician (SuperAdmin is not reachable through this endpoint — see AUTH_FLOW.md §2).

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/auth/login/{role}` | Authenticate by email/password for a given role; issues access+refresh JWTs, sets HttpOnly cookies | None (public) |
| POST | `/auth/refresh` | Exchange a refresh token (cookie or body) for a new token pair; old refresh token is revoked (single-use) | None (public — trust is via possession of a valid refresh token) |
| POST | `/auth/logout` | Revoke the refresh token and clear auth cookies | `get_current_user` |
| GET | `/auth/me` | Return the authenticated user's profile (role-specific schema) | `get_current_user` |

Service(s): `services/auth_service.py`, `services/superadmin_service.py` (email lookup, though SuperAdmin isn't wired into `/login/{role}`).

### store — `/stores`
CRUD for store branches under a tenant, plus a combined staff directory and per-store analytics overview. `manager_router`/`worker_router`/`optician_router` (below) also mount under `/stores`, sharing one URL namespace.

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/stores/` | Create a store under the current admin | `require_permission('stores','create')` |
| GET | `/stores/` | List stores | `get_current_user` + manual in-handler check |
| GET | `/stores/{store_id}` | Get a single store | `get_current_user` + manual in-handler check |
| PUT | `/stores/{store_id}` | Update a store | `require_permission('stores','update')` |
| DELETE | `/stores/{store_id}` | Soft-delete a store | `require_permission('stores','delete')` |
| GET | `/stores/{store_id}/staff` | List all staff in a store | `get_current_user` + manual OR-check across role permissions |
| GET | `/stores/{store_id}/overview` | Aggregated store stats for dashboard | `require_permission('stores','read')` |

Service(s): `services/store_service.py`, `services/staff_service.py`, `services/permission_service.py` (used directly, not via `require_permission`).

### worker / optician / manager — `/stores` (nested)
Near-identical CRUD for each store-staff type.

| Method | Path pattern | Auth |
|---|---|---|
| POST | `/stores/{store_id}/<workers|opticians|managers>` | `require_permission('<type>','create')` |
| GET | `/stores/{store_id}/<type>` (list) | `require_permission('<type>','read')` |
| GET | `/stores/<type>/{id}` | `require_permission('<type>','read')` |
| PUT | `/stores/<type>/{id}` | `require_permission('<type>','update')` |
| DELETE | `/stores/<type>/{id}` | `require_permission('<type>','delete')` |

Service(s): `services/worker_service.py`, `services/optician_service.py`, `services/manager_service.py`, all backed by `services/store_service.py` for tenant-scoping.

---

## 2. Inventory Management

### category — `/categories`
Two-level taxonomy (categories + nested subcategories), scoped per tenant/store. Full CRUD on both levels, `require_permission('categories', <action>)` throughout.

### brand — `/brands`
CRUD for product brands, scoped per tenant/store. `require_permission('brands', <action>)` throughout.

### product — `/products`
Master catalog (frames/lenses/accessories) with type-specific detail payloads. Full CRUD, `require_permission('products', <action>)` throughout. Service: `services/product_service.py`.

### inventory — `/inventory`
Stock-on-hand per owner (Admin warehouse or Store): low-stock alerts, cross-store "universal" search, purchase-batch history, serialized per-unit tracking, barcode/label PDF generation. All endpoints `require_permission('inventory', <action>)`. Service(s): `services/inventory_service.py`, `services/product_unit_service.py` (unit lifecycle: generate SKUs, assign/restore/transfer/damage/lose/sell/link-to-repair), `services/barcode_service.py`.

### transfer — `/transfers`
Direct stock-movement operations (as opposed to the pending-approval flow below): warehouse purchases, admin↔store/store↔store transfers, damage/loss/manual-sale/return adjustments, unified history feed. All `require_permission('inventory', <action>)`. Service: `services/transfer_service.py`.

---

## 3. Supplier Management

### supplier — `/suppliers`
Supplier master records, store-linkage, and each supplier's product catalogue (price, MOQ).

**⚠️ Permission-action mismatch flag**: `DELETE /suppliers/{id}` is gated by `suppliers:update` (not `delete`), and every mutating endpoint under `/suppliers/{id}/stores*` and `/suppliers/{id}/products*` (`POST`/`DELETE` link, `POST`/`PUT` catalogue entry) is gated by `suppliers:read` rather than a matching `create`/`update` permission. Since Admin/Accountant always bypass this check anyway, the practical impact is limited to Manager/Worker/Optician users who might be granted only `suppliers:read` but would then unexpectedly be able to create/delete supplier-store links and catalogue entries. Service: `services/supplier_service.py`.

### purchase_order — `/purchase-orders`
PO lifecycle: header + line items, cancellation, goods receipt (drives inventory transactions), supplier payment recording/history.

**⚠️ Same pattern**: `POST /purchase-orders/{id}/receive` (goods receipt — stock-affecting) and `POST /purchase-orders/{id}/payments` (financial write) are both gated by `purchase_orders:read`, not `update`/`create`. Service: `services/purchase_order_service.py`.

---

## 4. Sales

### customer — `/customers`
Customer master data (incl. "linked members"/family accounts for shared loyalty), POS quick-create, and a manual/legacy order-creation endpoint. Mix of `require_permission("customers", <action>)` and OR-form permissions like `require_permission("customers:create","sales:create")`. Service(s): `services/customer_service.py`, `services/customer_link_service.py`, `services/prescription_service.py`.

### prescription — `/prescriptions`
Optical prescription records; creating a new one auto-deactivates the previous active one.

**⚠️ Flag**: `DELETE /prescriptions/{id}` is gated by `prescriptions:update` — there is no `prescriptions:delete` permission checked at all. Service: `services/prescription_service.py`.

### sale — `/sales`
The POS transaction core: line items, split/instalment payments, cancellation with inventory rollback, partial returns, HTML bill generation.

**⚠️⚠️ Likely functional bug**: `POST /sales/{sale_id}/partial-return` (`apis/sale/update.py`) deviates from every other endpoint in two ways: (1) its permission dependency is `require_permission("SALES_MANAGE")` — a bare string with no `module:action` form, unlike the `"sales","update"` convention used everywhere else, meaning it's checking a permission key that likely doesn't exist (non-Admin/Accountant callers can probably never pass it); and (2) the handler awaits `_get_user_admin_id(current_user, db)`, but the imported `_get_user_admin_id` (from `apis/customer/read.py`) is a **synchronous, single-argument** function — awaiting it with two arguments will raise a `TypeError` at request time. **This endpoint should be functionally tested before being relied on** — flagged for BUG_AUDIT.md. Service(s): `services/sale_service.py`, `services/product_unit_service.py`, `services/bill_service.py`, `services/snapshot_service.py`.

---

## 5. Expenses

### expense — `/expenses`
Expense tracking (store or head-office level) with categorization and an admin approval/rejection workflow. Category management endpoints require `get_current_admin` directly (bypassing the permission system entirely); expense CRUD uses `require_permission("expenses", <action>)`; approve/reject require `get_current_admin`. Service: `services/expense_service.py`.

---

## 6. Reports & Analysis

### report — `/reports`
Read-only aggregation endpoints: central dashboard, deep-dive "analyses," per-store report, per-staff performance report. All `require_permission('reports','read')`. Service: `services/report_service.py` (reads across sale/expense/inventory/product data — no independent report model).

---

## 7. Repair & Services

### repair — `/repairs`
Repair/service job tracking (walk-in or registered customers), optionally linked to the originating sale for warranty checks. Full CRUD + status-transition endpoint, `require_permission("repairs", <action>)` throughout. Service: `services/repair_service.py`.

### shopkeeper_brand / shopkeeper_category — `/shopkeeper/brands`, `/shopkeeper/categories`
Parallel shopkeeper-facing URL surfaces over the **same** brand/category data and services as `/brands`/`/categories` — defined inline in their router files (no separate `apis/shopkeeper_brand/` package). Same permission checks as their admin-prefixed counterparts.

### api_transactions (Admin) — `/api/transactions`
The approval-based stock-transfer ledger as seen by Admin: cross-store visibility plus approve/reject of pending transfer requests raised by store staff. List/create endpoints require `get_current_admin`; approve/reject require `require_permission('transactions','approve')`. Service: `services/transfer_service.py`.

### api_shopkeeper_transactions (store staff) — `/api/shopkeeper/transactions`
Store-side mirror: request/push/purchase/damage/loss/sale/return stock actions, most entering a pending state requiring Admin approval. The list endpoint explicitly blocks Admin callers (403 if `isinstance(current_user, Admin)`). All `require_permission('transactions', <action>)`. Service: `services/transfer_service.py`.

### notification — `/api/notifications`
Per-user notification inbox. **No dedicated service module** — the router queries the `Notification` model directly. `get_current_user` throughout; mark-as-read checks ownership before allowing the update.

### loyalty (Admin) & shopkeeper_loyalty (Manager)
Configurable points program: per-store config, per-category overrides, stats/trends/tier-distribution, customer point ledgers, pre-sale points calculator, manual point adjustment.

**Structural note**: `routes/loyalty_router.py` and `routes/shopkeeper_loyalty_router.py` both mount the *same* underlying `apis/loyalty/*.py` router objects — each endpoint's full path is hard-coded in the handler decorators, not derived from which router file includes it, so the two-router split is purely for OpenAPI tag/grouping and doesn't change which paths are reachable.

**⚠️ Multiple write-gated-by-read flags**: `PUT /admin/store/{id}/loyalty/config`, `PUT /admin/.../loyalty/categories/{id}`, and `POST /admin/store/{id}/loyalty/adjust` (a money-like write operation) are all gated by `loyalty:read` rather than `update`/`manage` — inconsistent with the parallel shopkeeper-side endpoints, which correctly require `loyalty:manage`/`loyalty:update`. Service: `services/loyalty_service.py`.

### lab — `/labs`
External lab partners and orders currently assigned to each. Full CRUD, `require_permission("labs", <action>)`. Service(s): `services/lab_service.py`, `services/sale_service.py` (read-only reuse for the orders list).

### exchange — `/exchanges`
Atomically returns an old sold item and creates a new sale for replacement item(s); supports cancellation (reverses stock) and HTML receipt. `require_permission("exchanges", <action>)` throughout. Service(s): `services/exchange_service.py`, `services/bill_service.py`.

### deadstock — `/deadstock`
Slow-moving/dead inventory tracking, with individual or batch "reuse" back into active inventory, and a POS-facing endpoint for deadstock still available to sell. `require_permission("deadstock", <action>)`, except the POS endpoint which correctly uses `sales:create`. Service: `services/deadstock_service.py`.

---

## 8. Permissions & SuperAdmin

### permission (tier2 / tier3 / staff_list / me)
The RBAC configuration surface: self-service "what can I do," admin-facing staff directory, per-role default overrides (tier2), per-individual-staff overrides (tier3). Resolution order: **user override → admin role override → global role default** (see AUTH_FLOW.md §6 / DATA_MODEL.md §2). `GET /permissions/me` uses `get_current_user`; every admin-configuration endpoint uses `get_current_admin`. Service: `services/permission_service.py`.

### superadmin — `/superadmin/admins`
Platform-level provisioning of new tenant accounts. Only one endpoint exists today (`POST /superadmin/admins`).

**Note**: there is no dedicated `get_current_superadmin` dependency — authorization is enforced by a manual `isinstance(current_user, SuperAdmin)` check inside the handler after generic `get_current_user` resolution, inconsistent with the dependency-injection style used everywhere else in the app, and easy to accidentally omit if this handler is ever copied as a template. `services/superadmin_service.py` exists but is unused by this router (likely consumed by `auth_service.py` for login role-resolution, if/when SuperAdmin login is wired up — see the AUTH_FLOW.md gap).

### bill_settings — `/bill-settings`
Per-store bill/invoice customization, separate Admin (`get_current_admin`) and Shopkeeper-facing (`require_permission`) endpoints over the same `BillSettings` row (auto-created on first read if missing). No dedicated service layer — raw SQLAlchemy in the router.

---

## Cross-cutting observations (carried into BUG_AUDIT.md)

1. **Admin/Accountant bypass all `require_permission` checks** — every `⚠️` flag above involving a "wrong" permission action only actually matters for Manager/Worker/Optician users; it has zero effect on Admin or Accountant callers (`core/deps.py:250`).
2. **No endpoint across the ~24 modules surveyed is unauthenticated** except the two identity-bootstrapping auth endpoints (expected, since no token exists yet at that point).
3. **Two duplicate route surfaces exist by design**: `/brands` ≡ `/shopkeeper/brands`, `/categories` ≡ `/shopkeeper/categories` (same service/data, different URL prefix for frontend routing convenience). Likewise `loyalty_router`/`shopkeeper_loyalty_router` both expose the full path set.
4. **Modules with no dedicated `services/*.py` file**: `notification` and `bill_settings` — both do direct SQLAlchemy access from the router layer, inconsistent with the rest of the codebase's routes→apis→services layering.
5. **Likely runtime bug**: `POST /sales/{sale_id}/partial-return` — malformed permission key plus an `await` on a non-async, wrong-arity helper function. Needs a functional test pass — flagged as a concrete Phase 2 investigation target.
6. **Multiple endpoints gate a write operation with a `:read` permission** instead of the matching `create`/`update`/`delete` action (suppliers, purchase orders, loyalty admin endpoints) — only affects Manager/Worker/Optician callers granted a narrow `:read`-only permission, but worth a deliberate audit pass since it undermines the granularity the permission system is meant to provide.
