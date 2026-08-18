# Bug & Risk Audit

## Fix status (updated as Phase 3 progresses)

| Finding | Status | Notes |
|---|---|---|
| C2 — placeholder JWT secret | ✅ Fixed, verified live | Rotated; old tokens confirmed rejected, new logins confirmed working. |
| H5 — exception handler leak | ✅ Fixed, verified live | Client now gets a generic message; full detail still reaches the server log (`logging.basicConfig` added, previously unconfigured). |
| C3 — `partial-return` 500 | ✅ Fixed, verified live | Root cause was two stacked bugs, not one — see "C3/C4 fix notes" below. |
| C4 — redemption discount lost on recalculation | ✅ Fixed, verified live | `discount_amount` now includes the redemption discount; invoice reconciles (`subtotal − discount + tax = total`) on a fresh test sale. |
| H7 — create-sale response missing staff attribution | ✅ Fixed, verified live | `POST /sales/` now returns `staff_name`/`staff_code`/`staff_role` correctly — confirmed for Admin, Manager, and Worker. |
| H1 — global SKU/barcode uniqueness | ✅ Fixed, verified live | Composite `UniqueConstraint(admin_id, sku)`/`(admin_id, barcode)` on `products`, and `(product_id, unit_sku)` on `product_units` (see new finding below). Migration `d4e5f6a7b8c9` applied. Confirmed: a second tenant can now reuse a SKU already used by an unrelated tenant (201), while a duplicate SKU *within* the same tenant is still correctly rejected (409). |
| H6 — schema drift | ✅ Fixed | Same migration `d4e5f6a7b8c9` now formally captures `inventories.selling_price` and `staff_type_enum`'s `'ADMIN'` value; the raw `ALTER` calls removed from `main.py`'s `lifespan()` (the unrelated inventory-reactivation data patch was left in place). |
| H2 — no rate limiting on login | ✅ Fixed, verified live | `slowapi`, 10/minute per IP+role on `/auth/login/{role}`. Confirmed: attempts 1–10 behave normally, 11+ get `429`. |
| M1 — inventory list shows wrong batch's cost | ✅ Fixed, verified live | `last_purchase_price`/`cost_price` in the inventory list now reflect the most recently purchased batch instead of the oldest FIFO batch. Confirmed with a two-batch, then three-batch test. |
| M6 — `package-lock.json` gitignored | ✅ Fixed | Removed from `Frontend/.gitignore`; not yet committed (no commit made without being asked). |
| H3, H4, M2–M5, C1 | Not yet started | See the Phase 3 plan in the master plan file for sequencing. |

### New findings from regression testing across roles

Per explicit instruction, every fix above was re-verified by actually exercising the API as **Admin, Manager, Worker, and Optician** (the four roles that can log in) — a systematic sweep of ~28 read endpoints per role (114 requests total) plus five real write flows (sale creation as Manager and as Worker, prescription creation as Optician, customer creation as Worker, expense creation as Manager). This caught one additional bug beyond what Phase 2 had already found:

- **New Critical-adjacent bug (now fixed): `GET /inventory/low-stock` crashed with a 500 for every non-Admin role.** Root cause: `apis/inventory/read.py`'s `low_stock_items()` did `items, _ = await get_inventories_by_owner(...)`, but that function has always returned a single dict (`{"items": ..., "total": ..., ...}`, 9 keys), not a 2-tuple — unpacking a 9-key dict as `a, b = ...` raises `ValueError: too many values to unpack`. This was a **pre-existing bug, not something introduced by any fix above** — it had simply never been exercised as a non-Admin role before this regression pass (Admin takes a different code path in the same function that doesn't hit this line). Fixed by reading `result["items"]` instead of unpacking. Every role now gets a clean `200` from this endpoint.
- **Also caught while re-testing `product_units.unit_sku`'s new per-product uniqueness scope (from the H1 fix)**: generating unit SKUs for a fresh sale still works correctly (`unit_skus: ["BATCH20260808U0011"]` on a Manager-created sale) — confirms the H1 migration didn't regress unit-SKU generation.
- **New Low-severity finding, not yet fixed**: `POST /transfers/purchase` with an explicit `store_id` sometimes creates the resulting `Inventory` batch under `owner_type: ADMIN` instead of `owner_type: STORE`, and left `purchase_cost` as `null` on one attempt during testing — inconsistent with two earlier successful calls to the same endpoint in this same session that behaved correctly. Not yet root-caused; flagged for the next pass rather than guessed at.

