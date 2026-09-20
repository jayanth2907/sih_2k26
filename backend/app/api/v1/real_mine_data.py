from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.authz import (
    get_current_active_user,
    require_mine_access,
    require_roles
)
from app.core.permissions import RoleEnum
from app.models.user import User
from app.models.mine import Mine
from app.models.real_mine_data import (
    DataProvenance,
    MineProfile,
    MineBoundary,
    MineCoordinate,
    MineSeam,
    MineClearance,
    MineDataAttribute,
    MineDataQualityRecord
)
from app.schemas.real_mine_data import (
    RealMineSummaryRead,
    RealMineDetailRead,
    MineProfileRead,
    MineBoundaryRead,
    MineCoordinateRead,
    MineSeamRead,
    MineClearanceRead,
    DataProvenanceRead,
    MineDataQualityRead,
    IngestionReportItem
)
from app.services.real_mine_ingestion_service import RealMineIngestionService

router = APIRouter(prefix="/mine-data", tags=["Real Mine Data Foundation & Provenance"])


@router.post("/ingest-all", response_model=List[IngestionReportItem])
def trigger_ingestion(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([RoleEnum.SYSTEM_ADMIN]))
):
    """
    Trigger deterministic ingestion of the 6 official Coal Block source documents.
    Restricted to SYSTEM_ADMIN.
    """
    service = RealMineIngestionService(db)
    reports = service.ingest_all()
    return reports


