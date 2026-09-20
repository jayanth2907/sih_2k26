from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.mine import Mine
from app.core.authz import (
    get_current_active_user,
    check_mine_access,
    get_user_roles,
    get_user_assigned_mine_ids,
)
from app.core.permissions import RoleEnum

from app.schemas.analytics import (
    TimeRangeEnum,
    GovernanceOverviewAnalyticsDTO,
    SafetyAnalyticsDTO,
    ComplianceAnalyticsDTO,
    ProductionAnalyticsDTO,
    WorkforceAnalyticsDTO,
    EnvironmentalAnalyticsDTO,
    ContractorAnalyticsDTO,
    GrievanceAnalyticsDTO,
    FieldOperationsAnalyticsDTO,
    PredictiveRiskAnalyticsDTO,
    CrossMineBenchmarkingDTO,
)

from app.services.analytics import (
    GovernanceAnalyticsService,
    SafetyAnalyticsService,
    ComplianceAnalyticsService,
    ProductionAnalyticsService,
    WorkforceAnalyticsService,
    EnvironmentalAnalyticsService,
    ContractorAnalyticsService,
    GrievanceAnalyticsService,
    FieldOperationsAnalyticsService,
    PredictiveRiskAnalyticsService,
    CrossMineAnalyticsService,
)

router = APIRouter(prefix="/analytics", tags=["Analytics & Governance Intelligence"])


def _verify_mine_access_and_get_mine(mine_id: int, user: User, db: Session) -> Mine:
    if not check_mine_access(user, mine_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User {user.email} not authorized for Mine {mine_id}"
        )
    mine = db.query(Mine).filter(Mine.id == mine_id).first()
    if not mine:
        raise HTTPException(status_code=404, detail=f"Mine {mine_id} not found")
    return mine


