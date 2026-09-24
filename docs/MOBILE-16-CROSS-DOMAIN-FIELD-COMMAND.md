# MOBILE-16: Cross-Domain Field Command & Final Integration Architecture

## 1. Executive Summary

`MOBILE-16` provides the unified integration capstone for the **TRINETRA Smart Governance & Compliance Monitoring System for Coal Mines**. It ties together all mobile capabilities developed across `MOBILE-01` through `MOBILE-15` into **ONE coherent Field Command Center** without creating redundant databases, duplicate domain models, new workflow engines, or client-side prediction logic.

### Core Operational Lifecycle
$$\text{SIGNAL} \longrightarrow \text{CONTEXT} \longrightarrow \text{FIELD ACTION} \longrightarrow \text{OBSERVATION} \longrightarrow \text{EVIDENCE} \longrightarrow \text{GOVERNANCE ACTION} \longrightarrow \text{REVIEW} \longrightarrow \text{SIGN-OFF} \longrightarrow \text{HANDOVER} \longrightarrow \text{AUDIT}$$

---

## 2. Architecture & Design Principles

```
                                  TRINETRA FIELD COMMAND CENTER
                                  (Single Mobile Entry Point)
                                               │
             ┌─────────────────────────────────┼────────────────────────────────┐
             │                                 │                                │
     [ATTENTION QUEUE]                   [MY WORK QUEUE]                [NEARBY PROXIMITY]
    • Predictive Risk Signals           • Assigned Tasks               • Hazards in Radius
    • Open Safety Incidents             • Pending Inspections          • Sensor Anomalies
    • Overdue Remedial Tasks            • Supervisor Reviews           • Spatial Hazards
    • Supervisor Review Queue           • Verification Items           • 2D/3D Deep Links
    • Contractor SLA Breaches
    • PGRM Grievances
    • Environmental Observations
             │                                 │                                │
             └─────────────────────────────────┼────────────────────────────────┘
                                               │
                              [CROSS-DOMAIN RELATIONAL FABRIC]
             ┌─────────────────────────────────┼────────────────────────────────┐
             │                                 │                                │
     [CRYPTOGRAPHIC AUDIT]            [CONTEXT PROPAGATION]            [OFFLINE ENGINE]
     SHA-256 Chained Trace            Parent ID Preservation           Local Sync Queue
     Immutable AuditEvent             Zero Duplicate Data              Freshness Status
```

### Key Architectural Tenets
1. **Zero Redundant Domain Models**: Reuses canonical `RiskPrediction`, `Incident`, `GovernanceTask`, `FieldInspection`, `FieldEvidence`, `Contractor`, `ContractRequirement`, `Grievance`, `ApprovalRequest`, and `AuditEvent` models.
2. **Authoritative Backend**: Role-based access control (RBAC), multi-tenant mine isolation, and status validation remain strictly enforced server-side.
3. **Cryptographic Provenance**: Every lifecycle transition is committed to an immutable `AuditEvent` log with linked SHA-256 hash chains.
4. **Deterministic Deep-Linking**: Universal URL schema allows instant contextual transition across mobile modules without data loss.

---

## 3. Field Command Model & Endpoints

### 3.1 Schemas (`backend/app/schemas/field_command.py`)
- `AttentionItem`: Unified priority attention item preserving original `source_type` (`PREDICTIVE_RISK`, `INCIDENT`, `TASK`, `REVIEW`, `GRIEVANCE`, `CONTRACTOR_SLA`, `ENVIRONMENT`, `COMPLIANCE`).
- `MyWorkItem`: Canonical user-assigned task, inspection, review, or verification.
- `NearbyItem`: Proximity-based entity with coordinate offsets and distance calculation in meters.
- `CommandSummaryResponse`: Operational snapshot containing mine, active shift, freshness status, attention queue, my work items, nearby items, and domain counts.
- `UnifiedTimelineEvent`: Cryptographically verified event with actor, role, category, and hash metadata.
- `RelatedRecordsResponse`: Cross-domain relational graph connecting risks, incidents, tasks, evidence, grievances, contracts, and approvals.

### 3.2 APIs (`backend/app/api/v1/mobile.py`)
- `GET /api/v1/mobile/command/summary`: Returns the Field Command Center overview for the active mine.
- `GET /api/v1/mobile/command/timeline/{resource_type}/{resource_id}`: Reconstructs chronological audit trail from `AuditEvent` entities.
- `GET /api/v1/mobile/command/related/{resource_type}/{resource_id}`: Resolves cross-domain relational graph.

---

## 4. Cross-Domain Relational Fabric & Context Propagation

When an operator navigates across domains, operational context is strictly preserved without record duplication:

| Source Domain | Trigger Action | Downstream Domain | Propagated Context |
| :--- | :--- | :--- | :--- |
| **Predictive Risk** | *Verify in Field* | **Field Inspection** | `risk_id`, `mine_id`, `zone_id`, `contributing_signals`, `probability`, `timestamp` |
| **Inspection Finding** | *Report Issue* | **Safety Incident** | `inspection_id`, `risk_id`, `evidence_hashes`, `gps_coordinates`, `observed_severity` |
| **Incident / Finding** | *Create Remediation* | **Governance Task** | `incident_id`, `inspection_id`, `sla_deadline`, `assigned_role`, `evidence_hashes` |
| **Grievance** | *Investigate* | **Corrective Task / Incident** | `grievance_id`, `complainant_type`, `investigation_notes`, `zone_id` |
| **Contract Requirement** | *Record Issue* | **Contractor SLA Task** | `contract_id`, `requirement_id`, `penalty_clause`, `corrective_sla` |
| **Remediation Complete** | *Submit for Review* | **Supervisor Review** | `task_id`, `evidence_hashes`, `inspection_id`, `closure_notes` |
| **Supervisor Review** | *Digital Sign-Off* | **Shift Handover / Audit** | `approval_id`, `actor_role`, `cryptographic_sha256_hash`, `timestamp` |

