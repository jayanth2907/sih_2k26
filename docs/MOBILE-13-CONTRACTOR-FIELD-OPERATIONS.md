# TRINETRA — MOBILE-13: Contractor Field Operations & SLA Management
## Architectural Design & Field Execution Specification

---

### 1. Phase Objective & Overview

**MOBILE-13** delivers mobile-first contractor operations and SLA governance for the **TRINETRA Smart Governance & Compliance Monitoring System for Coal Mines**.

It closes the field-to-governance loop for third-party contractor compliance:
$$\text{CONTRACT} \longrightarrow \text{REQUIREMENT} \longrightarrow \text{FIELD VERIFICATION} \longrightarrow \text{OBSERVATION} \longrightarrow \text{EVIDENCE} \longrightarrow \text{SLA} \longrightarrow \text{CORRECTIVE ACTION} \longrightarrow \text{REVIEW} \longrightarrow \text{SIGN-OFF} \longrightarrow \text{AUDIT}$$

Frontline safety officers, mine managers, and field inspectors can audit vendor requirements (such as Form-O medical fitness, HEMM fitness licenses, contractor worker insurance, DGMS statutory training certificates, ESI/EPF compliance), log non-conformances with photographic evidence and GPS context, trigger corrective governance tasks, and track authoritative SLA deadlines.

---

### 2. Zero-Duplication Architecture & Reused Models

In adherence to TRINETRA's single source of truth architectural invariant, **no parallel contractor subsystems or duplicate tables were created**:

| Domain | Canonical Model Reused | Service / Core Layer | Endpoints / Sync Dispatch |
| :--- | :--- | :--- | :--- |
| **Contractors** | `Contractor` | `FieldService.get_mobile_contractor_summary` | `GET /api/v1/mobile/contractors` |
| **Contracts** | `Contract` | `FieldService.get_mobile_contracts` | `GET /api/v1/mobile/contractors/contracts/{id}` |
| **Requirements** | `ContractRequirement` | `FieldService.get_mobile_contract_requirements` | `GET /api/v1/mobile/contractors/requirements` |
| **Field Verification** | `ContractRequirement` | `FieldService.verify_contract_requirement` | `POST /api/v1/mobile/contractors/requirements/verify` |
| **Corrective Tasks** | `GovernanceTask` | `FieldService.verify_contract_requirement` | `GET /api/v1/mobile/work-queue` |
| **Offline Resilience** | `trinetra_field_sync_queue` | `FieldService.process_sync_batch` | `POST /api/v1/mobile/sync/batch` |
| **Supervisor Review** | `ApprovalRequest`, `ApprovalAction` | `GovernanceService.create_approval_request` | `POST /api/v1/mobile/reviews/{id}/action` |
| **Notifications** | `Notification` | `NotificationService.create_notification` | `GET /api/v1/mobile/notifications` |
| **Cryptographic Audit** | `AuditEvent` | `AuditService.record_event` (SHA-256 hash chaining) | `GET /api/v1/audit/chain/verify` |

---

### 3. Claims Discipline & Governance Invariants

1. **Contractual vs Statutory Compliance**: Verification of a contractual item (e.g. valid equipment calibration certificate) verifies operational compliance with the contract specification; it does not substitute statutory DGMS approvals or environmental clearance.
2. **Authoritative SLA Tracking**: Deadlines and countdowns are calculated strictly from the backend `due_at` / `valid_until` database timestamps. The frontend does not invent arbitrary deadlines or scores.
3. **Evidence Integrity**: SHA-256 fingerprints verify the cryptographic integrity of processed evidence bytes. Contextual GPS provides device coordinate fixes ($\pm X\,\text{m}$ accuracy) without claiming subterranean physical presence.
4. **Separation of Duties (SoD)**: Submitting inspectors cannot self-approve reviews or sign-off on non-conformance rectifications.
5. **Multi-Tenant Isolation**: Strict mine scoping (`mine_id`) prevents unauthorized cross-mine contractor access.

---

### 4. API Endpoints

#### 4.1 Summary & KPI Statistics
- `GET /api/v1/mobile/contractors/summary?mine_id=1`
  - Returns mine-scoped KPI summary: total registered contractors, active contracts, total requirements, overdue SLA count, pending verifications, open corrective actions, and list of contractor health summaries.

#### 4.2 Contractor & Contract Directory
- `GET /api/v1/mobile/contractors?mine_id=1&search=...`
  - Retrieves contractors filtered by mine and search criteria.
- `GET /api/v1/mobile/contractors/contracts?mine_id=1`
  - Lists active/expiring agreements for the mine.
- `GET /api/v1/mobile/contractors/contracts/{contract_id}`
  - Fetches deep contract details, financial values, validity window, responsible officers, and associated requirement checklist.

#### 4.3 Requirement Retrieval & SLA Status
- `GET /api/v1/mobile/contractors/requirements?mine_id=1&contract_id=...&status_filter=...`
  - Returns canonical requirement items with calculated SLA state (`ON_TRACK`, `DUE_SOON`, `OVERDUE`, `EXPIRED`, `COMPLIANT`).

