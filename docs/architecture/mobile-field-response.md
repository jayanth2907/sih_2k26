# TRINETRA MOBILE-05: Field Intelligence + Incident Response Architecture

## 1. Executive Summary & Purpose

TRINETRA MOBILE-05 establishes the end-to-end field response engine for hazardous conditions, statutory violations, and operational incidents in mining environments. It connects the complete lifecycle chain:

$$\text{RISK} \longrightarrow \text{INCIDENT} \longrightarrow \text{FIELD RESPONSE} \longrightarrow \text{OBSERVATION} \longrightarrow \text{CORRECTIVE ACTION} \longrightarrow \text{EVIDENCE} \longrightarrow \text{VERIFICATION} \longrightarrow \text{AUDIT}$$

Key operational pillars:
1. **State Machine Governance**: Strict transition path (`OPEN` $\to$ `TRIAGED` $\to$ `IN_PROGRESS` $\to$ `RESOLVED` $\to$ `VERIFIED` $\to$ `CLOSED`).
2. **SLA Tracking**: Clear countdown indicators (`DUE IN Xh` or `OVERDUE BY Xh`) derived from statutory remediation windows.
3. **Evidence Integrity**: Direct client-side SHA-256 fingerprinting using Web Crypto API and GPS accuracy tiers.
4. **Separation of Duties**: Field inspectors cannot self-verify incident resolution; supervisory verification or justified rejection is enforced.
5. **Multi-tenant Isolation**: Strict tenant scoping preventing cross-mine visibility and unauthorized state transitions.
6. **Offline Sync & Idempotency**: Queued offline operations with UUID-based idempotency logs (`FieldSyncLog`).
7. **Multilingual Localization**: Complete trilingual support across English (`en`), Hindi (`hi`), and Telugu (`te`).

---

## 2. Component Hierarchy & Workflow

```
+----------------------------------------------------------------------------------------------------+
|                                    MOBILE INCIDENT RESPONSE HUD                                    |
|                                                                                                    |
|  +----------------------------------------------------------------------------------------------+  |
|  | [Header] Field Response | Mine Context | Active Filter ([ALL] / [OPEN] / [IN PROGRESS] / etc) |  |
|  +----------------------------------------------------------------------------------------------+  |
|  | [KPI Summary Cards]                                                                          |  |
|  |   - High / Critical Incidents  |  Overdue Actions  |  Pending Supervisor Verification        |  |
|  +----------------------------------------------------------------------------------------------+  |
|  | [Incident Selection / Detail View]                                                           |  |
|  |   - Severity Badge (CRITICAL, HIGH, MEDIUM, LOW) & Category                                   |  |
|  |   - SLA Status Pill (DUE IN Xh / OVERDUE BY Xh / SLA UNAVAILABLE)                             |  |
|  |   - Spatial Coordinates (Lat/Lon or Local Mine XYZ) + [ VIEW ON MAP ] Deep Link              |  |
|  |   - Dynamic State Actions:                                                                   |  |
|  |       * OPEN/TRIAGED/ASSIGNED -> [ START FIELD RESPONSE ]                                    |  |
|  |       * IN_PROGRESS           -> [ RECORD OBS ] [ CAPTURE PHOTO ] [ ADD ACTION ] [ RESOLVE ] |  |
|  |       * RESOLVED (Supervisor) -> [ VERIFY RESOLUTION ] [ REJECT RESPONSE (Reason required) ] |  |
|  |       * VERIFIED (Supervisor) -> [ CLOSE INCIDENT (Audit Seal) ]                             |  |
|  +----------------------------------------------------------------------------------------------+  |
|  | [Response Quality Checklist]                                                                 |  |
|  |   [x] Site Verified  [x] Evidence Attached  [x] Corrective Assigned  [x] Resolution Noted     |  |
|  +----------------------------------------------------------------------------------------------+  |
|  | [Attached Evidence Gallery]                                                                  |  |
|  |   - Thumbnail + SHA-256 Hash Digest (8-char prefix) + GPS Accuracy Badge                     |  |
|  +----------------------------------------------------------------------------------------------+  |
|  | [Corrective Actions Tracker]                                                                 |  |
|  |   - Action Item Description + Assignee + Target SLA Deadline                                 |  |
|  +----------------------------------------------------------------------------------------------+  |
|  | [Response Timeline / Audit Trail]                                                            |  |
|  |   - Chronological events with status transitions, user stamps, and supervisory notes         |  |
|  +----------------------------------------------------------------------------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Incident State Machine & Business Rules

```
                +-----------+
                |   OPEN    |
                +-----+-----+
                      |
                      v
                +-----------+
                |  TRIAGED  |
                +-----+-----+
                      |
                      v
             +-----------------+
             |   IN_PROGRESS   |<----------------+
             +--------+--------+                 |
                      |                          |
                      v                          | (Supervisor Rejection)
             +-----------------+                 |
             |    RESOLVED     |-----------------+
             +--------+--------+
                      |
                      v (Supervisor Verification)
             +-----------------+
             |    VERIFIED     |
             +--------+--------+
                      |
                      v
             +-----------------+
             |     CLOSED      | (Terminal State)
             +-----------------+
