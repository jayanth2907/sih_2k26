from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.mine import Mine
from app.models.incident import Incident
from app.models.violation import Violation
from app.models.production import ProductionReport
from app.models.workforce import AttendanceRecord
from app.models.environmental import EnvironmentalObservation
from app.models.risk_prediction import RiskPrediction
from app.models.governance_task import GovernanceTask

from app.schemas.analytics import (
    TimeRangeEnum,
    TimeRangeDTO,
    CrossMineBenchmarkingDTO,
    MineComparativeMetricDTO,
)
from app.services.analytics.time_utils import TimeRangeHelper


class CrossMineAnalyticsService:
    @staticmethod
    def get_cross_mine_benchmarking(
        authorized_mines: List[Mine],
        db: Session,
        range_type: TimeRangeEnum = TimeRangeEnum.LAST_30_DAYS,
        custom_start: Optional[datetime] = None,
        custom_end: Optional[datetime] = None,
    ) -> CrossMineBenchmarkingDTO:
        now = datetime.now(timezone.utc)
        tr = TimeRangeHelper.resolve_time_range(range_type, custom_start, custom_end, as_of=now)

        mine_metrics: List[MineComparativeMetricDTO] = []

        for m in authorized_mines:
            m_id = m.id

            # 1. Open incidents
            open_inc = db.query(func.count(Incident.id)).filter(
                Incident.mine_id == m_id,
                Incident.created_at >= tr.start_time,
                Incident.created_at <= tr.end_time,
                ~Incident.status.in_(["CLOSED", "RESOLVED"])
            ).scalar() or 0

            # 2. Open violations
            open_vio = db.query(func.count(Violation.id)).filter(
                Violation.mine_id == m_id,
                Violation.created_at >= tr.start_time,
                Violation.created_at <= tr.end_time,
                ~Violation.status.in_(["CLOSED", "RECTIFIED", "VERIFIED"])
            ).scalar() or 0

            # 3. SLA Breaches
            sla_breaches = db.query(func.count(GovernanceTask.id)).filter(
                GovernanceTask.mine_id == m_id,
                GovernanceTask.created_at >= tr.start_time,
                GovernanceTask.created_at <= tr.end_time,
                GovernanceTask.sla_status == "BREACHED"
            ).scalar() or 0

            # 4. Production
            prod_reports = db.query(ProductionReport).filter(
                ProductionReport.mine_id == m_id,
                ProductionReport.report_date >= tr.start_time.date(),
                ProductionReport.report_date <= tr.end_time.date()
            ).all()
            planned_p = sum(r.planned_quantity for r in prod_reports)
            actual_p = sum(r.actual_quantity for r in prod_reports)
            prod_var = actual_p - planned_p

            # 5. Attendance
            att_records = db.query(AttendanceRecord).filter(
                AttendanceRecord.mine_id == m_id,
                AttendanceRecord.attendance_date >= tr.start_time.date(),
                AttendanceRecord.attendance_date <= tr.end_time.date()
            ).all()
            present_c = sum(1 for a in att_records if a.status == "PRESENT")
            att_rate = round((present_c / len(att_records) * 100.0), 1) if att_records else 0.0

            # 6. Environmental deviations
            env_dev = db.query(func.count(EnvironmentalObservation.id)).filter(
                EnvironmentalObservation.mine_id == m_id,
                EnvironmentalObservation.detected_at >= tr.start_time,
                EnvironmentalObservation.detected_at <= tr.end_time,
                EnvironmentalObservation.observed_value > EnvironmentalObservation.threshold_limit
            ).scalar() or 0

            # 7. Predictive Risk
            latest_pred = db.query(RiskPrediction).filter(
                RiskPrediction.mine_id == m_id,
                RiskPrediction.prediction_timestamp >= tr.start_time,
                RiskPrediction.prediction_timestamp <= tr.end_time
            ).order_by(RiskPrediction.prediction_timestamp.desc()).first()

            pred_score = latest_pred.predicted_risk_score if latest_pred else None

            # Hotspots
            hotspots = db.query(func.count(RiskPrediction.id)).filter(
                RiskPrediction.mine_id == m_id,
                RiskPrediction.prediction_timestamp >= tr.start_time,
                RiskPrediction.prediction_timestamp <= tr.end_time,
                RiskPrediction.predicted_severity.in_(["HIGH", "CRITICAL"])
            ).scalar() or 0

            mine_metrics.append(
                MineComparativeMetricDTO(
                    mine_id=m_id,
                    mine_name=m.name,
                    state=m.state,
                    district=m.district,
                    data_status=m.data_status,
                    is_simulated=m.is_simulated,
                    open_incidents=open_inc,
                    open_violations=open_vio,
                    sla_breaches=sla_breaches,
                    planned_production=round(planned_p, 2),
                    actual_production=round(actual_p, 2),
                    production_variance=round(prod_var, 2),
                    attendance_rate_percent=att_rate,
                    environmental_deviations=env_dev,
                    predictive_risk_score=pred_score,
                    active_hotspots=hotspots
                )
            )

        return CrossMineBenchmarkingDTO(
            time_range=tr,
            data_as_of=now,
            authorized_mines_count=len(authorized_mines),
            mines=mine_metrics
        )
