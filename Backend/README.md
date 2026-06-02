# TechSentinals Optical Store - Backend Services

Welcome to the backend REST API services for the TechSentinals Optical Store Management System. This package provides high-performance, asynchronous REST endpoints for authentication, staff directory, inventory, sales, and prescription tracking.

---

## 📦 Core Dependencies Explanation

This project relies on the following industry-standard libraries to provide speed, security, and type safety:

### 1. `fastapi>=0.110.0`
* **What it is**: A modern, high-performance web framework for building APIs with Python.
* **Why we use it**: It is incredibly fast (on par with NodeJS and Go), provides automatic Swagger/OpenAPI documentation (accessible at `/docs`), and features native support for asynchronous programming (`async/def`).

### 2. `uvicorn[standard]>=0.28.0`
* **What it is**: An ASGI (Asynchronous Server Gateway Interface) web server implementation for Python.
* **Why we use it**: It serves as the lightning-fast web server that hosts and runs the FastAPI application. The `[standard]` extra includes `uvloop` for high-performance network handling.

### 3. `pydantic>=2.6.0`
* **What it is**: Data validation and settings management using Python type annotations.
* **Why we use it**: It enforces strict request body parsing, payload validation, and automatic serialization of response models. If a client sends invalid data, Pydantic rejects it automatically with detailed validation errors.

### 4. `sqlalchemy[asyncio]>=2.0.28`
* **What it is**: The premier Python Object Relational Mapper (ORM) and SQL toolkit.
* **Why we use it**: It translates Python classes (Models) directly into SQL tables and queries. The `[asyncio]` extension allows database queries to run asynchronously, ensuring that database I/O doesn't block web request processing.

### 5. `alembic>=1.13.1`
* **What it is**: A lightweight database migration tool for usage with SQLAlchemy.
* **Why we use it**: It tracks model modifications over time and generates migration scripts to upgrade or downgrade the database schema safely in production.

### 6. `asyncpg>=0.29.0`
* **What it is**: A database interface library designed specifically for PostgreSQL.
* **Why we use it**: It offers high-speed, asynchronous connection pooling and communication with PostgreSQL, operating significantly faster than standard synchronous drivers.

### 7. `python-jose[cryptography]>=3.3.0`
* **What it is**: A JavaScript Object Signing and Encryption (JOSE) implementation in Python.
* **Why we use it**: It handles the creation, encoding, signing, and decoding of JSON Web Tokens (JWT) for secure authentication.

### 8. `bcrypt>=4.0.0`
* **What it is**: Modern password hashing algorithm designed to resist brute-force attacks.
* **Why we use it**: It safely hashes plain-text user passwords before saving them, and securely verifies them during login.

### 9. `python-dotenv>=1.0.0`
* **What it is**: Environment variable loader.
* **Why we use it**: It reads key-value pairs from a `.env` file and adds them to environment variables, separating secrets from the codebase.

### 10. `pydantic-settings>=2.2.0`
* **What it is**: Dynamic configuration management subclassed from Pydantic.
* **Why we use it**: It reads variables from the environment and validates types and values at application startup, failing fast if crucial configuration keys are missing.

---

## ⚡ Command Reference Guide

### 🚀 1. Uvicorn: Running the Server

Uvicorn is used to run your FastAPI server. Here are the most useful commands:

* **Development Run (with Auto-Reload)**:
  Runs the server and automatically restarts it whenever code changes are saved.
  ```bash
  uvicorn main:app --reload
  ```

* **Custom Host and Port**:
  Binds the server to all network interfaces (`0.0.0.0`) on a custom port (e.g., `8000`).
  ```bash
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
  ```

* **Production Run (Multiple Workers)**:
  Spawns multiple workers to handle high load without file reload.
  ```bash
  uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
  ```

---

### 🛠️ 2. Alembic: Database Schema Migrations

Alembic keeps your database schema in sync with your SQLAlchemy models.

* **Initialize Migrations (Done Once per Project)**:
  Sets up the migrations directory and configuration.
  ```bash
  alembic init migrations
  ```

* **Generate an Automatic Migration Revision**:
  Compares your current SQLAlchemy models against the database schema and autogenerates the upgrade/downgrade code.
  ```bash
  alembic revision --autogenerate -m "add role relation to users"
  ```

* **Apply Migrations (Upgrade to Latest)**:
  Runs all pending upgrade scripts to bring the database schema to the latest state.
  ```bash
  alembic upgrade head
  ```

* **Rollback Last Migration (Downgrade 1 Step)**:
  Reverts the last applied migration.
  ```bash
  alembic downgrade -1
  ```

* **Check Current Migration Status**:
  Shows the current active revision ID of the database.
  ```bash
  alembic current
  ```

* **View Migration History**:
  Shows a list of all migration revisions in chronological order.
  ```bash
  alembic history
  ```

* **Force Stamp Current Schema Version**:
  Sets the database version to a specific revision without executing the script (useful if manually updating tables).
  ```bash
  alembic stamp head
  ```

---

## 🔄 Development Helper: Recreating and Seeding the DB

To facilitate development, a script is provided to completely wipe the PostgreSQL database, recreate all tables, and seed roles (`admin`, `manager`, `worker`, `optician`) and default users in one command:

```bash
python db/recreate_db.py
```
This is the recommended way to reset your environment during active feature development.
