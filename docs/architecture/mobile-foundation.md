# TRINETRA Mobile Architecture Note: Mobile Foundation (MOBILE-01)

## 1. Executive Summary
This document establishes the architecture for **TRINETRA FIELD** (`FIELD INTELLIGENCE`), the dedicated mobile field application of the TRINETRA Smart Mine Governance platform. 

The core architectural tenet of MOBILE-01 is **100% REUSE AND ZERO DUPLICATION**:
- **Zero Duplicate Backend**: Reuses the single FastAPI production backend at `/api/v1`.
- **Zero Duplicate Authentication**: Uses the existing JWT bearer token session model.
- **Zero Duplicate RBAC**: Evaluates the canonical roles and permissions defined in `app.core.authz`.
- **Zero Duplicate Mine Hierarchy**: Scoped strictly by `UserMineAssignment` and `MineContext`.
- **Desktop Non-Regression**: Preserves all 24 desktop governance modules without modification.

---

## 2. Forensic Inspection of Existing Systems

### 2.1 Existing Authentication Flow
- **Backend**: `POST /api/v1/auth/login` receives `OAuth2PasswordRequestForm` (email + password), verifies bcrypt salted hashes in `users` table, and issues an `HS256` signed JWT with 24-hour expiration (`sub=user.id`, `roles`, `email`). `GET /api/v1/auth/me` returns current user profile with role array and mine assignments.
- **Frontend Storage**: JWT stored in `localStorage.getItem('trinetra_token')`, user payload in `localStorage.getItem('trinetra_user')`.
- **API Interceptor**: `frontend/src/services/api.ts` automatically attaches `Authorization: Bearer <token>` to all HTTP requests and redirects to `/login` on `401 Unauthorized`.
- **Context**: `AuthContext.tsx` wraps the application, exposing `user`, `token`, `isAuthenticated`, `isLoading`, `login()`, `logout()`, `hasRole()`, `isSystemAdmin`, and `isMineManager`.

### 2.2 Existing RBAC Flow
- **Canonical Roles** (defined in `backend/app/core/authz.py` and `frontend/src/types/index.ts`):
  1. `SYSTEM_ADMIN`: Unrestricted cross-mine governance & platform administration.
  2. `MINE_MANAGER`: Operational mine oversight, approvals, shift logging.
  3. `MINE_SAFETY_OFFICER`: Safety compliance, hazard controls, violation tracking.
  4. `FIELD_INSPECTOR`: Field observations, statutory checklists, evidence recording.
  5. `CONTRACTOR_MANAGER`: Contractor workforce compliance & SLA tracking.
  6. `REGULATOR`: DGMS statutory oversight, independent audit & violation logging.
- **Frontend Evaluation**: `hasRole(role | role[])` with superuser bypass for `SYSTEM_ADMIN`.

### 2.3 Existing Mine Isolation Flow
- **Backend**: `require_mine_access` validates that the user's ID has an active record in `user_mine_assignments` for the target `mine_id` (unless `SYSTEM_ADMIN` or `REGULATOR`).
- **Frontend Context**: `MineContext.tsx` loads assigned mines via `GET /api/v1/mines`, initializes `selectedMineId`, and provides `selectedMine`, `mines`, and `setSelectedMineId(id)`.

### 2.4 Existing API Client
- Centralized Axios instance in `frontend/src/services/api.ts` with base URL resolution supporting `import.meta.env.VITE_API_URL` or default `/api/v1`.
- Domain services in `frontend/src/services/index.ts` (`authService`, `mineService`, `sensorService`, `incidentService`, `violationService`, `mobileService`, `predictiveRiskService`, `analyticsService`).

### 2.5 Existing Field Operations Contracts (Phase 7 Foundation)
The backend already provides dedicated mobile/field endpoints in `backend/app/api/v1/mobile.py`:
- `POST /api/v1/mobile/sync`: Batch idempotent sync endpoint (`SyncBatchRequest` -> `SyncBatchResponse`).
- `GET /api/v1/mobile/inspections`: Inspector's assigned inspections enriched with risk & zone context.
- `POST /api/v1/mobile/inspections`: Create field inspection.
- `PUT /api/v1/mobile/inspections/{id}`: Update inspection checklist/status.
- `POST /api/v1/mobile/evidence`: Submit geo-tagged, SHA-256 hashed evidence record.

### 2.6 Existing Offline & Network State Foundation
- Network state detection via `navigator.onLine` and `online`/`offline` DOM window events.
- Synchronization state machine: `ONLINE`, `OFFLINE`, `SYNCING`, `SYNC COMPLETE`, `SYNC ERROR`.
- Local sync queue structure (`trinetra_field_sync_queue`) with retry tracking.

---

## 3. Mobile Shell & Component Architecture

