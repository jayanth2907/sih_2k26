# TRINETRA FIELD — Production Deployment & Cloud Hosting Specification

**Audit Target:** Standalone Frontline PWA Deployment Verification  
**Standard:** Modern Static Web Architecture & Progressive Web App Guidelines  

---

## 1. Multi-Origin Deployment Topology

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PRODUCTION ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. API GATEWAY / BACKEND:  https://api.trinetra.example.gov.in           │
│    (FastAPI, SQLAlchemy, Uvicorn, PostgreSQL / SQLite)                 │
│                                                                         │
│ 2. TRINETRA WEB (Desktop):  https://trinetra.example.gov.in             │
│    (Static hosting: Command Center, 3D Twin, Analytics, Reports)        │
│                                                                         │
│ 3. TRINETRA FIELD (Mobile): https://field.trinetra.example.gov.in       │
│    (Static hosting / PWA: Frontline Field Intelligence & Sync)          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Cross-Origin Resource Sharing (CORS) Configuration

The backend `backend/app/core/config.py` is configured with authorized origins for both the Desktop Web Application and the Standalone Field Application:

```python
CORS_ORIGINS: List[str] = [
    "http://localhost:3000",
    "http://localhost:5173",  # TRINETRA WEB (Local Dev)
    "http://127.0.0.1:5173",
    "http://localhost:5174",  # TRINETRA FIELD (Local Dev)
    "http://127.0.0.1:5174",
    "http://localhost:4173",  # Vite Preview
    # In production, specify exact custom origins:
    # "https://trinetra.example.gov.in",
    # "https://field.trinetra.example.gov.in",
    "*"
]
```

---

## 3. Step-by-Step Build & Deployment Procedure

### Step 1: Build the Standalone Production Bundle
```bash
cd trinetra-field
npm install
npm run build
```
This produces an optimized, minified `dist/` directory containing `index.html`, CSS assets, and JavaScript bundles.

### Step 2: Deploy to Static Hosting (e.g. Render / Netlify / Vercel / Nginx)
* Configure build command: `npm install && npm run build`
* Configure publish directory: `dist`
* Configure single-page application fallback rule: `/* -> /index.html (200)`

### Step 3: Verify HTTPS & PWA Installation
* Ensure TLS 1.3 / HTTPS certificate is active (mandatory for Service Worker caching, Geolocation API, and Camera MediaDevices API).
* Open `https://field.trinetra.example.gov.in` on a mobile device or tablet and tap "Install".
