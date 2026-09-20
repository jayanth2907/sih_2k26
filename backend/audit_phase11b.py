import json
import math
from app.db.session import SessionLocal
from app.models.mine import Mine
from app.models.real_mine_data import MineProfile, MineBoundary, MineCoordinate, MineSeam, DataProvenance, MineDataQualityRecord
from app.services.spatial_transformation_service import SpatialTransformationService

db = SessionLocal()
mines = db.query(Mine).filter(Mine.code.like('BLOCK-%')).order_by(Mine.code).all()

audit_results = []

for m in mines:
    prof = db.query(MineProfile).filter(MineProfile.mine_id == m.id).first()
    bnd = db.query(MineBoundary).filter(MineBoundary.mine_id == m.id).first()
    coords = db.query(MineCoordinate).filter(MineCoordinate.mine_id == m.id).order_by(MineCoordinate.sequence_order).all()
    seams = db.query(MineSeam).filter(MineSeam.mine_id == m.id).order_by(MineSeam.sequence_order).all()
    prov = db.query(DataProvenance).filter(DataProvenance.id == bnd.provenance_id).first() if bnd and bnd.provenance_id else None
    
    # Calculate polygon area in sq km from bounding box or vertices
    origin_lat = bnd.min_latitude or m.latitude or 20.0
    origin_lon = bnd.min_longitude or m.longitude or 85.0
    
    calc_area_sq_km = None
    if bnd and bnd.min_latitude and bnd.max_latitude and bnd.min_longitude and bnd.max_longitude:
        # Bounding box dimensions
        d_lat_deg = bnd.max_latitude - bnd.min_latitude
        d_lon_deg = bnd.max_longitude - bnd.min_longitude
        avg_lat = math.radians((bnd.max_latitude + bnd.min_latitude) / 2.0)
        
        dy_km = d_lat_deg * 111.139
        dx_km = d_lon_deg * 111.139 * math.cos(avg_lat)
        calc_area_sq_km = round(dy_km * dx_km, 3)

    item = {
        "code": m.code,
        "name": m.name,
        "official_name": prof.official_name if prof else "N/A",
        "doc_title": prov.document_title if prov else "N/A",
        "doc_filename": prov.document_filename if prov else "N/A",
        "doc_page": prov.page_number if prov else "N/A",
        "doc_hash": prov.document_hash if prov else "N/A",
        "datum": bnd.datum if bnd else "WGS84",
        "coordinate_system": bnd.coordinate_system if bnd else "GEOGRAPHIC_WGS84",
        "geometry_status": bnd.geometry_status if bnd else "N/A",
        "boundary_type": bnd.boundary_type if bnd else "N/A",
        "lat_range": f"{bnd.min_latitude}° N to {bnd.max_latitude}° N" if bnd and bnd.min_latitude else "N/A",
        "lon_range": f"{bnd.min_longitude}° E to {bnd.max_longitude}° E" if bnd and bnd.min_longitude else "N/A",
        "raw_coordinate_text": bnd.raw_coordinate_text if bnd else "N/A",
        "cardinal_points": [
            {
                "point": c.point_label,
                "lat_dms": c.lat_dms_raw,
                "lon_dms": c.lon_dms_raw,
                "lat_dec": c.latitude,
                "lon_dec": c.longitude,
                "status": c.geometry_status
            } for c in coords
        ],
        "documented_area_sq_km": prof.geological_block_area_sq_km if prof else None,
        "calculated_bbox_area_sq_km": calc_area_sq_km,
        "seam_count": len(seams),
        "seams": [
            {
                "name": s.seam_name,
                "depth_range": f"{s.depth_min_m}-{s.depth_max_m}m",
                "thickness": s.thickness_raw,
                "grade": s.grade,
                "status": s.data_status
            } for s in seams
        ]
    }
    audit_results.append(item)

print(json.dumps(audit_results, indent=2))
