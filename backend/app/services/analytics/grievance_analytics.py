from datetime import datetime, timezone
from typing import Optional, List, Dict
from sqlalchemy.orm import Session

from app.models.mine import Mine
from app.models.grievance import Grievance
from app.schemas.analytics import (
    TimeRangeEnum,
    TimeRangeDTO,
    DataQualityDTO,
    GrievanceAnalyticsDTO,
    CategoryBreakdownDTO,
)
from app.services.analytics.time_utils import TimeRangeHelper


class GrievanceAnalyticsService:
    @staticmethod
    def get_grievance_analytics(
        mine_id: int,
        db: Session,
        range_type: TimeRangeEnum = TimeRangeEnum.LAST_30_DAYS,
        custom_start: Optional[datetime] = None,
        custom_end: Optional[datetime] = None,
    ) -> GrievanceAnalyticsDTO:
        mine = db.query(Mine).filter(Mine.id == mine_id).first()
        mine_name = mine.name if mine else f"Mine {mine_id}"
        is_sim = mine.is_simulated if mine else "NO"
        data_mode = "SIMULATED" if is_sim == "YES" else "OPERATIONAL"

        now = datetime.now(timezone.utc)
        tr = TimeRangeHelper.resolve_time_range(range_type, custom_start, custom_end, as_of=now)

        grievances = db.query(Grievance).filter(
            Grievance.mine_id == mine_id,
            Grievance.created_at >= tr.start_time,
            Grievance.created_at <= tr.end_time
        ).all()

        total_g = len(grievances)
        open_g = sum(1 for g in grievances if g.status not in ["RESOLVED", "VERIFIED", "CLOSED"])
        resolved_g = sum(1 for g in grievances if g.status in ["RESOLVED", "VERIFIED", "CLOSED"])
        overdue_g = sum(
            1 for g in grievances
            if g.due_at and TimeRangeHelper.ensure_utc(g.due_at) < now and g.status not in ["RESOLVED", "VERIFIED", "CLOSED"]
        )

        # Disposal days calculation
        disposal_times = []
        for g in grievances:
            c_at = TimeRangeHelper.ensure_utc(g.created_at)
            r_at = TimeRangeHelper.ensure_utc(g.resolved_at)
            if r_at and c_at and r_at > c_at:
                days = (r_at - c_at).total_seconds() / 86400.0
                disposal_times.append(days)
        avg_disp_days = round(sum(disposal_times) / len(disposal_times), 1) if disposal_times else None

        # By Category
        cat_map: Dict[str, List[int]] = {}
        pri_map: Dict[str, List[int]] = {}
        stat_map: Dict[str, List[int]] = {}

        for g in grievances:
            cat_map.setdefault(g.category, []).append(g.id)
            pri_map.setdefault(g.priority, []).append(g.id)
            stat_map.setdefault(g.status, []).append(g.id)

        by_cat = [
            CategoryBreakdownDTO(
                category=k,
                count=len(v),
                percentage=round((len(v) / total_g * 100.0), 1) if total_g > 0 else 0.0,
                entity_type="GRIEVANCE",
                entity_ids=v
            )
            for k, v in cat_map.items()
        ]

        by_pri = [
            CategoryBreakdownDTO(
                category=k,
                count=len(v),
                percentage=round((len(v) / total_g * 100.0), 1) if total_g > 0 else 0.0,
                severity=k,
                entity_type="GRIEVANCE",
                entity_ids=v
            )
            for k, v in pri_map.items()
        ]

        by_stat = [
            CategoryBreakdownDTO(
                category=k,
                count=len(v),
                percentage=round((len(v) / total_g * 100.0), 1) if total_g > 0 else 0.0,
                entity_type="GRIEVANCE",
                entity_ids=v
            )
            for k, v in stat_map.items()
        ]

        data_quality = DataQualityDTO(
            record_count=total_g,
            missing_periods=[],
            data_mode=data_mode,
            is_simulated=is_sim,
            data_as_of=now,
            notes="PGRM-compliant public & worker grievance tracking metrics."
        )

        return GrievanceAnalyticsDTO(
            mine_id=mine_id,
            mine_name=mine_name,
            time_range=tr,
            data_as_of=now,
            data_quality=data_quality,
            total_grievances=total_g,
            open_grievances=open_g,
            resolved_grievances=resolved_g,
            overdue_grievances=overdue_g,
            avg_disposal_days=avg_disp_days,
            grievances_by_category=by_cat,
            grievances_by_priority=by_pri,
            grievances_by_status=by_stat
        )
