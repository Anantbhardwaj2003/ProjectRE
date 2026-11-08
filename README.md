# EstateSync — Real Estate & Listing Auditor Platform

EstateSync is an enterprise-grade, full-stack real estate marketplace, listing audit, and property management platform. It bridges property seekers, owners, listing auditors, and property managers through end-to-end listing lifecycles: public property discovery, geolocation-based search, multi-step property submissions, 2-tier verification pipelines (Listing Auditor deed review + Property Manager 5-angle media inspection), and automated workflow transitions.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
  - [Public & Owner Portal](#-public--owner-portal)
  - [Listing Auditor Console](#-listing-auditor-console)
  - [Property Manager Dashboard](#-property-manager-dashboard)
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
  - Prompts owners when their property is verified by the Listing Auditor.
- **5-Angle Media & Landmark Uploader Modal** (`UploadPropertyImagesModal`):
  - Once approved by the auditor, owners can upload 5 mandatory angle photos:
    1. *Front / Exterior Angle*
    2. *Living Room / Main Hall*
    3. *Master Bedroom Angle*
    4. *Kitchen / Dining Space*
    5. *Balcony / Washroom Angle*
  - **File Validation**: Strict client- and server-side validation enforcing a **500 KB limit** per image and verified formats (`.png`, `.jpg`, `.jpeg`, `.webp`).
  - **Surrounding Infrastructure & Landmarks**: Optional fields (Metro Station, Police Station, Hospital, Shopping Market) with automated sanitation (special character stripping, 100 character maximum).
  - Automatically transitions property status to **`UploadImagesByUser`**.

---

### 🛡️ Listing Auditor Console (`/listingdashboard`)
- **Role-Based Authentication**: Secure login for Listing Auditors via `/admin` credentials.
- **KPI Metrics**:
  - **Pending Applications**: Properties awaiting document & ownership audit.
  - **Completed & Verified Applications**: Approved listings passed to the media upload stage.
  - **Rejected Applications**: Declined listings.
- **Auditing Workflow**:
  - Inspect property specifications, ownership type, address, and deed record.
  - One-click action selector:
    - **`Completed` / `Accepted`** &rarr; Updates status to `Accepted_By_ListingAuditor`.
    - **`Rejected`** &rarr; Updates status to `Rejected_By_ListingAuditor`.
- **Deduplication & Multi-Property Support**: Full support for single owners with multiple property listings.

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
  - Actions directly accessible from the table action dropdown or inspection modal footer:
    - **`Accept / Mark Completed`** &rarr; Updates status to **`Accepted_By_PropertyManager`**, moving the property into **Active Properties / Live Portfolio**.
    - **`Reject Property`** &rarr; Updates status to **`Rejected_By_PropertyManager`**.

---

## Screenshots
<img width="1918" height="912" alt="Screenshot 2026-11-07 123345" src="https://github.com/user-attachments/assets/51a72558-143f-4923-8038-1ba870e5b1f1" />
<img width="1918" height="917" alt="Screenshot 2026-11-07 163908" src="https://github.com/user-attachments/assets/702fc3a9-98c9-4b5f-8dd1-66dd1fed1e5a" />
<img width="1917" height="911" alt="Screenshot 2026-11-07 154257" src="https://github.com/user-attachments/assets/d624ef47-1f5a-4ed2-b902-71182442ca00" />
<img width="1918" height="911" alt="Screenshot 2026-11-08 095020" src="https://github.com/user-attachments/assets/76a776ef-66dc-4e33-b48f-c6d62946b89e" />

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

    state "Platform Live Portfolio" as Live {
        Accepted_By_PropertyManager: 100% Operational & Live for Buyers / Tenants
    }

    state "Declined Archives" as Rejected {
        Rejected_By_ListingAuditor: Deed Verification Failed
        Rejected_By_PropertyManager: Media Inspection Failed
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

    Client -- "HTTP / REST JSON & FormData" --> API
    API -- "Store 5 Angle Photos" --> Uploads
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
- **File Uploads & Security**: `werkzeug.utils.secure_filename`, `uuid`
- **Environment**: `python-dotenv`

### Database
- **Engine**: [PostgreSQL](https://www.postgresql.org/)

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
│   │           └── propertyimageupload.py  # 5-angle photo upload & PropertyManagerCompleted
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
│   │   │   ├── Admin.tsx                   # Admin login with role-based routing
│   │   │   ├── LisitngDashboard.tsx        # Listing Auditor Dashboard
│   │   │   ├── PropertyManager.tsx         # Property Manager Dashboard & Media Inspection
│   │   │   ├── Dashboard.tsx               # Dashboard alias
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

The platform relies on PostgreSQL with the following core relational tables:

```mermaid
erDiagram
    Role ||--o{ Adminlogin : "assigned to"
    contacts ||--o{ IndividualPropertyDetails : "owns"
    contacts ||--o{ PropertyUploadImage : "uploads"
    PropertyTypeMaster ||--o{ IndividualPropertyDetails : "categorizes"
    OwnerTypeMaster ||--o{ IndividualPropertyDetails : "specifies"
    IndividualPropertyDetails ||--o{ PropertyUploadImage : "has media for"

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
        int id PK
        int contact_id FK
        string Propertyname
        int Propertytype FK
        int Ownershiptype FK
        string Propertyaddress
        string Ownershipproof
        string Status
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
| `POST` | `/api/v1/propertymanagercompleted` | Transitions status from `UploadImagesByUser` to `Accepted_By_PropertyManager` or `Rejected_By_PropertyManager`. |

---

## 🖼️ Static Asset Serving (`/static/uploads`)

Uploaded photos and ownership deed documents are stored in structured directories:
```
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