@router.get("/mines/{mine_id}/overview", response_model=GovernanceOverviewAnalyticsDTO)
def get_governance_overview(
    mine_id: int,
    range_type: TimeRangeEnum = Query(TimeRangeEnum.LAST_30_DAYS, description="Analytical time window"),
    start_date: Optional[datetime] = Query(None, description="Custom start datetime (ISO-8601)"),
    end_date: Optional[datetime] = Query(None, description="Custom end datetime (ISO-8601)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns executive governance KPI metrics across all operational domains with period-over-period trend deltas.
    """
    _verify_mine_access_and_get_mine(mine_id, current_user, db)
    return GovernanceAnalyticsService.get_overview(
        mine_id=mine_id,
        db=db,
        range_type=range_type,
        custom_start=start_date,
        custom_end=end_date,
    )


@router.get("/mines/{mine_id}/safety", response_model=SafetyAnalyticsDTO)
def get_safety_analytics(
    mine_id: int,
    range_type: TimeRangeEnum = Query(TimeRangeEnum.LAST_30_DAYS, description="Analytical time window"),
    start_date: Optional[datetime] = Query(None, description="Custom start datetime (ISO-8601)"),
    end_date: Optional[datetime] = Query(None, description="Custom end datetime (ISO-8601)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns comprehensive safety telemetry, incident severity breakdown, anomaly trends, and recurring hazards.
    """
    _verify_mine_access_and_get_mine(mine_id, current_user, db)
    return SafetyAnalyticsService.get_safety_analytics(
        mine_id=mine_id,
        db=db,
        range_type=range_type,
        custom_start=start_date,
        custom_end=end_date,
    )


@router.get("/mines/{mine_id}/compliance", response_model=ComplianceAnalyticsDTO)
def get_compliance_analytics(
    mine_id: int,
    range_type: TimeRangeEnum = Query(TimeRangeEnum.LAST_30_DAYS, description="Analytical time window"),
    start_date: Optional[datetime] = Query(None, description="Custom start datetime (ISO-8601)"),
    end_date: Optional[datetime] = Query(None, description="Custom end datetime (ISO-8601)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns regulatory compliance posture, violation statutory distribution, corrective actions, and SLA compliance rate.
    """
    _verify_mine_access_and_get_mine(mine_id, current_user, db)
    return ComplianceAnalyticsService.get_compliance_analytics(
        mine_id=mine_id,
        db=db,
        range_type=range_type,
        custom_start=start_date,
        custom_end=end_date,
    )


@router.get("/mines/{mine_id}/production", response_model=ProductionAnalyticsDTO)
def get_production_analytics(
    mine_id: int,
    range_type: TimeRangeEnum = Query(TimeRangeEnum.LAST_30_DAYS, description="Analytical time window"),
    start_date: Optional[datetime] = Query(None, description="Custom start datetime (ISO-8601)"),
    end_date: Optional[datetime] = Query(None, description="Custom end datetime (ISO-8601)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns production plan vs actual variances, material category breakdown, shift distribution, and deviation flags.
    """
    _verify_mine_access_and_get_mine(mine_id, current_user, db)
    return ProductionAnalyticsService.get_production_analytics(
        mine_id=mine_id,
        db=db,
        range_type=range_type,
        custom_start=start_date,
        custom_end=end_date,
    )


@router.get("/mines/{mine_id}/workforce", response_model=WorkforceAnalyticsDTO)
def get_workforce_analytics(
    mine_id: int,
    range_type: TimeRangeEnum = Query(TimeRangeEnum.LAST_30_DAYS, description="Analytical time window"),
    start_date: Optional[datetime] = Query(None, description="Custom start datetime (ISO-8601)"),
    end_date: Optional[datetime] = Query(None, description="Custom end datetime (ISO-8601)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns workforce headcount, contractual vs regular distributions, trade categories, and shift attendance rates.
    """
    _verify_mine_access_and_get_mine(mine_id, current_user, db)
    return WorkforceAnalyticsService.get_workforce_analytics(
        mine_id=mine_id,
        db=db,
        range_type=range_type,
        custom_start=start_date,
        custom_end=end_date,
    )


@router.get("/mines/{mine_id}/environment", response_model=EnvironmentalAnalyticsDTO)
def get_environmental_analytics(
    mine_id: int,
    range_type: TimeRangeEnum = Query(TimeRangeEnum.LAST_30_DAYS, description="Analytical time window"),
    start_date: Optional[datetime] = Query(None, description="Custom start datetime (ISO-8601)"),
    end_date: Optional[datetime] = Query(None, description="Custom end datetime (ISO-8601)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns environmental parameter monitoring (PM10, PM2.5, Noise, Water pH) with explicit NO_DATA handling.
    """
    _verify_mine_access_and_get_mine(mine_id, current_user, db)
    return EnvironmentalAnalyticsService.get_environmental_analytics(
        mine_id=mine_id,
        db=db,
        range_type=range_type,
        custom_start=start_date,
        custom_end=end_date,
    )


@router.get("/mines/{mine_id}/contractors", response_model=ContractorAnalyticsDTO)
def get_contractor_analytics(
    mine_id: int,
    range_type: TimeRangeEnum = Query(TimeRangeEnum.LAST_30_DAYS, description="Analytical time window"),
    start_date: Optional[datetime] = Query(None, description="Custom start datetime (ISO-8601)"),
    end_date: Optional[datetime] = Query(None, description="Custom end datetime (ISO-8601)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns active contractors, statutory compliance requirements, and expiring contracts within 30 days.
    """
    _verify_mine_access_and_get_mine(mine_id, current_user, db)
    return ContractorAnalyticsService.get_contractor_analytics(
        mine_id=mine_id,
        db=db,
        range_type=range_type,
        custom_start=start_date,
        custom_end=end_date,
    )


@router.get("/mines/{mine_id}/grievances", response_model=GrievanceAnalyticsDTO)
def get_grievance_analytics(
    mine_id: int,
    range_type: TimeRangeEnum = Query(TimeRangeEnum.LAST_30_DAYS, description="Analytical time window"),
    start_date: Optional[datetime] = Query(None, description="Custom start datetime (ISO-8601)"),
    end_date: Optional[datetime] = Query(None, description="Custom end datetime (ISO-8601)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns PGRM grievance disposal performance, status breakdown, category distribution, and average resolution times.
    """
    _verify_mine_access_and_get_mine(mine_id, current_user, db)
    return GrievanceAnalyticsService.get_grievance_analytics(
        mine_id=mine_id,
        db=db,
        range_type=range_type,
        custom_start=start_date,
        custom_end=end_date,
    )


@router.get("/mines/{mine_id}/field-operations", response_model=FieldOperationsAnalyticsDTO)
def get_field_operations_analytics(
    mine_id: int,
    range_type: TimeRangeEnum = Query(TimeRangeEnum.LAST_30_DAYS, description="Analytical time window"),
    start_date: Optional[datetime] = Query(None, description="Custom start datetime (ISO-8601)"),
    end_date: Optional[datetime] = Query(None, description="Custom end datetime (ISO-8601)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns offline field inspection progress, cryptographic evidence logs, and mobile synchronization telemetry.
    """
    _verify_mine_access_and_get_mine(mine_id, current_user, db)
    return FieldOperationsAnalyticsService.get_field_operations_analytics(
        mine_id=mine_id,
        db=db,
        range_type=range_type,
        custom_start=start_date,
        custom_end=end_date,
    )


@router.get("/mines/{mine_id}/predictive-risk", response_model=PredictiveRiskAnalyticsDTO)
def get_predictive_risk_analytics(
    mine_id: int,
    range_type: TimeRangeEnum = Query(TimeRangeEnum.LAST_30_DAYS, description="Analytical time window"),
    start_date: Optional[datetime] = Query(None, description="Custom start datetime (ISO-8601)"),
    end_date: Optional[datetime] = Query(None, description="Custom end datetime (ISO-8601)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns Phase 5 gradient-boosted predictive risk trends, severity distribution, top contributing factors, and active risk hotspots.
    """
    _verify_mine_access_and_get_mine(mine_id, current_user, db)
    return PredictiveRiskAnalyticsService.get_predictive_risk_analytics(
        mine_id=mine_id,
        db=db,
        range_type=range_type,
        custom_start=start_date,
        custom_end=end_date,
    )


@router.get("/cross-mine", response_model=CrossMineBenchmarkingDTO)
def get_cross_mine_benchmarking(
    range_type: TimeRangeEnum = Query(TimeRangeEnum.LAST_30_DAYS, description="Analytical time window"),
    start_date: Optional[datetime] = Query(None, description="Custom start datetime (ISO-8601)"),
    end_date: Optional[datetime] = Query(None, description="Custom end datetime (ISO-8601)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns descriptive comparative benchmarking metrics across all mines authorized for the requesting user.
    Strictly enforces RBAC: regulators and system admins receive all active mines; mine managers receive assigned mines only.
    """
    user_roles = get_user_roles(current_user, db)
    if RoleEnum.SYSTEM_ADMIN.value in user_roles or RoleEnum.REGULATOR.value in user_roles or current_user.is_superuser:
        authorized_mines = db.query(Mine).all()
    else:
        assigned_ids = get_user_assigned_mine_ids(current_user, db)
        authorized_mines = db.query(Mine).filter(Mine.id.in_(assigned_ids)).all() if assigned_ids else []

    return CrossMineAnalyticsService.get_cross_mine_benchmarking(
        authorized_mines=authorized_mines,
        db=db,
        range_type=range_type,
        custom_start=start_date,
        custom_end=end_date,
    )
