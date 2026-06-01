# 🕶️ TechSentinals Optical Store Backend

Welcome to the **TechSentinals Optical Store** backend project. This is a modern, high-performance, robust REST API built using **FastAPI** to power the operations of an optical store management system.

---

## 📂 Project Architecture

The backend codebase is structured logically to separate concerns and ensure maintainability as the application grows:

```text
TechSentinals_Optical_Store/
├── .venv/                      # Python Virtual Environment (git-ignored)
├── Backend/                    # Core backend source directory
│   ├── apis/                   # API routes and endpoints (controllers)
│   ├── core/                   # Security, configuration, and global settings
│   ├── db/                     # Database session setup and connection engines
│   ├── migrations/             # Alembic database migrations
│   ├── models/                 # Database models (SQLAlchemy)
│   ├── schemas/                # Pydantic data validation and serialization models
│   ├── services/               # Business logic layer
│   ├── tasks/                  # Background or asynchronous celery tasks
│   └── main.py                 # FastAPI application entry point
├── requirements.txt            # Project third-party dependencies list
└── README.md                   # Project documentation (this file)
```

---

## 🚀 Getting Started

Follow these step-by-step instructions to set up the development environment on your local machine.

### 📋 Prerequisites
Make sure you have **Python 3.8 or higher** installed. You can check your version by running:
```bash
python --version
```

---

### 1️⃣ Setting Up the Virtual Environment

A virtual environment isolates project-specific dependencies, preventing conflicts with global packages.

#### Create the Virtual Environment
Navigate to the root directory of the project and run the following command:
```bash
python -m venv .venv
```
*(This creates a folder named `.venv` in your project root containing a clean Python environment.)*

---

### 2️⃣ Activating the Virtual Environment

Before installing dependencies or running the server, you **must activate** the virtual environment.

#### 🪟 On Windows:
Depending on your terminal of choice, run the appropriate command:

* **PowerShell** (Recommended):
  ```powershell
  .venv\Scripts\Activate.ps1
  ```
  > [!TIP]
  > If you encounter an execution policy error in PowerShell, run this command to bypass it for the session:
  > `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process`

* **Command Prompt (CMD)**:
  ```cmd
  .venv\Scripts\activate.bat
  ```

#### 🍎/🐧 On macOS & Linux:
```bash
source .venv/bin/activate
```

> [!NOTE]
> Once activated, your terminal prompt will show `(.venv)` at the beginning of the line, indicating that all python/pip commands are now executing inside the virtual environment.

---

### 3️⃣ Installing Dependencies

With the virtual environment activated, install all required packages listed in `requirements.txt`:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

---

### 4️⃣ Running the FastAPI Application

To launch the development server, navigate to the `Backend` directory and use **Uvicorn**:
```bash
cd Backend
uvicorn main:app --reload
```

#### Explanation of arguments:
- `main:app`: Refers to `main.py` file and the `app` instance of FastAPI defined within it.
- `--reload`: Enables hot-reloading, which automatically restarts the server when you make code changes.

---

### 5️⃣ Accessing the Interactive API Documentation

FastAPI automatically generates beautiful interactive API documentation. Once the server is running, open your browser and navigate to:

* **Interactive Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) (Great for testing API endpoints directly from the browser)
* **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc) (Clean, structured documentation layout)

---

## 🛠️ Development Workflow & Best Practices

### Adding New Dependencies
If you need to install a new third-party library during development (e.g., `requests`):
1. Activate your virtual environment: `.venv\Scripts\Activate.ps1`
2. Install the library: `pip install requests`
3. Update the `requirements.txt` file so other developers have access to it:
   ```bash
   pip freeze > requirements.txt
   ```

### Deactivating the Virtual Environment
To exit the virtual environment and return to your system's global Python environment, simply run:
```bash
deactivate
```
