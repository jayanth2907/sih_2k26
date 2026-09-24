# TRINETRA MOBILE-04: Field Map + Spatial Intelligence Architecture

## 1. Executive Summary & Purpose

TRINETRA MOBILE-04 transforms the mobile field experience by turning the map interface into a responsive, touch-friendly spatial intelligence HUD. Built intentionally for field workers and inspectors operating in high-consequence mining environments, it answers six vital questions instantaneously:

1. **Where am I?** (Actual GPS positioning with reported accuracy vs Surveyed Reference fallback)
2. **Where is my task?** (Verified task markers with priority and schedule context)
3. **Where is the mine/zone?** (Authoritative source-derived lease boundaries and zone perimeters)
4. **What risk is near me?** (Current risk levels vs 30-minute predictive risk escalation probabilities)
5. **What assets are near me?** (Sensors with live telemetry/anomalies and machinery)
6. **What inspection context applies here?** (Direct deep links to begin statutory inspections or consult AI Copilot)

---

## 2. Component Hierarchy & Data Flow

```
+-----------------------------------------------------------------------------------------+
|                                    MOBILE MAP HUD                                       |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  | [Header] Field Map Title  |  Mine Trust Status  |  [GPS: ACTIVE ±8m / SURVEYED]   |  |
|  +-----------------------------------------------------------------------------------+  |
|  | [Stale/Offline Banner] (Shown when disconnected with last sync timestamp)          |  |
|  +-----------------------------------------------------------------------------------+  |
|  | [Leaflet Map Viewport]                                                            |  |
|  |  - Top-Left: [NEAR ME (<1.5km)] / [ALL MINE] Proximity Filter                      |  |
|  |  - Top-Right: [Layer Controls] (Boundary, Location, Tasks, Risk, Sensors, Incs)    |  |
|  |  - Top-Right: [Crosshair Recenter]                                                |  |
|  |  - Canvas: Leaflet 1.9.4 + Keyless Esri World Imagery / World Topo Basemaps        |  |
|  |  - Layers:                                                                        |  |
|  |      * Mine Boundary (GeoJSON Polygon + Dash Style + Provenance Tooltip)          |  |
|  |      * My Location (Pulsing DivIcon + Accuracy Radius Circle)                    |  |
|  |      * Tasks (Priority Markers: HIGH/CRITICAL Red, MEDIUM/LOW Amber)              |  |
|  |      * Risk Hotspots (Flame Icons with Score & 30-min Escalation %)               |  |
|  |      * Sensors (Cyan Nodes + Anomaly Red Badges)                                  |  |
|  |      * Incidents (Rose Warning Markers)                                           |  |
|  +-----------------------------------------------------------------------------------+  |
|  | [Nearby Intelligence Card]                                                        |  |
|  |  - Open Tasks  |  High/Critical Risk  |  Open Incidents  |  Sensor Anomalies      |  |
|  +-----------------------------------------------------------------------------------+  |
|  | [Interactive Bottom Sheet] (Opens upon marker click)                              |  |
|  |  - Header: Entity Type + Trust Badge (SOURCE-DERIVED, ACTUAL GPS, PREDICTIVE, etc) |  |
|  |  - Content: Current Score, Predictive Escalation %, Distance (~m), Telemetry      |  |
|  |  - Actions: [ INSPECT ] -> Execution Screen | [ ASK COPILOT ] | [ VIEW IN 3D ]    |  |
|  +-----------------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Location Acquisition & Accuracy Tiers

- **Engine**: Browser `navigator.geolocation.getCurrentPosition` with `enableHighAccuracy: true`, `timeout: 10000`, `maximumAge: 0`.
- **Quality Tiers**:
  - `GOOD`: Horizontal accuracy $\le 15$m.
  - `FAIR`: Horizontal accuracy $16\text{ m} - 50\text{ m}$.
  - `LOW`: Horizontal accuracy $> 50$m.
  - `SURVEYED`: Fallback to official surveyed mine datum (WGS84).
- **Discipline**: No claims of continuous background tracking or infallible physical proof. Coordinates are transparently labeled with reported accuracy ($\pm X$m).

---

## 4. Current Risk vs. Predictive Risk Discipline

TRINETRA strictly enforces terminological accuracy between observed and forecasted conditions:

- **Observed Risk**: Labeled as **`CURRENT RISK`** (e.g. `77.4 / 100`). Sourced from real-time environmental telemetry, sensor anomalies, and compliance records.
- **Forecasted Escalation**: Labeled as **`PREDICTED RISK`** with explicit forecast horizon and probability (e.g. `84% risk escalation probability within 30 min`).
- **Forbidden Phrasing**: Never describes predictions as "chance of an accident occurring".

---

## 5. Real Mine Data Protection vs. Synthetic Demo Data

- **Source-Derived Mines**:
  - The 6 official geological blocks (North of Arkhapal, Rohne, Jogeshwar, Rabodh, Urtan North, Pachwara) display `SOURCE-DERIVED` boundary geometries.
  - When uninstrumented, they display `NO OPERATIONAL DATA` rather than fabricating synthetic sensors or tasks.
- **Simulated Demo Mines**:
  - Clearly tagged with `SIMULATED DEMO` and `SIMULATED` trust badges across all operational features.

---

## 6. Offline Capabilities & Stale Data Resilience

- **Local Storage Cache**: Full GIS map payloads and assigned tasks are cached under `trinetra_cached_gis_{mineId}` upon every successful network response.
- **Offline Mode**: If network connectivity drops:
  - The map continues functioning with cached GeoJSON boundaries and task coordinates.
  - A prominent notice banner displays `OFFLINE — Data may be stale` alongside the timestamp of the last successful sync.
  - Proximity filter defaults to `ALL MINE` if browser GPS is unavailable.

---

## 7. Multi-Tenant Security & Separation of Duties

- Authoritative backend GIS routes (`/api/v1/gis/mines/{mine_id}/map`, `/api/v1/gis/mines/{mine_id}/context`, `/api/v1/gis/search`) enforce JWT verification and user-to-mine access control checks.
- Scoped Mine Managers and Inspectors are prohibited from querying coordinates, tasks, sensors, or incidents belonging to unassigned mines (returning HTTP 403 Forbidden).
