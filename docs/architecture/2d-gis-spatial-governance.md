# 2D GIS / Mine Risk Map & Spatial Governance Architecture

## 1. Overview & Objective

The **TRINETRA 2D GIS & Spatial Governance Layer** (Phase 12B) provides a geographic command interface that connects official Ministry of Coal block boundaries with live operational telemetry, incidents, alerts, predictive risk hotspots, field inspections, and the 3D Digital Twin.

It is built strictly on **Source Truth**:
- Official coal block boundaries and corner coordinates are derived from official Ministry of Coal Project Information & Summary documents.
- Any entity without explicit survey backing is explicitly classified with honest trust metrics.

---

## 2. Architectural Data Flow

```
+-------------------------------------------------------------------------+
|                  REAL SOURCE DOCUMENTS & PROVENANCE                     |
|  (6 Official Coal Blocks: Choritand Tilaya, Jogeshwar, Rabodh, Rohne,  |
|   Urtan North, North of Arkhapal [APPROXIMATE])                         |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                    SPATIAL CONTEXT & GIS BACKEND                        |
|  - SpatialTransformationService (WGS84 Lat/Lon <-> Local Metric 3D)     |
|  - SpatialContextService (Haversine Distance, Bounding Box Geofencing) |
|  - Predictive Risk & Telemetry Hotspot Aggregator                       |
|  - Unified GIS Search Engine with RBAC & Mine Isolation                 |
+-------------------------------------------------------------------------+
          |                                                 |
          v                                                 v
+------------------------------------+   +------------------------------------+
|       FASTAPI GIS REST APIS        |   |       COPILOT SPATIAL TOOLS        |
|  - /api/v1/gis/mines/{id}/map      |   |  - get_spatial_risk_context        |
|  - /api/v1/gis/mines/{id}/context  |   |  - Integrated into RAG grounding   |
|  - /api/v1/gis/mines/{id}/risk     |   +------------------------------------+
|  - /api/v1/gis/search              |
|  - /api/v1/gis/features/{id}/...   |
+------------------------------------+
                   |
                   v
+-------------------------------------------------------------------------+
|                   REACT + LEAFLET 2D COMMAND MAP                        |
|  - Dark CARTO/OSM Basemap Tiles                                         |
|  - Documented GeoJSON Boundary Polygons (Color-coded by status)         |
|  - Survey Corner Coordinate Markers with DMS & Datum Badges             |
|  - Dynamic Risk Hotspot Circles (30m Predictive & Telemetry Anomalies)  |
|  - Operational Feature Markers (Sensors, Cameras, Incidents, Tasks)     |
|  - Live Trust Counters (SOURCE-DERIVED, APPROXIMATE, SIMULATED)         |
|  - Feature Evidence Sidebar with Bidirectional 3D Twin Deep Linking     |
+-------------------------------------------------------------------------+
```

---

## 3. Key Services and Components

### 3.1 `SpatialContextService` (`backend/app/services/spatial_context_service.py`)
- **Haversine Distance**: Computes exact Great-Circle distance between WGS84 geographic points in meters.
- **Bounding Box Geo-fencing**: Checks containment against documented boundary coordinates, returning `INSIDE_DOCUMENTED_BOUNDARY`, `OUTSIDE_DOCUMENTED_BOUNDARY_REVIEW`, or `UNKNOWN`.
- **Entity Proximity Search**: Identifies nearest sensors, cameras, incidents, and field inspections with distance sorting.
- **Spatial Risk Aggregator**: Aggregates open sensor anomalies, 30-minute machine learning risk predictions (RandomForest-v1.0-30m), and baseline operational state into actionable geospatial hotspots.
- **Backward Compatibility**: Maintains 3D anomaly context calculations (`get_spatial_context_for_anomaly`) for Phase 2/3 compatibility.

### 3.2 GIS API Endpoints (`backend/app/api/v1/gis.py`)
- `GET /api/v1/gis/mines/{mine_id}/map`: Complete GeoJSON map package for authorized mines including boundaries, corner coordinates, seams, operational overlays, predictive hotspots, and trust metrics.
- `GET /api/v1/gis/mines/{mine_id}/context`: Proximity inspection for arbitrary lat/lon coordinates.
- `GET /api/v1/gis/mines/{mine_id}/risk`: Filtered list of geospatial risk hotspots.
- `GET /api/v1/gis/search`: Unified search across mines, coordinates, sensors, and incidents with RBAC filtering.
- `POST /api/v1/gis/features/{feature_id}/field-task`: One-click field task creation from GIS recommendations with immutable `AuditEvent` logging.

### 3.3 Copilot Spatial Tool (`backend/app/copilot/tools.py`)
- `get_spatial_risk_context`: Allows the Copilot to query live spatial context, boundary status, nearby sensors, and active risk hotspots for any mine or geographic coordinate.

### 3.4 Interactive Frontend (`frontend/src/pages/GisMapPage.tsx`)
- High-performance Leaflet-based map with dark theme styling.
- Layer toggles for boundaries, survey corners, geological seams, sensors, cameras, incidents, alerts, field tasks, and predictive risk heat circles.
- Feature Evidence Drawer displaying SHA-256 provenance hashes, source page numbers, and action buttons (`FOCUS IN 3D`, `ASK COPILOT`, `CREATE FIELD TASK`).
