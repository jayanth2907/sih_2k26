# TRINETRA — Analytics Metric Definitions Catalog

This document defines every analytical metric computed across the 10 TRINETRA governance domains.

---

## 1. Executive Governance Overview Domain

### 1.1 Total Incidents
- **Formula**: `COUNT(Incident.id WHERE Incident.mine_id = mine_id AND Incident.created_at BETWEEN start AND end)`
- **Unit**: Count (`int`)
- **Time Semantics**: Aggregate over specified time range.
- **Source Table**: `incidents`
- **Data Mode**: `OPERATIONAL` / `SIMULATED`

### 1.2 Open Incidents
- **Formula**: `COUNT(Incident.id WHERE Incident.mine_id = mine_id AND Incident.status NOT IN ('CLOSED', 'RESOLVED'))`
- **Unit**: Count (`int`)
- **Time Semantics**: Current active snapshot within the window.
- **Source Table**: `incidents`
- **Data Mode**: `OPERATIONAL` / `SIMULATED`

### 1.3 Critical Incidents
- **Formula**: `COUNT(Incident.id WHERE Incident.mine_id = mine_id AND Incident.severity = 'CRITICAL' AND Incident.created_at BETWEEN start AND end)`
- **Unit**: Count (`int`)
- **Time Semantics**: Aggregate over specified time range.
- **Source Table**: `incidents`
- **Data Mode**: `OPERATIONAL` / `SIMULATED`

### 1.4 Active Alerts
- **Formula**: `COUNT(Alert.id WHERE Alert.mine_id = mine_id AND Alert.status IN ('ACTIVE', 'TRIGGERED', 'OPEN') AND Alert.created_at BETWEEN start AND end)`
- **Unit**: Count (`int`)
- **Time Semantics**: Active alert snapshot within the window.
- **Source Table**: `alerts`
- **Data Mode**: `OPERATIONAL` / `SIMULATED`

### 1.5 Open Violations
- **Formula**: `COUNT(Violation.id WHERE Violation.mine_id = mine_id AND Violation.status NOT IN ('CLOSED', 'RECTIFIED', 'VERIFIED'))`
- **Unit**: Count (`int`)
- **Time Semantics**: Active compliance snapshot.
- **Source Table**: `violations`
- **Data Mode**: `OPERATIONAL`

### 1.6 Overdue Corrective Actions
- **Formula**: `COUNT(CorrectiveAction.id JOIN Violation WHERE Violation.mine_id = mine_id AND CorrectiveAction.target_completion_date < NOW AND CorrectiveAction.status NOT IN ('COMPLETED', 'VERIFIED'))`
- **Unit**: Count (`int`)
- **Time Semantics**: Time-boundary checked against UTC now.
- **Source Table**: `corrective_actions`, `violations`
- **Data Mode**: `OPERATIONAL`

### 1.7 SLA Breaches
- **Formula**: `COUNT(GovernanceTask WHERE sla_status = 'BREACHED' OR (due_at < NOW AND status NOT IN ('RESOLVED', 'CLOSED'))) + COUNT(Incident WHERE sla_due_at < NOW AND status NOT IN ('RESOLVED', 'CLOSED'))`
- **Unit**: Count (`int`)
- **Time Semantics**: Live snapshot of breached commitments.
- **Source Table**: `governance_tasks`, `incidents`
- **Data Mode**: `OPERATIONAL`

### 1.8 Environmental Deviations
- **Formula**: `COUNT(EnvironmentalObservation WHERE mine_id = mine_id AND observed_value > threshold_limit AND detected_at BETWEEN start AND end)`
- **Unit**: Count (`int`)
- **Time Semantics**: Aggregate over specified time range.
- **Source Table**: `environmental_observations`
- **Data Mode**: `OPERATIONAL` / `SIMULATED`

---

## 2. Safety Analytics Domain

### 2.1 Average Incident Resolution Time
- **Formula**: `AVG(EXTRACT(EPOCH FROM (Incident.resolved_at - Incident.created_at)) / 3600.0)`
- **Unit**: Hours (`float`)
- **Time Semantics**: Computed over incidents resolved in the window.
- **Missing Data Behavior**: Returns `null` if no resolved incidents exist.
- **Source Table**: `incidents`

### 2.2 Recurring Hazards
- **Formula**: Categories in `Incident.category` having `COUNT(id) > 1` within the analytical window.
- **Unit**: Grouped breakdown
- **Source Table**: `incidents`

---

## 3. Compliance Analytics Domain

### 3.1 SLA Compliance Rate
- **Formula**: `(COUNT(CorrectiveAction completed on or before target_completion_date) / COUNT(Total CorrectiveActions)) * 100.0`
- **Unit**: Percentage (`%`)
- **Missing Data Behavior**: Returns `100.0%` if no corrective actions exist.
- **Source Table**: `corrective_actions`

---

## 4. Production Analytics Domain

### 4.1 Production Variance
- **Formula**: `SUM(ProductionReport.actual_quantity) - SUM(ProductionReport.planned_quantity)`
- **Unit**: Tonnes / BCM (`float`)
- **Source Table**: `production_reports`

### 4.2 Production Variance Percentage
- **Formula**: `((actual_quantity - planned_quantity) / planned_quantity) * 100.0`
- **Unit**: Percentage (`%`)
- **Missing Data Behavior**: Returns `0.0%` if planned quantity is 0.
- **Source Table**: `production_reports`

---

## 5. Workforce Analytics Domain

### 5.1 Shift Attendance Rate
- **Formula**: `(COUNT(AttendanceRecord WHERE status = 'PRESENT') / COUNT(Total AttendanceRecords)) * 100.0`
- **Unit**: Percentage (`%`)
- **Missing Data Behavior**: Returns `0.0%` if no attendance records exist.
- **Source Table**: `attendance_records`

---

## 6. Environmental Analytics Domain

### 6.1 Parameter Status
- **Formula**:
  - `NO_DATA`: If `COUNT(EnvironmentalObservation WHERE parameter_name = P) == 0`
  - `DEVIATION`: If latest observation `observed_value > threshold_limit`
  - `NORMAL`: If latest observation `observed_value <= threshold_limit`
- **Missing Data Behavior**: Parameter value is `null`, status is explicitly set to `NO_DATA` (never falsified to 0.0).
- **Source Table**: `environmental_observations`, `environmental_rules`

---

## 7. Predictive Risk Domain

### 7.1 Inferred Risk Score
- **Formula**: Output of Phase 5 Gradient Boosted Model (`RiskPrediction.predicted_risk_score`).
- **Unit**: Scale 0 to 100 (`float`)
- **Horizon**: 30 minutes (`horizon_minutes = 30`)
- **Source Table**: `risk_predictions`
- **Data Mode**: `MODEL`
