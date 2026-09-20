from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.mine import Mine
from app.models.spatial import MineLevel, MineZone
from app.models.sensor import Sensor
from app.models.camera import Camera
from app.models.equipment import Equipment
from app.models.incident import Incident
from app.models.risk import RiskScore, AnomalyEvent
from app.schemas.mine import MineCreate, MineLevelCreate, MineZoneCreate, MineDigitalTwinResponse, MineRead, MineLevelRead, MineZoneRead
from app.core.exceptions import EntityNotFoundError, BusinessRuleViolationError
from app.services.audit_service import AuditService

class MineService:
    @staticmethod
    def get_all_mines(db: Session, allowed_mine_ids: Optional[List[int]] = None) -> List[Mine]:
        query = db.query(Mine)
        if allowed_mine_ids is not None:
            query = query.filter(Mine.id.in_(allowed_mine_ids))
        return query.all()

    @staticmethod
    def get_mine_by_id(db: Session, mine_id: int) -> Mine:
        mine = db.query(Mine).filter(Mine.id == mine_id).first()
        if not mine:
            raise EntityNotFoundError("Mine", mine_id)
        return mine

    @staticmethod
    def create_mine(db: Session, mine_in: MineCreate, creator_id: Optional[int] = None) -> Mine:
        existing = db.query(Mine).filter(Mine.code == mine_in.code).first()
        if existing:
            raise BusinessRuleViolationError(f"Mine with code {mine_in.code} already exists.")
        
        mine = Mine(**mine_in.model_dump())
        db.add(mine)
        db.commit()
        db.refresh(mine)
        
        AuditService.log_event(
            db=db,
            actor_id=creator_id,
            action="MINE_CREATED",
            resource_type="MINE",
            resource_id=str(mine.id),
            mine_id=mine.id,
            after_state=mine_in.model_dump()
        )
        return mine

    @staticmethod
    def add_level(db: Session, mine_id: int, level_in: MineLevelCreate) -> MineLevel:
        MineService.get_mine_by_id(db, mine_id)
        level = MineLevel(mine_id=mine_id, **level_in.model_dump())
        db.add(level)
        db.commit()
        db.refresh(level)
        return level

    @staticmethod
    def add_zone(db: Session, mine_id: int, zone_in: MineZoneCreate) -> MineZone:
        MineService.get_mine_by_id(db, mine_id)
        zone = MineZone(mine_id=mine_id, **zone_in.model_dump())
        db.add(zone)
        db.commit()
        db.refresh(zone)
        return zone

    @staticmethod
    def get_digital_twin_state(db: Session, mine_id: int) -> MineDigitalTwinResponse:
        mine = MineService.get_mine_by_id(db, mine_id)
        levels = db.query(MineLevel).filter(MineLevel.mine_id == mine_id).order_by(MineLevel.sequence_order).all()
        zones = db.query(MineZone).filter(MineZone.mine_id == mine_id).all()
        
        sensors = db.query(Sensor).filter(Sensor.mine_id == mine_id).all()
        cameras = db.query(Camera).filter(Camera.mine_id == mine_id).all()
        equipment = db.query(Equipment).filter(Equipment.mine_id == mine_id).all()
        incidents = db.query(Incident).filter(Incident.mine_id == mine_id, Incident.status != "CLOSED").all()
        anomalies = db.query(AnomalyEvent).filter(AnomalyEvent.mine_id == mine_id).order_by(AnomalyEvent.detected_at.desc()).limit(20).all()
        latest_risk = db.query(RiskScore).filter(RiskScore.mine_id == mine_id).order_by(RiskScore.generated_at.desc()).first()
        
        sensor_dicts = [{
            "id": s.id, "sensor_code": s.sensor_code, "name": s.name, "unit": s.unit,
            "sensor_type_code": s.sensor_type.code if s.sensor_type else "UNKNOWN",
            "status": s.status, "last_value": s.last_value, "last_reading_at": s.last_reading_at,
            "warning_threshold": s.warning_threshold, "critical_threshold": s.critical_threshold,
            "level_id": s.level_id, "zone_id": s.zone_id,
            "level_name": s.level.name if s.level else None,
            "zone_name": s.zone.name if s.zone else None,
            "x": s.x, "y": s.y, "z": s.z, "latitude": s.latitude, "longitude": s.longitude, "elevation": s.elevation,
            "trust_status": "SIMULATED" if mine.is_simulated == "YES" else "LIVE_TELEMETRY"
        } for s in sensors]
        
        camera_dicts = [{
            "id": c.id, "camera_code": c.camera_code, "name": c.name, "camera_type": c.camera_type,
            "status": c.status, "is_simulated": c.is_simulated, "stream_url": c.stream_url,
            "level_id": c.level_id, "zone_id": c.zone_id,
            "level_name": c.level.name if c.level else None,
            "zone_name": c.zone.name if c.zone else None,
            "x": c.x, "y": c.y, "z": c.z, "yaw": c.yaw, "pitch": c.pitch, "fov": c.fov,
            "trust_status": "SIMULATED"
        } for c in cameras]
        
        equipment_dicts = [{
            "id": e.id, "equipment_code": e.equipment_code, "name": e.name, "category": e.category,
            "status": e.status, "level_id": e.level_id, "zone_id": e.zone_id,
            "level_name": e.level.name if e.level else None,
            "zone_name": e.zone.name if e.zone else None,
            "x": e.x, "y": e.y, "z": e.z,
            "trust_status": "SIMULATED"
        } for e in equipment]
        
        incident_dicts = [{
            "id": inc.id, "incident_code": inc.incident_code, "title": inc.title,
            "severity": inc.severity, "status": inc.status, "category": inc.category,
            "level_id": inc.level_id, "zone_id": inc.zone_id,
            "level_name": inc.level.name if inc.level else None,
            "zone_name": inc.zone.name if inc.zone else None,
            "x": inc.x, "y": inc.y, "z": inc.z, "created_at": inc.created_at,
            "trust_status": "DEMO_INCIDENT" if mine.is_simulated == "YES" else "FIELD_REPORTED"
        } for inc in incidents]
        
        anomaly_dicts = [{
            "id": a.id, "anomaly_type": a.anomaly_type, "severity": a.severity,
            "sensor_id": a.sensor_id,
            "sensor_code": a.sensor.sensor_code if a.sensor else None,
            "sensor_name": a.sensor.name if a.sensor else None,
            "observed_value": a.observed_value, "threshold_limit": a.threshold_limit,
            "description": a.description, "detected_at": a.detected_at,
            "x": a.x, "y": a.y, "z": a.z, "source": a.source, "status": a.status,
            "trust_status": "SIMULATED"
        } for a in anomalies]

        # Phase 11B: Source-Derived Spatial Foundation & Provenance
        from app.services.spatial_transformation_service import SpatialTransformationService
        from app.models.real_mine_data import (
            MineProfile, MineBoundary, MineCoordinate, MineSeam, MineDataQualityRecord
        )

        profile = db.query(MineProfile).filter(MineProfile.mine_id == mine_id).first()
        boundary_record = db.query(MineBoundary).filter(MineBoundary.mine_id == mine_id).first()
        coord_records = db.query(MineCoordinate).filter(MineCoordinate.mine_id == mine_id).order_by(MineCoordinate.sequence_order.asc()).all()
        seam_records = db.query(MineSeam).filter(MineSeam.mine_id == mine_id).order_by(MineSeam.sequence_order.asc()).all()
        quality_rec = db.query(MineDataQualityRecord).filter(MineDataQualityRecord.mine_id == mine_id).first()

        origin_lat = mine.latitude if mine.latitude is not None else 23.0
        origin_lon = mine.longitude if mine.longitude is not None else 85.0
        origin_elev = mine.elevation if mine.elevation is not None else 0.0

        # Spatial Reference Metadata
        spatial_ref = {
            "source_crs": boundary_record.coordinate_system if boundary_record else "WGS84_GEOGRAPHIC",
            "source_datum": boundary_record.datum if boundary_record else "WGS84",
            "visualization_crs": "LOCAL_MINE_FRAME_METRIC (X: Easting m, Y: Elevation m, Z: Southing m)",
            "origin_reference": {
                "latitude": origin_lat,
                "longitude": origin_lon,
                "elevation": origin_elev
            },
            "transformation_method": "LOCAL_TANGENT_PLANE (Equirectangular displacement from origin)",
            "unit": "meters"
        }

        # Projected Cardinal Coordinates
        projected_coords = SpatialTransformationService.project_cardinal_coordinates(
            coord_records, origin_lat, origin_lon, default_y=origin_elev
        )

        # Projected Boundary Polygon / Bounding Box
        boundary_dict = None
        if boundary_record:
            if boundary_record.boundary_type == "POLYGON" and len(projected_coords) > 0:
                boundary_vertices = [{"x": c["local_x"], "y": c["local_y"], "z": c["local_z"], "label": c["point_label"]} for c in projected_coords]
            else:
                boundary_vertices = SpatialTransformationService.project_boundary_polygon(
                    boundary_record.min_latitude,
                    boundary_record.max_latitude,
                    boundary_record.min_longitude,
                    boundary_record.max_longitude,
                    origin_lat,
                    origin_lon,
                    y_elev=origin_elev
                )

            prov_dict = None
            if boundary_record.provenance:
                prov_dict = {
                    "document_title": boundary_record.provenance.document_title,
                    "document_filename": boundary_record.provenance.document_filename,
                    "document_hash": boundary_record.provenance.document_hash,
                    "page_number": boundary_record.provenance.page_number,
                    "section_heading": boundary_record.provenance.section_heading,
                    "authority_level": boundary_record.provenance.authority_level,
                    "data_status": boundary_record.provenance.data_status
                }

            boundary_dict = {
                "boundary_type": boundary_record.boundary_type,
                "description": boundary_record.description,
                "datum": boundary_record.datum,
                "coordinate_system": boundary_record.coordinate_system,
                "geometry_status": boundary_record.geometry_status,
                "min_latitude": boundary_record.min_latitude,
                "max_latitude": boundary_record.max_latitude,
                "min_longitude": boundary_record.min_longitude,
                "max_longitude": boundary_record.max_longitude,
                "raw_coordinate_text": boundary_record.raw_coordinate_text,
                "vertices_3d": boundary_vertices,
                "provenance": prov_dict
            }

        # Stratigraphic Seam Data
        seams_list = []
        for s in seam_records:
            prov_dict = None
            if s.provenance:
                prov_dict = {
                    "document_title": s.provenance.document_title,
                    "document_filename": s.provenance.document_filename,
                    "document_hash": s.provenance.document_hash,
                    "page_number": s.provenance.page_number,
                    "section_heading": s.provenance.section_heading
                }
            seams_list.append({
                "id": s.id,
                "seam_name": s.seam_name,
                "sequence_order": s.sequence_order,
                "thickness_min_m": s.thickness_min_m,
                "thickness_max_m": s.thickness_max_m,
                "thickness_raw": s.thickness_raw,
                "depth_min_m": s.depth_min_m,
                "depth_max_m": s.depth_max_m,
                "geological_reserve_mt": s.geological_reserve_mt,
                "geological_reserve_raw": s.geological_reserve_raw,
                "extractable_reserve_mt": s.extractable_reserve_mt,
                "extractable_reserve_raw": s.extractable_reserve_raw,
                "grade": s.grade,
                "mining_method": s.mining_method,
                "workability_status": s.workability_status,
                "data_status": s.data_status,
                "provenance": prov_dict
            })

        # Profile dict
        profile_dict = None
        if profile:
            profile_dict = {
                "official_name": profile.official_name,
                "normalized_name": profile.normalized_name,
                "display_name": profile.display_name,
                "coalfield": profile.coalfield,
                "state": profile.state,
                "district": profile.district,
                "geological_block_area_sq_km": profile.geological_block_area_sq_km,
                "mining_lease_area_ha": profile.mining_lease_area_ha,
                "forest_area_ha": profile.forest_area_ha,
                "non_forest_area_ha": profile.non_forest_area_ha,
                "total_geological_reserve_mt": profile.total_geological_reserve_mt,
                "total_extractable_reserve_mt": profile.total_extractable_reserve_mt,
                "target_capacity_raw": profile.target_capacity_raw,
                "mining_method_documented": profile.mining_method_documented,
                "average_grade_documented": profile.average_grade_documented,
                "prior_allocatee_name": profile.prior_allocatee_name,
                "data_status": profile.data_status,
                "geometry_status": profile.geometry_status,
                "validation_status": profile.validation_status
            }

        # Data Completeness
        completeness = SpatialTransformationService.compute_data_completeness(
            mine, boundary_record, coord_records, seam_records
        )

        quality_dict = None
        if quality_rec:
            quality_dict = {
                "overall_status": quality_rec.overall_status,
                "source_coverage": quality_rec.source_coverage,
                "provenance_coverage": quality_rec.provenance_coverage,
                "validation_errors": quality_rec.validation_errors,
                "approximate_geometry": quality_rec.approximate_geometry,
                "survey_grade_geometry": quality_rec.survey_grade_geometry,
                "total_attributes_extracted": quality_rec.total_attributes_extracted
            }
        
        return MineDigitalTwinResponse(
            mine=MineRead.model_validate(mine),
            levels=[MineLevelRead.model_validate(lvl) for lvl in levels],
            zones=[MineZoneRead.model_validate(z) for z in zones],
            sensors=sensor_dicts,
            cameras=camera_dicts,
            equipment=equipment_dicts,
            active_incidents=incident_dicts,
            anomalies=anomaly_dicts,
            current_risk_score=latest_risk.score if latest_risk else 24.5,
            current_risk_severity=latest_risk.severity if latest_risk else "LOW",
            profile=profile_dict,
            spatial_reference=spatial_ref,
            boundary=boundary_dict,
            coordinates=projected_coords,
            seams=seams_list,
            data_completeness=completeness,
            quality_record=quality_dict
        )

