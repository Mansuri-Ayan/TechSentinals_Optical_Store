# Authentication, Sessions & Authorization Flow

## 1. Actors

There is no single `users` table. Six actor types each live in their own table, distinguished by a `role`/`token_role` string carried in the JWT and re-derived from the DB on every request:

| Actor | Table | Scope |
|---|---|---|
| `superadmin` | `superadmins` | Platform-level, above all tenants. Full access to everything, always. |
| `admin` | `admins` | A tenant (an optical store business owner). Owns one or more `stores`. Full access within their own tenant. |
| `accountant` | `accountants` | Tenant-scoped, `admin_id` FK. Intended to be read-mostly (sales/reports/expenses). |
| `manager` | `managers` | Store-scoped, `store_id` FK (single store). |
| `worker` | `workers` | Store-scoped, `store_id` FK (single store). |
| `optician` | `opticians` | Store-scoped, `store_id` FK (single store). |

The frontend groups `manager`/`worker`/`optician` under one route space, `/shopkeeper/*` (shared `ShopKeeperLayout`), while `admin`/`superadmin`/`accountant` use `/admin/*`. "Shopkeeper" is a **frontend-only concept** — there is no `shopkeeper` row anywhere in the backend; it's the umbrella term for "store-level staff."

## 2. Login

`POST /auth/login/{role}` (`Backend/apis/auth/login.py`) — `role` must be one of `admin`, `manager`, `worker`, `optician`; any other value (including `superadmin` and `accountant`) is rejected with a 400 at the route level.

**Confirmed functional gap** (carried into BUG_AUDIT.md): `services/auth_service.authenticate_user_by_role()` and `refresh_access_token()` both have full `superadmin`/`accountant` branches, and `core/deps.get_current_user()` fully supports both roles once authenticated — but there is **no route anywhere that lets a SuperAdmin or Accountant actually log in**. Grepping `Backend/apis/auth/` and `Backend/routes/authrouter.py` turns up only the single role-gated `/auth/login/{role}` route, which explicitly excludes both. Either a login route for these two roles exists elsewhere and wasn't found, or SuperAdmin/Accountant accounts are currently unreachable through the API — needs confirming with the team as part of Phase 2, since it changes the severity (dead code you can safely ignore vs. a broken login path for two real roles).

1. `authenticate_user_by_role(db, email, password, role)` (`services/auth_service.py`) looks up the row in the matching table and verifies the password with `bcrypt.checkpw`.
2. On success, `create_tokens(db, user, role_name)` issues:
   - an **access token** (JWT, HS256, `ACCESS_TOKEN_EXPIRE_MINUTES` = 30 min default, `type: "access"`, `sub: <id>`, `role: <role>`)
   - a **refresh token** (JWT, `REFRESH_TOKEN_EXPIRE_DAYS` = 7 days default, `type: "refresh"`), which is also **stored server-side as a SHA-256 hash** in `refresh_tokens` (`models/refresh_token.py`) so it can be revoked/rotated.
3. Both tokens are returned in the JSON body **and** set as cookies: `access_token` (path `/`) and `refresh_token` (path `/auth`), both `HttpOnly`, `SameSite` per `COOKIE_SAMESITE` (default `lax`), `Secure` per `COOKIE_SECURE` (**defaults to `False`** — must be set `True` in production, see Phase 2 report).

## 3. Authenticated requests

Every protected endpoint depends (directly or transitively) on `get_current_user` (`Backend/core/deps.py`):

1. Token is read from the `Authorization: Bearer <token>` header if present, **else falls back to the `access_token` cookie**.
2. `decode_token()` verifies signature + expiry via `core/security.py`.
3. Token `type` must be `"access"` (a refresh token cannot be used as an access token).
4. The `role` claim selects which table to query for the user row by `sub` (id) — with `selectin`/`joinedload` for `store` on the store-scoped roles.
5. Deactivated/soft-deleted accounts (`is_active`/`status`, `deleted_at`) are rejected with 401 even if the token is still cryptographically valid.
6. Two computed fields are attached to the loaded user object for downstream use: `token_role` (the role string) and `computed_admin_id` (the tenant `admin_id` this actor belongs to — `None` for superadmin, `self.id` for admin, `store.admin_id` for store-scoped roles).

## 4. Refresh flow

