from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.models.mine import Mine
from app.models.environmental import EnvironmentalObservation, EnvironmentalRule
from app.schemas.analytics import (
    TimeRangeEnum,
    TimeRangeDTO,
    DataQualityDTO,
    EnvironmentalAnalyticsDTO,
    EnvironmentalParameterDTO,
    TimeSeriesPointDTO,
    DrillDownEntityDTO,
)
from app.services.analytics.time_utils import TimeRangeHelper


class EnvironmentalAnalyticsService:
    # Standard environmental parameters monitored under DGMS / CPCB
    STANDARD_PARAMETERS = [
        {"name": "PM10", "unit": "µg/m³", "default_threshold": 100.0},
        {"name": "PM2.5", "unit": "µg/m³", "default_threshold": 60.0},
        {"name": "NOISE_DB", "unit": "dB(A)", "default_threshold": 85.0},
        {"name": "WATER_PH", "unit": "pH", "default_threshold": 8.5},
        {"name": "EFFLUENT_TSS", "unit": "mg/L", "default_threshold": 100.0},
        {"name": "AMBIENT_TEMP", "unit": "°C", "default_threshold": 45.0},
    ]

    @staticmethod
    def get_environmental_analytics(
        mine_id: int,
        db: Session,
        range_type: TimeRangeEnum = TimeRangeEnum.LAST_30_DAYS,
        custom_start: Optional[datetime] = None,
        custom_end: Optional[datetime] = None,
    ) -> EnvironmentalAnalyticsDTO:
        mine = db.query(Mine).filter(Mine.id == mine_id).first()
        mine_name = mine.name if mine else f"Mine {mine_id}"
        is_sim = mine.is_simulated if mine else "NO"
        data_mode = "SIMULATED" if is_sim == "YES" else "OPERATIONAL"

        now = datetime.now(timezone.utc)
        tr = TimeRangeHelper.resolve_time_range(range_type, custom_start, custom_end, as_of=now)

        obs = db.query(EnvironmentalObservation).filter(
            EnvironmentalObservation.mine_id == mine_id,
            EnvironmentalObservation.detected_at >= tr.start_time,
            EnvironmentalObservation.detected_at <= tr.end_time
        ).order_by(EnvironmentalObservation.detected_at.asc()).all()

        total_obs = len(obs)
        total_dev = sum(1 for o in obs if o.observed_value > o.threshold_limit)
        active_dev = sum(1 for o in obs if o.observed_value > o.threshold_limit and o.status not in ["RESOLVED", "CLOSED"])

        # Group by parameter
        param_obs_map: Dict[str, List[EnvironmentalObservation]] = {}
        for o in obs:
            param_obs_map.setdefault(o.parameter_name, []).append(o)

        param_dtos: List[EnvironmentalParameterDTO] = []
        for p in EnvironmentalAnalyticsService.STANDARD_PARAMETERS:
            p_name = p["name"]
            p_records = param_obs_map.get(p_name, [])

            if not p_records:
                # Explicit NO_DATA handling (Do NOT default observed value to 0.0)
                param_dtos.append(
                    EnvironmentalParameterDTO(
                        parameter_name=p_name,
                        observation_count=0,
                        latest_value=None,
                        threshold_limit=p["default_threshold"],
                        unit=p["unit"],
                        deviation_count=0,
                        status="NO_DATA"
                    )
                )
            else:
                latest_rec = p_records[-1]
                p_dev_count = sum(1 for r in p_records if r.observed_value > r.threshold_limit)
                p_status = "DEVIATION" if (latest_rec.observed_value > latest_rec.threshold_limit) else "NORMAL"

                param_dtos.append(
                    EnvironmentalParameterDTO(
                        parameter_name=p_name,
                        observation_count=len(p_records),
                        latest_value=round(latest_rec.observed_value, 2),
                        threshold_limit=round(latest_rec.threshold_limit, 2),
                        unit=latest_rec.unit or p["unit"],
                        deviation_count=p_dev_count,
                        status=p_status
                    )
                )

        # Readings over time
        readings_trend: List[TimeSeriesPointDTO] = []
        for o in obs:
            readings_trend.append(
                TimeSeriesPointDTO(
                    date=o.detected_at.strftime("%Y-%m-%d %H:%M"),
                    value=round(o.observed_value, 2),
                    count=1,
                    label=f"{o.parameter_name}: {round(o.observed_value, 1)} {o.unit}",
                    entity_ids=[o.id]
                )
            )

        # Drilldown entities
        drilldown: List[DrillDownEntityDTO] = []
        for o in obs:
            drilldown.append(
                DrillDownEntityDTO(
                    id=o.id,
                    code=f"ENV-{o.id}",
                    title=f"{o.parameter_name} Observation ({o.observed_value} {o.unit})",
                    entity_type="ENVIRONMENTAL_OBSERVATION",
                    category=o.parameter_name,
                    severity=o.severity,
                    status=o.status,
                    timestamp=o.detected_at,
                    latitude=mine.latitude if mine else None,
                    longitude=mine.longitude if mine else None,
                    gis_context=f"Value: {o.observed_value} {o.unit}, Threshold: {o.threshold_limit}"
                )
            )

        data_quality = DataQualityDTO(
            record_count=total_obs,
            missing_periods=[] if total_obs > 0 else ["No environmental sensor observations detected."],
            data_mode=data_mode,
            is_simulated=is_sim,
            data_as_of=now,
            notes="Missing parameters explicitly mapped to status=NO_DATA (not 0)."
        )

        return EnvironmentalAnalyticsDTO(
            mine_id=mine_id,
            mine_name=mine_name,
            time_range=tr,
            data_as_of=now,
            data_quality=data_quality,
            total_observations=total_obs,
            total_deviations=total_dev,
            active_deviations=active_dev,
            parameters=param_dtos,
            readings_over_time=readings_trend,
            drilldown_entities=drilldown
        )
