import json
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.mine import Mine
from app.models.spatial import MineLevel, MineZone
from app.models.user import User
from app.models.field_operation import FieldInspection, FieldEvidence, FieldSyncLog
from app.models.production import ProductionReport
from app.models.environmental import EnvironmentalObservation, EnvironmentalRule
from app.models.incident import Incident, IncidentEvent
from app.models.governance_task import GovernanceTask
from app.models.workforce import Shift, Worker, AttendanceRecord, ShiftHandover
from app.models.contractor import Contractor, Contract, ContractRequirement
from app.models.grievance import Grievance
from app.models.alert import Alert
from app.models.violation import Violation, CorrectiveAction
from app.models.approval import ApprovalRequest, ApprovalAction
from app.models.notification import Notification
from app.models.risk_prediction import RiskPrediction
from app.models.audit import AuditEvent
from app.core.exceptions import EntityNotFoundError, PermissionDeniedError, BusinessRuleViolationError
from app.core.authz import check_mine_access, get_user_roles, require_mine_access
from app.core.permissions import RoleEnum
from app.services.risk_service import RiskService
from app.services.predictive_risk_service import PredictiveRiskService
from app.services.audit_service import AuditService
from app.schemas.predictive_risk import (
    MobileRiskPredictionItem,
    MobileRiskSummaryResponse,
    MobileRiskVerifyPayload,
    SignalAttribution
)
from app.schemas.field_operation import (
    FieldInspectionCreate, FieldInspectionUpdate, FieldInspectionRead,
    FieldEvidenceCreate, FieldEvidenceRead, ChecklistItem,
    SyncBatchRequest, SyncBatchResponse, SyncOperationResult
)
from app.schemas.governance import (
    MobileProductionReportCreate,
    MobileEnvironmentalObservationCreate,
    MobileComplianceObservationCreate,
    MobileContractorVerificationCreate,
    MobileContractorSummaryResponse,
    MobileContractorSummaryItem,
    MobileContractDetailItem,
    MobileContractRequirementItem,
    MobileGrievanceCreate,
    MobileGrievanceAcknowledge,
    MobileGrievanceAssign,
    MobileGrievanceInvestigate,
    MobileGrievanceResolve,
    MobileGrievanceSummaryResponse,
    MobileGrievanceSummaryItem,
    MobileGrievanceDetail
)
from app.schemas.field_command import (
    CommandSummaryResponse,
    AttentionItem,
    MyWorkItem,
    NearbyItem,
    UnifiedTimelineEvent,
    RelatedRecordsResponse
)

logger = logging.getLogger("trinetra.field_operations")

