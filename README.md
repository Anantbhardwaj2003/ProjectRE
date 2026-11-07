# EstateSync — Real Estate & Listing Auditor Platform

EstateSync is a modern, full-stack real estate marketplace and listing verification management system. It bridges property seekers, owners, and administrative listing auditors with real-time property submissions, geolocation-based search, multi-role authentication, and an executive listing audit workflow.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Database Schema](#-database-schema)
- [API Reference (`/api/v1`)](#-api-reference-apiv1)
- [Audit & Status Lifecycle](#-audit--status-lifecycle)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup (Flask)](#backend-setup-flask)
  - [Frontend Setup (React + Vite)](#frontend-setup-react--vite)
- [Configuration & Environment Variables](#-configuration--environment-variables)
- [License](#-license)

---

## 🌟 Key Features

### 🏡 Public & User Portal
- **Property Discovery**: Smart search with dynamic suggestions and category filtering (Rent, Buy, Commercial, Plots, Luxury Villas).
- **Geolocation "Search Near Me"**: Calculates geographical distances using the Haversine formula and pinpoints nearby properties on interactive maps (Leaflet / React-Leaflet).
- **Multi-Step Property Submission**: Intuitive modal form for owners/agents to publish properties:
  - **Step 1**: Contact validation (Name, Mobile).
  - **Step 2**: Property details (Property Type, Ownership Type, Address, Proof Documents).
  - **Step 3**: Instant submission into the administrative review queue.

### 🛡️ Administrative Console & Listing Auditor Dashboard
- **Role-Based Access**: Role-based authentication (`Listing Auditor`, `Super Admin`, etc.) powered by database-driven role masters.
- **KPI Metrics**:
  - **Number of Pending Lists**: Live count of submitted listings requiring administrative review.
  - **Number of Completed Lists**: Verified and approved listings published on the platform.
- **Auditing Workflow**:
  - **Pending Review**: Interactive audit queue with one-click action selector (`Completed` / `Rejected`).
  - **Accepted Listings**: Displays all listings approved by the auditor with verified badges.
  - **Rejected Listings**: Dedicated view of rejected applications.
  - **All Applications**: Unified overview of all property submissions across the platform.
- **Multi-Property Resolution**: Address-aware row identification and deduplication supporting multiple properties per owner.
- **Instant Search**: Real-time client-side search across property names, owners, contact numbers, addresses, and statuses.

---

## Screenshots
<img width="1918" height="912" alt="Screenshot 2026-11-07 123345" src="https://github.com/user-attachments/assets/51a72558-143f-4923-8038-1ba870e5b1f1" />
<img width="1918" height="913" alt="Screenshot 2026-11-07 123650" src="https://github.com/user-attachments/assets/36c902b8-a7ff-4fb2-a849-bea08b7b4394" />
<img width="1917" height="911" alt="Screenshot 2026-11-07 154257" src="https://github.com/user-attachments/assets/d624ef47-1f5a-4ed2-b902-71182442ca00" />

---

## 🛠️ Architecture & Tech Stack

```mermaid
graph TD
    Client["Frontend (React 19 + TypeScript + Vite)"]
    API["Backend (Python / Flask-RESTful API)"]
    DB[("PostgreSQL Database (realestate)")]

    Client -- "HTTP / JSON REST APIs" --> API
    API -- "SQLAlchemy ORM & Raw SQL" --> DB
```

### Frontend
- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Maps & Location**: [Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/)
- **Routing**: [React Router v7](https://reactrouter.com/)

### Backend
- **Framework**: [Flask](https://flask.palletsprojects.com/) + [Flask-RESTful](https://flask-restful.readthedocs.io/)
- **ORM / Database Tooling**: [SQLAlchemy](https://www.sqlalchemy.org/) / [Flask-SQLAlchemy](https://flask-sqlalchemy.palletsprojects.com/)
- **Database Driver**: `psycopg2`
- **Environment**: `python-dotenv`

### Database
- **Engine**: [PostgreSQL](https://www.postgresql.org/)

---

## 📂 Project Directory Structure

```text
ProjectRE/
├── backend/
│   ├── app/
│   │   ├── __init__.py                # Flask app factory, CORS & session config
│   │   ├── extension.py               # SQLAlchemy instance
│   │   └── api/
│   │       └── v1/
│   │           ├── __init__.py
│   │           ├── routes.py          # API v1 blueprint & resource mappings
│   │           └── real_estate.py     # API resource classes & database operations
│   ├── rendering_routes.py            # Static/SSR routes
│   ├── run.py                         # Backend entry point (Port 5000)
│   └── app.env                        # Database connection & backend environment
│
├── frontend/
│   ├── public/                        # Static assets
│   ├── src/
│   │   ├── auth/
│   │   │   └── Login.tsx              # User login screen
│   │   ├── components/
│   │   │   ├── Header.tsx             # Main navigation header
│   │   │   ├── Footer.tsx             # Global footer
│   │   │   ├── MapComponent.tsx       # Leaflet interactive map
│   │   │   └── PostPropertyModal.tsx  # Multi-step property posting modal
│   │   ├── context/
│   │   │   └── AuthContext.tsx        # Global auth & session provider
│   │   ├── pages/
│   │   │   ├── Home.tsx               # Homepage with hero search & map
│   │   │   ├── Admin.tsx              # Admin login & account creation
│   │   │   ├── LisitngDashboard.tsx   # Executive Listing Auditor Dashboard
│   │   │   ├── Dashboard.tsx          # Dashboard alias
│   │   │   └── Profile.tsx            # User profile view
│   │   ├── App.tsx                    # Routes & layout definition
│   │   └── main.tsx                   # React app entry point
│   ├── package.json                   # Frontend dependencies & scripts
│   ├── vite.config.ts                 # Vite bundler configuration & proxy
│   └── tsconfig.json                  # TypeScript compiler settings
│
└── README.md                          # Project documentation
```

---

## 🗄️ Database Schema

The platform relies on PostgreSQL with the following core relational tables:

```mermaid
erDiagram
    Role ||--o{ Adminlogin : "assigned to"
    contacts ||--o{ IndividualPropertyDetails : "owns"
    PropertyTypeMaster ||--o{ IndividualPropertyDetails : "categorizes"
    OwnerTypeMaster ||--o{ IndividualPropertyDetails : "specifies"

    Role {
        int RoleId PK
        string RoleType
    }

    Adminlogin {
        int Adminid PK
        string Username
        string Password
        int Role FK
    }

    contacts {
        int contact_id PK
        string name
        string mobile_number
    }

    PropertyTypeMaster {
        int PropertyId PK
        string PropertyType
    }

    OwnerTypeMaster {
        int OwnerTypeId PK
        string OwnerTypeName
    }

    IndividualPropertyDetails {
        int contact_id FK
        string Propertyname
        int Propertytype FK
        int Ownershiptype FK
        string Propertyaddress
        string Ownershipproof
        string Status
    }
```

---

## 🔌 API Reference (`/api/v1`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/roltypemaster` | Retrieve all master admin roles (`RoleId`, `RoleType`). |
| `GET`, `POST` | `/api/v1/saveadmincontactdetails` | Authenticate an admin or register a new administrative account. |
| `GET`, `POST` | `/api/v1/savecontactdetails` | Query or register contact/owner details (`name`, `mobile_number`). |
| `GET` | `/api/v1/populatepropertytype` | Fetch all property categories (e.g. Penthouse, Plot/Land, Villa). |
| `GET` | `/api/v1/populateownershiptype` | Fetch ownership classifications (Freehold, Leasehold, POA). |
| `POST` | `/api/v1/saveindividualpropertydetails` | Submit property listing with status `'Submitted'`. |
| `GET` | `/api/v1/pendingapplicationlistingauditor` | Retrieve pending property applications (`Status = 'Submitted'`). |
| `GET` | `/api/v1/completedapplicationlistingauditor` | Retrieve audited listings (`Accepted_By_ListingAuditor` or `Rejected_By_ListingAuditor`). |
| `GET`, `POST` | `/api/v1/listingauditorstatusapproved` | Update listing status to `Accepted_By_ListingAuditor` or `Rejected_By_ListingAuditor`. |

---

## 🔄 Audit & Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Submitted: Owner submits via Post Property Modal
    
    state "Pending Application Queue" as Submitted {
        S1: Status = 'Submitted'
        S2: Awaiting Auditor Review
    }

    Submitted --> Accepted_By_ListingAuditor: Auditor selects 'Completed'
    Submitted --> Rejected_By_ListingAuditor: Auditor selects 'Rejected'

    state "Live on Public Portal" as Accepted_By_ListingAuditor {
        A1: 100% Verified
        A2: Appears in 'Accepted Listings'
    }

    state "Archived / Rejected Queue" as Rejected_By_ListingAuditor {
        R1: Audit Declined
        R2: Appears in 'Rejected Listings'
    }
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0 or higher
- **Python**: v3.10 or higher
- **PostgreSQL**: v14.0 or higher

---

### Backend Setup (Flask)

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install flask flask-restful flask-sqlalchemy psycopg2-binary python-dotenv sqlalchemy
   ```

4. **Configure Database Connection**:
   Update `backend/app.env` with your PostgreSQL credentials:
   ```env
   SQLALCHEMY_DATABASE_URI = "postgresql://postgres:your_password@localhost:5432/realestate"
   SECRET_KEY = "your_secret_key"
   ```

5. **Start the Flask server**:
   ```bash
   python run.py
   ```
   *The backend runs at `http://127.0.0.1:5000`.*

---

### Frontend Setup (React + Vite)

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   *The frontend runs at `http://localhost:5173`.*

---

## ⚙️ Configuration & Environment Variables

### Backend (`backend/app.env`)
```env
# PostgreSQL database URI (format: postgresql://username:password@host:port/database)
SQLALCHEMY_DATABASE_URI = "postgresql://postgres:admin@localhost:5433/realestate"

# Secret key for sessions and cookie signing
SECRET_KEY = "real_estate"
```

### Frontend Proxy (`frontend/vite.config.ts`)
Vite proxies API calls starting with `/api` to the Flask backend running on port `5000`:
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:5000',
      changeOrigin: true,
      secure: false
    }
  }
}
```

---

## 📄 License

This project is developed for real estate listing management and auditing. All rights reserved.


