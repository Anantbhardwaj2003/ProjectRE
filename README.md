# EstateSync — Real Estate, Listing Auditor & Superadmin Platform

EstateSync is an enterprise-grade, full-stack real estate marketplace, multi-tier listing audit, and property portfolio management platform. It bridges property seekers, owners, listing auditors, property managers, and executive super administrators through end-to-end listing lifecycles: public property discovery, geolocation-based search, multi-step property submissions, a 3-tier review and inspection pipeline, and an executive Superadmin oversight engine with dedicated audit trails and action logging.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
  - [Public & Owner Portal](#-public--owner-portal)
  - [Listing Auditor Console (`/listingdashboard`)](#-listing-auditor-console-listingdashboard)
  - [Property Manager Dashboard (`/propertymanager`)](#-property-manager-dashboard-propertymanager)
  - [Super Administrator Control Center (`/superadministrator`)](#-super-administrator-control-center-superadministrator)
  - [Standardized 10-Item Pagination](#-standardized-10-item-pagination)
- [Multi-Tier Verification & Status Lifecycle](#-multi-tier-verification--status-lifecycle)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Database Schema](#-database-schema)
- [API Reference (`/api/v1`)](#-api-reference-apiv1)
- [Static Asset Serving (`/static/uploads`)](#-static-asset-serving-staticuploads)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup (Flask)](#backend-setup-flask)
  - [Frontend Setup (React + Vite)](#frontend-setup-react--vite)
- [Configuration & Environment Variables](#-configuration--environment-variables)
- [License](#-license)

---

## 🌟 Key Features

### 🏡 Public & Owner Portal
- **Property Discovery**: Smart search with dynamic query suggestions and category filtering (Rent, Buy, Commercial, Plots, Luxury Villas).
- **Geolocation "Search Near Me"**: Calculates geographical distances using the Haversine formula and pinpoints nearby properties on interactive maps (Leaflet / React-Leaflet).
- **Multi-Step Property Submission**:
  - **Step 1**: Owner contact validation (`name`, `mobile_number`).
  - **Step 2**: Property specifications (Property Type, Ownership Type, Address, Ownership Deed Proof Reference/Attachment).
  - **Step 3**: Instant submission into the administrative review queue with initial status `Submitted`.
- **Accepted Listings Bell Notification**:
  - Real-time popover in the top navigation bar fetching approved applications via `/api/v1/completedapplicationlistingauditor`.
  - Prompts owners when their property deed is verified by the Listing Auditor.
- **5-Angle Media & Landmark Uploader Modal** (`UploadPropertyImagesModal`):
  - Once approved by the auditor, owners can upload 5 mandatory angle photos:
    1. *Front / Exterior Angle*
    2. *Living Room / Main Hall*
    3. *Master Bedroom Angle*
    4. *Kitchen / Dining Space*
    5. *Balcony / Washroom Angle*
  - **File Validation**: Strict client- and server-side validation enforcing a **500 KB limit** per image and verified formats (`.png`, `.jpg`, `.jpeg`, `.webp`).
  - **Surrounding Infrastructure & Landmarks**: Visual landmark inputs (Metro Station, Police Station, Hospital, Shopping Market) with automated sanitation (special character stripping, 100 character maximum).
  - Automatically transitions property status to **`UploadImagesByUser`**.

---

### 🛡️ Listing Auditor Console (`/listingdashboard`)
- **Role-Based Authentication**: Secure login for Listing Auditors via `/admin` credentials.
- **KPI Metrics**:
  - **Pending Applications**: Properties awaiting document & ownership deed audit.
  - **Completed & Verified Applications**: Approved listings passed to the media upload stage.
  - **Rejected Applications**: Declined listings.
- **Auditing Workflow**:
  - Inspect property specifications, ownership type, address, and deed record.
  - One-click action selector:
    - **`Completed` / `Accepted`** &rarr; Updates status to `Accepted_By_ListingAuditor`.
    - **`Rejected`** &rarr; Updates status to `Rejected_By_ListingAuditor`.
- **Pagination & Search**: Built-in 10-item pagination and real-time keyword search.

---

### 🏢 Property Manager Dashboard (`/propertymanager`)
- **Dedicated Management Role**: Separate dashboard and credentials for Property Managers with direct redirection from `/admin`.
- **Media Review Queue (`UploadImagesByUser`)**:
  - Consumes `/api/v1/propertyimageupload` for incoming properties with uploaded angle photos.
- **Comprehensive Media & Deed Inspection Modal**:
  - **Owner & Contact Details**: Contact name, phone link, and current pipeline stage.
  - **Property Specifications**: Category, tenure/ownership type, and complete address.
  - **Deed Record & Reference**: View deed details, click **Copy Ref** to clipboard, or open attached deed documents via **Open Document**.
  - **5 Verified Angle Photos**: High-resolution gallery preview with click-to-enlarge lightbox modal.
  - **Infrastructure & Landmarks**: Visual cards for nearby Metro, Police Station, Hospital, and Market.
- **Approval & Active Portfolio Integration**:
  - **`Accept / Mark Completed`** &rarr; Updates status to **`Accepted_By_PropertyManager`**, moving the property into **Active Properties / Live Portfolio**.
  - **`Reject Property`** &rarr; Updates status to **`Rejected_By_PropertyManager`**.
- **Pagination**: 10 items per page with page controls and status filtering.

---

### 👑 Super Administrator Control Center (`/superadministrator`)
- **Full Platform Scope**: Executive bird's-eye view aggregating properties from every stage: initial submissions, auditor verified, media pending, property manager active listings, and declined records.
- **Dedicated Status & Reason Architecture**:
  - **Original Pipeline `Status`**: Displays the lifecycle state (`Submitted`, `UploadImagesByUser`, `Accepted_By_ListingAuditor`, `Accepted_By_PropertyManager`, `Rejected_By_PropertyManager`).
  - **Dedicated `AdminStatus` Column**: Isolated badge display for superadmin decisions (`Whitelisted`, `AdminProcess`, `Rejected`, or `— Not Set —`).
  - **Dedicated `Reason` Column**: Separate table column displaying the full, un-truncated reason inside a styled status-colored card (`whitespace-normal break-words leading-relaxed`).
- **Executive Action Selector with Reason Prompt**:
  - When selecting an action from the dropdown, an interactive reason field opens directly in-row:
    - **`✓ Full Verify & Make Live`** &rarr; Stored in `public.SuperAdminFinalAction` as `AdminStatus = 'Whitelisted'` and sets pipeline status to `Accepted_By_PropertyManager`.
    - **`🛡️ Mark Auditor Approved`** &rarr; Stored as `AdminStatus = 'AdminProcess'` and sets pipeline status to `Accepted_By_ListingAuditor`.
    - **`✕ Decline / Flag Listing`** &rarr; Stored as `AdminStatus = 'Rejected'` and sets pipeline status to `Rejected_By_PropertyManager`.
- **Canonical Deduplication Engine (`getPropertyDedupeKey`)**:
  - Multi-endpoint property feed normalization by normalized address (`addr_${cleanAddr}`), database ID (`prop_${propId}`), and contact identity.
  - Merges duplicate submissions and historical audit entries into a single definitive row while preserving the highest lifecycle rank, all angle photos, landmarks, and the newest executive reason.
- **Full-Text Display**: Addresses and reasons wrap completely with no ellipsis (`...`) truncation.

---

### 📄 Standardized 10-Item Pagination
Pagination with a clean 10-item page size has been integrated across all three administrative dashboards:
- **`SuperAdministrator.tsx`**: 10 properties per page with tab-based category counts.
- **`PropertyManager.tsx`**: 10 properties per page across All, Pending Media, Active Live, and Rejected tabs.
- **`LisitngDashboard.tsx`**: 10 properties per page across All, Pending Deed, and Completed tabs.
- **Controls**: First (`<<`), Previous (`<`), Active Page Pill, Next (`>`), and Last (`>>`) with dynamic range indicators (`Showing 1 to 10 of 42 properties`).

---

## 🔄 Multi-Tier Verification & Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Submitted: Owner submits via Post Property Modal
    
    state "Tier 1: Listing Auditor Review" as Tier1 {
        Submitted: Status = 'Submitted'
        Submitted --> Accepted_By_ListingAuditor: Auditor approves deed
        Submitted --> Rejected_By_ListingAuditor: Auditor rejects deed
    }

    state "Tier 2: Owner Media Upload" as Tier2 {
        Accepted_By_ListingAuditor --> UploadImagesByUser: Owner uploads 5 Angle Photos & Landmarks
    }

    state "Tier 3: Property Manager Inspection" as Tier3 {
        UploadImagesByUser --> Accepted_By_PropertyManager: Manager verifies photos & landmarks
        UploadImagesByUser --> Rejected_By_PropertyManager: Manager rejects media
    }

    state "Superadmin Executive Layer (SuperAdminFinalAction)" as Superadmin {
        Whitelisted: AdminStatus = 'Whitelisted' (Full Verify & Make Live)
        AdminProcess: AdminStatus = 'AdminProcess' (Auditor Approved Override)
        Rejected: AdminStatus = 'Rejected' (Decline / Flag Listing)
    }

    Tier1 --> Superadmin: Executive Decision / Override
    Tier2 --> Superadmin: Executive Decision / Override
    Tier3 --> Superadmin: Executive Decision / Override

    state "Platform Live Portfolio" as Live {
        Accepted_By_PropertyManager: 100% Operational & Live for Buyers / Tenants
        Whitelisted --> Accepted_By_PropertyManager: Live Active
    }

    state "Declined Archives" as Archive {
        Rejected_By_ListingAuditor: Deed Verification Failed
        Rejected_By_PropertyManager: Media Inspection Failed
        Rejected --> Rejected_By_PropertyManager: Superadmin Flagged
    }
```

---

## 🛠️ Architecture & Tech Stack

```mermaid
graph TD
    Client["Frontend (React 19 + TypeScript + Vite)"]
    API["Backend (Python / Flask-RESTful API)"]
    Uploads["Static Uploads (/static/uploads/contact_id/indprop_id/)"]
    DB[("PostgreSQL Database (realestate)")]

    Client -- "REST JSON & Multipart FormData" --> API
    API -- "Store 5 Angle Photos & Deeds" --> Uploads
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
- **Database Driver**: `psycopg2-binary`
- **File Uploads & Security**: `werkzeug.utils.secure_filename`, `uuid`
- **Environment**: `python-dotenv`

### Database
- **Engine**: [PostgreSQL 14+](https://www.postgresql.org/)

---

## 📂 Project Directory Structure

```text
ProjectRE/
├── backend/
│   ├── app/
│   │   ├── __init__.py                     # Flask app factory, static uploads route & CORS
│   │   ├── extension.py                    # SQLAlchemy database instance
│   │   ├── static/
│   │   │   └── uploads/                    # Physical store: /<contact_id>/<indprop_id>/<images>
│   │   └── api/
│   │       └── v1/
│   │           ├── __init__.py
│   │           ├── routes.py               # Blueprint & API endpoint registration
│   │           ├── real_estate.py          # Auditor, auth & property submission resources
│   │           ├── propertyimageupload.py  # 5-angle photo upload & PropertyManagerCompleted
│   │           └── superadminaction.py     # SuperAdminFinalAction table & executive actions
│   ├── rendering_routes.py                 # Static SSR routes
│   ├── run.py                              # Backend entry point (Port 5000)
│   └── app.env                             # Database connection & secret key
│
├── frontend/
│   ├── public/                             # Static assets
│   ├── src/
│   │   ├── auth/
│   │   │   └── Login.tsx                   # User login screen
│   │   ├── components/
│   │   │   ├── Header.tsx                  # Navigation header with Accepted Listings Bell
│   │   │   ├── Footer.tsx                  # Global footer
│   │   │   ├── MapComponent.tsx            # Leaflet interactive map
│   │   │   ├── PostPropertyModal.tsx       # Initial property submission modal
│   │   │   └── UploadPropertyImagesModal.tsx # 5-angle photo & landmark upload modal
│   │   ├── context/
│   │   │   └── AuthContext.tsx             # Global authentication & session provider
│   │   ├── pages/
│   │   │   ├── Home.tsx                    # Homepage with search & nearby properties
│   │   │   ├── Admin.tsx                   # Role-based admin login (routes to role console)
│   │   │   ├── LisitngDashboard.tsx        # Listing Auditor Dashboard (10-item pagination)
│   │   │   ├── PropertyManager.tsx         # Property Manager Dashboard (10-item pagination)
│   │   │   ├── SuperAdministrator.tsx      # Super Administrator Console (10-item pagination)
│   │   │   ├── Dashboard.tsx               # Dashboard route alias
│   │   │   └── Profile.tsx                 # User profile view
│   │   ├── App.tsx                         # Client routes & layout definition
│   │   └── main.tsx                        # React application entry point
│   ├── package.json                        # Frontend dependencies & scripts
│   ├── vite.config.ts                      # Vite configuration & proxy routes (/api, /static)
│   └── tsconfig.json                       # TypeScript compiler settings
│
└── README.md                               # Project documentation
```

---

## 🗄️ Database Schema

```mermaid
erDiagram
    Role ||--o{ Adminlogin : "assigned to"
    contacts ||--o{ IndividualPropertyDetails : "owns"
    contacts ||--o{ PropertyUploadImage : "uploads"
    contacts ||--o{ SuperAdminFinalAction : "acts on"
    PropertyTypeMaster ||--o{ IndividualPropertyDetails : "categorizes"
    OwnerTypeMaster ||--o{ IndividualPropertyDetails : "specifies"
    IndividualPropertyDetails ||--o{ PropertyUploadImage : "has media for"
    IndividualPropertyDetails ||--o{ SuperAdminFinalAction : "subject to"
    PropertyUploadImage ||--o{ SuperAdminFinalAction : "inspects"

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
        int IndProp_Id PK
        int contact_id FK
        string Propertyname
        int Propertytype FK
        int Ownershiptype FK
        string Propertyaddress
        string Ownershipproof
        string Status
        string AdminStatus
    }

    PropertyUploadImage {
        int ImageId PK
        int contact_id FK
        int indprop_id FK
        string FrontExteriorAngle
        string LivingRoomMainHall
        string MasterBedroomAngle
        string KitchenDiningSpace
        string BalconyWashroomAngle
        string NearestMetroStation
        string NearestPoliceStation
        string NearestHospital
        string NearestShoppingMarket
    }

    SuperAdminFinalAction {
        int ActionId PK
        int ImageId FK
        int contact_id FK
        int indprop_id FK
        string AdminStatus
        string Reason
    }
```
---

## 🔌 API Reference (`/api/v1`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/roltypemaster` | Retrieve master admin roles (`RoleId`, `RoleType`). |
| `GET`, `POST` | `/api/v1/saveadmincontactdetails` | Authenticate an admin or register a new administrative account. |
| `GET`, `POST` | `/api/v1/savecontactdetails` | Query or register owner contact details (`name`, `mobile_number`). |
| `GET` | `/api/v1/populatepropertytype` | Fetch all property categories (e.g., Penthouse, Plot/Land, Villa). |
| `GET` | `/api/v1/populateownershiptype` | Fetch ownership classifications (Freehold, Leasehold, POA). |
| `POST` | `/api/v1/saveindividualpropertydetails` | Initial property submission with status `'Submitted'`. |
| `GET` | `/api/v1/pendingapplicationlistingauditor` | Retrieve pending listings for Listing Auditor (`Status = 'Submitted'`). |
| `GET` | `/api/v1/completedapplicationlistingauditor` | Retrieve audited listings (`Accepted_By_ListingAuditor` / `Rejected_By_ListingAuditor`). |
| `GET`, `POST` | `/api/v1/listingauditorstatusapproved` | Update listing status to `Accepted_By_ListingAuditor` or `Rejected_By_ListingAuditor`. |
| `GET` | `/api/v1/propertyimageupload` | Retrieve pending media review listings (`Status = 'UploadImagesByUser'`). |
| `POST` | `/api/v1/propertyimageupload` | Upload 5 angle photos (500 KB limit) and landmarks; updates status to `UploadImagesByUser`. |
| `GET` | `/api/v1/propertymanagercompleted` | Retrieve completed listings (`Accepted_By_PropertyManager` and `Rejected_By_PropertyManager`). |
| `POST` | `/api/v1/propertymanagercompleted` | Transition status from `UploadImagesByUser` to `Accepted_By_PropertyManager` or `Rejected_By_PropertyManager`. |
| `GET` | `/api/v1/superadminfinalaction` | Retrieve Superadmin executive decisions, reasons, and status overrides across listings. |
| `POST` | `/api/v1/superadminfinalaction` | Record a Superadmin executive decision (`Whitelisted`, `AdminProcess`, `Rejected`) with custom reason in `SuperAdminFinalAction`. |

---

## 🖼️ Static Asset Serving (`/static/uploads`)

Uploaded photos and ownership deed documents are stored in structured directories:
```text
backend/app/static/uploads/<contact_id>/<indprop_id>/<angle_filename>.jpg
```

Served via Flask route `/static/uploads/<path:filename>` and proxied transparently by Vite to `http://127.0.0.1:5000/static/uploads/`.

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
   pip install flask flask-restful flask-sqlalchemy psycopg2-binary python-dotenv sqlalchemy werkzeug
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
Vite proxies API calls and static assets to the Flask backend running on port `5000`:
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:5000',
      changeOrigin: true,
    },
    '/static': {
      target: 'http://127.0.0.1:5000',
      changeOrigin: true,
    },
    '/uploads': {
      target: 'http://127.0.0.1:5000',
      changeOrigin: true,
    },
  },
}
```

---

## 📄 License

This project is developed for real estate listing management, auditing, and media inspection. All rights reserved.
