# Request Lifecycle — End to End

Two concrete walkthroughs: authenticating, and the core business action (recording a POS sale), tracing every layer from a frontend click to the database and back.

## Walkthrough 1: Login

1. **UI** — `pages/auth/Login.jsx` collects email/password, submits via a hook that calls `POST /auth/login/{role}` through `api/auth/auth.api.js` → `lib/axios.js` (the shared axios instance, `withCredentials: true`).
2. **Route** — `routes/authrouter.py` → `apis/auth/login.py`'s `login()` handler. `role` is validated against `{admin, manager, worker, optician}` only (see AUTH_FLOW.md §2 for the confirmed gap around superadmin/accountant login).
3. **Service** — `services/auth_service.authenticate_user_by_role()` selects from the matching table (`Admin`/`Manager`/`Worker`/`Optician`) by email, verifies the password with `bcrypt.checkpw` via `core/security.verify_password()`, and checks the account is active/not soft-deleted.
4. **Token issuance** — `services/auth_service.create_tokens()` builds a JWT access token (30 min) and refresh token (7 days) via `core/security.py` (`jose.jwt.encode`, HS256, secret from `core/config.settings.JWT_SECRET_KEY`), and persists a **hash** of the refresh token in `refresh_tokens` (one of six mutually-exclusive nullable FK columns is set depending on role).
5. **Response** — the handler sets both tokens as HttpOnly cookies (`access_token` path `/`, `refresh_token` path `/auth`) *and* returns them in the JSON body (`TokenPair`).
6. **Frontend state update** — the login hook writes the returned user info into `useAuthStore` (zustand) via `setUser()`, flips `isAuthenticated`, and `AppRouter.jsx`'s route guards (`GuestRoute`/`PrivateRoute`/`AdminRoute`) now see the authenticated state and redirect to the role's home page (`/admin/dashboard`, `/accountant/dashboard`, or `/shopkeeper`).
7. **Every subsequent request** carries the cookie automatically (`withCredentials: true`); if a request ever gets a 401, `lib/axios.js`'s response interceptor transparently calls `/auth/refresh` once, queues concurrent requests, and retries — see AUTH_FLOW.md §4.

## Walkthrough 2: Recording a sale (POS checkout)

1. **UI** — `pages/shopkeeper/Shopkeeper.jsx` (the primary POS wizard) walks the user through product selection → customer details → optical prescription → payment, accumulating state (partly in local component state, partly in `store/cartStore.js`'s `useCartStore`). On submit, it calls into `api/sales/sales.api.js` directly (this page does not go through a `hooks/useSales.js`-style react-query wrapper for the create step — see MODULES_FRONTEND.md).
2. **HTTP** — `POST /sales/` with a `SaleCreate` payload (items, customer info, payment split, discounts) via the shared `lib/axios.js` client (cookie auth attached automatically).
3. **Route → handler** — `routes/sale_router.py` → `apis/sale/create.py`'s `create_sale_endpoint()`. The endpoint dependency is `Depends(require_permission("sales", "create"))` — a **concrete example of a route that already uses the permission system correctly** rather than a role check (contrast with AUTH_FLOW.md §6's description of where this pattern is *not* yet consistently applied).
4. **Authorization + store scoping** — inside the handler: if the caller is an `Admin`, `admin_id` is their own id (full tenant access); otherwise `admin_id` is derived from `current_user.store.admin_id`, **and** the handler explicitly rejects the request with 403 if `payload.store_id != current_user.store_id` — this is the store-scoping check described in AUTH_FLOW.md §7, implemented inline in this particular handler (Phase 4 will need to verify this exact pattern is applied consistently across every store-scoped write endpoint, not just this one).
5. **Service** — `services/sale_service.create_sale()` does the real work inside a DB transaction: validates line items against `Product`/`Inventory`, creates a `ProductSnapshot` per line (freezing price/name at sale time), decrements the matching `Inventory` batches (FIFO), writes `SaleItem`/`SalePayment` rows, computes totals/loyalty points, and creates a matching `SALE`-type `InventoryTransaction` per item for the audit ledger.
6. **Response shaping** — back in the handler, `_sale_to_read()` manually flattens the SQLAlchemy `Sale` object (plus its `items`/`payments`/`store`/`customer` relationships, eagerly loaded via the model's `lazy="selectin"` defaults) into a `SaleRead` Pydantic response.
7. **Frontend consumption** — the calling page invalidates relevant react-query caches (`useQueryClient`) so the sales list, inventory counts, and customer loyalty balance shown elsewhere in the UI pick up the change on next read; a receipt/bill can then be generated (`Bill` row, HTML stored directly in the DB — see DATA_MODEL.md §5).
8. **A cross-cutting risk worth flagging** (see BUG_AUDIT.md): `hooks/useSales.js`'s **read** side re-derives a `paymentStatus` label (`Paid`/`Partially Paid`/`Unpaid`) client-side from `due_amount`/`paid_amount` rather than trusting a backend-computed status field — any future change to how the backend computes these totals needs a matching frontend update, or the two will silently drift.

## General shape (every other module follows this same pattern)

```
Frontend page (pages/<role>/X.jsx)
   → hook (hooks/useX.js: useQuery for reads, useMutation for writes)
      → api module (api/x/x.api.js: one function per REST call)
         → lib/axios.js (shared client, cookie auth, 401→refresh interceptor)
            ── HTTP ──▶
Backend route (routes/x_router.py — thin aggregator)
   → apis/x/*.py handler (parses request, depends on get_current_user / get_current_admin / require_permission(...))
      → services/x_service.py (actual DB queries + business rules, inside a transaction where needed)
         → models/*.py (SQLAlchemy ORM) → PostgreSQL
      ← Pydantic response model (schemas/x.py) shaped from the ORM result
   ← JSON response
      ← react-query cache updated → dependent UI re-renders
```

The one architecturally significant deviation from this shape is the **accountant module** (see MODULES_FRONTEND.md §1-2): its pages skip the `api/`+react-query layer entirely and read from static mock data via `hooks/useCalculations.js`/`useTable.js` — there is currently no real request lifecycle for that module at all, since it isn't wired to the backend.
