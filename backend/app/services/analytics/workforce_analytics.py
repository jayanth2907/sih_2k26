from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.models.mine import Mine
from app.models.workforce import Worker, AttendanceRecord, Shift
from app.schemas.analytics import (
    TimeRangeEnum,
    TimeRangeDTO,
    DataQualityDTO,
    WorkforceAnalyticsDTO,
    TimeSeriesPointDTO,
    CategoryBreakdownDTO,
)
from app.services.analytics.time_utils import TimeRangeHelper


class WorkforceAnalyticsService:
    @staticmethod
    def get_workforce_analytics(
        mine_id: int,
        db: Session,
        range_type: TimeRangeEnum = TimeRangeEnum.LAST_30_DAYS,
        custom_start: Optional[datetime] = None,
        custom_end: Optional[datetime] = None,
    ) -> WorkforceAnalyticsDTO:
        mine = db.query(Mine).filter(Mine.id == mine_id).first()
        mine_name = mine.name if mine else f"Mine {mine_id}"
        is_sim = mine.is_simulated if mine else "NO"
        data_mode = "SIMULATED" if is_sim == "YES" else "OPERATIONAL"

        now = datetime.now(timezone.utc)
        tr = TimeRangeHelper.resolve_time_range(range_type, custom_start, custom_end, as_of=now)

        start_date = tr.start_time.date()
        end_date = tr.end_time.date()

        # 1. Registered Workers
        workers = db.query(Worker).filter(Worker.mine_id == mine_id).all()
        total_workers = len(workers)
        contractual = sum(1 for w in workers if w.is_contractual)
        regular = total_workers - contractual

        # Workers by trade
        trade_map: Dict[str, List[int]] = {}
        for w in workers:
            trade_map.setdefault(w.trade_category, []).append(w.id)

        by_trade = [
            CategoryBreakdownDTO(
                category=k,
                count=len(v),
                percentage=round((len(v) / total_workers * 100.0), 1) if total_workers > 0 else 0.0,
                entity_type="WORKER",
                entity_ids=v
            )
            for k, v in trade_map.items()
        ]

        # 2. Attendance Records in window
        att_records = db.query(AttendanceRecord).filter(
            AttendanceRecord.mine_id == mine_id,
            AttendanceRecord.attendance_date >= start_date,
            AttendanceRecord.attendance_date <= end_date
        ).order_by(AttendanceRecord.attendance_date.asc()).all()

        total_att = len(att_records)
        present_count = sum(1 for a in att_records if a.status == "PRESENT")
        absent_count = sum(1 for a in att_records if a.status == "ABSENT")
        late_count = sum(1 for a in att_records if a.status == "LATE")
        att_rate = round((present_count / total_att * 100.0), 1) if total_att > 0 else 0.0

        # Trend by date
        trend_map: Dict[str, List[int]] = {}
        curr_d = start_date
        while curr_d <= end_date:
            trend_map[curr_d.strftime("%Y-%m-%d")] = []
            curr_d += timedelta(days=1)

        for a in att_records:
            d_str = a.attendance_date.strftime("%Y-%m-%d")
            if a.status in ["PRESENT", "LATE"] and d_str in trend_map:
                trend_map[d_str].append(a.id)

        trend_points = [
            TimeSeriesPointDTO(
                date=k,
                value=float(len(v)),
                count=len(v),
                label=f"{len(v)} present",
                entity_ids=v
            )
            for k, v in sorted(trend_map.items())
        ]

        # By shift
        shifts = {s.id: s.shift_code for s in db.query(Shift).filter(Shift.mine_id == mine_id).all()}
        shift_att_map: Dict[str, List[int]] = {}
        for a in att_records:
            s_code = shifts.get(a.shift_id, "GENERAL")
            shift_att_map.setdefault(s_code, []).append(a.id)

        by_shift = [
            CategoryBreakdownDTO(
                category=f"Shift {k}",
                count=len(v),
                percentage=round((len(v) / total_att * 100.0), 1) if total_att > 0 else 0.0,
                entity_type="ATTENDANCE_RECORD",
                entity_ids=v
            )
            for k, v in shift_att_map.items()
        ]

        data_quality = DataQualityDTO(
            record_count=total_att + total_workers,
            missing_periods=[] if att_records else [f"No attendance logs between {start_date} and {end_date}"],
            data_mode=data_mode,
            is_simulated=is_sim,
            data_as_of=now,
            notes="Aggregated from worker registrations and biometric/RFID/manual shift records."
        )

        return WorkforceAnalyticsDTO(
            mine_id=mine_id,
            mine_name=mine_name,
            time_range=tr,
            data_as_of=now,
            data_quality=data_quality,
            total_workers_registered=total_workers,
            contractual_workers_count=contractual,
            regular_workers_count=regular,
            total_attendance_records=total_att,
            present_count=present_count,
            absent_count=absent_count,
            late_count=late_count,
            attendance_rate_percent=att_rate,
            attendance_trend=trend_points,
            attendance_by_shift=by_shift,
            workers_by_trade=by_trade
        )
