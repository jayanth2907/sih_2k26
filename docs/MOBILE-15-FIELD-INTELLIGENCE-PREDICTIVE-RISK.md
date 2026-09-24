# MOBILE-15: Field Intelligence & Predictive Risk Actions
## TRINETRA Smart Governance & Compliance Monitoring System for Coal Mines

---

### 1. Objective & Operational Purpose

MOBILE-15 bridges TRINETRA's server-side predictive intelligence, telemetry anomaly engines, and GIS spatial models to the frontline field operator. Rather than presenting a passive desktop analytics dashboard, MOBILE-15 converts predictive signals into an authoritative, actionable, and auditable field governance workflow:

$$\text{PREDICTIVE RISK} \longrightarrow \text{FIELD CONTEXT} \longrightarrow \text{CONTRIBUTING SIGNALS} \longrightarrow \text{FIELD VERIFICATION} \longrightarrow \text{OBSERVATION \& EVIDENCE} \longrightarrow \text{GOVERNANCE TASK / INCIDENT} \longrightarrow \text{SUPERVISOR REVIEW} \longrightarrow \text{AUDIT LEDGER}$$

Frontline officers can answer six core questions in seconds:
1. **What is the current risk near me?** (Mine, zone, severity, forward probability, and horizon).
2. **Why is TRINETRA flagging it?** (Factual contributing signals and directional trends: methane rise $\uparrow$, ventilation velocity drop $\downarrow$).
3. **What should I verify in the field?** (Specific zone, environmental sensors, or mechanical assets).
4. **What evidence exists or was captured?** (Field photos with SHA-256 cryptographic fingerprints, GPS accuracy, server timestamps).
5. **What action should I take?** (Record finding: `NO_ISSUE_OBSERVED`, `ISSUE_FOUND`, `REQUIRES_FURTHER_REVIEW`, and link to `GovernanceTask` or `Incident`).
6. **What happened after verification?** (Supervisor sign-off, SLA tracking, immutable audit chain).

---

### 2. Predictive Architecture & Model Reuse

#### 2.1 Backend Authority (No Client-Side ML)
- **Model Version**: `trinetra-risk-escalation-v1.0-histgbm` (Canonical `TRINETRA-HistGradientBoosting`).
- **Prediction Target**: 30-minute forward risk escalation horizon (`horizon_minutes = 30`).
- **Statistical Metric**: Holdout ROC-AUC $\approx 0.922$ (evaluated on simulated holdout validation data; strictly labeled as *Evaluation Metric*, never claimed as "real-time prediction accuracy").
- **Client Execution Rule**: The mobile frontend **never** runs ML models, calculates probabilities, or invents risk scores. The backend `PredictiveRiskService` is the sole source of truth.

#### 2.2 Telemetry Freshness & Missing-Stream Handling
- **`LIVE`**: Telemetry stream received within the active threshold ($\le 120\text{s}$) with full sensor availability.
- **`LAST_KNOWN_PREDICTION`**: Telemetry interrupted or sensor readings buffered; the UI prominently displays `LAST KNOWN PREDICTION` alongside the original server timestamp and data age.
- **`STALE`**: Telemetry exceeds freshness limits without new inferences.
- **`UNAVAILABLE`**: Insufficient streams to generate a valid inference according to the backend missing-data policy. Stale probabilities are never fabricated as current predictions.

---

### 3. API & Data Flow

#### 3.1 Endpoints
| HTTP Method | Endpoint | Description | RBAC Enforcement |
|---|---|---|---|
| `GET` | `/api/v1/mobile/intelligence/summary` | Real-time shift risk KPIs, 30m escalation score, active alert count, data freshness status | All authorized field roles |
| `GET` | `/api/v1/mobile/intelligence/risks` | List recent risk predictions with zone coords, contributing signals, and verification state | Mine-scoped |
| `GET` | `/api/v1/mobile/intelligence/risks/{id}` | Detailed risk profile, factor breakdown, upstream telemetry, and downstream audit links | Mine-scoped |
| `POST` | `/api/v1/mobile/intelligence/risks/{id}/verify` | Submit field verification outcome, photo evidence (SHA-256), GPS, and optional task/incident linkage | Field Inspectors, Safety Officers, Managers |

#### 3.2 Verification Payload Schema
```json
{
  "field_outcome": "ISSUE_FOUND",
  "field_notes": "Ventilation door 4B seal defective causing 18% air flow drop. Methane accumulating at roof seam.",
  "evidence_file_name": "roof_seam_vent_check.jpg",
  "evidence_file_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "evidence_url": "https://storage.trinetra.gov.in/evidence/m1/roof_seam_vent_check.jpg",
  "latitude": 23.7954,
  "longitude": 86.4308,
  "create_governance_task": true,
  "task_title": "Replace ventilation door 4B seal & verify airflow",
  "task_priority": "HIGH",
  "create_incident": false
}
```

---

### 4. Field Verification & Downstream Governance Linkages

#### 4.1 Factual Verification Outcomes
1. **`NO_ISSUE_OBSERVED`**: Field officer inspects the site and finds sensors operating normally with no physical hazards. Demonstrates that predictive risk is a decision-support signal, not proof of an incident.
2. **`ISSUE_FOUND`**: Physical hazard or non-compliance confirmed in the field. Enables one-click creation of `GovernanceTask` or `Incident`.
3. **`REQUIRES_FURTHER_REVIEW`**: Ambiguous condition requiring senior specialist inspection or DGMS instrumentation.

#### 4.2 Entity Reuse & Canonical Architecture
- **`GovernanceTask`**: Automatically tagged with `domain="SAFETY"`, unique `task_code`, supervisor assignment, SLA deadline, and appears in the canonical **My Work** mobile queue (`MOBILE-06`).
- **`Incident`**: Created only when explicitly requested by an authorized officer (`MINE_SAFETY_OFFICER`, `MINE_MANAGER`, `FIELD_INSPECTOR`) with full audit event linkage (`MOBILE-05`).
- **`FieldEvidence`**: Captures photo metadata, SHA-256 byte fingerprint, WGS-84 coordinates, and accuracy metadata (`MOBILE-03`).
- **`AuditEvent`**: Cryptographically logs `PREDICTIVE_RISK_VIEWED` and `PREDICTIVE_FIELD_OUTCOME_RECORDED` into the immutable audit ledger.

---

### 5. Offline Resiliency & Synchronization

- **Local Caching**: When offline, frontline workers can view cached risk context labeled as `LAST KNOWN PREDICTION` with data age indicators.
- **Unified Sync Queue**: Offline verifications are enqueued to `trinetra_field_sync_queue` under operation `VERIFY` and entity `PREDICTIVE_RISK`.
- **Idempotent Sync**: `FieldService.process_sync_batch` processes verification items idempotently, creating downstream tasks/incidents upon reconnection without duplicating records.

---

### 6. Claims Discipline & Legal Transparency

1. **Prediction $\ne$ Proof**: A 30-minute predictive risk escalation is an early-warning signal, never presented as legal proof of an incident or statutory violation.
2. **SHA-256 $\ne$ Physical Authentication**: Cryptographic hash fingerprints the transmitted byte stream; device GPS provides contextual location metadata.
3. **Simulated Data Transparency**: All demo feeds are explicitly badged as `SIMULATED DEMO TELEMETRY` and `SIMULATED 3D ENVIRONMENT`.

---

### 7. Multilingual Support
Full localization across English (`en`), Hindi (`hi`), and Telugu (`te`) for all risk intelligence KPIs, contributing signals, verification outcomes, and pipeline traces.
