# TRINETRA Mobile Architecture: Offline Resilience & Sync Center (MOBILE-08)

## 1. Overview & Trust Philosophy

The **TRINETRA Mobile Sync Center & Offline Resilience Layer** is designed for high-consequence mining environments where network connectivity in underground workings, open-pit inclines, and remote leaseholds is intermittent or unavailable.

$$\text{LOCAL} \longrightarrow \text{QUEUED} \longrightarrow \text{SYNCING} \longrightarrow \text{SERVER ACK} \longrightarrow \text{AUDIT}$$

### Core Tenets
1. **Server-Authoritative Truth**: Local records are strictly marked `"Saved locally"` or `"Queued for sync"`. Never claim an item is `"Submitted"` or `"Synced"` without cryptographic backend confirmation.
2. **Idempotency by Construction**: Every client write generates a unique UUID `operation_id`. Retrying or re-submitting an operation is safe and yields `ALREADY_PROCESSED` without duplicating business records.
3. **Dependency-Aware Ordering**: Chained operations (e.g. parent inspection created offline $\to$ evidence photos attached) resolve temporary client identifiers to newly allocated server IDs in-batch.
4. **Transparent Conflict Surfacing**: Server state changes are not silently overwritten. Conflicted records trigger human review modal with side-by-side local vs server diffs.
5. **Permanent Data Protection**: Un-synchronized local records are never automatically purged or pruned.

---

## 2. Synchronization Architecture & Lifecycle

```mermaid
flowchart TD
    subgraph Client Device [TRINETRA FIELD Mobile Shell]
        UserAction[Field Inspection / Task / Incident / Evidence]
        UserAction --> NetCheck{Device Online & Server Reachable?}
        NetCheck -->|No / Offline| LocalStore[Local Storage Queue (trinetra_field_sync_queue)]
        LocalStore --> StateLocal[Status: SAVED LOCALLY / QUEUED]
        
        NetCheck -->|Yes / Reconnected| SyncDispatch[Sync Center Batch Dispatcher]
        StateLocal -->|Trigger Sync / Auto-Reconnect| SyncDispatch
    end

    subgraph Batch Transmission
        SyncDispatch --> InFlight[Status: SYNCING]
        InFlight --> PostBatch[POST /api/v1/mobile/sync]
    end

    subgraph Server Engine [FastAPI & PostgreSQL / SQLite]
        PostBatch --> AuthzCheck[RBAC & Mine Isolation Auth Check]
        AuthzCheck --> IdempotencyCheck{FieldSyncLog: Operation ID exists?}
        IdempotencyCheck -->|Yes| AckDuplicate[Return: ALREADY_PROCESSED]
        IdempotencyCheck -->|No| DepResolver[Resolve In-Batch Parent IDs]
        DepResolver --> EntityDispatcher[Entity Dispatcher: Inspection / Task / Evidence / Incident]
        EntityDispatcher -->|Success| SaveEntity[Persist Core Entity]
        SaveEntity --> WriteSyncLog[Write FieldSyncLog (ACCEPTED)]
        WriteSyncLog --> WriteAudit[Log SHA-256 AuditEvent]
        EntityDispatcher -->|Conflict / Validation Failure| LogFailure[Write FieldSyncLog (CONFLICT / REJECTED)]
    end

    subgraph Client Acknowledgment
        WriteAudit --> ServerResponse[SyncBatchResponse]
        LogFailure --> ServerResponse
        AckDuplicate --> ServerResponse
        ServerResponse --> StateAck[Status: SERVER ACKNOWLEDGED / FAILED / CONFLICT]
    end
```

---

## 3. Canonical Sync Operation Schema

```typescript
export interface QueuedSyncOperation {
  operation_id: string; // Idempotency UUID
  entity_type: 'INSPECTION' | 'OBSERVATION' | 'INCIDENT' | 'EVIDENCE' | 'TASK' | 'CORRECTIVE_ACTION';
  entity_id?: string; // Client temporary or existing server identifier
  server_id?: number; // Allocated integer server ID after acknowledgment
  operation_type: 'CREATE' | 'UPDATE' | 'TRANSITION';
  payload: Record<string, any>;
  client_timestamp: string; // ISO 8601 UTC timestamp
  sync_status: 'LOCAL' | 'QUEUED' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
  retry_count: number;
  last_attempt_timestamp?: string;
  last_error?: string; // Sanitized human-readable error description
  dependency_id?: string; // Parent operation identifier
  mine_id?: number;
  conflict_data?: {
    local_state?: any;
    server_state?: any;
    reason?: string;
  };
}
```

---

## 4. Conflict & Error Handling Protocol

| Condition | Categorization | Behavior |
|:---|:---|:---|
| **State Machine Violation** (e.g. Task transition `OPEN` $\to$ `CLOSED` without resolution notes) | `CONFLICT` / `REJECTED` | Server rejects with descriptive error; client preserves local state, prompts human review modal. |
| **Network Timeout in Flight** | `FAILED (SAFE_TO_RETRY)` | Client marks `FAILED`, keeps in queue. Subsequent retry uses identical `operation_id` (idempotent). |
| **Duplicate Submission** | `ALREADY_PROCESSED` | Server detects existing `FieldSyncLog`, returns original `server_id` without creating duplicates; client marks `SYNCED`. |
| **Cross-Mine Access Breach** | `PERMISSION_DENIED` | HTTP 403 returned; operation rejected with audit log of unauthorized attempt. |

---

## 5. Cache Stale Semantics

- **GIS Spatial Data**:
  - Exposes last updated timestamp.
  - While offline, prominently displays label: `May be stale while offline`.
  - Never mutates source-derived real-mine geometry.
- **Field Notifications & Alerts**:
  - Displays cached notifications with last-fetched timestamp.
  - Stale resource detector flags notifications whose underlying incident/task was resolved on server.
