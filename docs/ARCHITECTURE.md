# Architecture Overview

## 1. Stack

**Backend** (`Backend/`)
- FastAPI ≥0.110, Uvicorn (ASGI server)
- SQLAlchemy 2.0, async ORM, via `asyncpg` — PostgreSQL
- Alembic for schema migrations
- Pydantic v2 (+ `pydantic-settings` for typed config) for request/response validation
- `python-jose` for JWT, `bcrypt` for password hashing
- Supporting libs: `python-barcode` + `Pillow` (barcode image generation), `reportlab` (PDF generation), `aiofiles`

**Frontend** (`Frontend/`)
- React 19, built with Vite 8
- React Router 7 (client-side routing)
- TanStack Query v5 (server state / caching / mutations)
- Zustand v5 (client/global UI state — auth session, selected store, POS cart)
- react-hook-form + zod (forms/validation)
- axios (HTTP client, single shared instance with refresh-token interceptor)
- Tailwind CSS v4 (utility-first styling, CSS-first `@theme` config)
- react-select, react-toastify, lucide-react (icons)

**Database**: PostgreSQL (via `asyncpg`), managed entirely through SQLAlchemy models + Alembic migrations (`Backend/migrations/versions/`, 18 revisions).

## 2. High-level shape

This is a **monolith backend + SPA frontend**, not microservices. One FastAPI process serves ~30 routers covering every module; one Vite-built React app serves every role's UI, gated client-side by route + role/permission checks and server-side by the FastAPI dependency system.

```
Frontend (Vite/React SPA)  ── HTTPS/JSON + cookies ──▶  Backend (FastAPI, single process)
                                                              │
                                                              ▼
                                                     PostgreSQL (asyncpg, async SQLAlchemy)
```

CORS is currently restricted to localhost origins (`Backend/main.py`), with `allow_credentials=True` so cookie-based auth works across the frontend's dev ports (3000/5173-5175).

## 3. Backend folder structure & layering

```
Backend/
├── main.py           # FastAPI app instance, CORS, global exception handler, router registration
├── core/
│   ├── config.py      # pydantic-settings Settings — the ONLY place env vars are read
│   ├── security.py    # password hashing, JWT encode/decode
│   └── deps.py         # get_current_user, get_current_admin/manager, require_permission() — the auth/authz dependency layer
├── db/
│   ├── session.py      # async engine + session factory + declarative Base
│   └── seed_data.py, recreate_db.py, check_*.py  # dev-only utility scripts
├── models/            # SQLAlchemy ORM models — 47 files, one table per file (see DATA_MODEL.md)
├── schemas/           # Pydantic request/response models, one file per module
├── routes/            # thin APIRouter aggregators — one per module, included into main.py
├── apis/              # actual endpoint handlers, grouped in subfolders per module
├── services/          # business logic — 31 files, one per module; routes/apis call into these rather than querying the DB directly
├── migrations/         # Alembic — env.py, versions/ (18 revisions)
├── test/               # manual smoke-test scripts (NOT an automated suite — see BUG_AUDIT.md)
├── seed_permissions.py # seeds the Permission catalog + GlobalRolePermission defaults
└── requirements.txt
```

The layering is real and consistently followed: `routes/*.py` just does `router.include_router(...)` composition; `apis/<module>/*.py` holds the actual `@router.get/post/...` handlers (request parsing, permission dependency, calling a service, shaping the response); `services/*.py` holds the actual DB queries and business rules. Most modules follow this cleanly — see MODULES.md for the per-module breakdown and any exceptions.

## 4. Frontend folder structure

```
Frontend/src/
├── main.jsx, App.jsx, App.css, index.css   # entry point, AuthHydration, global styles
├── routes/
│   └── AppRouter.jsx   # the actual route tree (AdminRouter.jsx/ShopKeeperRouter.jsx/UserRoute.jsx exist but appear superseded — verify in Phase 2)
├── layouts/            # AdminLayout, ShopKeeperLayout, AccountantLayout, UserLayout — shared chrome (sidebar/topbar) per route group
├── pages/              # admin/, accountant/, shopkeeper/, auth/, user/, shared/ — one file per screen, 56 files total
├── components/         # admin/, shopkeeper/, loyalty/, accountant/, customer/, shared/ — shared/ holds generic primitives (DataTable, Pagination, FormModal, ConfirmationModal, FilterBar, SearchBar, StatusBadge, EmptyState, LoadingState, DetailDrawer)
├── hooks/              # 33 files, one per domain, each wrapping TanStack Query around the matching api/ module
├── api/                # 24 domain folders, one axios-calling module per backend module — always imports the shared client from lib/axios.js
├── lib/axios.js        # the one real axios instance (baseURL, withCredentials, 401→refresh interceptor)
├── store/               # zustand: store.js (auth + store selection), cartStore.js (POS cart)
├── data/                # legacy/mock data files — likely dead, see BUG_AUDIT.md
├── utils/, services/    # small helpers (billSettings formatting, customerService.js)
└── config/axios.js      # dead file (0 bytes) — do not use, see BUG_AUDIT.md
```

Convention: `pages/<role>/<Page>.jsx` renders a screen, composing `components/<domain>/*` pieces and reading data via `hooks/use<Domain>.js`, which wraps `api/<domain>/<domain>.api.js`, which calls the shared `lib/axios.js` client. This chain is followed consistently across ~24 domains (see MODULES.md).

## 5. Multi-tenancy model

Every `Admin` row is a tenant (an optical store *business*, which may operate multiple physical `Store` locations). All tenant-scoped data ultimately traces back to an `admin_id`, either directly (e.g. `Customer.admin_id`) or transitively through `store.admin_id` for store-scoped staff and store-scoped records. `SuperAdmin` sits above all tenants. See AUTH_FLOW.md §1 and §7 for how this is enforced at request time, and DATA_MODEL.md for exactly which tables carry `admin_id` vs. `store_id`.

## 6. Known structural caveats

(Full detail in BUG_AUDIT.md — flagged here because they affect how to read the rest of the architecture.)
- `main.py`'s `lifespan()` startup hook runs raw `ALTER TABLE`/`ALTER TYPE` SQL outside of Alembic, so the migration history alone does not fully reconstruct the schema the models expect.
- The permission hierarchy described in AUTH_FLOW.md §6 is fully implemented at the data/service layer but not yet consistently the *only* gate used — some endpoints/UI still gate by role directly. This is the subject of the Phase 4 Permission Management plan.
