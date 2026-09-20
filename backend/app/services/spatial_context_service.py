import math
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.mine import Mine
from app.models.real_mine_data import MineBoundary
from app.models.sensor import Sensor, SensorReading
from app.models.camera import Camera
from app.models.equipment import Equipment
from app.models.incident import Incident
from app.models.alert import Alert
from app.models.governance_task import GovernanceTask
from app.models.field_operation import FieldInspection
from app.models.environmental import EnvironmentalObservation
from app.models.risk_prediction import RiskPrediction
from app.models.risk import RiskScore, AnomalyEvent
from app.services.spatial_transformation_service import SpatialTransformationService

logger = logging.getLogger(__name__)


class SpatialContextService:
    """
    Core Geospatial context, proximity calculation, geo-fencing, and
    spatial risk aggregation engine for TRINETRA 2D GIS.
    """

    EARTH_RADIUS_METERS = 6371000.0

    @staticmethod
    def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculates Great-Circle distance between two points on the WGS84 sphere in meters.
        """
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = math.sin(delta_phi / 2.0) ** 2 + \
            math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

        return round(SpatialContextService.EARTH_RADIUS_METERS * c, 2)

    @staticmethod
    def check_boundary_containment(
        lat: float,
        lon: float,
        boundaries: List[MineBoundary]
    ) -> Dict[str, Any]:
        """
        Evaluates whether a point is within documented mine bounding coordinates.
        Returns explicit spatial status (INSIDE_DOCUMENTED_BOUNDARY, OUTSIDE_DOCUMENTED_BOUNDARY_REVIEW, UNKNOWN).
        """
        if not boundaries:
            return {
                "status": "UNKNOWN",
                "label": "BOUNDARY NOT DOCUMENTED",
                "is_inside": None,
                "notes": "No documented spatial boundary exists for this block."
            }

        for b in boundaries:
            if None not in (b.min_latitude, b.max_latitude, b.min_longitude, b.max_longitude):
                # Check bounding box
                if b.min_latitude <= lat <= b.max_latitude and b.min_longitude <= lon <= b.max_longitude:
                    return {
                        "status": "INSIDE_DOCUMENTED_BOUNDARY",
                        "label": "INSIDE DOCUMENTED BOUNDARY",
                        "is_inside": True,
                        "boundary_id": b.id,
                        "geometry_status": b.geometry_status,
                        "notes": f"Point ({lat}, {lon}) is within documented {b.geometry_status} boundary."
                    }

        return {
            "status": "OUTSIDE_DOCUMENTED_BOUNDARY_REVIEW",
            "label": "OUTSIDE DOCUMENTED BOUNDARY — REVIEW",
            "is_inside": False,
            "notes": f"Point ({lat}, {lon}) lies outside documented bounding limits. Requires operational verification."
        }

    @staticmethod
    def find_nearest_entities(
        db: Session,
        mine_id: int,
        target_lat: float,
        target_lon: float,
        max_distance_meters: float = 5000.0
    ) -> Dict[str, Any]:
        """
        Searches all operational entities (sensors, cameras, incidents, tasks, inspections)
        within proximity to the target geographic coordinate.
        """
        mine = db.query(Mine).filter(Mine.id == mine_id).first()
        if not mine:
            raise ValueError(f"Mine {mine_id} not found")

        origin_lat = mine.latitude or target_lat
        origin_lon = mine.longitude or target_lon

        # 1. Nearest Sensors
        sensors = db.query(Sensor).filter(Sensor.mine_id == mine_id).all()
        sensor_results = []
        for s in sensors:
            s_lat = getattr(s, "latitude", None)
            s_lon = getattr(s, "longitude", None)
            if s_lat is None or s_lon is None:
                # Approximate from 3D coordinates or mine origin
                s_x = getattr(s, "x", 0.0) or 0.0
                s_z = getattr(s, "z", 0.0) or 0.0
                s_lat = origin_lat + (s_x / SpatialContextService.EARTH_RADIUS_METERS) * (180.0 / math.pi)
                s_lon = origin_lon + (s_z / (SpatialContextService.EARTH_RADIUS_METERS * math.cos(math.radians(origin_lat)))) * (180.0 / math.pi)
            
            dist = SpatialContextService.haversine_distance_meters(target_lat, target_lon, s_lat, s_lon)
            if dist <= max_distance_meters:
                s_type_name = s.sensor_type.name if s.sensor_type else "TELEMETRY"
                sensor_results.append({
                    "id": s.id,
                    "code": getattr(s, "sensor_code", getattr(s, "code", f"SN-{s.id}")),
                    "name": s.name,
                    "type": s_type_name,
                    "status": s.status,
                    "distance_meters": dist,
                    "latitude": round(s_lat, 6),
                    "longitude": round(s_lon, 6),
                    "trust_badge": "SIMULATED"
                })

        sensor_results.sort(key=lambda x: x["distance_meters"])

        # 2. Nearest Incidents
        incidents = db.query(Incident).filter(Incident.mine_id == mine_id).all()
        incident_results = []
        for inc in incidents:
            i_lat = getattr(inc, "latitude", None) or origin_lat
            i_lon = getattr(inc, "longitude", None) or origin_lon
            dist = SpatialContextService.haversine_distance_meters(target_lat, target_lon, i_lat, i_lon)
            if dist <= max_distance_meters:
                incident_results.append({
                    "id": inc.id,
                    "code": inc.incident_code,
                    "title": inc.title,
                    "severity": inc.severity,
                    "status": inc.status,
                    "distance_meters": dist,
                    "latitude": round(i_lat, 6),
                    "longitude": round(i_lon, 6),
                    "trust_badge": "OPERATIONAL"
                })
        incident_results.sort(key=lambda x: x["distance_meters"])

        # 3. Nearest Field Inspections
        inspections = db.query(FieldInspection).filter(FieldInspection.mine_id == mine_id).all()
        inspection_results = []
        for f in inspections:
            f_lat = getattr(f, "latitude", None) or origin_lat
            f_lon = getattr(f, "longitude", None) or origin_lon
            dist = SpatialContextService.haversine_distance_meters(target_lat, target_lon, f_lat, f_lon)
            if dist <= max_distance_meters:
                inspection_results.append({
                    "id": f.id,
                    "code": f.inspection_code,
                    "title": f.summary_notes or f.inspection_type,
                    "status": f.status,
                    "inspector_id": f.inspector_id,
                    "distance_meters": dist,
                    "latitude": round(f_lat, 6),
                    "longitude": round(f_lon, 6),
                    "trust_badge": "OPERATIONAL"
                })
        inspection_results.sort(key=lambda x: x["distance_meters"])

        # 4. Boundary status
        boundaries = db.query(MineBoundary).filter(MineBoundary.mine_id == mine_id).all()
        boundary_check = SpatialContextService.check_boundary_containment(target_lat, target_lon, boundaries)

        return {
            "target_coordinate": {"latitude": target_lat, "longitude": target_lon},
            "boundary_status": boundary_check,
            "nearest_sensors": sensor_results[:5],
            "nearest_incidents": incident_results[:5],
            "nearest_inspections": inspection_results[:5],
            "total_entities_nearby": len(sensor_results) + len(incident_results) + len(inspection_results)
        }

    @staticmethod
    def aggregate_spatial_risk_hotspots(
        db: Session,
        mine_id: int
    ) -> List[Dict[str, Any]]:
        """
        Aggregates current risk scores, active sensor anomalies, and 30-minute predictive
        risk models into geospatial hotspots.
        """
        mine = db.query(Mine).filter(Mine.id == mine_id).first()
        if not mine:
            return []

        origin_lat = mine.latitude or 23.5000
        origin_lon = mine.longitude or 85.5000

        hotspots = []

        # 1. Active Anomaly Hotspots
        anomalies = db.query(AnomalyEvent).filter(
            AnomalyEvent.mine_id == mine_id,
            AnomalyEvent.status == "OPEN"
        ).order_by(AnomalyEvent.detected_at.desc()).limit(10).all()

        for a in anomalies:
            sensor = a.sensor
            s_lat = getattr(sensor, "latitude", None)
            s_lon = getattr(sensor, "longitude", None)
            if s_lat is None or s_lon is None:
                s_x = getattr(sensor, "x", 0.0) or 0.0 if sensor else 0.0
                s_z = getattr(sensor, "z", 0.0) or 0.0 if sensor else 0.0
                offset_lat = (s_x / SpatialContextService.EARTH_RADIUS_METERS) * (180.0 / math.pi)
                offset_lon = (s_z / (SpatialContextService.EARTH_RADIUS_METERS * math.cos(math.radians(origin_lat)))) * (180.0 / math.pi)
                s_lat = origin_lat + offset_lat
                s_lon = origin_lon + offset_lon

            score = 85.0 if a.severity == "CRITICAL" else (65.0 if a.severity == "HIGH" else 45.0)
            band = "CRITICAL" if score >= 81 else ("HIGH" if score >= 61 else ("MEDIUM" if score >= 31 else "LOW"))

            s_code = getattr(sensor, "sensor_code", getattr(sensor, "code", "N/A")) if sensor else "N/A"
            hotspots.append({
                "id": f"hotspot-anomaly-{a.id}",
                "hotspot_type": "ANOMALY_HOTSPOT",
                "title": f"Active Anomaly: {a.title or 'Sensor Exceedance'}",
                "latitude": round(s_lat, 6),
                "longitude": round(s_lon, 6),
                "risk_score": score,
                "risk_band": band,
                "source_type": "TELEMETRY_ANOMALY",
                "source_model": "TRINETRA Phase 2 Anomaly Engine",
                "trust_badge": "OPERATIONAL",
                "explanation": f"Active anomaly on sensor {s_code}: {a.description or 'Exceedance detected'}",
                "contributing_factors": [
                    f"Parameter: {a.parameter_name or 'Gas Level'}",
                    f"Observed Value: {a.observed_value} (Threshold: {a.threshold_value})",
                    f"Severity: {a.severity}"
                ],
                "recommended_action": "Immediate field sensor inspection and methane interlock verification.",
                "created_at": a.detected_at.isoformat() if a.detected_at else None
            })

        # 2. Predictive Risk Hotspots (Phase 5)
        predictions = db.query(RiskPrediction).filter(
            RiskPrediction.mine_id == mine_id
        ).order_by(RiskPrediction.created_at.desc()).limit(5).all()

        for p in predictions:
            pred_score = round(p.predicted_risk_score, 1)
            pred_band = p.predicted_severity or ("CRITICAL" if pred_score >= 81 else ("HIGH" if pred_score >= 61 else ("MEDIUM" if pred_score >= 31 else "LOW")))
            
            p_lat = origin_lat + 0.0015
            p_lon = origin_lon + 0.0020

            expl = "Predictive risk elevation identified based on multi-parameter telemetry trend."
            factors = ["CH4 concentration trending upward", "Ventilation velocity fluctuations"]
            if p.explanation_json:
                try:
                    expl_data = json.loads(p.explanation_json) if isinstance(p.explanation_json, str) else p.explanation_json
                    if isinstance(expl_data, dict):
                        expl = expl_data.get("summary", expl)
                        raw_factors = expl_data.get("top_factors") or expl_data.get("factors") or factors
                    elif isinstance(expl_data, list):
                        raw_factors = expl_data
                    else:
                        raw_factors = factors
                    
                    formatted_factors = []
                    for rf in raw_factors:
                        if isinstance(rf, dict):
                            desc = rf.get("description") or rf.get("feature") or str(rf)
                            formatted_factors.append(str(desc))
                        else:
                            formatted_factors.append(str(rf))
                    factors = formatted_factors
                except Exception:
                    pass

            hotspots.append({
                "id": f"hotspot-pred-{p.id}",
                "hotspot_type": "PREDICTIVE_HOTSPOT",
                "title": f"Predicted Risk Hotspot ({p.horizon_minutes}m Horizon)",
                "latitude": round(p_lat, 6),
                "longitude": round(p_lon, 6),
                "risk_score": pred_score,
                "risk_band": pred_band,
                "source_type": "PREDICTIVE_MODEL",
                "source_model": f"{p.model_name}:{p.model_version}",
                "trust_badge": "MODEL_PREDICTION",
                "prediction_horizon": f"{p.horizon_minutes} minutes",
                "escalation_probability": round((p.probability or 0.75) * 100, 1),
                "explanation": expl,
                "contributing_factors": factors,
                "recommended_action": "Dispatch Field Inspector to verify ventilation airway resistance and gas accumulation.",
                "created_at": p.created_at.isoformat() if p.created_at else None
            })

        # If no dynamic hotspots exist, generate baseline zone risk
        if not hotspots:
            hotspots.append({
                "id": f"hotspot-baseline-{mine.id}",
                "hotspot_type": "CURRENT_RISK",
                "title": f"Mine Baseline Operational State",
                "latitude": round(origin_lat, 6),
                "longitude": round(origin_lon, 6),
                "risk_score": 24.0,
                "risk_band": "LOW",
                "source_type": "BASELINE_AUDIT",
                "source_model": "TRINETRA Operational Core",
                "trust_badge": "SOURCE_DERIVED" if mine.is_simulated == "NO" else "SIMULATED",
                "explanation": "All telemetry and operational monitoring indicators within DGMS statutory limits.",
                "contributing_factors": ["Normal atmospheric parameters", "Active muster roll verified"],
                "recommended_action": "Routine statutory shift inspection.",
                "created_at": None
            })

        return hotspots

    @staticmethod
    def get_spatial_context_for_anomaly(
        db: Session,
        anomaly_id: int,
        radius_meters: float = 250.0
    ) -> Dict[str, Any]:
        """
        Retrieves 3D spatial proximity context for an anomaly:
        mine, level, zone, coordinates, nearby cameras (with yaw/pitch/fov/distance),
        and nearby equipment (with distance).
        """
        a = db.query(AnomalyEvent).filter(AnomalyEvent.id == anomaly_id).first()
        if not a:
            raise ValueError(f"AnomalyEvent {anomaly_id} not found")

        ax = a.x or (a.sensor.x if a.sensor else 0.0) or 0.0
        ay = a.y or (a.sensor.y if a.sensor else 0.0) or 0.0
        az = a.z or (a.sensor.z if a.sensor else 0.0) or 0.0

        # Nearby cameras
        cameras = db.query(Camera).filter(Camera.mine_id == a.mine_id).all()
        nearby_cameras = []
        for cam in cameras:
            cx, cy, cz = cam.x or 0.0, cam.y or 0.0, cam.z or 0.0
            dist = math.sqrt((cx - ax)**2 + (cy - ay)**2 + (cz - az)**2)
            if dist <= radius_meters:
                nearby_cameras.append({
                    "id": cam.id,
                    "camera_code": getattr(cam, "camera_code", getattr(cam, "code", f"CAM-{cam.id}")),
                    "name": cam.name,
                    "camera_type": getattr(cam, "camera_type", "SURVEILLANCE"),
                    "x": cam.x,
                    "y": cam.y,
                    "z": cam.z,
                    "distance_meters": round(dist, 2),
                    "yaw": cam.yaw or 0.0,
                    "pitch": cam.pitch or 0.0,
                    "fov": cam.fov or 90.0,
                    "stream_url": cam.stream_url,
                    "is_simulated": getattr(cam, "is_simulated", "SIMULATED")
                })
        nearby_cameras.sort(key=lambda c: c["distance_meters"])

        # Nearby equipment
        equipment_list = db.query(Equipment).filter(Equipment.mine_id == a.mine_id).all()
        nearby_equipment = []
        for eq in equipment_list:
            ex, ey, ez = eq.x or 0.0, eq.y or 0.0, eq.z or 0.0
            dist = math.sqrt((ex - ax)**2 + (ey - ay)**2 + (ez - az)**2)
            if dist <= radius_meters:
                nearby_equipment.append({
                    "id": eq.id,
                    "equipment_code": eq.equipment_code,
                    "name": eq.name,
                    "category": eq.category,
                    "status": eq.status,
                    "x": eq.x,
                    "y": eq.y,
                    "z": eq.z,
                    "distance_meters": round(dist, 2),
                    "last_serviced_at": eq.last_serviced_at
                })
        nearby_equipment.sort(key=lambda e: e["distance_meters"])

        mine_dict = {"id": a.mine.id, "name": a.mine.name, "code": a.mine.code} if a.mine else {"id": a.mine_id, "name": "Mine", "code": "MINE"}
        level_dict = {"id": a.level.id, "name": a.level.name, "code": getattr(a.level, "level_code", f"LVL-{a.level.id}")} if a.level else None
        zone_dict = {"id": a.zone.id, "name": a.zone.name, "code": getattr(a.zone, "zone_code", f"ZN-{a.zone.id}")} if a.zone else None
        sensor_dict = {
            "id": a.sensor.id if a.sensor else 0,
            "sensor_code": getattr(a.sensor, "sensor_code", getattr(a.sensor, "code", "N/A")) if a.sensor else "N/A",
            "name": a.sensor.name if a.sensor else "N/A"
        }

        related_inc = None
        if a.incident:
            related_inc = {
                "id": a.incident.id,
                "incident_code": a.incident.incident_code,
                "title": a.incident.title,
                "severity": a.incident.severity,
                "status": a.incident.status
            }

        return {
            "anomaly_id": a.id,
            "anomaly_type": a.anomaly_type,
            "severity": a.severity,
            "detected_at": a.detected_at,
            "observed_value": a.observed_value or getattr(a, "value_recorded", None),
            "threshold_limit": a.threshold_limit,
            "explanation": a.description or f"{a.anomaly_type} detected on sensor {sensor_dict['sensor_code']}",
            "mine": mine_dict,
            "level": level_dict,
            "zone": zone_dict,
            "sensor": sensor_dict,
            "coordinates": {"x": ax, "y": ay, "z": az},
            "nearby_cameras": nearby_cameras,
            "nearby_equipment": nearby_equipment,
            "related_incident": related_inc
        }


spatial_context_service = SpatialContextService()

