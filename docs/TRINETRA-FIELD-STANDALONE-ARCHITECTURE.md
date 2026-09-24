# TRINETRA FIELD — Standalone Frontend Architecture Specification

**Phase:** MOBILE-18 Extraction & Standalone Packaging  
**Document Version:** `1.0.0`  
**Classification:** Technical Architecture & System Design Document  

---

## 1. Executive Summary & Extraction Objectives

Prior to MOBILE-18, the TRINETRA mobile experience was embedded within the main desktop web application and accessed via conditional route detection (`/mobile`).

**MOBILE-18 achieves complete architectural decoupling:**
1. **TRINETRA WEB:** Serves command centers, 3D Digital Twin visualization, advanced analytics, and colliery administration (`http://localhost:5173`).
2. **TRINETRA FIELD:** An independent, standalone Progressive Web Application (PWA) optimized specifically for frontline field operations, disconnected underground environments, and statutory inspections (`http://localhost:5174`).
3. **TRINETRA BACKEND:** A single, shared, authoritative FastAPI microservices backend providing unified authentication, multi-tenant colliery isolation, governance workflows, and cryptographic ledger verification (`http://localhost:8000`).

```
                              ┌───────────────────────────────┐
                              │       TRINETRA BACKEND        │
                              │    FastAPI + SQLAlchemy Core  │
                              │    Port: 8000 /api/v1/*       │
                              └───────────────┬───────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      │                                               │
      ┌───────────────▼───────────────┐               ┌───────────────▼───────────────┐
      │         TRINETRA WEB          │               │        TRINETRA FIELD         │
      │   Desktop Command Center      │               │   Standalone Frontline PWA    │
      │   Port: 5173                  │               │   Port: 5174                  │
      ├───────────────────────────────┤               ├───────────────────────────────┤
      │ • 3D Digital Twin (Three.js)  │               │ • Field Command (MOBILE-16)   │
      │ • Colliery Analytics          │               │ • Inspection Checklists       │
      │ • Statutory Report Generation │               │ • Evidence & SHA-256 Hashing  │
      │ • Sensor SCADA Overviews      │               │ • Offline Sync Queue          │
      │ • Administrative Tools        │               │ • Predictive Risk Verify      │
      └───────────────────────────────┘               └───────────────────────────────┘
```

---

## 2. Directory Structure & Boundary Isolation

The standalone application resides entirely in the root-level directory `trinetra-field/`:

```
trinetra-field/
├── package.json              # Independent npm project definition
├── vite.config.ts            # Vite bundler configuration (Port 5174 + Backend Proxy)
├── tsconfig.json             # TypeScript project references
├── tsconfig.app.json         # Application TypeScript configuration
├── tsconfig.node.json        # Build tooling TypeScript configuration
├── index.html                # Dedicated HTML5 shell & PWA metadata
├── .env.example              # Non-secret environment template
├── README.md                 # Quickstart and evaluation guide
├── DEPLOYMENT.md             # Multi-cloud static hosting guide
│
├── public/
│   ├── favicon.svg           # Colliery brand icon
│   ├── icons.svg             # SVG sprite definitions
│   ├── manifest.webmanifest  # Independent PWA manifest (start_url: "/")
│   └── _redirects            # SPA route rewrites for static hosting
│
└── src/
    ├── main.tsx              # Standalone React 19 application bootstrap
    ├── App.tsx               # Standalone router, layout & auth gates
    ├── index.css             # High-contrast colliery design system (Tailwind v4)
    │
    ├── auth/
    │   └── AuthContext.tsx   # JWT handling, role checks & session state
    │
    ├── context/
    │   ├── MineContext.tsx   # Colliery tenancy context & switcher
    │   ├── LanguageContext.tsx # Trilingual context (EN / HI / TE)
    │   └── AuthContext.tsx   # Re-export bridge
    │
    ├── i18n/
    │   └── translations.ts   # 2,894-line trilingual colliery dictionary
    │
    ├── services/
    │   ├── api.ts            # Axios client with JWT interceptor & 401 handler
    │   ├── index.ts          # Centralized API service abstractions
    │   └── analyticsService.ts # Supporting analytics service
    │
    ├── types/
    │   ├── index.ts          # Domain entities & API payload schemas
    │   ├── mobile.ts         # Mobile tab, status & sync types
    │   └── analytics.ts      # Metric & telemetry types
    │
    ├── rbac/
    │   └── mobilePermissions.ts # Frontend permission gating matrix
    │
    ├── components/
    │   ├── FieldTopBar.tsx   # Brand header, network badge & notification bell
    │   ├── FieldBottomNav.tsx# 5-tab thumb-reachable bottom navigation
    │   ├── FieldCard.tsx     # Industrial surface card container
    │   ├── TouchButton.tsx   # 44px minimum tap touch button
    │   ├── NetworkStatusBadge.tsx # Online / Offline / Syncing indicator
    │   ├── MineSelectorModal.tsx  # Multi-tenant colliery switcher
    │   ├── RelatedRecordsWidget.tsx # Universal cross-domain deep linking
    │   └── UnifiedTimelineWidget.tsx # SHA-256 cryptographic audit timeline
    │
    └── screens/
        ├── FieldLoginScreen.tsx             # Standalone login with quick personas
        ├── FieldHomeScreen.tsx              # MOBILE-16 Cross-Domain Field Command
        ├── FieldTasksScreen.tsx             # MOBILE-06 Work Queue & Task Triage
        ├── FieldMapScreen.tsx               # MOBILE-04 Leaflet GIS Spatial Map
        ├── FieldIncidentResponseScreen.tsx  # MOBILE-05 Incident Filing & Response
        ├── FieldInspectionExecutionScreen.tsx# MOBILE-02 & 03 Inspection & Evidence
        ├── FieldCopilotScreen.tsx           # MOBILE-16 AI Field Assistant
        ├── FieldNotificationsScreen.tsx     # MOBILE-07 Operational Alerts Feed
        ├── FieldSyncCenterScreen.tsx        # MOBILE-08 Offline Sync Center
        ├── FieldReviewCenterScreen.tsx      # MOBILE-09 Supervisory Review & SoD
        ├── FieldDocumentsScreen.tsx         # MOBILE-10 Statutory Documents & OCR
        ├── FieldWorkforceScreen.tsx         # MOBILE-11 Muster Roll & Handover
        ├── FieldReportingScreen.tsx         # MOBILE-12 Production & Environment
        ├── FieldContractorScreen.tsx        # MOBILE-13 Contractor Gate & Safety
        ├── FieldGrievanceScreen.tsx         # MOBILE-14 Worker Grievance Triage
        ├── FieldRiskIntelligenceScreen.tsx  # MOBILE-15 Predictive Risk Verification
        └── MobileMoreScreen.tsx             # Domain launcher & Diagnostics
```

