# MOBILE-11: Field Workforce, Attendance & Shift Handover Architecture

## 1. Overview & System Purpose

The **TRINETRA Field Workforce, Attendance & Shift Handover (MOBILE-11)** subsystem extends the TRINETRA mobile field application with authoritative workforce governance, manual attendance recording, auditable muster roll corrections, and cross-shift operational continuity via shift handovers.

### Core Architecture Principles
1. **Reuse Canonical Governance Models**: Reuses existing `Worker`, `Shift`, `AttendanceRecord`, `Mine`, and `AuditEvent` models without creating duplicate schema abstractions.
2. **Explicit Provenance & Claims Discipline**:
   - Zero biometric identity claims.
   - Zero claims that GPS or mobile check-in proves physical worker presence.
   - All entries are formally categorized as **Manual Attendance Records** or **Device-Reported Context**.
3. **Data Privacy & Statutory Protection**: Redacts sensitive personal attributes (direct personal mobile numbers, bank accounts, Aadhaar identifiers) from mobile field payloads.
4. **Shift Continuity & Open-Item Aggregation**: Aggregates unresolved safety incidents, overdue tasks, pending statutory inspections, and active sensor alarms directly from backend data sources into shift handover records.
5. **Separation of Duties & Multi-Tenant Mine Isolation**: Strict role-based enforcement ensuring mine managers, safety officers, and field inspectors can only access and record data for their authorized mine.

---

## 2. Domain Models & Data Architecture

