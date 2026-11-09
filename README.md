# EstateSync — Real Estate, Listing Auditor & Superadmin Platform

EstateSync is an enterprise-grade, full-stack real estate marketplace, multi-tier listing audit, and property portfolio management platform. It bridges property seekers, owners, listing auditors, property managers, and executive super administrators through end-to-end listing lifecycles: public property discovery, geolocation-based search, OpenStreetMap interactive plotting powered by Google Maps Geocoding, multi-step property submissions, a 3-tier review and inspection pipeline, and an executive Superadmin oversight engine with dedicated audit trails and action logging.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
  - [Public & Owner Portal](#-public--owner-portal)
  - [OpenStreetMap Property Plotting & Google Maps Geocoding](#-openstreetmap-property-plotting--google-maps-geocoding)
  - [Listing Auditor Console (`/listingdashboard`)](#-listing-auditor-console-listingdashboard)
  - [Property Manager Dashboard (`/propertymanager`)](#-property-manager-dashboard-propertymanager)
  - [Super Administrator Control Center (`/superadministrator`)](#-super-administrator-control-center-superadministrator)
  - [Executive PDF Property Dossier (`generatePdf.ts`)](#-executive-pdf-property-dossier-generatepdfts)
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
- **Streamlined Search Bar**: Modern search interface with "Search Near Me" powered by a sleek location icon and Haversine distance calculations.
- **Multi-Step Property Submission**:
  - **Step 1**: Owner contact validation (`name`, `mobile_number`).
  - **Step 2**: Property specifications (Property Name, Property Type, Ownership Type, Address, Ownership Deed Proof Reference/Attachment).
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

### 🗺️ OpenStreetMap Property Plotting & Google Maps Geocoding
- **OpenStreetMap Tile Engine**: Official OpenStreetMap cartography (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) rendered via Leaflet and React-Leaflet with full-width responsive layout.
- **Live Whitelisted Listing Feed**: Dynamic real-time integration querying `/api/v1/superadminfinalaction?AdminStatus=Whitelisted`, plotting only executive-approved, live whitelisted properties.
- **Google Maps Geocoding Engine**:
  - Converts physical property text addresses (e.g., *"House No. 18 Sector-96 Faridabad Haryana"*) into exact GPS coordinates (`lat`, `lng`).
  - **Backend Proxy (`/api/v1/geocode`)**: Handles Google Maps API queries on the server side using `GOOGLE_MAPS_PLATFORM_KEY`, completely bypassing browser CORS limitations.
  - **Multi-Variant Address Parsing**: If a specific house or flat number is unindexed in map databases, the parser cleanly resolves the sector and locality to guarantee pinpoint placement.
- **Property Name Pin Badges**:
  - Circular image pin markers featuring front exterior photos and teardrop anchors.
  - Floating white badge above each pin displays the actual **Property Name** (e.g. *"House No. 18"*, *"Flat No. 103"*, *"Sunrise Villa"*) with native hover tooltip and text truncation.
- **Interactive Popup Cards & Verified Property Report**:
  - Clicking any map marker reveals a property card preview showing photo, verified deed reference, contact info, and top amenities.
  - **Clean Document Proof Badge**: Under "Documents", displays the verified ownership proof/deed without redundant PDF buttons.
  - **Comprehensive Verified Property Report Modal**:
    - **Original Database Specifications**: Real Listing ID, property name, category, ownership tenure, deed document, physical address, superadmin decision, and audit trail reason.
    - **Surrounding Infrastructure & Landmarks**: Real-time display of recorded Nearest Metro Station, Nearest Hospital, Nearest Police Station, and Nearest Shopping Market.
    - **5-Angle Verified Photos Gallery**: Displays high-resolution photos for Front/Exterior, Living Room, Master Bedroom, Kitchen & Dining, and Balcony/Washroom with click-to-enlarge lightbox modal and new-tab links.
    - **Official PDF Export**: Dedicated "Download PDF" report generator in the modal header with a 45° slanting company watermark `estatesyn`.
- **Persistent Local Caching**: Resolved coordinates are cached in `localStorage` under `estatesync_google_geocache_v1`, ensuring zero redundant API calls and instantaneous page loads.

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

### Screenshots
<img width="1918" height="912" alt="Screenshot 2026-11-07 123345" src="https://github.com/user-attachments/assets/001147b4-865b-4947-95e7-533d4b4cd67f" />
<img width="1918" height="911" alt="Screenshot 2026-11-08 095020" src="https://github.com/user-attachments/assets/6759fec2-150e-4d20-b11c-c942b7e3e910" />
<img width="1917" height="911" alt="Screenshot 2026-11-07 154257" src="https://github.com/user-attachments/assets/45f1aae7-e3f2-45a9-9f7f-170f297ef5db" />
<img width="1918" height="917" alt="Screenshot 2026-11-07 163908" src="https://github.com/user-attachments/assets/e282f0f8-2e00-493a-ac10-89398b8b8058" />
<img width="1918" height="902" alt="Screenshot 2026-11-08 103225" src="https://github.com/user-attachments/assets/6147ce34-a5e6-4b86-ac34-d3bc8aaf7fe3" />

---

### 📄 Executive PDF Property Dossier (`generatePdf.ts`)
EstateSync includes a custom client-side PDF 1.4 report generator built without heavy external libraries, enabling instant 1-click downloads directly in the browser:
- **Zero Word Overlapping & Structured Table Layout**:
  - Replaced brittle relative offsets with a high-end 2-column institutional table featuring internal row and column divider lines.
  - Every field uses stacked vertical typography: a distinct uppercase label (7.5pt Bold in slate gray) positioned cleanly above its value (9.5pt Bold in dark navy).
  - Dedicated 240+ pt cell width per column prevents text collisions across long status names (e.g. `Accepted_By_PropertyManager`) and tenure types (e.g. `Co-operative Society`).
  - Dedicated full-width span for the Executive Audit Trail Reason accommodating up to 95 printable characters.
- **Slanting Company Watermark (`estatesyn`)**:
  - Rendered at a 45° diagonal angle across the upper, central, and lower sections of the page.
  - Positioned on the top rendering layer (after background cards) with PDF 1.4 `/ExtGState` transparency (`/ca 0.18 /CA 0.18`) so the watermark `estatesyn` floats visibly above all content without obscuring underlying text readability.
- **Comprehensive Dossier Sections**:
  1. **Header Banner**: Deep corporate navy header (`#0f172a`) with cyan accents, generation timestamp, listing ID, and verified status badge.
  2. **Verification Strip**: Emerald border highlighting executive superadmin whitelisting.
  3. **Property Specifications**: Category, ownership tenure, deed document reference, pipeline lifecycle stage, jurisdiction, and audit trail reason.
  4. **Surrounding Landmarks & Infrastructure**: 2x2 colored cards for Nearest Metro, Hospital, Police Station, and Shopping Market with category icons and sub-descriptions.
  5. **5-Angle Inspection Photography**: Summary verification strip checking off Front Facade, Living Room, Master Bedroom, Kitchen, and Balcony/Washroom.
  6. **Registered Ownership & Contact**: Two-column card for verified owner name and direct contact channel.
  7. **Security Footer**: Official certified dossier seal with listing ID hash and watermark verification.

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

    state "Platform Live Portfolio & OpenStreetMap" as Live {
        Accepted_By_PropertyManager: 100% Operational & Live for Buyers / Tenants
        Whitelisted --> Accepted_By_PropertyManager: Live Active & Plotted on Map
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
    GoogleMaps["Google Maps Geocoding API"]
    OSM["OpenStreetMap Tiles (leaflet)"]
    Uploads["Static Uploads (/static/uploads/contact_id/indprop_id/)"]
    DB[("PostgreSQL Database (realestate)")]

    Client -- "REST JSON & Multipart FormData" --> API
    API -- "Address Geocoding Queries" --> GoogleMaps
    Client -- "Fetch Map Tiles" --> OSM
    API -- "Store 5 Angle Photos & Deeds" --> Uploads
    API -- "SQLAlchemy ORM & Raw SQL" --> DB
```

### Frontend
- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Maps & Location**: [Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/) + OpenStreetMap
- **Geocoding Client**: Custom Google Maps Geocoding service with local storage caching
- **Routing**: [React Router v7](https://reactrouter.com/)

### Backend
- **Framework**: [Flask](https://flask.palletsprojects.com/) + [Flask-RESTful](https://flask-restful.readthedocs.io/)
- **ORM / Database Tooling**: [SQLAlchemy](https://www.sqlalchemy.org/) / [Flask-SQLAlchemy](https://flask-sqlalchemy.palletsprojects.com/)
- **Database Driver**: `psycopg2-binary`
- **Geocoding Service**: Python standard `urllib.request` integration with Google Maps Platform API
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
│   │           ├── superadminaction.py     # SuperAdminFinalAction table & executive actions
│   │           └── geocoding.py            # Google Maps Geocoding API server-side proxy
│   ├── rendering_routes.py                 # Static SSR routes
│   ├── run.py                              # Backend entry point (Port 5000)
│   └── app.env                             # Database connection, secret key & Google Maps Key
│
├── frontend/
│   ├── public/                             # Static assets
│   ├── src/
│   │   ├── auth/
│   │   │   └── Login.tsx                   # User login screen
│   │   ├── components/
│   │   │   ├── Header.tsx                  # Navigation header with Accepted Listings Bell
│   │   │   ├── Footer.tsx                  # Global footer
│   │   │   ├── MapComponent.tsx            # Leaflet + OpenStreetMap interactive plotting
│   │   │   ├── PostPropertyModal.tsx       # Initial property submission modal
│   │   │   └── UploadPropertyImagesModal.tsx # 5-angle photo & landmark upload modal
│   │   ├── context/
│   │   │   └── AuthContext.tsx             # Global authentication & session provider
│   │   ├── services/
│   │   │   └── geocoding.ts                # Google Maps Geocoding service & local cache
│   │   ├── utils/
│   │   │   └── generatePdf.ts              # PDF 1.4 report generator with 'estatesyn' watermark
│   │   ├── pages/
│   │   │   ├── Home.tsx                    # Homepage with search, near me & live OSM map
│   │   │   ├── Admin.tsx                   # Role-based admin login (routes to role console)
│   │   │   ├── LisitngDashboard.tsx        # Listing Auditor Dashboard (10-item pagination)
│   │   │   ├── PropertyManager.tsx         # Property Manager Dashboard (10-item pagination)
│   │   │   ├── SuperAdministrator.tsx      # Super Administrator Console (10-item pagination)
│   │   │   ├── Dashboard.tsx               # Dashboard route alias
│   │   │   └── Profile.tsx                 # User profile view
│   │   ├── App.tsx                         # Client routes & layout definition
│   │   ├── types.ts                        # Unified TypeScript interfaces (Property, etc.)
│   │   └── main.tsx                        # React application entry point
│   ├── package.json                        # Frontend dependencies & scripts
│   ├── vite.config.ts                      # Vite configuration & proxy routes (/api, /static)
│   ├── tsconfig.json                       # TypeScript compiler settings
│   └── .env                                # Google Maps Platform API Key
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
| `GET` | `/api/v1/superadminfinalaction` | Retrieve Superadmin executive decisions, reasons, and status overrides across listings. Supports `?AdminStatus=Whitelisted`. Includes `LEFT JOIN LATERAL` against `PropertyUploadImage` returning all 5 angle photos and surrounding landmark infrastructure with key normalization. |
| `POST` | `/api/v1/superadminfinalaction` | Record a Superadmin executive decision (`Whitelisted`, `AdminProcess`, `Rejected`) with custom reason in `SuperAdminFinalAction`. |
| `GET` | `/api/v1/geocode` | Geocode an address string using Google Maps Geocoding API (`?address=...`), returning exact `lat` and `lng`. |

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
- **Google Maps API Key**: Geocoding API enabled on Google Cloud Platform

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

4. **Configure Database Connection & Google Maps Key**:
   Update `backend/app.env` with your PostgreSQL credentials and Google Maps API key:
   ```env
   SQLALCHEMY_DATABASE_URI = "postgresql://postgres:your_password@localhost:5432/realestate"
   SECRET_KEY = "your_secret_key"
   GOOGLE_MAPS_PLATFORM_KEY = your_google_maps_api_key_here
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

3. **Configure Environment Variables**:
   Update `frontend/.env` with your Google Maps API key:
   ```env
   GOOGLE_MAPS_PLATFORM_KEY=your_google_maps_api_key_here
   VITE_GOOGLE_MAPS_PLATFORM_KEY=your_google_maps_api_key_here
   ```

4. **Start the development server**:
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

# Google Maps Platform Geocoding API Key
GOOGLE_MAPS_PLATFORM_KEY = AIzaSy...
GOOGLE_MAPS_API_KEY = AIzaSy...
```

### Frontend (`frontend/.env`)
```env
# Google Maps Platform Geocoding API Key
GOOGLE_MAPS_PLATFORM_KEY = AIzaSy...
VITE_GOOGLE_MAPS_PLATFORM_KEY = AIzaSy...
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
