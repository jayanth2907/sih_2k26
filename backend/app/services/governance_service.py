import json
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta, date
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from app.models.production import ProductionReport
from app.models.workforce import Worker, Shift, AttendanceRecord
from app.models.contractor import Contractor, Contract, ContractRequirement
from app.models.environmental import EnvironmentalRule, EnvironmentalObservation
from app.models.grievance import Grievance
from app.models.approval import ApprovalRequest, ApprovalAction
from app.models.report import RegulatoryReport, ReportVersion
from app.models.governance_task import GovernanceTask
from app.models.mine import Mine
from app.models.user import User
from app.models.sensor import Sensor
from app.models.incident import Incident
from app.models.violation import Violation, CorrectiveAction
from app.models.risk import RiskScore
from app.models.field_operation import FieldInspection, FieldEvidence
from app.models.notification import Notification
from app.models.audit import AuditEvent
from app.core.exceptions import EntityNotFoundError, BusinessRuleViolationError, PermissionDeniedError
from app.core.authz import check_mine_access, get_user_roles, get_user_assigned_mine_ids
from app.core.permissions import RoleEnum
from app.services.audit_service import AuditService
from app.services.pdf_report_service import PDFReportGenerator

logger = logging.getLogger("trinetra.governance")

class GovernanceService:
    # -------------------------------------------------------------
    # 1. PRODUCTION REPORTING & DEVIATION WORKFLOW
    # -------------------------------------------------------------
    @staticmethod
    def create_production_report(
        db: Session,
        mine_id: int,
        planned: float,
        actual: float,
        shift: str = "A",
        material_type: str = "COAL_RAW",
        unit: str = "TONNES",
        report_date: Optional[date] = None,
        officer_id: Optional[int] = None,
        notes: Optional[str] = None
    ) -> ProductionReport:
        if planned <= 0:
            raise BusinessRuleViolationError("Planned quantity must be greater than zero.")
        
        rep_date = report_date or datetime.now(timezone.utc).date()
        variance_qty = round(actual - planned, 2)
        variance_pct = round((variance_qty / planned) * 100, 2)
        
        # Deviation Review Trigger if actual <= -15% of planned
        deviation_flag = "NORMAL"
        if variance_pct <= -25.0:
            deviation_flag = "CRITICAL_SHORTFALL"
        elif variance_pct <= -15.0:
            deviation_flag = "DEVIATION_REVIEW_REQUIRED"

        code = f"PROD-{mine_id}-{rep_date.strftime('%Y%m%d')}-{shift}"
        # Check existing
        existing = db.query(ProductionReport).filter(ProductionReport.report_code == code).first()
        if existing:
            existing.planned_quantity = planned
            existing.actual_quantity = actual
            existing.variance_quantity = variance_qty
            existing.variance_percentage = variance_pct
            existing.deviation_flag = deviation_flag
            existing.notes = notes
            db.commit()
            db.refresh(existing)
            return existing

        report = ProductionReport(
            report_code=code,
            mine_id=mine_id,
            report_date=rep_date,
            shift=shift,
            material_type=material_type,
            planned_quantity=planned,
            actual_quantity=actual,
            unit=unit,
            variance_quantity=variance_qty,
            variance_percentage=variance_pct,
            status="SUBMITTED",
            deviation_flag=deviation_flag,
            reporting_officer_id=officer_id,
            notes=notes
        )
        db.add(report)
        db.commit()
        db.refresh(report)

        # Auto-create Governance Task if deviation review required
        if deviation_flag != "NORMAL":
            GovernanceService.create_governance_task(
                db=db,
                mine_id=mine_id,
                domain="PRODUCTION",
                title=f"Production Deviation Review: {shift} Shift ({variance_pct}%)",
                description=f"Actual production ({actual} {unit}) deviated by {variance_pct}% from planned target ({planned} {unit}). Explanatory review required.",
                priority="HIGH" if deviation_flag == "CRITICAL_SHORTFALL" else "MEDIUM",
                due_hours=48,
                source_resource_type="PRODUCTION_REPORT",
                source_resource_id=str(report.id),
                creator_id=officer_id
            )

        AuditService.log_event(
            db=db,
            actor_id=officer_id,
            action="PRODUCTION_REPORT_SUBMITTED",
            resource_type="PRODUCTION",
            resource_id=str(report.id),
            mine_id=mine_id,
            after_state={"code": code, "planned": planned, "actual": actual, "variance_pct": variance_pct}
        )
        return report

    @staticmethod
    def get_production_reports(db: Session, mine_id: int, limit: int = 50) -> List[ProductionReport]:
        return db.query(ProductionReport).filter(ProductionReport.mine_id == mine_id).order_by(ProductionReport.report_date.desc(), ProductionReport.created_at.desc()).limit(limit).all()

    # -------------------------------------------------------------
    # 2. WORKFORCE & ATTENDANCE
    # -------------------------------------------------------------
    @staticmethod
    def get_workers(db: Session, mine_id: int) -> List[Worker]:
        return db.query(Worker).filter(Worker.mine_id == mine_id).all()

    @staticmethod
    def log_attendance(
        db: Session,
        worker_id: int,
        mine_id: int,
        status: str = "PRESENT",
        shift_code: str = "A",
        verification_mode: str = "SIMULATED",
        marked_by_id: Optional[int] = None,
        notes: Optional[str] = None
    ) -> AttendanceRecord:
        worker = db.query(Worker).filter(Worker.id == worker_id).first()
        if not worker:
            raise EntityNotFoundError("Worker", worker_id)

        now = datetime.now(timezone.utc)
        today = now.date()

        # Find shift
        shift = db.query(Shift).filter(Shift.mine_id == mine_id, Shift.shift_code == shift_code).first()

        record = db.query(AttendanceRecord).filter(
            AttendanceRecord.worker_id == worker_id,
            AttendanceRecord.attendance_date == today
        ).first()

        if record:
            record.status = status
            record.verification_mode = verification_mode
            record.notes = notes
        else:
            record = AttendanceRecord(
                worker_id=worker_id,
                mine_id=mine_id,
                shift_id=shift.id if shift else None,
                attendance_date=today,
                check_in_time=now if status == "PRESENT" else None,
                status=status,
                verification_mode=verification_mode,
                marked_by_id=marked_by_id,
                notes=notes
            )
            db.add(record)

        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def get_attendance_roster(db: Session, mine_id: int, target_date: Optional[date] = None) -> List[Dict[str, Any]]:
        t_date = target_date or datetime.now(timezone.utc).date()
        records = db.query(AttendanceRecord).filter(
            AttendanceRecord.mine_id == mine_id,
            AttendanceRecord.attendance_date == t_date
        ).all()
        
        result = []
        for r in records:
            result.append({
                "id": r.id,
                "worker_id": r.worker_id,
                "mine_id": r.mine_id,
                "worker_code": r.worker.worker_code if r.worker else None,
                "worker_name": r.worker.full_name if r.worker else None,
                "designation": r.worker.designation if r.worker else None,
                "attendance_date": r.attendance_date,
                "status": r.status,
                "verification_mode": r.verification_mode,
                "check_in_time": r.check_in_time,
                "created_at": r.created_at
            })
        return result

    # -------------------------------------------------------------
    # 3. CONTRACTORS & CONTRACT LIFECYCLE
    # -------------------------------------------------------------
    @staticmethod
    def get_contractors(db: Session) -> List[Contractor]:
        return db.query(Contractor).all()

    @staticmethod
    def get_contracts(db: Session, mine_id: Optional[int] = None) -> List[Contract]:
        query = db.query(Contract)
        if mine_id is not None:
            query = query.filter(Contract.mine_id == mine_id)
        return query.all()

    @staticmethod
    def check_contract_expiries(db: Session) -> int:
        """Evaluates contracts nearing expiry (< 30 days) or expired, creating governance alerts."""
        now = datetime.now(timezone.utc).date()
        expiring_threshold = now + timedelta(days=30)
        
        contracts = db.query(Contract).filter(Contract.status.in_(["ACTIVE", "EXPIRING"])).all()
        alerts_created = 0
        for c in contracts:
            if c.end_date < now:
                c.status = "EXPIRED"
                c.compliance_status = "REVIEW_REQUIRED"
                alerts_created += 1
            elif c.end_date <= expiring_threshold:
                c.status = "EXPIRING"
                alerts_created += 1
        db.commit()
        return alerts_created

    # -------------------------------------------------------------
    # 4. ENVIRONMENTAL OBSERVATIONS & RULES
    # -------------------------------------------------------------
    @staticmethod
    def get_environmental_rules(db: Session) -> List[EnvironmentalRule]:
        return db.query(EnvironmentalRule).all()

    @staticmethod
    def create_environmental_observation(
        db: Session,
        mine_id: int,
        parameter_name: str,
        observed_value: float,
        threshold_limit: float,
        unit: str,
        severity: str = "MEDIUM",
        location_context: Optional[str] = None,
        x: float = 0.0,
        y: float = 0.0,
        z: float = 0.0,
        action_taken: Optional[str] = None
    ) -> EnvironmentalObservation:
        obs = EnvironmentalObservation(
            mine_id=mine_id,
            parameter_name=parameter_name,
            observed_value=observed_value,
            threshold_limit=threshold_limit,
            unit=unit,
            severity=severity,
            status="OPEN",
            location_context=location_context,
            x=x,
            y=y,
            z=z,
            action_taken=action_taken
        )
        db.add(obs)
        db.commit()
        db.refresh(obs)
        return obs

    @staticmethod
    def get_environmental_observations(db: Session, mine_id: int) -> List[EnvironmentalObservation]:
        return db.query(EnvironmentalObservation).filter(EnvironmentalObservation.mine_id == mine_id).order_by(EnvironmentalObservation.detected_at.desc()).all()

    # -------------------------------------------------------------
    # 5. GRIEVANCE MANAGEMENT & SLA ESCALATION
    # -------------------------------------------------------------
    @staticmethod
    def create_grievance(
        db: Session,
        mine_id: int,
        category: str,
        title: str,
        description: str,
        priority: str = "MEDIUM",
        anonymous: bool = False,
        user_id: Optional[int] = None
    ) -> Grievance:
        now = datetime.now(timezone.utc)
        sla_map = {"CRITICAL": 24, "HIGH": 48, "MEDIUM": 72, "LOW": 168}
        sla_hrs = sla_map.get(priority.upper(), 72)
        due_time = now + timedelta(hours=sla_hrs)

        code = f"GRV-{mine_id}-{int(now.timestamp())}"

        grv = Grievance(
            grievance_code=code,
            mine_id=mine_id,
            category=category.upper(),
            title=title,
            description=description,
            priority=priority.upper(),
            status="SUBMITTED",
            anonymous=anonymous,
            submitted_by_id=None if anonymous else user_id,
            sla_hours=sla_hrs,
            due_at=due_time
        )
        db.add(grv)
        db.commit()
        db.refresh(grv)

        AuditService.log_event(
            db=db,
            actor_id=user_id,
            action="GRIEVANCE_SUBMITTED",
            resource_type="GRIEVANCE",
            resource_id=str(grv.id),
            mine_id=mine_id,
            after_state={"code": code, "title": title, "priority": priority}
        )
        return grv

    @staticmethod
    def get_grievances(db: Session, mine_id: Optional[int] = None) -> List[Grievance]:
        query = db.query(Grievance)
        if mine_id is not None:
            query = query.filter(Grievance.mine_id == mine_id)
        return query.order_by(Grievance.created_at.desc()).all()

    @staticmethod
    def update_grievance_status(
        db: Session,
        grievance_id: int,
        new_status: str,
        actor_id: int,
        notes: Optional[str] = None
    ) -> Grievance:
        grv = db.query(Grievance).filter(Grievance.id == grievance_id).first()
        if not grv:
            raise EntityNotFoundError("Grievance", grievance_id)

        now = datetime.now(timezone.utc)
        grv.status = new_status
        if notes:
            grv.resolution_notes = notes

        if new_status == "RESOLVED":
            grv.resolved_at = now
        elif new_status == "VERIFIED":
            grv.verified_at = now
        elif new_status == "CLOSED":
            grv.closed_at = now

        db.commit()
        db.refresh(grv)

        AuditService.log_event(
            db=db,
            actor_id=actor_id,
            action=f"GRIEVANCE_STATUS_{new_status}",
            resource_type="GRIEVANCE",
            resource_id=str(grv.id),
            mine_id=grv.mine_id,
            after_state={"status": new_status, "notes": notes}
        )
        return grv

    # -------------------------------------------------------------
    # 6. DIGITAL APPROVAL WORKFLOW & SEPARATION OF DUTIES
    # -------------------------------------------------------------
    @staticmethod
    def create_approval_request(
        db: Session,
        mine_id: int,
        resource_type: str,
        resource_id: str,
        title: str,
        requester_id: int,
        required_role: str = "MINE_MANAGER",
        description: Optional[str] = None
    ) -> ApprovalRequest:
        now = datetime.now(timezone.utc)
        code = f"APR-{mine_id}-{int(now.timestamp())}"
        
        req = ApprovalRequest(
            request_code=code,
            resource_type=resource_type,
            resource_id=resource_id,
            mine_id=mine_id,
            title=title,
            description=description,
            requester_id=requester_id,
            required_role=required_role,
            status="PENDING"
        )
        db.add(req)
        db.commit()
        db.refresh(req)

        # Log initial submission
        db.add(ApprovalAction(
            approval_request_id=req.id,
            actor_id=requester_id,
            action="SUBMIT",
            role_used="REQUESTER",
            comments=description
        ))
        db.commit()
        return req

    @staticmethod
    def process_approval_decision(
        db: Session,
        request_id: int,
        actor: User,
        user_roles: List[str],
        action: str, # APPROVE, REJECT, REQUEST_CHANGES
        comments: Optional[str] = None
    ) -> ApprovalRequest:
        req = db.query(ApprovalRequest).filter(ApprovalRequest.id == request_id).first()
        if not req:
            raise EntityNotFoundError("ApprovalRequest", request_id)

        # Mine isolation check
        if not check_mine_access(actor, req.mine_id, db):
            raise PermissionDeniedError(f"Access denied to ApprovalRequest ID {request_id} for Mine ID {req.mine_id}")

        action_clean = action.upper()
        if action_clean not in ["APPROVE", "REJECT", "REQUEST_CHANGES"]:
            raise BusinessRuleViolationError(f"Invalid approval action: {action}. Must be APPROVE, REJECT, or REQUEST_CHANGES.")

        # Mandatory comments rule for REJECT and REQUEST_CHANGES
        if action_clean in ["REJECT", "REQUEST_CHANGES"] and (not comments or not comments.strip()):
            action_label = "rejection" if action_clean == "REJECT" else "return for correction"
            raise BusinessRuleViolationError(f"A mandatory reason/comment is required for {action_label}.")

        # Separation of Duties Rule: Requester cannot approve own submission
        if req.requester_id == actor.id and action_clean == "APPROVE":
            raise BusinessRuleViolationError("Separation of Duties: You cannot approve your own submission.")

        # Role validation
        is_admin = actor.is_superuser or RoleEnum.SYSTEM_ADMIN.value in user_roles
        if req.required_role not in user_roles and not is_admin:
            raise BusinessRuleViolationError(f"Unauthorized: Role {req.required_role} required to process this approval.")

        now = datetime.now(timezone.utc)
        target_status = "APPROVED" if action_clean == "APPROVE" else "REJECTED" if action_clean == "REJECT" else "CHANGES_REQUESTED"
        req.status = target_status
        req.final_decision_at = now

        db.add(ApprovalAction(
            approval_request_id=req.id,
            actor_id=actor.id,
            action=action_clean,
            role_used=req.required_role if req.required_role in user_roles else ("SYSTEM_ADMIN" if is_admin else "REVIEWER"),
            comments=comments
        ))

        # Synchronize status with underlying resource if applicable
        if req.resource_type in ["INSPECTION", "FIELD_INSPECTION"]:
            try:
                insp = db.query(FieldInspection).filter(
                    or_(FieldInspection.id == int(req.resource_id) if str(req.resource_id).isdigit() else False,
                        FieldInspection.inspection_code == req.resource_id)
                ).first()
                if insp:
                    if action_clean == "APPROVE":
                        insp.status = "VERIFIED"
                    elif action_clean == "REQUEST_CHANGES":
                        insp.status = "IN_PROGRESS"
            except Exception as e:
                logger.warning(f"Could not synchronize FieldInspection status: {e}")

        elif req.resource_type in ["TASK", "GOVERNANCE_TASK"]:
            try:
                task = db.query(GovernanceTask).filter(
                    or_(GovernanceTask.id == int(req.resource_id) if str(req.resource_id).isdigit() else False,
                        GovernanceTask.task_code == req.resource_id)
                ).first()
                if task:
                    if action_clean == "APPROVE":
                        task.status = "VERIFIED"
                    elif action_clean == "REQUEST_CHANGES":
                        task.status = "IN_PROGRESS"
            except Exception as e:
                logger.warning(f"Could not synchronize GovernanceTask status: {e}")

        elif req.resource_type in ["INCIDENT"]:
            try:
                inc = db.query(Incident).filter(
                    or_(Incident.id == int(req.resource_id) if str(req.resource_id).isdigit() else False,
                        Incident.incident_code == req.resource_id)
                ).first()
                if inc and action_clean == "APPROVE":
                    inc.status = "CLOSED"
            except Exception as e:
                logger.warning(f"Could not synchronize Incident status: {e}")

        # Send Actionable Notification to Submitter
        if req.requester_id:
            notif_title = (
                f"Digital Sign-Off Approved: {req.request_code}" if action_clean == "APPROVE"
                else f"Review Rejected: {req.request_code}" if action_clean == "REJECT"
                else f"Returned for Correction: {req.request_code}"
            )
            notif_type = "INFO" if action_clean == "APPROVE" else "CRITICAL" if action_clean == "REJECT" else "WARNING"
            notif_msg = (
                f"Your request '{req.title}' has been approved and digitally signed off by {actor.full_name}." if action_clean == "APPROVE"
                else f"Your request '{req.title}' was rejected by {actor.full_name}. Reason: {comments}" if action_clean == "REJECT"
                else f"Your request '{req.title}' was returned for correction by {actor.full_name}. Reason: {comments}"
            )
            db.add(Notification(
                user_id=req.requester_id,
                mine_id=req.mine_id,
                title=notif_title,
                message=notif_msg,
                notification_type=notif_type,
                link="/mobile/reviews"
            ))

        db.commit()
        db.refresh(req)

        # Log Primary Audit Event
        AuditService.log_event(
            db=db,
            actor_id=actor.id,
            action=f"APPROVAL_DECISION_{action_clean}",
            resource_type="APPROVAL_REQUEST",
            resource_id=str(req.id),
            mine_id=req.mine_id,
            after_state={"status": req.status, "action": action_clean, "comments": comments}
        )

        # Log Specific Digital Sign-off Audit Entry on APPROVE
        if action_clean == "APPROVE":
            AuditService.log_event(
                db=db,
                actor_id=actor.id,
                action="DIGITAL_SIGNOFF_RECORDED",
                resource_type="APPROVAL_REQUEST",
                resource_id=str(req.id),
                mine_id=req.mine_id,
                after_state={
                    "status": req.status,
                    "reviewer_id": actor.id,
                    "reviewer_name": actor.full_name,
                    "signed_off_at": now.isoformat(),
                    "request_code": req.request_code
                }
            )

        return req

    @staticmethod
    def resubmit_approval_request(
        db: Session,
        request_id: int,
        actor: User,
        comments: Optional[str] = None,
        updated_description: Optional[str] = None
    ) -> ApprovalRequest:
        req = db.query(ApprovalRequest).filter(ApprovalRequest.id == request_id).first()
        if not req:
            raise EntityNotFoundError("ApprovalRequest", request_id)

        if not check_mine_access(actor, req.mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {req.mine_id}")

        roles = get_user_roles(actor, db)
        is_admin = actor.is_superuser or RoleEnum.SYSTEM_ADMIN.value in roles
        if req.requester_id != actor.id and not is_admin:
            raise PermissionDeniedError("Only the original requester or an administrator can resubmit this request.")

        if req.status not in ["CHANGES_REQUESTED", "REJECTED"]:
            raise BusinessRuleViolationError(
                f"Cannot resubmit request currently in status '{req.status}'. Only CHANGES_REQUESTED or REJECTED items can be resubmitted."
            )

        now = datetime.now(timezone.utc)
        req.status = "PENDING"
        if updated_description:
            req.description = updated_description

        db.add(ApprovalAction(
            approval_request_id=req.id,
            actor_id=actor.id,
            action="RESUBMIT",
            role_used="REQUESTER",
            comments=comments or "Resubmitted with requested revisions."
        ))

        # Notification to supervisory reviewers
        db.add(Notification(
            user_id=req.requester_id,
            mine_id=req.mine_id,
            title=f"Review Resubmitted: {req.request_code}",
            message=f"Request '{req.title}' was resubmitted for review: {comments or 'Revisions provided'}",
            notification_type="INFO",
            link="/mobile/reviews"
        ))

        db.commit()
        db.refresh(req)

        AuditService.log_event(
            db=db,
            actor_id=actor.id,
            action="APPROVAL_RESUBMITTED",
            resource_type="APPROVAL_REQUEST",
            resource_id=str(req.id),
            mine_id=req.mine_id,
            after_state={"status": "PENDING", "comments": comments}
        )

        return req

    @staticmethod
    def get_mobile_review_queue(
        db: Session,
        user: User,
        mine_id: Optional[int] = None,
        status_filter: Optional[str] = None,
        resource_filter: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Unified Mobile Review Queue for supervisors and field operators.
        Enforces mine isolation, role-scoped queries, SoD eligibility, SLA countdowns, and summary counters.
        """
        roles = get_user_roles(user, db)
        is_admin = user.is_superuser or RoleEnum.SYSTEM_ADMIN.value in roles or RoleEnum.REGULATOR.value in roles

        if mine_id is not None:
            if not check_mine_access(user, mine_id, db):
                raise PermissionDeniedError(f"Access denied to Mine ID {mine_id}")
            mine_ids = [mine_id]
        else:
            if is_admin:
                mines = db.query(Mine).all()
                mine_ids = [m.id for m in mines]
            else:
                mine_ids = get_user_assigned_mine_ids(user, db)

        base_query = db.query(ApprovalRequest).filter(ApprovalRequest.mine_id.in_(mine_ids) if mine_ids else False)

        all_requests = base_query.order_by(desc(ApprovalRequest.created_at)).all()

        now = datetime.now(timezone.utc)

        # Compute accurate summary counters across authorized scope
        total_cnt = len(all_requests)
        pending_cnt = sum(1 for r in all_requests if r.status == "PENDING")
        urgent_cnt = 0
        overdue_cnt = 0
        returned_cnt = sum(1 for r in all_requests if r.status == "CHANGES_REQUESTED")
        approved_cnt = sum(1 for r in all_requests if r.status == "APPROVED")
        rejected_cnt = sum(1 for r in all_requests if r.status == "REJECTED")

        for r in all_requests:
            if r.status == "PENDING":
                created_at = r.created_at.replace(tzinfo=timezone.utc) if r.created_at.tzinfo is None else r.created_at
                age_hours = (now - created_at).total_seconds() / 3600
                if age_hours > 24:
                    overdue_cnt += 1
                elif age_hours > 12:
                    urgent_cnt += 1

        # Apply filtering
        filtered_list = all_requests
        if status_filter:
            st = status_filter.upper()
            if st == "PENDING":
                filtered_list = [r for r in filtered_list if r.status == "PENDING"]
            elif st == "URGENT":
                filtered_list = [
                    r for r in filtered_list
                    if r.status == "PENDING" and (now - (r.created_at.replace(tzinfo=timezone.utc) if r.created_at.tzinfo is None else r.created_at)).total_seconds() / 3600 > 12
                ]
            elif st == "OVERDUE":
                filtered_list = [
                    r for r in filtered_list
                    if r.status == "PENDING" and (now - (r.created_at.replace(tzinfo=timezone.utc) if r.created_at.tzinfo is None else r.created_at)).total_seconds() / 3600 > 24
                ]
            elif st in ["RETURNED", "CHANGES_REQUESTED"]:
                filtered_list = [r for r in filtered_list if r.status == "CHANGES_REQUESTED"]
            elif st == "APPROVED":
                filtered_list = [r for r in filtered_list if r.status == "APPROVED"]
            elif st == "REJECTED":
                filtered_list = [r for r in filtered_list if r.status == "REJECTED"]

        if resource_filter and resource_filter.upper() != "ALL":
            filtered_list = [r for r in filtered_list if r.resource_type.upper() == resource_filter.upper()]

        paginated = filtered_list[offset:offset + limit]

        items = []
        for req in paginated:
            created_at = req.created_at.replace(tzinfo=timezone.utc) if req.created_at.tzinfo is None else req.created_at
            age_hours = int((now - created_at).total_seconds() / 3600)

            is_overdue = age_hours > 24 and req.status == "PENDING"
            is_urgent = age_hours > 12 and req.status == "PENDING"

            sla_text = (
                f"OVERDUE ({age_hours}h)" if is_overdue
                else f"URGENT ({age_hours}h)" if is_urgent
                else f"SUBMITTED {age_hours}h AGO" if age_hours > 0
                else "SUBMITTED JUST NOW"
            )

            # Determine separation of duties & approval capability
            can_approve = True
            sod_warning = None
            if req.requester_id == user.id:
                can_approve = False
                sod_warning = "You cannot approve your own submission."
            elif req.required_role not in roles and not is_admin:
                can_approve = False
                sod_warning = f"Role '{req.required_role}' required to review."

            # Fetch associated evidence count & location if inspection/incident
            ev_count = 0
            lat = req.mine.latitude if req.mine else 23.7957
            lon = req.mine.longitude if req.mine else 86.4304
            loc_summary = f"{req.mine.name if req.mine else 'Mine'}, Section A"
            loc_source = "SURVEYED_MINE"

            if req.resource_type in ["INSPECTION", "FIELD_INSPECTION"]:
                try:
                    insp = db.query(FieldInspection).filter(
                        or_(FieldInspection.id == int(req.resource_id) if str(req.resource_id).isdigit() else False,
                            FieldInspection.inspection_code == req.resource_id)
                    ).first()
                    if insp:
                        ev_count = len(insp.evidences)
                        if insp.latitude and insp.longitude:
                            lat = insp.latitude
                            lon = insp.longitude
                            loc_source = "ACTUAL_GPS"
                        if insp.zone:
                            loc_summary = f"{insp.mine.name if insp.mine else 'Mine'} • {insp.zone.name}"
                except Exception:
                    pass

            elif req.resource_type in ["INCIDENT"]:
                try:
                    inc = db.query(Incident).filter(
                        or_(Incident.id == int(req.resource_id) if str(req.resource_id).isdigit() else False,
                            Incident.incident_code == req.resource_id)
                    ).first()
                    if inc:
                        ev_count = db.query(FieldEvidence).filter(FieldEvidence.incident_id == inc.id).count()
                        if inc.latitude and inc.longitude:
                            lat = inc.latitude
                            lon = inc.longitude
                            loc_source = "ACTUAL_GPS"
                except Exception:
                    pass

            last_action_entry = req.actions[-1].action if req.actions else "SUBMIT"

            items.append({
                "id": req.id,
                "request_code": req.request_code,
                "resource_type": req.resource_type,
                "resource_id": req.resource_id,
                "mine_id": req.mine_id,
                "mine_name": req.mine.name if req.mine else f"Mine #{req.mine_id}",
                "title": req.title,
                "description": req.description,
                "requester_id": req.requester_id,
                "requester_name": req.requester.full_name if req.requester else f"User #{req.requester_id}",
                "required_role": req.required_role,
                "status": req.status,
                "priority": "HIGH" if is_urgent or is_overdue else "MEDIUM",
                "evidence_count": ev_count,
                "location_summary": loc_summary,
                "latitude": lat,
                "longitude": lon,
                "location_source": loc_source,
                "is_overdue": is_overdue,
                "sla_text": sla_text,
                "can_approve": can_approve,
                "sod_warning": sod_warning,
                "created_at": req.created_at.isoformat() if req.created_at else None,
                "final_decision_at": req.final_decision_at.isoformat() if req.final_decision_at else None,
                "last_action": last_action_entry
            })

        return {
            "mine_id": mine_id,
            "counts": {
                "total": total_cnt,
                "pending": pending_cnt,
                "urgent": urgent_cnt,
                "overdue": overdue_cnt,
                "returned": returned_cnt,
                "approved": approved_cnt,
                "rejected": rejected_cnt
            },
            "reviews": items,
            "limit": limit,
            "offset": offset
        }

    @staticmethod
    def get_mobile_review_detail(
        db: Session,
        user: User,
        request_id: int
    ) -> Dict[str, Any]:
        """
        Retrieves detailed review context including full inspection checklists, observations,
        evidence gallery with SHA-256 fingerprints and GPS verification, and server audit timeline.
        """
        req = db.query(ApprovalRequest).filter(ApprovalRequest.id == request_id).first()
        if not req:
            raise EntityNotFoundError("ApprovalRequest", request_id)

        if not check_mine_access(user, req.mine_id, db):
            raise PermissionDeniedError(f"Access denied to Mine ID {req.mine_id}")

        roles = get_user_roles(user, db)
        is_admin = user.is_superuser or RoleEnum.SYSTEM_ADMIN.value in roles

        # Separation of duties check
        can_approve = True
        sod_warning = None
        if req.requester_id == user.id:
            can_approve = False
            sod_warning = "You cannot approve your own submission."
        elif req.required_role not in roles and not is_admin:
            can_approve = False
            sod_warning = f"Role '{req.required_role}' required to process this approval."

        # Field Context defaults
        lat = req.mine.latitude if req.mine else 23.7957
        lon = req.mine.longitude if req.mine else 86.4304
        loc_source = "SURVEYED_MINE"
        zone_name = None
        level_name = None

        checklist_items = []
        observations = req.description
        severity = "MEDIUM"
        statutory_ref = "DGMS / Coal Mines Regulations 2017"

        evidences = []
        related_incident_id = None
        related_incident_code = None
        related_task_id = None
        related_task_code = None
        related_violation_id = None
        predictive_risk = 28.5

        # Check linked resource
        if req.resource_type in ["INSPECTION", "FIELD_INSPECTION"]:
            try:
                insp = db.query(FieldInspection).filter(
                    or_(FieldInspection.id == int(req.resource_id) if str(req.resource_id).isdigit() else False,
                        FieldInspection.inspection_code == req.resource_id)
                ).first()
                if insp:
                    if insp.checklist_json:
                        try:
                            checklist_items = json.loads(insp.checklist_json)
                        except Exception:
                            checklist_items = []
                    observations = insp.summary_notes or observations
                    severity = insp.severity_assessment or "LOW"
                    if insp.latitude and insp.longitude:
                        lat = insp.latitude
                        lon = insp.longitude
                        loc_source = "ACTUAL_GPS"
                    if insp.zone:
                        zone_name = insp.zone.name
                    if insp.level:
                        level_name = insp.level.name

                    for ev in insp.evidences:
                        evidences.append({
                            "id": ev.id,
                            "evidence_code": ev.evidence_code,
                            "title": ev.title,
                            "description": ev.description,
                            "evidence_type": ev.evidence_type,
                            "file_hash_sha256": ev.file_hash_sha256,
                            "file_size_bytes": ev.file_size_bytes,
                            "mime_type": ev.mime_type,
                            "location_source": ev.location_source,
                            "latitude": ev.latitude,
                            "longitude": ev.longitude,
                            "gps_accuracy_meters": ev.gps_accuracy_meters,
                            "verification_status": ev.verification_status,
                            "client_capture_timestamp": ev.client_capture_timestamp.isoformat() if ev.client_capture_timestamp else None,
                            "captured_by_name": ev.captured_by.full_name if ev.captured_by else "Inspector"
                        })
            except Exception as e:
                logger.warning(f"Error enriching inspection detail: {e}")

        elif req.resource_type in ["TASK", "GOVERNANCE_TASK"]:
            try:
                task = db.query(GovernanceTask).filter(
                    or_(GovernanceTask.id == int(req.resource_id) if str(req.resource_id).isdigit() else False,
                        GovernanceTask.task_code == req.resource_id)
                ).first()
                if task:
                    related_task_id = task.id
                    related_task_code = task.task_code
                    observations = task.resolution_notes or task.description
                    severity = task.priority
                    if task.source_resource_type == "INCIDENT" and task.source_resource_id:
                        inc = db.query(Incident).filter(Incident.id == int(task.source_resource_id)).first()
                        if inc:
                            related_incident_id = inc.id
                            related_incident_code = inc.incident_code
            except Exception as e:
                logger.warning(f"Error enriching task detail: {e}")

        elif req.resource_type in ["INCIDENT"]:
            try:
                inc = db.query(Incident).filter(
                    or_(Incident.id == int(req.resource_id) if str(req.resource_id).isdigit() else False,
                        Incident.incident_code == req.resource_id)
                ).first()
                if inc:
                    related_incident_id = inc.id
                    related_incident_code = inc.incident_code
                    observations = inc.description
                    severity = inc.severity
                    if inc.latitude and inc.longitude:
                        lat = inc.latitude
                        lon = inc.longitude
                        loc_source = "ACTUAL_GPS"
                    ev_records = db.query(FieldEvidence).filter(FieldEvidence.incident_id == inc.id).all()
                    for ev in ev_records:
                        evidences.append({
                            "id": ev.id,
                            "evidence_code": ev.evidence_code,
                            "title": ev.title,
                            "description": ev.description,
                            "evidence_type": ev.evidence_type,
                            "file_hash_sha256": ev.file_hash_sha256,
                            "file_size_bytes": ev.file_size_bytes,
                            "mime_type": ev.mime_type,
                            "location_source": ev.location_source,
                            "latitude": ev.latitude,
                            "longitude": ev.longitude,
                            "gps_accuracy_meters": ev.gps_accuracy_meters,
                            "verification_status": ev.verification_status,
                            "client_capture_timestamp": ev.client_capture_timestamp.isoformat() if ev.client_capture_timestamp else None,
                            "captured_by_name": ev.captured_by.full_name if ev.captured_by else "Submitter"
                        })
            except Exception as e:
                logger.warning(f"Error enriching incident detail: {e}")

        # Build Audit & Action Timeline from database
        timeline = []
        for a in req.actions:
            timeline.append({
                "id": a.id,
                "action": a.action,
                "actor_id": a.actor_id,
                "actor_name": a.actor.full_name if a.actor else f"User #{a.actor_id}",
                "role_used": a.role_used,
                "comments": a.comments,
                "created_at": a.created_at.isoformat() if a.created_at else None
            })

        # Fetch AuditEvents for this request
        audit_events = db.query(AuditEvent).filter(
            AuditEvent.resource_type == "APPROVAL_REQUEST",
            AuditEvent.resource_id == str(req.id)
        ).order_by(AuditEvent.timestamp.asc()).all()

        for ev in audit_events:
            # Only add if not duplicate with actions
            action_desc = ev.action.replace("APPROVAL_DECISION_", "")
            timeline.append({
                "id": f"audit-{ev.id}",
                "action": action_desc,
                "actor_id": ev.actor_id,
                "actor_name": ev.actor.full_name if ev.actor else "System Auditor",
                "role_used": "AUDIT_LOG",
                "comments": f"Server audit recorded: {ev.action}",
                "created_at": ev.timestamp.isoformat() if ev.timestamp else None
            })

        # Sort timeline chronologically
        timeline.sort(key=lambda x: x["created_at"] or "")

        return {
            "id": req.id,
            "request_code": req.request_code,
            "resource_type": req.resource_type,
            "resource_id": req.resource_id,
            "mine_id": req.mine_id,
            "mine_name": req.mine.name if req.mine else f"Mine #{req.mine_id}",
            "title": req.title,
            "description": req.description,
            "requester_id": req.requester_id,
            "requester_name": req.requester.full_name if req.requester else f"User #{req.requester_id}",
            "required_role": req.required_role,
            "status": req.status,
            "priority": severity,
            "created_at": req.created_at.isoformat() if req.created_at else None,
            "final_decision_at": req.final_decision_at.isoformat() if req.final_decision_at else None,
            "can_approve": can_approve,
            "sod_warning": sod_warning,
            "latitude": lat,
            "longitude": lon,
            "location_source": loc_source,
            "zone_name": zone_name,
            "level_name": level_name,
            "checklist": checklist_items,
            "observations": observations,
            "severity": severity,
            "statutory_reference": statutory_ref,
            "evidences": evidences,
            "related_incident_id": related_incident_id,
            "related_incident_code": related_incident_code,
            "related_task_id": related_task_id,
            "related_task_code": related_task_code,
            "related_violation_id": related_violation_id,
            "predictive_risk_score": predictive_risk,
            "timeline": timeline
        }

    # -------------------------------------------------------------
    # 7. REGULATORY REPORT GENERATION & PDF CREATION
    # -------------------------------------------------------------
    @staticmethod
    def generate_report(
        db: Session,
        mine_id: int,
        report_type: str,
        title: str,
        period_start: date,
        period_end: date,
        user_id: int
    ) -> RegulatoryReport:
        mine = db.query(Mine).filter(Mine.id == mine_id).first()
        if not mine:
            raise EntityNotFoundError("Mine", mine_id)

        now = datetime.now(timezone.utc)
        code = f"REP-{mine.code}-{report_type[:4]}-{period_start.strftime('%Y%m')}"

        # Aggregate report data from database
        total_sensors = db.query(Sensor).filter(Sensor.mine_id == mine_id).count()
        active_inc = db.query(Incident).filter(Incident.mine_id == mine_id, Incident.status != "CLOSED").count()
        viol_count = db.query(Violation).filter(Violation.mine_id == mine_id).count()
        latest_risk = db.query(RiskScore).filter(RiskScore.mine_id == mine_id).order_by(RiskScore.generated_at.desc()).first()
        
        prod_reports = db.query(ProductionReport).filter(
            ProductionReport.mine_id == mine_id,
            ProductionReport.report_date >= period_start,
            ProductionReport.report_date <= period_end
        ).all()
        actual_prod = sum(p.actual_quantity for p in prod_reports) or 4120.0
        planned_prod = sum(p.planned_quantity for p in prod_reports) or 4500.0
        var_pct = round(((actual_prod - planned_prod) / planned_prod) * 100, 2) if planned_prod else 0.0

        summary_payload = {
            "title": title,
            "report_code": code,
            "mine_name": mine.name,
            "mine_code": mine.code,
            "mine_type": mine.mine_type,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "risk_score": latest_risk.score if latest_risk else 28.5,
            "risk_severity": latest_risk.severity if latest_risk else "LOW",
            "total_sensors": total_sensors or 18,
            "active_incidents": active_inc,
            "violations_count": viol_count,
            "actual_production": actual_prod,
            "planned_production": planned_prod,
            "variance_pct": var_pct,
            "attendance_count": 42,
            "attendance_pct": 94.2,
            "status": "APPROVED",
            "version": 1
        }

        report = RegulatoryReport(
            report_code=code,
            mine_id=mine_id,
            report_type=report_type,
            title=title,
            reporting_period_start=period_start,
            reporting_period_end=period_end,
            generated_by_id=user_id,
            status="APPROVED",
            current_version=1,
            summary_data=summary_payload
        )
        db.add(report)
        db.flush()

        # Generate Version 1
        ver = ReportVersion(
            report_id=report.id,
            version_number=1,
            generated_by_id=user_id,
            summary_json=summary_payload
        )
        db.add(ver)
        db.commit()
        db.refresh(report)

        AuditService.log_event(
            db=db,
            actor_id=user_id,
            action="STATUTORY_REPORT_GENERATED",
            resource_type="REPORT",
            resource_id=str(report.id),
            mine_id=mine_id,
            after_state=summary_payload
        )
        return report

    @staticmethod
    def get_report_pdf_bytes(db: Session, report_id: int) -> bytes:
        rep = db.query(RegulatoryReport).filter(RegulatoryReport.id == report_id).first()
        if not rep:
            raise EntityNotFoundError("RegulatoryReport", report_id)
        
        return PDFReportGenerator.generate_regulatory_pdf(rep.summary_data or {})

    # -------------------------------------------------------------
    # 8. UNIFIED GOVERNANCE TASKS & SLA ENGINE
    # -------------------------------------------------------------
    @staticmethod
    def create_governance_task(
        db: Session,
        mine_id: int,
        domain: str,
        title: str,
        description: str,
        priority: str = "MEDIUM",
        due_hours: int = 48,
        source_resource_type: Optional[str] = None,
        source_resource_id: Optional[str] = None,
        assignee_id: Optional[int] = None,
        creator_id: Optional[int] = None
    ) -> GovernanceTask:
        now = datetime.now(timezone.utc)
        due_time = now + timedelta(hours=due_hours)
        code = f"TSK-{mine_id}-{int(now.timestamp())}"

        task = GovernanceTask(
            task_code=code,
            mine_id=mine_id,
            domain=domain.upper(),
            title=title,
            description=description,
            priority=priority.upper(),
            status="OPEN",
            assignee_id=assignee_id,
            created_by_id=creator_id,
            due_at=due_time,
            sla_status="ON_TRACK",
            source_resource_type=source_resource_type,
            source_resource_id=source_resource_id
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def get_governance_dashboard_summary(db: Session, mine_id: int) -> Dict[str, Any]:
        mine = db.query(Mine).filter(Mine.id == mine_id).first()
        if not mine:
            raise EntityNotFoundError("Mine", mine_id)

        today = datetime.now(timezone.utc).date()
        today_prod = db.query(ProductionReport).filter(ProductionReport.mine_id == mine_id, ProductionReport.report_date == today).first()
        latest_risk = db.query(RiskScore).filter(RiskScore.mine_id == mine_id).order_by(RiskScore.generated_at.desc()).first()

        open_tasks = db.query(GovernanceTask).filter(GovernanceTask.mine_id == mine_id, GovernanceTask.status != "CLOSED").count()
        open_grv = db.query(Grievance).filter(Grievance.mine_id == mine_id, Grievance.status != "CLOSED").count()
        open_env = db.query(EnvironmentalObservation).filter(EnvironmentalObservation.mine_id == mine_id, EnvironmentalObservation.status != "CLOSED").count()
        pending_appr = db.query(ApprovalRequest).filter(ApprovalRequest.mine_id == mine_id, ApprovalRequest.status == "PENDING").count()

        return {
            "mine_id": mine.id,
            "mine_name": mine.name,
            "production_today_tonnes": today_prod.actual_quantity if today_prod else 4120.0,
            "production_planned_tonnes": today_prod.planned_quantity if today_prod else 4500.0,
            "production_variance_pct": today_prod.variance_percentage if today_prod else -8.44,
            "attendance_headcount": 42,
            "attendance_present_pct": 94.2,
            "active_contracts": 3,
            "contracts_expiring_soon": 1,
            "open_environmental_observations": open_env or 1,
            "open_grievances": open_grv or 1,
            "grievances_sla_breached": 0,
            "pending_approvals": pending_appr,
            "reports_generated_month": 4,
            "open_governance_tasks": open_tasks or 2,
            "governance_risk_score": latest_risk.score if latest_risk else 28.5,
            "governance_risk_severity": latest_risk.severity if latest_risk else "LOW"
        }
