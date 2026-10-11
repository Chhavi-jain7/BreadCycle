# BreadCycle — Rescue Food. Restore Hope.
> **Intelligent Food Rescue Network matching surplus food with verified shelters, community kitchens, volunteers, and individuals before safe consumption windows expire.**

---

## 🏛️ Project Architecture: Separated Frontend & Backend

The repository is cleanly partitioned into dedicated **`backend/`** and **`frontend/`** services, each with its own `package.json`, dependencies, configuration, and execution scripts:

```
BreadCycle/
├── backend/                             # Standalone Node.js & Express REST API Engine
│   ├── lib/                             # Core Business Logic & Algorithms
│   │   ├── auth-helpers.js              # Password and pickup-code security helpers
│   │   ├── fssai.js                     # Reported-data food handling-window heuristics
│   │   ├── matching-engine.js           # 5-Factor Weighted Matching Algorithm
│   │   ├── prisma.js                    # Database Client Singleton
│   │   └── recovery-engine.js           # Signature Failed-Pickup Recovery Engine
│   ├── prisma/                          # Database Schema & Migrations
│   │   ├── dev.db                       # SQLite Persistent Database
│   │   └── schema.prisma                # Relational Schema
│   ├── scripts/
│   │   ├── seed.js                      # Database Seeder (Demo Data)
│   │   ├── create-demo-admin.js         # Guarded, non-destructive local admin bootstrap
│   │   └── test-workflows.js            # HTTP authentication, role, pickup and recovery integration tests
│   ├── package.json                     # Backend Dependencies & Scripts
│   └── server.js                        # Express REST API Server (Port 5000)
│
├── frontend/                            # Next.js 14 Web Application & Client Portals
│   ├── app/
│   │   ├── globals.css                  # Theme CSS & Leaflet Styling
│   │   ├── layout.tsx                   # Root HTML Shell & Metadata
│   │   ├── page.tsx                     # Public landing page
│   │   ├── login/ and register/         # Email/password authentication
│   │   ├── dashboard/                   # Individual recipient dashboard
│   │   ├── recipient/                   # Discovery, reservation and pickup pages
│   │   ├── restaurant/ and ngo/         # Role dashboards
│   │   └── admin/                       # Protected administrator console
│   ├── components/                      # UI Components & Role Dashboards
│   │   ├── AdminConsole.tsx             # Safety Officer & Verification Console
│   │   ├── CreateDonationModal.tsx      # Restaurant listing and safety-information form
│   │   ├── DonationCard.tsx             # Food Card with Thermal Badges & Codes
│   │   ├── Footer.tsx                   # Brand Footer
│   │   ├── FssaiBanner.tsx              # Food handling guidance
│   │   ├── HandoverModal.tsx            # Two-step handover and quantity verification
│   │   ├── Hero.tsx                     # Hero Section with Live Impact Telemetry
│   │   ├── HowItWorks.tsx               # 3-Step Lifecycle & Role Portals
│   │   ├── ImpactMetrics.tsx            # Empirical Database Accounting
│   │   ├── MapDiscovery.tsx             # Leaflet Interactive Map & Privacy Circles
│   │   ├── Navbar.tsx                   # Authenticated navigation; persona switcher only in Demo Mode
│   │   ├── AuthForm.tsx                 # Email/password login and registration forms
│   │   ├── NgoDashboard.tsx             # NGO Shelter Hub & Bulk Claims
│   │   ├── RecipientPortal.tsx          # Recipient dashboard overview
│   │   ├── RecoveryEngineSection.tsx    # Failed-Pickup Recovery Sandbox & Audit
│   │   ├── ReserveModal.tsx             # Atomic Reservation Dialog
│   │   ├── RestaurantDashboard.tsx      # Commercial Kitchen Operations
│   │   ├── SmartMatchingExplainer.tsx   # 5-Factor Scoring Model Visualizer
│   │   └── VolunteerDashboard.tsx       # Courier Delivery Dispatch Runs
│   ├── lib/
│   │   └── fssai.ts                     # Frontend Allergen & Thermal Constants
│   ├── next.config.mjs                  # Transparent API proxy to Backend (:5000)
│   ├── package.json                     # Frontend Dependencies & Scripts
│   ├── tailwind.config.ts               # Custom Brand Palette
│   └── tsconfig.json
│
├── README.md                            # Comprehensive Documentation
└── package.json                         # Root Monorepo Management Scripts
```

---

## 🚀 How to Run the Application

### 1. Launch the Backend REST API Server (Port 5000)

In your first terminal:
```powershell
cd backend
npm.cmd install          # (If not already installed)
node server.js           # Launches server on http://localhost:5000
```

> **Backend Health Check**: Open `http://localhost:5000/health` in your browser.

### 2. Launch the Frontend Application (Port 3000)

In your second terminal:
```powershell
cd frontend
npm.cmd install          # (If not already installed)
npm.cmd run dev          # Launches Next.js on http://localhost:3000
```

