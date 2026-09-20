# TRINETRA — Phase 12C-1: Analytics Data Foundation Architecture

## 1. Executive Summary
The **Analytics Data Foundation** establishes a production-grade, derived, read-only aggregation layer for TRINETRA. It bridges the operational transactional layer (telemetry, incidents, violations, production logs, attendance, environmental observations, contractor registries, field operations, and predictive models) and the future Graphical Analytics & Governance Intelligence Center.

```
OPERATIONAL TRANSACTIONAL LAYER
(Incidents, Violations, Corrective Actions, Shifts, Production, Sensors, Field Ops, PGRM, Predictive Models)
                                    │
                                    ▼  (Read-Only Aggregation Queries)
                 ANALYTICS QUERY & AGGREGATION SERVICES
               (backend/app/services/analytics/*.py)
               ├── GovernanceAnalyticsService
               ├── SafetyAnalyticsService
               ├── ComplianceAnalyticsService
               ├── ProductionAnalyticsService
               ├── WorkforceAnalyticsService
               ├── EnvironmentalAnalyticsService
               ├── ContractorAnalyticsService
               ├── GrievanceAnalyticsService
               ├── FieldOperationsAnalyticsService
               ├── PredictiveRiskAnalyticsService
               └── CrossMineAnalyticsService
                                    │
                                    ▼  (Normalized DTOs)
                       ANALYTICS REST API ROUTER
                   (backend/app/api/v1/analytics.py)
                                    │
                                    ▼
       FUTURE GRAPHICAL ANALYTICS & GOVERNANCE INTELLIGENCE CENTER
```

---

## 2. Core Architectural Principles

1. **Derived, Read-Only Aggregation**:
   - Zero duplicate operational tables.
   - Every metric is computed dynamically from primary operational tables.
   - All analytics GET endpoints are 100% side-effect-free (no database mutations).
2. **Server-Side Mine Isolation & RBAC**:
   - Every endpoint verifies JWT tokens and checks user-mine permissions via `check_mine_access(current_user, mine_id, db)`.
   - Regulators and System Admins have cross-mine visibility; Mine Managers are strictly confined to their assigned mines (unauthorized access returns HTTP 403 Forbidden).
3. **Time-Range Abstraction**:
   - Standardized time range resolution across `TODAY`, `LAST_7_DAYS`, `LAST_30_DAYS`, `LAST_90_DAYS`, `THIS_MONTH`, `THIS_QUARTER`, and `CUSTOM`.
   - UTC-aware timezone handling prevents offset-naive vs offset-aware comparison errors.
   - Reusable `TimeRangeHelper.calculate_trend` safely computes period-over-period deltas and guards against division-by-zero on 0-baseline metrics.
4. **Data Quality & Provenance-Aware Trust**:
   - Explicit separation of data modes: `OPERATIONAL`, `SIMULATED`, `MODEL`, `SOURCE_DERIVED`, and `APPROXIMATE`.
   - Missing data is represented as `NO_DATA` / `null` rather than falsifying zeroes (critical for environmental telemetry).
5. **Drill-Down & Spatial Linkage**:
   - Every aggregated breakdown includes `entity_type` and `entity_ids` allowing the future UI to trigger targeted detail lookups.
   - Drilldown entities include geographic coordinates (`latitude`, `longitude`), `digital_twin_id`, and `gis_context` for direct 2D GIS and 3D Digital Twin cross-navigation.

---

## 3. The 10 Analytics Domains

| Domain | Service Class | Operational Source Tables | Key Analytics Provided |
| :--- | :--- | :--- | :--- |
| **Executive Governance** | `GovernanceAnalyticsService` | All domain tables + SLAs | High-level executive KPI board with period-over-period trend deltas |
| **Safety** | `SafetyAnalyticsService` | `Incident`, `Alert`, `AnomalyEvent` | Incidents by severity/category, time-series, resolution hours, recurring hazards |
| **Compliance** | `ComplianceAnalyticsService` | `Violation`, `CorrectiveAction`, `Escalation` | Statutory violations, SLA compliance rate, violation-action-escalation chain |
| **Production** | `ProductionAnalyticsService` | `ProductionReport` | Planned vs actual volume (Tonnes/BCM), variance percentage, shift/material breakdowns |
| **Workforce** | `WorkforceAnalyticsService` | `Worker`, `AttendanceRecord`, `Shift` | Total workers, contractual vs regular ratio, trade breakdown, shift attendance rate |
| **Environment** | `EnvironmentalAnalyticsService` | `EnvironmentalObservation`, `EnvironmentalRule` | Monitored parameters (PM10, PM2.5, Noise, Water pH), threshold deviations, `NO_DATA` tracking |
| **Contractors** | `ContractorAnalyticsService` | `Contractor`, `Contract`, `ContractRequirement` | Active vendors, expiring contracts (30d), statutory filing deviations |
| **Grievances** | `GrievanceAnalyticsService` | `Grievance` | PGRM grievance categories, priorities, status disposal, average resolution days |
| **Field Operations** | `FieldOperationsAnalyticsService` | `FieldInspection`, `FieldEvidence`, `FieldSyncLog` | Scheduled/completed audits, encrypted evidence proofs, mobile sync reliability |
| **Predictive Risk** | `PredictiveRiskAnalyticsService` | `RiskPrediction` (Phase 5 Model) | Inferred risk scores, escalation probability, 30m horizon, top contributing features |

---

## 4. Cross-Mine Benchmarking
- **Service**: `CrossMineAnalyticsService` (`GET /api/v1/analytics/cross-mine`)
- **Philosophy**: Pure descriptive comparative benchmarking without subjective rankings ("best/worst/winner/loser").
- **Authorization**: Regulators and System Admins receive all mines; Mine Managers only receive comparative metrics for their assigned properties.

---

## 5. Database Indexing & Performance
Targeted composite indexes optimize common analytical query patterns without adding speculative overhead:
- `idx_risk_pred_mine_time`: `(RiskPrediction.mine_id, RiskPrediction.prediction_timestamp)`
- `idx_anomalies_mine_status`: `(AnomalyEvent.mine_id, AnomalyEvent.status)`
- `production_reports.report_date` & `production_reports.mine_id`
- `attendance_records.attendance_date` & `attendance_records.mine_id`
- `environmental_observations.detected_at` & `environmental_observations.mine_id`
