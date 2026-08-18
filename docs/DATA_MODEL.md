# Data Model

Source: `Backend/models/` (SQLAlchemy 2.x async ORM, PostgreSQL). All primary keys are `BigInteger` auto-increment unless noted.

**Recurring architectural patterns to know before reading the tables below:**
- **Multi-tenancy anchor**: almost every table carries `admin_id` (the "business") and, where relevant, `store_id` (the specific branch). This is the tenant boundary everything traces back to.
- **Soft delete**: `Admin`, `Store`, `Manager`, `Worker`, `Optician`, `Accountant`, `SuperAdmin`, `Customer`, `Supplier`, `Role`, `Expense` all use a nullable `deleted_at` timestamp (`NULL` = active) instead of hard deletes. Most catalog/config tables (`Product`, `Brand`, `Category`, etc.) instead use a boolean `is_active` flag — the two soft-delete idioms coexist and are **not** interchangeable.
- **Polymorphic "type + id" columns without real FK constraints**: several tables reference "whichever staff/owner table applies" via an `Enum` discriminator column plus a plain `BigInteger` id column with **no `ForeignKey()` constraint** (e.g. `Inventory.owner_type/owner_id`, `Sale.sold_by_type/sold_by_id`, `Expense.recorded_by_id`). Referential integrity for these is enforced only in application code — see BUG_AUDIT.md.
- **Snapshot pattern**: `ProductSnapshot` is an append-only, never-updated copy of product data, referenced by `SaleItem`, `PurchaseOrderItem`, and `InventoryTransaction` so historical invoices/POs aren't corrupted by later price/name edits on the live `Product`.
- **Two coexisting permission systems**: the legacy `Role` table (a simple FK from `Admin`/`Manager`/`Worker`/`Optician`) still exists alongside the newer, granular "V2" RBAC system (`Permission`, `GlobalRolePermission`, `AdminRolePermissionOverride`, `UserPermissionOverride`). Both are live in the schema simultaneously — see AUTH_FLOW.md §6.

---

## 1. Identity & Staff

`Admin` is the top-level tenant (one business/optical-store chain); `Store` is a branch under an `Admin`; `Manager`/`Worker`/`Optician`/`Accountant` are staff scoped to a `Store` (accountants can also be business-wide). `SuperAdmin` sits outside the tenant hierarchy and administers the platform. `Role` is the legacy coarse role label attached to most staff types.

### `admins`
One optical-store business/tenant.
- **Key columns**: `business_name`, `owner_first_name`/`owner_last_name`, `email` (unique, login id), `phone` (unique), `password_hash`, `gst_number`, `pan_number`, address fields, `role_id` (FK), `status` (enum `AdminStatus`: `ACTIVE`/`INACTIVE`/`SUSPENDED`), `last_login_at`.
- **Relationships**: owns `Store`, `RefreshToken`, `Category`, `Brand`, `Lab`, `Product`, `Supplier`, `Customer`, `Sale`, `PurchaseOrder`, `ExpenseCategory`, `Expense`, `Repair`, `Accountant`, `AdminRolePermissionOverride`, `UserPermissionOverride` (all cascade delete-orphan); FK → `roles.id` (`RESTRICT`).
- Soft-delete via `deleted_at`.

### `super_admins`
Platform-level operator, entirely outside the tenant hierarchy — administers `GlobalRolePermission` defaults for the whole platform.
- **Key columns**: name fields, `email` (unique), `password_hash`, `status` (enum `SuperAdminStatus`), `last_login_at`.
- No `admin_id` — the one identity table not scoped to a tenant. Soft-delete via `deleted_at`.

### `stores`
A physical branch/outlet belonging to an `Admin`.
- **Key columns**: `store_name`, `store_code` (unique), `email`, `phone`, address fields, `gst_number`, `is_active`.
- **FKs**: `admin_id` → `admins.id` (`CASCADE`).
- **Relationships**: `workers`, `opticians`, `managers` (cascade); `inventories` (**viewonly**, polymorphic `owner_id`/`owner_type` join, not a real FK); `supplier_links`, `purchase_orders`, `sales`, `customers`, `repairs`; `expenses` (viewonly, same polymorphic pattern); `loyalty_config` (1:1), `category_loyalties`.
- Soft-delete via `deleted_at`.

