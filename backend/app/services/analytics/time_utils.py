from datetime import datetime, timezone, timedelta, date
from typing import Tuple, Optional
from app.schemas.analytics import TimeRangeEnum, TimeRangeDTO, TrendMetricDTO


class TimeRangeHelper:
    """
    Standardized time range resolver and trend comparison utility.
    Ensures safe UTC datetime arithmetic and consistent period-over-period windows.
    """

    @staticmethod
    def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
        """Ensures a datetime is timezone-aware in UTC for safe comparisons."""
        if dt is None:
            return None
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt

    @staticmethod
    def resolve_time_range(
        range_type: TimeRangeEnum = TimeRangeEnum.LAST_30_DAYS,
        custom_start: Optional[datetime] = None,
        custom_end: Optional[datetime] = None,
        as_of: Optional[datetime] = None
    ) -> TimeRangeDTO:
        now = as_of or datetime.now(timezone.utc)

        if range_type == TimeRangeEnum.CUSTOM:
            if not custom_start:
                custom_start = now - timedelta(days=30)
            if not custom_end:
                custom_end = now
            # Ensure timezone-aware
            if custom_start.tzinfo is None:
                custom_start = custom_start.replace(tzinfo=timezone.utc)
            if custom_end.tzinfo is None:
                custom_end = custom_end.replace(tzinfo=timezone.utc)

            duration = custom_end - custom_start
            prev_start = custom_start - duration
            prev_end = custom_start
            return TimeRangeDTO(
                range_type=TimeRangeEnum.CUSTOM,
                start_time=custom_start,
                end_time=custom_end,
                prev_start_time=prev_start,
                prev_end_time=prev_end
            )

        elif range_type == TimeRangeEnum.TODAY:
            start_today = datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=timezone.utc)
            end_today = now
            prev_start = start_today - timedelta(days=1)
            prev_end = start_today
            return TimeRangeDTO(
                range_type=TimeRangeEnum.TODAY,
                start_time=start_today,
                end_time=end_today,
                prev_start_time=prev_start,
                prev_end_time=prev_end
            )

        elif range_type == TimeRangeEnum.LAST_7_DAYS:
            start = now - timedelta(days=7)
            prev_start = start - timedelta(days=7)
            return TimeRangeDTO(
                range_type=TimeRangeEnum.LAST_7_DAYS,
                start_time=start,
                end_time=now,
                prev_start_time=prev_start,
                prev_end_time=start
            )

        elif range_type == TimeRangeEnum.LAST_30_DAYS:
            start = now - timedelta(days=30)
            prev_start = start - timedelta(days=30)
            return TimeRangeDTO(
                range_type=TimeRangeEnum.LAST_30_DAYS,
                start_time=start,
                end_time=now,
                prev_start_time=prev_start,
                prev_end_time=start
            )

        elif range_type == TimeRangeEnum.LAST_90_DAYS:
            start = now - timedelta(days=90)
            prev_start = start - timedelta(days=90)
            return TimeRangeDTO(
                range_type=TimeRangeEnum.LAST_90_DAYS,
                start_time=start,
                end_time=now,
                prev_start_time=prev_start,
                prev_end_time=start
            )

        elif range_type == TimeRangeEnum.THIS_MONTH:
            start_month = datetime(now.year, now.month, 1, 0, 0, 0, tzinfo=timezone.utc)
            if now.month == 1:
                prev_start = datetime(now.year - 1, 12, 1, 0, 0, 0, tzinfo=timezone.utc)
            else:
                prev_start = datetime(now.year, now.month - 1, 1, 0, 0, 0, tzinfo=timezone.utc)
            prev_end = start_month
            return TimeRangeDTO(
                range_type=TimeRangeEnum.THIS_MONTH,
                start_time=start_month,
                end_time=now,
                prev_start_time=prev_start,
                prev_end_time=prev_end
            )

        elif range_type == TimeRangeEnum.THIS_QUARTER:
            q_month = ((now.month - 1) // 3) * 3 + 1
            start_q = datetime(now.year, q_month, 1, 0, 0, 0, tzinfo=timezone.utc)
            if q_month <= 3:
                prev_start = datetime(now.year - 1, 10, 1, 0, 0, 0, tzinfo=timezone.utc)
            else:
                prev_start = datetime(now.year, q_month - 3, 1, 0, 0, 0, tzinfo=timezone.utc)
            prev_end = start_q
            return TimeRangeDTO(
                range_type=TimeRangeEnum.THIS_QUARTER,
                start_time=start_q,
                end_time=now,
                prev_start_time=prev_start,
                prev_end_time=prev_end
            )

        # Default fallback
        start = now - timedelta(days=30)
        return TimeRangeDTO(
            range_type=TimeRangeEnum.LAST_30_DAYS,
            start_time=start,
            end_time=now,
            prev_start_time=start - timedelta(days=30),
            prev_end_time=start
        )

    @staticmethod
    def calculate_trend(
        current_val: float,
        previous_val: Optional[float],
        unit: str = "count",
        data_mode: str = "OPERATIONAL"
    ) -> TrendMetricDTO:
        """
        Calculates delta and percentage delta safely avoiding division by zero.
        """
        if previous_val is None:
            return TrendMetricDTO(
                current_value=float(current_val),
                previous_value=None,
                delta=None,
                percentage_delta=None,
                unit=unit,
                data_mode=data_mode
            )

        delta = float(current_val - previous_val)
        if previous_val == 0:
            pct_delta = None # Undefined percentage change from 0 baseline
        else:
            pct_delta = round((delta / previous_val) * 100.0, 2)

        return TrendMetricDTO(
            current_value=float(current_val),
            previous_value=float(previous_val),
            delta=round(delta, 2),
            percentage_delta=pct_delta,
            unit=unit,
            data_mode=data_mode
        )
