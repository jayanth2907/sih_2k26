# TRINETRA FIELD — Production Deployment Guide

**Application:** TRINETRA FIELD (Standalone Frontline Application)  
**Deployment Target:** Static Single-Page Application (SPA) / Progressive Web App (PWA)  
**Backend:** Shared TRINETRA FastAPI Core Service  

---

## 1. Environment Configuration

Create a `.env` file from `.env.example`:

```env
# URL to your deployed TRINETRA Backend API (e.g. https://api.trinetra.example.gov.in)
VITE_API_BASE_URL=https://api.trinetra.example.gov.in

# Application Metadata
VITE_APP_NAME=TRINETRA FIELD
VITE_APP_VERSION=1.0.0
VITE_APP_TAGLINE=Observe. Verify. Record. Act.
VITE_APP_MODE=FIELD
```

*Note: For single-origin or reverse-proxied deployments (Nginx / Caddy), leave `VITE_API_BASE_URL` empty to use relative `/api` paths.*

---

## 2. Static Hosting Providers

### Option A: Render (Static Site)
1. In Render Dashboard, click **New +** $\rightarrow$ **Static Site**.
2. Connect your Git repository.
3. Configure the following build settings:
   - **Root Directory:** `trinetra-field`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Add Environment Variable:
   - `VITE_API_BASE_URL` = `https://your-backend-api.onrender.com`
5. Configure Redirects/Rewrites Rule (SPA Fallback):
   - **Source:** `/*`
   - **Destination:** `/index.html`
   - **Action:** `Rewrite`

### Option B: Vercel
```bash
cd trinetra-field
npm run build
vercel deploy --prod dist
```
Add `vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Option C: Netlify
```bash
cd trinetra-field
npm run build
netlify deploy --prod --dir=dist
```
*(The included `public/_redirects` file automatically handles SPA routing fallback on Netlify).*

### Option D: Nginx Production Host
```nginx
server {
    listen 80;
    server_name field.trinetra.example.gov.in;
    root /var/www/trinetra-field/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to backend service
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 3. PWA Installation & Offline Verification

1. Deploy the `dist/` bundle over **HTTPS** (mandatory for PWA Service Workers and Geolocation).
2. Open the URL in Google Chrome / Microsoft Edge / Safari on Android, iOS, or Rugged Mining Tablets.
3. Tap the browser install prompt: **"Install TRINETRA FIELD"**.
4. The application installs directly to the home screen as a standalone colliery application without browser address bar clutter.
