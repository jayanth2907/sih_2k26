# TRINETRA FIELD (त्रिनेत्र फील्ड)
## Standalone AI-Powered Field Intelligence & Colliery Operations Application

> **Tagline:** *Observe. Verify. Record. Act.*  
> **Version:** `1.0.0` (MOBILE-18 Standalone Release)  
> **Target Audience:** DGMS Statutory Field Inspectors, Colliery Safety Officers, Shift Supervisors, Overmen & Mining Sirdars  

---

## 1. Overview

**TRINETRA FIELD** is the dedicated, standalone frontline mobile web and PWA application extracted from the TRINETRA Smart Colliery Governance platform. It operates directly against the shared TRINETRA FastAPI backend, providing an optimized, high-contrast, offline-resilient field interface for underground and opencast coal mining operations.

### Key Capabilities
- **Cross-Domain Field Command (MOBILE-16):** Real-time attention items, priority work queue, shift rosters, and cross-domain relational linkages.
- **On-Site Field Inspections & Checklists (MOBILE-02):** DGMS statutory inspection checklists with dynamic risk weighting.
- **Tamper-Evident Photographic Evidence (MOBILE-03):** Device/browser camera capture, WGS84 GPS metadata tagging, and instant client-side SHA-256 content hashing.
- **Offline Batch Synchronization (MOBILE-08):** Full offline operation with client-side UUID deduplication and conflict-free idempotent synchronization (`trinetra_field_sync_queue`).
- **Predictive Risk Field Verification (MOBILE-15):** On-site hazard confirmation and falsification workflows for early-warning AI signals (`trinetra-risk-escalation-v1.0-histgbm`).
- **Separation of Duties (SoD) Sign-Offs (MOBILE-09):** Supervisory review with strict prohibition against self-approval.
- **Multilingual Support (Category Q):** Complete trilingual support for English, Hindi (राजभाषा), and Telugu (సింగరేణి / SCCL).

---

## 2. Quick Start (Development)

### Prerequisites
- Node.js v18+ / v20+ / v22+
- Running TRINETRA FastAPI Backend on `http://127.0.0.1:8000`

### Installation & Launch
```bash
# 1. Navigate to the Field application directory
cd trinetra-field

# 2. Install dependencies
npm install

# 3. Launch the development server
npm run dev
```

The application will launch on **`http://localhost:5174`** (with automatic reverse proxy to the backend API at `http://127.0.0.1:8000`).

---

## 3. Production Build & Verification

```bash
# Run TypeScript typecheck
npm run typecheck

# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 4. Default Evaluation Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **DGMS Field Inspector** | `inspector.dgms@trinetra.gov.in` | `Trinetra@2026` |
| **Colliery Mine Manager** | `manager.mine1@trinetra.gov.in` | `Trinetra@2026` |
| **Colliery Safety Officer** | `safety.mine1@trinetra.gov.in` | `Trinetra@2026` |
| **System Administrator** | `admin@trinetra.gov.in` | `Trinetra@2026` |

---

## 5. Architecture Summary

```
                         TRINETRA BACKEND (:8000)
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
             TRINETRA WEB (:5173)           TRINETRA FIELD (:5174)
          Desktop Command & Analytics      Standalone Field Application
                    │                               │
           Dashboard / 3D Twin             Observe / Verify / Record
          Gov Reports / Admin Shell           Offline Sync / Evidence
```
