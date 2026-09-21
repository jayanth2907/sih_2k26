# TRINETRA MOBILE-03: Field Evidence, Camera, GPS & Integrity Architecture

## 1. Overview & System Architecture

TRINETRA MOBILE-03 delivers cryptographic evidence integrity, browser hardware camera/file integration, dual-mode location acquisition (Actual GPS vs. Surveyed Mine Reference), offline sync queues, supervisory verification workflows with separation of duties, and immutable audit logging.

```
+-----------------------------------------------------------------------------------+
|                        MOBILE INSPECTION EXECUTION LAYER                          |
|                                                                                   |
|  [ Camera Capture / File ]    [ Note Authoring ]       [ Geolocation Provider ]   |
|   - <input capture="env">      - Text / Obs. Links      - navigator.geolocation   |
|   - True Browser File Label    - Structured Metadata    - Quality Tier Assessment |
|             |                         |                           |               |
|             +-------------------------+---------------------------+               |
|                                       v                                           |
|                   +---------------------------------------+                       |
|                   | Client-Side SHA-256 Digest Generation |                       |
|                   | (Web Crypto API: crypto.subtle.digest)|                       |
|                   +---------------------------------------+                       |
|                                       |                                           |
|                 +---------------------+---------------------+                     |
|                 v                                           v                     |
|       [ Online Submission ]                       [ Offline Sync Queue ]          |
|    POST /api/v1/mobile/evidence               trinetra_field_sync_queue (Storage) |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
|                           TRINETRA BACKEND GOVERNANCE                             |
|                                                                                   |
|  [ FieldService.save_evidence ]               [ Verification & Approval Engine ]  |
|   - 64-char Hex SHA-256 Validation             - POST /mobile/evidence/:id/verify |
|   - Max 15MB Size Boundary                     - POST /mobile/evidence/:id/reject |
|   - Mine Isolation & FK Integrity              - Separation of Duties Enforced    |
|   - Audit Event: FIELD_EVIDENCE_RECORDED       - Audit Event: FIELD_EVIDENCE_VERI |
|                                                                                   |
|  [ PostgreSQL Operational Tables ]            [ SHA-256 Audit Ledger Chain ]      |
|   - field_evidence                             - audit_events                     |
|   - field_sync_logs (UUID Idempotency)         - Cryptographic Hash Continuity    |
+-----------------------------------------------------------------------------------+
```

---

## 2. Evidence Capture & Preview Lifecycle

1. **Capture Interface**:
   - Uses native HTML5 `<input type="file" accept="image/*" capture="environment">` with a truthful label: **"BROWSER CAMERA / FILE"**.
   - Note-based evidence supports manual observation writeups linked directly to specific checklist check items.
2. **Preview & Memory Safety**:
   - Object URLs generated via `URL.createObjectURL(file)` are tracked in React state and released via `URL.revokeObjectURL(previewUrl)` upon modal dismissal or evidence removal.
   - Live file dimensions (`width x height`), size (`KB / MB`), and MIME types (`image/jpeg`, `image/png`, `image/webp`, `text/plain`) are presented directly in the inspection UI.
3. **Cryptographic Integrity**:
   - Generated using the browser's standard Web Crypto API: `crypto.subtle.digest('SHA-256', buffer)`.
   - **Discipline on Claims**: The SHA-256 hash is documented accurately as recording the *exact cryptographic fingerprint of the file as received by TRINETRA*, without over-promising absolute physical origin or pre-capture tamper resistance.

---

## 3. Location Acquisition & Accuracy Tiers

- **Actual GPS Acquisition**:
  - Captured via `navigator.geolocation.getCurrentPosition` with `enableHighAccuracy: true`, `timeout: 10000`, `maximumAge: 0`.
- **Quality Tiers**:
  - **Good**: $\le 15\text{ m}$ horizontal accuracy.
  - **Fair**: $16\text{ m} - 50\text{ m}$ horizontal accuracy.
  - **Low**: $> 50\text{ m}$ horizontal accuracy.
  - **Surveyed Reference**: When GPS is unavailable (e.g. underground drifts or browser permission denial), fallback to surveyed mine coordinate datum (WGS84).
- **Collapsible Technical Details**:
  - Exposes Raw Latitude, Longitude, Altitude, Accuracy Radius ($\pm X\text{ m}$), Timestamp, Datum (`WGS84`), and Location Source (`ACTUAL_GPS` vs `SURVEYED_MINE_COORDINATE`).

---

## 4. Offline-First Sync & Idempotency

- Utilizes the single unified `trinetra_field_sync_queue` in `localStorage`.
- Each evidence item created offline receives a client-side `operation_id` (UUID v4).
- Upon reconnect, the mobile engine submits queued records to `POST /api/v1/mobile/sync`.
- The backend checks `FieldSyncLog` for `operation_id`:
  - New operation: Stores evidence, creates audit entry, records log, returns `ACCEPTED`.
  - Duplicate operation: Skips insertion, returns `ALREADY_PROCESSED` (ensuring absolute idempotency).

---

## 5. Reviewer Verification & Separation of Duties

- **Supervisory Roles**: Verification and Rejection endpoints (`/api/v1/mobile/evidence/{id}/verify` and `/api/v1/mobile/evidence/{id}/reject`) are strictly restricted to `MINE_MANAGER`, `MINE_SAFETY_OFFICER`, `REGULATOR`, and `SYSTEM_ADMIN`.
- **Separation of Duties**: A field inspector cannot verify evidence that they captured themselves unless they possess an explicit supervisory role.
- **Audit Logging**: Every verification and rejection is recorded into the immutable `audit_events` ledger table with before/after state diffs.

---

## 6. API Reference

| Endpoint | Method | Role Required | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/mobile/evidence` | `POST` | `FIELD_INSPECTOR`+ | Record evidence with SHA-256 hash and coordinates |
| `/api/v1/mobile/evidence/{id}` | `GET` | Authenticated | Retrieve full metadata and verification status |
| `/api/v1/mobile/evidence/{id}/verify` | `POST` | Supervisor | Approve evidence with reviewer notes |
| `/api/v1/mobile/evidence/{id}/reject` | `POST` | Supervisor | Reject evidence with mandatory justification reason |
| `/api/v1/mobile/sync` | `POST` | Authenticated | Process offline queued operations idempotently |