---

## 3. Standalone Routing Model

Unlike the previous implementation where all mobile screens were nested under `/mobile/*`, TRINETRA FIELD owns the root URL hierarchy:

| Route | View / Component | Core Capability |
| :--- | :--- | :--- |
| `/login` | `FieldLoginScreen` | Direct login entry with demo persona selectors |
| `/` or `/home` | `FieldHomeScreen` | MOBILE-16 Cross-Domain Field Command Center |
| `/tasks` | `FieldTasksScreen` | MOBILE-06 Governance tasks & corrective actions |
| `/map` | `FieldMapScreen` | MOBILE-04 2D Leaflet GIS colliery layout |
| `/incidents` | `FieldIncidentResponseScreen` | MOBILE-05 Emergency reporting & hazard logging |
| `/copilot` | `FieldCopilotScreen` | Read-only sandboxed AI operational assistant |
| `/inspections` | `FieldInspectionExecutionScreen` | MOBILE-02 Checklist execution & evidence capture |
| `/reviews` | `FieldReviewCenterScreen` | MOBILE-09 Supervisory sign-offs & SoD checks |
| `/documents` | `FieldDocumentsScreen` | MOBILE-10 Statutory circulars & OCR extraction |
| `/workforce` | `FieldWorkforceScreen` | MOBILE-11 Shift muster roll & handover logs |
| `/reporting` | `FieldReportingScreen` | MOBILE-12 Shift production & environment logs |
| `/contractors` | `FieldContractorScreen` | MOBILE-13 Contractor worker gate verification |
| `/grievances` | `FieldGrievanceScreen` | MOBILE-14 Confidential worker grievance redressal |
| `/intelligence`| `FieldRiskIntelligenceScreen` | MOBILE-15 Predictive risk field verification |
| `/sync` | `FieldSyncCenterScreen` | MOBILE-08 Offline queue management & batch sync |
| `/notifications`| `FieldNotificationsScreen` | MOBILE-07 Real-time operational alerts feed |
| `/more` | `MobileMoreScreen` | Multi-mine switcher & diagnostic telemetry |

---

## 4. Key Architectural Guarantees Preserved

1. **Zero Backend Duplication:** All API calls target the unified `/api/v1/*` contracts.
2. **Authoritative Backend Security:** Role enforcement, mine isolation, and Separation of Duties (SoD) are validated authoritatively on the server.
3. **Canonical Offline Queue:** Uses the canonical `trinetra_field_sync_queue` in localStorage/IndexedDB with client-side UUIDs for 100% idempotent deduplication.
4. **Fast Initial Bundle:** Three.js and heavy desktop analytics modules are excluded from the initial bundle, achieving a **249.89 kB gzip** distribution size for sub-second field launch.