### 3.1 Location in Codebase
All mobile-specific shell components live under `frontend/src/mobile/`:
```
frontend/src/
├── mobile/
│   ├── MobileApp.tsx            # Standalone mobile router and entrypoint
│   ├── MobileLayout.tsx         # Mobile Shell (Top Bar, Content Viewport, Bottom Navigation)
│   ├── components/
│   │   ├── MobileTopBar.tsx     # Branding, Mine Switcher, Network Badge, User Avatar
│   │   ├── MobileBottomNav.tsx  # Fixed 5-tab touch navigation (Home, Tasks, Map, Copilot, More)
│   │   ├── NetworkStatusBadge.tsx # Online / Offline / Syncing indicator
│   │   ├── MineSelectorModal.tsx  # Touch-friendly authorized mine switcher
│   │   ├── MobileCard.tsx       # Standard high-contrast industrial card container
│   │   └── TouchButton.tsx      # Minimum 44px touch target action button
│   ├── rbac/
│   │   └── mobilePermissions.ts # Centralized mobile UI permission matrix (can(action, user))
│   ├── screens/
│   │   ├── MobileHomeScreen.tsx    # Role-adaptive Field Intelligence Home Screen
│   │   ├── MobileTasksScreen.tsx   # Assigned Inspections & Tasks (Phase 1 Foundation)
│   │   ├── MobileMapScreen.tsx     # Field GIS Spatial Map (Phase 1 Foundation)
│   │   ├── MobileCopilotScreen.tsx # Mobile AI Copilot Assistant (Phase 1 Foundation)
│   │   └── MobileMoreScreen.tsx    # Secondary menu (Profile, Mine, Language, Network, Sign Out)
│   └── types/
│       └── mobile.ts            # Mobile-specific UI state and navigation types
```

### 3.2 Routing & Desktop Integration
- **Path Resolution**: When URL starts with `/mobile` or the user clicks "Switch to Field App", `MobileApp` is rendered.
- **Direct Link Support**: Direct navigation to `/mobile`, `/mobile/tasks`, `/mobile/map`, `/mobile/copilot`, `/mobile/more` is supported via HTML5 History API and Vite SPA rewrite rules.
- **Desktop Non-Interference**: Desktop layout (`AppLayout.tsx`) remains the default for standard URLs (`/`, `/dashboard`, etc.), with a banner/button to toggle to `/mobile` anytime.

---

## 4. Role-Adaptive Field Experience Matrix

| Role | Primary Home Metrics | Primary Quick Actions | Mobile Permissions |
| :--- | :--- | :--- | :--- |
| **Field Inspector** | Assigned Inspections, High-Risk Zones, Pending Sync | Start Inspection, Report Incident, Record Observation, Capture Evidence | `INSPECTION_CREATE`, `EVIDENCE_CAPTURE`, `OBSERVATION_CREATE`, `INCIDENT_REPORT` |
| **Mine Safety Officer** | Active Violations, High Risk Zones, Unresolved Hazards | Conduct Safety Audit, Issue Notice, Verify Action, View Risk Heatmap | `INSPECTION_AUDIT`, `VIOLATION_MANAGE`, `RISK_VIEW`, `EVIDENCE_VERIFY` |
| **Mine Manager** | Shift Status, Active Incidents, Pending Approvals | Review Evidence, Approve Permit, Shift Overview, Direct Incident Response | `APPROVAL_ACTION`, `INCIDENT_MANAGE`, `MINE_OVERVIEW` |
| **DGMS Regulator** | Statutory Notices, Critical Violations, Audit Logs | Review Mine Compliance, Record Statutory Finding, Audit Trail | `STATUTORY_AUDIT`, `VIOLATION_VIEW`, `REPORT_VIEW` |
| **Contractor Manager**| Crew Muster, Safety Checklist Compliance | Verify PPE, Worker Attendance, Report Hazard | `WORKFORCE_VERIFY`, `HAZARD_REPORT` |
| **System Admin** | All Metrics Across All Authorized Mines | Full System Diagnostics, Global Switcher | Full Access Superuser |

---

## 5. PWA (Progressive Web App) Foundation
- **Web App Manifest**: `/manifest.webmanifest` registered in `index.html`.
- **Name**: `TRINETRA FIELD — Field Intelligence`
- **Short Name**: `TrinetraField`
- **Theme Color**: `#0B0F19` (Dark Industrial Slate/Charcoal)
- **Background Color**: `#080A09`
- **Display**: `standalone`
- **Orientation**: `portrait-primary`
- **Icons**: SVG + High-res vector icons with Amber/Gold branding.
- **Security Guard**: No naive service worker caching of JWT credentials, authorization headers, or sensitive mining telemetry.

---

## 6. Future Phase Integration Map
- **MOBILE-02**: Field Inspections Engine & Dynamic DGMS Checklists.
- **MOBILE-03**: Geo-Tagged Field Evidence Capture & SHA-256 Cryptographic Tamper Sealing.
- **MOBILE-04**: Rapid Incident Reporting & Real-Time Hazard Observation Workflows.
- **MOBILE-05**: Full IndexedDB Offline Database & Background Sync Queue.
- **MOBILE-06**: Predictive Risk Field Tasks & Zone Anomaly Radar.
- **MOBILE-07**: Mobile Geofenced GIS Map & Sub-surface Spatial Orientation.
- **MOBILE-08**: Voice-Enabled Mining AI Field Copilot (Hindi, Telugu, English).