#### 4.4 Field Verification & Corrective Action Generation
- `POST /api/v1/mobile/contractors/requirements/verify`
  - Body: `MobileContractorVerificationCreate` (`requirement_id`, `verification_status`, `verification_notes`, `expiry_date`, `evidence_file_name`, `evidence_file_hash`, `device_latitude`, `device_longitude`, `location_source`, `create_corrective_action`, `corrective_action_title`, `remedial_deadline`).
  - Automatically updates requirement state and timestamps.
  - On `ISSUE_FOUND` or when requested, generates a `GovernanceTask` corrective action and creates an `ApprovalRequest` routed to the Mine Safety Officer / Mine Manager.
  - Logs `CONTRACT_REQUIREMENT_VERIFIED` to the SHA-256 audit ledger.

#### 4.5 Offline Batch Sync Processing
- `POST /api/v1/mobile/sync/batch`
  - Processes queued operations with action `CONTRACTOR_VERIFICATION` or `CONTRACT_REQUIREMENT`, guaranteeing idempotency and server acknowledgment.

---

### 5. Mobile Frontend Implementation

- **Screen Component**: `MobileContractorScreen.tsx`
- **Sub-Tabs**:
  1. `CONTRACTS`: Searchable cards showing contractor code, registration, active contract count, and overall compliance health (`GOOD`, `ATTENTION_REQUIRED`, `CRITICAL`).
  2. `REQUIREMENTS`: Filterable checklist by category (`SAFETY`, `MEDICAL`, `TRAINING`, `INSURANCE`, `STATUTORY`, `DGMS_APPROVAL`, `LICENSE`) with dynamic SLA tags.
  3. `VERIFICATION_QUEUE`: Prioritized view of overdue and pending requirements requiring urgent field audits.
- **Verification Modal**:
  - Observation picker (`COMPLIANT` / `ISSUE_FOUND`).
  - Remarks text area.
  - Validity expiry date picker.
  - Camera / file evidence uploader with real-time SHA-256 checksum calculation.
  - GPS coordinate fixation with fallback to surveyed mine datum.
  - Corrective action generator with SLA deadline selector (24 Hours, 3 Days, 7 Days, 14 Days).
  - Offline sync integration with `trinetra_field_sync_queue`.

---

### 6. Multilingual Internationalization

Full tripartite localization across:
- **English (`en`)**
- **Hindi (`hi` — हिन्दी)**
- **Telugu (`te` — తెలుగు)**

All keys (`contractorsFieldTitle`, `contractsTab`, `requirementsTab`, `contractorVerificationQueueTab`, `totalContractorsCount`, `activeContractsCount`, `overdueRequirementsCount`, `pendingVerificationsCount`, `slaOnTrack`, `slaDueSoon`, `slaOverdue`, `slaExpired`, `slaCompliant`, `verifyRequirementBtn`, `verificationModalTitle`, `contractorDisclaimerText`, `offlineContractorSaved`, etc.) are wired into `frontend/src/i18n/translations.ts`.

---

### 7. Verification & Test Summary

#### 1. Focused MOBILE-13 Backend Tests (`backend/tests/test_mobile_contractor_field.py`):
- `test_01_contractors_summary_retrieval` : **PASSED**
- `test_02_contractor_list_and_search` : **PASSED**
- `test_03_contract_detail_and_sla_breakdown` : **PASSED**
- `test_04_verify_contract_requirement_compliant` : **PASSED**
- `test_05_verify_contract_requirement_issue_found_routes_to_approval` : **PASSED**
- `test_06_multi_tenant_mine_isolation` : **PASSED**
- `test_07_offline_sync_batch_contractor_verification` : **PASSED**
- **Result**: **7/7 PASSED (100%)**

#### 2. Full Backend Pytest Regression:
- **Result**: **285/285 PASSED (100%)** in 78.20s across all 13 mobile phases and backend subsystems.

#### 3. Frontend TypeCheck & Production Build:
- `tsc -b && vite build` : **PASSED (0 errors, 1.05s)**

---

### 8. Deterministic Demo Walkthrough

1. **Select Mine & Context**: Login as Mine Safety Officer (`safety.mine1@trinetra.gov.in`) or Mine Manager (`manager.mine1@trinetra.gov.in`).
2. **Access Contractor Operations**: Open mobile menu $\to$ **More** $\to$ **Contractor Operations & SLA** (or route `/mobile/contractors`).
3. **Inspect Vendor & SLA Health**: View KPI summary banner (Total Vendors, Active Contracts, Overdue SLA Items, Pending Verifications).
4. **Audit Requirement**:
   - Select **SLA & Requirements** tab.
   - Filter by `MEDICAL` or `SAFETY`.
   - Select requirement **"Form-O Initial Medical Examination (IME) Records"**.
   - Click **Verify Requirement**.
5. **Log Issue & Attach Evidence**:
   - Mark **ISSUE FOUND**.
   - Input observation: *"3 tipper drivers lack valid Form-O audiometry renewal certificates."*
   - Fix GPS coordinates and upload medical audit photo (SHA-256 calculated).
   - Check **Generate Corrective Task**, set SLA to **3 Days**.
   - Submit verification.
6. **Verify Governance Loop**:
   - Corrective task appears in work queue (`/mobile/tasks`).
   - Approval request created for supervisor review (`/mobile/reviews`).
   - Audit event chained in cryptographic ledger (`/api/v1/audit/chain/verify`).
   - Offline mode: If network disconnected, record queues in `trinetra_field_sync_queue` and syncs upon reconnection via `FieldService.process_sync_batch`.
