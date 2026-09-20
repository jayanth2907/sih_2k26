# TRINETRA — Source-Derived 3D Digital Mine Architecture

## 1. Executive Summary & Objective

**TRINETRA (त्रिनेत्र)** Phase 11B transforms the 3D Digital Twin from a purely procedural/schematic visualization into a **source-traceable, mathematically grounded Digital Mine**. Every boundary polygon, cardinal coordinate pin, and stratigraphic coal seam plate in the 3D scene is derived from official Ministry of Coal tender notices, Geological Exploration Summary reports, and Coal Atlas surveys ingested during Phase 11A.

---

## 2. Spatial Reference Frame & Transformation Methodology

### 2.1 Coordinate Reference System (CRS)

1. **Source Geographic CRS**: EPSG:4326 (WGS84 datum, Latitude / Longitude in Decimal Degrees & DMS).
2. **Visualization Coordinate System**: **Local Tangent Plane (LTP)** in metric units ($m$).
   - **Origin $(0, 0, 0)$**: Mine datum reference point $(\text{Lat}_0, \text{Lon}_0, \text{Elev}_0)$.
   - **X-axis**: East displacement in meters ($\Delta X > 0$ for East).
   - **Y-axis**: Vertical elevation above sea level in meters ($Y > 0$ for Elevation, $Y < 0$ for Subsurface Depth).
   - **Z-axis**: South displacement in meters ($\Delta Z > 0$ for South, $\Delta Z < 0$ for North), matching the WebGL / Three.js right-handed camera perspective.

### 2.2 Mathematical Equirectangular Transformation Formula

For localized mining blocks ($\Delta \text{distance} < 50\text{ km}$):
$$\Delta X = \Delta \lambda \cdot \cos\left(\frac{\phi + \phi_0}{2}\right) \cdot R_{\text{earth}}$$
$$\Delta Z = -(\phi - \phi_0) \cdot R_{\text{earth}}$$
$$Y = \text{Elevation}_{\text{AMSL}}$$

Where $R_{\text{earth}} = 6,371,000\text{ m}$.

---

## 3. Four-Tier Trust Classification Standard

Every 3D entity and geometric component carries an explicit, immutable **Trust Classification**:

| Classification | Visual Style | Definition & Criterion | Example |
| :--- | :--- | :--- | :--- |
| **`SOURCE_DERIVED`** | Solid Cyan / Emerald Polyline & Shading | Direct extraction from high-precision government geological report with documented coordinates. | Choritand Tilaya (`BLOCK-CT-66`), Rohne (`BLOCK-ROH-69`), Urtan North (`BLOCK-URT-70`) |
| **`APPROXIMATE`** | Dashed Amber Line with Floating Caution Tag | Extracted from reconnaissance maps or Coal Atlas diagrams where boundary vertices are estimated. | North of Arkhapal Srirampur (`BLOCK-NOA-71`) |
| **`SCHEMATIC`** | Blue Translucent Plates | Stratigraphic stacking based on general sequence order when borehole depth logs are grouped. | Composite Seam Horizons |
| **`SIMULATED`** | Purple Marker Badge | Operational sensors, cameras, and machinery generating telemetry for command & control demo. | Bharat Deep Shaft 4 (`MINE-BDS-04`) |

---

## 4. No-Fabrication Guarantee (Scientific Integrity)

> [!IMPORTANT]
> **Zero Fabrication Policy**: For real coal blocks that are in the exploration or tender stage, TRINETRA **strictly prohibits** the procedural generation of fake shafts, drifts, longwall panels, or underground tunnels. 
> 
> Underground workings for exploration blocks are marked **`NOT_DOCUMENTED (Not Fabricated)`** in the Data Completeness matrix. The 3D scene renders documented surface boundaries, cardinal pillars A–I, and stratigraphic coal seam slabs at verified depths.

---

## 5. 3D Elements & Interactive Inspection

### 5.1 Real Mine Boundary Polygons
- Renders closed 3D polygon loop connecting documented perimeter vertices.
- Displays area in $\text{km}^2$, perimeter in $\text{km}$, and source document citation upon click.

### 5.2 Cardinal Coordinate Points (A–I)
- High-visibility 3D marker pillars with glowing top beacons.
- Canvas-based text sprite labels rendering high-DPI point identifiers (e.g., "Point A", "Point B").
- Interactive raycasting opens coordinate inspection: DMS coordinates, UTM projection, Local 3D $(X, Y, Z)$, and verbatim document excerpt.

### 5.3 Stratigraphic Coal Seam Slabs
- 3D horizontal layer slabs positioned at true documented depth intervals ($Y = -\text{depth}_{\text{avg}}$).
- Color-coded edge ribbons distinguishing stratigraphic layers (e.g., Seam II, Seam III, Seam VI, Seam X).
- Displays coal grade (e.g., Non-Coking G7, Steel Grade I) and thickness range.

---

## 6. End-to-End Traceability & Provenance Pipeline

```mermaid
graph TD
    A[Official Govt Tender PDF / Project Report] -->|SHA-256 Hash Computation| B[DataProvenance Record]
    B --> C[Real Mine Ingestion Engine]
    C --> D[(PostgreSQL / SQLite Database)]
    D --> E[SpatialTransformationService]
    E -->|LTP East-X, Elev-Y, South-Z| F[/api/v1/mines/{id}/digital-twin]
    F --> G[Three.js WebGL 3D Canvas]
    G -->|Click Raycast on 3D Element| H[Contextual Object Inspector]
    H -->|Verified Citation| I[Document Title, Page #, SHA-256, Verbatim Text]
```

---

## 7. Supported Mines in Phase 11B Digital Twin

1. **`BLOCK-CT-66`** — Choritand Tilaya Coal Block (Source-Derived Boundary, 1.30 km², East Bokaro)
2. **`BLOCK-JOG-67`** — Jogeshwar Coal Block (Source-Derived Boundary, 3.79 km², West Bokaro)
3. **`BLOCK-RAB-68`** — Rabodh Coal Block (Source-Derived Boundary, 3.25 km², West Bokaro)
4. **`BLOCK-ROH-69`** — Rohne Coal Block (Source-Derived Boundary, 8.44 km², North Karanpura)
5. **`BLOCK-URT-70`** — Urtan North Coal Block (Source-Derived Boundary, 5.20 km², Mand-Raigarh)
6. **`BLOCK-NOA-71`** — North of Arkhapal Srirampur (Approximate Boundary, 36.43 km², Talcher)
7. **`MINE-BDS-04`** — Bharat Deep Shaft 4 (Preserved Simulated Operational Twin, Jharia Seam 2 & 3)
8. **`MINE-SOB-02`** — Singrauli OpenCast Basin (Preserved Terraced Open Pit Twin)
9. **`MINE-RS-07`** — Raniganj Seam 7 Incline (Preserved Incline Drift Twin)