```
+-----------------------------------------------------------------------------------+
|                                TRINETRA CANONICAL CORE                           |
|                                                                                   |
|  +--------------------+         +--------------------+     +-------------------+  |
|  |       Worker       |         |       Shift        |     |       Mine        |  |
|  | - id               |         | - id               |     | - id              |  |
|  | - employee_code    |         | - name (A/B/C)     |     | - name            |  |
|  | - first_name       |         | - start_time       |     | - code            |  |
|  | - last_name        |         | - end_time         |     +-------------------+  |
|  | - designation      |         +--------------------+               ^            |
|  | - trade            |                   ^                          |            |
|  | - contractor_id    |                   |                          |            |
|  +--------------------+                   |                          |            |
|            ^                              |                          |            |
|            | 1:N                          | 1:N                      | 1:N        |
|  +--------------------+                   |                          |            |
|  |  AttendanceRecord  |-------------------+--------------------------+            |
|  | - id               |                                                           |
|  | - worker_id        |   Recorded By: Authorized Actor                           |
|  | - shift_id         |   Verification Mode: MANUAL                               |
|  | - date / check_in  |   Correction History: Notes & Audit Trail                 |
|  | - status           |                                                           |
|  | - metadata_json    |                                                           |
|  +--------------------+                                                           |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                               ShiftHandover                                 |  |
|  | - id: UUID / Integer                                                        |  |
|  | - handover_code: String ("SHO-YYYYMMDD-MINE-XXXX")                          |  |
|  | - mine_id: ForeignKey(Mine.id)                                              |  |
|  | - outgoing_shift_id / incoming_shift_id: ForeignKey(Shift.id)               |  |
|  | - outgoing_officer_id: ForeignKey(User.id)                                  |  |
|  | - incoming_officer_id: ForeignKey(User.id) [Nullable until ACK]             |  |
|  | - shift_date: Date                                                          |  |
|  | - status: Enum (DRAFT, SUBMITTED, ACKNOWLEDGED)                             |  |
|  | - open_items_json: Dict[str, Any] (Incidents, Tasks, Inspections, Alerts)   |  |
|  | - handover_notes: Text                                                      |  |
|  | - safety_notes: Text                                                        |  |
|  | - acknowledged_at: DateTime [Nullable]                                      |  |
|  | - audit_event_id: ForeignKey(AuditEvent.id)                                 |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 3. Workflow & Governance Chain

The field governance lifecycle flows through strict verification checkpoints:

$$\text{WORKER} \longrightarrow \text{ROSTER} \longrightarrow \text{SHIFT} \longrightarrow \text{ATTENDANCE} \longrightarrow \text{FIELD OPERATIONS} \longrightarrow \text{SHIFT HANDOVER} \longrightarrow \text{SUPERVISOR REVIEW} \longrightarrow \text{AUDIT}$$

### 3.1 Attendance Recording & Correction
- **Recording**: Authorized supervisors record `PRESENT`, `ABSENT`, `ON_LEAVE`, or `OFF_DUTY`. Records capture actor identity, operational shift context, timestamp, and optional device GPS metadata.
- **Correction**: Any correction to existing attendance entries requires an explicit, mandatory justification string. Corrections generate an immutable `AuditEvent` (`ACTION: ATTENDANCE_CORRECTED`) preserving the previous state, new state, reason, actor, and timestamp.

### 3.2 Shift Handover Lifecycle
1. **Drafting / Auto-Aggregation**: Outgoing shift officer initiates handover. The backend aggregates all currently active open items:
   - Open safety observations & incidents (`status != 'RESOLVED'`)
   - Overdue and assigned field governance tasks
   - Pending statutory inspections
   - Active sensor anomaly alerts
2. **Submission**: Outgoing officer inputs operational notes and safety briefings, generating a persistent `ShiftHandover` record in `SUBMITTED` status.
3. **Acknowledgment**: Incoming shift officer reviews the open items checklist and explicitly acknowledges the handover, advancing the state to `ACKNOWLEDGED` and recording an audit trail.

---

## 4. Offline Resilience & Sync Architecture

Workforce and handover operations integrate seamlessly with the canonical `trinetra_field_sync_queue` (MOBILE-08):

| Action | Offline Behavior | Sync Operation | Validation on Server |
| :--- | :--- | :--- | :--- |
| **Record Attendance** | Stored in IndexedDB / localStorage queue as `ATTENDANCE` payload. Displayed as *Saved locally — server acknowledgment pending*. | `FieldService.process_sync_batch` | Idempotent upsert via `(worker_id, shift_id, date)`. Actor set to authenticated sync user. |
| **Shift Handover** | Drafted and stored locally in sync queue as `HANDOVER` payload. Displayed as *Draft / Queued for sync*. | `FieldService.process_sync_batch` | Auto-assigns handover code, validates mine access, generates `HANDOVER_CREATED` audit event. |

---

## 5. Privacy, Security & RBAC

### Data Redaction Rules
- Personal identity data including Aadhaar numbers, PAN, bank account numbers, and personal contact telephone numbers are filtered out of all mobile workforce payloads.
- Payloads expose only statutory identifiers: Worker ID, Full Name, Designation, Trade, Employer/Contractor, and Safety Certification Status.

### RBAC Matrix
| Role | View Roster | Record Attendance | Correct Attendance | Create Handover | Acknowledge Handover |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **SYSTEM_ADMIN** | Yes (All Mines) | Yes | Yes | Yes | Yes |
| **MINE_MANAGER** | Yes (Assigned Mine) | Yes | Yes | Yes | Yes |
| **MINE_SAFETY_OFFICER**| Yes (Assigned Mine) | Yes | Yes | Yes | Yes |
| **FIELD_INSPECTOR** | Yes (Current Shift) | Yes (Current Shift)| Yes (With Reason) | Yes (Current Shift) | Yes (Current Shift) |
| **REGULATOR / DGMS** | Read-Only | No | No | Read-Only | No |

---

## 6. Auditability & Cryptographic Integrity

Every lifecycle transition emits an immutable `AuditEvent`:
- `ATTENDANCE_RECORDED`: Records worker ID, shift ID, date, status, actor, and location metadata.
- `ATTENDANCE_CORRECTED`: Records original status, corrected status, mandatory justification reason, actor, and timestamp.
- `HANDOVER_CREATED`: Records handover code, outgoing officer, incoming shift, and open item reference snapshot.
- `HANDOVER_ACKNOWLEDGED`: Records handover ID, incoming officer, acknowledgment timestamp, and mine ID.