### `roles`
Legacy simple role label (e.g. "admin", "manager"), referenced by staff FK.
- **Key columns**: `role` (unique, indexed). No columns beyond the name — real permission logic now lives in the RBAC v2 tables (§2), making this table effectively a legacy label. Soft-delete via `deleted_at`.

### `managers` / `workers` / `opticians`
Store-level staff accounts, nearly identical shape: name fields, `email` (unique, nullable), `phone` (unique, required), `password_hash`, `employee_code` (unique), `pf_number`, `joining_date`, `is_active`, `last_login_at`.
- **FKs**: `store_id` → `stores.id` (`CASCADE`); `role_id` → `roles.id` (`RESTRICT`).
- `opticians` additionally has `qualification` (e.g. "B.Optom").
- All soft-delete via `deleted_at`; all have `refresh_tokens` relationship (cascade delete-orphan).

### `accountants`
Finance-focused staff, can be business-wide (`store_id = NULL`) or store-scoped.
- **Key columns**: `admin_id`, `store_id` (nullable — NULL = business-level accountant), name fields, `email`/`phone` (unique), `password_hash`, `employee_code` (unique), `is_active`.
- **FKs**: `admin_id` → `admins.id` (`CASCADE`); `store_id` → `stores.id` (`SET NULL`).
- Unlike Manager/Worker/Optician, **no `role_id` FK** — role is implicit. Soft-delete via `deleted_at`.

---

## 2. Permissions / RBAC (the "V2" system)

Three-tier waterfall, resolved by `services/permission_service.has_permission()` (see AUTH_FLOW.md §6): **`GlobalRolePermission`** (SuperAdmin's platform default per role) → **`AdminRolePermissionOverride`** (one Admin's business-wide default for a role) → **`UserPermissionOverride`** (one specific person). Absence of a row at a tier means "fall through to the next tier," not "deny." `Permission` is the catalog all three tiers point at.

### `permissions`
The catalog of grantable actions. `module`, `action`, `key` (unique, e.g. `"module:action"`), `display_name`, `description`, `is_dangerous`, `is_active`. `UniqueConstraint(module, action)`. No `admin_id` — platform-wide, tenant-agnostic catalog.

### `global_role_permissions`
SuperAdmin-set platform default: is `role_type` granted `permission` by default. `role_type` enum `PermissionRoleType` = `ADMIN, MANAGER, WORKER, OPTICIAN, ACCOUNTANT` (SuperAdmin deliberately excluded — always full access). `is_granted` (default `false`). `UniqueConstraint(role_type, permission_id)`. Final fallback tier.

### `admin_role_permission_overrides`
One Admin's own default for an entire role type within their business (e.g. "all MY Workers can do X by default"). Same `role_type` enum, never applies to `role_type=ADMIN`. `UniqueConstraint(admin_id, role_type, permission_id)`. Middle tier.

### `user_permission_overrides`
A permission explicitly set for one specific person, overriding both tiers above. `user_type` (enum `PermissionUserType`, same 5 values), `user_id` (polymorphic, **no FK**), `is_granted`, `granted_by_id` (**no FK**), `set_at`. `UniqueConstraint(user_type, user_id, permission_id)`. `admin_id` FK for tenant scoping.

---

## 3. Catalog / Products

`Category` → `Subcategory` → `Product` form the classification hierarchy; `Brand` is a cross-cutting attribute. `Product` is the base row for every sellable item; `FrameProduct`/`LensProduct`/`AccessoryProduct` are 1:1 extension tables holding type-specific attributes. `ProductSnapshot` is a denormalized, append-only historical copy used by transactional tables.

### `categories` / `subcategories` / `brands`
Classification tables. `categories`/`brands` are `admin_id`-scoped with optional `store_id` (nullable = admin/warehouse-level). `subcategories` nest under `category_id` (`CASCADE`).

### `products`
The base catalog row. `sku` (unique, indexed, Python-level `@validates` normalization — alnum-only, uppercased — **not a DB-level constraint**), `barcode` (unique, nullable), `name`, `cost_price`, `selling_price`, `discount_percent`, `warranty_months`, `image_url`, `is_active`.
- **FKs**: `admin_id` (`CASCADE`); `category_id` (`RESTRICT`); `subcategory_id` (`SET NULL`); `brand_id` (`SET NULL`).
- 1:1 (cascade delete-orphan) to `frame_product`/`lens_product`/`accessory_product`.
- **Bug flag** (BUG_AUDIT.md): `sku`/`barcode` uniqueness is **global**, not scoped per `admin_id` — will collide across unrelated tenants.

