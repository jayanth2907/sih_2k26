import math
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.authz import (
    get_current_active_user,
    check_mine_access,
    require_mine_access,
    require_roles,
    get_user_roles,
    get_user_assigned_mine_ids
)
from app.core.permissions import RoleEnum
from app.models.user import User
from app.models.mine import Mine
from app.models.real_mine_data import (
    MineProfile,
    MineBoundary,
    MineCoordinate,
    MineSeam,
    DataProvenance
)
from app.models.sensor import Sensor
from app.models.risk import AnomalyEvent
from app.models.camera import Camera
from app.models.equipment import Equipment
from app.models.incident import Incident
from app.models.alert import Alert
from app.models.governance_task import GovernanceTask
from app.models.field_operation import FieldInspection
from app.models.environmental import EnvironmentalObservation
from app.models.external_integration import ExternalEventLog
from app.models.risk import RiskScore
from app.schemas.gis import (
    GisMapResponse,
    GisMineMetadata,
    GisBoundaryFeature,
    GisCoordinateFeature,
    GisSeamFeature,
    GisOperationalFeature,
    GisRiskHotspot,
    GisTrustMetrics,
    GisDashboardStats,
    GisProvenanceRead,
    SpatialContextResponse,
    GisSearchResponse,
    GisSearchItem
)
from app.services.spatial_transformation_service import SpatialTransformationService
from app.services.spatial_context_service import spatial_context_service
from app.services.audit_service import AuditService

router = APIRouter(prefix="/gis", tags=["2D GIS & Spatial Governance"])


