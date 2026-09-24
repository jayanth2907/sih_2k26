# TRINETRA — MOBILE-12: Production, Environment & Compliance Field Reporting
## Architectural Design & Field Execution Specification

---

### 1. Phase Objective & Overview

**MOBILE-12** completes the operational reporting layer of the **TRINETRA Smart Governance & Compliance Monitoring System for Coal Mines**, empowering authorized frontline mining personnel to record production dispatch logs, environmental readings, and statutory non-conformances directly from field devices.

The workflow follows a strict governance loop:
$$\text{FIELD} \longrightarrow \text{CAPTURE} \longrightarrow \text{VALIDATE} \longrightarrow \text{EVIDENCE / LOCATION} \longrightarrow \text{SAVE} \longrightarrow \text{OFFLINE QUEUE} \longrightarrow \text{SERVER ACK} \longrightarrow \text{REVIEW} \longrightarrow \text{DIGITAL SIGN-OFF} \longrightarrow \text{AUDIT}$$

---

### 2. Core Reused Architecture & Zero-Duplication Policy

Consistent with the TRINETRA single source of truth architectural rule, **no parallel or duplicate models were created**:

| Domain | Canonical Model Reused | Service / Core Layer | Endpoints / Sync Dispatch |
| :--- | :--- | :--- | :--- |
| **Production Reporting** | `ProductionReport` | `FieldService.record_mobile_production_report` | `POST /api/v1/mobile/reporting/production` |
| **Environmental Observations** | `EnvironmentalRule`, `EnvironmentalObservation` | `FieldService.record_mobile_environmental_observation` | `POST /api/v1/mobile/reporting/environment` |
| **Compliance Non-Conformances** | `Violation`, `CorrectiveAction` | `FieldService.record_mobile_compliance_observation` | `POST /api/v1/mobile/reporting/compliance` |
| **Offline Resilience** | `trinetra_field_sync_queue` | `FieldService.process_sync_batch` | `POST /api/v1/mobile/sync/batch` |
| **Supervisor Review & Approval** | `ApprovalRequest`, `ApprovalAction` | `GovernanceService.create_approval_request` | `POST /api/v1/mobile/reviews/{id}/action` |
| **Notifications** | `Notification` | `NotificationService.create_notification` | `GET /api/v1/mobile/notifications` |
| **Tamper-Evident Audit Trail** | `AuditEvent` | `AuditService.record_event` (SHA-256 hash chaining) | `GET /api/v1/audit/chain/verify` |
| **Statutory Documents** | `StatutoryDocument`, `ExtractedDocumentField` | `OCR / Document Extraction Pipeline` | `GET /api/v1/mobile/documents/statutory/{ref}` |

---

### 3. Data Provenance & Claims Discipline

Every field observation explicitly maintains and conveys its source provenance:
- **`MANUAL`**: Direct field entry (weighbridge slips, handheld anemometer / dust sampler readings, visual inspections).
- **`SENSOR_DERIVED`**: Continuous monitoring telemetry (CAAQS ambient air stations, conveyor belt weighers).
- **`IMPORTED`**: Third-party ERP / SAP / dispatch database sync.
- **`SIMULATED`**: Synthetic drill / scenario test records generated during mock drills or demo rehearsals.

#### Claims Discipline Invariants:
1. **No Fake Biometrics**: Physical attendance is recorded manually by authorized supervisors. No biometric claims are made.
2. **Contextual GPS Only**: Device-reported coordinates are captured as contextual metadata with accuracy bounds ($\pm X\,\text{m}$); they do not prove subsurface presence.
3. **Statutory Non-Conformances**: TRINETRA acts as an observation logging platform with clause resolution; legal determinations remain the sole jurisdiction of certified Directorate General of Mines Safety (DGMS) and statutory officials.

---

### 4. API Endpoints

#### 4.1 Summary & Rule Config
- `GET /api/v1/mobile/reporting/summary?mine_id=1`
  - Returns current shift context, planned vs actual production totals, configured environmental threshold rules, active observation counts, open violations count, and pending approval badge counts.

#### 4.2 Production Reporting
- `GET /api/v1/mobile/reporting/production?mine_id=1`
  - Fetches recent production logs for the active mine and shift.
- `POST /api/v1/mobile/reporting/production`
  - Records shift dispatch log. Automatically calculates variance quantity and percentage.
  - If variance shortfall exceeds 15%, automatically routes to Mine Manager via `ApprovalRequest` with `PENDING_REVIEW` status.
  - Automatically writes `PRODUCTION_REPORT_CREATED` event to cryptographic audit ledger.

#### 4.3 Environmental Observations
- `GET /api/v1/mobile/reporting/environment?mine_id=1`
  - Lists environmental rules and recent observation logs.
- `POST /api/v1/mobile/reporting/environment`
  - Compares observation against `threshold_limit`.
  - Automatically flags breaches (`HIGH` / `CRITICAL` severity), alerts supervisors, creates a notification, and logs `ENVIRONMENT_OBSERVATION_CREATED` to audit trail.

#### 4.4 Compliance Observations
- `GET /api/v1/mobile/reporting/compliance?mine_id=1`
  - Returns open violations and DGMS non-conformance logs.
- `POST /api/v1/mobile/reporting/compliance`
  - Logs non-conformance with Coal Mines Regulations (CMR) 2017 regulatory clause, sets target resolution SLA date, links initial corrective action, and dispatches `COMPLIANCE_OBSERVATION_CREATED` audit event.

#### 4.5 Offline Batch Sync Integration
- `POST /api/v1/mobile/sync/batch`
  - Seamlessly handles `PRODUCTION` / `PRODUCTION_REPORT`, `ENVIRONMENT` / `ENVIRONMENT_OBSERVATION`, and `COMPLIANCE` / `VIOLATION` batch operations with idempotent hash tracking.

---

### 5. Multilingual Support

The mobile UI is fully internationalized across:
1. **English (`en`)**
2. **Hindi (`hi` — हिन्दी)**
3. **Telugu (`te` — తెలుగు)**

All domain terms, labels, status chips, disclaimers, and validation messages use dynamic localization keys from `frontend/src/i18n/translations.ts`.

---

### 6. Verification & Test Summary

#### Backend Pytest Regression:
- **`backend/tests/test_mobile_field_reporting.py`**: **9/9 PASSED (100%)**
  - `test_01_mobile_reporting_summary_and_rules`
  - `test_02_production_report_creation_normal`
  - `test_03_production_shortfall_routes_to_approval`
  - `test_04_environmental_observation_within_limit`
  - `test_05_environmental_observation_threshold_breach`
  - `test_06_compliance_observation_creation_and_corrective_action`
  - `test_07_multi_tenant_mine_isolation`
  - `test_08_offline_sync_batch_for_production_env_compliance`
  - `test_09_production_negative_quantity_rejection`
- **Total Backend Pytest Suite**: **278/278 PASSED (100%)** in 99.01s.

#### Frontend TypeScript & Production Build:
- `tsc -b && vite build` $\longrightarrow$ **0 errors, successfully bundled in 1.04s**.