After the low-stock fix, the full 114-request sweep across all four roles returned **zero 5xx errors**, and all five write-flow tests produced correct, hand-verified business-logic results (sale totals, discounts, tax, staff attribution, prescription data, expense recording).

### C3/C4 fix notes — a second, previously-undiscovered bug

Fixing C3's reported `TypeError` (a one-line call-signature fix) uncovered a **second, unrelated crash** immediately behind it: `sqlalchemy.exc.MissingGreenlet`, thrown from `apis/sale/update.py`'s response-shaping code when it tried to read `item.product_snapshot`/`item.product` on the returned sale.

Root cause: `services/sale_service.py`'s `update_sale()`, `cancel_sale()`, and `process_partial_return()` all ended with `await db.commit(); await db.refresh(sale); return sale`. `db.refresh()` expires previously-loaded relationships on the object — including the `product_snapshot`/`product` eager-loads that `get_sale()` had set up at the top of each function — so by the time the API layer serialized the response, those relationships needed a fresh lazy load, which SQLAlchemy's async extension cannot perform from a plain synchronous helper function outside an active greenlet context. This is why it manifested as a crash specifically in the response-building step, not in the business logic itself.

**This means `PUT /sales/{id}` (update) and `POST /sales/{id}/cancel` likely had this exact same latent crash risk too**, never triggered/reported previously, purely by luck of the specific relationships/access patterns exercised in whatever ad-hoc testing had been done before. Fixed all three by re-fetching via `get_sale()` (which keeps eager-loading) instead of `db.refresh()`. `delete_sale()` has the same `db.refresh()` pattern but its endpoint doesn't serialize the sale object afterward, so it was left as-is (lower priority, not user-facing).

Separately confirmed while re-testing: the `lab_status` field defaults to `"Confirmed"` on every sale regardless of whether it involves a lab order at all (seen on non-lab sales), which then feeds into `_sale_to_read`'s status-display mapping and produces a confusing `"Lab Pending"` display status on an otherwise-ordinary completed sale. Not yet root-caused or fixed — flagged here as a new Low/Medium finding for the next pass.

## Methodology

This audit re-verifies the six originally-known issues, re-confirms everything surfaced during Phase 1 documentation, and — per explicit instruction — prioritizes **business logic correctness** above all else. Verification was done by actually running the app, not just reading code:

- The FastAPI backend was found already running (`uvicorn`, PID 14668) against the live `optical_db` Postgres instance, confirmed as this project's API (`TechSentinals Optical Store API v2.0.0`).
- Real credentials from `Backend/db/seed_data.py` (5 tenant admins, each with a manager/worker/optician, all with known passwords) were used to log in for real and exercise the actual HTTP API — sales, exchanges, loyalty, purchase orders, permissions — against real seeded + audit-created data, comparing actual API responses against hand-computed expected values from the formulas in the service layer.
- A second real tenant (`priya@clearsight.in`) was used to directly reproduce the tenant-scoping bug, not just infer it from the model.
- **Tooling caveat**: no browser/screenshot tool was available in this environment. "Frontend verification" below means tracing each page's hook → API response shape → JSX field bindings against the *real* API response shapes captured live (not assumed from schemas), plus one direct backend→frontend consequence chain traced end-to-end (the inventory cost-price bug, below). This is not the same as looking at rendered pixels, and is stated here explicitly rather than implied.
- Two suspected issues were investigated and **ruled out** after direct verification rather than assumed: an apparently mojibake'd ₹ symbol in an error message turned out to be a terminal display artifact, not an encoding bug in the API response (raw bytes confirmed correct UTF-8); and the inventory list flagging a 10-unit batch as "low stock" with `reorder_level=0` turned out to be an intentional fallback threshold (`available <= 10` when no reorder level is set), not a bug.