---

## 5. Mobile UI & Field Command Experience

### 5.1 Mobile Home Command Center (`MobileHomeScreen.tsx`)
1. **Command Bar**: Active Mine name, Current Shift (`Shift A (06:00 - 14:00)`), Network Status (`ONLINE` / `OFFLINE`), and Cache Freshness indicator.
2. **Attention Queue**: High/Critical Predictive Risks, Unresolved Incidents, Overdue Tasks, Pending Reviews, Grievance Actions, and SLA Breaches with direct action triggers.
3. **My Work Queue**: Live assigned tasks, inspections, and verifications with status badges and SLA deadlines.
4. **Nearby Context**: Proximity cards highlighting hazards and sensor anomalies within immediate field radius.
5. **Quick Actions Grid**: Fast entry to *New Inspection*, *Field Reporting*, *Report Incident*, *Log Grievance*, *Contractor SLA*, and *Shift Handover*.
6. **Copilot Launcher**: Direct query interface for DGMS rules, gas limits, and SOPs.
7. **Trace & Relationship Explorer Modal**: Reusable modal embedding `UnifiedTimelineWidget` and `RelatedRecordsWidget`.

---

## 6. Security, Claims Discipline & Offline Resilience

### 6.1 Security & Multi-Tenant Isolation
- All endpoints enforce JWT authentication and role-based permissions (`canMobile` / `require_mine_access`).
- Cross-mine resource requests are strictly blocked with `403 Forbidden` / `404 Not Found`.
- Separation of Duties (SoD) prevents creators from approving their own remediation submissions.

### 6.2 Claims Discipline
- Predictive intelligence is explicitly labeled as **PREDICTIVE RISK SIGNAL** or **SIMULATED DEMO TELEMETRY (Holdout Model Evaluation)**.
- GPS coordinates are explicitly labeled as **ACTUAL GPS** or **SURVEYED BENCHMARK**.
- The system never claims "AI confirmed violation" or "Government approved" without human regulatory review.

### 6.3 Offline Mode (`trinetra_field_sync_queue`)
- Local operations are queued in offline storage with status `PENDING`.
- Visual badges display **OFFLINE (Local Queue Active)** and **CACHED CONTEXT**.
- Upon network restoration, items sync automatically and transition to **SERVER ACKNOWLEDGED**.

---

## 7. Verification & Test Coverage

### 7.1 Backend Test Results
- **Focused Suite (`test_mobile_field_command.py`)**: 7/7 passed (100%).
  1. `test_01_field_command_summary_aggregation`: Attention, My Work, Nearby, Shift aggregation.
  2. `test_02_unified_resource_timeline`: AuditEvent lifecycle chaining and SHA-256 metadata.
  3. `test_03_cross_domain_related_records`: Relational resolution across risks, tasks, and evidence.
  4. `test_04_cross_mine_access_isolation`: Cross-mine multi-tenant isolation verification.
  5. `test_05_role_aware_field_command`: Role differentiation across Inspector, Safety Officer, Manager.
  6. `test_06_e2e_primary_scenario_lifecycle`: Full end-to-end signal $\to$ verification $\to$ task $\to$ review lifecycle.
  7. `test_07_negative_control_prediction_without_incident`: Verification with no issue observed produces no automatic incident.
- **Full Backend Regression**: **306/306 passed (100%)**.

### 7.2 Frontend Build & Bundle Verification
- **TypeScript & Vite Build**: `tsc -b && vite build` succeeded with **0 errors**.
- **Bundle Breakdown**:
  - `dist/assets/index-JKJsxnYb.js`: 1,030.96 kB (gzip: 258.73 kB)
  - `dist/assets/DigitalTwinPage-CP9hZHUC.js`: 674.75 kB (gzip: 166.28 kB, lazy-loaded)
  - `dist/assets/GisMapPage-BCvrVNOp.js`: 53.21 kB (gzip: 10.49 kB, lazy-loaded)
  - `dist/assets/FieldOperationsPage-BawLRWJR.js`: 34.07 kB (gzip: 7.83 kB, lazy-loaded)

---

## 8. Demo Scenarios

### 8.1 Primary Scenario: End-to-End Governance Lifecycle
1. **Command View**: Operator sees Critical Predictive Risk (Methane Fluctuation 88% probability in Underground Shaft 3).
2. **Context**: Operator taps *Verify in Field*; inspection starts with inherited telemetry context.
3. **Observation & Evidence**: Operator records *Issue Found*, captures SHA-256 sealed photo evidence and GPS tag.
4. **Governance Task**: Remediation task generated for Ventilation Team with 4-hour SLA.
5. **Supervisor Review**: Safety Officer reviews linked evidence, checks audit timeline, and provides digital sign-off.
6. **Handover & Audit**: Shift Handover reflects completed resolution; cryptographic audit trail displays immutable proof.

### 8.2 Negative Control: Non-Escalating Field Verification
1. **Prediction**: Predictive model flags potential high risk due to minor sensor anomaly.
2. **Field Verification**: Inspector inspects the site and selects *No Issue Observed*.
3. **Result**: Status recorded as verified nominal; **no automatic safety incident or unwarranted escalation is created**.
