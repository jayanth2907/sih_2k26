from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.mine import Mine
from app.models.incident import Incident
from app.models.alert import Alert
from app.models.risk import AnomalyEvent
from app.schemas.analytics import (
    TimeRangeEnum,
    TimeRangeDTO,
    DataQualityDTO,
    SafetyAnalyticsDTO,
    TimeSeriesPointDTO,
    CategoryBreakdownDTO,
    DrillDownEntityDTO,
)
from app.services.analytics.time_utils import TimeRangeHelper


class SafetyAnalyticsService:
    @staticmethod
    def get_safety_analytics(
        mine_id: int,
        db: Session,
        range_type: TimeRangeEnum = TimeRangeEnum.LAST_30_DAYS,
        custom_start: Optional[datetime] = None,
        custom_end: Optional[datetime] = None,
    ) -> SafetyAnalyticsDTO:
        mine = db.query(Mine).filter(Mine.id == mine_id).first()
        mine_name = mine.name if mine else f"Mine {mine_id}"
        is_sim = mine.is_simulated if mine else "NO"
        data_mode = "SIMULATED" if is_sim == "YES" else "OPERATIONAL"

        now = datetime.now(timezone.utc)
        tr = TimeRangeHelper.resolve_time_range(range_type, custom_start, custom_end, as_of=now)

        # 1. Incidents
        incidents_query = db.query(Incident).filter(
            Incident.mine_id == mine_id,
            Incident.created_at >= tr.start_time,
            Incident.created_at <= tr.end_time
        ).all()

        total_inc = len(incidents_query)
        open_inc = sum(1 for i in incidents_query if i.status not in ["CLOSED", "RESOLVED"])
        resolved_inc = sum(1 for i in incidents_query if i.status in ["CLOSED", "RESOLVED"])

        # Average resolution hours
        res_times = []
        for i in incidents_query:
            c_at = TimeRangeHelper.ensure_utc(i.created_at)
            r_at = TimeRangeHelper.ensure_utc(i.resolved_at)
            if r_at and c_at and r_at > c_at:
                delta_hrs = (r_at - c_at).total_seconds() / 3600.0
                res_times.append(delta_hrs)
        avg_res_hrs = round(sum(res_times) / len(res_times), 1) if res_times else None

        # Incidents by Day
        day_buckets: Dict[str, List[int]] = {}
        curr_d = tr.start_time.date()
        end_d = tr.end_time.date()
        while curr_d <= end_d:
            day_buckets[curr_d.strftime("%Y-%m-%d")] = []
            curr_d += timedelta(days=1)

        for i in incidents_query:
            d_str = i.created_at.date().strftime("%Y-%m-%d")
            if d_str in day_buckets:
                day_buckets[d_str].append(i.id)

        incidents_by_day = [
            TimeSeriesPointDTO(date=k, value=float(len(v)), count=len(v), entity_ids=v)
            for k, v in sorted(day_buckets.items())
        ]

        # Incidents by Severity
        sev_counts: Dict[str, List[int]] = {}
        for i in incidents_query:
            sev_counts.setdefault(i.severity, []).append(i.id)
        incidents_by_sev = [
            CategoryBreakdownDTO(
                category=k,
                count=len(v),
                percentage=round((len(v) / total_inc * 100.0), 1) if total_inc > 0 else 0.0,
                severity=k,
                entity_type="INCIDENT",
                entity_ids=v
            )
            for k, v in sev_counts.items()
        ]

        # Incidents by Category
        cat_counts: Dict[str, List[int]] = {}
        for i in incidents_query:
            cat_counts.setdefault(i.category, []).append(i.id)
        incidents_by_cat = [
            CategoryBreakdownDTO(
                category=k,
                count=len(v),
                percentage=round((len(v) / total_inc * 100.0), 1) if total_inc > 0 else 0.0,
                entity_type="INCIDENT",
                entity_ids=v
            )
            for k, v in cat_counts.items()
        ]

        # 2. Anomalies
        anomalies_query = db.query(AnomalyEvent).filter(
            AnomalyEvent.mine_id == mine_id,
            AnomalyEvent.detected_at >= tr.start_time,
            AnomalyEvent.detected_at <= tr.end_time
        ).all()
        anomalies_count = len(anomalies_query)
        crit_anomalies_count = sum(1 for a in anomalies_query if a.severity == "CRITICAL")

        anom_buckets: Dict[str, List[int]] = {k: [] for k in day_buckets.keys()}
        for a in anomalies_query:
            d_str = a.detected_at.date().strftime("%Y-%m-%d")
            if d_str in anom_buckets:
                anom_buckets[d_str].append(a.id)

        anomalies_by_day = [
            TimeSeriesPointDTO(date=k, value=float(len(v)), count=len(v), entity_ids=v)
            for k, v in sorted(anom_buckets.items())
        ]

        # 3. Alerts
        alerts_query = db.query(Alert).filter(
            Alert.mine_id == mine_id,
            Alert.created_at >= tr.start_time,
            Alert.created_at <= tr.end_time
        ).all()
        resolved_alerts = sum(1 for a in alerts_query if a.status in ["RESOLVED", "CLOSED"])

        alert_sev_counts: Dict[str, List[int]] = {}
        for a in alerts_query:
            alert_sev_counts.setdefault(a.severity, []).append(a.id)
        alerts_by_sev = [
            CategoryBreakdownDTO(
                category=k,
                count=len(v),
                percentage=round((len(v) / len(alerts_query) * 100.0), 1) if alerts_query else 0.0,
                severity=k,
                entity_type="ALERT",
                entity_ids=v
            )
            for k, v in alert_sev_counts.items()
        ]

        # Recurring Hazards (categories with > 1 incident)
        recurring = [c for c in incidents_by_cat if c.count > 1]

        # Drilldown entities
        drilldown: List[DrillDownEntityDTO] = []
        for i in incidents_query:
            drilldown.append(
                DrillDownEntityDTO(
                    id=i.id,
                    code=i.incident_code,
                    title=i.title,
                    entity_type="INCIDENT",
                    category=i.category,
                    severity=i.severity,
                    status=i.status,
                    timestamp=i.created_at,
                    latitude=i.latitude,
                    longitude=i.longitude,
                    digital_twin_id=f"zone-{i.zone_id}" if i.zone_id else None,
                    gis_context=f"Severity: {i.severity}, Status: {i.status}"
                )
            )

        data_quality = DataQualityDTO(
            record_count=total_inc + anomalies_count + len(alerts_query),
            missing_periods=[],
            data_mode=data_mode,
            is_simulated=is_sim,
            data_as_of=now,
            notes="Real-time aggregation over incidents, anomalies, and safety alerts."
        )

        return SafetyAnalyticsDTO(
            mine_id=mine_id,
            mine_name=mine_name,
            time_range=tr,
            data_as_of=now,
            data_quality=data_quality,
            total_incidents=total_inc,
            open_incidents=open_inc,
            resolved_incidents=resolved_inc,
            avg_resolution_hours=avg_res_hrs,
            incidents_by_day=incidents_by_day,
            incidents_by_severity=incidents_by_sev,
            incidents_by_category=incidents_by_cat,
            anomalies_count=anomalies_count,
            critical_anomalies_count=crit_anomalies_count,
            anomalies_by_day=anomalies_by_day,
            alerts_by_severity=alerts_by_sev,
            alerts_resolved_count=resolved_alerts,
            recurring_hazards=recurring,
            drilldown_entities=drilldown
        )
