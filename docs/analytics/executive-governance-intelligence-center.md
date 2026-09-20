# Executive Governance Intelligence Center (Phase 12C-2A)

## 1. Executive Summary

The **Executive Governance Intelligence Center** (`/analytics`) is the primary operational, compliance, and predictive analytical command center of TRINETRA. Built directly on top of the **Phase 12C-1 Analytics Data Foundation APIs**, this module provides a high-density, real-time command dashboard designed for executive mine leadership, statutory safety officers, field inspectors, and DGMS regulators.

Every displayed KPI, delta, distribution, breakdown, and timestamp originates directly from the backend analytical engine—eliminating hardcoded metrics, fabricated trend points, and arbitrary scoring.

---

## 2. Page Architecture & Data Flow

```
+-----------------------------------------------------------------------------------+
|                        TRINETRA GOVERNANCE INTELLIGENCE CENTER                     |
|  [Mine Selector]  [24H | 7D | 30D | 90D | CUSTOM]  [REFRESH]  [DATA MODE: SIM]    |
+-----------------------------------------------------------------------------------+
                                          |
                                          v  (Parallel Async Requests)
+-----------------------------------------------------------------------------------+
|                            PHASE 12C-1 ANALYTICS APIs                             |
|  /api/v1/analytics/mines/{id}/overview            /api/v1/analytics/mines/{id}/safety     |
|  /api/v1/analytics/mines/{id}/compliance          /api/v1/analytics/mines/{id}/production |
|  /api/v1/analytics/mines/{id}/workforce           /api/v1/analytics/mines/{id}/environment|
|  /api/v1/analytics/mines/{id}/contractors         /api/v1/analytics/mines/{id}/grievances |
|  /api/v1/analytics/mines/{id}/field-operations    /api/v1/analytics/mines/{id}/predictive |
|  /api/v1/analytics/cross-mine (RBAC Authorized)                                   |
+-----------------------------------------------------------------------------------+
                                          |
          +-------------------------------+-------------------------------+
          |                               |                               |
          v                               v                               v
+-----------------------+     +-----------------------+     +-----------------------+
|  TOP KPI COMMAND STRIP|     |  CROSS-DOMAIN PANELS  |     |  DRILL-DOWN & COPILOT |
|  8 Operational Metrics|     |  Safety, Compliance,  |     |  Slide-Out Drawer,    |
|  Period-over-Period   |     |  Production, Env,     |     |  GIS & 3D Deep Links, |
|  Trend Deltas         |     |  Risk, Workforce, Ops |     |  Copilot Context Hub  |
+-----------------------+     +-----------------------+     +-----------------------+
```

---

## 3. Metric & KPI Mapping

All metrics in the Top Command Strip and Domain Panels are bound to dedicated Phase 12C-1 analytical endpoints:

| UI KPI Card | Backend API Field | Data Mode | Calculation Source |
| :--- | :--- | :--- | :--- |
| **Governance Risk** | `overview.critical_incidents` | `OPERATIONAL` / `SIM` | High/Critical incident count with period delta |
| **Open Incidents** | `overview.open_incidents` | `OPERATIONAL` / `SIM` | Non-resolved Safety incidents in window |
| **Open Violations** | `overview.open_violations` | `OPERATIONAL` / `SIM` | Unresolved DGMS statutory violations |
| **SLA Breaches** | `overview.sla_breaches` | `OPERATIONAL` / `SIM` | Overdue corrective actions breaching SLA |
| **Predictive Hotspots**| `overview.predictive_high_hotspots` | `MODEL` | Phase 5 ML model high/critical prediction zones |
| **Open Field Tasks** | `overview.field_inspections_pending`| `OPERATIONAL` | Scheduled/In-Progress offline field inspections |
| **Env Deviations** | `overview.environmental_deviations` | `OPERATIONAL` | Telemetry readings exceeding statutory limits |
| **Open Grievances** | `overview.open_grievances` | `OPERATIONAL` | PGRM grievance cases pending redressal |

---

## 4. Visual Identity & SCADA Design System

The Executive Governance Intelligence Center reuses TRINETRA's dark industrial SCADA visual language:
- **Background**: Near-black industrial canvas (`#080A09`) with dark charcoal panel backgrounds (`#0D100F` and `#121614`).
- **Borders**: Sub-pixel thin precision borders (`#1B211E` and `#242C27`).
- **Accents**: TRINETRA Industrial Amber (`#f59e0b`), Emerald Source-Derived (`#10b981`), Cyan Model Telemetry (`#06b6d4`), and Crimson Critical Alarm (`#f43f5e`).
- **Typography**: Clean sans-serif and tabular IBM Plex Mono styling for numbers and timestamps.
- **Micro-charts**: Pure CSS and SVG responsive bar charts without heavy runtime chart dependencies.

---

## 5. Cross-Domain Deep Links & Integrations

The Intelligence Center functions as a springboard across TRINETRA:
1. **2D GIS Command Map (`/gis-map`)**: `[VIEW IN GIS]` focuses geographic coordinates and high-risk hotspots.
2. **3D Spatial Digital Twin (`/digital-twin`)**: `[FOCUS IN 3D]` activates spatial mesh cameras on the active anomaly.
3. **AI Governance Copilot (`/copilot`)**: `[ASK COPILOT]` pre-populates analytical context for statutory advisory.
4. **Field Operations (`/field-operations`)**: `[OPEN FIELD OPERATIONS]` directs inspectors to offline sync queues.
5. **Incidents & Violations (`/incidents`, `/violations`)**: Drill-down slide-out drawer allows direct navigation to source evidence records.

---

## 6. RBAC & Multi-Mine Isolation

- **Mine Scope Authorization**: Only authorized mines are accessible via the selector.
- **Cross-Mine Benchmarking**: The `[CROSS-MINE VIEW]` tab is restricted to System Administrators and DGMS Regulators.
- **Descriptive Comparisons**: Cross-mine comparisons are purely factual and strictly avoid subjective ranking or scoring.

---

## 7. Data Trust & Strict No-Data Preservation

- **Simulated Data Indicator**: When operational telemetry is synthetic or scenario-driven, the badge `DATA MODE: SIMULATED` is clearly shown.
- **Timestamp Integrity**: `DATA AS OF` reflects the latest observation timestamp returned by the backend API.
- **Missing Data Handling**: If an environmental parameter (such as PM2.5 or Noise) has 0 observations, it renders an explicit `NO DATA` badge rather than a misleading zero reading.