@router.get("/mines/{mine_id}/map", response_model=GisMapResponse)
def get_mine_gis_map(
    mine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Returns complete 2D GIS map package for an authorized mine including:
    - Documented mine boundaries with provenance
    - Source-derived surveyed coordinates
    - Documented geological seams
    - Operational and simulated overlays (Sensors, Cameras, Incidents, Alerts, Tasks, CMSMS)
    - Spatial risk aggregation & predictive hotspots
    - Live data trust counters and dashboard metrics
    """
    if not check_mine_access(current_user, mine_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User {current_user.email} not authorized for Mine {mine_id}"
        )

    mine = db.query(Mine).filter(Mine.id == mine_id).first()
    if not mine:
        raise HTTPException(status_code=404, detail=f"Mine {mine_id} not found")

    profile = db.query(MineProfile).filter(MineProfile.mine_id == mine_id).first()
    origin_lat = mine.latitude or 23.5000
    origin_lon = mine.longitude or 85.5000

    # 1. Metadata
    prov_title = profile.provenance.document_title if profile and profile.provenance else "Official Mine Summary"
    prov_hash = profile.provenance.document_hash if profile and profile.provenance else "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

    mine_meta = GisMineMetadata(
        id=mine.id,
        code=mine.code,
        name=mine.name,
        official_name=profile.official_name if profile else mine.name,
        state=mine.state,
        district=mine.district,
        latitude=origin_lat,
        longitude=origin_lon,
        total_area_sq_km=profile.geological_block_area_sq_km if profile else None,
        data_status=mine.data_status,
        geometry_status=profile.geometry_status if profile else "SOURCE_DERIVED",
        is_simulated=mine.is_simulated,
        provenance_doc=prov_title,
        provenance_hash=prov_hash
    )

    # 2. Source Coordinates
    coords_db = db.query(MineCoordinate).filter(MineCoordinate.mine_id == mine_id).order_by(MineCoordinate.sequence_order.asc()).all()
    coord_features: List[GisCoordinateFeature] = []

    for c in coords_db:
        prov = None
        if c.provenance:
            prov = GisProvenanceRead(
                document_title=c.provenance.document_title,
                document_filename=c.provenance.document_filename,
                document_hash=c.provenance.document_hash,
                page_number=c.provenance.page_number,
                section_heading=c.provenance.section_heading,
                authority_level=c.provenance.authority_level,
                data_status=c.provenance.data_status,
                source_text_reference=c.provenance.source_text_reference
            )

        lx, lz = 0.0, 0.0
        if c.latitude is not None and c.longitude is not None:
            lx, lz = SpatialTransformationService.lat_lon_to_local_meters(c.latitude, c.longitude, origin_lat, origin_lon)

        coord_features.append(
            GisCoordinateFeature(
                id=c.id,
                point_label=c.point_label,
                latitude=c.latitude,
                longitude=c.longitude,
                lat_dms_raw=c.lat_dms_raw,
                lon_dms_raw=c.lon_dms_raw,
                local_x=lx,
                local_z=lz,
                datum=c.datum,
                geometry_status=c.geometry_status,
                provenance=prov
            )
        )

    # 3. Boundaries
    boundaries_db = db.query(MineBoundary).filter(MineBoundary.mine_id == mine_id).all()
    boundary_features: List[GisBoundaryFeature] = []

    # --- Helper: generate a realistic irregular coal-lease polygon ---
    # Produces an authentic ~1.2-2 sq km irregular polygon from a mine centre.
    # Uses a deterministic seed per mine_id so the shape is stable across requests.
    def _make_realistic_mine_polygon(clat: float, clon: float, seed: int) -> list:
        """
        Returns GeoJSON ring [[lon, lat], ...] for an irregular coal-block polygon.
        Shape is generated with 10 vertices at varying radii (180m – 700m) and
        angular offsets that differ per mine_id, giving each mine a unique outline.
        Earth radius constants for lat/lon degree conversion at Indian coalfield latitudes.
        """
        import math as _math
        R_LAT = 111320.0          # metres per degree latitude
        R_LON = 111320.0 * _math.cos(_math.radians(clat))  # metres per degree longitude

        # Per-mine shape parameters — deterministic variations via seed
        n_verts = 10
        # Base radii (metres) — elongated NE-SW like typical lease areas
        base_radii = [320, 480, 620, 550, 380, 280, 350, 500, 650, 420]
        # Random-ish offsets baked in so the polygon is irregular, not circular
        radius_jitter = [
            (seed % 7) * 18 - 40,
            (seed % 5) * 22 - 30,
            (seed % 11) * 15 - 50,
            (seed % 3) * 30 - 20,
            (seed % 9) * 12 - 35,
            (seed % 13) * 10 - 25,
            (seed % 7) * 20 - 30,
            (seed % 11) * 18 - 45,
            (seed % 5) * 25 - 38,
            (seed % 3) * 15 - 22
        ]
        # Rotate whole polygon slightly per mine for uniqueness
        base_rotation_deg = (seed * 37) % 45 - 20  # -20° to +25°

        vertices = []
        for i in range(n_verts):
            angle_deg = (i * 360.0 / n_verts) + base_rotation_deg
            angle_rad = _math.radians(angle_deg)
            r = base_radii[i] + radius_jitter[i]
            r = max(r, 150)  # minimum 150 m from centre
            # x = East offset (metres), y = North offset (metres)
            dx = r * _math.sin(angle_rad)
            dy = r * _math.cos(angle_rad)
            v_lat = clat + dy / R_LAT
            v_lon = clon + dx / R_LON
            vertices.append([round(v_lon, 6), round(v_lat, 6)])

        # Close the ring
        vertices.append(vertices[0])
        return vertices

    for b in boundaries_db:
        prov = None
        if b.provenance:
            prov = GisProvenanceRead(
                document_title=b.provenance.document_title,
                document_filename=b.provenance.document_filename,
                document_hash=b.provenance.document_hash,
                page_number=b.provenance.page_number,
                section_heading=b.provenance.section_heading,
                authority_level=b.provenance.authority_level,
                data_status=b.provenance.data_status,
                source_text_reference=b.provenance.source_text_reference
            )

        # Build GeoJSON ring [ [lon, lat], ... ]
        # Priority 1: Surveyed coordinate polygon from MineCoordinate table
        # Priority 2: Bounding box from min/max lat/lon
        # Priority 3: Realistic synthetic polygon from mine centre
        geojson_ring = []
        if coords_db and len(coords_db) >= 3 and b.boundary_type == "POLYGON":
            geojson_ring = [[c.longitude, c.latitude] for c in coords_db if c.longitude is not None and c.latitude is not None]
            if geojson_ring and (geojson_ring[0][0] != geojson_ring[-1][0] or geojson_ring[0][1] != geojson_ring[-1][1]):
                geojson_ring.append(geojson_ring[0])  # Close loop
        elif None not in (b.min_latitude, b.max_latitude, b.min_longitude, b.max_longitude):
            # Use real bbox from DB — this is already accurate for real coal blocks
            geojson_ring = [
                [b.min_longitude, b.max_latitude],  # NW
                [b.max_longitude, b.max_latitude],  # NE
                [b.max_longitude, b.min_latitude],  # SE
                [b.min_longitude, b.min_latitude],  # SW
                [b.min_longitude, b.max_latitude]   # Closed loop
            ]
        else:
            # Fallback: realistic irregular polygon from mine centre
            geojson_ring = _make_realistic_mine_polygon(origin_lat, origin_lon, mine_id)

        boundary_features.append(
            GisBoundaryFeature(
                id=b.id,
                boundary_type=b.boundary_type,
                min_latitude=b.min_latitude,
                max_latitude=b.max_latitude,
                min_longitude=b.min_longitude,
                max_longitude=b.max_longitude,
                geometry_status=b.geometry_status,
                area_sq_km=profile.geological_block_area_sq_km if profile else None,
                coordinates_geojson=geojson_ring,
                provenance=prov
            )
        )

    # If no boundary records exist at all (demo mines), synthesise one realistic polygon
    if not boundaries_db:
        synth_ring = _make_realistic_mine_polygon(origin_lat, origin_lon, mine_id)
        boundary_features.append(
            GisBoundaryFeature(
                id=-1,
                boundary_type="POLYGON",
                min_latitude=None,
                max_latitude=None,
                min_longitude=None,
                max_longitude=None,
                geometry_status="APPROXIMATE",
                area_sq_km=None,
                coordinates_geojson=synth_ring,
                provenance=None
            )
        )

    # 4. Seams
    seams_db = db.query(MineSeam).filter(MineSeam.mine_id == mine_id).order_by(MineSeam.sequence_order.asc()).all()
    seam_features: List[GisSeamFeature] = []
    for s in seams_db:
        prov = None
        if s.provenance:
            prov = GisProvenanceRead(
                document_title=s.provenance.document_title,
                document_filename=s.provenance.document_filename,
                document_hash=s.provenance.document_hash,
                page_number=s.provenance.page_number,
                section_heading=s.provenance.section_heading,
                authority_level=s.provenance.authority_level,
                data_status=s.provenance.data_status,
                source_text_reference=s.provenance.source_text_reference
            )
        seam_features.append(
            GisSeamFeature(
                id=s.id,
                seam_name=s.seam_name,
                thickness_min_m=s.thickness_min_m,
                thickness_max_m=s.thickness_max_m,
                depth_min_m=s.depth_min_m,
                depth_max_m=s.depth_max_m,
                geological_reserve_mt=s.geological_reserve_mt,
                is_schematic=True,
                provenance=prov
            )
        )

    # 5. Operational Features
    operational_features: List[GisOperationalFeature] = []

    # Sensors
    sensors = db.query(Sensor).filter(Sensor.mine_id == mine_id).all()
    for s in sensors:
        s_lat = getattr(s, "latitude", None)
        s_lon = getattr(s, "longitude", None)
        if s_lat is None or s_lon is None:
            s_x = getattr(s, "x", 0.0) or 0.0
            s_z = getattr(s, "z", 0.0) or 0.0
            s_lat = origin_lat + (s_x / 6371000.0) * (180.0 / math.pi)
            s_lon = origin_lon + (s_z / (6371000.0 * math.cos(math.radians(origin_lat)))) * (180.0 / math.pi)
        
        s_code = getattr(s, "sensor_code", getattr(s, "code", f"SN-{s.id}"))
        operational_features.append(
            GisOperationalFeature(
                id=f"sensor-{s.id}",
                entity_id=s.id,
                feature_type="SENSOR",
                code=s_code,
                title=s.name,
                status=s.status,
                latitude=round(s_lat, 6),
                longitude=round(s_lon, 6),
                value=str(s.last_value) if hasattr(s, "last_value") and s.last_value is not None else None,
                unit=s.unit if hasattr(s, "unit") else None,
                trust_badge="SIMULATED",
                properties={"sensor_type": s.sensor_type.name if s.sensor_type else "TELEMETRY", "zone_id": s.zone_id}
            )
        )

    # Cameras — project local x/z coords to lat/lon same as sensors
    cameras = db.query(Camera).filter(Camera.mine_id == mine_id).all()
    for cam in cameras:
        c_lat = getattr(cam, "latitude", None)
        c_lon = getattr(cam, "longitude", None)
        if c_lat is None or c_lon is None:
            c_x = getattr(cam, "x", 0.0) or 0.0
            c_z = getattr(cam, "z", 0.0) or 0.0
            c_lat = origin_lat + (c_x / 6371000.0) * (180.0 / math.pi)
            c_lon = origin_lon + (c_z / (6371000.0 * math.cos(math.radians(origin_lat)))) * (180.0 / math.pi)
        c_code = getattr(cam, "camera_code", getattr(cam, "code", f"CAM-{cam.id}"))
        operational_features.append(
            GisOperationalFeature(
                id=f"camera-{cam.id}",
                entity_id=cam.id,
                feature_type="CAMERA",
                code=c_code,
                title=cam.name,
                status=cam.status,
                latitude=round(c_lat, 6),
                longitude=round(c_lon, 6),
                trust_badge="SIMULATED",
                properties={"camera_type": getattr(cam, "camera_type", "SURVEILLANCE")}
            )
        )

    # Machinery / Equipment — project local x/z to lat/lon
    equipment_list = db.query(Equipment).filter(Equipment.mine_id == mine_id).all()
    for eq in equipment_list:
        e_lat = getattr(eq, "latitude", None)
        e_lon = getattr(eq, "longitude", None)
        if e_lat is None or e_lon is None:
            e_x = getattr(eq, "x", 0.0) or 0.0
            e_z = getattr(eq, "z", 0.0) or 0.0
            e_lat = origin_lat + (e_x / 6371000.0) * (180.0 / math.pi)
            e_lon = origin_lon + (e_z / (6371000.0 * math.cos(math.radians(origin_lat)))) * (180.0 / math.pi)
        e_code = getattr(eq, "equipment_code", f"EQP-{eq.id}")
        operational_features.append(
            GisOperationalFeature(
                id=f"machinery-{eq.id}",
                entity_id=eq.id,
                feature_type="MACHINERY",
                code=e_code,
                title=eq.name,
                status=eq.status,
                latitude=round(e_lat, 6),
                longitude=round(e_lon, 6),
                trust_badge="SIMULATED",
                properties={
                    "category": getattr(eq, "category", "EQUIPMENT"),
                    "manufacturer": getattr(eq, "manufacturer", None),
                    "next_service_due": eq.next_service_due.isoformat() if eq.next_service_due else None
                }
            )
        )

    # Incidents
    incidents = db.query(Incident).filter(Incident.mine_id == mine_id).all()
    for inc in incidents:
        i_lat = getattr(inc, "latitude", None) or (origin_lat - 0.001)
        i_lon = getattr(inc, "longitude", None) or (origin_lon - 0.001)
        operational_features.append(
            GisOperationalFeature(
                id=f"incident-{inc.id}",
                entity_id=inc.id,
                feature_type="INCIDENT",
                code=inc.incident_code,
                title=inc.title,
                status=inc.status,
                severity=inc.severity,
                latitude=round(i_lat, 6),
                longitude=round(i_lon, 6),
                trust_badge="OPERATIONAL",
                created_at=inc.created_at.isoformat() if inc.created_at else None,
                properties={"category": inc.category}
            )
        )

    # Alerts
    alerts = db.query(Alert).filter(Alert.mine_id == mine_id, Alert.status != "RESOLVED").all()
    for alt in alerts:
        a_lat = origin_lat + 0.0008
        a_lon = origin_lon - 0.0005
        operational_features.append(
            GisOperationalFeature(
                id=f"alert-{alt.id}",
                entity_id=alt.id,
                feature_type="ALERT",
                code=f"ALT-{alt.id}",
                title=alt.title or (alt.message[:50] if alt.message else "Operational Alert"),
                status=alt.status,
                severity=alt.severity,
                latitude=round(a_lat, 6),
                longitude=round(a_lon, 6),
                trust_badge="OPERATIONAL",
                created_at=alt.created_at.isoformat() if alt.created_at else None,
                properties={"location_context": alt.location_context}
            )
        )

    # Field Inspections
    inspections = db.query(FieldInspection).filter(FieldInspection.mine_id == mine_id).all()
    for f in inspections:
        f_lat = getattr(f, "latitude", None) or (origin_lat + 0.0012)
        f_lon = getattr(f, "longitude", None) or (origin_lon + 0.0015)
        operational_features.append(
            GisOperationalFeature(
                id=f"inspection-{f.id}",
                entity_id=f.id,
                feature_type="INSPECTION",
                code=f.inspection_code,
                title=f.summary_notes or f.inspection_type,
                status=f.status,
                latitude=round(f_lat, 6),
                longitude=round(f_lon, 6),
                trust_badge="OPERATIONAL",
                created_at=f.created_at.isoformat() if f.created_at else None,
                properties={"inspector_id": f.inspector_id}
            )
        )

    # Governance Tasks with Spatial Coordinates
    tasks = db.query(GovernanceTask).filter(GovernanceTask.mine_id == mine_id).all()
    for t in tasks:
        t_lat = origin_lat - 0.0012
        t_lon = origin_lon + 0.0008
        operational_features.append(
            GisOperationalFeature(
                id=f"task-{t.id}",
                entity_id=t.id,
                feature_type="GOVERNANCE_TASK",
                code=t.task_code,
                title=t.title,
                status=t.status,
                severity=t.priority,
                latitude=round(t_lat, 6),
                longitude=round(t_lon, 6),
                trust_badge="OPERATIONAL",
                created_at=t.created_at.isoformat() if t.created_at else None,
                properties={"domain": t.domain, "sla_status": t.sla_status}
            )
        )

    # Environmental Observations
    env_obs = db.query(EnvironmentalObservation).filter(EnvironmentalObservation.mine_id == mine_id).limit(5).all()
    for eo in env_obs:
        eo_lat = origin_lat - 0.0005
        eo_lon = origin_lon - 0.0012
        operational_features.append(
            GisOperationalFeature(
                id=f"env-{eo.id}",
                entity_id=eo.id,
                feature_type="ENVIRONMENTAL",
                code=f"ENV-{eo.id}",
                title=f"Environmental: {eo.parameter_name}",
                value=str(eo.observed_value),
                unit=eo.unit,
                latitude=round(eo_lat, 6),
                longitude=round(eo_lon, 6),
                trust_badge="OPERATIONAL",
                created_at=eo.detected_at.isoformat() if eo.detected_at else None,
                properties={"severity": eo.severity, "status": eo.status}
            )
        )

    # CMSMS External Signals (Simulated)
    cmsms_events = db.query(ExternalEventLog).filter(
        ExternalEventLog.mine_id == mine_id,
        ExternalEventLog.source_system == "CMSMS"
    ).limit(3).all()
    for cm in cmsms_events:
        c_lat = origin_lat + 0.0025
        c_lon = origin_lon + 0.0030
        operational_features.append(
            GisOperationalFeature(
                id=f"cmsms-{cm.id}",
                entity_id=cm.id,
                feature_type="CMSMS",
                code=f"CMSMS-SIG-{cm.id}",
                title="CMSMS Satellite Surveillance Signal",
                status="UNVERIFIED",
                severity="HIGH",
                latitude=round(c_lat, 6),
                longitude=round(c_lon, 6),
                trust_badge="SIMULATED",
                created_at=cm.received_at.isoformat() if cm.received_at else None,
                properties={"external_ref": cm.source_record_id}
            )
        )

    # 6. Risk Hotspots
    risk_hotspots_data = spatial_context_service.aggregate_spatial_risk_hotspots(db, mine_id)
    risk_hotspots = [GisRiskHotspot(**h) for h in risk_hotspots_data]

    # 7. Trust Metrics
    source_count = len(coord_features) + (1 if mine.is_simulated == "NO" else 0)
    approx_count = 1 if profile and profile.geometry_status == "APPROXIMATE" else 0
    operational_count = len(incidents) + len(alerts) + len(inspections) + len(tasks) + len(env_obs)
    simulated_count = len(sensors) + len(cameras) + len(cmsms_events)
    not_doc_count = max(0, 4 - len(coord_features))

    trust_metrics = GisTrustMetrics(
        source_derived_count=source_count,
        approximate_count=approx_count,
        operational_count=operational_count,
        simulated_count=simulated_count,
        not_documented_count=not_doc_count
    )

    # 8. Dashboard Stats
    sla_breaches = sum(1 for t in tasks if getattr(t, "sla_status", "") == "BREACHED")
    open_incidents = sum(1 for inc in incidents if inc.status in ["REPORTED", "INVESTIGATING", "OPEN"])
    open_tasks = sum(1 for t in tasks if t.status in ["OPEN", "PENDING", "ASSIGNED"])
    
    top_score = max([h.risk_score for h in risk_hotspots]) if risk_hotspots else 25.0
    top_band = "CRITICAL" if top_score >= 81 else ("HIGH" if top_score >= 61 else ("MEDIUM" if top_score >= 31 else "LOW"))

    dashboard_stats = GisDashboardStats(
        current_risk_score=top_score,
        current_risk_band=top_band,
        predictive_hotspots_count=sum(1 for h in risk_hotspots if h.hotspot_type == "PREDICTIVE_HOTSPOT"),
        open_incidents_count=open_incidents,
        open_field_tasks_count=open_tasks,
        sla_breaches_count=sla_breaches,
        active_alerts_count=len(alerts),
        last_updated=datetime.now(timezone.utc).isoformat()
    )

    return GisMapResponse(
        mine=mine_meta,
        boundaries=boundary_features,
        source_coordinates=coord_features,
        seams=seam_features,
        operational_features=operational_features,
        risk_hotspots=risk_hotspots,
        trust_metrics=trust_metrics,
        dashboard_stats=dashboard_stats
    )


@router.get("/mines/{mine_id}/context", response_model=SpatialContextResponse)
def get_spatial_context(
    mine_id: int,
    latitude: float = Query(..., description="Target Latitude"),
    longitude: float = Query(..., description="Target Longitude"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Evaluates spatial context, boundary containment, and nearest operational objects
    for a given coordinate within an authorized mine.
    """
    if not check_mine_access(current_user, mine_id, db):
        raise HTTPException(status_code=403, detail=f"Unauthorized for Mine {mine_id}")

    context_data = spatial_context_service.find_nearest_entities(db, mine_id, latitude, longitude)
    return SpatialContextResponse(**context_data)


@router.get("/mines/{mine_id}/risk", response_model=List[GisRiskHotspot])
def get_mine_spatial_risk(
    mine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Returns standalone spatial risk layer for the specified mine.
    """
    if not check_mine_access(current_user, mine_id, db):
        raise HTTPException(status_code=403, detail=f"Unauthorized for Mine {mine_id}")

    hotspots = spatial_context_service.aggregate_spatial_risk_hotspots(db, mine_id)
    return [GisRiskHotspot(**h) for h in hotspots]


@router.get("/search", response_model=GisSearchResponse)
def search_gis_objects(
    q: str = Query(..., min_length=2, description="Search term for mines, coordinates, sensors, incidents"),
    mine_id: Optional[int] = Query(None, description="Optional mine filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Unified GIS search across mines, coordinates, sensors, incidents, and tasks.
    Strictly enforces RBAC and user mine assignment isolation.
    """
    query_str = q.strip().lower()
    items: List[GisSearchItem] = []

    # Get authorized mines for user
    user_roles = get_user_roles(current_user, db)
    if RoleEnum.SYSTEM_ADMIN.value in user_roles or RoleEnum.REGULATOR.value in user_roles or current_user.is_superuser:
        allowed_mines = db.query(Mine).all()
    else:
        assigned_ids = get_user_assigned_mine_ids(current_user, db)
        allowed_mines = db.query(Mine).filter(Mine.id.in_(assigned_ids)).all() if assigned_ids else []

    allowed_mine_ids = {m.id for m in allowed_mines}
    if mine_id and mine_id not in allowed_mine_ids:
        return GisSearchResponse(query=q, results_count=0, items=[])

    target_mine_ids = [mine_id] if mine_id else list(allowed_mine_ids)

    # 1. Search Mines
    for m in allowed_mines:
        if (mine_id is None or m.id == mine_id) and (query_str in m.name.lower() or query_str in m.code.lower()):
            items.append(
                GisSearchItem(
                    id=f"search-mine-{m.id}",
                    title=m.name,
                    type="MINE",
                    category="Coal Block",
                    latitude=m.latitude,
                    longitude=m.longitude,
                    mine_id=m.id,
                    mine_name=m.name,
                    trust_badge="SOURCE_DERIVED" if m.is_simulated == "NO" else "SIMULATED",
                    snippet=f"State: {m.state} | District: {m.district} | Status: {m.data_status}"
                )
            )

    # 2. Search Coordinates
    coords = db.query(MineCoordinate).filter(MineCoordinate.mine_id.in_(target_mine_ids)).all()
    for c in coords:
        if query_str in c.point_label.lower() or query_str in (c.lat_dms_raw or "").lower() or query_str in (c.lon_dms_raw or "").lower():
            m = next((m for m in allowed_mines if m.id == c.mine_id), None)
            items.append(
                GisSearchItem(
                    id=f"search-coord-{c.id}",
                    title=f"Corner {c.point_label}",
                    type="COORDINATE",
                    category="Survey Marker",
                    latitude=c.latitude,
                    longitude=c.longitude,
                    mine_id=c.mine_id,
                    mine_name=m.name if m else "Mine",
                    trust_badge=c.geometry_status,
                    snippet=f"DMS: {c.lat_dms_raw} N, {c.lon_dms_raw} E | Datum: {c.datum}"
                )
            )

    # 3. Search Sensors
    sensors = db.query(Sensor).filter(Sensor.mine_id.in_(target_mine_ids)).all()
    for s in sensors:
        s_code = getattr(s, "sensor_code", getattr(s, "code", f"SN-{s.id}"))
        if query_str in s.name.lower() or query_str in s_code.lower():
            m = next((m for m in allowed_mines if m.id == s.mine_id), None)
            items.append(
                GisSearchItem(
                    id=f"search-sensor-{s.id}",
                    title=s.name,
                    type="SENSOR",
                    category=s.sensor_type.name if s.sensor_type else "Sensor",
                    latitude=m.latitude if m else None,
                    longitude=m.longitude if m else None,
                    mine_id=s.mine_id,
                    mine_name=m.name if m else "Mine",
                    trust_badge="SIMULATED",
                    snippet=f"Sensor Code: {s_code} | Status: {s.status}"
                )
            )

    # 4. Search Incidents
    incidents = db.query(Incident).filter(Incident.mine_id.in_(target_mine_ids)).all()
    for inc in incidents:
        if query_str in inc.title.lower() or query_str in inc.incident_code.lower():
            m = next((m for m in allowed_mines if m.id == inc.mine_id), None)
            items.append(
                GisSearchItem(
                    id=f"search-incident-{inc.id}",
                    title=inc.title,
                    type="INCIDENT",
                    category=getattr(inc, "category", "INCIDENT"),
                    latitude=inc.latitude or (m.latitude if m else None),
                    longitude=inc.longitude or (m.longitude if m else None),
                    mine_id=inc.mine_id,
                    mine_name=m.name if m else "Mine",
                    trust_badge="OPERATIONAL",
                    snippet=f"Incident {inc.incident_code} | Severity: {inc.severity} | Status: {inc.status}"
                )
            )

    return GisSearchResponse(
        query=q,
        results_count=len(items),
        items=items[:20]
    )


@router.post("/features/{feature_id}/field-task")
def create_gis_field_task(
    feature_id: str,
    mine_id: int = Query(..., description="Target Mine ID"),
    title: str = Query(..., description="Task title"),
    notes: Optional[str] = Query(None, description="Task notes"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Creates an assigned field inspection / governance task from a GIS spatial risk hotspot.
    Tagged explicitly as AI / SPATIAL RECOMMENDATION until human operator confirms.
    """
    if not check_mine_access(current_user, mine_id, db):
        raise HTTPException(status_code=403, detail=f"Unauthorized for Mine {mine_id}")

    import uuid
    task_code = f"GIS-TASK-{uuid.uuid4().hex[:6].upper()}"
    due_date = datetime.now(timezone.utc) + timedelta(days=3)

    task = GovernanceTask(
        task_code=task_code,
        mine_id=mine_id,
        domain="SAFETY",
        title=f"[SPATIAL RECOMMENDATION] {title}",
        description=f"Generated from 2D GIS Map hotspot inspection for feature '{feature_id}'.\n\nNotes: {notes or 'Field verification required for elevated spatial risk signal.'}",
        source_resource_type="GIS_SPATIAL_HOTSPOT",
        source_resource_id=feature_id,
        priority="HIGH",
        status="OPEN",
        due_at=due_date,
        sla_status="ON_TRACK",
        created_by_id=current_user.id
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    AuditService.log_event(
        db=db,
        actor_id=current_user.id,
        action="GIS_FIELD_TASK_CREATED",
        resource_type="GovernanceTask",
        resource_id=str(task.id),
        mine_id=mine_id,
        metadata={
            "feature_id": feature_id,
            "task_code": task.task_code,
            "title": task.title
        }
    )

    return {
        "status": "SUCCESS",
        "task_id": task.id,
        "task_code": task.task_code,
        "message": "Field governance verification task created successfully from 2D GIS spatial hotspot."
    }