---

## 🔴 Critical

### C1. Global RBAC defaults grant every permission to every role — the permission system is currently a no-op for restricting access

**Root cause**: `Backend/seed_permissions.py:162-173`, `_build_role_grants()`:
```python
return {
    PermissionRoleType.ADMIN:      list(all_keys),
    PermissionRoleType.MANAGER:    list(all_keys),
    PermissionRoleType.WORKER:     list(all_keys),
    PermissionRoleType.OPTICIAN:   list(all_keys),
    PermissionRoleType.ACCOUNTANT: list(all_keys),
}
```
Every Tier-1 `GlobalRolePermission` default is seeded as `is_granted=True` for **every** role, for **every** permission key in the catalog — including `stores:create/delete`, `managers:create/delete`, `workers:create/delete`, `opticians:create/delete`, `accountants:create/delete`, and `permissions:manage`.

**Confirmed live**: logged in as a real seeded Worker (`rahul.verma@visionary.in`) and called `GET /permissions/me`. Every single one of the ~90 permission keys in the catalog came back `{"granted": true, "source": "global"}` — a store-floor Worker's default installation permissions are, out of the box, indistinguishable from an Admin's, restricted only by whatever an Admin manually locks down afterward via `AdminRolePermissionOverride`/`UserPermissionOverride`.

