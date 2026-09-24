from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.authz import get_current_active_user, require_mine_access, get_user_roles
from app.models.user import User
from app.schemas.field_operation import (
    FieldInspectionCreate, FieldInspectionUpdate, FieldInspectionRead,
    FieldEvidenceCreate, FieldEvidenceRead,
    SyncBatchRequest, SyncBatchResponse
)
from app.schemas.governance import (
    ApprovalDecision, ApprovalResubmit,
    MobileAttendanceLogCreate, MobileAttendanceCorrection,
    ShiftHandoverCreate, ShiftHandoverAcknowledge,
    MobileProductionReportCreate, MobileEnvironmentalObservationCreate,
    MobileComplianceObservationCreate,
    MobileContractorVerificationCreate,
    MobileContractorSummaryResponse,
    MobileGrievanceCreate,
    MobileGrievanceAcknowledge,
    MobileGrievanceAssign,
    MobileGrievanceInvestigate,
    MobileGrievanceResolve,
    MobileGrievanceSummaryResponse,
    MobileGrievanceDetail
)
from app.schemas.predictive_risk import (
    MobileRiskSummaryResponse,
    MobileRiskPredictionItem,
    MobileRiskVerifyPayload
)
from app.schemas.field_command import (
    CommandSummaryResponse,
    UnifiedTimelineEvent,
    RelatedRecordsResponse
)
from app.services.field_service import FieldService
from app.services.governance_service import GovernanceService
from app.services.document_intelligence_service import document_intelligence_service

router = APIRouter(prefix="/mobile", tags=["Field Operations & Mobile Sync"])

