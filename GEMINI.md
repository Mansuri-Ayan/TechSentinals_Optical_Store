# TechSentinals Optical Store Management System

This file serves as a global memory and directory rule guidelines for Antigravity AI pair programming. Refer to this documentation before making modifications to ensure system integrity.

---

## 1. Project Tech Stack
* **Backend**: FastAPI, SQLAlchemy (Async Mode via `asyncpg`), Pydantic v2 schemas, PostgreSQL database.
* **Frontend**: React (Vite-based), Tailwind CSS, Axios client, Zustand store (`useAuthStore`, `useStoreStore`), TanStack Query hooks.

---

## 2. Directory Map
* **Backend Models**: `Backend/models/` (SQLAlchemy models)
* **Backend Schemas**: `Backend/schemas/` (Pydantic validation schemas)
* **Backend Services**: `Backend/services/` (Service and business logic layers)
* **Backend APIs**: `Backend/apis/` (FASTAPI request handlers, structured by feature folders)
* **Backend Routes**: `Backend/routes/` (Main router registrations)
* **Frontend APIs**: `Frontend/src/api/` (Axios API bindings)
* **Frontend Hooks**: `Frontend/src/hooks/` (TanStack query wrappers)
* **Frontend Pages**: `Frontend/src/pages/` (React components and portals)

---

## 3. Core Constraints & Conventions

### A. Unique Reference Sequences (Global Uniqueness)
* Models for **Invoices** (`Sale.invoice_number`), **Purchase Orders** (`PurchaseOrder.po_number`), and **Exchanges** (`Exchange.exchange_number`) enforce a strict global unique index constraint.
* **DO NOT** count rows scoped by `admin_id` to generate sequential codes (this triggers multitenant unique constraint conflicts when other admin users are created).
* **Generation Rule**: Query the highest code prefix (e.g. `PO-2026-%`) globally using `order_by(desc())`, parse the numeric suffix, and increment it.

### B. Soft-Delete and Deactivation Behavior
* **Store Deactivation**:
  * Deleting a store via `DELETE /stores/{id}` **must only deactivate the store** (set `store.is_active = False` but leave `store.deleted_at = None`). This keeps the store visible as `INACTIVE` in dashboard lists.
  * Deactivating a store must automatically deactivate all of its associated staff (`Manager`, `Worker`, `Optician` records get `is_active = False`).
  * If a Super Admin deletes an entire Admin account, all associated store branches are hidden (they get `store.deleted_at = datetime.now()`).
* **Store-Scoped Brand/Category Deactivations**:
  * Modifying local store active status (`category.is_active` or `brand.is_active`) must write to local override tables, and the transient attribute on the model object must be set **only after** calling `db.commit()` and `db.refresh()`. Writing in-memory attributes before DB commit will cascade changes to the base global table.

### C. Admin & Permission Configuration
* On Admin creation (via Super Admin CRUD or Public Admin Registration), a copy of standard permissions must be duplicated from `GlobalRolePermission` to `AdminRolePermissionOverride` via `copy_global_permissions_to_admin()`.