`POST /auth/refresh` (`Backend/apis/auth/refresh.py`) — reads the refresh token from the request body or the `refresh_token` cookie, calls `refresh_access_token()` (`services/auth_service.py`), which:
- looks up the stored **hash** of the refresh token, confirms it hasn't been revoked/already rotated (single-use — old token is invalidated the moment a new pair is issued),
- issues a brand-new access+refresh pair,
- **known bug** (see Phase 2 report): the role-dispatch `if/elif` chain in `refresh_access_token()` only covers `admin`/`manager`/`worker`/`optician` — a `superadmin` or `accountant` refresh token falls through and the function returns `None`, forcing those two roles to fully re-login every 30 minutes instead of silently refreshing.

**Frontend side** (`Frontend/src/lib/axios.js`): a response interceptor watches for `401`s, and (skipping the auth endpoints themselves to avoid a loop) transparently calls `/auth/refresh` once, queues any other requests that 401'd while the refresh is in flight, retries them all after the new cookie is set, and — if the refresh itself fails — dispatches a global `auth:logout` DOM event that `App.jsx`'s `AuthHydration` component listens for to clear the zustand auth store and redirect to login.

## 5. Logout

`POST /auth/logout` (`Backend/apis/auth/logout.py`) — requires a valid access token, revokes the given refresh token server-side (so a stolen refresh token can't be replayed after logout), and clears both cookies.

## 6. Authorization — permissions vs. roles

There is a real, already-implemented **3-tier permission hierarchy**, independent of the role tables above:

- `permissions` (`models/permission.py`) — the catalog: each row is `module:action` (e.g. `sales:create`), with a human `display_name`, `is_dangerous` flag, etc.
- `global_role_permission` — Tier 1: the platform-wide default grant/deny for a given `role_type` + permission.
- `admin_role_permission_override` — Tier 2: a given tenant (`admin_id`) can override the global default for a role, e.g. "in my store, Workers *can* void sales."
- `user_permission_override` — Tier 3: a specific individual user can be granted/denied a permission regardless of their role's default.

`services/permission_service.has_permission(db, actor_type, actor_id, admin_id, permission_key)` resolves these in strict priority order: **user override → admin-role override → global default → deny**. `SUPER_ADMIN` always short-circuits to `True`. Granting a permission (via `set_admin_role_permission`/`set_user_permission`) has a **ceiling check**: the admin performing the grant must themselves already hold that permission, preventing privilege escalation through the override system itself.

This is exposed today via `Backend/core/deps.py`'s `require_permission(*permissions)` dependency factory, and there's already an admin-facing UI for it (`Frontend/src/pages/admin/Permissions.jsx`, backed by `Backend/apis/permission/tier2.py`/`tier3.py`/`staff_list.py`, consumed via `Frontend/src/hooks/usePermissions.js`).

### The gap (central to the Phase 4 plan)

`core/deps.py:250-251` short-circuits `require_permission()` for `ADMIN` and `ACCOUNTANT` actors — they're waved through **before** the permission key is even checked, regardless of what was requested. This is presumably intentional for `ADMIN` (a tenant owner should have full access to their own tenant by definition) but is very likely a bug for `ACCOUNTANT`, whose seed data (`update_seed_data.py`) explicitly scopes them to read-only permissions. Separately, per the user's own description of the system, a number of endpoints/UI actions on the Manager/Worker/Optician ("shopkeeper") side are gated by **role** (e.g. `get_current_manager`, or a frontend `role === 'worker'` check) instead of by calling into this existing permission system — meaning the permission catalog and its admin UI don't actually control shopkeeper-side access consistently yet, even though the plumbing to do so already exists end to end. Phase 4 maps every such spot precisely and proposes wiring it to `require_permission()`/`usePermission()` uniformly, with store-scoping enforced as a separate, always-on layer underneath the permission check.

## 7. Store scoping (independent of permission checks)

Store-level actors (`manager`/`worker`/`optician`) carry a single `store_id`. Endpoints serving store-scoped resources filter by `store.admin_id`/`store_id` derived from `computed_admin_id`/the user's own `store` relationship — this scoping is a separate mechanism from the permission system and needs to keep working unchanged under the Phase 4 redesign (a Worker granted `sales:create` must still only be able to create sales for *their own store*, never another store under the same tenant).