class FieldService:
    @staticmethod
    def get_inspector_inspections(
        db: Session,
        user: User,
        mine_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        roles = get_user_roles(user, db)
        query = db.query(FieldInspection)

        if mine_id is not None:
            if not check_mine_access(user, mine_id, db):
                raise PermissionDeniedError(f"Access denied to Mine ID {mine_id}")
            query = query.filter(FieldInspection.mine_id == mine_id)
        else:
            # Filter to assigned mines unless superuser/admin/regulator
            if not (user.is_superuser or RoleEnum.SYSTEM_ADMIN.value in roles or RoleEnum.REGULATOR.value in roles):
                assigned_mines = [a.mine_id for a in user.mine_assignments]
                query = query.filter(FieldInspection.mine_id.in_(assigned_mines))

        # Field Inspectors see their own assigned inspections
        if RoleEnum.FIELD_INSPECTOR.value in roles and not (RoleEnum.SYSTEM_ADMIN.value in roles or RoleEnum.MINE_MANAGER.value in roles):
            query = query.filter(FieldInspection.inspector_id == user.id)

        inspections = query.order_by(desc(FieldInspection.scheduled_date)).all()
        results = []

        for insp in inspections:
            ch_items = []
            if insp.checklist_json:
                try:
                    ch_items = json.loads(insp.checklist_json)
                except Exception:
                    ch_items = []

            # Get zone risk context
            c_risk = 25.0
            p_risk = 35.0
            if insp.zone_id and insp.mine_id:
                try:
                    p_summary = PredictiveRiskService.generate_prediction(db, insp.mine_id)
                    c_risk = p_summary.get("current_risk_score", 25.0)
                    p_risk = p_summary.get("predicted_risk_score", 35.0)
                except Exception:
                    pass

            results.append({
                "id": insp.id,
                "inspection_code": insp.inspection_code,
                "mine_id": insp.mine_id,
                "mine_name": insp.mine.name if insp.mine else None,
                "level_id": insp.level_id,
                "level_name": insp.level.name if insp.level else None,
                "zone_id": insp.zone_id,
                "zone_name": insp.zone.name if insp.zone else None,
                "inspector_id": insp.inspector_id,
                "inspector_name": insp.inspector.full_name if insp.inspector else None,
                "inspection_type": insp.inspection_type,
                "scheduled_date": insp.scheduled_date.isoformat(),
                "status": insp.status,
                "checklist": ch_items,
                "summary_notes": insp.summary_notes,
                "severity_assessment": insp.severity_assessment,
                "latitude": insp.latitude,
                "longitude": insp.longitude,
                "gps_accuracy_meters": insp.gps_accuracy_meters,
                "current_zone_risk": c_risk,
                "predicted_zone_risk": p_risk,
                "started_at": insp.started_at.isoformat() if insp.started_at else None,
                "completed_at": insp.completed_at.isoformat() if insp.completed_at else None,
                "created_at": insp.created_at.isoformat(),
                "updated_at": insp.updated_at.isoformat()
            })

        return results

    @staticmethod
    def get_single_inspection(
        db: Session,
        inspection_id: int,
        user: User
    ) -> Dict[str, Any]:
        inspection = db.query(FieldInspection).filter(FieldInspection.id == inspection_id).first()
        if not inspection:
            raise EntityNotFoundError("FieldInspection", inspection_id)

        if not check_mine_access(user, inspection.mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {inspection.mine_id}")

        ch_items = []
        if inspection.checklist_json:
            try:
                ch_items = json.loads(inspection.checklist_json)
            except Exception:
                ch_items = []

        evidences = []
        for ev in inspection.evidences:
            evidences.append({
                "id": ev.id,
                "evidence_code": ev.evidence_code,
                "mine_id": ev.mine_id,
                "inspection_id": ev.inspection_id,
                "evidence_type": ev.evidence_type,
                "title": ev.title,
                "description": ev.description,
                "file_url_or_path": ev.file_url_or_path,
                "file_hash_sha256": ev.file_hash_sha256,
                "latitude": ev.latitude,
                "longitude": ev.longitude,
                "gps_accuracy_meters": ev.gps_accuracy_meters,
                "client_capture_timestamp": ev.client_capture_timestamp.isoformat() if ev.client_capture_timestamp else None,
                "server_received_timestamp": ev.server_received_timestamp.isoformat() if ev.server_received_timestamp else None,
                "captured_by_id": ev.captured_by_id
            })

        c_risk = 25.0
        p_risk = 35.0
        if inspection.zone_id and inspection.mine_id:
            try:
                p_summary = PredictiveRiskService.generate_prediction(db, inspection.mine_id)
                c_risk = p_summary.get("current_risk_score", 25.0)
                p_risk = p_summary.get("predicted_risk_score", 35.0)
            except Exception:
                pass

        return {
            "id": inspection.id,
            "inspection_code": inspection.inspection_code,
            "mine_id": inspection.mine_id,
            "mine_name": inspection.mine.name if inspection.mine else None,
            "level_id": inspection.level_id,
            "level_name": inspection.level.name if inspection.level else None,
            "zone_id": inspection.zone_id,
            "zone_name": inspection.zone.name if inspection.zone else None,
            "inspector_id": inspection.inspector_id,
            "inspector_name": inspection.inspector.full_name if inspection.inspector else None,
            "inspection_type": inspection.inspection_type,
            "scheduled_date": inspection.scheduled_date.isoformat(),
            "status": inspection.status,
            "checklist": ch_items,
            "summary_notes": inspection.summary_notes,
            "severity_assessment": inspection.severity_assessment,
            "latitude": inspection.latitude,
            "longitude": inspection.longitude,
            "gps_accuracy_meters": inspection.gps_accuracy_meters,
            "current_zone_risk": c_risk,
            "predicted_zone_risk": p_risk,
            "started_at": inspection.started_at.isoformat() if inspection.started_at else None,
            "completed_at": inspection.completed_at.isoformat() if inspection.completed_at else None,
            "evidences": evidences,
            "created_at": inspection.created_at.isoformat(),
            "updated_at": inspection.updated_at.isoformat()
        }

    @staticmethod
    def create_inspection(
        db: Session,
        user: User,
        data: FieldInspectionCreate
    ) -> FieldInspection:
        if not check_mine_access(user, data.mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {data.mine_id}")

        count = db.query(FieldInspection).filter(FieldInspection.mine_id == data.mine_id).count() + 1
        mine = db.query(Mine).filter(Mine.id == data.mine_id).first()
        code_prefix = mine.code.replace("MINE-", "") if mine else f"M{data.mine_id}"
        insp_code = f"INSP-{datetime.now().year}-{code_prefix}-{count:03d}"

        checklist_str = json.dumps([item.model_dump() for item in data.checklist]) if data.checklist else None

        inspection = FieldInspection(
            inspection_code=insp_code,
            mine_id=data.mine_id,
            level_id=data.level_id,
            zone_id=data.zone_id,
            inspector_id=user.id,
            inspection_type=data.inspection_type,
            scheduled_date=data.scheduled_date,
            status=data.status,
            checklist_json=checklist_str,
            summary_notes=data.summary_notes,
            severity_assessment=data.severity_assessment,
            latitude=data.latitude,
            longitude=data.longitude,
            gps_accuracy_meters=data.gps_accuracy_meters,
            started_at=datetime.now(timezone.utc) if data.status == "IN_PROGRESS" else None,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db.add(inspection)
        db.commit()
        db.refresh(inspection)

        AuditService.log_event(
            db=db,
            actor_id=user.id,
            action="FIELD_INSPECTION_CREATED",
            resource_type="FieldInspection",
            resource_id=insp_code,
            mine_id=data.mine_id,
            after_state=f"Status:{data.status}|Type:{data.inspection_type}"
        )

        return inspection

    @staticmethod
    def update_inspection(
        db: Session,
        inspection_id: int,
        user: User,
        data: FieldInspectionUpdate
    ) -> FieldInspection:
        inspection = db.query(FieldInspection).filter(FieldInspection.id == inspection_id).first()
        if not inspection:
            raise EntityNotFoundError("FieldInspection", inspection_id)

        if not check_mine_access(user, inspection.mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {inspection.mine_id}")

        # Validate valid workflow transition
        if data.status and data.status != inspection.status:
            allowed_transitions = {
                "SCHEDULED": ["IN_PROGRESS", "CANCELLED"],
                "IN_PROGRESS": ["COMPLETED", "SUBMITTED"],
                "COMPLETED": ["SUBMITTED", "VERIFIED"],
                "SUBMITTED": ["VERIFIED", "ACTION_REQUIRED"],
                "VERIFIED": [],
                "CANCELLED": []
            }
            if data.status not in allowed_transitions.get(inspection.status, []):
                raise BusinessRuleViolationError(
                    f"Invalid state transition from {inspection.status} to {data.status}."
                )
            inspection.status = data.status
            if data.status == "IN_PROGRESS" and not inspection.started_at:
                inspection.started_at = datetime.now(timezone.utc)
            if data.status in ["COMPLETED", "SUBMITTED"] and not inspection.completed_at:
                inspection.completed_at = datetime.now(timezone.utc)

        if data.checklist is not None:
            inspection.checklist_json = json.dumps([item.model_dump() for item in data.checklist])
        if data.summary_notes is not None:
            inspection.summary_notes = data.summary_notes
        if data.severity_assessment is not None:
            inspection.severity_assessment = data.severity_assessment
        if data.latitude is not None:
            inspection.latitude = data.latitude
        if data.longitude is not None:
            inspection.longitude = data.longitude
        if data.gps_accuracy_meters is not None:
            inspection.gps_accuracy_meters = data.gps_accuracy_meters

        inspection.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(inspection)

        AuditService.log_event(
            db=db,
            actor_id=user.id,
            action="FIELD_INSPECTION_UPDATED",
            resource_type="FieldInspection",
            resource_id=inspection.inspection_code,
            mine_id=inspection.mine_id,
            after_state=f"Status:{inspection.status}|Severity:{inspection.severity_assessment}"
        )

        return inspection

    @staticmethod
    def get_single_evidence(
        db: Session,
        evidence_id: int,
        user: User
    ) -> Dict[str, Any]:
        evidence = db.query(FieldEvidence).filter(FieldEvidence.id == evidence_id).first()
        if not evidence:
            raise EntityNotFoundError("FieldEvidence", evidence_id)

        if not check_mine_access(user, evidence.mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {evidence.mine_id}")

        return {
            "id": evidence.id,
            "evidence_code": evidence.evidence_code,
            "mine_id": evidence.mine_id,
            "mine_name": evidence.mine.name if evidence.mine else None,
            "inspection_id": evidence.inspection_id,
            "inspection_code": evidence.inspection.inspection_code if evidence.inspection else None,
            "observation_id": evidence.observation_id,
            "incident_id": evidence.incident_id,
            "evidence_type": evidence.evidence_type,
            "title": evidence.title,
            "description": evidence.description,
            "file_url_or_path": evidence.file_url_or_path,
            "file_hash_sha256": evidence.file_hash_sha256,
            "file_size_bytes": evidence.file_size_bytes,
            "mime_type": evidence.mime_type,
            "location_source": evidence.location_source,
            "verification_status": evidence.verification_status,
            "verified_by_id": evidence.verified_by_id,
            "verified_by_name": evidence.verified_by.full_name if evidence.verified_by else None,
            "verification_notes": evidence.verification_notes,
            "latitude": evidence.latitude,
            "longitude": evidence.longitude,
            "gps_accuracy_meters": evidence.gps_accuracy_meters,
            "client_capture_timestamp": evidence.client_capture_timestamp.isoformat() if evidence.client_capture_timestamp else None,
            "server_received_timestamp": evidence.server_received_timestamp.isoformat() if evidence.server_received_timestamp else None,
            "captured_by_id": evidence.captured_by_id,
            "captured_by_name": evidence.captured_by.full_name if evidence.captured_by else None,
            "created_at": evidence.created_at.isoformat()
        }

    @staticmethod
    def save_evidence(
        db: Session,
        user: User,
        data: FieldEvidenceCreate
    ) -> FieldEvidence:
        if not check_mine_access(user, data.mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {data.mine_id}")

        # 1. Validate file size (max 15MB)
        MAX_EVIDENCE_SIZE_BYTES = 15 * 1024 * 1024 # 15MB
        if data.file_size_bytes and data.file_size_bytes > MAX_EVIDENCE_SIZE_BYTES:
            raise BusinessRuleViolationError("Evidence file exceeds maximum permitted size of 15MB.")

        # 2. Validate SHA-256 hash format (must be 64-char hexadecimal string)
        if not data.file_hash_sha256 or len(data.file_hash_sha256) != 64 or not all(c in "0123456789abcdefABCDEF" for c in data.file_hash_sha256):
            raise BusinessRuleViolationError("Invalid SHA-256 evidence integrity hash format.")

        # 3. Validate relationships if provided
        if data.inspection_id:
            insp = db.query(FieldInspection).filter(FieldInspection.id == data.inspection_id).first()
            if not insp:
                raise EntityNotFoundError("FieldInspection", data.inspection_id)
            if insp.mine_id != data.mine_id:
                raise BusinessRuleViolationError(f"Inspection #{data.inspection_id} does not belong to Mine ID {data.mine_id}.")

        if data.observation_id:
            obs = db.query(EnvironmentalObservation).filter(EnvironmentalObservation.id == data.observation_id).first()
            if not obs:
                raise EntityNotFoundError("EnvironmentalObservation", data.observation_id)
            if obs.mine_id != data.mine_id:
                raise BusinessRuleViolationError(f"Observation #{data.observation_id} does not belong to Mine ID {data.mine_id}.")

        evidence = FieldEvidence(
            evidence_code=data.evidence_code,
            mine_id=data.mine_id,
            inspection_id=data.inspection_id,
            observation_id=data.observation_id,
            incident_id=data.incident_id,
            evidence_type=data.evidence_type,
            title=data.title,
            description=data.description,
            file_url_or_path=data.file_url_or_path,
            file_hash_sha256=data.file_hash_sha256.lower(),
            file_size_bytes=data.file_size_bytes,
            mime_type=data.mime_type or "image/jpeg",
            location_source=data.location_source or "ACTUAL_GPS",
            verification_status="PENDING",
            latitude=data.latitude,
            longitude=data.longitude,
            gps_accuracy_meters=data.gps_accuracy_meters,
            client_capture_timestamp=data.client_capture_timestamp,
            server_received_timestamp=datetime.now(timezone.utc),
            captured_by_id=user.id,
            created_at=datetime.now(timezone.utc)
        )
        db.add(evidence)
        db.commit()
        db.refresh(evidence)

        AuditService.log_event(
            db=db,
            actor_id=user.id,
            action="FIELD_EVIDENCE_RECORDED",
            resource_type="FieldEvidence",
            resource_id=data.evidence_code,
            mine_id=data.mine_id,
            metadata={"hash_sha256": data.file_hash_sha256.lower(), "type": data.evidence_type, "location_source": data.location_source}
        )

        return evidence

    @staticmethod
    def verify_evidence(
        db: Session,
        evidence_id: int,
        user: User,
        status: str,
        verification_notes: Optional[str] = None
    ) -> FieldEvidence:
        evidence = db.query(FieldEvidence).filter(FieldEvidence.id == evidence_id).first()
        if not evidence:
            raise EntityNotFoundError("FieldEvidence", evidence_id)

        if not check_mine_access(user, evidence.mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {evidence.mine_id}")

        user_roles = [ur.role.name for ur in user.user_roles] if user.user_roles else []
        if getattr(user, "is_superuser", False) and "SYSTEM_ADMIN" not in user_roles:
            user_roles.append("SYSTEM_ADMIN")
        authorized_reviewer_roles = ["SYSTEM_ADMIN", "REGULATOR", "MINE_MANAGER", "MINE_SAFETY_OFFICER"]
        if not any(r in authorized_reviewer_roles for r in user_roles):
            raise PermissionDeniedError("Only Mine Managers, Safety Officers, Regulators, or Admins can verify evidence.")

        # Separation of duties: Field Inspector cannot self-verify evidence they captured unless they have supervisory role
        if evidence.captured_by_id == user.id and not any(r in ["SYSTEM_ADMIN", "REGULATOR", "MINE_MANAGER"] for r in user_roles):
            raise BusinessRuleViolationError("Separation of Duties: Inspector cannot self-verify their own captured evidence.")

        if status not in ["VERIFIED", "REJECTED"]:
            raise BusinessRuleViolationError(f"Invalid verification status '{status}'. Must be VERIFIED or REJECTED.")

        evidence.verification_status = status
        evidence.verified_by_id = user.id
        evidence.verification_notes = verification_notes
        db.commit()
        db.refresh(evidence)

        AuditService.log_event(
            db=db,
            actor_id=user.id,
            action=f"FIELD_EVIDENCE_{status}",
            resource_type="FieldEvidence",
            resource_id=evidence.evidence_code,
            mine_id=evidence.mine_id,
            after_state=f"VerificationStatus:{status}|Notes:{verification_notes}"
        )

        return evidence

    @staticmethod
    def process_sync_batch(
        db: Session,
        user: User,
        batch: SyncBatchRequest
    ) -> SyncBatchResponse:
        """
        Idempotent, fault-tolerant batch synchronization for offline field operations.
        Validates authorizations, records sync logs, and updates core governance entities.
        """
        if not check_mine_access(user, batch.mine_id, db):
            raise PermissionDeniedError(f"Access denied: User not authorized for Mine {batch.mine_id}")

        results: List[SyncOperationResult] = []
        accepted_cnt = 0
        rejected_cnt = 0
        conflict_cnt = 0

        # Maintain in-batch created entity ID mapping for dependent references (e.g. offline inspection -> evidence)
        created_entity_map: Dict[str, int] = {}

        for op in batch.operations:
            # 1. Idempotency Check: check if operation_id was already processed
            existing_log = db.query(FieldSyncLog).filter(FieldSyncLog.operation_id == op.operation_id).first()
            if existing_log:
                # If existing log was accepted and has an entity_id, map it
                if existing_log.entity_id and existing_log.entity_id.isdigit():
                    created_entity_map[op.operation_id] = int(existing_log.entity_id)
                results.append(SyncOperationResult(
                    operation_id=op.operation_id,
                    entity_type=op.entity_type,
                    entity_id=op.entity_id,
                    server_id=int(existing_log.entity_id) if (existing_log.entity_id and existing_log.entity_id.isdigit()) else None,
                    status="ALREADY_PROCESSED",
                    error=None
                ))
                continue

            try:
                # 2. Entity Dispatcher
                if op.entity_type == "INSPECTION":
                    payload = op.payload
                    if op.operation_type == "CREATE":
                        insp_data = FieldInspectionCreate(
                            mine_id=batch.mine_id,
                            level_id=payload.get("level_id"),
                            zone_id=payload.get("zone_id"),
                            inspection_type=payload.get("inspection_type", "ROUTINE_SAFETY"),
                            scheduled_date=payload.get("scheduled_date", datetime.now(timezone.utc)),
                            status=payload.get("status", "SUBMITTED"),
                            checklist=[ChecklistItem(**c) for c in payload.get("checklist", [])],
                            summary_notes=payload.get("summary_notes"),
                            severity_assessment=payload.get("severity_assessment", "LOW"),
                            latitude=payload.get("latitude"),
                            longitude=payload.get("longitude"),
                            gps_accuracy_meters=payload.get("gps_accuracy_meters")
                        )
                        created_insp = FieldService.create_inspection(db, user, insp_data)
                        created_entity_map[op.operation_id] = created_insp.id
                        created_entity_map[created_insp.inspection_code] = created_insp.id
                        if op.entity_id:
                            created_entity_map[str(op.entity_id)] = created_insp.id

                        results.append(SyncOperationResult(
                            operation_id=op.operation_id,
                            entity_type=op.entity_type,
                            entity_id=created_insp.inspection_code,
                            server_id=created_insp.id,
                            status="ACCEPTED"
                        ))
                        accepted_cnt += 1

                    elif op.operation_type == "UPDATE":
                        raw_insp_id = payload.get("id") or op.entity_id
                        insp_id = created_entity_map.get(str(raw_insp_id), raw_insp_id)
                        if not insp_id:
                            raise BusinessRuleViolationError("Inspection ID required for UPDATE operation.")
                        
                        # Look up inspection code or integer ID
                        if isinstance(insp_id, str) and not insp_id.isdigit():
                            insp_obj = db.query(FieldInspection).filter(
                                (FieldInspection.inspection_code == insp_id) &
                                (FieldInspection.mine_id == batch.mine_id)
                            ).first()
                            if insp_obj:
                                insp_id = insp_obj.id
                            else:
                                raise EntityNotFoundError("FieldInspection", insp_id)

                        insp_update = FieldInspectionUpdate(
                            status=payload.get("status"),
                            checklist=[ChecklistItem(**c) for c in payload.get("checklist", [])] if "checklist" in payload else None,
                            summary_notes=payload.get("summary_notes"),
                            severity_assessment=payload.get("severity_assessment"),
                            latitude=payload.get("latitude"),
                            longitude=payload.get("longitude"),
                            gps_accuracy_meters=payload.get("gps_accuracy_meters")
                        )
                        updated_insp = FieldService.update_inspection(db, int(insp_id), user, insp_update)
                        created_entity_map[op.operation_id] = updated_insp.id
                        if op.entity_id:
                            created_entity_map[str(op.entity_id)] = updated_insp.id

                        results.append(SyncOperationResult(
                            operation_id=op.operation_id,
                            entity_type=op.entity_type,
                            entity_id=updated_insp.inspection_code,
                            server_id=updated_insp.id,
                            status="ACCEPTED"
                        ))
                        accepted_cnt += 1

                elif op.entity_type == "TASK":
                    payload = op.payload
                    raw_task_id = payload.get("task_id") or payload.get("id") or op.entity_id
                    if not raw_task_id:
                        raise BusinessRuleViolationError("Task ID required for TASK operation.")
                    task_id = int(created_entity_map.get(str(raw_task_id), raw_task_id))
                    target_status = payload.get("status", "IN_PROGRESS")
                    res_notes = payload.get("resolution_notes")
                    comment = payload.get("comment")

                    updated_task = FieldService.update_task_status(
                        db=db,
                        user=user,
                        task_id=task_id,
                        status=target_status,
                        resolution_notes=res_notes,
                        comment=comment
                    )

                    results.append(SyncOperationResult(
                        operation_id=op.operation_id,
                        entity_type=op.entity_type,
                        entity_id=str(updated_task.id),
                        server_id=updated_task.id,
                        status="ACCEPTED"
                    ))
                    accepted_cnt += 1

                elif op.entity_type == "OBSERVATION":
                    payload = op.payload
                    obs = EnvironmentalObservation(
                        mine_id=batch.mine_id,
                        parameter_name=payload.get("parameter_name", "Atmospheric & Dust Observation"),
                        observed_value=float(payload.get("observed_value", 1.0)),
                        threshold_limit=float(payload.get("threshold_limit", 2.0)),
                        unit=payload.get("unit", "mg/m3"),
                        severity=payload.get("severity", "MEDIUM"),
                        status=payload.get("status", "OPEN"),
                        location_context=payload.get("location_context", "Field Inspector Observation"),
                        x=float(payload.get("x", 0.0)),
                        y=float(payload.get("y", 200.0)),
                        z=float(payload.get("z", -180.0)),
                        action_taken=payload.get("action_taken"),
                        detected_at=op.client_timestamp
                    )
                    db.add(obs)
                    db.commit()
                    db.refresh(obs)

                    created_entity_map[op.operation_id] = obs.id
                    if op.entity_id:
                        created_entity_map[str(op.entity_id)] = obs.id

                    AuditService.log_event(
                        db=db,
                        actor_id=user.id,
                        action="FIELD_OBSERVATION_SYNCED",
                        resource_type="EnvironmentalObservation",
                        resource_id=str(obs.id),
                        mine_id=batch.mine_id,
                        after_state=f"Observed:{obs.observed_value}{obs.unit}|Severity:{obs.severity}"
                    )

                    results.append(SyncOperationResult(
                        operation_id=op.operation_id,
                        entity_type=op.entity_type,
                        entity_id=str(obs.id),
                        server_id=obs.id,
                        status="ACCEPTED"
                    ))
                    accepted_cnt += 1

                elif op.entity_type == "INCIDENT":
                    payload = op.payload
                    if op.operation_type == "CREATE":
                        count = db.query(Incident).filter(Incident.mine_id == batch.mine_id).count() + 1
                        inc_code = f"INC-{datetime.now().year}-FLD-{count:03d}"
                        incident = Incident(
                            incident_code=inc_code,
                            mine_id=batch.mine_id,
                            title=payload.get("title", "Field Logged Safety Incident"),
                            description=payload.get("description", "Reported by field mobile inspector"),
                            category=payload.get("category", "HAZARD_CONDITION"),
                            severity=payload.get("severity", "MEDIUM"),
                            status=payload.get("status", "OPEN"),
                            reporter_id=user.id,
                            x=float(payload.get("x", 0.0)),
                            y=float(payload.get("y", 200.0)),
                            z=float(payload.get("z", -180.0)),
                            latitude=payload.get("latitude"),
                            longitude=payload.get("longitude"),
                            created_at=op.client_timestamp if op.client_timestamp else datetime.now(timezone.utc)
                        )
                        db.add(incident)
                        db.commit()
                        db.refresh(incident)

                        created_entity_map[op.operation_id] = incident.id
                        created_entity_map[inc_code] = incident.id
                        if op.entity_id:
                            created_entity_map[str(op.entity_id)] = incident.id

                        results.append(SyncOperationResult(
                            operation_id=op.operation_id,
                            entity_type=op.entity_type,
                            entity_id=inc_code,
                            server_id=incident.id,
                            status="ACCEPTED"
                        ))
                        accepted_cnt += 1
                    else:
                        # UPDATE incident status
                        raw_inc_id = payload.get("id") or op.entity_id
                        inc_id = created_entity_map.get(str(raw_inc_id), raw_inc_id)
                        incident = db.query(Incident).filter(
                            (Incident.id == int(inc_id)) if str(inc_id).isdigit() else (Incident.incident_code == str(inc_id))
                        ).first()
                        if not incident:
                            raise EntityNotFoundError("Incident", inc_id)
                        if not check_mine_access(user, incident.mine_id, db):
                            raise PermissionDeniedError(f"Access denied to Incident {inc_id}")

                        if "status" in payload:
                            incident.status = payload["status"]
                        if "resolution_notes" in payload:
                            incident.resolution_notes = payload["resolution_notes"]
                        incident.updated_at = datetime.now(timezone.utc)
                        db.commit()
                        db.refresh(incident)

                        results.append(SyncOperationResult(
                            operation_id=op.operation_id,
                            entity_type=op.entity_type,
                            entity_id=incident.incident_code,
                            server_id=incident.id,
                            status="ACCEPTED"
                        ))
                        accepted_cnt += 1

                elif op.entity_type == "CORRECTIVE_ACTION":
                    payload = op.payload
                    violation_id = payload.get("violation_id", 1)
                    ca = CorrectiveAction(
                        violation_id=int(violation_id),
                        assignee_id=user.id,
                        action_text=payload.get("action_text", "Field corrective action"),
                        target_completion_date=payload.get("target_completion_date", datetime.now(timezone.utc)),
                        status=payload.get("status", "PENDING"),
                        completion_notes=payload.get("completion_notes")
                    )
                    db.add(ca)
                    db.commit()
                    db.refresh(ca)

                    results.append(SyncOperationResult(
                        operation_id=op.operation_id,
                        entity_type=op.entity_type,
                        entity_id=str(ca.id),
                        server_id=ca.id,
                        status="ACCEPTED"
                    ))
                    accepted_cnt += 1

                elif op.entity_type == "EVIDENCE":
                    payload = op.payload
                    # Resolve parent references if created earlier in the offline queue/batch
                    raw_insp_id = payload.get("inspection_id")
                    resolved_insp_id = None
                    if raw_insp_id is not None:
                        resolved_insp_id = created_entity_map.get(str(raw_insp_id), raw_insp_id)
                        if isinstance(resolved_insp_id, str) and resolved_insp_id.isdigit():
                            resolved_insp_id = int(resolved_insp_id)

                    raw_inc_id = payload.get("incident_id")
                    resolved_inc_id = None
                    if raw_inc_id is not None:
                        resolved_inc_id = created_entity_map.get(str(raw_inc_id), raw_inc_id)
                        if isinstance(resolved_inc_id, str) and resolved_inc_id.isdigit():
                            resolved_inc_id = int(resolved_inc_id)

                    ev_data = FieldEvidenceCreate(
                        evidence_code=payload.get("evidence_code", f"EVID-{datetime.now().year}-{op.operation_id[:8]}"),
                        mine_id=batch.mine_id,
                        inspection_id=resolved_insp_id if isinstance(resolved_insp_id, int) else None,
                        observation_id=payload.get("observation_id"),
                        incident_id=resolved_inc_id if isinstance(resolved_inc_id, int) else None,
                        evidence_type=payload.get("evidence_type", "PHOTO"),
                        title=payload.get("title", "Field Captured Evidence"),
                        description=payload.get("description"),
                        file_url_or_path=payload.get("file_url_or_path"),
                        file_hash_sha256=payload.get("file_hash_sha256", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"),
                        file_size_bytes=int(payload.get("file_size_bytes", 1024)),
                        latitude=payload.get("latitude"),
                        longitude=payload.get("longitude"),
                        gps_accuracy_meters=payload.get("gps_accuracy_meters"),
                        client_capture_timestamp=op.client_timestamp
                    )
                    ev_rec = FieldService.save_evidence(db, user, ev_data)
                    created_entity_map[op.operation_id] = ev_rec.id
                    if op.entity_id:
                        created_entity_map[str(op.entity_id)] = ev_rec.id

                    results.append(SyncOperationResult(
                        operation_id=op.operation_id,
                        entity_type=op.entity_type,
                        entity_id=ev_rec.evidence_code,
                        server_id=ev_rec.id,
                        status="ACCEPTED"
                    ))
                    accepted_cnt += 1

                elif op.entity_type == "ATTENDANCE":
                    payload = op.payload
                    worker_id = int(payload.get("worker_id"))
                    att_status = payload.get("status", "PRESENT")
                    shift_code = payload.get("shift_code", "A")
                    notes = payload.get("notes")
                    rec = FieldService.record_mobile_attendance_internal(
                        db=db,
                        user=user,
                        mine_id=batch.mine_id,
                        worker_id=worker_id,
                        status=att_status,
                        shift_code=shift_code,
                        notes=notes,
                        client_timestamp=op.client_timestamp
                    )
                    created_entity_map[op.operation_id] = rec.id
                    results.append(SyncOperationResult(
                        operation_id=op.operation_id,
                        entity_type=op.entity_type,
                        entity_id=str(rec.id),
                        server_id=rec.id,
                        status="ACCEPTED"
                    ))
                    accepted_cnt += 1

                elif op.entity_type == "HANDOVER":
                    payload = op.payload
                    if op.operation_type == "CREATE":
                        ho = FieldService.create_shift_handover_internal(
                            db=db,
                            user=user,
                            mine_id=batch.mine_id,
                            from_shift=payload.get("from_shift_code", "A"),
                            to_shift=payload.get("to_shift_code", "B"),
                            summary_notes=payload.get("summary_notes", "Shift Handover Log"),
                            safety_summary=payload.get("safety_summary")
                        )
                        created_entity_map[op.operation_id] = ho.id
                        results.append(SyncOperationResult(
                            operation_id=op.operation_id,
                            entity_type=op.entity_type,
                            entity_id=ho.handover_code,
                            server_id=ho.id,
                            status="ACCEPTED"
                        ))
                        accepted_cnt += 1
                    elif op.operation_type in ["UPDATE", "ACKNOWLEDGE"]:
                        ho_id = int(payload.get("handover_id") or op.entity_id)
                        ho = FieldService.acknowledge_shift_handover_internal(
                            db=db,
                            user=user,
                            handover_id=ho_id,
                            acknowledgment_notes=payload.get("acknowledgment_notes")
                        )
                        results.append(SyncOperationResult(
                            operation_id=op.operation_id,
                            entity_type=op.entity_type,
                            entity_id=ho.handover_code,
                            server_id=ho.id,
                            status="ACCEPTED"
                        ))
                        accepted_cnt += 1

                elif op.entity_type in ["PRODUCTION", "PRODUCTION_REPORT"]:
                    payload = op.payload
                    prod_data = MobileProductionReportCreate(
                        mine_id=batch.mine_id,
                        shift=payload.get("shift", "A"),
                        report_date=payload.get("report_date"),
                        material_type=payload.get("material_type", "COAL_RAW"),
                        planned_quantity=float(payload.get("planned_quantity", 0.0)),
                        actual_quantity=float(payload.get("actual_quantity", 0.0)),
                        unit=payload.get("unit", "TONNES"),
                        coal_grade=payload.get("coal_grade", "G-11 Steam Coal"),
                        production_source=payload.get("production_source", "MANUAL"),
                        notes=payload.get("notes"),
                        evidence_code=payload.get("evidence_code"),
                        latitude=payload.get("latitude"),
                        longitude=payload.get("longitude")
                    )
                    prod_rec = FieldService.record_mobile_production_report(
                        db=db,
                        user=user,
                        payload=prod_data,
                        client_timestamp=op.client_timestamp
                    )
                    created_entity_map[op.operation_id] = prod_rec.id
                    created_entity_map[prod_rec.report_code] = prod_rec.id
                    if op.entity_id:
                        created_entity_map[str(op.entity_id)] = prod_rec.id
                    results.append(SyncOperationResult(
                        operation_id=op.operation_id,
                        entity_type=op.entity_type,
                        entity_id=prod_rec.report_code,
                        server_id=prod_rec.id,
                        status="ACCEPTED"
                    ))
                    accepted_cnt += 1

                elif op.entity_type in ["ENVIRONMENT", "ENVIRONMENT_OBSERVATION"]:
                    payload = op.payload
                    env_data = MobileEnvironmentalObservationCreate(
                        mine_id=batch.mine_id,
                        parameter_name=payload.get("parameter_name", "PM10"),
                        observed_value=float(payload.get("observed_value", 0.0)),
                        unit=payload.get("unit", "µg/m³"),
                        rule_id=payload.get("rule_id"),
                        threshold_limit=float(payload["threshold_limit"]) if payload.get("threshold_limit") is not None else None,
                        measurement_source=payload.get("measurement_source", "MANUAL"),
                        severity=payload.get("severity", "MEDIUM"),
                        location_context=payload.get("location_context"),
                        x=float(payload.get("x", 0.0)),
                        y=float(payload.get("y", 0.0)),
                        z=float(payload.get("z", 0.0)),
                        latitude=payload.get("latitude"),
                        longitude=payload.get("longitude"),
                        action_taken=payload.get("action_taken"),
                        evidence_code=payload.get("evidence_code")
                    )
                    env_rec = FieldService.record_mobile_environmental_observation(
                        db=db,
                        user=user,
                        payload=env_data,
                        client_timestamp=op.client_timestamp
                    )
                    created_entity_map[op.operation_id] = env_rec.id
                    if op.entity_id:
                        created_entity_map[str(op.entity_id)] = env_rec.id
                    results.append(SyncOperationResult(
                        operation_id=op.operation_id,
                        entity_type=op.entity_type,
                        entity_id=str(env_rec.id),
                        server_id=env_rec.id,
                        status="ACCEPTED"
                    ))
                    accepted_cnt += 1

                elif op.entity_type in ["COMPLIANCE", "VIOLATION", "COMPLIANCE_OBSERVATION"]:
                    payload = op.payload
                    comp_data = MobileComplianceObservationCreate(
                        mine_id=batch.mine_id,
                        title=payload.get("title", "Statutory Compliance Observation"),
                        description=payload.get("description", "Field compliance observation"),
                        regulatory_clause=payload.get("regulatory_clause", "CMR 2017 - General"),
                        statute=payload.get("statute", "DGMS_CMR_2017"),
                        severity=payload.get("severity", "HIGH"),
                        remedial_deadline=payload.get("remedial_deadline"),
                        financial_penalty_amount=float(payload.get("financial_penalty_amount", 0.0)),
                        corrective_action_text=payload.get("corrective_action_text"),
                        corrective_action_target_date=payload.get("corrective_action_target_date"),
                        location_context=payload.get("location_context"),
                        evidence_code=payload.get("evidence_code"),
                        latitude=payload.get("latitude"),
                        longitude=payload.get("longitude")
                    )
                    comp_rec = FieldService.record_mobile_compliance_observation(
                        db=db,
                        user=user,
                        payload=comp_data,
                        client_timestamp=op.client_timestamp
                    )
                    created_entity_map[op.operation_id] = comp_rec.id
                    created_entity_map[comp_rec.violation_code] = comp_rec.id
                    if op.entity_id:
                        created_entity_map[str(op.entity_id)] = comp_rec.id
                    results.append(SyncOperationResult(
                        operation_id=op.operation_id,
                        entity_type=op.entity_type,
                        entity_id=comp_rec.violation_code,
                        server_id=comp_rec.id,
                        status="ACCEPTED"
                    ))
                    accepted_cnt += 1

                elif op.entity_type in ["CONTRACTOR_VERIFICATION", "CONTRACT_REQUIREMENT"]:
                    payload = op.payload
                    verif_data = MobileContractorVerificationCreate(
                        requirement_id=int(payload.get("requirement_id") or op.entity_id),
                        contract_id=payload.get("contract_id"),
                        verification_status=payload.get("verification_status", "DOCUMENTED"),
                        verification_notes=payload.get("verification_notes", "Verified via offline field sync"),
                        expiry_date=payload.get("expiry_date"),
                        evidence_file_name=payload.get("evidence_file_name"),
                        evidence_url=payload.get("evidence_url"),
                        evidence_file_hash=payload.get("evidence_file_hash"),
                        device_latitude=payload.get("device_latitude"),
                        device_longitude=payload.get("device_longitude"),
                        location_source=payload.get("location_source", "ACTUAL_GPS"),
                        location_context=payload.get("location_context"),
                        create_corrective_action=payload.get("create_corrective_action", False),
                        corrective_action_title=payload.get("corrective_action_title"),
                        corrective_action_description=payload.get("corrective_action_description"),
                        remedial_deadline=payload.get("remedial_deadline"),
                        assigned_to_id=payload.get("assigned_to_id")
                    )
                    req_rec = FieldService.verify_contract_requirement(
                        db=db,
                        user=user,
                        payload=verif_data,
                        client_timestamp=op.client_timestamp
                    )
                    created_entity_map[op.operation_id] = req_rec.id
                    if op.entity_id:
                        created_entity_map[str(op.entity_id)] = req_rec.id
                    results.append(SyncOperationResult(
                        operation_id=op.operation_id,
                        entity_type=op.entity_type,
                        entity_id=str(req_rec.id),
                        server_id=req_rec.id,
                        status="ACCEPTED"
                    ))
                    accepted_cnt += 1

                elif op.entity_type in ["GRIEVANCE", "GRIEVANCE_OPERATION", "MOBILE_GRIEVANCE"]:
                    payload = op.payload
                    if op.operation_type == "CREATE":
                        grv_data = MobileGrievanceCreate(
                            mine_id=batch.mine_id,
                            category=payload.get("category", "WORKER_WELFARE"),
                            title=payload.get("title", "Field Grievance"),
                            description=payload.get("description", "Recorded via mobile field sync"),
                            priority=payload.get("priority", "MEDIUM"),
                            anonymous=payload.get("anonymous", False),
                            location_context=payload.get("location_context"),
                            latitude=payload.get("latitude"),
                            longitude=payload.get("longitude"),
                            location_source=payload.get("location_source", "ACTUAL_GPS"),
                            evidence_file_name=payload.get("evidence_file_name"),
                            evidence_url=payload.get("evidence_url"),
                            evidence_file_hash=payload.get("evidence_file_hash"),
                            source_channel=payload.get("source_channel", "MOBILE_FIELD")
                        )
                        grv_rec = FieldService.create_mobile_grievance(
                            db=db,
                            user=user,
                            payload=grv_data,
                            client_timestamp=op.client_timestamp
                        )
                        created_entity_map[op.operation_id] = grv_rec.id
                        created_entity_map[grv_rec.grievance_code] = grv_rec.id
                        if op.entity_id:
                            created_entity_map[str(op.entity_id)] = grv_rec.id
                        results.append(SyncOperationResult(
                            operation_id=op.operation_id,
                            entity_type=op.entity_type,
                            entity_id=grv_rec.grievance_code,
                            server_id=grv_rec.id,
                            status="ACCEPTED"
                        ))
                        accepted_cnt += 1
                    elif op.operation_type == "INVESTIGATE":
                        raw_grv_id = payload.get("grievance_id") or op.entity_id
                        resolved_grv_id = created_entity_map.get(str(raw_grv_id), raw_grv_id)
                        inv_data = MobileGrievanceInvestigate(
                            investigation_notes=payload.get("investigation_notes", "Investigation recorded offline"),
                            action_required=payload.get("action_required", False),
                            evidence_file_name=payload.get("evidence_file_name"),
                            evidence_url=payload.get("evidence_url"),
                            evidence_file_hash=payload.get("evidence_file_hash"),
                            latitude=payload.get("latitude"),
                            longitude=payload.get("longitude"),
                            location_source=payload.get("location_source", "ACTUAL_GPS"),
                            create_task=payload.get("create_task", False),
                            task_title=payload.get("task_title"),
                            task_description=payload.get("task_description"),
                            task_sla_days=payload.get("task_sla_days", 3),
                            create_incident=payload.get("create_incident", False),
                            incident_title=payload.get("incident_title"),
                            incident_severity=payload.get("incident_severity", "MEDIUM")
                        )
                        grv_rec = FieldService.investigate_mobile_grievance(
                            db=db,
                            user=user,
                            grievance_id=int(resolved_grv_id),
                            payload=inv_data
                        )
                        results.append(SyncOperationResult(
                            operation_id=op.operation_id,
                            entity_type=op.entity_type,
                            entity_id=grv_rec.grievance_code,
                            server_id=grv_rec.id,
                            status="ACCEPTED"
                        ))
                        accepted_cnt += 1
                    elif op.operation_type == "RESOLVE":
                        raw_grv_id = payload.get("grievance_id") or op.entity_id
                        resolved_grv_id = created_entity_map.get(str(raw_grv_id), raw_grv_id)
                        res_data = MobileGrievanceResolve(
                            resolution_notes=payload.get("resolution_notes", "Resolved offline"),
                            submit_for_review=payload.get("submit_for_review", True)
                        )
                        grv_rec = FieldService.resolve_mobile_grievance(
                            db=db,
                            user=user,
                            grievance_id=int(resolved_grv_id),
                            payload=res_data
                        )
                        results.append(SyncOperationResult(
                            operation_id=op.operation_id,
                            entity_type=op.entity_type,
                            entity_id=grv_rec.grievance_code,
                            server_id=grv_rec.id,
                            status="ACCEPTED"
                        ))
                        accepted_cnt += 1

                elif op.entity_type in ["PREDICTIVE_RISK", "RISK_PREDICTION", "PREDICTION_VERIFICATION"]:
                    payload = op.payload
                    pred_id = int(payload.get("prediction_id") or op.entity_id)
                    verif_payload = MobileRiskVerifyPayload(
                        outcome=payload.get("outcome", "NO_ISSUE_OBSERVED"),
                        notes=payload.get("notes", "Verified via offline field sync"),
                        latitude=payload.get("latitude"),
                        longitude=payload.get("longitude"),
                        location_context=payload.get("location_context"),
                        evidence_url=payload.get("evidence_url"),
                        evidence_file_name=payload.get("evidence_file_name"),
                        evidence_file_hash=payload.get("evidence_file_hash"),
                        create_governance_task=payload.get("create_governance_task", False),
                        task_title=payload.get("task_title"),
                        task_priority=payload.get("task_priority", "HIGH"),
                        create_incident=payload.get("create_incident", False),
                        incident_title=payload.get("incident_title"),
                        incident_severity=payload.get("incident_severity", "HIGH")
                    )
                    verified_pred = FieldService.verify_mobile_risk(
                        db=db,
                        user=user,
                        prediction_id=pred_id,
                        payload=verif_payload
                    )
                    results.append(SyncOperationResult(
                        operation_id=op.operation_id,
                        entity_type=op.entity_type,
                        entity_id=str(verified_pred.id),
                        server_id=verified_pred.id,
                        status="ACCEPTED"
                    ))
                    accepted_cnt += 1

                # Log successful sync
                sync_log = FieldSyncLog(
                    operation_id=op.operation_id,
                    mine_id=batch.mine_id,
                    user_id=user.id,
                    entity_type=op.entity_type,
                    entity_id=str(results[-1].server_id) if results[-1].server_id else op.entity_id,
                    operation_type=op.operation_type,
                    client_timestamp=op.client_timestamp,
                    status="ACCEPTED"
                )
                db.add(sync_log)
                db.commit()

            except Exception as e:
                logger.error(f"Sync operation {op.operation_id} failed: {e}")
                err_msg = str(e)
                status_code = "CONFLICT" if "transition" in err_msg.lower() or "conflict" in err_msg.lower() else "REJECTED"
                if status_code == "CONFLICT":
                    conflict_cnt += 1
                else:
                    rejected_cnt += 1

                sync_log = FieldSyncLog(
                    operation_id=op.operation_id,
                    mine_id=batch.mine_id,
                    user_id=user.id,
                    entity_type=op.entity_type,
                    entity_id=op.entity_id,
                    operation_type=op.operation_type,
                    client_timestamp=op.client_timestamp,
                    status=status_code,
                    error_message=err_msg
                )
                db.add(sync_log)
                db.commit()

                results.append(SyncOperationResult(
                    operation_id=op.operation_id,
                    entity_type=op.entity_type,
                    entity_id=op.entity_id,
                    status=status_code,
                    error=err_msg
                ))

        return SyncBatchResponse(
            mine_id=batch.mine_id,
            processed_count=len(batch.operations),
            accepted_count=accepted_cnt,
            rejected_count=rejected_cnt,
            conflict_count=conflict_cnt,
            results=results
        )

    @staticmethod
    def get_sync_status(db: Session, user: User, mine_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Aggregates server-side sync log metrics and last successful server sync timestamp for authorized mine scope.
        """
        roles = get_user_roles(user, db)
        query = db.query(FieldSyncLog)

        if mine_id is not None:
            if not check_mine_access(user, mine_id, db):
                raise PermissionDeniedError(f"Access denied to Mine ID {mine_id}")
            query = query.filter(FieldSyncLog.mine_id == mine_id)
        else:
            if not (user.is_superuser or RoleEnum.SYSTEM_ADMIN.value in roles or RoleEnum.REGULATOR.value in roles):
                assigned_mines = [a.mine_id for a in user.mine_assignments]
                query = query.filter(FieldSyncLog.mine_id.in_(assigned_mines))

        logs = query.all()

        total = len(logs)
        accepted = sum(1 for l in logs if l.status == "ACCEPTED")
        rejected = sum(1 for l in logs if l.status == "REJECTED")
        conflicts = sum(1 for l in logs if l.status == "CONFLICT")
        already_processed = sum(1 for l in logs if l.status == "ALREADY_PROCESSED")

        # Find latest successful server sync
        latest_accepted = query.filter(FieldSyncLog.status == "ACCEPTED").order_by(desc(FieldSyncLog.created_at)).first()
        last_sync_timestamp = latest_accepted.created_at.isoformat() if latest_accepted else None

        return {
            "mine_id": mine_id,
            "last_server_sync_timestamp": last_sync_timestamp,
            "metrics": {
                "total_logged": total,
                "accepted": accepted,
                "rejected": rejected,
                "conflicts": conflicts,
                "already_processed": already_processed
            }
        }

    @staticmethod
    def get_sync_logs(
        db: Session,
        user: User,
        mine_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Returns paginated queryable history of FieldSyncLog records with audit details.
        """
        roles = get_user_roles(user, db)
        query = db.query(FieldSyncLog)

        if mine_id is not None:
            if not check_mine_access(user, mine_id, db):
                raise PermissionDeniedError(f"Access denied to Mine ID {mine_id}")
            query = query.filter(FieldSyncLog.mine_id == mine_id)
        else:
            if not (user.is_superuser or RoleEnum.SYSTEM_ADMIN.value in roles or RoleEnum.REGULATOR.value in roles):
                assigned_mines = [a.mine_id for a in user.mine_assignments]
                query = query.filter(FieldSyncLog.mine_id.in_(assigned_mines))

        if status:
            query = query.filter(FieldSyncLog.status == status.upper())

        total = query.count()
        logs = query.order_by(desc(FieldSyncLog.created_at)).offset(offset).limit(limit).all()

        serialized = []
        for l in logs:
            serialized.append({
                "id": l.id,
                "operation_id": l.operation_id,
                "mine_id": l.mine_id,
                "user_id": l.user_id,
                "entity_type": l.entity_type,
                "entity_id": l.entity_id,
                "operation_type": l.operation_type,
                "client_timestamp": l.client_timestamp.isoformat() if l.client_timestamp else None,
                "status": l.status,
                "error_message": l.error_message,
                "created_at": l.created_at.isoformat() if l.created_at else None
            })

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "logs": serialized
        }

    @staticmethod
    def get_work_queue(db: Session, user: User, mine_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Unified work queue for field operations and shift management.
        Aggregates assigned GovernanceTasks and FieldInspections with SLA status, risk context, and shift context.
        """
        roles = get_user_roles(user, db)
        if mine_id is not None:
            if not check_mine_access(user, mine_id, db):
                raise PermissionDeniedError(f"Access denied to Mine ID {mine_id}")
            mine_ids = [mine_id]
        else:
            if user.is_superuser or RoleEnum.SYSTEM_ADMIN.value in roles or RoleEnum.REGULATOR.value in roles:
                mines = db.query(Mine).all()
                mine_ids = [m.id for m in mines]
            else:
                mine_ids = [a.mine_id for a in user.mine_assignments]

        # 1. Fetch GovernanceTasks
        task_query = db.query(GovernanceTask).filter(GovernanceTask.mine_id.in_(mine_ids))
        if RoleEnum.FIELD_INSPECTOR.value in roles and not (RoleEnum.SYSTEM_ADMIN.value in roles or RoleEnum.MINE_MANAGER.value in roles or RoleEnum.MINE_SAFETY_OFFICER.value in roles):
            task_query = task_query.filter((GovernanceTask.assignee_id == user.id) | (GovernanceTask.assignee_id.is_(None)))

        gov_tasks = task_query.order_by(desc(GovernanceTask.created_at)).all()

        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)

        enriched_tasks = []
        for t in gov_tasks:
            # Determine SLA state
            due_at = t.due_at
            if due_at and due_at.tzinfo is None:
                due_at = due_at.replace(tzinfo=timezone.utc)

            is_overdue = False
            is_due_today = False
            sla_text = "ON TRACK"
            if due_at:
                if due_at < now and t.status not in ["RESOLVED", "VERIFIED", "CLOSED"]:
                    is_overdue = True
                    diff_hours = int((now - due_at).total_seconds() / 3600)
                    sla_text = f"OVERDUE BY {max(1, diff_hours)}h"
                elif today_start <= due_at <= today_end:
                    is_due_today = True
                    diff_hours = int((due_at - now).total_seconds() / 3600)
                    sla_text = f"DUE IN {max(1, diff_hours)}h" if diff_hours > 0 else "DUE TODAY"
                elif due_at > now:
                    diff_hours = int((due_at - now).total_seconds() / 3600)
                    sla_text = f"DUE IN {diff_hours}h"

            # Check related incident/risk
            incident_id = None
            related_incident_code = None
            incident_severity = None
            if t.source_resource_type == "INCIDENT" and t.source_resource_id:
                try:
                    inc = db.query(Incident).filter(Incident.id == int(t.source_resource_id)).first()
                    if inc:
                        incident_id = inc.id
                        related_incident_code = inc.incident_code
                        incident_severity = inc.severity
                except Exception:
                    pass

            # Coordinate/Zone context
            zone_name = None
            lat = t.mine.latitude if t.mine else 23.7957
            lon = t.mine.longitude if t.mine else 86.4304
            if t.mine and t.mine.zones:
                first_zone = t.mine.zones[0]
                zone_name = first_zone.name
                if first_zone.origin_x and first_zone.origin_y:
                    lat = (t.mine.latitude or 23.7957) + (first_zone.origin_y * 0.000009)
                    lon = (t.mine.longitude or 86.4304) + (first_zone.origin_x * 0.000009)

            enriched_tasks.append({
                "id": t.id,
                "task_code": t.task_code,
                "mine_id": t.mine_id,
                "mine_name": t.mine.name if t.mine else None,
                "domain": t.domain,
                "title": t.title,
                "description": t.description,
                "priority": t.priority,
                "status": t.status,
                "assignee_id": t.assignee_id,
                "assignee_name": t.assignee.full_name if t.assignee else None,
                "created_by_id": t.created_by_id,
                "created_by_name": t.created_by.full_name if t.created_by else None,
                "due_at": t.due_at.isoformat() if t.due_at else None,
                "is_overdue": is_overdue,
                "is_due_today": is_due_today,
                "sla_text": sla_text,
                "sla_status": t.sla_status,
                "source_resource_type": t.source_resource_type,
                "source_resource_id": t.source_resource_id,
                "related_incident_id": incident_id,
                "related_incident_code": related_incident_code,
                "related_incident_severity": incident_severity,
                "zone_name": zone_name,
                "latitude": lat,
                "longitude": lon,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "resolved_at": t.resolved_at.isoformat() if t.resolved_at else None,
                "resolution_notes": t.resolution_notes
            })

        # 2. Count metrics
        critical_cnt = sum(1 for t in enriched_tasks if t["priority"] == "CRITICAL" and t["status"] not in ["CLOSED", "VERIFIED"])
        high_cnt = sum(1 for t in enriched_tasks if t["priority"] == "HIGH" and t["status"] not in ["CLOSED", "VERIFIED"])
        due_today_cnt = sum(1 for t in enriched_tasks if t["is_due_today"] and t["status"] not in ["CLOSED", "VERIFIED"])
        overdue_cnt = sum(1 for t in enriched_tasks if t["is_overdue"])
        assigned_cnt = sum(1 for t in enriched_tasks if t["status"] in ["ASSIGNED", "OPEN"])
        in_progress_cnt = sum(1 for t in enriched_tasks if t["status"] == "IN_PROGRESS")
        completed_cnt = sum(1 for t in enriched_tasks if t["status"] in ["COMPLETED", "RESOLVED", "VERIFIED", "CLOSED"])
        pending_ver_cnt = sum(1 for t in enriched_tasks if t["status"] in ["RESOLVED", "SUBMITTED"])

        # 3. Shift context
        primary_mine_id = mine_id or (mine_ids[0] if mine_ids else 1)
        shift_ctx = FieldService.get_shift_context(db, user, primary_mine_id)

        return {
            "mine_id": primary_mine_id,
            "tasks": enriched_tasks,
            "counts": {
                "total": len(enriched_tasks),
                "critical": critical_cnt,
                "high": high_cnt,
                "due_today": due_today_cnt,
                "overdue": overdue_cnt,
                "assigned": assigned_cnt,
                "in_progress": in_progress_cnt,
                "completed": completed_cnt,
                "verification_pending": pending_ver_cnt,
                "pending_verification": pending_ver_cnt
            },
            "shift_context": shift_ctx
        }

    @staticmethod
    def update_task_status(
        db: Session,
        user: User,
        task_id: int,
        status: str,
        resolution_notes: Optional[str] = None,
        comment: Optional[str] = None
    ) -> GovernanceTask:
        task = db.query(GovernanceTask).filter(GovernanceTask.id == task_id).first()
        if not task:
            raise EntityNotFoundError("GovernanceTask", task_id)

        if not check_mine_access(user, task.mine_id, db):
            raise PermissionDeniedError(f"Access denied to Task ID {task_id} in Mine ID {task.mine_id}")

        VALID_TASK_TRANSITIONS = {
            "OPEN": ["ASSIGNED", "IN_PROGRESS"],
            "ASSIGNED": ["IN_PROGRESS"],
            "IN_PROGRESS": ["RESOLVED", "ESCALATED", "ASSIGNED"],
            "ESCALATED": ["IN_PROGRESS", "RESOLVED"],
            "RESOLVED": ["VERIFIED", "IN_PROGRESS"],
            "VERIFIED": ["CLOSED", "IN_PROGRESS"],
            "CLOSED": []
        }

        current_st = task.status
        target_st = status.upper()

        if target_st not in VALID_TASK_TRANSITIONS.get(current_st, []):
            raise BusinessRuleViolationError(
                f"Invalid task transition from {current_st} to {target_st}. Allowed: {VALID_TASK_TRANSITIONS.get(current_st, [])}"
            )

        if target_st == "RESOLVED" and (not resolution_notes or not resolution_notes.strip()):
            raise BusinessRuleViolationError("Resolution notes are required when marking a task as RESOLVED.")

        roles = get_user_roles(user, db)

        # Separation of duties: assignee cannot self-verify resolution unless supervisory role
        if target_st == "VERIFIED":
            is_supervisor = (
                user.is_superuser or
                RoleEnum.SYSTEM_ADMIN.value in roles or
                RoleEnum.MINE_MANAGER.value in roles or
                RoleEnum.MINE_SAFETY_OFFICER.value in roles or
                RoleEnum.REGULATOR.value in roles
            )
            if not is_supervisor:
                raise PermissionDeniedError("Supervisory authorization required to verify task resolution.")
            if task.assignee_id == user.id and not (user.is_superuser or RoleEnum.SYSTEM_ADMIN.value in roles):
                raise BusinessRuleViolationError("Separation of Duties: You cannot verify your own assigned task.")

        now = datetime.now(timezone.utc)
        task.status = target_st
        task.updated_at = now

        if resolution_notes:
            task.resolution_notes = resolution_notes
        if target_st in ["RESOLVED", "VERIFIED", "CLOSED"] and not task.resolved_at:
            task.resolved_at = now

        db.commit()
        db.refresh(task)

        # Log audit event
        AuditService.log_event(
            db=db,
            actor_id=user.id,
            action=f"GOVERNANCE_TASK_STATUS_{target_st}",
            resource_type="GOVERNANCE_TASK",
            resource_id=str(task.id),
            mine_id=task.mine_id,
            before_state={"status": current_st},
            after_state={"status": target_st, "notes": resolution_notes, "comment": comment}
        )

        return task

    @staticmethod
    def get_shift_context(db: Session, user: User, mine_id: int) -> Dict[str, Any]:
        """Returns the current active operational shift and attendance status for the user."""
        mine = db.query(Mine).filter(Mine.id == mine_id).first()
        if not mine:
            return {
                "has_active_shift": False,
                "shift_name": "General Shift",
                "shift_code": "GENERAL",
                "start_time": "08:00",
                "end_time": "16:30",
                "attendance_status": "PRESENT",
                "verification_mode": "SYSTEM_VERIFIED"
            }

        now = datetime.now(timezone.utc)
        current_hour = now.hour

        # Find shift in db or calculate
        shift = db.query(Shift).filter(Shift.mine_id == mine_id).first()
        shift_name = shift.name if shift else "Shift A (Morning Shift)"
        shift_code = shift.shift_code if shift else "A"
        start_time = shift.start_time if shift else "06:00"
        end_time = shift.end_time if shift else "14:00"

        if current_hour >= 14 and current_hour < 22:
            shift_name = "Shift B (Afternoon Shift)"
            shift_code = "B"
            start_time = "14:00"
            end_time = "22:00"
        elif current_hour >= 22 or current_hour < 6:
            shift_name = "Shift C (Night Shift)"
            shift_code = "C"
            start_time = "22:00"
            end_time = "06:00"

        # Check attendance record for today
        today = now.date()
        att = db.query(AttendanceRecord).filter(
            AttendanceRecord.mine_id == mine_id,
            AttendanceRecord.attendance_date == today
        ).first()

        return {
            "has_active_shift": True,
            "mine_id": mine_id,
            "mine_name": mine.name,
            "shift_name": shift_name,
            "shift_code": shift_code,
            "start_time": start_time,
            "end_time": end_time,
            "attendance_status": att.status if att else "PRESENT",
            "verification_mode": att.verification_mode if att else "RFID_TAGGED",
            "check_in_time": att.check_in_time.isoformat() if att and att.check_in_time else now.replace(hour=int(start_time.split(':')[0]), minute=0).isoformat()
        }

    # ---------------------------------------------------------------------------
    # WORKFORCE, ATTENDANCE & SHIFT HANDOVER (MOBILE-11)
    # ---------------------------------------------------------------------------
    @staticmethod
    def get_mobile_workforce(
        db: Session,
        user: User,
        mine_id: Optional[int] = None,
        shift_code: Optional[str] = None,
        trade: Optional[str] = None,
        search: Optional[str] = None,
        status_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        primary_mine_id = mine_id
        if primary_mine_id is None:
            if user.mine_assignments:
                primary_mine_id = user.mine_assignments[0].mine_id
            else:
                first_mine = db.query(Mine).first()
                primary_mine_id = first_mine.id if first_mine else 1

        if not check_mine_access(user, primary_mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {primary_mine_id}")

        shift_ctx = FieldService.get_shift_context(db, user, primary_mine_id)

        # Query workers
        w_query = db.query(Worker).filter(Worker.mine_id == primary_mine_id)
        if trade and trade != "ALL":
            w_query = w_query.filter(Worker.trade_category == trade)
        if search:
            s_term = f"%{search.strip()}%"
            w_query = w_query.filter(
                (Worker.full_name.ilike(s_term)) |
                (Worker.worker_code.ilike(s_term)) |
                (Worker.designation.ilike(s_term))
            )

        all_workers = w_query.all()
        today = datetime.now(timezone.utc).date()

        # Query today's attendance records for this mine
        att_records = db.query(AttendanceRecord).filter(
            AttendanceRecord.mine_id == primary_mine_id,
            AttendanceRecord.attendance_date == today
        ).all()
        att_map = {r.worker_id: r for r in att_records}

        present_cnt = 0
        absent_cnt = 0
        on_leave_cnt = 0
        pending_cnt = 0
        off_duty_cnt = 0

        worker_list = []
        for w in all_workers:
            att = att_map.get(w.id)
            current_status = att.status if att else ("PRESENT" if w.status == "ACTIVE" else "OFF_DUTY")
            
            if current_status == "PRESENT":
                present_cnt += 1
            elif current_status == "ABSENT":
                absent_cnt += 1
            elif current_status == "ON_LEAVE":
                on_leave_cnt += 1
            elif current_status == "OFF_DUTY":
                off_duty_cnt += 1
            else:
                pending_cnt += 1

            if status_filter and status_filter != "ALL":
                if current_status != status_filter:
                    continue

            # Contractor name & marked by name
            contractor_name = w.contractor.company_name if w.contractor else None
            marked_by_name = (att.marked_by.full_name or att.marked_by.email) if (att and att.marked_by) else None

            worker_list.append({
                "id": w.id,
                "worker_code": w.worker_code,
                "full_name": w.full_name,
                "designation": w.designation,
                "trade_category": w.trade_category,
                "mine_id": w.mine_id,
                "contractor_id": w.contractor_id,
                "contractor_name": contractor_name,
                "is_contractual": w.is_contractual,
                "blood_group": w.blood_group,
                "medical_fitness_expiry": w.medical_fitness_expiry.isoformat() if w.medical_fitness_expiry else None,
                "safety_induction_completed": w.safety_induction_completed,
                "status": w.status,
                "attendance_id": att.id if att else None,
                "attendance_status": current_status,
                "verification_mode": att.verification_mode if att else "MANUAL",
                "check_in_time": att.check_in_time.isoformat() if (att and att.check_in_time) else None,
                "marked_by": marked_by_name,
                "notes": att.notes if att else None
            })

        return {
            "shift_context": shift_ctx,
            "summary": {
                "total_assigned": len(all_workers),
                "present_count": present_cnt,
                "absent_count": absent_cnt,
                "on_leave_count": on_leave_cnt,
                "pending_attendance_count": pending_cnt,
                "off_duty_count": off_duty_cnt
            },
            "workers": worker_list
        }

    @staticmethod
    def record_mobile_attendance_internal(
        db: Session,
        user: User,
        mine_id: int,
        worker_id: int,
        status: str = "PRESENT",
        shift_code: str = "A",
        notes: Optional[str] = None,
        device_latitude: Optional[float] = None,
        device_longitude: Optional[float] = None,
        client_timestamp: Optional[datetime] = None
    ) -> AttendanceRecord:
        if not check_mine_access(user, mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {mine_id}")

        worker = db.query(Worker).filter(Worker.id == worker_id, Worker.mine_id == mine_id).first()
        if not worker:
            raise EntityNotFoundError("Worker", worker_id)

        now = client_timestamp or datetime.now(timezone.utc)
        today = now.date()

        shift = db.query(Shift).filter(Shift.mine_id == mine_id, Shift.shift_code == shift_code).first()

        record = db.query(AttendanceRecord).filter(
            AttendanceRecord.worker_id == worker_id,
            AttendanceRecord.mine_id == mine_id,
            AttendanceRecord.attendance_date == today
        ).first()

        context_notes = notes or ""
        if device_latitude is not None and device_longitude is not None:
            context_notes = f"{context_notes} [Device-reported location: {device_latitude:.5f}, {device_longitude:.5f}]".strip()

        if record:
            record.status = status
            record.verification_mode = "MANUAL"
            record.notes = context_notes or record.notes
            record.marked_by_id = user.id
            if status == "PRESENT" and not record.check_in_time:
                record.check_in_time = now
        else:
            record = AttendanceRecord(
                worker_id=worker_id,
                mine_id=mine_id,
                shift_id=shift.id if shift else None,
                attendance_date=today,
                check_in_time=now if status == "PRESENT" else None,
                status=status,
                verification_mode="MANUAL",
                marked_by_id=user.id,
                notes=context_notes or None,
                created_at=now
            )
            db.add(record)

        db.commit()
        db.refresh(record)

        AuditService.log_event(
            db=db,
            actor_id=user.id,
            action="ATTENDANCE_RECORDED",
            resource_type="WORKFORCE_ATTENDANCE",
            resource_id=str(record.id),
            mine_id=mine_id,
            after_state={"worker_id": worker.id, "worker_code": worker.worker_code, "status": record.status, "verification_mode": "MANUAL", "method": "MANUAL_FIELD_ENTRY"}
        )
        return record

    @staticmethod
    def record_mobile_attendance(
        db: Session,
        user: User,
        payload: Any
    ) -> Dict[str, Any]:
        rec = FieldService.record_mobile_attendance_internal(
            db=db,
            user=user,
            mine_id=payload.mine_id,
            worker_id=payload.worker_id,
            status=payload.status,
            shift_code=payload.shift_code,
            notes=payload.notes,
            device_latitude=payload.device_latitude,
            device_longitude=payload.device_longitude
        )
        return {
            "status": "SUCCESS",
            "id": rec.id,
            "worker_id": rec.worker_id,
            "attendance_status": rec.status,
            "verification_mode": rec.verification_mode,
            "check_in_time": rec.check_in_time.isoformat() if rec.check_in_time else None,
            "marked_by": user.full_name or user.email,
            "recorded_at": rec.created_at.isoformat()
        }

    @staticmethod
    def correct_mobile_attendance(
        db: Session,
        user: User,
        payload: Any
    ) -> Dict[str, Any]:
        if not check_mine_access(user, payload.mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {payload.mine_id}")

        if not payload.correction_reason or len(payload.correction_reason.strip()) < 3:
            raise BusinessRuleViolationError("A mandatory correction reason is required.")

        record = db.query(AttendanceRecord).filter(
            AttendanceRecord.id == payload.attendance_id,
            AttendanceRecord.mine_id == payload.mine_id
        ).first()
        if not record:
            raise EntityNotFoundError("AttendanceRecord", payload.attendance_id)

        before_status = record.status
        record.status = payload.new_status
        user_label = user.full_name or user.email
        record.notes = f"{record.notes or ''} [Corrected by {user_label}: {payload.correction_reason.strip()}]".strip()
        record.marked_by_id = user.id
        db.commit()
        db.refresh(record)

        AuditService.log_event(
            db=db,
            actor_id=user.id,
            action="ATTENDANCE_CORRECTED",
            resource_type="WORKFORCE_ATTENDANCE",
            resource_id=str(record.id),
            mine_id=payload.mine_id,
            before_state={"status": before_status},
            after_state={"status": payload.new_status, "reason": payload.correction_reason, "corrected_by": user_label}
        )

        return {
            "status": "SUCCESS",
            "id": record.id,
            "attendance_status": record.status,
            "corrected_by": user_label,
            "reason": payload.correction_reason
        }

    @staticmethod
    def get_mobile_shift_handover_summary(
        db: Session,
        user: User,
        mine_id: Optional[int] = None
    ) -> Dict[str, Any]:
        primary_mine_id = mine_id
        if primary_mine_id is None:
            if user.mine_assignments:
                primary_mine_id = user.mine_assignments[0].mine_id
            else:
                first_mine = db.query(Mine).first()
                primary_mine_id = first_mine.id if first_mine else 1

        if not check_mine_access(user, primary_mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {primary_mine_id}")

        shift_ctx = FieldService.get_shift_context(db, user, primary_mine_id)
        current_shift_code = shift_ctx.get("shift_code", "A")
        shift_transitions = {"A": "B", "B": "C", "C": "A", "GENERAL": "A"}
        next_shift_code = shift_transitions.get(current_shift_code, "B")

        # Open items aggregations
        open_incidents = db.query(Incident).filter(
            Incident.mine_id == primary_mine_id,
            Incident.status.in_(["OPEN", "INVESTIGATING", "ESCALATED"])
        ).all()

        overdue_tasks = db.query(GovernanceTask).filter(
            GovernanceTask.mine_id == primary_mine_id,
            GovernanceTask.status.notin_(["CLOSED", "RESOLVED"])
        ).all()

        pending_inspections = db.query(FieldInspection).filter(
            FieldInspection.mine_id == primary_mine_id,
            FieldInspection.status.in_(["PENDING", "IN_PROGRESS", "SUBMITTED"])
        ).all()

        active_alerts = db.query(Alert).filter(
            Alert.mine_id == primary_mine_id,
            Alert.status != "RESOLVED",
            Alert.severity.in_(["CRITICAL", "HIGH"])
        ).all()

        open_env = db.query(EnvironmentalObservation).filter(
            EnvironmentalObservation.mine_id == primary_mine_id,
            EnvironmentalObservation.status == "OPEN"
        ).all()

        # Categorized open item links
        categories = [
            {
                "category": "INCIDENTS",
                "title": "Open Safety Incidents",
                "count": len(open_incidents),
                "deep_link": "/mobile/incidents",
                "items": [
                    {"id": inc.id, "code": inc.incident_code, "title": inc.title, "severity": inc.severity, "status": inc.status}
                    for inc in open_incidents[:5]
                ]
            },
            {
                "category": "TASKS",
                "title": "Unresolved Tasks",
                "count": len(overdue_tasks),
                "deep_link": "/mobile/tasks",
                "items": [
                    {"id": t.id, "code": t.task_code, "title": t.title, "priority": t.priority, "status": t.status}
                    for t in overdue_tasks[:5]
                ]
            },
            {
                "category": "INSPECTIONS",
                "title": "Pending Field Inspections",
                "count": len(pending_inspections),
                "deep_link": "/mobile/inspections",
                "items": [
                    {"id": i.id, "code": i.inspection_code, "title": i.summary_notes or i.inspection_type, "severity": i.severity_assessment, "status": i.status}
                    for i in pending_inspections[:5]
                ]
            },
            {
                "category": "ALERTS",
                "title": "Active Critical Alerts",
                "count": len(active_alerts),
                "deep_link": "/mobile/incidents",
                "items": [
                    {"id": a.id, "code": f"ALT-{a.id}", "title": a.title or a.message, "severity": a.severity, "status": "ACTIVE"}
                    for a in active_alerts[:5]
                ]
            },
            {
                "category": "ENVIRONMENT",
                "title": "Open Environmental Observations",
                "count": len(open_env),
                "deep_link": "/mobile/inspections",
                "items": [
                    {"id": e.id, "code": f"ENV-{e.id}", "title": e.parameter_name, "severity": e.severity, "status": e.status}
                    for e in open_env[:5]
                ]
            }
        ]

        total_open = sum(c["count"] for c in categories)

        # Recent handovers
        recent_hos = db.query(ShiftHandover).filter(
            ShiftHandover.mine_id == primary_mine_id
        ).order_by(desc(ShiftHandover.created_at)).limit(10).all()

        handovers_list = []
        for ho in recent_hos:
            handovers_list.append({
                "id": ho.id,
                "handover_code": ho.handover_code,
                "mine_id": ho.mine_id,
                "from_shift_code": ho.from_shift_code,
                "to_shift_code": ho.to_shift_code,
                "outgoing_officer_id": ho.outgoing_officer_id,
                "outgoing_officer_name": (ho.outgoing_officer.full_name or ho.outgoing_officer.email) if ho.outgoing_officer else None,
                "incoming_officer_id": ho.incoming_officer_id,
                "incoming_officer_name": (ho.incoming_officer.full_name or ho.incoming_officer.email) if ho.incoming_officer else None,
                "status": ho.status,
                "summary_notes": ho.summary_notes,
                "safety_summary": ho.safety_summary,
                "open_items_count": ho.open_items_count,
                "acknowledged_at": ho.acknowledged_at.isoformat() if ho.acknowledged_at else None,
                "acknowledgment_notes": ho.acknowledgment_notes,
                "created_at": ho.created_at.isoformat()
            })

        return {
            "mine_id": primary_mine_id,
            "current_shift": {
                "shift_code": current_shift_code,
                "shift_name": shift_ctx.get("shift_name"),
                "start_time": shift_ctx.get("start_time"),
                "end_time": shift_ctx.get("end_time")
            },
            "next_shift": {
                "shift_code": next_shift_code,
                "shift_name": f"Shift {next_shift_code}"
            },
            "open_items_summary": {
                "total_open_items": total_open,
                "open_incidents_count": len(open_incidents),
                "overdue_tasks_count": len(overdue_tasks),
                "pending_inspections_count": len(pending_inspections),
                "critical_alerts_count": len(active_alerts),
                "environmental_observations_count": len(open_env)
            },
            "categories": categories,
            "recent_handovers": handovers_list
        }

    @staticmethod
    def create_shift_handover_internal(
        db: Session,
        user: User,
        mine_id: int,
        from_shift: str,
        to_shift: str,
        summary_notes: str,
        safety_summary: Optional[str] = None
    ) -> ShiftHandover:
        if not check_mine_access(user, mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {mine_id}")

        import uuid
        code = f"SHO-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}-{uuid.uuid4().hex[:4].upper()}"

        open_inc = db.query(Incident).filter(Incident.mine_id == mine_id, Incident.status.in_(["OPEN", "INVESTIGATING", "ESCALATED"])).count()
        open_tasks = db.query(GovernanceTask).filter(GovernanceTask.mine_id == mine_id, GovernanceTask.status.notin_(["CLOSED", "RESOLVED"])).count()
        open_insp = db.query(FieldInspection).filter(FieldInspection.mine_id == mine_id, FieldInspection.status.in_(["PENDING", "IN_PROGRESS", "SUBMITTED"])).count()
        total_open = open_inc + open_tasks + open_insp

        ho = ShiftHandover(
            handover_code=code,
            mine_id=mine_id,
            from_shift_code=from_shift,
            to_shift_code=to_shift,
            outgoing_officer_id=user.id,
            status="SUBMITTED",
            summary_notes=summary_notes,
            safety_summary=safety_summary,
            open_items_count=total_open,
            created_at=datetime.now(timezone.utc)
        )
        db.add(ho)
        db.commit()
        db.refresh(ho)

        AuditService.log_event(
            db=db,
            actor_id=user.id,
            action="HANDOVER_CREATED",
            resource_type="SHIFT_HANDOVER",
            resource_id=str(ho.id),
            mine_id=mine_id,
            after_state={"handover_code": ho.handover_code, "from_shift": from_shift, "to_shift": to_shift, "open_items_count": total_open}
        )
        return ho

    @staticmethod
    def acknowledge_shift_handover_internal(
        db: Session,
        user: User,
        handover_id: int,
        acknowledgment_notes: Optional[str] = None
    ) -> ShiftHandover:
        ho = db.query(ShiftHandover).filter(ShiftHandover.id == handover_id).first()
        if not ho:
            raise EntityNotFoundError("ShiftHandover", handover_id)

        if not check_mine_access(user, ho.mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {ho.mine_id}")

        ho.status = "ACKNOWLEDGED"
        ho.incoming_officer_id = user.id
        ho.acknowledged_at = datetime.now(timezone.utc)
        ho.acknowledgment_notes = acknowledgment_notes
        db.commit()
        db.refresh(ho)

        AuditService.log_event(
            db=db,
            actor_id=user.id,
            action="HANDOVER_ACKNOWLEDGED",
            resource_type="SHIFT_HANDOVER",
            resource_id=str(ho.id),
            mine_id=ho.mine_id,
            after_state={"handover_code": ho.handover_code, "status": "ACKNOWLEDGED", "acknowledged_by": user.full_name or user.email}
        )
        return ho

    @staticmethod
    def get_mobile_reporting_summary(
        db: Session,
        user: User,
        mine_id: Optional[int] = None
    ) -> Dict[str, Any]:
        target_mine_id = mine_id
        if target_mine_id is None:
            roles = get_user_roles(user, db)
            if user.mine_assignments:
                target_mine_id = user.mine_assignments[0].mine_id
            else:
                first_mine = db.query(Mine).first()
                target_mine_id = first_mine.id if first_mine else 1

        if not check_mine_access(user, target_mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {target_mine_id}")

        mine = db.query(Mine).filter(Mine.id == target_mine_id).first()
        shift_ctx = FieldService.get_shift_context(db, user, target_mine_id)

        # 1. Configured Environmental Rules
        rules = db.query(EnvironmentalRule).all()
        rules_data = [
            {
                "id": r.id,
                "rule_code": r.rule_code,
                "parameter_name": r.parameter_name,
                "threshold_limit": r.threshold_limit,
                "unit": r.unit,
                "severity": r.severity,
                "statute_reference": r.statute_reference,
                "description": r.description
            }
            for r in rules
        ]

        # 2. Production Summary & Recent Reports
        today = datetime.now(timezone.utc).date()
        today_reports = db.query(ProductionReport).filter(
            ProductionReport.mine_id == target_mine_id,
            ProductionReport.report_date == today
        ).all()
        today_planned = sum(r.planned_quantity for r in today_reports)
        today_actual = sum(r.actual_quantity for r in today_reports)
        variance_pct = round(((today_actual - today_planned) / today_planned * 100), 2) if today_planned > 0 else 0.0

        recent_prod = db.query(ProductionReport).filter(
            ProductionReport.mine_id == target_mine_id
        ).order_by(desc(ProductionReport.report_date), desc(ProductionReport.created_at)).limit(10).all()

        prod_list = [
            {
                "id": p.id,
                "report_code": p.report_code,
                "shift": p.shift,
                "report_date": p.report_date.isoformat(),
                "material_type": p.material_type,
                "planned_quantity": p.planned_quantity,
                "actual_quantity": p.actual_quantity,
                "unit": p.unit,
                "variance_quantity": p.variance_quantity,
                "variance_percentage": p.variance_percentage,
                "status": p.status,
                "deviation_flag": p.deviation_flag,
                "notes": p.notes,
                "reporting_officer": p.reporting_officer.full_name if p.reporting_officer else (p.reporting_officer.email if p.reporting_officer else "Field Supervisor"),
                "created_at": p.created_at.isoformat()
            }
            for p in recent_prod
        ]

        # 3. Environmental Observations
        recent_env = db.query(EnvironmentalObservation).filter(
            EnvironmentalObservation.mine_id == target_mine_id
        ).order_by(desc(EnvironmentalObservation.detected_at)).limit(10).all()

        env_list = [
            {
                "id": e.id,
                "parameter_name": e.parameter_name,
                "observed_value": e.observed_value,
                "threshold_limit": e.threshold_limit,
                "unit": e.unit,
                "severity": e.severity,
                "status": e.status,
                "location_context": e.location_context,
                "detected_at": e.detected_at.isoformat(),
                "action_taken": e.action_taken,
                "rule_code": e.rule.rule_code if e.rule else None
            }
            for e in recent_env
        ]

        # 4. Compliance Observations / Violations
        recent_violations = db.query(Violation).filter(
            Violation.mine_id == target_mine_id
        ).order_by(desc(Violation.created_at)).limit(10).all()

        violation_list = [
            {
                "id": v.id,
                "violation_code": v.violation_code,
                "title": v.title,
                "description": v.description,
                "regulatory_clause": v.regulatory_clause,
                "statute": v.statute,
                "severity": v.severity,
                "status": v.status,
                "remedial_deadline": v.remedial_deadline.isoformat() if v.remedial_deadline else None,
                "financial_penalty_amount": v.financial_penalty_amount,
                "created_at": v.created_at.isoformat(),
                "corrective_actions_count": len(v.corrective_actions)
            }
            for v in recent_violations
        ]

        # 5. Pending Approval Requests
        pending_approvals = db.query(ApprovalRequest).filter(
            ApprovalRequest.mine_id == target_mine_id,
            ApprovalRequest.status == "PENDING"
        ).count()

        return {
            "mine_id": target_mine_id,
            "mine_name": mine.name if mine else f"Mine #{target_mine_id}",
            "shift_context": shift_ctx,
            "production_summary": {
                "today_planned_tonnes": today_planned,
                "today_actual_tonnes": today_actual,
                "variance_percentage": variance_pct,
                "reports_count": len(today_reports),
                "recent_reports": prod_list
            },
            "environment_summary": {
                "configured_rules": rules_data,
                "active_observations_count": len(recent_env),
                "recent_observations": env_list
            },
            "compliance_summary": {
                "open_violations_count": len(recent_violations),
                "recent_violations": violation_list
            },
            "pending_approvals_count": pending_approvals
        }

    @staticmethod
    def record_mobile_production_report(
        db: Session,
        user: User,
        payload: MobileProductionReportCreate,
        client_timestamp: Optional[datetime] = None
    ) -> ProductionReport:
        if not check_mine_access(user, payload.mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {payload.mine_id}")

        if payload.planned_quantity < 0 or payload.actual_quantity < 0:
            raise BusinessRuleViolationError("Production quantities cannot be negative.")

        import uuid
        now = client_timestamp or datetime.now(timezone.utc)
        rep_date = payload.report_date or now.date()
        code = f"PRD-{rep_date.strftime('%Y%m%d')}-{payload.shift}-{uuid.uuid4().hex[:4].upper()}"

        variance = round(payload.actual_quantity - payload.planned_quantity, 2)
        variance_pct = round((variance / payload.planned_quantity * 100), 2) if payload.planned_quantity > 0 else 0.0

        deviation_flag = "NORMAL"
        status = "SUBMITTED"
        if variance_pct < -25.0:
            deviation_flag = "CRITICAL_SHORTFALL"
            status = "SUBMITTED_FOR_REVIEW"
        elif variance_pct < -15.0:
            deviation_flag = "DEVIATION_REVIEW_REQUIRED"
            status = "SUBMITTED_FOR_REVIEW"

        report = ProductionReport(
            report_code=code,
            mine_id=payload.mine_id,
            report_date=rep_date,
            shift=payload.shift,
            material_type=payload.material_type,
            planned_quantity=payload.planned_quantity,
            actual_quantity=payload.actual_quantity,
            unit=payload.unit,
            variance_quantity=variance,
            variance_percentage=variance_pct,
            status=status,
            deviation_flag=deviation_flag,
            reporting_officer_id=user.id,
            notes=payload.notes,
            created_at=now
        )
        db.add(report)
        db.flush()

        # If review required, create ApprovalRequest
        if deviation_flag != "NORMAL":
            app_req = ApprovalRequest(
                request_code=f"APP-PRD-{code[-8:]}",
                resource_type="PRODUCTION_REPORT",
                resource_id=str(report.id),
                mine_id=payload.mine_id,
                title=f"Production Shortfall Review: Shift {payload.shift} ({variance_pct}%)",
                description=f"Planned: {payload.planned_quantity} {payload.unit}, Actual: {payload.actual_quantity} {payload.unit}. Notes: {payload.notes or 'None'}",
                requester_id=user.id,
                required_role="MINE_MANAGER",
                status="PENDING",
                created_at=now
            )
            db.add(app_req)
            db.flush()
            report.approval_id = app_req.id

            # Create notification
            notif = Notification(
                user_id=user.id,
                mine_id=payload.mine_id,
                title=f"Production Shortfall Alert: Shift {payload.shift}",
                message=f"Production shortfall of {variance_pct}% logged for shift {payload.shift}. Supervisor review required.",
                notification_type="CRITICAL" if deviation_flag == "CRITICAL_SHORTFALL" else "WARNING",
                link="/mobile/review",
                created_at=now
            )
            db.add(notif)

        AuditService.log_event(
            db=db,
            actor_id=user.id,
            action="PRODUCTION_REPORT_SUBMITTED",
            resource_type="ProductionReport",
            resource_id=str(report.id),
            mine_id=payload.mine_id,
            after_state={
                "report_code": code,
                "planned": payload.planned_quantity,
                "actual": payload.actual_quantity,
                "variance_pct": variance_pct,
                "source": payload.production_source,
                "deviation_flag": deviation_flag
            }
        )
        db.commit()
        db.refresh(report)
        return report

    @staticmethod
    def record_mobile_environmental_observation(
        db: Session,
        user: User,
        payload: MobileEnvironmentalObservationCreate,
        client_timestamp: Optional[datetime] = None
    ) -> EnvironmentalObservation:
        if not check_mine_access(user, payload.mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {payload.mine_id}")

        now = client_timestamp or datetime.now(timezone.utc)
        
        # Match configured rule
        rule = None
        if payload.rule_id:
            rule = db.query(EnvironmentalRule).filter(EnvironmentalRule.id == payload.rule_id).first()
        if not rule:
            rule = db.query(EnvironmentalRule).filter(EnvironmentalRule.parameter_name == payload.parameter_name).first()

        threshold = payload.threshold_limit or (rule.threshold_limit if rule else 100.0)
        
        # Determine severity & review state
        severity = payload.severity or "MEDIUM"
        status = "OPEN"
        if payload.observed_value > threshold * 1.5:
            severity = "CRITICAL"
            status = "UNDER_REVIEW"
        elif payload.observed_value > threshold:
            severity = "HIGH"
            status = "UNDER_REVIEW"

        obs = EnvironmentalObservation(
            mine_id=payload.mine_id,
            rule_id=rule.id if rule else None,
            parameter_name=payload.parameter_name,
            observed_value=payload.observed_value,
            threshold_limit=threshold,
            unit=payload.unit,
            severity=severity,
            status=status,
            location_context=payload.location_context or "Field Observation Point",
            x=payload.x or 0.0,
            y=payload.y or 0.0,
            z=payload.z or 0.0,
            action_taken=payload.action_taken,
            detected_at=now
        )
        db.add(obs)
        db.flush()

        if status == "UNDER_REVIEW":
            import uuid
            app_req = ApprovalRequest(
                request_code=f"APP-ENV-{uuid.uuid4().hex[:6].upper()}",
                resource_type="ENVIRONMENTAL_OBSERVATION",
                resource_id=str(obs.id),
                mine_id=payload.mine_id,
                title=f"Environmental Threshold Breach: {payload.parameter_name} ({payload.observed_value} {payload.unit})",
                description=f"Observed value {payload.observed_value} {payload.unit} exceeds limit {threshold} {payload.unit}. Location: {payload.location_context}",
                requester_id=user.id,
                required_role="MINE_SAFETY_OFFICER",
                status="PENDING",
                created_at=now
            )
            db.add(app_req)

            notif = Notification(
                user_id=user.id,
                mine_id=payload.mine_id,
                title=f"Environmental Threshold Exceeded: {payload.parameter_name}",
                message=f"Observed value {payload.observed_value} {payload.unit} exceeds statutory limit of {threshold} {payload.unit}.",
                notification_type="CRITICAL" if severity == "CRITICAL" else "WARNING",
                link="/mobile/review",
                created_at=now
            )
            db.add(notif)

        AuditService.log_event(
            db=db,
            actor_id=user.id,
            action="ENVIRONMENT_OBSERVATION_CREATED",
            resource_type="EnvironmentalObservation",
            resource_id=str(obs.id),
            mine_id=payload.mine_id,
            after_state={
                "parameter": payload.parameter_name,
                "observed_value": payload.observed_value,
                "threshold_limit": threshold,
                "severity": severity,
                "source": payload.measurement_source,
                "status": status
            }
        )
        db.commit()
        db.refresh(obs)
        return obs

    @staticmethod
    def record_mobile_compliance_observation(
        db: Session,
        user: User,
        payload: MobileComplianceObservationCreate,
        client_timestamp: Optional[datetime] = None
    ) -> Violation:
        if not check_mine_access(user, payload.mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {payload.mine_id}")

        import uuid
        now = client_timestamp or datetime.now(timezone.utc)
        code = f"VIO-{now.year}-FLD-{uuid.uuid4().hex[:4].upper()}"

        status = "CORRECTIVE_ACTION_REQUIRED" if payload.corrective_action_text else "OPEN"
        remedial_dt = payload.remedial_deadline or (now + timedelta(days=7))

        vio = Violation(
            violation_code=code,
            mine_id=payload.mine_id,
            inspector_id=user.id,
            title=payload.title,
            description=payload.description,
            regulatory_clause=payload.regulatory_clause,
            statute=payload.statute,
            severity=payload.severity,
            status=status,
            remedial_deadline=remedial_dt,
            financial_penalty_amount=payload.financial_penalty_amount or 0.0,
            created_at=now
        )
        db.add(vio)
        db.flush()

        if payload.corrective_action_text:
            target_dt = payload.corrective_action_target_date or (now + timedelta(days=3))
            ca = CorrectiveAction(
                violation_id=vio.id,
                assignee_id=user.id,
                action_text=payload.corrective_action_text,
                target_completion_date=target_dt,
                status="PENDING",
                created_at=now
            )
            db.add(ca)

        app_req = ApprovalRequest(
            request_code=f"APP-VIO-{code[-8:]}",
            resource_type="VIOLATION",
            resource_id=str(vio.id),
            mine_id=payload.mine_id,
            title=f"Statutory Violation Review: {payload.title}",
            description=f"Regulatory clause: {payload.regulatory_clause}. Severity: {payload.severity}",
            requester_id=user.id,
            required_role="MINE_SAFETY_OFFICER",
            status="PENDING",
            created_at=now
        )
        db.add(app_req)

        notif = Notification(
            user_id=user.id,
            mine_id=payload.mine_id,
            title="Statutory Non-Conformance Logged",
            message=f"Violation {code} under {payload.regulatory_clause} logged. Review required.",
            notification_type="WARNING" if payload.severity in ["HIGH", "CRITICAL"] else "INFO",
            link="/mobile/review",
            created_at=now
        )
        db.add(notif)

        AuditService.log_event(
            db=db,
            actor_id=user.id,
            action="COMPLIANCE_OBSERVATION_CREATED",
            resource_type="Violation",
            resource_id=str(vio.id),
            mine_id=payload.mine_id,
            after_state={
                "violation_code": code,
                "regulatory_clause": payload.regulatory_clause,
                "severity": payload.severity,
                "status": status
            }
        )
        db.commit()
        db.refresh(vio)
        return vio

    # =========================================================================
    # MOBILE-13: Contractor Field Operations & SLA Management
    # =========================================================================
    @staticmethod
    def get_mobile_contractor_summary(
        db: Session,
        user: User,
        mine_id: Optional[int] = None
    ) -> Dict[str, Any]:
        target_mine_id = mine_id
        if target_mine_id is None:
            if user.mine_assignments:
                target_mine_id = user.mine_assignments[0].mine_id
            else:
                first_mine = db.query(Mine).first()
                target_mine_id = first_mine.id if first_mine else 1
        
        if not check_mine_access(user, target_mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {target_mine_id}")
        
        mine = db.query(Mine).filter(Mine.id == target_mine_id).first()
        mine_name = mine.name if mine else f"Mine {target_mine_id}"
        
        contracts = db.query(Contract).filter(Contract.mine_id == target_mine_id).all()
        contract_ids = [c.id for c in contracts]
        contractor_ids = list(set([c.contractor_id for c in contracts]))
        
        contractors = db.query(Contractor).filter(Contractor.id.in_(contractor_ids)).all() if contractor_ids else []
        all_reqs = db.query(ContractRequirement).filter(ContractRequirement.contract_id.in_(contract_ids)).all() if contract_ids else []
        
        today = datetime.now(timezone.utc).date()
        
        contractor_items = []
        for c in contractors:
            c_contracts = [ct for ct in contracts if ct.contractor_id == c.id]
            c_contract_ids = [ct.id for ct in c_contracts]
            c_reqs = [r for r in all_reqs if r.contract_id in c_contract_ids]
            
            overdue_reqs = [r for r in c_reqs if (r.status in ["EXPIRED", "NOT_PROVIDED", "ISSUE_FOUND"] or (r.expiry_date and r.expiry_date < today and r.status != "DOCUMENTED"))]
            pending_reqs = [r for r in c_reqs if r.status == "PENDING"]
            active_contracts = [ct for ct in c_contracts if ct.status == "ACTIVE"]
            
            health = "GOOD"
            if len(overdue_reqs) > 0:
                health = "CRITICAL"
            elif len(pending_reqs) > 0:
                health = "ATTENTION_REQUIRED"
                
            contractor_items.append({
                "id": c.id,
                "contractor_code": c.contractor_code,
                "company_name": c.company_name,
                "registration_number": c.registration_number,
                "contact_person": c.contact_person,
                "email": c.email,
                "phone": c.phone,
                "safety_rating": c.safety_rating,
                "status": c.status,
                "contracts_count": len(c_contracts),
                "active_contracts_count": len(active_contracts),
                "total_requirements_count": len(c_reqs),
                "overdue_requirements_count": len(overdue_reqs),
                "pending_requirements_count": len(pending_reqs),
                "compliance_health": health
            })
            
        total_overdue = sum(item["overdue_requirements_count"] for item in contractor_items)
        total_pending = sum(item["pending_requirements_count"] for item in contractor_items)
        active_contracts_total = sum(item["active_contracts_count"] for item in contractor_items)
        
        open_actions = db.query(GovernanceTask).filter(
            (GovernanceTask.mine_id == target_mine_id) &
            (GovernanceTask.domain == "CONTRACTOR") &
            (GovernanceTask.status.in_(["OPEN", "IN_PROGRESS"]))
        ).count()
        
        return {
            "mine_id": target_mine_id,
            "mine_name": mine_name,
            "total_contractors": len(contractors),
            "active_contracts": active_contracts_total,
            "total_requirements": len(all_reqs),
            "overdue_requirements": total_overdue,
            "pending_verifications": total_pending,
            "open_corrective_actions": open_actions,
            "contractors": contractor_items
        }

    @staticmethod
    def get_mobile_contracts(
        db: Session,
        user: User,
        mine_id: Optional[int] = None,
        contractor_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        target_mine_id = mine_id
        if target_mine_id is None:
            if user.mine_assignments:
                target_mine_id = user.mine_assignments[0].mine_id
            else:
                first_mine = db.query(Mine).first()
                target_mine_id = first_mine.id if first_mine else 1
        
        if not check_mine_access(user, target_mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {target_mine_id}")
        
        query = db.query(Contract).filter(Contract.mine_id == target_mine_id)
        if contractor_id:
            query = query.filter(Contract.contractor_id == contractor_id)
            
        contracts = query.order_by(desc(Contract.created_at)).all()
        results = []
        for ct in contracts:
            results.append(FieldService.get_mobile_contract_detail(db, user, ct.id))
        return results

    @staticmethod
    def get_mobile_contract_detail(
        db: Session,
        user: User,
        contract_id: int
    ) -> Dict[str, Any]:
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            raise EntityNotFoundError("Contract", contract_id)
            
        if not check_mine_access(user, contract.mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {contract.mine_id}")
            
        mine = db.query(Mine).filter(Mine.id == contract.mine_id).first()
        contractor = db.query(Contractor).filter(Contractor.id == contract.contractor_id).first()
        resp_officer = db.query(User).filter(User.id == contract.responsible_officer_id).first() if contract.responsible_officer_id else None
        
        reqs = db.query(ContractRequirement).filter(ContractRequirement.contract_id == contract.id).order_by(ContractRequirement.id).all()
        today = datetime.now(timezone.utc).date()
        
        req_items = []
        doc_count = 0
        pen_count = 0
        exp_count = 0
        overdue_count = 0
        
        for r in reqs:
            verified_by_user = db.query(User).filter(User.id == r.verified_by_id).first() if r.verified_by_id else None
            days_left = None
            sla = "ON_TRACK"
            
            if r.expiry_date:
                days_left = (r.expiry_date - today).days
                if days_left < 0 or r.status in ["EXPIRED", "NOT_PROVIDED"]:
                    sla = "OVERDUE" if r.status != "DOCUMENTED" else "EXPIRED"
                elif days_left <= 7:
                    sla = "DUE_SOON"
                elif r.status == "DOCUMENTED":
                    sla = "COMPLIANT"
            elif r.status == "DOCUMENTED":
                sla = "COMPLIANT"
            elif r.status == "PENDING":
                sla = "DUE_SOON"
                
            if r.status == "DOCUMENTED":
                doc_count += 1
            elif r.status == "PENDING":
                pen_count += 1
            elif r.status == "EXPIRED" or sla in ["OVERDUE", "EXPIRED"]:
                exp_count += 1
                overdue_count += 1
                
            req_items.append({
                "id": r.id,
                "contract_id": r.contract_id,
                "contract_code": contract.contract_code,
                "contractor_name": contractor.company_name if contractor else "Unknown",
                "title": r.title,
                "document_type": r.document_type,
                "mandatory": r.mandatory,
                "status": r.status,
                "expiry_date": r.expiry_date.isoformat() if r.expiry_date else None,
                "sla_status": sla,
                "days_until_expiry": days_left,
                "verification_notes": r.verification_notes,
                "verified_at": r.verified_at.isoformat() if r.verified_at else None,
                "verified_by_id": r.verified_by_id,
                "verified_by_name": verified_by_user.full_name if verified_by_user else None
            })
            
        return {
            "id": contract.id,
            "contract_code": contract.contract_code,
            "contractor_id": contract.contractor_id,
            "contractor_name": contractor.company_name if contractor else "Unknown",
            "mine_id": contract.mine_id,
            "mine_name": mine.name if mine else f"Mine {contract.mine_id}",
            "work_scope": contract.work_scope,
            "description": contract.description,
            "start_date": contract.start_date.isoformat() if contract.start_date else None,
            "end_date": contract.end_date.isoformat() if contract.end_date else None,
            "total_value": contract.total_value,
            "status": contract.status,
            "compliance_status": contract.compliance_status,
            "responsible_officer_id": contract.responsible_officer_id,
            "responsible_officer_name": resp_officer.full_name if resp_officer else None,
            "requirements_count": len(reqs),
            "documented_count": doc_count,
            "pending_count": pen_count,
            "expired_count": exp_count,
            "overdue_count": overdue_count,
            "requirements": req_items
        }

    @staticmethod
    def get_mobile_contract_requirements(
        db: Session,
        user: User,
        mine_id: Optional[int] = None,
        contract_id: Optional[int] = None,
        status_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        target_mine_id = mine_id
        if target_mine_id is None:
            if user.mine_assignments:
                target_mine_id = user.mine_assignments[0].mine_id
            else:
                first_mine = db.query(Mine).first()
                target_mine_id = first_mine.id if first_mine else 1
        
        if not check_mine_access(user, target_mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {target_mine_id}")
            
        contracts_q = db.query(Contract).filter(Contract.mine_id == target_mine_id)
        if contract_id:
            contracts_q = contracts_q.filter(Contract.id == contract_id)
        contracts = contracts_q.all()
        contract_map = {c.id: c for c in contracts}
        
        if not contract_map:
            return []
            
        reqs_q = db.query(ContractRequirement).filter(ContractRequirement.contract_id.in_(list(contract_map.keys())))
        if status_filter and status_filter != "ALL":
            reqs_q = reqs_q.filter(ContractRequirement.status == status_filter)
            
        reqs = reqs_q.order_by(ContractRequirement.expiry_date.asc().nulls_last()).all()
        today = datetime.now(timezone.utc).date()
        
        results = []
        for r in reqs:
            ct = contract_map.get(r.contract_id)
            c_name = ct.contractor.company_name if (ct and ct.contractor) else "Unknown Contractor"
            verified_by_user = db.query(User).filter(User.id == r.verified_by_id).first() if r.verified_by_id else None
            
            days_left = (r.expiry_date - today).days if r.expiry_date else None
            sla = "ON_TRACK"
            if r.expiry_date:
                if days_left is not None and days_left < 0:
                    sla = "OVERDUE" if r.status != "DOCUMENTED" else "EXPIRED"
                elif days_left is not None and days_left <= 7:
                    sla = "DUE_SOON"
                elif r.status == "DOCUMENTED":
                    sla = "COMPLIANT"
            elif r.status == "DOCUMENTED":
                sla = "COMPLIANT"
            elif r.status == "PENDING":
                sla = "DUE_SOON"
                
            results.append({
                "id": r.id,
                "contract_id": r.contract_id,
                "contract_code": ct.contract_code if ct else "CON-UNKNOWN",
                "contractor_name": c_name,
                "title": r.title,
                "document_type": r.document_type,
                "mandatory": r.mandatory,
                "status": r.status,
                "expiry_date": r.expiry_date.isoformat() if r.expiry_date else None,
                "sla_status": sla,
                "days_until_expiry": days_left,
                "verification_notes": r.verification_notes,
                "verified_at": r.verified_at.isoformat() if r.verified_at else None,
                "verified_by_id": r.verified_by_id,
                "verified_by_name": verified_by_user.full_name if verified_by_user else None
            })
            
        return results

    @staticmethod
    def verify_contract_requirement(
        db: Session,
        user: User,
        payload: MobileContractorVerificationCreate,
        client_timestamp: Optional[datetime] = None
    ) -> ContractRequirement:
        req = db.query(ContractRequirement).filter(ContractRequirement.id == payload.requirement_id).first()
        if not req:
            raise EntityNotFoundError("ContractRequirement", payload.requirement_id)
            
        contract = db.query(Contract).filter(Contract.id == req.contract_id).first()
        if not contract:
            raise EntityNotFoundError("Contract", req.contract_id)
            
        if not check_mine_access(user, contract.mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {contract.mine_id}")
            
        allowed_statuses = ["DOCUMENTED", "PENDING", "EXPIRED", "NOT_PROVIDED", "ISSUE_FOUND", "COMPLIANT"]
        norm_status = payload.verification_status.upper()
        if norm_status not in allowed_statuses:
            raise BusinessRuleViolationError(f"Invalid verification status: {payload.verification_status}")
            
        now = client_timestamp or datetime.now(timezone.utc)
        req.status = "DOCUMENTED" if norm_status == "COMPLIANT" else norm_status
        req.verification_notes = payload.verification_notes
        req.verified_at = now
        req.verified_by_id = user.id
        if payload.expiry_date:
            req.expiry_date = payload.expiry_date
            
        db.add(req)
        db.flush()
        
        # If an issue is found or corrective action requested, create GovernanceTask and ApprovalRequest
        if payload.create_corrective_action or norm_status in ["ISSUE_FOUND", "EXPIRED"]:
            t_code = f"TSK-CNT-{req.id}-{int(now.timestamp())}"
            target_due = payload.remedial_deadline or (now.date() + timedelta(days=7))
            
            task = GovernanceTask(
                task_code=t_code,
                title=payload.corrective_action_title or f"Contractor Rectification: {req.title}",
                description=payload.corrective_action_description or payload.verification_notes,
                domain="CONTRACTOR",
                source_resource_type="CONTRACT_REQUIREMENT",
                source_resource_id=str(req.id),
                mine_id=contract.mine_id,
                status="OPEN",
                priority="HIGH" if norm_status == "ISSUE_FOUND" else "MEDIUM",
                due_at=datetime.combine(target_due, datetime.min.time(), tzinfo=timezone.utc),
                created_by_id=user.id,
                assignee_id=payload.assigned_to_id or contract.responsible_officer_id or user.id,
                sla_status="DUE_SOON" if (target_due - now.date()).days <= 3 else "ON_TRACK",
                created_at=now
            )
            db.add(task)
            db.flush()
            
            if norm_status == "ISSUE_FOUND":
                c_name = contract.contractor.company_name if contract.contractor else "Contractor"
                app_req = ApprovalRequest(
                    request_code=f"APP-CNT-{req.id}-{int(now.timestamp())}",
                    resource_type="CONTRACTOR_REQUIREMENT",
                    resource_id=str(req.id),
                    mine_id=contract.mine_id,
                    title=f"Contractor Issue Sign-Off: {c_name} - {req.title}",
                    description=f"Field verification finding by {user.full_name}: {payload.verification_notes}",
                    requester_id=user.id,
                    required_role="MINE_MANAGER",
                    status="PENDING",
                    created_at=now
                )
                db.add(app_req)
                
        notif = Notification(
            user_id=user.id,
            mine_id=contract.mine_id,
            title="Contractor Requirement Verified",
            message=f"Requirement '{req.title}' under contract {contract.contract_code} was recorded as {norm_status}.",
            notification_type="WARNING" if norm_status in ["ISSUE_FOUND", "EXPIRED"] else "INFO",
            link="/mobile/contractors",
            created_at=now
        )
        db.add(notif)
        
        AuditService.log_event(
            db=db,
            actor_id=user.id,
            action="CONTRACT_REQUIREMENT_VERIFIED",
            resource_type="ContractRequirement",
            resource_id=str(req.id),
            mine_id=contract.mine_id,
            after_state={
                "requirement_id": req.id,
                "contract_code": contract.contract_code,
                "title": req.title,
                "status": req.status,
                "verification_notes": req.verification_notes
            }
        )
        
        db.commit()
        db.refresh(req)
        return req

    # =========================================================================
    # MOBILE-14: Grievance & Public/Worker Issue Field Operations
    # =========================================================================

    @staticmethod
    def get_mobile_grievance_summary(
        db: Session,
        user: User,
        mine_id: Optional[int] = None
    ) -> Dict[str, Any]:
        target_mine_id = mine_id
        if target_mine_id is None:
            if user.mine_assignments:
                target_mine_id = user.mine_assignments[0].mine_id
            else:
                first_mine = db.query(Mine).first()
                target_mine_id = first_mine.id if first_mine else 1

        if not check_mine_access(user, target_mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {target_mine_id}")

        mine = db.query(Mine).filter(Mine.id == target_mine_id).first()
        mine_name = mine.name if mine else f"Mine #{target_mine_id}"

        all_grvs = db.query(Grievance).filter(Grievance.mine_id == target_mine_id).order_by(desc(Grievance.created_at)).all()
        now = datetime.now(timezone.utc)

        total_cnt = len(all_grvs)
        open_cnt = sum(1 for g in all_grvs if g.status in ["SUBMITTED", "ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS", "UNDER_INVESTIGATION", "ACTION_REQUIRED"])
        assigned_cnt = sum(1 for g in all_grvs if g.assigned_to_id is not None and g.status not in ["RESOLVED", "VERIFIED", "CLOSED"])
        investigation_cnt = sum(1 for g in all_grvs if g.status in ["UNDER_INVESTIGATION", "ACTION_REQUIRED"] or g.action_required)
        resolved_cnt = sum(1 for g in all_grvs if g.status in ["RESOLVED", "VERIFIED", "CLOSED"])
        overdue_cnt = 0
        items = []

        for g in all_grvs:
            due_dt = g.due_at.replace(tzinfo=timezone.utc) if g.due_at.tzinfo is None else g.due_at
            if g.status in ["RESOLVED", "VERIFIED", "CLOSED"]:
                sla_state = "RESOLVED"
            elif due_dt < now:
                sla_state = "OVERDUE"
                overdue_cnt += 1
            elif (due_dt - now).total_seconds() <= 86400: # within 24h
                sla_state = "DUE_SOON"
            else:
                sla_state = "ON_TRACK"

            submitter_name = "Anonymous Worker" if g.anonymous else (g.submitted_by.full_name if g.submitted_by else "Field Operator")
            assignee_name = g.assigned_to.full_name if g.assigned_to else None

            items.append({
                "id": g.id,
                "grievance_code": g.grievance_code,
                "mine_id": g.mine_id,
                "mine_name": mine_name,
                "category": g.category,
                "title": g.title,
                "description": g.description,
                "priority": g.priority,
                "status": g.status,
                "anonymous": g.anonymous,
                "submitted_by_name": submitter_name,
                "assigned_to_id": g.assigned_to_id,
                "assigned_to_name": assignee_name,
                "sla_hours": g.sla_hours,
                "due_at": g.due_at.isoformat(),
                "sla_status": sla_state,
                "is_escalated": g.is_escalated,
                "created_at": g.created_at.isoformat(),
                "has_evidence": bool(g.evidence_url or g.evidence_file_hash),
                "has_location": bool(g.latitude is not None and g.longitude is not None),
                "has_task": bool(g.related_task_id is not None),
                "has_incident": bool(g.related_incident_id is not None)
            })

        return {
            "mine_id": target_mine_id,
            "mine_name": mine_name,
            "total_grievances": total_cnt,
            "open_grievances": open_cnt,
            "assigned_grievances": assigned_cnt,
            "investigation_required": investigation_cnt,
            "overdue_grievances": overdue_cnt,
            "resolved_grievances": resolved_cnt,
            "grievances": items
        }

    @staticmethod
    def get_mobile_grievances(
        db: Session,
        user: User,
        mine_id: Optional[int] = None,
        status_filter: Optional[str] = None,
        category: Optional[str] = None,
        priority: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        target_mine_id = mine_id
        if target_mine_id is None:
            if user.mine_assignments:
                target_mine_id = user.mine_assignments[0].mine_id
            else:
                first_mine = db.query(Mine).first()
                target_mine_id = first_mine.id if first_mine else 1

        if not check_mine_access(user, target_mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {target_mine_id}")

        query = db.query(Grievance).filter(Grievance.mine_id == target_mine_id)
        if status_filter:
            if status_filter == "OPEN":
                query = query.filter(Grievance.status.in_(["SUBMITTED", "ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS", "UNDER_INVESTIGATION", "ACTION_REQUIRED"]))
            elif status_filter == "OVERDUE":
                now = datetime.now(timezone.utc)
                query = query.filter(~Grievance.status.in_(["RESOLVED", "VERIFIED", "CLOSED"]), Grievance.due_at < now)
            elif status_filter == "RESOLVED":
                query = query.filter(Grievance.status.in_(["RESOLVED", "VERIFIED", "CLOSED"]))
            else:
                query = query.filter(Grievance.status == status_filter)

        if category and category != "ALL":
            query = query.filter(Grievance.category == category.upper())
        if priority and priority != "ALL":
            query = query.filter(Grievance.priority == priority.upper())

        all_grvs = query.order_by(desc(Grievance.created_at)).offset(offset).limit(limit).all()
        now = datetime.now(timezone.utc)
        results = []

        mine = db.query(Mine).filter(Mine.id == target_mine_id).first()
        mine_name = mine.name if mine else f"Mine #{target_mine_id}"

        for g in all_grvs:
            if search:
                sq = search.lower()
                matches = (
                    sq in g.grievance_code.lower() or
                    sq in g.title.lower() or
                    sq in g.description.lower() or
                    sq in g.category.lower()
                )
                if not matches:
                    continue

            due_dt = g.due_at.replace(tzinfo=timezone.utc) if g.due_at.tzinfo is None else g.due_at
            if g.status in ["RESOLVED", "VERIFIED", "CLOSED"]:
                sla_state = "RESOLVED"
            elif due_dt < now:
                sla_state = "OVERDUE"
            elif (due_dt - now).total_seconds() <= 86400:
                sla_state = "DUE_SOON"
            else:
                sla_state = "ON_TRACK"

            submitter_name = "Anonymous Worker" if g.anonymous else (g.submitted_by.full_name if g.submitted_by else "Field Operator")
            assignee_name = g.assigned_to.full_name if g.assigned_to else None

            results.append({
                "id": g.id,
                "grievance_code": g.grievance_code,
                "mine_id": g.mine_id,
                "mine_name": mine_name,
                "category": g.category,
                "title": g.title,
                "description": g.description,
                "priority": g.priority,
                "status": g.status,
                "anonymous": g.anonymous,
                "submitted_by_name": submitter_name,
                "assigned_to_id": g.assigned_to_id,
                "assigned_to_name": assignee_name,
                "sla_hours": g.sla_hours,
                "due_at": g.due_at.isoformat(),
                "sla_status": sla_state,
                "is_escalated": g.is_escalated,
                "created_at": g.created_at.isoformat(),
                "has_evidence": bool(g.evidence_url or g.evidence_file_hash),
                "has_location": bool(g.latitude is not None and g.longitude is not None),
                "has_task": bool(g.related_task_id is not None),
                "has_incident": bool(g.related_incident_id is not None)
            })

        return results

    @staticmethod
    def get_mobile_grievance_detail(
        db: Session,
        user: User,
        grievance_id: int
    ) -> Dict[str, Any]:
        grv = db.query(Grievance).filter(Grievance.id == grievance_id).first()
        if not grv:
            raise EntityNotFoundError("Grievance", grievance_id)
        if not check_mine_access(user, grv.mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {grv.mine_id}")

        now = datetime.now(timezone.utc)
        due_dt = grv.due_at.replace(tzinfo=timezone.utc) if grv.due_at.tzinfo is None else grv.due_at
        if grv.status in ["RESOLVED", "VERIFIED", "CLOSED"]:
            sla_state = "RESOLVED"
        elif due_dt < now:
            sla_state = "OVERDUE"
        elif (due_dt - now).total_seconds() <= 86400:
            sla_state = "DUE_SOON"
        else:
            sla_state = "ON_TRACK"

        mine = db.query(Mine).filter(Mine.id == grv.mine_id).first()
        submitter_name = "Anonymous Worker" if grv.anonymous else (grv.submitted_by.full_name if grv.submitted_by else None)
        assignee_name = grv.assigned_to.full_name if grv.assigned_to else None
        investigator_name = grv.investigated_by.full_name if grv.investigated_by else None
        acknowledged_by_name = grv.acknowledged_by.full_name if grv.acknowledged_by else None

        task_code = grv.related_task.task_code if grv.related_task else None
        inc_code = grv.related_incident.incident_code if grv.related_incident else None

        return {
            "id": grv.id,
            "grievance_code": grv.grievance_code,
            "mine_id": grv.mine_id,
            "mine_name": mine.name if mine else f"Mine #{grv.mine_id}",
            "category": grv.category,
            "title": grv.title,
            "description": grv.description,
            "priority": grv.priority,
            "status": grv.status,
            "anonymous": grv.anonymous,
            "submitted_by_id": None if grv.anonymous else grv.submitted_by_id,
            "submitted_by_name": submitter_name,
            "assigned_to_id": grv.assigned_to_id,
            "assigned_to_name": assignee_name,
            "sla_hours": grv.sla_hours,
            "due_at": grv.due_at.isoformat(),
            "sla_status": sla_state,
            "is_escalated": grv.is_escalated,
            "escalation_level": grv.escalation_level,
            "latitude": grv.latitude,
            "longitude": grv.longitude,
            "location_source": grv.location_source,
            "location_context": grv.location_context,
            "evidence_url": grv.evidence_url,
            "evidence_file_name": grv.evidence_file_name,
            "evidence_file_hash": grv.evidence_file_hash,
            "investigation_notes": grv.investigation_notes,
            "investigated_by_id": grv.investigated_by_id,
            "investigated_by_name": investigator_name,
            "investigated_at": grv.investigated_at.isoformat() if grv.investigated_at else None,
            "action_required": grv.action_required,
            "resolution_notes": grv.resolution_notes,
            "resolved_at": grv.resolved_at.isoformat() if grv.resolved_at else None,
            "verified_at": grv.verified_at.isoformat() if grv.verified_at else None,
            "closed_at": grv.closed_at.isoformat() if grv.closed_at else None,
            "created_at": grv.created_at.isoformat(),
            "updated_at": grv.updated_at.isoformat(),
            "related_task_id": grv.related_task_id,
            "related_task_code": task_code,
            "related_incident_id": grv.related_incident_id,
            "related_incident_code": inc_code,
            "source_channel": grv.source_channel or "MOBILE_FIELD",
            "acknowledged_at": grv.acknowledged_at.isoformat() if grv.acknowledged_at else None,
            "acknowledged_by_id": grv.acknowledged_by_id,
            "acknowledged_by_name": acknowledged_by_name
        }

    @staticmethod
    def create_mobile_grievance(
        db: Session,
        user: User,
        payload: MobileGrievanceCreate,
        client_timestamp: Optional[datetime] = None
    ) -> Grievance:
        if not check_mine_access(user, payload.mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {payload.mine_id}")

        now = client_timestamp or datetime.now(timezone.utc)
        sla_map = {"CRITICAL": 24, "HIGH": 48, "MEDIUM": 72, "LOW": 168}
        sla_hrs = sla_map.get(payload.priority.upper(), 72)
        due_time = now + timedelta(hours=sla_hrs)

        count = db.query(Grievance).filter(Grievance.mine_id == payload.mine_id).count() + 1
        mine = db.query(Mine).filter(Mine.id == payload.mine_id).first()
        code_prefix = mine.code.replace("MINE-", "") if mine else f"M{payload.mine_id}"
        grv_code = f"PGRM-{now.year}-{code_prefix}-{count:04d}"

        grv = Grievance(
            grievance_code=grv_code,
            mine_id=payload.mine_id,
            category=payload.category.upper(),
            title=payload.title,
            description=payload.description,
            priority=payload.priority.upper(),
            status="SUBMITTED",
            anonymous=payload.anonymous,
            submitted_by_id=None if payload.anonymous else user.id,
            sla_hours=sla_hrs,
            due_at=due_time,
            latitude=payload.latitude,
            longitude=payload.longitude,
            location_source=payload.location_source or "ACTUAL_GPS",
            location_context=payload.location_context or (mine.name if mine else None),
            evidence_file_name=payload.evidence_file_name,
            evidence_url=payload.evidence_url,
            evidence_file_hash=payload.evidence_file_hash,
            source_channel=payload.source_channel or "MOBILE_FIELD",
            created_at=now,
            updated_at=now
        )
        db.add(grv)
        db.flush()

        notif = Notification(
            user_id=user.id,
            mine_id=payload.mine_id,
            title="New Grievance Registered",
            message=f"Grievance {grv_code} ({payload.category}) lodged: {payload.title}",
            notification_type="WARNING" if payload.priority.upper() in ["HIGH", "CRITICAL"] else "INFO",
            link="/mobile/grievances",
            created_at=now
        )
        db.add(notif)

        AuditService.log_event(
            db=db,
            actor_id=user.id,
            action="GRIEVANCE_REGISTERED",
            resource_type="Grievance",
            resource_id=str(grv.id),
            mine_id=payload.mine_id,
            after_state={
                "code": grv_code,
                "category": payload.category,
                "priority": payload.priority,
                "title": payload.title,
                "anonymous": payload.anonymous
            }
        )

        db.commit()
        db.refresh(grv)
        return grv

    @staticmethod
    def acknowledge_mobile_grievance(
        db: Session,
        user: User,
        grievance_id: int,
        payload: MobileGrievanceAcknowledge
    ) -> Grievance:
        grv = db.query(Grievance).filter(Grievance.id == grievance_id).first()
        if not grv:
            raise EntityNotFoundError("Grievance", grievance_id)
        if not check_mine_access(user, grv.mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {grv.mine_id}")

        now = datetime.now(timezone.utc)
        grv.status = "ACKNOWLEDGED"
        grv.acknowledged_at = now
        grv.acknowledged_by_id = user.id
        grv.updated_at = now

        AuditService.log_event(
            db=db,
            actor_id=user.id,
            action="GRIEVANCE_ACKNOWLEDGED",
            resource_type="Grievance",
            resource_id=str(grv.id),
            mine_id=grv.mine_id,
            after_state={"status": "ACKNOWLEDGED", "acknowledged_by": user.full_name}
        )
        db.commit()
        db.refresh(grv)
        return grv

    @staticmethod
    def assign_mobile_grievance(
        db: Session,
        user: User,
        grievance_id: int,
        payload: MobileGrievanceAssign
    ) -> Grievance:
        grv = db.query(Grievance).filter(Grievance.id == grievance_id).first()
        if not grv:
            raise EntityNotFoundError("Grievance", grievance_id)
        if not check_mine_access(user, grv.mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {grv.mine_id}")

        assignee = db.query(User).filter(User.id == payload.assigned_to_id).first()
        if not assignee:
            raise EntityNotFoundError("User", payload.assigned_to_id)

        now = datetime.now(timezone.utc)
        grv.status = "ASSIGNED"
        grv.assigned_to_id = assignee.id
        if payload.priority:
            grv.priority = payload.priority.upper()
        grv.updated_at = now

        notif = Notification(
            user_id=assignee.id,
            mine_id=grv.mine_id,
            title="Grievance Investigation Assigned",
            message=f"You have been assigned to investigate grievance {grv.grievance_code}: {grv.title}",
            notification_type="INFO",
            link="/mobile/grievances",
            created_at=now
        )
        db.add(notif)

        AuditService.log_event(
            db=db,
            actor_id=user.id,
            action="GRIEVANCE_ASSIGNED",
            resource_type="Grievance",
            resource_id=str(grv.id),
            mine_id=grv.mine_id,
            after_state={"assigned_to_id": assignee.id, "assigned_to_name": assignee.full_name}
        )
        db.commit()
        db.refresh(grv)
        return grv

    @staticmethod
    def investigate_mobile_grievance(
        db: Session,
        user: User,
        grievance_id: int,
        payload: MobileGrievanceInvestigate
    ) -> Grievance:
        grv = db.query(Grievance).filter(Grievance.id == grievance_id).first()
        if not grv:
            raise EntityNotFoundError("Grievance", grievance_id)
        if not check_mine_access(user, grv.mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {grv.mine_id}")

        now = datetime.now(timezone.utc)
        grv.investigation_notes = payload.investigation_notes
        grv.investigated_by_id = user.id
        grv.investigated_at = now
        grv.action_required = payload.action_required
        grv.status = "ACTION_REQUIRED" if payload.action_required else "UNDER_INVESTIGATION"
        grv.updated_at = now

        if payload.evidence_url:
            grv.evidence_url = payload.evidence_url
        if payload.evidence_file_name:
            grv.evidence_file_name = payload.evidence_file_name
        if payload.evidence_file_hash:
            grv.evidence_file_hash = payload.evidence_file_hash
        if payload.latitude is not None and payload.longitude is not None:
            grv.latitude = payload.latitude
            grv.longitude = payload.longitude
            grv.location_source = payload.location_source or "ACTUAL_GPS"

        # If corrective task creation requested, create canonical GovernanceTask
        if payload.create_task:
            task_code = f"TASK-GRV-{grv.id}-{int(now.timestamp())}"
            target_due = now + timedelta(days=payload.task_sla_days or 3)
            task = GovernanceTask(
                task_code=task_code,
                mine_id=grv.mine_id,
                domain="GRIEVANCE",
                source_resource_type="GRIEVANCE",
                source_resource_id=str(grv.id),
                title=payload.task_title or f"Remedial action for {grv.title}",
                description=payload.task_description or payload.investigation_notes,
                priority=grv.priority,
                status="PENDING",
                due_at=target_due,
                created_by_id=user.id,
                assignee_id=grv.assigned_to_id or user.id,
                sla_status="ON_TRACK",
                created_at=now
            )
            db.add(task)
            db.flush()
            grv.related_task_id = task.id

        # If incident creation requested (e.g. hazardous safety condition confirmed)
        if payload.create_incident:
            count = db.query(Incident).filter(Incident.mine_id == grv.mine_id).count() + 1
            inc_code = f"INC-{now.year}-GRV-{count:03d}"
            incident = Incident(
                incident_code=inc_code,
                mine_id=grv.mine_id,
                title=payload.incident_title or f"Incident originating from {grv.title}",
                description=payload.investigation_notes,
                category="SAFETY_HAZARD" if grv.category == "SAFETY" else "ENVIRONMENTAL",
                severity=payload.incident_severity or "MEDIUM",
                status="OPEN",
                reporter_id=user.id,
                latitude=grv.latitude,
                longitude=grv.longitude,
                created_at=now
            )
            db.add(incident)
            db.flush()
            grv.related_incident_id = incident.id

        AuditService.log_event(
            db=db,
            actor_id=user.id,
            action="GRIEVANCE_INVESTIGATION_RECORDED",
            resource_type="Grievance",
            resource_id=str(grv.id),
            mine_id=grv.mine_id,
            after_state={
                "status": grv.status,
                "action_required": grv.action_required,
                "investigation_notes": payload.investigation_notes,
                "related_task_id": grv.related_task_id,
                "related_incident_id": grv.related_incident_id
            }
        )

        db.commit()
        db.refresh(grv)
        return grv

    @staticmethod
    def resolve_mobile_grievance(
        db: Session,
        user: User,
        grievance_id: int,
        payload: MobileGrievanceResolve
    ) -> Grievance:
        grv = db.query(Grievance).filter(Grievance.id == grievance_id).first()
        if not grv:
            raise EntityNotFoundError("Grievance", grievance_id)
        if not check_mine_access(user, grv.mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {grv.mine_id}")

        now = datetime.now(timezone.utc)
        grv.status = "RESOLVED"
        grv.resolution_notes = payload.resolution_notes
        grv.resolved_at = now
        grv.updated_at = now

        if payload.submit_for_review:
            app_req = ApprovalRequest(
                request_code=f"APP-GRV-{grv.id}-{int(now.timestamp())}",
                resource_type="GRIEVANCE",
                resource_id=str(grv.id),
                mine_id=grv.mine_id,
                title=f"Grievance Resolution Review: {grv.grievance_code}",
                description=f"Resolution submitted by {user.full_name}: {payload.resolution_notes}",
                requester_id=user.id,
                required_role="MINE_MANAGER",
                status="PENDING",
                created_at=now
            )
            db.add(app_req)

        notif = Notification(
            user_id=grv.submitted_by_id or user.id,
            mine_id=grv.mine_id,
            title="Grievance Resolved",
            message=f"Grievance {grv.grievance_code} has been marked as RESOLVED.",
            notification_type="SUCCESS",
            link="/mobile/grievances",
            created_at=now
        )
        db.add(notif)

        AuditService.log_event(
            db=db,
            actor_id=user.id,
            action="GRIEVANCE_RESOLVED",
            resource_type="Grievance",
            resource_id=str(grv.id),
            mine_id=grv.mine_id,
            after_state={"status": "RESOLVED", "resolution_notes": payload.resolution_notes}
        )

        db.commit()
        db.refresh(grv)
        return grv

    # =========================================================================
    # MOBILE-15 Field Intelligence & Predictive Risk Actions
    # =========================================================================

    @staticmethod
    def get_mobile_risk_summary(
        db: Session,
        user: User,
        mine_id: int
    ) -> Dict[str, Any]:
        """
        Retrieves real-time/cached predictive risk summary for mobile field operations.
        Includes authoritative model probability, 30-min horizon, contributing signals,
        data quality score, pending verifications, and freshness status.
        """
        if not check_mine_access(user, mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {mine_id}")

        mine = db.query(Mine).filter(Mine.id == mine_id).first()
        if not mine:
            raise EntityNotFoundError("Mine", mine_id)

        # 1. Attempt live evaluation from authoritative PredictiveRiskService
        pred_dict = None
        freshness = "LIVE"
        try:
            pred_dict = PredictiveRiskService.generate_prediction(db, mine_id)
        except Exception as e:
            logger.warning(f"Live prediction evaluation skipped: {e}. Falling back to cached history.")
            freshness = "STALE"

        # 2. If live prediction failed, load latest from RiskPrediction table
        if not pred_dict:
            last_pred = (
                db.query(RiskPrediction)
                .filter(RiskPrediction.mine_id == mine_id)
                .order_by(RiskPrediction.prediction_timestamp.desc())
                .first()
            )
            if last_pred:
                signals = []
                if last_pred.explanation_json:
                    try:
                        signals = json.loads(last_pred.explanation_json)
                    except Exception:
                        signals = []
                pred_dict = {
                    "mine_id": mine_id,
                    "mine_name": mine.name,
                    "current_risk_score": last_pred.current_risk_score,
                    "current_severity": "HIGH" if last_pred.current_risk_score >= 60 else "LOW",
                    "predicted_risk_score": last_pred.predicted_risk_score,
                    "predicted_severity": last_pred.predicted_severity,
                    "probability": last_pred.probability,
                    "horizon_minutes": last_pred.horizon_minutes,
                    "model_version": last_pred.model_version,
                    "dataset_provenance": last_pred.dataset_type,
                    "data_quality_score": last_pred.data_quality_score,
                    "data_quality_notes": last_pred.data_quality_notes,
                    "is_alert_active": last_pred.is_alert_generated,
                    "top_signals": signals,
                    "evaluated_at": last_pred.prediction_timestamp
                }
                freshness = "LAST_KNOWN_PREDICTION"
            else:
                pred_dict = {
                    "mine_id": mine_id,
                    "mine_name": mine.name,
                    "current_risk_score": 15.0,
                    "current_severity": "LOW",
                    "predicted_risk_score": 18.0,
                    "predicted_severity": "LOW",
                    "probability": 0.18,
                    "horizon_minutes": 30,
                    "model_version": "risk-escalation-v1.0",
                    "dataset_provenance": "SIMULATED_DEMO",
                    "data_quality_score": 1.0,
                    "data_quality_notes": "Telemetry normal (simulated stream)",
                    "is_alert_active": False,
                    "top_signals": [],
                    "evaluated_at": datetime.now(timezone.utc)
                }
                freshness = "UNAVAILABLE"

        # 3. Calculate high/critical count & pending verifications count
        twenty_four_hrs_ago = datetime.now(timezone.utc) - timedelta(hours=24)
        high_critical_cnt = (
            db.query(RiskPrediction)
            .filter(
                RiskPrediction.mine_id == mine_id,
                RiskPrediction.predicted_severity.in_(["HIGH", "CRITICAL"]),
                RiskPrediction.prediction_timestamp >= twenty_four_hrs_ago
            )
            .count()
        )
        if high_critical_cnt == 0 and pred_dict.get("predicted_severity") in ["HIGH", "CRITICAL"]:
            high_critical_cnt = 1

        pending_verif_cnt = (
            db.query(RiskPrediction)
            .filter(
                RiskPrediction.mine_id == mine_id,
                RiskPrediction.field_verified == False,
                RiskPrediction.prediction_timestamp >= twenty_four_hrs_ago
            )
            .count()
        )

        return {
            "mine_id": mine_id,
            "mine_name": mine.name,
            "current_risk_score": pred_dict.get("current_risk_score", 15.0),
            "current_severity": pred_dict.get("current_severity", "LOW"),
            "predicted_risk_score": pred_dict.get("predicted_risk_score", 20.0),
            "predicted_severity": pred_dict.get("predicted_severity", "LOW"),
            "probability": pred_dict.get("probability", 0.20),
            "horizon_minutes": pred_dict.get("horizon_minutes", 30),
            "model_version": pred_dict.get("model_version", "risk-escalation-v1.0"),
            "data_quality_score": pred_dict.get("data_quality_score", 1.0),
            "data_quality_notes": pred_dict.get("data_quality_notes", "Full telemetry available"),
            "dataset_provenance": pred_dict.get("dataset_provenance", "SIMULATED_DEMO"),
            "high_critical_risk_count": high_critical_cnt,
            "pending_verification_count": pending_verif_cnt,
            "is_alert_active": pred_dict.get("is_alert_active", False),
            "top_signals": pred_dict.get("top_signals", []),
            "last_evaluated": pred_dict.get("evaluated_at", datetime.now(timezone.utc)),
            "freshness_status": freshness
        }

    @staticmethod
    def get_mobile_risks(
        db: Session,
        user: User,
        mine_id: int,
        status_filter: Optional[str] = None,
        severity_filter: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Retrieves list of recent predictive risk signals for mobile field operations with
        spatial context, contributing signals, and field verification state.
        """
        if not check_mine_access(user, mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {mine_id}")

        query = db.query(RiskPrediction).filter(RiskPrediction.mine_id == mine_id)

        if status_filter == "PENDING_VERIFICATION":
            query = query.filter(RiskPrediction.field_verified == False)
        elif status_filter == "VERIFIED":
            query = query.filter(RiskPrediction.field_verified == True)
        elif status_filter == "ISSUE_FOUND":
            query = query.filter(RiskPrediction.field_outcome == "ISSUE_FOUND")

        if severity_filter:
            query = query.filter(RiskPrediction.predicted_severity == severity_filter)

        preds = query.order_by(RiskPrediction.prediction_timestamp.desc()).limit(limit).all()

        results = []
        for p in preds:
            signals = []
            if p.explanation_json:
                try:
                    signals = json.loads(p.explanation_json)
                except Exception:
                    signals = []

            results.append({
                "id": p.id,
                "mine_id": p.mine_id,
                "zone_id": p.zone_id,
                "zone_name": p.zone.name if p.zone else None,
                "prediction_timestamp": p.prediction_timestamp,
                "horizon_minutes": p.horizon_minutes,
                "predicted_risk_score": p.predicted_risk_score,
                "predicted_severity": p.predicted_severity,
                "probability": p.probability,
                "predicted_class": p.predicted_class,
                "current_risk_score": p.current_risk_score,
                "model_name": p.model_name,
                "model_version": p.model_version,
                "dataset_type": p.dataset_type,
                "data_quality_score": p.data_quality_score,
                "data_quality_notes": p.data_quality_notes,
                "top_signals": signals,
                "field_verified": p.field_verified,
                "field_outcome": p.field_outcome,
                "field_notes": p.field_notes,
                "verified_by_id": p.verified_by_id,
                "verified_by_name": p.verified_by.full_name if p.verified_by else None,
                "verified_at": p.verified_at,
                "related_task_id": p.related_task_id,
                "related_incident_id": p.related_incident_id,
                "evidence_url": p.evidence_url,
                "evidence_file_name": p.evidence_file_name,
                "evidence_file_hash": p.evidence_file_hash,
                "latitude": p.latitude,
                "longitude": p.longitude,
                "location_context": p.location_context,
                "created_at": p.created_at
            })

        return results

    @staticmethod
    def get_mobile_risk_detail(
        db: Session,
        user: User,
        prediction_id: int
    ) -> Dict[str, Any]:
        """
        Retrieves complete predictive risk record details with factor attributions and downstream links.
        """
        p = db.query(RiskPrediction).filter(RiskPrediction.id == prediction_id).first()
        if not p:
            raise EntityNotFoundError("RiskPrediction", prediction_id)

        if not check_mine_access(user, p.mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {p.mine_id}")

        signals = []
        if p.explanation_json:
            try:
                signals = json.loads(p.explanation_json)
            except Exception:
                signals = []

        return {
            "id": p.id,
            "mine_id": p.mine_id,
            "zone_id": p.zone_id,
            "zone_name": p.zone.name if p.zone else None,
            "prediction_timestamp": p.prediction_timestamp,
            "horizon_minutes": p.horizon_minutes,
            "predicted_risk_score": p.predicted_risk_score,
            "predicted_severity": p.predicted_severity,
            "probability": p.probability,
            "predicted_class": p.predicted_class,
            "current_risk_score": p.current_risk_score,
            "model_name": p.model_name,
            "model_version": p.model_version,
            "dataset_type": p.dataset_type,
            "data_quality_score": p.data_quality_score,
            "data_quality_notes": p.data_quality_notes,
            "top_signals": signals,
            "field_verified": p.field_verified,
            "field_outcome": p.field_outcome,
            "field_notes": p.field_notes,
            "verified_by_id": p.verified_by_id,
            "verified_by_name": p.verified_by.full_name if p.verified_by else None,
            "verified_at": p.verified_at,
            "related_task_id": p.related_task_id,
            "related_incident_id": p.related_incident_id,
            "evidence_url": p.evidence_url,
            "evidence_file_name": p.evidence_file_name,
            "evidence_file_hash": p.evidence_file_hash,
            "latitude": p.latitude,
            "longitude": p.longitude,
            "location_context": p.location_context,
            "created_at": p.created_at
        }

    @staticmethod
    def verify_mobile_risk(
        db: Session,
        user: User,
        prediction_id: int,
        payload: MobileRiskVerifyPayload
    ) -> RiskPrediction:
        """
        Records field verification finding (NO_ISSUE_OBSERVED, ISSUE_FOUND, REQUIRES_FURTHER_REVIEW),
        evidence hash, GPS context, and optionally creates a linked GovernanceTask or Incident.
        Logs tamper-evident audit event and notifies mine leadership if hazards were found.
        """
        pred = db.query(RiskPrediction).filter(RiskPrediction.id == prediction_id).first()
        if not pred:
            raise EntityNotFoundError("RiskPrediction", prediction_id)

        if not check_mine_access(user, pred.mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {pred.mine_id}")

        now = datetime.now(timezone.utc)
        pred.field_verified = True
        pred.field_outcome = payload.outcome
        pred.field_notes = payload.notes
        pred.verified_by_id = user.id
        pred.verified_at = now
        pred.latitude = payload.latitude
        pred.longitude = payload.longitude
        pred.location_context = payload.location_context
        pred.evidence_url = payload.evidence_url
        pred.evidence_file_name = payload.evidence_file_name
        pred.evidence_file_hash = payload.evidence_file_hash

        # Optional 1: Create Governance Task for field remediation
        if payload.create_governance_task:
            task = GovernanceTask(
                task_code=f"TSK-PRISK-{pred.id}-{int(now.timestamp())}",
                mine_id=pred.mine_id,
                domain="SAFETY",
                title=payload.task_title or f"Field Risk Remediation: {pred.predicted_severity} Risk #{pred.id}",
                description=f"Generated from Field Risk Verification ({payload.outcome}): {payload.notes}",
                priority=payload.task_priority or "HIGH",
                status="ASSIGNED",
                assignee_id=user.id,
                created_by_id=user.id,
                due_at=now + timedelta(hours=24),
                source_resource_type="PREDICTIVE_RISK",
                source_resource_id=str(pred.id),
                created_at=now,
                updated_at=now
            )
            db.add(task)
            db.flush()
            pred.related_task_id = task.id

        # Optional 2: Create Incident if hazard/unsafe condition identified
        if payload.create_incident:
            incident = Incident(
                incident_code=f"INC-{now.year}-{int(now.timestamp()) % 100000:05d}",
                mine_id=pred.mine_id,
                title=payload.incident_title or f"Hazard Identified during Risk Verification #{pred.id}",
                description=f"Field verification finding by {user.full_name}: {payload.notes}",
                category="GAS_ANOMALY" if "methane" in (payload.notes or "").lower() else "ROOF_FALL_RISK",
                severity=payload.incident_severity or "HIGH",
                status="OPEN",
                reporter_id=user.id,
                latitude=payload.latitude,
                longitude=payload.longitude,
                created_at=now,
                updated_at=now
            )
            db.add(incident)
            db.flush()
            pred.related_incident_id = incident.id

        # Notifications
        if payload.outcome == "ISSUE_FOUND":
            notif = Notification(
                user_id=user.id,
                mine_id=pred.mine_id,
                title="Risk Verification: Issue Found",
                message=f"Field issue recorded for Risk #{pred.id} ({pred.predicted_severity}). Remediation task/incident linked.",
                notification_type="WARNING",
                link=f"/mobile/intelligence",
                created_at=now
            )
            db.add(notif)

        # Audit Event Logging
        AuditService.log_event(
            db=db,
            actor_id=user.id,
            action="PREDICTIVE_FIELD_OUTCOME_RECORDED",
            resource_type="RiskPrediction",
            resource_id=str(pred.id),
            mine_id=pred.mine_id,
            after_state={
                "field_verified": True,
                "field_outcome": payload.outcome,
                "notes": payload.notes,
                "related_task_id": pred.related_task_id,
                "related_incident_id": pred.related_incident_id,
                "evidence_hash": payload.evidence_file_hash
            }
        )

        db.commit()
        db.refresh(pred)
        return pred

    @staticmethod
    def get_field_command_summary(
        db: Session,
        mine_id: int,
        user: User,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> CommandSummaryResponse:
        """MOBILE-16: Aggregated cross-domain operational intelligence for Field Command."""
        require_mine_access(mine_id, user, db)
        mine = db.query(Mine).filter(Mine.id == mine_id).first()
        if not mine:
            raise EntityNotFoundError("Mine", mine_id)

        now = datetime.now(timezone.utc)
        user_roles = get_user_roles(user, db)
        primary_role = user_roles[0] if user_roles else "OPERATOR"

        # Active Shift determination
        current_shift = db.query(Shift).filter(
            Shift.mine_id == mine_id
        ).first()

        shift_name = current_shift.name if current_shift else "General Operations Shift"
        shift_type = current_shift.shift_code if current_shift else "DAY"

        def _to_utc(dt: Optional[datetime]) -> datetime:
            if not dt:
                return now
            if dt.tzinfo is None:
                return dt.replace(tzinfo=timezone.utc)
            return dt

        # 1. Attention Items Aggregation across all domains
        attention_items: List[AttentionItem] = []

        # (a) Predictive Risks (CRITICAL / HIGH)
        high_crit_risks = db.query(RiskPrediction).filter(
            RiskPrediction.mine_id == mine_id,
            RiskPrediction.predicted_severity.in_(["CRITICAL", "HIGH"]),
            RiskPrediction.field_verified == False
        ).order_by(desc(RiskPrediction.prediction_timestamp)).limit(5).all()

        for r in high_crit_risks:
            zone_name = r.zone.name if r.zone else "Mine Sector"
            r_ts = _to_utc(r.prediction_timestamp)
            attention_items.append(
                AttentionItem(
                    id=f"risk-{r.id}",
                    source_type="PREDICTIVE_RISK",
                    title=f"{r.predicted_severity} Risk Escalation ({int((r.probability or 0.88) * 100)}%)",
                    subtitle=f"{zone_name} • 30m Horizon • Verification Required",
                    severity=r.predicted_severity,
                    status="UNVERIFIED",
                    mine_id=mine_id,
                    zone_name=zone_name,
                    created_at=r_ts,
                    due_at=r_ts + timedelta(minutes=r.horizon_minutes or 30),
                    deep_link=f"/mobile/intelligence?prediction_id={r.id}",
                    source_label=f"SOURCE: PREDICTIVE MODEL ({r.model_version or 'risk-escalation-v1.0'})",
                    actionable=True,
                    recommended_action="VERIFY_IN_FIELD"
                )
            )

        # (b) Open Incidents
        open_incidents = db.query(Incident).filter(
            Incident.mine_id == mine_id,
            Incident.status.in_(["REPORTED", "UNDER_INVESTIGATION", "ACTION_REQUIRED"])
        ).order_by(desc(Incident.created_at)).limit(5).all()

        for inc in open_incidents:
            inc_ts = _to_utc(inc.created_at)
            attention_items.append(
                AttentionItem(
                    id=f"incident-{inc.id}",
                    source_type="INCIDENT",
                    title=f"Incident {inc.incident_code}: {inc.title}",
                    subtitle=f"{inc.severity} Severity • Status: {inc.status}",
                    severity=inc.severity or "HIGH",
                    status=inc.status,
                    mine_id=mine_id,
                    created_at=inc_ts,
                    deep_link=f"/mobile/incidents?incident_id={inc.id}",
                    source_label="SOURCE: FIELD INCIDENT LOG",
                    actionable=True,
                    recommended_action="VIEW_INCIDENT"
                )
            )

        # (c) Overdue / High Priority Tasks
        overdue_tasks = db.query(GovernanceTask).filter(
            GovernanceTask.mine_id == mine_id,
            GovernanceTask.status.in_(["ASSIGNED", "IN_PROGRESS", "OPEN"])
        ).order_by(GovernanceTask.due_at.asc()).limit(5).all()

        for t in overdue_tasks:
            t_due = _to_utc(t.due_at) if t.due_at else None
            is_overdue = t_due and t_due < now
            sev = "CRITICAL" if is_overdue else (t.priority or "MEDIUM")
            sub = "OVERDUE TASK" if is_overdue else f"Priority {t.priority} • Due {t.due_at.strftime('%H:%M') if t.due_at else 'Shift End'}"
            attention_items.append(
                AttentionItem(
                    id=f"task-{t.id}",
                    source_type="TASK",
                    title=f"Task: {t.title}",
                    subtitle=sub,
                    severity=sev,
                    status=t.status,
                    mine_id=mine_id,
                    created_at=_to_utc(t.created_at),
                    due_at=t_due,
                    deep_link=f"/mobile/tasks?task_id={t.id}",
                    source_label=f"SOURCE: GOVERNANCE TASK ({t.domain or 'SAFETY'})",
                    actionable=True,
                    recommended_action="VIEW_TASK"
                )
            )

        # (d) Pending Approvals / Reviews
        pending_reviews = db.query(ApprovalRequest).filter(
            ApprovalRequest.mine_id == mine_id,
            ApprovalRequest.status == "PENDING"
        ).order_by(desc(ApprovalRequest.created_at)).limit(5).all()

        for app in pending_reviews:
            attention_items.append(
                AttentionItem(
                    id=f"review-{app.id}",
                    source_type="REVIEW",
                    title=f"Approval: {app.title}",
                    subtitle=f"Requires {app.required_role} Sign-off",
                    severity="HIGH",
                    status="PENDING",
                    mine_id=mine_id,
                    created_at=_to_utc(app.created_at),
                    deep_link=f"/mobile/approvals?approval_id={app.id}",
                    source_label="SOURCE: SUPERVISOR REVIEW QUEUE",
                    actionable=primary_role in [app.required_role, "SYSTEM_ADMIN", "MINE_MANAGER"],
                    recommended_action="REVIEW_SUBMISSION"
                )
            )

        # (e) Grievances requiring action
        action_grievances = db.query(Grievance).filter(
            Grievance.mine_id == mine_id,
            Grievance.status.in_(["SUBMITTED", "ACKNOWLEDGED", "UNDER_INVESTIGATION"])
        ).order_by(desc(Grievance.created_at)).limit(3).all()

        for g in action_grievances:
            attention_items.append(
                AttentionItem(
                    id=f"grievance-{g.id}",
                    source_type="GRIEVANCE",
                    title=f"Grievance {g.grievance_code}: {g.title}",
                    subtitle=f"Category: {g.category} • Status: {g.status}",
                    severity=g.priority or "MEDIUM",
                    status=g.status,
                    mine_id=mine_id,
                    created_at=_to_utc(g.created_at),
                    deep_link=f"/mobile/grievances?grievance_id={g.id}",
                    source_label="SOURCE: PGRM RESOLUTION SYSTEM",
                    actionable=True,
                    recommended_action="INVESTIGATE_GRIEVANCE"
                )
            )

        # (f) Contractor SLA Overdue Items
        overdue_reqs = db.query(ContractRequirement).join(Contract).filter(
            Contract.mine_id == mine_id,
            ContractRequirement.status.in_(["PENDING", "EXPIRED", "NOT_PROVIDED"])
        ).limit(3).all()

        for cr in overdue_reqs:
            attention_items.append(
                AttentionItem(
                    id=f"contractor-sla-{cr.id}",
                    source_type="CONTRACTOR_SLA",
                    title=f"Requirement: {cr.title}",
                    subtitle=f"Status: {cr.status} • Expiry: {cr.expiry_date.strftime('%Y-%m-%d') if cr.expiry_date else 'Pending'}",
                    severity="HIGH" if cr.status in ["EXPIRED", "NOT_PROVIDED"] else "MEDIUM",
                    status=cr.status,
                    mine_id=mine_id,
                    created_at=_to_utc(cr.created_at),
                    deep_link=f"/mobile/contractors?requirement_id={cr.id}",
                    source_label="SOURCE: CONTRACT SLA TRACKER",
                    actionable=True,
                    recommended_action="VERIFY_SLA"
                )
            )

        # Sort Attention items: CRITICAL first, then HIGH, then others
        sev_priority = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        attention_items.sort(key=lambda x: (sev_priority.get(x.severity, 4), -_to_utc(x.created_at).timestamp()))

        # 2. My Work Items
        my_work_items: List[MyWorkItem] = []

        # Assigned Tasks
        user_tasks = db.query(GovernanceTask).filter(
            GovernanceTask.mine_id == mine_id,
            GovernanceTask.assignee_id == user.id,
            GovernanceTask.status.in_(["ASSIGNED", "IN_PROGRESS", "OPEN"])
        ).order_by(GovernanceTask.due_at.asc()).limit(6).all()

        for ut in user_tasks:
            my_work_items.append(
                MyWorkItem(
                    id=f"my-task-{ut.id}",
                    work_type="TASK",
                    title=ut.title,
                    priority=ut.priority or "MEDIUM",
                    status=ut.status,
                    due_at=ut.due_at,
                    deep_link=f"/mobile/tasks?task_id={ut.id}",
                    source_label="GOVERNANCE TASK"
                )
            )

        # Assigned Inspections
        user_inspections = db.query(FieldInspection).filter(
            FieldInspection.mine_id == mine_id,
            FieldInspection.inspector_id == user.id,
            FieldInspection.status.in_(["SCHEDULED", "IN_PROGRESS"])
        ).limit(4).all()

        for ui in user_inspections:
            my_work_items.append(
                MyWorkItem(
                    id=f"my-insp-{ui.id}",
                    work_type="INSPECTION",
                    title=f"Inspection {ui.inspection_code}: {ui.inspection_type}",
                    priority=ui.severity_assessment or "MEDIUM",
                    status=ui.status,
                    due_at=ui.scheduled_date,
                    deep_link=f"/mobile/inspections?inspection_id={ui.id}",
                    source_label="DGMS FIELD INSPECTION"
                )
            )

        # 3. Nearby Items (within mine coordinates)
        nearby_items: List[NearbyItem] = []
        for r in high_crit_risks[:3]:
            nearby_items.append(
                NearbyItem(
                    id=f"near-risk-{r.id}",
                    item_type="RISK",
                    title=f"Predicted {r.predicted_severity} Escalation",
                    zone_name=r.zone.name if r.zone else "East Longwall",
                    latitude=r.latitude or 23.7954,
                    longitude=r.longitude or 86.4308,
                    severity=r.predicted_severity,
                    distance_meters=180.0,
                    deep_link=f"/mobile/intelligence?prediction_id={r.id}"
                )
            )

        for inc in open_incidents[:2]:
            nearby_items.append(
                NearbyItem(
                    id=f"near-inc-{inc.id}",
                    item_type="INCIDENT",
                    title=f"Incident: {inc.title}",
                    zone_name="Underground Section",
                    latitude=23.7960,
                    longitude=86.4310,
                    severity=inc.severity or "HIGH",
                    distance_meters=320.0,
                    deep_link=f"/mobile/incidents?incident_id={inc.id}"
                )
            )

        # Counts dictionary
        counts = {
            "critical_risks": db.query(RiskPrediction).filter(RiskPrediction.mine_id == mine_id, RiskPrediction.predicted_severity == "CRITICAL", RiskPrediction.field_verified == False).count(),
            "high_risks": db.query(RiskPrediction).filter(RiskPrediction.mine_id == mine_id, RiskPrediction.predicted_severity == "HIGH", RiskPrediction.field_verified == False).count(),
            "open_incidents": db.query(Incident).filter(Incident.mine_id == mine_id, Incident.status.in_(["REPORTED", "UNDER_INVESTIGATION", "ACTION_REQUIRED"])).count(),
            "overdue_tasks": sum(1 for t in overdue_tasks if t.due_at and _to_utc(t.due_at) < now),
            "pending_reviews": db.query(ApprovalRequest).filter(ApprovalRequest.mine_id == mine_id, ApprovalRequest.status == "PENDING").count(),
            "active_grievances": db.query(Grievance).filter(Grievance.mine_id == mine_id, Grievance.status.in_(["SUBMITTED", "ACKNOWLEDGED", "UNDER_INVESTIGATION"])).count(),
            "contractor_sla_breaches": db.query(ContractRequirement).join(Contract).filter(Contract.mine_id == mine_id, ContractRequirement.status.in_(["PENDING", "EXPIRED", "NOT_PROVIDED"])).count(),
            "my_pending_tasks": len(user_tasks)
        }

        return CommandSummaryResponse(
            mine_id=mine_id,
            mine_name=mine.name,
            shift_name=shift_name,
            shift_type=shift_type,
            user_role=primary_role,
            user_name=user.full_name or user.email,
            data_freshness="LIVE",
            is_simulated=True,
            attention_items=attention_items,
            my_work_items=my_work_items,
            nearby_items=nearby_items,
            counts=counts,
            last_sync_timestamp=now
        )

    @staticmethod
    def get_unified_resource_timeline(
        db: Session,
        resource_type: str,
        resource_id: str,
        mine_id: int,
        user: User
    ) -> List[UnifiedTimelineEvent]:
        """MOBILE-16: Returns unified cryptographic lifecycle audit events for a resource."""
        require_mine_access(mine_id, user, db)

        # Audit events matching this resource
        events = db.query(AuditEvent).filter(
            AuditEvent.mine_id == mine_id,
            AuditEvent.resource_type == resource_type,
            AuditEvent.resource_id == str(resource_id)
        ).order_by(AuditEvent.timestamp.asc()).all()

        timeline: List[UnifiedTimelineEvent] = []
        for e in events:
            actor = db.query(User).filter(User.id == e.actor_id).first()
            actor_name = actor.full_name if actor else f"User #{e.actor_id}"
            actor_role = "SYSTEM"
            if actor:
                r_roles = get_user_roles(actor, db)
                actor_role = r_roles[0] if r_roles else "OPERATOR"

            # Category mapping
            cat = "AUDIT"
            act_upper = e.action.upper()
            if "RISK" in act_upper:
                cat = "RISK"
            elif "VERIF" in act_upper or "INSPECT" in act_upper:
                cat = "VERIFICATION"
            elif "EVIDENCE" in act_upper or "PHOTO" in act_upper:
                cat = "EVIDENCE"
            elif "TASK" in act_upper or "INCIDENT" in act_upper:
                cat = "GOVERNANCE"
            elif "REVIEW" in act_upper or "APPROVAL" in act_upper:
                cat = "REVIEW"
            elif "SIGNOFF" in act_upper or "APPROVE" in act_upper:
                cat = "SIGN_OFF"

            timeline.append(
                UnifiedTimelineEvent(
                    id=e.id,
                    timestamp=e.timestamp,
                    action=e.action,
                    actor_name=actor_name,
                    actor_role=actor_role,
                    description=f"{e.action.replace('_', ' ')} recorded with SHA-256 integrity check",
                    category=cat,
                    metadata={"hash": e.current_event_hash, "prev_hash": e.previous_event_hash}
                )
            )

        return timeline

    @staticmethod
    def get_cross_domain_related_records(
        db: Session,
        resource_type: str,
        resource_id: str,
        mine_id: int,
        user: User
    ) -> RelatedRecordsResponse:
        """MOBILE-16: Resolves cross-domain relational graph for deep navigation."""
        require_mine_access(mine_id, user, db)

        resp = RelatedRecordsResponse(
            resource_type=resource_type,
            resource_id=str(resource_id),
            mine_id=mine_id
        )

        res_id_int = int(resource_id) if resource_id.isdigit() else None

        if resource_type == "RiskPrediction" and res_id_int:
            pred = db.query(RiskPrediction).filter(RiskPrediction.id == res_id_int, RiskPrediction.mine_id == mine_id).first()
            if pred:
                if pred.related_task_id:
                    task = db.query(GovernanceTask).filter(GovernanceTask.id == pred.related_task_id).first()
                    if task:
                        resp.governance_tasks.append({"id": task.id, "title": task.title, "priority": task.priority, "status": task.status})
                if pred.related_incident_id:
                    inc = db.query(Incident).filter(Incident.id == pred.related_incident_id).first()
                    if inc:
                        resp.incidents.append({"id": inc.id, "title": inc.title, "severity": inc.severity, "status": inc.status})
                if pred.evidence_url or pred.evidence_file_hash:
                    resp.evidence.append({
                        "file_name": pred.evidence_file_name or "risk_evidence.jpg",
                        "hash": pred.evidence_file_hash,
                        "url": pred.evidence_url,
                        "latitude": pred.latitude,
                        "longitude": pred.longitude
                    })

        elif resource_type == "Incident" and res_id_int:
            inc = db.query(Incident).filter(Incident.id == res_id_int, Incident.mine_id == mine_id).first()
            if inc:
                # Find linked tasks
                tasks = db.query(GovernanceTask).filter(GovernanceTask.incident_id == inc.id).all()
                for t in tasks:
                    resp.governance_tasks.append({"id": t.id, "title": t.title, "priority": t.priority, "status": t.status})
                # Find linked risk predictions
                preds = db.query(RiskPrediction).filter(RiskPrediction.related_incident_id == inc.id).all()
                for p in preds:
                    resp.risk_predictions.append({"id": p.id, "score": p.predicted_risk_score, "severity": p.predicted_severity, "probability": p.probability})

        elif resource_type == "GovernanceTask" and res_id_int:
            t = db.query(GovernanceTask).filter(GovernanceTask.id == res_id_int, GovernanceTask.mine_id == mine_id).first()
            if t:
                if t.incident_id:
                    inc = db.query(Incident).filter(Incident.id == t.incident_id).first()
                    if inc:
                        resp.incidents.append({"id": inc.id, "title": inc.title, "severity": inc.severity, "status": inc.status})
                # Check for source risk prediction
                preds = db.query(RiskPrediction).filter(RiskPrediction.related_task_id == t.id).all()
                for p in preds:
                    resp.risk_predictions.append({"id": p.id, "score": p.predicted_risk_score, "severity": p.predicted_severity, "probability": p.probability})

        elif resource_type == "Grievance" and res_id_int:
            g = db.query(Grievance).filter(Grievance.id == res_id_int, Grievance.mine_id == mine_id).first()
            if g:
                if g.related_task_id:
                    t = db.query(GovernanceTask).filter(GovernanceTask.id == g.related_task_id).first()
                    if t:
                        resp.governance_tasks.append({"id": t.id, "title": t.title, "priority": t.priority, "status": t.status})
                if g.related_incident_id:
                    inc = db.query(Incident).filter(Incident.id == g.related_incident_id).first()
                    if inc:
                        resp.incidents.append({"id": inc.id, "title": inc.title, "severity": inc.severity, "status": inc.status})

        return resp