@router.get("/real-mines", response_model=List[RealMineSummaryRead])
def list_real_mines(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List all ingested real coal blocks with summary metadata, data status, and provenance doc info.
    """
    mines = (
        db.query(Mine)
        .filter(Mine.is_simulated == "NO")
        .order_by(Mine.id.asc())
        .all()
    )
    result = []
    for m in mines:
        profile = db.query(MineProfile).filter(MineProfile.mine_id == m.id).first()
        prov_doc = profile.provenance.document_title if profile and profile.provenance else "Official Mine Summary"
        prov_hash = profile.provenance.document_hash if profile and profile.provenance else ""
        
        result.append(
            RealMineSummaryRead(
                id=m.id,
                code=m.code,
                name=m.name,
                official_name=profile.official_name if profile else m.name,
                coalfield=profile.coalfield if profile else "Unknown",
                state=m.state,
                district=m.district,
                latitude=m.latitude,
                longitude=m.longitude,
                total_area_sq_km=profile.geological_block_area_sq_km if profile else None,
                mining_method=profile.mining_method_documented if profile else None,
                geological_reserve_mt=profile.total_geological_reserve_mt if profile else None,
                data_status=m.data_status,
                geometry_status=profile.geometry_status if profile else "SOURCE_DERIVED",
                is_simulated=m.is_simulated,
                provenance_doc=prov_doc,
                provenance_hash=prov_hash
            )
        )
    return result


@router.get("/{mine_id}", response_model=RealMineDetailRead)
def get_real_mine_detail(
    mine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get comprehensive Real Mine Data Foundation profile with provenance citations.
    Enforces mine-level access control.
    """
    require_mine_access(mine_id, current_user, db)
    
    mine = db.query(Mine).filter(Mine.id == mine_id).first()
    if not mine:
        raise HTTPException(status_code=404, detail=f"Mine with id {mine_id} not found.")

    profile = db.query(MineProfile).filter(MineProfile.mine_id == mine.id).first()
    boundaries = db.query(MineBoundary).filter(MineBoundary.mine_id == mine.id).all()
    coordinates = db.query(MineCoordinate).filter(MineCoordinate.mine_id == mine.id).order_by(MineCoordinate.sequence_order.asc()).all()
    seams = db.query(MineSeam).filter(MineSeam.mine_id == mine.id).order_by(MineSeam.sequence_order.asc()).all()
    clearances = db.query(MineClearance).filter(MineClearance.mine_id == mine.id).all()
    attributes = db.query(MineDataAttribute).filter(MineDataAttribute.mine_id == mine.id).all()
    quality = db.query(MineDataQualityRecord).filter(MineDataQualityRecord.mine_id == mine.id).first()

    return RealMineDetailRead(
        id=mine.id,
        code=mine.code,
        name=mine.name,
        mine_type=mine.mine_type,
        state=mine.state,
        district=mine.district,
        latitude=mine.latitude,
        longitude=mine.longitude,
        data_status=mine.data_status,
        is_simulated=mine.is_simulated,
        profile=profile,
        boundaries=boundaries,
        coordinates=coordinates,
        seams=seams,
        clearances=clearances,
        data_attributes=attributes,
        quality_record=quality
    )


@router.get("/{mine_id}/coordinates", response_model=List[MineCoordinateRead])
def get_mine_coordinates(
    mine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get structured coordinates and datum (WGS84, CoalGrid) for the mine.
    """
    require_mine_access(mine_id, current_user, db)
    coords = (
        db.query(MineCoordinate)
        .filter(MineCoordinate.mine_id == mine_id)
        .order_by(MineCoordinate.sequence_order.asc())
        .all()
    )
    return coords


@router.get("/{mine_id}/seams", response_model=List[MineSeamRead])
def get_mine_seams(
    mine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get stratigraphic coal seam column with thickness, depth, reserves, and grade.
    """
    require_mine_access(mine_id, current_user, db)
    seams = (
        db.query(MineSeam)
        .filter(MineSeam.mine_id == mine_id)
        .order_by(MineSeam.sequence_order.asc())
        .all()
    )
    return seams


@router.get("/{mine_id}/clearances", response_model=List[MineClearanceRead])
def get_mine_clearances(
    mine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get statutory clearances and approvals status with exact source provenance.
    """
    require_mine_access(mine_id, current_user, db)
    clearances = (
        db.query(MineClearance)
        .filter(MineClearance.mine_id == mine_id)
        .all()
    )
    return clearances


@router.get("/{mine_id}/provenance", response_model=List[DataProvenanceRead])
def get_mine_provenance(
    mine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get full list of provenance citations linked to this mine's facts.
    """
    require_mine_access(mine_id, current_user, db)
    
    prov_ids = set()
    profile = db.query(MineProfile).filter(MineProfile.mine_id == mine_id).first()
    if profile and profile.provenance_id:
        prov_ids.add(profile.provenance_id)
        
    for b in db.query(MineBoundary).filter(MineBoundary.mine_id == mine_id).all():
        if b.provenance_id:
            prov_ids.add(b.provenance_id)
            
    for c in db.query(MineCoordinate).filter(MineCoordinate.mine_id == mine_id).all():
        if c.provenance_id:
            prov_ids.add(c.provenance_id)
            
    for s in db.query(MineSeam).filter(MineSeam.mine_id == mine_id).all():
        if s.provenance_id:
            prov_ids.add(s.provenance_id)
            
    for cl in db.query(MineClearance).filter(MineClearance.mine_id == mine_id).all():
        if cl.provenance_id:
            prov_ids.add(cl.provenance_id)

    provenances = (
        db.query(DataProvenance)
        .filter(DataProvenance.id.in_(list(prov_ids)))
        .order_by(DataProvenance.page_number.asc())
        .all()
    )
    return provenances


@router.get("/{mine_id}/quality", response_model=MineDataQualityRead)
def get_mine_quality_summary(
    mine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get machine-readable data quality summary (provenance coverage, validation status, approximate geometry flag).
    """
    require_mine_access(mine_id, current_user, db)
    qr = db.query(MineDataQualityRecord).filter(MineDataQualityRecord.mine_id == mine_id).first()
    if not qr:
        raise HTTPException(status_code=404, detail=f"Quality record for Mine ID {mine_id} not found.")
    return qr