> Open **[http://localhost:3000](http://localhost:3000)** in your browser. All `/api/*` network requests made by the frontend automatically proxy to the backend server on port 5000 via Next.js rewrites!

### Account Authentication

The public landing page provides **Login** and **Register**. Registration offers Individual, Restaurant/Food Donor, and NGO/Community Kitchen roles. NGO profiles begin in `PENDING`; only an administrator can approve bulk claiming. Public signup cannot assign `ADMIN`. Passwords are scrypt-hashed. The backend sets an HttpOnly, SameSite session cookie and stores revocable session hashes in SQLite; logout revokes the server-side session. Role redirects and permissions are based on the database user, and protected APIs enforce permissions server-side.

On local development runs, the backend creates a random session secret in the Windows user profile at `%USERPROFILE%\.breadcycle-session-secret` if no environment secret is provided. Keep this file private and persistent: pickup codes are encrypted using this secret, so replacing it makes existing encrypted codes unreadable. Production deployments must configure `SESSION_SECRET` (at least 32 characters) and `FRONTEND_ORIGINS` (comma-separated exact trusted origins); local development CORS defaults to localhost ports 3000 and 3001.

Existing plaintext pickup codes and legacy pickup notifications are migrated and redacted automatically when the updated backend starts. Prisma schema updates are additive. The demo seeder refuses to run unless explicitly enabled and the target database is empty; it does not delete or overwrite existing records.

### Seed demo accounts into Neon

To add the demo accounts, listings, and sample workflows to Neon without deleting or replacing current records, configure `backend/.env` with the Neon `DATABASE_URL` and the same `SESSION_SECRET` configured on the deployed backend. Keep both values private. From PowerShell:

```powershell
cd backend
$env:ALLOW_DEMO_SEED = "true"
npm.cmd run seed
Remove-Item Env:ALLOW_DEMO_SEED
```

Run this from a private local terminal connected to the intended Neon branch, not a shared hosting log console: the script prints a different randomly generated password for each newly created demo account once. Save those credentials securely. Existing users are never deleted, their passwords are never changed, and existing matching demo records are reused. The script stores pickup-code hashes and encrypted codes using `SESSION_SECRET`; if the secret differs from the deployed backend, seeded pickup codes cannot be retrieved. Leave `DEMO_MODE` disabled on public deployments.

### Safe Local Admin / Demo Setup

The persona switcher is disabled by default. To create a local-only administrator, explicitly enable Demo Mode and use the guarded bootstrap. It creates a random-password admin account only if the selected email does not already exist; it does not reset accounts, seed demo users, or delete database records.

```powershell
cd backend
$env:DEMO_MODE = "true"
node scripts/create-demo-admin.js
node server.js
```

The bootstrap prints a one-time password; save it before closing the terminal. Existing accounts are never reset. If `admin@breadcycle.demo` already exists, choose an unused address with `$env:DEMO_ADMIN_EMAIL = "admin-local@example.test"` before running the script. The persona switcher is only shown to and usable by an authenticated administrator, and it cannot switch into an admin account. Do not enable Demo Mode in production. No shared demo password is provided.

### Automated Integration Suite

The test runner starts an ephemeral HTTP listener and uses uniquely named local test records, which it cleans up after execution:
```powershell
cd backend
npm.cmd test
```

### Main Recipient Routes and Pickup Workflow

- Individual: `/dashboard`; discovery: `/recipient/discover`; history: `/recipient/reservations`; active pickup codes: `/recipient/pickups`.
- Restaurant: `/restaurant/dashboard`, including the Verify Pickup flow.
- NGO: `/ngo/dashboard`. Pending NGOs may browse but cannot reserve in bulk.
- Administrator: `/admin/dashboard`. Administrative API endpoints require the authenticated database role.

To test a pickup end-to-end:

1. Register a Restaurant account and an Individual account. Log in to the restaurant and list a safe surplus item with a pickup deadline in the future.
2. Log in as the Individual, open **Discover Food**, reserve a quantity, then visit **My Pickups** and select **View Pickup Code**. The code is retrieved only for that reservation owner.
3. Log in as the donating Restaurant, open **Verify Pickup**, enter the code, review the reservation and quantity, and confirm the collected amount. Partial amounts are recorded; eligible uncollected portions return to inventory.
4. Submit the same code again; it must be rejected. An unrelated restaurant must not be able to verify it.
5. For recovery, reserve another item, wait until its reservation hold expires, then sign in as its Restaurant and run recovery from the recovery section (or sign in as Admin and run the expired-reservation batch). Recovery requires actual expiry and a still-safe distribution window; unsafe food is retired, never reallocated.

Test coverage includes public roles and admin signup rejection, duplicate accounts, login/logout and expired sessions, API role permissions, demo-switch impersonation prevention, NGO pending/approved claims, quota enforcement, code privacy/expiry/single use, unauthorized restaurant handover, concurrent confirmation, partial collection, cancellations, real recovery allocation, safety-risk detection, caution listings and ordinary reservations, restaurant safety updates, admin review/restore, affected-recipient alerts, donation payload protection, and pickup verification rate limits.

### Food-safety information and review

BreadCycle does not independently inspect food or verify temperatures. Listings distinguish donor-reported handling and allergen information from automated consistency checks. The checks flag incomplete declarations, unreviewed allergens, expired or inconsistent times, deadlines outside configured category/storage windows, and dairy listings not reported as chilled. A missing declaration alone does not prevent ordinary listing or reservation; it is visibly marked as a caution and sent to the administrator review queue. Objective timeline/storage failures are saved as paused listings rather than shown as available.

Restaurants can use **Update safety info** on their listing to correct reported preparation, pickup, expiry, storage, and allergen details. A correction is recorded and sent for review; it does not clear an administrator's safety block. Administrators review the safety queue from `/admin/dashboard`, can request updates, approve an eligible listing, or block it. Blocking a listing cancels pending reservations, restores the reserved inventory to the paused listing, invalidates the associated pickup codes through reservation status, and notifies affected recipients. Restoration is allowed only after automated checks pass and eligible inventory remains. These configurable handling-window checks are operational signals—not a regulatory certification, laboratory test, or substitute for safe handling and local food-safety advice.
