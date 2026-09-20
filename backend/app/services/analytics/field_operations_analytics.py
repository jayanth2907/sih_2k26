from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
from sqlalchemy.orm import Session

from app.models.mine import Mine
from app.models.field_operation import FieldInspection, FieldEvidence, FieldSyncLog
from app.schemas.analytics import (
    TimeRangeEnum,
    TimeRangeDTO,
    DataQualityDTO,
    FieldOperationsAnalyticsDTO,
    TimeSeriesPointDTO,
    CategoryBreakdownDTO,
    DrillDownEntityDTO,
)
from app.services.analytics.time_utils import TimeRangeHelper


class FieldOperationsAnalyticsService:
    @staticmethod
    def get_field_operations_analytics(
        mine_id: int,
        db: Session,
        range_type: TimeRangeEnum = TimeRangeEnum.LAST_30_DAYS,
        custom_start: Optional[datetime] = None,
        custom_end: Optional[datetime] = None,
    ) -> FieldOperationsAnalyticsDTO:
        mine = db.query(Mine).filter(Mine.id == mine_id).first()
        mine_name = mine.name if mine else f"Mine {mine_id}"
        is_sim = mine.is_simulated if mine else "NO"
        data_mode = "SIMULATED" if is_sim == "YES" else "OPERATIONAL"

        now = datetime.now(timezone.utc)
        tr = TimeRangeHelper.resolve_time_range(range_type, custom_start, custom_end, as_of=now)

        # 1. Inspections
        inspections = db.query(FieldInspection).filter(
            FieldInspection.mine_id == mine_id,
            FieldInspection.scheduled_date >= tr.start_time,
            FieldInspection.scheduled_date <= tr.end_time
        ).all()

        scheduled = sum(1 for i in inspections if i.status == "SCHEDULED")
        in_progress = sum(1 for i in inspections if i.status == "IN_PROGRESS")
        completed = sum(1 for i in inspections if i.status == "COMPLETED")
        submitted = sum(1 for i in inspections if i.status == "SUBMITTED")

        # By Day
        day_buckets: Dict[str, List[int]] = {}
        curr_d = tr.start_time.date()
        end_d = tr.end_time.date()
        while curr_d <= end_d:
            day_buckets[curr_d.strftime("%Y-%m-%d")] = []
            curr_d += timedelta(days=1)

        for i in inspections:
            d_str = i.scheduled_date.date().strftime("%Y-%m-%d")
            if d_str in day_buckets:
                day_buckets[d_str].append(i.id)

        insp_by_day = [
            TimeSeriesPointDTO(
                date=k,
                value=float(len(v)),
                count=len(v),
                label=f"{len(v)} inspections",
                entity_ids=v
            )
            for k, v in sorted(day_buckets.items())
        ]

        # 2. Evidence
        evidences = db.query(FieldEvidence).filter(
            FieldEvidence.mine_id == mine_id,
            FieldEvidence.created_at >= tr.start_time,
            FieldEvidence.created_at <= tr.end_time
        ).all()

        evidence_type_map: Dict[str, List[int]] = {}
        for e in evidences:
            evidence_type_map.setdefault(e.evidence_type, []).append(e.id)

        ev_by_type = [
            CategoryBreakdownDTO(
                category=k,
                count=len(v),
                percentage=round((len(v) / len(evidences) * 100.0), 1) if evidences else 0.0,
                entity_type="FIELD_EVIDENCE",
                entity_ids=v
            )
            for k, v in evidence_type_map.items()
        ]

        # 3. Sync Logs (Offline first synchronization metrics)
        sync_logs = db.query(FieldSyncLog).filter(
            FieldSyncLog.mine_id == mine_id,
            FieldSyncLog.created_at >= tr.start_time,
            FieldSyncLog.created_at <= tr.end_time
        ).all()

        sync_total = len(sync_logs)
        sync_accepted = sum(1 for s in sync_logs if s.status == "ACCEPTED")
        sync_conflict = sum(1 for s in sync_logs if s.status == "CONFLICT")
        sync_rejected = sum(1 for s in sync_logs if s.status == "REJECTED")

        # Drilldown entities
        drilldown: List[DrillDownEntityDTO] = []
        for i in inspections:
            drilldown.append(
                DrillDownEntityDTO(
                    id=i.id,
                    code=i.inspection_code,
                    title=f"Field Inspection ({i.inspection_type})",
                    entity_type="FIELD_INSPECTION",
                    category=i.inspection_type,
                    severity=i.severity_assessment,
                    status=i.status,
                    timestamp=i.scheduled_date,
                    latitude=i.latitude or (mine.latitude if mine else None),
                    longitude=i.longitude or (mine.longitude if mine else None),
                    digital_twin_id=f"zone-{i.zone_id}" if i.zone_id else None,
                    gis_context=f"Status: {i.status}, Severity: {i.severity_assessment}"
                )
            )

        data_quality = DataQualityDTO(
            record_count=len(inspections) + len(evidences) + sync_total,
            missing_periods=[],
            data_mode=data_mode,
            is_simulated=is_sim,
            data_as_of=now,
            notes="Aggregated over field inspections, encrypted evidence proofs, and offline sync logs."
        )

        return FieldOperationsAnalyticsDTO(
            mine_id=mine_id,
            mine_name=mine_name,
            time_range=tr,
            data_as_of=now,
            data_quality=data_quality,
            scheduled_inspections=scheduled,
            in_progress_inspections=in_progress,
            completed_inspections=completed,
            submitted_inspections=submitted,
            total_evidence_count=len(evidences),
            evidence_by_type=ev_by_type,
            sync_logs_total=sync_total,
            sync_accepted_count=sync_accepted,
            sync_conflict_count=sync_conflict,
            sync_rejected_count=sync_rejected,
            inspections_by_day=insp_by_day,
            drilldown_entities=drilldown
        )
