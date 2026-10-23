# ReClaim — Intelligent Lost & Found Management Platform

**DBMS Project:** DBMS-V-T078 | **Team:** SyntaxScholars  
**Target Environment:** Graphic Era University (GEU), Dehradun Campus  
**Technology Stack:** Supabase PostgreSQL (PostGIS, pgcrypto), Node.js/Express, React 18, TypeScript, TailwindCSS, Leaflet OpenStreetMap, Nodemailer, Multer.

---

## 🚀 Key Features Implemented

1. **Role-Based Workflows**: Dedicated permissions and UI for **Regular Users**, **Finders**, and **Administrators**.
2. **Fourteen Interrelated PostgreSQL Tables (3NF)**:
   - `auth.users`, `public.users`, `categories`, `subcategories`, `locations`, `items`, `item_images`, `tags`, `item_tags`, `claims`, `claim_images`, `notifications`, `audit_logs`, `reviews`, `item_flags`.
3. **Multi-Criteria Intelligent Matching Engine**:
   - Automated compatibility scoring between lost and found items comparing category ($w=0.45$), color ($w=0.25$), location ($w=0.20$), and date proximity ($w=0.10$).
   - Returns score and explainable human-readable match reasons (`same category`, `same colour`, `same location`).
4. **Interactive GIS Campus Map**:
   - Live Leaflet OpenStreetMap view centered on GEU Dehradun campus with building markers, report count badges, and popup previews.
5. **Claims & Recovery Lifecycle**:
   - `reported` ➔ `matched` ➔ `claimed` ➔ `returned` ➔ `closed`.
   - Prevent self-claim database trigger (`claims_prevent_self_claim`).
   - Reporter, Finder, or Admin approval/rejection review workflow.
6. **Administrative Moderation**:
   - Item Category Management (add, update, delete with safety checks).
   - User Governance & Blacklisting (with moderation reason, audit logging, and automated login blocking).
   - Suspicious Item Reporting & Flag Review queue.
7. **Community Trust & Reviews**:
   - Post-recovery feedback, 1-5 star ratings, and recovery verification.
8. **Dual-Channel Notifications**:
   - Real-time in-app notification queue + Nodemailer email dispatcher with graceful fallback.

---

## 📂 Repository Structure

```
project-dbms/
├── backend/                  # Node.js Express REST API
│   ├── src/
│   │   ├── config/           # Database pool & environment variables
│   │   ├── middleware/       # Auth, role-based guard, error handler
│   │   ├── routes/           # Auth, items, claims, categories, locations, flags, reviews, notifications, analytics
│   │   ├── services/         # Notification & email dispatch service
│   │   └── utils/            # JWT session cookies, upload, logger
│   ├── scripts/              # Migration runner, schema inspection, campus seed
│   ├── tests/                # Automated acceptance test suite
│   └── uploads/              # Local media uploads storage
├── frontend/                 # React 18 + Vite + TypeScript
│   ├── src/
│   │   ├── app/              # App entry, layout & top-level routing
│   │   ├── components/       # Header, Sidebar, common UI
│   │   ├── features/
│   │   │   ├── admin/        # Admin Moderation Hub (Categories, Users, Flags)
│   │   │   ├── analytics/    # Telemetry and KPI dashboard
│   │   │   ├── auth/         # Login and registration modal
│   │   │   ├── claims/       # Claims management and review
│   │   │   ├── dashboard/    # User portal overview & recent telemetry
│   │   │   ├── items/        # Report lost/found, search filters, item modal
│   │   │   ├── map/          # Interactive Leaflet OpenStreetMap GIS
│   │   │   ├── notifications/# User notification list
│   │   │   ├── reviews/      # Community feedback modal
│   │   │   └── settings/     # Account profile settings
│   │   └── lib/api/          # Axios client & centralized endpoint config
├── supabase/                 # Supabase PostgreSQL migrations & DDL
│   └── migrations/           # 001_create_users through 005_reviews_and_moderation
└── docs/                     # Architecture, database design, API specification
```

---

## 🛠️ Quick Start

### 1. Database Migrations & Campus Seed
```bash
# From workspace root
npm run migrate
npm run seed
```

### 2. Run Test Suite
```bash
npm test
```

### 3. Launch Development Servers
```bash
# Option A: Run concurrently from root
npm run dev:all

# Option B: Run separately
# Terminal 1 - Backend (http://localhost:5000)
npm run dev:backend

# Terminal 2 - Frontend (http://localhost:5173)
npm run dev:frontend
```

---

## 👥 Default Demo Accounts

| Role | Email | Password |
|------|-------|----------|
|