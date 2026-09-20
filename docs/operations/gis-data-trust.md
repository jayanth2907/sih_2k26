# GIS Data Trust & Authenticity Governance

## 1. Ground Truth Principles

TRINETRA follows strict provenance and authenticity principles across all spatial data layers:

1. **No Hallucinated Geography**: Mine boundaries and corner coordinates must come directly from official Ministry of Coal documents.
2. **Explicit Approximation**: If a block document does not define a closed polygon (e.g. *North of Arkhapal* only specifies cardinal bounding points), it is labeled **`APPROXIMATE`** and rendered with dashed warning styles.
3. **Transparent Badging**: Every map entity displays an explicit trust category badge:
   - `SOURCE-DERIVED`: Verified from official scanned PDF / summary documents with SHA-256 provenance.
   - `APPROXIMATE`: Cardinal points or bounding box derived with known approximations.
   - `OPERATIONAL`: Live enterprise database records (Incidents, Alerts, Tasks, Inspections).
   - `SIMULATED`: Synthetic telemetry or simulated external surveillance feeds (Sensors, Cameras, CMSMS).
   - `NOT DOCUMENTED`: Explicitly noted when data is missing from source records.

---

## 2. Official Coal Block Summary

| Block Name | State | District | Geometry Status | Provenance Document |
| :--- | :--- | :--- | :--- | :--- |
| **Choritand Tilaya** | Jharkhand | Bokaro | `SOURCE_DERIVED` | Choritand Tilaya Project Information (p. 2-4) |
| **Jogeshwar & Khas Jogeshwar** | Jharkhand | Bokaro | `SOURCE_DERIVED` | Jogeshwar Mine Summary (p. 1-3) |
| **Rabodh** | Jharkhand | Hazaribagh | `SOURCE_DERIVED` | Rabodh Coal Block Document (p. 2) |
| **Rohne** | Jharkhand | Hazaribagh | `SOURCE_DERIVED` | Rohne Summary Profile (p. 2-5) |
| **Urtan North** | Madhya Pradesh | Anuppur | `SOURCE_DERIVED` | Urtan North Mine Summary (p. 1-4) |
| **North of Arkhapal** | Odisha | Angul | `APPROXIMATE` | North of Arkhapal Summary (p. 1) |

---

## 3. Prohibited Judging Claims (Anti-Hallucination Guardrails)

When demonstrating TRINETRA to judges or regulators, do NOT make the following claims:

- **DO NOT claim live satellite radar/optical imagery feeds exist**: Satellite feeds (CMSMS/Khanan Prahari) in this build are simulated integration signals using official workflow schemas.
- **DO NOT claim all 6 blocks have fully closed surveyed boundary polygons**: North of Arkhapal contains cardinal reference points and bounding limits, explicitly marked `APPROXIMATE`.
- **DO NOT claim underground mine shafts are 100% geographically exact**: Underground 3D levels and tunnels in the Digital Twin are schematic representations positioned relative to source-derived surveyed surface origins.
