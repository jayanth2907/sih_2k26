from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from app.models.mine import Mine
from app.models.incident import Incident
from app.models.alert import Alert
from app.models.violation import Violation, CorrectiveAction
from app.models.environmental import EnvironmentalObservation
from app.models.grievance import Grievance
from app.models.contractor import Contract
from app.models.governance_task import GovernanceTask
from app.models.field_operation import FieldInspection
from app.models.risk_prediction import RiskPrediction
from app.models.production import ProductionReport

from app.schemas.analytics import (
    TimeRangeEnum,
    TimeRangeDTO,
    DataQualityDTO,
    GovernanceOverviewAnalyticsDTO,
)
from app.services.analytics.time_utils import TimeRangeHelper


class GovernanceAnalyticsService:
    @staticmethod
    def get_overview(
        mine_id: int,
        db: Session,
        range_type: TimeRangeEnum = TimeRangeEnum.LAST_30_DAYS,
        custom_start: Optional[datetime] = None,
        custom_end: Optional[datetime] = None,
    ) -> GovernanceOverviewAnalyticsDTO:
        mine = db.query(Mine).filter(Mine.id == mine_id).first()
        mine_name = mine.name if mine else f"Mine {mine_id}"
        is_sim = mine.is_simulated if mine else "NO"
        data_mode = "SIMULATED" if is_sim == "YES" else "OPERATIONAL"

        now = datetime.now(timezone.utc)
        tr: TimeRangeDTO = TimeRangeHelper.resolve_time_range(range_type, custom_start, custom_end, as_of=now)

        # Helper to query count for a window
        def count_incidents(start_dt, end_dt, extra_filter=None):
            q = db.query(func.count(Incident.id)).filter(
                Incident.mine_id == mine_id,
                Incident.created_at >= start_dt,
                Incident.created_at <= end_dt
            )
            if extra_filter is not None:
                q = q.filter(extra_filter)
            return q.scalar() or 0

        # Incidents
        curr_total_inc = count_incidents(tr.start_time, tr.end_time)
        prev_total_inc = count_incidents(tr.prev_start_time, tr.prev_end_time) if tr.prev_start_time else None
        total_inc_metric = TimeRangeHelper.calculate_trend(curr_total_inc, prev_total_inc, data_mode=data_mode)

        curr_open_inc = count_incidents(tr.start_time, tr.end_time, ~Incident.status.in_(["CLOSED", "RESOLVED"]))
        prev_open_inc = count_incidents(tr.prev_start_time, tr.prev_end_time, ~Incident.status.in_(["CLOSED", "RESOLVED"])) if tr.prev_start_time else None
        open_inc_metric = TimeRangeHelper.calculate_trend(curr_open_inc, prev_open_inc, data_mode=data_mode)

        curr_crit_inc = count_incidents(tr.start_time, tr.end_time, Incident.severity == "CRITICAL")
        prev_crit_inc = count_incidents(tr.prev_start_time, tr.prev_end_time, Incident.severity == "CRITICAL") if tr.prev_start_time else None
        crit_inc_metric = TimeRangeHelper.calculate_trend(curr_crit_inc, prev_crit_inc, data_mode=data_mode)

        # Alerts
        def count_alerts(start_dt, end_dt):
            return db.query(func.count(Alert.id)).filter(
                Alert.mine_id == mine_id,
                Alert.status.in_(["ACTIVE", "TRIGGERED", "OPEN"]),
                Alert.created_at >= start_dt,
                Alert.created_at <= end_dt
            ).scalar() or 0

        curr_alerts = count_alerts(tr.start_time, tr.end_time)
        prev_alerts = count_alerts(tr.prev_start_time, tr.prev_end_time) if tr.prev_start_time else None
        alerts_metric = TimeRangeHelper.calculate_trend(curr_alerts, prev_alerts, data_mode=data_mode)

        # Violations
        def count_violations(start_dt, end_dt, extra_filter=None):
            q = db.query(func.count(Violation.id)).filter(
                Violation.mine_id == mine_id,
                Violation.created_at >= start_dt,
                Violation.created_at <= end_dt
            )
            if extra_filter is not None:
                q = q.filter(extra_filter)
            return q.scalar() or 0

        curr_open_vio = count_violations(tr.start_time, tr.end_time, ~Violation.status.in_(["CLOSED", "RECTIFIED", "VERIFIED"]))
        prev_open_vio = count_violations(tr.prev_start_time, tr.prev_end_time, ~Violation.status.in_(["CLOSED", "RECTIFIED", "VERIFIED"])) if tr.prev_start_time else None
        open_vio_metric = TimeRangeHelper.calculate_trend(curr_open_vio, prev_open_vio, data_mode=data_mode)

        # Overdue Corrective Actions
        def count_overdue_ca(start_dt, end_dt):
            return db.query(func.count(CorrectiveAction.id)).join(Violation).filter(
                Violation.mine_id == mine_id,
                CorrectiveAction.created_at >= start_dt,
                CorrectiveAction.created_at <= end_dt,
                CorrectiveAction.target_completion_date < now,
                ~CorrectiveAction.status.in_(["COMPLETED", "VERIFIED"])
            ).scalar() or 0

        curr_overdue_ca = count_overdue_ca(tr.start_time, tr.end_time)
        prev_overdue_ca = count_overdue_ca(tr.prev_start_time, tr.prev_end_time) if tr.prev_start_time else None
        overdue_ca_metric = TimeRangeHelper.calculate_trend(curr_overdue_ca, prev_overdue_ca, data_mode=data_mode)

        # SLA Breaches (from GovernanceTask and Incident SLAs)
        def count_sla_breaches(start_dt, end_dt):
            task_breaches = db.query(func.count(GovernanceTask.id)).filter(
                GovernanceTask.mine_id == mine_id,
                GovernanceTask.created_at >= start_dt,
                GovernanceTask.created_at <= end_dt,
                or_(
                    GovernanceTask.sla_status == "BREACHED",
                    and_(GovernanceTask.due_at < now, ~GovernanceTask.status.in_(["RESOLVED", "VERIFIED", "CLOSED"]))
                )
            ).scalar() or 0

            inc_breaches = db.query(func.count(Incident.id)).filter(
                Incident.mine_id == mine_id,
                Incident.created_at >= start_dt,
                Incident.created_at <= end_dt,
                Incident.sla_due_at < now,
                ~Incident.status.in_(["RESOLVED", "VERIFIED", "CLOSED"])
            ).scalar() or 0

            return task_breaches + inc_breaches

        curr_sla = count_sla_breaches(tr.start_time, tr.end_time)
        prev_sla = count_sla_breaches(tr.prev_start_time, tr.prev_end_time) if tr.prev_start_time else None
        sla_metric = TimeRangeHelper.calculate_trend(curr_sla, prev_sla, data_mode=data_mode)

        # Pending Field Inspections
        def count_inspections(start_dt, end_dt, pending_only=True):
            q = db.query(func.count(FieldInspection.id)).filter(
                FieldInspection.mine_id == mine_id,
                FieldInspection.scheduled_date >= start_dt,
                FieldInspection.scheduled_date <= end_dt
            )
            if pending_only:
                q = q.filter(FieldInspection.status.in_(["SCHEDULED", "IN_PROGRESS"]))
            return q.scalar() or 0

        curr_pending_insp = count_inspections(tr.start_time, tr.end_time, pending_only=True)
        prev_pending_insp = count_inspections(tr.prev_start_time, tr.prev_end_time, pending_only=True) if tr.prev_start_time else None
        pending_insp_metric = TimeRangeHelper.calculate_trend(curr_pending_insp, prev_pending_insp, data_mode=data_mode)

        # Open Governance Tasks
        def count_gov_tasks(start_dt, end_dt):
            return db.query(func.count(GovernanceTask.id)).filter(
                GovernanceTask.mine_id == mine_id,
                GovernanceTask.created_at >= start_dt,
                GovernanceTask.created_at <= end_dt,
                ~GovernanceTask.status.in_(["RESOLVED", "VERIFIED", "CLOSED"])
            ).scalar() or 0

        curr_gov_tasks = count_gov_tasks(tr.start_time, tr.end_time)
        prev_gov_tasks = count_gov_tasks(tr.prev_start_time, tr.prev_end_time) if tr.prev_start_time else None
        gov_tasks_metric = TimeRangeHelper.calculate_trend(curr_gov_tasks, prev_gov_tasks, data_mode=data_mode)

        # Environmental Deviations
        def count_env_deviations(start_dt, end_dt):
            return db.query(func.count(EnvironmentalObservation.id)).filter(
                EnvironmentalObservation.mine_id == mine_id,
                EnvironmentalObservation.detected_at >= start_dt,
                EnvironmentalObservation.detected_at <= end_dt,
                EnvironmentalObservation.observed_value > EnvironmentalObservation.threshold_limit
            ).scalar() or 0

        curr_env_dev = count_env_deviations(tr.start_time, tr.end_time)
        prev_env_dev = count_env_deviations(tr.prev_start_time, tr.prev_end_time) if tr.prev_start_time else None
        env_dev_metric = TimeRangeHelper.calculate_trend(curr_env_dev, prev_env_dev, data_mode=data_mode)

        # Open Grievances
        def count_grievances(start_dt, end_dt):
            return db.query(func.count(Grievance.id)).filter(
                Grievance.mine_id == mine_id,
                Grievance.created_at >= start_dt,
                Grievance.created_at <= end_dt,
                ~Grievance.status.in_(["RESOLVED", "VERIFIED", "CLOSED"])
            ).scalar() or 0

        curr_grievances = count_grievances(tr.start_time, tr.end_time)
        prev_grievances = count_grievances(tr.prev_start_time, tr.prev_end_time) if tr.prev_start_time else None
        grievances_metric = TimeRangeHelper.calculate_trend(curr_grievances, prev_grievances, data_mode=data_mode)

        # Active Contractor Issues (non-compliant or expired contracts)
        def count_contractor_issues(start_dt, end_dt):
            return db.query(func.count(Contract.id)).filter(
                Contract.mine_id == mine_id,
                or_(
                    Contract.compliance_status != "COMPLIANT",
                    Contract.status.in_(["EXPIRED", "EXPIRING", "SUSPENDED"])
                )
            ).scalar() or 0

        curr_cont = count_contractor_issues(tr.start_time, tr.end_time)
        prev_cont = count_contractor_issues(tr.prev_start_time, tr.prev_end_time) if tr.prev_start_time else None
        cont_metric = TimeRangeHelper.calculate_trend(curr_cont, prev_cont, data_mode=data_mode)

        # Predictive Hotspots
        def count_hotspots(start_dt, end_dt):
            return db.query(func.count(RiskPrediction.id)).filter(
                RiskPrediction.mine_id == mine_id,
                RiskPrediction.prediction_timestamp >= start_dt,
                RiskPrediction.prediction_timestamp <= end_dt,
                RiskPrediction.predicted_severity.in_(["HIGH", "CRITICAL"])
            ).scalar() or 0

        curr_hotspots = count_hotspots(tr.start_time, tr.end_time)
        prev_hotspots = count_hotspots(tr.prev_start_time, tr.prev_end_time) if tr.prev_start_time else None
        hotspots_metric = TimeRangeHelper.calculate_trend(curr_hotspots, prev_hotspots, data_mode="MODEL")

        # 11. Dynamic "What Changed" Narrative Generation
        what_changed = []

        # Check critical risk escalation
        crit_preds = db.query(RiskPrediction).filter(
            RiskPrediction.mine_id == mine_id,
            RiskPrediction.prediction_timestamp >= tr.start_time,
            RiskPrediction.prediction_timestamp <= tr.end_time,
            RiskPrediction.predicted_severity == "CRITICAL"
        ).count()
        if crit_preds > 0:
            what_changed.append({
                "id": "wc-risk-crit",
                "domain": "PREDICTIVE_RISK",
                "category": "PREDICTIVE_RISK",
                "title": "Predictive Risk Spike Detected",
                "description": f"{crit_preds} critical predictive risk escalation inferences recorded in the selected analytical window.",
                "detail": f"{crit_preds} critical predictive risk escalation inferences recorded in the selected analytical window.",
                "severity": "CRITICAL",
                "timestamp": tr.end_time.isoformat()
            })
        elif curr_hotspots > 0:
            what_changed.append({
                "id": "wc-risk-high",
                "domain": "PREDICTIVE_RISK",
                "category": "PREDICTIVE_RISK",
                "title": "High Risk Hotspot Activity",
                "description": f"{curr_hotspots} high-risk spatial predictive inferences active in working galleries.",
                "detail": f"{curr_hotspots} high-risk spatial predictive inferences active in working galleries.",
                "severity": "WARNING",
                "timestamp": tr.end_time.isoformat()
            })
        else:
            what_changed.append({
                "id": "wc-risk-normal",
                "domain": "PREDICTIVE_RISK",
                "category": "PREDICTIVE_RISK",
                "title": "Predictive Risk Posture Stable",
                "description": "Predictive risk model indicates steady-state baseline operations across all levels.",
                "detail": "Predictive risk model indicates steady-state baseline operations across all levels.",
                "severity": "INFO",
                "timestamp": tr.end_time.isoformat()
            })

        # Check environmental deviations
        env_devs = db.query(EnvironmentalObservation).filter(
            EnvironmentalObservation.mine_id == mine_id,
            EnvironmentalObservation.detected_at >= tr.start_time,
            EnvironmentalObservation.detected_at <= tr.end_time,
            EnvironmentalObservation.observed_value > EnvironmentalObservation.threshold_limit
        ).all()
        if env_devs:
            latest_dev = env_devs[-1]
            what_changed.append({
                "id": "wc-env-dev",
                "domain": "ENVIRONMENT",
                "category": "ENVIRONMENT",
                "title": f"Statutory {latest_dev.parameter_name} Threshold Crossed",
                "description": f"{latest_dev.parameter_name} reached {latest_dev.observed_value} {latest_dev.unit} (Limit: {latest_dev.threshold_limit}). Mitigation action: {latest_dev.action_taken or 'Wetting/Ventilation initiated'}.",
                "detail": f"{latest_dev.parameter_name} reached {latest_dev.observed_value} {latest_dev.unit} (Limit: {latest_dev.threshold_limit}). Mitigation action: {latest_dev.action_taken or 'Wetting/Ventilation initiated'}.",
                "severity": "WARNING",
                "timestamp": latest_dev.detected_at.isoformat()
            })

        # Check production deviation
        prod_devs = db.query(ProductionReport).filter(
            ProductionReport.mine_id == mine_id,
            ProductionReport.report_date >= tr.start_time.date(),
            ProductionReport.report_date <= tr.end_time.date(),
            ProductionReport.deviation_flag != "NORMAL"
        ).all()
        if prod_devs:
            what_changed.append({
                "id": "wc-prod-dev",
                "domain": "PRODUCTION",
                "category": "PRODUCTION",
                "title": "Production Variance Shift Flagged",
                "description": f"{len(prod_devs)} production shift reports flagged for operational deviation or safety pause.",
                "detail": f"{len(prod_devs)} production shift reports flagged for operational deviation or safety pause.",
                "severity": "WARNING",
                "timestamp": tr.end_time.isoformat()
            })

        # Check completed corrective actions
        comp_cas = db.query(CorrectiveAction).join(Violation).filter(
            Violation.mine_id == mine_id,
            CorrectiveAction.created_at >= tr.start_time,
            CorrectiveAction.created_at <= tr.end_time,
            CorrectiveAction.status.in_(["COMPLETED", "VERIFIED"])
        ).count()
        if comp_cas > 0:
            what_changed.append({
                "id": "wc-ca-done",
                "domain": "COMPLIANCE",
                "category": "COMPLIANCE",
                "title": "DGMS Corrective Action Rectified",
                "description": f"{comp_cas} statutory corrective action(s) successfully completed and verified within SLA.",
                "detail": f"{comp_cas} statutory corrective action(s) successfully completed and verified within SLA.",
                "severity": "SUCCESS",
                "timestamp": tr.end_time.isoformat()
            })

        total_records = curr_total_inc + curr_alerts + curr_open_vio + curr_gov_tasks + curr_env_dev + curr_grievances

        data_quality = DataQualityDTO(
            record_count=total_records,
            missing_periods=[],
            data_mode=data_mode,
            is_simulated=is_sim,
            data_as_of=now,
            notes="Calculated directly from operational and predictive tables."
        )

        return GovernanceOverviewAnalyticsDTO(
            mine_id=mine_id,
            mine_name=mine_name,
            time_range=tr,
            data_as_of=now,
            data_quality=data_quality,
            total_incidents=total_inc_metric,
            open_incidents=open_inc_metric,
            critical_incidents=crit_inc_metric,
            active_alerts=alerts_metric,
            open_violations=open_vio_metric,
            overdue_corrective_actions=overdue_ca_metric,
            sla_breaches=sla_metric,
            pending_inspections=pending_insp_metric,
            open_governance_tasks=gov_tasks_metric,
            environmental_deviations=env_dev_metric,
            open_grievances=grievances_metric,
            active_contractor_issues=cont_metric,
            predictive_high_hotspots=hotspots_metric,
            field_inspections_pending=pending_insp_metric,
            what_changed=what_changed
        )
