# TRINETRA FIELD — Build, Release & Packaging Specification

**Release Version:** `v1.0.0` (MOBILE-18)  
**Artifact Format:** Production Dist Archive & Clean Source Archive  
**Audit Standard:** Zero-Secret Inspection & Clean Build Verification  

---

## 1. Production Build Metrics

Execution command: `npm run build` (Executed in `trinetra-field/`)

```
vite v8.3.0 building client environment for production...
transforming...
✓ 1970 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.28 kB │ gzip:   0.62 kB
dist/assets/index-B-ioCjIk.css  106.22 kB │ gzip:  19.87 kB
dist/assets/index-CvnXASZD.js   993.80 kB │ gzip: 249.89 kB

✓ built in 618ms
```

### Bundle Size Comparison: Desktop Web App vs Standalone Field App

| Metric | TRINETRA WEB (Desktop) | TRINETRA FIELD (Standalone) | Optimization / Reduction |
| :--- | :---: | :---: | :--- |
| **Main JS (Raw)** | 1,030.96 kB | **993.80 kB** | -37.16 kB (Leaner runtime) |
| **Main JS (Gzip)** | 258.73 kB | **249.89 kB** | -8.84 kB |
| **CSS (Raw)** | 162.40 kB | **106.22 kB** | **-56.18 kB (-34.6% reduction)** |
| **CSS (Gzip)** | 26.08 kB | **19.87 kB** | **-6.21 kB (-23.8% reduction)** |
| **Initial 3D WebGL Load** | Heavy (674.75 kB chunk) | **Zero (Completely excluded)** | Sub-second field launch |

---

## 2. Release Archive Packages

Two standardized release packages are generated for distribution:

### 1. `TRINETRA-FIELD-v1.0.0-dist.zip`
* **Purpose:** Deploy-ready production distribution bundle.
* **Contents:** Pre-compiled static assets (`index.html`, CSS, JS, SVG icons, PWA manifest, and `_redirects`).
* **Exclusions:** No source files, no `node_modules`, no `.git`.

### 2. `TRINETRA-FIELD-v1.0.0-source.zip`
* **Purpose:** Clean, reproducible source code archive for standalone rebuilding.
* **Contents:** `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/`, `public/`, `.env.example`, `README.md`, `DEPLOYMENT.md`.
* **Strict Exclusions:** Zero `node_modules`, zero `.git`, zero `.env` files, zero local caches (`.tmp`, `.vite`).

---

## 3. Security & Secrets Pre-Release Audit

Prior to ZIP generation, an exhaustive automated grep was conducted across all files in `trinetra-field/`:

- **JWT Secrets:** 0 found (Managed authoritatively on backend).
- **Database Credentials:** 0 found.
- **Private API Keys:** 0 found.
- **Private Certificates:** 0 found.
- **Verdict:** **100% CLEAN OF EMBEDDED SECRETS**.