### `frame_products` / `lens_products` / `accessory_products`
1:1 type-specific extensions of `products` (`product_id` FK, `CASCADE`, **unique** — enforces 1:1). Frame: `frame_type`, `shape`, `material`, `color`, `lens_width`, `bridge_width`, `temple_length`, `gender`, `age_group`. Lens: `lens_type`, `material`, `index_value`, `coating`, `tint_color`, `uv_protection`, `blue_cut`, `photochromic`, `polarized`. Accessory: `accessory_type`, `material`, `color`, `size`.

### `product_snapshots`
Frozen, write-once copy of a product's full details captured at the moment of a sale/PO/inventory transaction. `product_type` (enum `FRAME`/`LENS`/`ACCESSORY`/`OTHER`), plus the full base + type-specific field set (nullable — only matching-type fields populated). `product_id` FK is `SET NULL` (snapshot survives product deletion). **`brand_id`/`category_id`/`subcategory_id` are plain BigIntegers with no FK** — deliberately informational-only so deleting a brand/category doesn't cascade into historical snapshots. Append-only (no `updated_at`).

---

## 4. Inventory / Supply Chain

`Inventory` is a purchase-batch-level stock record (owned by either an `Admin` warehouse or a `Store`, via polymorphic `owner_type`/`owner_id`); `InventoryTransaction` is the immutable movement ledger; `ProductUnit` optionally tracks individual serialized physical units. `Supplier`/`SupplierStoreLink`/`SupplierProduct` model the vendor relationship, `PurchaseOrder`/`PurchaseOrderItem`/`SupplierPayment` model procurement, `Lab` is an external lens-processing partner, and `Exchange`/`DeadstockItem` model the return-and-reuse flow.