@router.post("/sync", response_model=SyncBatchResponse, status_code=status.HTTP_200_OK)
def sync_field_batch(
    request: SyncBatchRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Idempotent batch synchronization endpoint for offline mobile field operations.
    Validates authorizations, records sync logs, and updates inspections, observations, incidents, and evidence.
    """
    return FieldService.process_sync_batch(db, current_user, request)

@router.get("/sync/status", status_code=status.HTTP_200_OK)
def get_sync_status(
    mine_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Returns server-side sync log metrics and last successful server sync timestamp."""
    return FieldService.get_sync_status(db, current_user, mine_id)

@router.get("/sync/logs", status_code=status.HTTP_200_OK)
def get_sync_logs(
    mine_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Returns paginated queryable history of FieldSyncLog records."""
    return FieldService.get_sync_logs(db, current_user, mine_id, limit, offset, status_filter)

@router.get("/inspections", response_model=List[dict])
def get_assigned_inspections(
    mine_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Returns assigned field inspections enriched with level, zone, and real-time/predictive risk context."""
    return FieldService.get_inspector_inspections(db, current_user, mine_id)

@router.get("/inspections/{inspection_id}", response_model=dict)
def get_field_inspection(
    inspection_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Retrieve complete field inspection details, checklist, risk context, and evidence."""
    return FieldService.get_single_inspection(db, inspection_id, current_user)

@router.post("/inspections", status_code=status.HTTP_201_CREATED)
def create_field_inspection(
    data: FieldInspectionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new field inspection."""
    insp = FieldService.create_inspection(db, current_user, data)
    return {"status": "SUCCESS", "inspection_code": insp.inspection_code, "id": insp.id}

@router.put("/inspections/{inspection_id}", status_code=status.HTTP_200_OK)
def update_field_inspection(
    inspection_id: int,
    data: FieldInspectionUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update inspection checklist, notes, and workflow status."""
    insp = FieldService.update_inspection(db, inspection_id, current_user, data)
    return {"status": "SUCCESS", "inspection_code": insp.inspection_code, "id": insp.id}

@router.post("/evidence", status_code=status.HTTP_201_CREATED)
def record_field_evidence(
    data: FieldEvidenceCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Record geo-tagged and SHA-256 hashed field evidence."""
    ev = FieldService.save_evidence(db, current_user, data)
    return {"status": "SUCCESS", "evidence_code": ev.evidence_code, "id": ev.id}

@router.get("/evidence/{evidence_id}", response_model=dict)
def get_field_evidence(
    evidence_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Retrieve complete evidence record, file hash, geo-tagging, and verification status."""
    return FieldService.get_single_evidence(db, evidence_id, current_user)

@router.post("/evidence/{evidence_id}/verify", status_code=status.HTTP_200_OK)
def verify_field_evidence(
    evidence_id: int,
    notes: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Supervisory verification of field evidence with cryptographic audit log."""
    ev = FieldService.verify_evidence(db, evidence_id, current_user, status="VERIFIED", verification_notes=notes)
    return {"status": "SUCCESS", "evidence_code": ev.evidence_code, "verification_status": "VERIFIED"}

@router.post("/evidence/{evidence_id}/reject", status_code=status.HTTP_200_OK)
def reject_field_evidence(
    evidence_id: int,
    reason: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Supervisory rejection of field evidence with reason and cryptographic audit log."""
    ev = FieldService.verify_evidence(db, evidence_id, current_user, status="REJECTED", verification_notes=reason)
    return {"status": "SUCCESS", "evidence_code": ev.evidence_code, "verification_status": "REJECTED"}

@router.get("/work-queue", response_model=dict)
def get_mobile_work_queue(
    mine_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Returns unified work queue, assigned tasks, countdown SLA metrics, risk context,
    and active shift / attendance context for the current user and mine.
    """
    return FieldService.get_work_queue(db, current_user, mine_id)

@router.patch("/tasks/{task_id}/status", response_model=dict)
def update_mobile_task_status(
    task_id: int,
    payload: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Updates governance task status in the mobile execution layer.
    Enforces state machine transitions, role permissions, and separation of duties.
    """
    status_val = payload.get("status")
    notes_val = payload.get("resolution_notes")
    comment_val = payload.get("comment")
    task = FieldService.update_task_status(db, current_user, task_id, status_val, notes_val, comment_val)
    return {
        "status": "SUCCESS",
        "id": task.id,
        "task_code": task.task_code,
        "task_status": task.status,
        "resolved_at": task.resolved_at.isoformat() if task.resolved_at else None
    }

@router.get("/shift-context", response_model=dict)
def get_mobile_shift_context(
    mine_id: int = Query(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Returns the active operational shift window and attendance record for the current user.
    """
    require_mine_access(mine_id, current_user, db)
    return FieldService.get_shift_context(db, current_user, mine_id)

@router.get("/notifications", response_model=dict)
def get_mobile_notifications(
    mine_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Returns actionable mobile notifications and alerts for the field worker.
    """
    from app.services.notification_service import NotificationService
    return NotificationService.get_user_notifications(
        db=db,
        user=current_user,
        mine_id=mine_id,
        status_filter=status,
        category_filter=category,
        limit=limit,
        offset=offset
    )

@router.get("/notifications/unread-count", response_model=dict)
def get_mobile_unread_counts(
    mine_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Returns live unread notification counts.
    """
    from app.services.notification_service import NotificationService
    return NotificationService.get_unread_counts(db=db, user=current_user, mine_id=mine_id)

@router.patch("/notifications/{notification_id}/read", response_model=dict)
def mark_mobile_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Marks an individual notification or alert as read.
    """
    from app.services.notification_service import NotificationService
    return NotificationService.mark_as_read(db=db, user=current_user, notification_id=notification_id)

@router.post("/notifications/mark-all-read", response_model=dict)
def mark_all_mobile_notifications_read(
    mine_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Marks all notifications as read in the current mine/user scope.
    """
    from app.services.notification_service import NotificationService
    return NotificationService.mark_all_as_read(db=db, user=current_user, mine_id=mine_id)

# ---------------------------------------------------------------------------
# MOBILE REVIEW CENTER & DIGITAL SIGN-OFF (MOBILE-09)
# ---------------------------------------------------------------------------

@router.get("/reviews", response_model=dict)
def get_mobile_reviews(
    mine_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Unified Mobile Review Queue for supervisors, safety officers, mine managers, and regulators.
    Returns status counters, filtered review requests, and SoD eligibility.
    """
    return GovernanceService.get_mobile_review_queue(
        db=db,
        user=current_user,
        mine_id=mine_id,
        status_filter=status,
        resource_filter=resource_type,
        limit=limit,
        offset=offset
    )

@router.get("/reviews/{request_id}", response_model=dict)
def get_mobile_review_detail(
    request_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves complete review details including checklist observations, evidence gallery with SHA-256 hashes,
    GPS metadata, spatial location, and audit timeline.
    """
    return GovernanceService.get_mobile_review_detail(
        db=db,
        user=current_user,
        request_id=request_id
    )

@router.post("/reviews/{request_id}/decision", response_model=dict)
def process_mobile_review_decision(
    request_id: int,
    payload: ApprovalDecision,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Records a supervisory review decision (APPROVE, REJECT, REQUEST_CHANGES).
    Strictly validates Separation of Duties (requester cannot approve own submission),
    role authorization, mandatory comments for rejection/return, and records cryptographic audit events.
    """
    user_roles = get_user_roles(current_user, db)
    req = GovernanceService.process_approval_decision(
        db=db,
        request_id=request_id,
        actor=current_user,
        user_roles=user_roles,
        action=payload.action,
        comments=payload.comments
    )
    return {
        "status": "SUCCESS",
        "id": req.id,
        "request_code": req.request_code,
        "review_status": req.status,
        "decision": payload.action,
        "final_decision_at": req.final_decision_at.isoformat() if req.final_decision_at else None,
        "sign_off_message": "Digital sign-off recorded" if payload.action == "APPROVE" else f"Review {payload.action.lower()} recorded"
    }

@router.post("/reviews/{request_id}/resubmit", response_model=dict)
def resubmit_mobile_review_request(
    request_id: int,
    payload: ApprovalResubmit,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Resubmits a returned review item with updated notes and documentation.
    """
    req = GovernanceService.resubmit_approval_request(
        db=db,
        request_id=request_id,
        actor=current_user,
        comments=payload.comments,
        updated_description=payload.updated_description
    )
    return {
        "status": "SUCCESS",
        "id": req.id,
        "request_code": req.request_code,
        "review_status": req.status,
        "message": "Review request successfully resubmitted."
    }


# ---------------------------------------------------------------------------
# FIELD DOCUMENTS & STATUTORY RECORDS (MOBILE-10)
# ---------------------------------------------------------------------------

@router.get("/documents", response_model=dict)
def get_mobile_documents(
    mine_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    source_tier: Optional[str] = Query(None),
    ocr_status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Unified Field Document Center queue: Returns statutory regulatory documents
    and mine operational records with filtering, search, and accurate counters.
    """
    return document_intelligence_service.get_mobile_documents(
        db=db,
        user=current_user,
        mine_id=mine_id,
        category=category,
        search=search,
        source_tier=source_tier,
        ocr_status=ocr_status,
        limit=limit,
        offset=offset
    )


@router.get("/documents/requirement/{regulation_ref:path}", response_model=dict)
def resolve_mobile_statutory_requirement(
    regulation_ref: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Resolves statutory citations (CMR 2017, Mines Rules 1955, DGMS Circulars)
    to authoritative source document metadata, page numbers, and verbatim text.
    """
    return document_intelligence_service.resolve_statutory_requirement(regulation_ref)


@router.get("/documents/{doc_identifier:path}", response_model=dict)
def get_mobile_document_detail(
    doc_identifier: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves full document detail, pages/chunks, extracted fields, SHA-256 fingerprint,
    and verification provenance for field viewing.
    """
    return document_intelligence_service.get_mobile_document_detail(
        db=db,
        user=current_user,
        doc_identifier=doc_identifier
    )


# ---------------------------------------------------------------------------
# WORKFORCE, ATTENDANCE & SHIFT HANDOVER (MOBILE-11)
# ---------------------------------------------------------------------------

@router.get("/workforce", response_model=dict)
def get_mobile_workforce_roster(
    mine_id: Optional[int] = Query(None),
    shift_code: Optional[str] = Query(None),
    trade: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Returns shift context, workforce summary counters, and privacy-safe worker roster.
    Excludes private contact numbers and financial identifiers.
    """
    return FieldService.get_mobile_workforce(
        db=db,
        user=current_user,
        mine_id=mine_id,
        shift_code=shift_code,
        trade=trade,
        search=search,
        status_filter=status_filter
    )


@router.post("/workforce/attendance", response_model=dict, status_code=status.HTTP_201_CREATED)
def record_mobile_attendance(
    payload: MobileAttendanceLogCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Records an auditable manual attendance event with recording actor provenance.
    Contextual device coordinates are captured without making biometric or presence claims.
    """
    return FieldService.record_mobile_attendance(db, current_user, payload)


@router.post("/workforce/attendance/correct", response_model=dict)
def correct_mobile_attendance(
    payload: MobileAttendanceCorrection,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Auditably corrects an attendance record with a mandatory reason.
    Preserves audit history and records actor identity.
    """
    return FieldService.correct_mobile_attendance(db, current_user, payload)


@router.get("/workforce/handover", response_model=dict)
def get_mobile_shift_handover_summary(
    mine_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Aggregates open safety incidents, overdue tasks, pending inspections,
    and active alerts into a structured shift handover summary.
    """
    return FieldService.get_mobile_shift_handover_summary(db, current_user, mine_id)


@router.post("/workforce/handover", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_mobile_shift_handover(
    payload: ShiftHandoverCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Creates an auditable shift handover log capturing outgoing shift observations and open items.
    """
    ho = FieldService.create_shift_handover_internal(
        db=db,
        user=current_user,
        mine_id=payload.mine_id,
        from_shift=payload.from_shift_code,
        to_shift=payload.to_shift_code,
        summary_notes=payload.summary_notes,
        safety_summary=payload.safety_summary
    )
    return {
        "status": "SUCCESS",
        "id": ho.id,
        "handover_code": ho.handover_code,
        "from_shift_code": ho.from_shift_code,
        "to_shift_code": ho.to_shift_code,
        "open_items_count": ho.open_items_count,
        "created_at": ho.created_at.isoformat()
    }


@router.post("/workforce/handover/{handover_id}/acknowledge", response_model=dict)
def acknowledge_mobile_shift_handover(
    handover_id: int,
    payload: ShiftHandoverAcknowledge,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Incoming shift supervisor acknowledges the shift handover log.
    """
    ho = FieldService.acknowledge_shift_handover_internal(
        db=db,
        user=current_user,
        handover_id=handover_id,
        acknowledgment_notes=payload.acknowledgment_notes
    )
    return {
        "status": "SUCCESS",
        "id": ho.id,
        "handover_code": ho.handover_code,
        "status": ho.status,
        "acknowledged_at": ho.acknowledged_at.isoformat() if ho.acknowledged_at else None,
        "incoming_officer": current_user.full_name or current_user.email
    }


# =============================================================
# MOBILE-12: PRODUCTION, ENVIRONMENT & COMPLIANCE REPORTING
# =============================================================

@router.get("/reporting/summary", response_model=dict)
def get_mobile_reporting_summary(
    mine_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Returns unified field reporting summary, configured environmental thresholds,
    today's production vs targets, and recent compliance records.
    """
    return FieldService.get_mobile_reporting_summary(db, current_user, mine_id)


@router.get("/reporting/production", response_model=List[dict])
def list_mobile_production_reports(
    mine_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List recent production reports for the operational mine."""
    summary = FieldService.get_mobile_reporting_summary(db, current_user, mine_id)
    return summary["production_summary"]["recent_reports"]


@router.post("/reporting/production", response_model=dict, status_code=status.HTTP_201_CREATED)
def record_mobile_production_report(
    payload: MobileProductionReportCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Records a mobile field production report with planned vs actual tons,
    automatic deviation evaluation, and supervisory review routing.
    """
    rep = FieldService.record_mobile_production_report(db, current_user, payload)
    return {
        "status": "SUCCESS",
        "id": rep.id,
        "report_code": rep.report_code,
        "shift": rep.shift,
        "planned_quantity": rep.planned_quantity,
        "actual_quantity": rep.actual_quantity,
        "variance_quantity": rep.variance_quantity,
        "variance_percentage": rep.variance_percentage,
        "deviation_flag": rep.deviation_flag,
        "report_status": rep.status,
        "created_at": rep.created_at.isoformat()
    }


@router.get("/reporting/environment", response_model=dict)
def list_mobile_environmental_data(
    mine_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Returns configured statutory environmental rules and recent field observations."""
    summary = FieldService.get_mobile_reporting_summary(db, current_user, mine_id)
    return summary["environment_summary"]


@router.post("/reporting/environment", response_model=dict, status_code=status.HTTP_201_CREATED)
def record_mobile_environmental_observation(
    payload: MobileEnvironmentalObservationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Captures field environmental measurements (PM10, PM2.5, Noise, pH),
    evaluates against statutory rules, and triggers supervisory review on threshold breaches.
    """
    obs = FieldService.record_mobile_environmental_observation(db, current_user, payload)
    return {
        "status": "SUCCESS",
        "id": obs.id,
        "parameter_name": obs.parameter_name,
        "observed_value": obs.observed_value,
        "threshold_limit": obs.threshold_limit,
        "unit": obs.unit,
        "severity": obs.severity,
        "observation_status": obs.status,
        "detected_at": obs.detected_at.isoformat()
    }


@router.get("/reporting/compliance", response_model=dict)
def list_mobile_compliance_data(
    mine_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Returns active statutory compliance violations and corrective action SLAs."""
    summary = FieldService.get_mobile_reporting_summary(db, current_user, mine_id)
    return summary["compliance_summary"]


@router.post("/reporting/compliance", response_model=dict, status_code=status.HTTP_201_CREATED)
def record_mobile_compliance_observation(
    payload: MobileComplianceObservationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Records statutory DGMS non-conformance observations with CMR 2017 regulatory clause mapping
    and assigns corrective action SLAs.
    """
    vio = FieldService.record_mobile_compliance_observation(db, current_user, payload)
    return {
        "status": "SUCCESS",
        "id": vio.id,
        "violation_code": vio.violation_code,
        "title": vio.title,
        "regulatory_clause": vio.regulatory_clause,
        "severity": vio.severity,
        "status": vio.status,
        "remedial_deadline": vio.remedial_deadline.isoformat() if vio.remedial_deadline else None,
        "created_at": vio.created_at.isoformat()
    }


# =============================================================================
# MOBILE-13: Contractor Field Operations & SLA Management Endpoints
# =============================================================================

@router.get("/contractors/summary", response_model=MobileContractorSummaryResponse)
def get_mobile_contractors_summary(
    mine_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Returns mobile contractor operations summary, active contracts, overdue requirements,
    and open contractor corrective action SLAs for the active mine context.
    """
    return FieldService.get_mobile_contractor_summary(db, current_user, mine_id)


@router.get("/contractors", response_model=List[dict])
def list_mobile_contractors(
    mine_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Lists authorized contractors and their active contract metrics for the mine."""
    summary = FieldService.get_mobile_contractor_summary(db, current_user, mine_id)
    contractors = summary["contractors"]
    if search:
        s = search.lower()
        contractors = [
            c for c in contractors
            if s in c["company_name"].lower() or s in c["contractor_code"].lower() or s in c["contact_person"].lower()
        ]
    return contractors


@router.get("/contractors/contracts", response_model=List[dict])
def list_mobile_contracts(
    mine_id: Optional[int] = Query(None),
    contractor_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Lists mine-scoped contracts with SLA status and requirement counts."""
    return FieldService.get_mobile_contracts(db, current_user, mine_id, contractor_id)


@router.get("/contractors/contracts/{contract_id}", response_model=dict)
def get_mobile_contract_detail(
    contract_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Retrieves full contract breakdown and all attached requirements with live SLA countdowns."""
    return FieldService.get_mobile_contract_detail(db, current_user, contract_id)


@router.get("/contractors/requirements", response_model=List[dict])
def list_mobile_contract_requirements(
    mine_id: Optional[int] = Query(None),
    contract_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Returns statutory and contractual requirements for field verification with SLA calculations."""
    return FieldService.get_mobile_contract_requirements(db, current_user, mine_id, contract_id, status_filter)


@router.post("/contractors/requirements/verify", response_model=dict, status_code=status.HTTP_200_OK)
def verify_mobile_contract_requirement(
    payload: MobileContractorVerificationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Performs field verification of a contract requirement (ESI/EPF, Safety Training, Insurance, Medical Fitness),
    logs observation notes, attaches evidence, and triggers corrective action tasks / review workflows on non-conformance.
    """
    req = FieldService.verify_contract_requirement(db, current_user, payload)
    return {
        "status": "SUCCESS",
        "requirement_id": req.id,
        "contract_id": req.contract_id,
        "title": req.title,
        "verification_status": req.status,
        "verification_notes": req.verification_notes,
        "verified_at": req.verified_at.isoformat() if req.verified_at else None,
        "expiry_date": req.expiry_date.isoformat() if req.expiry_date else None
    }


# =========================================================================
# MOBILE-14: Grievance & Public/Worker Issue Field Operations
# =========================================================================

@router.get("/grievances/summary", response_model=MobileGrievanceSummaryResponse)
def get_mobile_grievance_summary(
    mine_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Returns mine-scoped grievance KPI metrics, active issue queues, and live SLA tracking summary."""
    return FieldService.get_mobile_grievance_summary(db, current_user, mine_id)


@router.get("/grievances", response_model=List[dict])
def list_mobile_grievances(
    mine_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Retrieves paginated mine-scoped grievance list with calculated SLA urgency status."""
    return FieldService.get_mobile_grievances(
        db, current_user, mine_id, status_filter, category, priority, search, limit, offset
    )


@router.get("/grievances/{grievance_id}", response_model=dict)
def get_mobile_grievance_detail(
    grievance_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Retrieves comprehensive grievance detail including location, evidence, investigation, and related tasks/incidents."""
    return FieldService.get_mobile_grievance_detail(db, current_user, grievance_id)


@router.post("/grievances", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_mobile_grievance(
    payload: MobileGrievanceCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Logs a new public/worker field grievance with GPS benchmark, evidence hash, and SLA deadline."""
    grv = FieldService.create_mobile_grievance(db, current_user, payload)
    return {
        "status": "SUCCESS",
        "message": f"Grievance {grv.grievance_code} registered successfully.",
        "grievance_id": grv.id,
        "grievance_code": grv.grievance_code,
        "due_at": grv.due_at.isoformat()
    }


@router.post("/grievances/{grievance_id}/acknowledge", response_model=dict, status_code=status.HTTP_200_OK)
def acknowledge_mobile_grievance(
    grievance_id: int,
    payload: MobileGrievanceAcknowledge,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Records official nodal officer acknowledgement for grievance processing."""
    grv = FieldService.acknowledge_mobile_grievance(db, current_user, grievance_id, payload)
    return {
        "status": "SUCCESS",
        "message": f"Grievance {grv.grievance_code} acknowledged for processing.",
        "grievance_id": grv.id,
        "grievance_status": grv.status
    }


@router.post("/grievances/{grievance_id}/assign", response_model=dict, status_code=status.HTTP_200_OK)
def assign_mobile_grievance(
    grievance_id: int,
    payload: MobileGrievanceAssign,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Assigns grievance investigation to a designated safety officer / field inspector."""
    grv = FieldService.assign_mobile_grievance(db, current_user, grievance_id, payload)
    return {
        "status": "SUCCESS",
        "message": f"Grievance {grv.grievance_code} assigned to investigator.",
        "grievance_id": grv.id,
        "assigned_to_id": grv.assigned_to_id,
        "grievance_status": grv.status
    }


@router.post("/grievances/{grievance_id}/investigate", response_model=dict, status_code=status.HTTP_200_OK)
def investigate_mobile_grievance(
    grievance_id: int,
    payload: MobileGrievanceInvestigate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Records field investigation findings, photo evidence, and optionally creates corrective governance tasks or safety incidents."""
    grv = FieldService.investigate_mobile_grievance(db, current_user, grievance_id, payload)
    return {
        "status": "SUCCESS",
        "message": f"Investigation recorded for grievance {grv.grievance_code}.",
        "grievance_id": grv.id,
        "grievance_status": grv.status,
        "related_task_id": grv.related_task_id,
        "related_incident_id": grv.related_incident_id
    }


@router.post("/grievances/{grievance_id}/resolve", response_model=dict, status_code=status.HTTP_200_OK)
def resolve_mobile_grievance(
    grievance_id: int,
    payload: MobileGrievanceResolve,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Submits grievance resolution notes and routes to supervisor review for digital sign-off."""
    grv = FieldService.resolve_mobile_grievance(db, current_user, grievance_id, payload)
    return {
        "status": "SUCCESS",
        "message": f"Grievance {grv.grievance_code} marked as RESOLVED and submitted for sign-off.",
        "grievance_id": grv.id,
        "grievance_status": grv.status
    }


# =========================================================================
# MOBILE-15 Field Intelligence & Predictive Risk Endpoints
# =========================================================================

@router.get("/intelligence/summary", response_model=MobileRiskSummaryResponse, status_code=status.HTTP_200_OK)
def get_mobile_risk_summary(
    mine_id: int = Query(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves high-level predictive risk intelligence summary for mobile field operations.
    Returns authoritative model probability, 30-min horizon, contributing signals,
    data quality, high/critical risk counts, and freshness status.
    """
    return FieldService.get_mobile_risk_summary(db, current_user, mine_id)


@router.get("/intelligence/risks", response_model=List[MobileRiskPredictionItem], status_code=status.HTTP_200_OK)
def get_mobile_risks_list(
    mine_id: int = Query(...),
    status_filter: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves list of active/recent predictive risk records with spatial context,
    contributing signals, model version, and field verification state.
    """
    return FieldService.get_mobile_risks(
        db=db,
        user=current_user,
        mine_id=mine_id,
        status_filter=status_filter,
        severity_filter=severity,
        limit=limit
    )


@router.get("/intelligence/risks/{prediction_id}", response_model=MobileRiskPredictionItem, status_code=status.HTTP_200_OK)
def get_mobile_risk_detail(
    prediction_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves full detail of a specific predictive risk signal including contributing signals,
    evidence, GPS context, and downstream task/incident linkages.
    """
    return FieldService.get_mobile_risk_detail(db, current_user, prediction_id)


@router.post("/intelligence/risks/{prediction_id}/verify", response_model=dict, status_code=status.HTTP_200_OK)
def verify_mobile_risk(
    prediction_id: int,
    payload: MobileRiskVerifyPayload,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Records field officer verification findings, evidence hash, GPS context,
    and optionally spawns linked GovernanceTasks or Incidents with full audit trail.
    """
    pred = FieldService.verify_mobile_risk(db, current_user, prediction_id, payload)
    return {
        "status": "SUCCESS",
        "message": f"Field outcome '{payload.outcome}' recorded for Risk #{pred.id}.",
        "prediction_id": pred.id,
        "field_verified": pred.field_verified,
        "field_outcome": pred.field_outcome,
        "related_task_id": pred.related_task_id,
        "related_incident_id": pred.related_incident_id
    }


# ============================================================
# MOBILE-16: Cross-Domain Field Command & Integration Endpoints
# ============================================================

@router.get("/command/summary", response_model=CommandSummaryResponse, status_code=status.HTTP_200_OK)
def get_field_command_summary(
    mine_id: int = Query(..., description="Target mine ID for operational command"),
    latitude: Optional[float] = Query(None, description="Current field officer GPS latitude"),
    longitude: Optional[float] = Query(None, description="Current field officer GPS longitude"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    MOBILE-16: Returns aggregated Cross-Domain Field Command operational intelligence:
    Attention items, My Work queue, Nearby high-priority items, Shift context, and Domain counts.
    """
    return FieldService.get_field_command_summary(
        db=db,
        mine_id=mine_id,
        user=current_user,
        lat=latitude,
        lon=longitude
    )


@router.get("/command/timeline/{resource_type}/{resource_id}", response_model=List[UnifiedTimelineEvent], status_code=status.HTTP_200_OK)
def get_unified_resource_timeline(
    resource_type: str,
    resource_id: str,
    mine_id: int = Query(..., description="Mine ID"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    MOBILE-16: Returns unified immutable cryptographic lifecycle audit events for a resource.
    """
    return FieldService.get_unified_resource_timeline(
        db=db,
        resource_type=resource_type,
        resource_id=resource_id,
        mine_id=mine_id,
        user=current_user
    )


@router.get("/command/related/{resource_type}/{resource_id}", response_model=RelatedRecordsResponse, status_code=status.HTTP_200_OK)
def get_cross_domain_related_records(
    resource_type: str,
    resource_id: str,
    mine_id: int = Query(..., description="Mine ID"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    MOBILE-16: Returns cross-domain relational graph for universal deep-link navigation.
    """
    return FieldService.get_cross_domain_related_records(
        db=db,
        resource_type=resource_type,
        resource_id=resource_id,
        mine_id=mine_id,
        user=current_user
    )