```

### Transition Validation Matrix

| From Status | Permitted Target Statuses | Required Roles | Special Conditions |
|---|---|---|---|
| `OPEN` | `TRIAGED`, `ASSIGNED`, `CLOSED` | `FIELD_INSPECTOR`, `MINE_SAFETY_OFFICER`, `MINE_MANAGER`, `SYSTEM_ADMIN` | Triage notes recorded |
| `TRIAGED` | `ASSIGNED`, `IN_PROGRESS`, `CLOSED` | `FIELD_INSPECTOR`, `MINE_SAFETY_OFFICER`, `MINE_MANAGER` | Dispatch details |
| `ASSIGNED` | `IN_PROGRESS`, `CLOSED` | Assigned Investigator or Supervisor | Crew deployed |
| `IN_PROGRESS` | `RESOLVED`, `ESCALATED` | Field Investigator, Safety Officer | Remediation notes and attached evidence |
| `RESOLVED` | `VERIFIED`, `IN_PROGRESS` | Supervisor / Safety Officer / Manager | If verified: verification timestamp logged. If rejected: justification mandatory. |
| `VERIFIED` | `CLOSED`, `IN_PROGRESS` | Mine Manager / System Admin | Archived to statutory audit ledger |
| `CLOSED` | *None* | *None* | Immutable record |

---

## 4. Evidence Integrity & Cryptographic Seal

1. **Client-Side SHA-256 Hashing**:
   $$\text{SHA-256}(\text{Raw File Bytes}) \longrightarrow 64\text{-character hex string}$$
   Computed in-memory via `crypto.subtle.digest('SHA-256', buffer)`.
2. **Location Provenance**:
   - High-accuracy GPS location attached (`latitude`, `longitude`, `gps_accuracy_meters`).
   - If offline/underground: fall back to surveyed mine reference coordinate with `location_source="SURVEYED_MINE"`.
3. **Audit Ledger Event**:
   - Every incident state transition, evidence attachment, and supervisor review writes an immutable `AuditEvent` entry in `audit_events` with previous/current hash chain.

---

## 5. Offline Operation & Synchronization Protocol

- **Local Storage Queue**: `localStorage['trinetra_field_sync_queue']` stores pending actions offline.
- **Batch Sync Endpoint**: `/api/v1/mobile/sync` accepts array of operations:
  ```json
  {
    "mine_id": 1,
    "device_id": "FIELD-M05-DEVICE",
    "operations": [
      {
        "operation_id": "UUID-V4-IDEMPOTENCY-KEY",
        "entity_type": "EVIDENCE",
        "entity_id": "EVID-2026-ABCD",
        "operation_type": "CREATE",
        "client_timestamp": "2026-09-21T15:40:00Z",
        "payload": { ... }
      }
    ]
  }
  ```
- **Server Idempotency**: Logged in `field_sync_logs` table. Replays return `ALREADY_PROCESSED` with 200 OK without duplication.

---

## 6. Claim Discipline & Statutory Compliance

- **Predictive Risk vs Operational Incident**: Predictive risk scores are investigative prioritization triggers, never automatic statutory incidents without physical or verified sensor anomalies.
- **DGMS CMR 2017 Format**: Quick observations and incident resolutions conform to Directorate General of Mines Safety compliance classifications.
- **No Continuous Location Tracking**: Location is polled on-demand during active capture or map views; background continuous tracking is not performed.