### `inventories`
A purchase-batch-level stock record. `owner_type` (enum `ADMIN`/`STORE`) + `owner_id` (**no FK** — the canonical example of this codebase's polymorphic-no-FK pattern), `quantity`, `reserved_quantity`, `available_quantity`, `reorder_level`, `last_purchase_price`, `purchase_date`, `purchase_cost`, `selling_price`, `is_active`.
- **FKs**: `product_id` (`CASCADE`); `purchase_order_id`/`purchase_order_item_id` (`SET NULL`); `supplier_id` (`SET NULL`).
- **Missing-index flag**: no index on `sale_date`-equivalent hot filters noted in BUG_AUDIT.md for the `sales` table specifically.

### `inventory_transactions`
Immutable ledger of every stock movement. `transaction_type` enum (12 values: `PURCHASE, SALE, ADMIN_TRANSFER_OUT/IN, STORE_TRANSFER_OUT/IN, DAMAGE, LOSS, AUDIT_ADJUSTMENT, RETURN, EXCHANGE_IN/OUT`), `quantity`, `unit_price`, `total_value` (snapshotted), `consumed_batches` (`JSON`), `created_by` (**no FK**), `status` (enum `PENDING/APPROVED/REJECTED/COMPLETED`), `transfer_direction` (enum), `approved_by_user_id` (**no FK**).
- Functions as both a completed-transaction log **and** a pending-approval-request queue (`is_request` flag) — an unusual dual purpose for one table.

### `product_units`
Individual, potentially serialized physical unit with full lifecycle tracking. `unit_sku` (unique, same normalization as `Product.sku`), `status` (enum `AVAILABLE/SOLD/DAMAGED/IN_REPAIR/LOST/RESERVED/DEADSTOCK/EXCHANGED`), `owner_type`+`owner_id` (polymorphic, no FK), `source_type` (enum).
- **Style inconsistency**: uses old-style `backref` instead of `back_populates` (used everywhere else), and its enum columns are declared without an explicit `name=`, unlike every other enum column in the schema.

### `suppliers` / `supplier_store_links` / `supplier_products`
Vendor management. `suppliers`: company/contact/bank fields, `status` (enum `ACTIVE/INACTIVE/BLACKLISTED`), `credit_days`, `admin_id`-scoped, soft-delete. `supplier_store_links`: join table (`UniqueConstraint(supplier_id, store_id)`), `is_primary` flag. `supplier_products`: which products a supplier can provide and at what price (`UniqueConstraint(supplier_id, product_id)`).

### `purchase_orders` / `purchase_order_items` / `supplier_payments`
Procurement. `purchase_orders`: `po_number` (unique), `status` (enum `DRAFT/SENT/PARTIALLY_RECEIVED/RECEIVED/CANCELLED`), financial totals, `created_by` (no FK), optional `store_id` (nullable = admin/warehouse-level order). `purchase_order_items`: `quantity_ordered`/`quantity_received`, links to `product_snapshot_id` (`RESTRICT`) and `inventory_id` (`SET NULL`, updated on receipt — auto-creates a `PURCHASE` inventory transaction). `supplier_payments`: partial-payment ledger against a PO, `payment_method` enum.

### `labs`
External lens-processing partner. `name`, `contact_number`, `email`, `is_active`, `admin_id`-scoped. **No soft-delete pattern** (unlike `Supplier`) — inconsistency worth noting.

### `exchanges`
Customer exchange (return + optional new sale). `exchange_number` (unique), `original_item_value`, `new_items_total`, `exchange_credit`, `additional_payment`, `processed_by_type`+`processed_by_id` (polymorphic, no FK), `status` (enum `COMPLETED/CANCELLED`). FKs to `original_sale_id`/`original_sale_item_id`/`new_sale_id` (all `RESTRICT`/nullable). Reuses the Postgres enum type from `sale.py`'s `staff_type_enum` without re-issuing DDL for it.

### `deadstock_items`
Returned/exchanged inventory in a holding state until reused or sold. `sku`, `quantity` (always 1 per unit record), `original_price`, `status` (enum `AVAILABLE/REUSED/SOLD`), `is_exchanged`. Links to `exchange_id` (`CASCADE`), `original_sale_item_id`/`sold_in_sale_id` (`SET NULL`). Consumed by `SaleItem.deadstock_item_id` when later sold via POS.

---

## 5. Sales / CRM

`Customer` is the central CRM entity, carrying denormalized loyalty balances. `Sale` is a completed POS transaction, exploded into `SaleItem`/`SalePayment`, with an optional generated `Bill` styled per-store via `BillSettings`. `Prescription` and `Repair` are optician/service-desk workflows. `Expense`/`ExpenseCategory` track operating costs.

### `customers`
`phone` (indexed, described as "primary identifier" — **but not unique**, per BUG_AUDIT.md), name/address/DOB/gender fields, `remark`, denormalized `loyalty_points_earned`/`redeemed`/`current_points`, `membership_tier` (enum `NONE/SILVER/GOLD/PLATINUM`). `admin_id`-scoped, optional `store_id`/`first_visit_store_id`. Soft-delete via `deleted_at`.

### `customer_links`
Links two customer records together (`from_customer_id`/`to_customer_id`, both `CASCADE`, `UniqueConstraint`). Purpose beyond the schema (household grouping vs. duplicate-merge) isn't documented in the model — worth confirming with the team.

### `prescriptions`
Per-eye fields (`sph_right/left`, `cyl_right/left`, `axis_right/left` — all `String(10)`, **no numeric typing/validation at the DB level**), `addition`, `pupillary_distance`, lens preference fields, `expiry_date`, `doctor_name`, `is_active` (marks the current prescription among a customer's history).

### `sales`
`invoice_number` (unique), `sale_date`, `status` (enum `PENDING/COMPLETED/PARTIALLY_PAID/CANCELLED/REFUNDED`), financial totals, loyalty fields (including split-redemption support: `loyalty_points_redeemed_self`/`_other`), `sold_by_type`+`sold_by_id` (polymorphic, **no FK on id**), lab workflow fields, `is_exchanged`.
- **Five separate customer FKs** (`customer_id`, `billing_account_customer_id`, `loyalty_awarded_to_customer_id`, `loyalty_redeemed_from_customer_id`, `loyalty_redeemed_other_customer_id`, all `SET NULL`) — supports split billing and cross-customer loyalty attribution in one row rather than a join table.
- **Missing index** on `sale_date` despite being the primary filter/aggregation column (see BUG_AUDIT.md).

### `sale_items` / `sale_payments`
`sale_items`: `quantity`, `unit_price`, `unit_cost`, `consumed_batches` (`JSON`), `line_total`, links to `product_snapshot_id` (`RESTRICT`), `inventory_id`/`deadstock_item_id` (`SET NULL`) — triggers a `SALE` inventory transaction on creation. `sale_payments`: split/instalment payments, `payment_method` enum (`CASH/CARD/UPI/BANK_TRANSFER/LOYALTY_POINTS/CREDIT/CHEQUE`).

### `bills`
`bill_number` (unique), `html_content` (**the fully rendered invoice HTML stored directly in the row** — a notable denormalization choice). `sale_id` FK is unique (1:1). Immutable — no `updated_at`/`deleted_at`.

### `bill_settings`
Per-store invoice branding: header/footer text, address, GST number, logo, `theme_color`, `show_prescription`/`show_gst` toggles. `store_id` FK unique (1:1 per store).

### `repairs`
`repair_number` (unique), `customer_name` (fallback for walk-ins when `customer_id` is null), `repair_type`/`status` enums, `is_warranty`, cost fields, `handled_by_type`+`handled_by_id` (polymorphic, no FK). Optional links to `customer_id`, `sale_id` (warranty), `product_unit_id`.

### `expenses` / `expense_categories`
`expenses`: `owner_type`+`owner_id` (polymorphic, no FK — Admin or Store), `category_id` FK (`RESTRICT`), amount/date/payment fields, an approval workflow (`is_approved`/`approved_by`/`approved_at`, `is_rejected`/`rejected_by`/rejection reason), and two more polymorphic pairs (`recorded_by_type/id`, `incurred_by_type/id`). **Notable**: the same Python enum class is materialized as **two distinct Postgres enum types** (`expense_recorded_by_type_enum` vs `expense_incurred_by_type_enum`) because each column gives it a different `name=`. Soft-delete via `deleted_at`.

---

## 6. Loyalty & Notifications

`LoyaltyConfig` is the per-store rules engine; `StoreCategoryLoyalty` fine-tunes earn rate per category; `LoyaltyTransaction` is the append-only ledger feeding `Customer`'s denormalized balances; `Notification` is a generic in-app alert table currently used only for inventory transfer events.

### `loyalty_configs`
One row per store (`store_id` unique FK). `is_enabled`, `category_points_enabled`/`price_points_enabled` toggles, `max_redemption_percentage` (default 100), `price_interval`/`price_points` (earn-per-spend rule), `points_per_rupee`, `min_redemption_points`, `silver_max`/`gold_max` tier thresholds (Platinum = above gold_max).

### `store_category_loyalty`
Per-store, per-category earn-rate override. `points_per_unit`, `is_enabled`. `UniqueConstraint(store_id, category_id)`.

### `loyalty_transactions`
Append-only ledger. `type` (enum `EARNED_CATEGORY/EARNED_PRICE/EARNED_CUSTOM/REDEEMED/ADJUSTED`), `points` (signed), `rupee_value` (redemption cash-equivalent), `given_by_type` — **a plain `String(20)`, not an Enum**, inconsistent with every other polymorphic-staff-type column in the schema. `given_by_id` has no FK.

### `notifications`
`recipient_user_id` (polymorphic, **no FK and no accompanying `recipient_user_type` column at all** — the one clear gap in this schema's otherwise-consistent, if FK-less, polymorphism convention: there's no way to tell from the row alone which table `recipient_user_id` refers to). `type` enum currently only covers inventory-transfer events, despite the table being modeled generically.

---

## 7. Auth

### `refresh_tokens`
JWT refresh-token store. `token_id` — **`UUID` primary key** (the only UUID PK in the schema; everything else is `BigInteger`). `token_hash` (unique, SHA-256 — raw token never stored), `expires_at`, `revoked_at` (nullable = still valid), `device_fingerprint`.
- **Six mutually-exclusive nullable owner FKs** (`admin_id`, `manager_id`, `worker_id`, `optician_id`, `superadmin_id`, `accountant_id`, all `CASCADE`) rather than a single polymorphic pair — the schema's one departure from the "type+id" convention used everywhere else. Gives real referential integrity at the cost of five-out-of-six-always-null columns per row.

---

## Cross-references

- For how the RBAC tables in §2 are actually resolved and where the enforcement gap is, see [AUTH_FLOW.md](./AUTH_FLOW.md) §6.
- For the concrete bugs flagged inline above (global SKU uniqueness, missing `sale_date` index, non-unique customer phone, polymorphic FKs without referential integrity, the `notifications` missing-discriminator gap), see [BUG_AUDIT.md](./BUG_AUDIT.md).