**Blast radius**: this is the single most important finding for the whole permission-management goal (Phase 4). It means:
- Fixing role-check-instead-of-permission-check bugs (the user's originally-described issue) is necessary but **not sufficient** — even a fully permission-gated system behaves identically to "no restrictions" today, because the permissions being checked are all granted by default.
- Every new tenant/store that signs up starts with every staff member able to do everything, until the Admin proactively restricts them — an opt-out model where the safe posture (least privilege) requires manual admin action, rather than an opt-in model.
- This directly explains why the `core/deps.py:250` Admin/Accountant bypass "looked" consistent with Manager/Worker/Optician behavior in earlier testing — the constrained roles aren't meaningfully constrained by default either.

**Fix direction** (for Phase 3/4): redesign the default grants so ADMIN gets everything, and MANAGER/WORKER/OPTICIAN/ACCOUNTANT get a sane least-privilege default (e.g. read access + their obvious day-to-day actions: sales, customers, prescriptions; NOT staff/store management, NOT permissions management, NOT supplier/PO management for Worker/Optician). This is a seed-data change plus a migration to backfill existing `GlobalRolePermission` rows, and needs an explicit call-out to the user since it will change de-facto access for any real staff already using the app.

### C2. `JWT_SECRET_KEY` is still the literal placeholder value
*(Carried over from the prior audit, re-confirmed unchanged.)* `Backend/.env` has `JWT_SECRET_KEY=your_jwt_secret_key_here`. Anyone who has seen `.env.sample` knows the current signing secret. Any token for any role, including SuperAdmin, can be forged.

### C3. `POST /sales/{sale_id}/partial-return` throws a 500 on every call
**Confirmed live** with a real request against a real sale:
```
POST /sales/3/partial-return  →  HTTP 500
{"detail":"_get_user_admin_id() takes 1 positional argument but 2 were given"}
```
**Root cause**: `apis/sale/update.py` awaits `_get_user_admin_id(current_user, db)` (two args), but the imported `_get_user_admin_id` (from `apis/customer/read.py`) is synchronous and takes exactly one argument. Compounding this, the endpoint's permission dependency (`require_permission("SALES_MANAGE")`) is a single bare string with no `module:action` form, unlike every other endpoint in the codebase — it doesn't match any real permission key, so even if the `TypeError` were fixed, non-Admin/Accountant callers could never pass the permission check.

**Blast radius**: partial returns (as opposed to full-sale cancellation) are completely non-functional today. This is also a live demonstration of C6 below (raw exception text leaking to the client).

### C4. If C3 is fixed without also fixing this, loyalty-redemption discounts get silently erased on partial return, without refunding the customer's points
**Root cause**: `services/sale_service.py:397`, inside `create_sale`'s redemption handling: `sale.total_amount -= total_discount_from_redemption` — the rupee discount from loyalty-point redemption is subtracted directly from `total_amount` but **never added into `sale.discount_amount`**.

Separately, `services/sale_service.py:1339-1351`, inside `process_partial_return` (the function `POST /sales/{id}/partial-return` is supposed to call once C3 is fixed), the totals are fully recalculated as:
```python
sale.total_amount = (sale.subtotal - sale.discount_amount + sale.tax_amount).quantize(Decimal("0.01"))
```
Because the original redemption discount was never recorded in `discount_amount`, this recalculation **drops it entirely** — `total_amount` jumps back up by the previously-redeemed rupee amount, but the customer's points were already spent and are not restored. This is a real money-losing (for the customer) / accounting-inconsistency (for the store) bug that is currently masked only because the endpoint that would trigger it is broken (C3). **These two bugs must be fixed together**, not independently — fixing C3 alone would activate C4.

**Confirmed live** (the discount_amount side): created a sale, redeemed 100 loyalty points for a ₹2 discount. Result: `subtotal: 1200.00, discount_amount: 0.00, tax_amount: 0.00, total_amount: 1198.00` — the invoice's own numbers don't reconcile (`1200 - 0 + 0 = 1200 ≠ 1198`), because the redemption discount only ever lives inside `total_amount`, invisible to `discount_amount`.

---

## 🟠 High

### H1. `sku`/`barcode` uniqueness is global, not tenant-scoped — reproduced live across two real tenants
*(Carried over from the prior audit; now reproduced with a concrete cross-tenant request rather than inferred from the model.)*

Admin 1 (`ayan@visionary.in`, admin_id=1) owns a product with SKU `BATCH20260808`. Logged in as a completely unrelated Admin 2 (`priya@clearsight.in`, admin_id=2) and attempted to create a product with the same SKU:
```
POST /products/ (as admin_id=2)  →  HTTP 409
{"detail":"A product with this SKU or barcode already exists"}
```
Two unrelated businesses cannot use the same SKU convention (e.g. `"FR-001"`), which will happen immediately once there's real-world adoption beyond hand-picked demo SKUs. Root cause: `models/product.py`'s `sku`/`barcode` columns use `unique=True` at the DB level instead of a composite `UniqueConstraint(admin_id, sku)`.

### H2. No rate limiting on login — reproduced live
8 consecutive wrong-password attempts against `/auth/login/admin` all returned a plain `401` with no delay, lockout, or throttling of any kind.

### H3. No CI/CD pipeline
Confirmed via Phase 1 investigation: no `.github/workflows/`, no `Dockerfile`, no deployment scripts anywhere in the repo (GitHub-hosted, so GitHub Actions is the natural target).

### H4. Zero automated test coverage
Confirmed: `Backend/test/` (8 files) are manual, live-server-dependent scripts with no `pytest`/assertions; `Frontend/` has no test framework configured at all.

### H5. Global exception handler leaks internal error text to clients — reproduced live via C3
`Backend/main.py:97-103` returns `str(exc)` directly in the response body. C3's reproduction above is a live example: the client received the literal Python `TypeError` message, including an internal function name (`_get_user_admin_id`) and its exact call signature — information a real client (or attacker probing the API) should never see.

### H6. Schema drift between Alembic migrations and the raw SQL run in `main.py`'s startup hook
Confirmed in Phase 1: `inventories.selling_price` and the `staff_type_enum`'s `'ADMIN'` value are both required by the models but were never captured as real Alembic migrations — they only exist because `main.py`'s `lifespan()` runs raw `ALTER TABLE`/`ALTER TYPE` SQL on every app boot. A fresh DB built purely from `alembic upgrade head` would be missing both.

### H7. Duplicated, inconsistent sale-response-shaping logic: the create-sale response omits staff attribution
**Confirmed live**: `POST /sales/` response has `"staff_name": null, "staff_code": null, "staff_role": null"` despite `sold_by_type: "MANAGER", sold_by_id: 6` being a real, valid manager. Calling `GET /sales/3` immediately after returns the same sale with `staff_name: "Ayan Mansuri", staff_code: "MGR-6", staff_role: "Manager"` correctly populated.

**Root cause**: `apis/sale/create.py`'s local `_sale_to_read()` (lines 30-40) never resolves `sold_by_id`/`sold_by_type` into a name — it's simply missing the lookup that `apis/sale/read.py` (lines 55-65) independently implements. Two separately-maintained copies of the same response-shaping logic, one incomplete. **Blast radius**: any UI that shows a receipt/confirmation immediately after creating a sale (the most common POS flow) will show a blank "sold by" field until the page is reloaded or re-fetched.

---

## 🟡 Medium

### M1. Inventory list aggregation shows the wrong batch's cost, under a misleading field name — traced end-to-end into a real frontend display bug
**Confirmed live**: created a second purchase-order-driven batch for the same product at a different cost (₹900 vs. the original ₹1000). The aggregated `GET /inventory/` list (used by the Inventory page) still showed `cost_price: "1000.00", last_purchase_price: "1000.00"` — the *older* batch's cost, not the ₹900 batch just received.

**Root cause**: `services/inventory_service.py:345-358` — the query is explicitly named `oldest_stmt` and explicitly orders `Inventory.id.asc()` to pick the **oldest** unsold batch (consistent with FIFO — it's the next batch that will be sold), then maps that value onto a field literally named `last_purchase_price` (line 379). The field name promises "most recent purchase," the value is actually "oldest remaining batch" — a semantic mismatch, not just a display glitch.

**Frontend consequence, confirmed by direct code trace**: `Frontend/src/pages/admin/Inventory.jsx:327` renders `item.cost_price` directly from this response — so an Admin checking "what am I currently paying for this product" on the main Inventory page sees a stale, lower number after every re-purchase at a different price, which could mislead reorder/pricing decisions.

### M2. Exchanges silently reject any "downgrade" (cheaper replacement) — confirm with the user whether this is intended
**Confirmed live**: attempted to exchange a ₹1,134-value returned item for an ₹800 replacement. Rejected: `"Replacement items total value (₹800.00) must be greater than or equal to the exchanged item value (₹1134.00)."` The system only supports equal-or-upgrade exchanges (verified the upgrade path works correctly — see Positive Findings below); there is no supported path for "customer downgrades and gets store credit/cash back." This may be a deliberate store-credit policy, but it's worth confirming with the product owner, since many optical retailers do offer downgrade refunds/credit notes.

### M3. Permission-action mismatches on several write endpoints
*(Carried over from Phase 1's `MODULES_BACKEND.md`, not independently re-tested live since C1 makes it moot for now — every role passes every check regardless.)* Several mutating endpoints (supplier store-links/catalogue, PO receipt/payment recording, loyalty admin config/adjust) are gated by a `:read` permission instead of the matching write action. This becomes a real issue only once C1 is fixed and roles are actually restricted — worth fixing in the same pass as C1 so the new restricted defaults are enforced against the *correct* action on every endpoint.

### M4. No login route exists for SuperAdmin or Accountant
**Confirmed live**: `POST /auth/login/superadmin` → `400 {"detail":"Invalid login role: superadmin"}`. The backend fully supports both roles everywhere else (`authenticate_user_by_role`, `refresh_access_token`, `get_current_user` all have complete branches for them) — only the login route itself excludes them. With 0 accountants in the live DB despite 5 tenants of real usage, this looks like a genuine gap rather than a deliberate restriction, but should be confirmed with the team.

### M5. `refresh_access_token()` doesn't support SuperAdmin/Accountant
Carried over from the prior audit: the role-dispatch in `services/auth_service.py:132-194` only covers `admin/manager/worker/optician`; if login is ever enabled for the other two roles (M4), their sessions would be unable to silently refresh and would be forced to re-login every 30 minutes.

### M6. `Frontend/.gitignore` excludes `package-lock.json`
Carried over: non-reproducible installs across machines/CI.

---

## 🟢 Low / Confirmed non-issues (ruled out)

- **Not a bug**: the ₹-symbol mojibake seen in one terminal test was a local console encoding artifact — the raw HTTP response bytes were verified to be correct UTF-8 (`\xe2\x82\xb9`).
- **Not a bug, but undocumented**: inventory items with `reorder_level=0` (unset) are flagged "low stock" once `available_quantity <= 10` — an implicit hardcoded fallback threshold (`services/inventory_service.py:231,277`) rather than a bug, but worth documenting since the field itself gives no hint of this behavior.
- `requirements.txt` has no pinned versions, saved as UTF-16 (carried over).
- Commit message quality inconsistency (carried over, cosmetic).
- Several dead/unrouted frontend files (carried over from Phase 1: `ShopkeeperWizard.jsx`, `EyeTest.jsx`, `ProfileHome.jsx`, empty stub pages, unused `UserLayout.jsx`).
- The entire Accountant module runs on mock data (carried over from Phase 1) — not re-tested live since there's no way to log in as one (M4) and the frontend pages don't call the API at all.

---

## ✅ Positive findings — business logic confirmed correct

Worth stating plainly, since the point of this phase was verification, not just bug-hunting:

- **Sale line-item math is exactly correct**: `unit_price × qty × (1 − discount%) × (1 + tax%)`, verified with a real 2-unit, 10%-discount, 5%-tax line: expected ₹2,268.00, got ₹2,268.00. `subtotal`/`discount_amount`/`tax_amount`/`total_amount`/`due_amount` all reconciled correctly for a non-redemption sale.
- **FIFO batch tracking works correctly**: a second purchase-order-driven batch at a different cost was tracked as a genuinely separate `Inventory` row, correctly ordered "Current" vs. "Next" by purchase date, with quantities aggregating correctly (7 + 6 = 13) in the list view even though (per M1) the *cost* shown for that aggregate picks the wrong batch.
- **Loyalty point earning is exactly correct**, including the interaction between category-based and price-based rules and the post-redemption total_amount base for price-points: verified two sales end-to-end (650 points and 300 points respectively) against the real `LoyaltyConfig`/`StoreCategoryLoyalty` rows, matching the formula in `services/loyalty_service.py` to the point.
- **Loyalty tier and redemption logic is correct**: point balance, tier assignment (SILVER at 650 points, correctly under the 5,000 `silver_max` threshold), and redemption's rupee-discount conversion (`floor(points / points_per_rupee)`) all matched hand computation.
- **Store-scoping is correctly enforced** on sale creation: a Worker at Store 1 attempting to log a sale for Store 6 (different store, same tenant) was correctly rejected with `403 Forbidden`.
- **Tenant isolation on SKU is correctly *rejected* as intended-but-wrong** (see H1) — i.e., the uniqueness check itself works exactly as coded, it's just scoped at the wrong level.
- **Purchase order partial receiving is correct**: a 10-unit PO partially received as 6 units correctly transitioned `DRAFT → PARTIALLY_RECEIVED`, updated `quantity_received`, and created a new, separate `Inventory` batch at the PO's unit cost.
- **Exchange math is correct on the supported (equal-or-upgrade) path**: a 1-unit return worth ₹1,134 exchanged for 2 units worth ₹1,600 correctly computed `exchange_credit: 1134.00, additional_payment: 466.00`, correctly required and validated the additional payment, and correctly decremented the new item's inventory.
- **Exchanged-out inventory correctly becomes a `deadstock_item`** rather than silently returning to sellable stock — confirmed the returned unit appeared in `GET /deadstock/` with the correct `exchange_id`/`original_sale_item_id` linkage and `AVAILABLE` status, exactly matching the documented design in `DATA_MODEL.md`.

---

## Cross-reference

File:line citations above point into the same codebase documented in [ARCHITECTURE.md](./ARCHITECTURE.md), [DATA_MODEL.md](./DATA_MODEL.md), [MODULES_BACKEND.md](./MODULES_BACKEND.md), and [MODULES_FRONTEND.md](./MODULES_FRONTEND.md). C1 in particular should be read together with the Phase 4 deliverable (`PERMISSION_MANAGEMENT.md`, not yet written) — it is the load-bearing finding for that entire piece of work.
