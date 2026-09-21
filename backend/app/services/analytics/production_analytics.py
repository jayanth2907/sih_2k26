from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.models.mine import Mine
from app.models.production import ProductionReport
from app.schemas.analytics import (
    TimeRangeEnum,
    TimeRangeDTO,
    DataQualityDTO,
    ProductionAnalyticsDTO,
    TimeSeriesPointDTO,
    CategoryBreakdownDTO,
)
from app.services.analytics.time_utils import TimeRangeHelper


class ProductionAnalyticsService:
    @staticmethod
    def get_production_analytics(
        mine_id: int,
        db: Session,
        range_type: TimeRangeEnum = TimeRangeEnum.LAST_30_DAYS,
        custom_start: Optional[datetime] = None,
        custom_end: Optional[datetime] = None,
    ) -> ProductionAnalyticsDTO:
        mine = db.query(Mine).filter(Mine.id == mine_id).first()
        mine_name = mine.name if mine else f"Mine {mine_id}"
        is_sim = mine.is_simulated if mine else "NO"
        data_mode = "SIMULATED" if is_sim == "YES" else "OPERATIONAL"

        now = datetime.now(timezone.utc)
        tr = TimeRangeHelper.resolve_time_range(range_type, custom_start, custom_end, as_of=now)

        start_date = tr.start_time.date()
        end_date = tr.end_time.date()

        reports = db.query(ProductionReport).filter(
            ProductionReport.mine_id == mine_id,
            ProductionReport.report_date >= start_date,
            ProductionReport.report_date <= end_date
        ).order_by(ProductionReport.report_date.asc()).all()

        planned_total = sum(r.planned_quantity for r in reports)
        actual_total = sum(r.actual_quantity for r in reports)
        var_total = actual_total - planned_total
        var_pct = round((var_total / planned_total * 100.0), 2) if planned_total > 0 else 0.0

        deviations_count = sum(1 for r in reports if r.deviation_flag != "NORMAL")

        # Trend by date
        trend_map: Dict[str, Dict[str, Any]] = {}
        for r in reports:
            d_str = r.report_date.strftime("%Y-%m-%d")
            if d_str not in trend_map:
                trend_map[d_str] = {"planned": 0.0, "actual": 0.0, "ids": []}
            trend_map[d_str]["planned"] += r.planned_quantity
            trend_map[d_str]["actual"] += r.actual_quantity
            trend_map[d_str]["ids"].append(r.id)

        trend_points = [
            TimeSeriesPointDTO(
                date=k,
                value=round(v["actual"], 2),
                count=len(v["ids"]),
                label=f"Planned: {round(v['planned'], 1)} | Actual: {round(v['actual'], 1)} (Var: {round(v['actual'] - v['planned'], 1)} T)",
                entity_ids=v["ids"],
                observed_value=round(v["actual"], 2),
                target_value=round(v["planned"], 2)
            )
            for k, v in sorted(trend_map.items())
        ]

        # By shift
        shift_map: Dict[str, Dict[str, Any]] = {}
        for r in reports:
            shift_map.setdefault(r.shift, {"actual": 0.0, "ids": []})
            shift_map[r.shift]["actual"] += r.actual_quantity
            shift_map[r.shift]["ids"].append(r.id)

        by_shift = [
            CategoryBreakdownDTO(
                category=f"Shift {k}",
                count=int(v["actual"]),
                percentage=round((v["actual"] / actual_total * 100.0), 1) if actual_total > 0 else 0.0,
                entity_type="PRODUCTION_REPORT",
                entity_ids=v["ids"]
            )
            for k, v in shift_map.items()
        ]

        # By material
        mat_map: Dict[str, Dict[str, Any]] = {}
        for r in reports:
            mat_map.setdefault(r.material_type, {"actual": 0.0, "ids": []})
            mat_map[r.material_type]["actual"] += r.actual_quantity
            mat_map[r.material_type]["ids"].append(r.id)

        by_material = [
            CategoryBreakdownDTO(
                category=k,
                count=int(v["actual"]),
                percentage=round((v["actual"] / actual_total * 100.0), 1) if actual_total > 0 else 0.0,
                entity_type="PRODUCTION_REPORT",
                entity_ids=v["ids"]
            )
            for k, v in mat_map.items()
        ]

        data_quality = DataQualityDTO(
            record_count=len(reports),
            missing_periods=[] if reports else [f"No production records between {start_date} and {end_date}"],
            data_mode=data_mode,
            is_simulated=is_sim,
            data_as_of=now,
            notes="Derived directly from submitted production logs."
        )

        return ProductionAnalyticsDTO(
            mine_id=mine_id,
            mine_name=mine_name,
            time_range=tr,
            data_as_of=now,
            data_quality=data_quality,
            planned_quantity_total=round(planned_total, 2),
            actual_quantity_total=round(actual_total, 2),
            variance_quantity_total=round(var_total, 2),
            variance_percentage=var_pct,
            unit="TONNES",
            production_trend=trend_points,
            production_by_shift=by_shift,
            production_by_material=by_material,
            reports_submitted_count=len(reports),
            deviations_flagged_count=deviations_count
        )
