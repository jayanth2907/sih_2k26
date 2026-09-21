from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.models.mine import Mine
from app.models.violation import Violation, CorrectiveAction, Escalation
from app.models.field_operation import FieldInspection
from app.schemas.analytics import (
    TimeRangeEnum,
    TimeRangeDTO,
    DataQualityDTO,
    ComplianceAnalyticsDTO,
    TimeSeriesPointDTO,
    CategoryBreakdownDTO,
    DrillDownEntityDTO,
)
from app.services.analytics.time_utils import TimeRangeHelper


class ComplianceAnalyticsService:
    @staticmethod
    def get_compliance_analytics(
        mine_id: int,
        db: Session,
        range_type: TimeRangeEnum = TimeRangeEnum.LAST_30_DAYS,
        custom_start: Optional[datetime] = None,
        custom_end: Optional[datetime] = None,
    ) -> ComplianceAnalyticsDTO:
        mine = db.query(Mine).filter(Mine.id == mine_id).first()
        mine_name = mine.name if mine else f"Mine {mine_id}"
        is_sim = mine.is_simulated if mine else "NO"
        data_mode = "SIMULATED" if is_sim == "YES" else "OPERATIONAL"

        now = datetime.now(timezone.utc)
        tr = TimeRangeHelper.resolve_time_range(range_type, custom_start, custom_end, as_of=now)

        # 1. Inspections
        inspections_count = db.query(FieldInspection).filter(
            FieldInspection.mine_id == mine_id,
            FieldInspection.scheduled_date >= tr.start_time,
            FieldInspection.scheduled_date <= tr.end_time
        ).count()

        # 2. Violations
        violations = db.query(Violation).filter(
            Violation.mine_id == mine_id,
            Violation.created_at >= tr.start_time,
            Violation.created_at <= tr.end_time
        ).all()

        total_vio = len(violations)
        open_vio = sum(1 for v in violations if v.status not in ["CLOSED", "RECTIFIED", "VERIFIED"])
        verified_vio = sum(1 for v in violations if v.status == "VERIFIED")

        # By Severity
        sev_map: Dict[str, List[int]] = {}
        statute_map: Dict[str, List[int]] = {}
        for v in violations:
            sev_map.setdefault(v.severity, []).append(v.id)
            statute_map.setdefault(v.statute, []).append(v.id)

        vio_by_sev = [
            CategoryBreakdownDTO(
                category=k,
                count=len(v_ids),
                percentage=round((len(v_ids) / total_vio * 100.0), 1) if total_vio > 0 else 0.0,
                severity=k,
                entity_type="VIOLATION",
                entity_ids=v_ids
            )
            for k, v_ids in sev_map.items()
        ]

        vio_by_statute = [
            CategoryBreakdownDTO(
                category=k,
                count=len(v_ids),
                percentage=round((len(v_ids) / total_vio * 100.0), 1) if total_vio > 0 else 0.0,
                entity_type="VIOLATION",
                entity_ids=v_ids
            )
            for k, v_ids in statute_map.items()
        ]

        # 3. Corrective Actions
        vio_ids = [v.id for v in violations]
        corrective_actions = db.query(CorrectiveAction).filter(CorrectiveAction.violation_id.in_(vio_ids)).all() if vio_ids else []
        ca_total = len(corrective_actions)
        ca_pending = sum(1 for ca in corrective_actions if ca.status not in ["COMPLETED", "VERIFIED"])
        ca_overdue = sum(
            1 for ca in corrective_actions
            if ca.target_completion_date and TimeRangeHelper.ensure_utc(ca.target_completion_date) < now and ca.status not in ["COMPLETED", "VERIFIED"]
        )
        
        ca_on_time = sum(
            1 for ca in corrective_actions
            if ca.status in ["COMPLETED", "VERIFIED"] and (
                ca.completed_at is None or 
                (ca.target_completion_date and TimeRangeHelper.ensure_utc(ca.completed_at) <= TimeRangeHelper.ensure_utc(ca.target_completion_date))
            )
        )
        sla_rate = round((ca_on_time / ca_total * 100.0), 1) if ca_total > 0 else 100.0

        # 4. Escalations
        escalations_count = db.query(Escalation).filter(Escalation.violation_id.in_(vio_ids)).count() if vio_ids else 0

        # Compliance chain: Violation -> Corrective Action -> Escalation
        chain: List[Dict[str, Any]] = []
        for v in violations[:10]: # Return top 10 for structured trace
            v_cas = [ca for ca in corrective_actions if ca.violation_id == v.id]
            v_escs = db.query(Escalation).filter(Escalation.violation_id == v.id).all()
            chain.append({
                "violation_id": v.id,
                "violation_code": v.violation_code,
                "regulatory_clause": v.regulatory_clause,
                "severity": v.severity,
                "status": v.status,
                "corrective_actions_count": len(v_cas),
                "escalations_count": len(v_escs),
                "has_sla_breach": any(ca.target_completion_date and TimeRangeHelper.ensure_utc(ca.target_completion_date) < now and ca.status not in ["COMPLETED", "VERIFIED"] for ca in v_cas)
            })

        # 5. Time-Series Trends by Day (Violations, Corrective Actions, Resolved Actions)
        curr_d = tr.start_time.date()
        end_d = tr.end_time.date()
        date_map: Dict[str, Dict[str, Any]] = {}
        while curr_d <= end_d:
            d_str = curr_d.strftime("%Y-%m-%d")
            date_map[d_str] = {"violations": [], "actions": [], "resolved": []}
            curr_d += timedelta(days=1)

        for v in violations:
            d_str = v.created_at.date().strftime("%Y-%m-%d")
            if d_str in date_map:
                date_map[d_str]["violations"].append(v.id)

        for ca in corrective_actions:
            d_str = ca.created_at.date().strftime("%Y-%m-%d")
            if d_str in date_map:
                date_map[d_str]["actions"].append(ca.id)
            if ca.completed_at:
                c_d_str = ca.completed_at.date().strftime("%Y-%m-%d")
                if c_d_str in date_map:
                    date_map[c_d_str]["resolved"].append(ca.id)

        compliance_trend = [
            TimeSeriesPointDTO(
                date=k,
                value=float(len(v["violations"])),
                count=len(v["actions"]),
                label=f"Violations: {len(v['violations'])} | Actions: {len(v['actions'])} | Resolved: {len(v['resolved'])}",
                entity_ids=v["violations"] + v["actions"],
                observed_value=float(len(v["violations"])),
                target_value=float(len(v["actions"])),
                forecast_value=float(len(v["resolved"]))
            )
            for k, v in sorted(date_map.items())
        ]

        violations_by_day = [
            TimeSeriesPointDTO(date=k, value=float(len(v["violations"])), count=len(v["violations"]), entity_ids=v["violations"])
            for k, v in sorted(date_map.items())
        ]

        actions_by_day = [
            TimeSeriesPointDTO(date=k, value=float(len(v["actions"])), count=len(v["actions"]), entity_ids=v["actions"])
            for k, v in sorted(date_map.items())
        ]

        resolved_by_day = [
            TimeSeriesPointDTO(date=k, value=float(len(v["resolved"])), count=len(v["resolved"]), entity_ids=v["resolved"])
            for k, v in sorted(date_map.items())
        ]

        # Drilldown entities
        drilldown: List[DrillDownEntityDTO] = []
        for v in violations:
            drilldown.append(
                DrillDownEntityDTO(
                    id=v.id,
                    code=v.violation_code,
                    title=v.title,
                    entity_type="VIOLATION",
                    category=v.statute,
                    severity=v.severity,
                    status=v.status,
                    timestamp=v.created_at,
                    digital_twin_id=f"zone-{v.zone_id}" if v.zone_id else None,
                    gis_context=f"Statute: {v.statute}, Clause: {v.regulatory_clause}"
                )
            )

        data_quality = DataQualityDTO(
            record_count=total_vio + ca_total + inspections_count,
            missing_periods=[],
            data_mode=data_mode,
            is_simulated=is_sim,
            data_as_of=now,
            notes="Compliance chain aggregated over violations, corrective actions, and SLA deadlines."
        )

        return ComplianceAnalyticsDTO(
            mine_id=mine_id,
            mine_name=mine_name,
            time_range=tr,
            data_as_of=now,
            data_quality=data_quality,
            total_inspections=inspections_count,
            total_violations=total_vio,
            open_violations=open_vio,
            verified_violations=verified_vio,
            violations_by_severity=vio_by_sev,
            violations_by_statute=vio_by_statute,
            corrective_actions_total=ca_total,
            corrective_actions_pending=ca_pending,
            corrective_actions_overdue=ca_overdue,
            sla_compliance_rate_percent=sla_rate,
            escalations_count=escalations_count,
            compliance_chain=chain,
            compliance_trend=compliance_trend,
            violations_by_day=violations_by_day,
            actions_by_day=actions_by_day,
            resolved_by_day=resolved_by_day,
            drilldown_entities=drilldown
        )
