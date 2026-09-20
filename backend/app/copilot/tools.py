from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.mine import Mine
from app.models.spatial import MineLevel, MineZone
from app.models.sensor import Sensor, SensorReading
from app.models.risk import RiskScore, AnomalyEvent
from app.models.incident import Incident
from app.models.violation import Violation, CorrectiveAction
from app.models.environmental import EnvironmentalObservation
from app.models.production import ProductionReport
from app.models.workforce import AttendanceRecord, Shift
from app.models.contractor import Contractor, Contract
from app.models.grievance import Grievance
from app.models.approval import ApprovalRequest
from app.models.governance_task import GovernanceTask
from app.models.audit import AuditEvent
from app.models.user import User

from app.services.risk_service import RiskService
from app.services.predictive_risk_service import PredictiveRiskService
from app.copilot.security import CopilotSecurity

class CopilotTools:
    @staticmethod
    def get_mine_summary(db: Session, mine_id: int, user: User) -> Dict[str, Any]:
        mine = db.query(Mine).filter(Mine.id == mine_id).first()
        if not mine:
            return {"error": f"Mine ID {mine_id} not found."}
        
        levels_count = db.query(MineLevel).filter(MineLevel.mine_id == mine_id).count()
        zones_count = db.query(MineZone).join(MineLevel).filter(MineLevel.mine_id == mine_id).count()
        sensors_count = db.query(Sensor).filter(Sensor.mine_id == mine_id).count()
        active_incidents_count = db.query(Incident).filter(
            Incident.mine_id == mine_id, Incident.status.in_(["OPEN", "UNDER_INVESTIGATION", "ACTION_REQUIRED"])
        ).count()
        
        return {
            "mine_id": mine.id,
            "name": mine.name,
            "code": mine.code,
            "type": mine.mine_type.value if hasattr(mine.mine_type, 'value') else str(mine.mine_type),
            "status": mine.status.value if hasattr(mine.status, 'value') else str(mine.status),
            "levels_count": levels_count,
            "zones_count": zones_count,
            "sensors_count": sensors_count,
            "active_incidents_count": active_incidents_count
        }

    @staticmethod
    def get_current_risk(db: Session, mine_id: int, user: User) -> Dict[str, Any]:
        latest_risk = RiskService.get_latest_risk_score(db, mine_id)
        if not latest_risk:
            calc = RiskService.calculate_mine_risk(db, mine_id)
            latest_risk = RiskService.get_latest_risk_score(db, mine_id)
        
        score_val = latest_risk.score if latest_risk else 15.0
        band_val = latest_risk.severity if latest_risk else "LOW"
        
        factor_list = []
        if latest_risk and latest_risk.factors:
            for f in latest_risk.factors:
                factor_list.append({
                    "name": f.factor_name,
                    "contribution_points": f.contribution_points,
                    "weight": f.weight,
                    "details": f.details
                })
        return {
            "mine_id": mine_id,
            "current_risk_score": score_val,
            "risk_band": band_val,
            "factors": factor_list
        }

    @staticmethod
    def get_predicted_risk(db: Session, mine_id: int, user: User) -> Dict[str, Any]:
        pred = PredictiveRiskService.generate_prediction(db, mine_id)
        return {
            "mine_id": mine_id,
            "current_risk_score": pred.get("current_risk_score", 0.0),
            "current_risk_band": pred.get("current_severity", "LOW"),
            "predicted_risk_score": pred.get("predicted_risk_score", 0.0),
            "predicted_risk_band": pred.get("predicted_severity", "LOW"),
            "risk_trend": pred.get("trend_direction", "STABLE"),
            "horizon": f"{pred.get('horizon_minutes', 30)} minutes",
            "probability": pred.get("probability", 0.0),
            "signal_attributions": pred.get("top_signals", []),
            "model_version": pred.get("model_version", "risk-escalation-v1.0"),
            "data_provenance": pred.get("dataset_provenance", "SIMULATED_DEMO")
        }

    @staticmethod
    def get_active_anomalies(db: Session, mine_id: int, user: User) -> Dict[str, Any]:
        two_hours_ago = datetime.now(timezone.utc) - timedelta(hours=2)
        anomalies = (
            db.query(AnomalyEvent)
            .join(Sensor, AnomalyEvent.sensor_id == Sensor.id)
            .filter(Sensor.mine_id == mine_id, AnomalyEvent.detected_at >= two_hours_ago)
            .order_by(desc(AnomalyEvent.detected_at))
            .limit(10)
            .all()
        )
        items = []
        for a in anomalies:
            items.append({
                "anomaly_id": a.id,
                "sensor_id": a.sensor_id,
                "anomaly_type": a.anomaly_type,
                "severity": a.severity,
                "value": a.value,
                "threshold": a.threshold,
                "detected_at": a.detected_at.isoformat()
            })
        return {"mine_id": mine_id, "count": len(items), "recent_anomalies": items}

    @staticmethod
    def get_sensor_status(db: Session, mine_id: int, user: User) -> Dict[str, Any]:
        sensors = db.query(Sensor).filter(Sensor.mine_id == mine_id).all()
        status_counts = {"ACTIVE": 0, "WARNING": 0, "CRITICAL": 0, "OFFLINE": 0, "CALIBRATING": 0}
        critical_sensors = []
        for s in sensors:
            st = s.status.value if hasattr(s.status, 'value') else str(s.status)
            status_counts[st] = status_counts.get(st, 0) + 1
            if st in ["WARNING", "CRITICAL"]:
                critical_sensors.append({
                    "sensor_id": s.id,
                    "code": s.sensor_code,
                    "name": s.name,
                    "status": st,
                    "last_value": s.last_value,
                    "unit": s.unit,
                    "warning_threshold": s.warning_threshold,
                    "critical_threshold": s.critical_threshold,
                    "x": s.x, "y": s.y, "z": s.z
                })
        return {
            "mine_id": mine_id,
            "total_sensors": len(sensors),
            "status_distribution": status_counts,
            "elevated_sensors": critical_sensors
        }

    @staticmethod
    def get_incidents(db: Session, mine_id: int, user: User) -> Dict[str, Any]:
        incidents = (
            db.query(Incident)
            .filter(Incident.mine_id == mine_id)
            .order_by(desc(Incident.occurred_at))
            .limit(10)
            .all()
        )
        items = []
        for inc in incidents:
            items.append({
                "incident_id": inc.id,
                "code": inc.incident_code,
                "title": inc.title,
                "severity": inc.severity.value if hasattr(inc.severity, 'value') else str(inc.severity),
                "status": inc.status.value if hasattr(inc.status, 'value') else str(inc.status),
                "category": inc.category.value if hasattr(inc.category, 'value') else str(inc.category),
                "occurred_at": inc.occurred_at.isoformat(),
                "x": inc.x, "y": inc.y, "z": inc.z
            })
        return {"mine_id": mine_id, "total": len(items), "incidents": items}

    @staticmethod
    def get_violations(db: Session, mine_id: int, user: User) -> Dict[str, Any]:
        violations = (
            db.query(Violation)
            .filter(Violation.mine_id == mine_id)
            .order_by(desc(Violation.created_at))
            .limit(10)
            .all()
        )
        items = []
        for v in violations:
            items.append({
                "violation_id": v.id,
                "code": v.violation_code,
                "title": v.title,
                "severity": v.severity.value if hasattr(v.severity, 'value') else str(v.severity),
                "status": v.status.value if hasattr(v.status, 'value') else str(v.status),
                "statutory_ref": v.statutory_rule_reference,
                "action_deadline": v.action_deadline.isoformat() if v.action_deadline else None
            })
        return {"mine_id": mine_id, "total": len(items), "violations": items}

    @staticmethod
    def get_corrective_actions(db: Session, mine_id: int, user: User) -> Dict[str, Any]:
        actions = (
            db.query(CorrectiveAction)
            .join(Violation, CorrectiveAction.violation_id == Violation.id)
            .filter(Violation.mine_id == mine_id)
            .order_by(desc(CorrectiveAction.due_date))
            .limit(10)
            .all()
        )
        now = datetime.now(timezone.utc)
        items = []
        for a in actions:
            due = a.due_date.replace(tzinfo=timezone.utc) if a.due_date.tzinfo is None else a.due_date
            is_overdue = due < now and a.status not in ["COMPLETED", "VERIFIED", "CLOSED"]
            items.append({
                "action_id": a.id,
                "title": a.title,
                "status": a.status.value if hasattr(a.status, 'value') else str(a.status),
                "due_date": a.due_date.isoformat(),
                "is_overdue": is_overdue,
                "priority": a.priority.value if hasattr(a.priority, 'value') else str(a.priority)
            })
        return {"mine_id": mine_id, "total": len(items), "actions": items}

    @staticmethod
    def get_environmental_observations(db: Session, mine_id: int, user: User) -> Dict[str, Any]:
        obs = (
            db.query(EnvironmentalObservation)
            .filter(EnvironmentalObservation.mine_id == mine_id)
            .order_by(desc(EnvironmentalObservation.observation_time))
            .limit(10)
            .all()
        )
        items = []
        for o in obs:
            items.append({
                "observation_id": o.id,
                "parameter_type": o.parameter_type,
                "observed_value": o.observed_value,
                "statutory_limit": o.statutory_limit,
                "threshold_breached": o.threshold_breached,
                "observation_time": o.observation_time.isoformat(),
                "x": o.x, "y": o.y, "z": o.z
            })
        return {"mine_id": mine_id, "total": len(items), "observations": items}

    @staticmethod
    def get_production_reports(db: Session, mine_id: int, user: User) -> Dict[str, Any]:
        reports = (
            db.query(ProductionReport)
            .filter(ProductionReport.mine_id == mine_id)
            .order_by(desc(ProductionReport.log_date))
            .limit(5)
            .all()
        )
        items = []
        for r in reports:
            items.append({
                "report_id": r.id,
                "log_date": r.log_date.isoformat(),
                "shift": r.shift_code,
                "planned_tonnage": r.planned_tonnage,
                "actual_tonnage": r.actual_tonnage,
                "variance_tons": r.variance_tonnage,
                "status": r.status.value if hasattr(r.status, 'value') else str(r.status)
            })
        return {"mine_id": mine_id, "recent_reports": items}

    @staticmethod
    def get_attendance_summary(db: Session, mine_id: int, user: User) -> Dict[str, Any]:
        today = datetime.now(timezone.utc).date()
        records = (
            db.query(AttendanceRecord)
            .filter(AttendanceRecord.mine_id == mine_id, AttendanceRecord.attendance_date == today)
            .all()
        )
        total = len(records)
        present = sum(1 for r in records if r.status in ["PRESENT", "LATE"])
        muster_pct = (present / total * 100.0) if total > 0 else 100.0
        return {
            "mine_id": mine_id,
            "date": today.isoformat(),
            "total_rostered": total,
            "present_count": present,
            "muster_compliance_pct": round(muster_pct, 1)
        }

    @staticmethod
    def get_contractor_status(db: Session, mine_id: int, user: User) -> Dict[str, Any]:
        contractors = db.query(Contractor).join(Contract).filter(Contract.mine_id == mine_id).distinct().all()
        now = datetime.now(timezone.utc).date()
        expiring = []
        for c in contractors:
            for contract in c.contracts:
                if contract.mine_id == mine_id and contract.end_date:
                    days_left = (contract.end_date - now).days
                    if 0 <= days_left <= 30:
                        expiring.append({
                            "contractor": c.name,
                            "contract_code": contract.contract_code,
                            "days_remaining": days_left
                        })
        return {
            "mine_id": mine_id,
            "total_active_contractors": len(contractors),
            "expiring_contracts_30d": expiring
        }

    @staticmethod
    def get_grievances(db: Session, mine_id: int, user: User) -> Dict[str, Any]:
        grievances = (
            db.query(Grievance)
            .filter(Grievance.mine_id == mine_id, Grievance.status.in_(["SUBMITTED", "ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS"]))
            .order_by(desc(Grievance.created_at))
            .limit(10)
            .all()
        )
        now = datetime.now(timezone.utc)
        items = []
        for g in grievances:
            target = g.target_resolution_date.replace(tzinfo=timezone.utc) if g.target_resolution_date.tzinfo is None else g.target_resolution_date
            sla_breached = target < now
            items.append({
                "grievance_id": g.id,
                "ticket_code": g.ticket_code,
                "category": g.category,
                "priority": g.priority.value if hasattr(g.priority, 'value') else str(g.priority),
                "status": g.status.value if hasattr(g.status, 'value') else str(g.status),
                "sla_breached": sla_breached
            })
        return {"mine_id": mine_id, "active_grievances": items}

    @staticmethod
    def get_pending_approvals(db: Session, mine_id: int, user: User) -> Dict[str, Any]:
        approvals = (
            db.query(ApprovalRequest)
            .filter(ApprovalRequest.mine_id == mine_id, ApprovalRequest.status == "PENDING")
            .order_by(desc(ApprovalRequest.created_at))
            .limit(10)
            .all()
        )
        items = []
        for a in approvals:
            items.append({
                "approval_id": a.id,
                "request_code": a.request_code,
                "document_type": a.document_type,
                "title": a.title,
                "requested_by_id": a.requested_by_id,
                "created_at": a.created_at.isoformat()
            })
        return {"mine_id": mine_id, "pending_count": len(items), "pending_approvals": items}

    @staticmethod
    def get_governance_tasks(db: Session, mine_id: int, user: User) -> Dict[str, Any]:
        tasks = (
            db.query(GovernanceTask)
            .filter(GovernanceTask.mine_id == mine_id, GovernanceTask.status.in_(["PENDING", "IN_PROGRESS"]))
            .order_by(desc(GovernanceTask.due_date))
            .limit(10)
            .all()
        )
        items = []
        for t in tasks:
            items.append({
                "task_id": t.id,
                "task_type": t.task_type.value if hasattr(t.task_type, 'value') else str(t.task_type),
                "title": t.title,
                "status": t.status.value if hasattr(t.status, 'value') else str(t.status),
                "priority": t.priority.value if hasattr(t.priority, 'value') else str(t.priority),
                "due_date": t.due_date.isoformat()
            })
        return {"mine_id": mine_id, "open_tasks": items}

    @staticmethod
    def get_what_changed(db: Session, mine_id: int, user: User, window_hours: int = 1) -> Dict[str, Any]:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=window_hours)
        new_anomalies = (
            db.query(AnomalyEvent)
            .join(Sensor, AnomalyEvent.sensor_id == Sensor.id)
            .filter(Sensor.mine_id == mine_id, AnomalyEvent.detected_at >= cutoff)
            .count()
        )
        new_incidents = db.query(Incident).filter(Incident.mine_id == mine_id, Incident.occurred_at >= cutoff).count()
        new_violations = db.query(Violation).filter(Violation.mine_id == mine_id, Violation.created_at >= cutoff).count()
        latest_risk = RiskService.get_latest_risk_score(db, mine_id)
        current_risk = latest_risk.score if latest_risk else 15.0
        
        return {
            "mine_id": mine_id,
            "window_hours": window_hours,
            "new_anomalies_count": new_anomalies,
            "new_incidents_count": new_incidents,
            "new_violations_count": new_violations,
            "current_risk_score": current_risk
        }

    @staticmethod
    def get_audit_events(db: Session, mine_id: int, user: User, limit: int = 5) -> Dict[str, Any]:
        events = (
            db.query(AuditEvent)
            .filter(AuditEvent.mine_id == mine_id)
            .order_by(desc(AuditEvent.timestamp))
            .limit(limit)
            .all()
        )
        items = []
        for e in events:
            items.append({
                "audit_id": e.id,
                "action": e.action,
                "resource_type": e.resource_type,
                "resource_id": e.resource_id,
                "timestamp": e.timestamp.isoformat(),
                "event_hash": e.current_event_hash[:12] + "..." if e.current_event_hash else None
            })
        return {"mine_id": mine_id, "recent_audit_events": items}

    # ============================================================
    # PHASE 11C: GOVERNMENT KNOWLEDGE & EVIDENCE TOOLS
    # ============================================================

    @staticmethod
    def search_government_documents(
        db: Session,
        mine_id: int,
        user: User,
        query: str = "",
        domain: Optional[str] = None,
        source_tier: Optional[str] = None,
        prefer_current: bool = True,
        top_k: int = 5,
        **kwargs
    ) -> Dict[str, Any]:
        from app.services.government_rag_service import government_rag_service
        results = government_rag_service.search(
            query=query,
            domain=domain,
            source_tier=source_tier,
            prefer_current=prefer_current,
            top_k=top_k
        )
        items = []
        for chunk, score in results:
            items.append({
                "document_code": chunk.document_code,
                "document_title": chunk.document_title,
                "organization": chunk.organization,
                "page_number": chunk.page_number,
                "section": chunk.section_heading,
                "excerpt": chunk.text_content,
                "source_tier": chunk.source_tier,
                "status": chunk.source_status,
                "domain": chunk.domain,
                "chunk_hash": chunk.chunk_hash,
                "file_hash": chunk.file_hash,
                "relevance_score": round(score, 2)
            })
        return {
            "query": query,
            "domain_filter": domain,
            "results_count": len(items),
            "evidence_chunks": items
        }

    @staticmethod
    def get_document_evidence(
        db: Session,
        mine_id: int,
        user: User,
        document_code: str,
        page_number: Optional[int] = None,
        **kwargs
    ) -> Dict[str, Any]:
        from app.services.government_rag_service import government_rag_service
        matching = [
            c for c in government_rag_service.chunks
            if c.document_code == document_code and (page_number is None or c.page_number == page_number)
        ]
        if not matching:
            return {"error": f"No indexed evidence found for document {document_code} on page {page_number}."}
        
        items = []
        for c in matching[:5]:
            items.append({
                "document_title": c.document_title,
                "organization": c.organization,
                "page_number": c.page_number,
                "section": c.section_heading,
                "excerpt": c.text_content,
                "source_tier": c.source_tier,
                "status": c.source_status,
                "chunk_hash": c.chunk_hash,
                "file_hash": c.file_hash
            })
        return {
            "document_code": document_code,
            "page_number": page_number,
            "evidence": items
        }

    @staticmethod
    def get_regulatory_requirement(
        db: Session,
        mine_id: int,
        user: User,
        topic: str = "",
        domain: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        from app.services.government_rag_service import government_rag_service
        results = government_rag_service.search(
            query=topic,
            domain=domain,
            source_tier="TIER_1_OFFICIAL_REGULATORY",
            prefer_current=True,
            top_k=4
        )
        return {
            "topic": topic,
            "domain": domain,
            "regulatory_evidence": [
                {
                    "document": c.document_title,
                    "organization": c.organization,
                    "page": c.page_number,
                    "section": c.section_heading,
                    "statutory_text": c.text_content,
                    "source_tier": c.source_tier,
                    "status": c.source_status,
                    "file_hash": c.file_hash
                }
                for c, _ in results
            ]
        }

    @staticmethod
    def get_current_regulation(
        db: Session,
        mine_id: int,
        user: User,
        topic: str = "",
        domain: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        from app.services.government_rag_service import government_rag_service
        results = government_rag_service.search(
            query=topic,
            domain=domain,
            source_tier="TIER_1_OFFICIAL_REGULATORY",
            temporal_mode="CURRENT_ONLY",
            top_k=4
        )
        return {
            "topic": topic,
            "temporal_scope": "CURRENT_ONLY",
            "current_regulations": [
                {
                    "document": c.document_title,
                    "organization": c.organization,
                    "page": c.page_number,
                    "section": c.section_heading,
                    "text": c.text_content,
                    "status": c.source_status,
                    "file_hash": c.file_hash
                }
                for c, _ in results
            ]
        }

    @staticmethod
    def get_historical_regulation(
        db: Session,
        mine_id: int,
        user: User,
        topic: str = "",
        domain: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        from app.services.government_rag_service import government_rag_service
        results = government_rag_service.search(
            query=topic or "Mines Act 1952 Mines Rules 1955",
            domain=domain,
            source_tier="TIER_1_OFFICIAL_REGULATORY",
            temporal_mode="HISTORICAL_ALLOWED",
            top_k=4
        )
        return {
            "topic": topic,
            "temporal_scope": "HISTORICAL_AND_SUPERSEDED",
            "historical_regulations": [
                {
                    "document": c.document_title,
                    "page": c.page_number,
                    "section": c.section_heading,
                    "text": c.text_content,
                    "status": c.source_status,
                    "file_hash": c.file_hash
                }
                for c, _ in results
            ]
        }

    @staticmethod
    def get_mine_source_evidence(
        db: Session,
        mine_id: int,
        user: User,
        category: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        from app.models.real_mine_data import (
            MineProfile, MineBoundary, MineCoordinate, MineSeam, MineClearance, MineDataAttribute, DataProvenance
        )
        profile = db.query(MineProfile).filter(MineProfile.mine_id == mine_id).first()
        boundary = db.query(MineBoundary).filter(MineBoundary.mine_id == mine_id).first()
        coords = db.query(MineCoordinate).filter(MineCoordinate.mine_id == mine_id).order_by(MineCoordinate.sequence_order).all()
        seams = db.query(MineSeam).filter(MineSeam.mine_id == mine_id).all()
        clearances = db.query(MineClearance).filter(MineClearance.mine_id == mine_id).all()
        
        # Primary provenance
        prov_data = {}
        if profile and profile.provenance:
            prov_data = {
                "document_title": profile.provenance.document_title,
                "document_filename": profile.provenance.document_filename,
                "document_hash": profile.provenance.document_hash,
                "page_number": profile.provenance.page_number,
                "source_organization": profile.provenance.source_organization,
                "authority_level": profile.provenance.authority_level,
                "data_status": profile.provenance.data_status
            }

        return {
            "mine_id": mine_id,
            "provenance": prov_data,
            "profile": {
                "official_name": profile.official_name if profile else None,
                "coalfield": profile.coalfield if profile else None,
                "state": profile.state if profile else None,
                "district": profile.district if profile else None,
                "geological_block_area_sq_km": profile.geological_block_area_sq_km if profile else None,
                "total_geological_reserve_mt": profile.total_geological_reserve_mt if profile else None,
                "total_extractable_reserve_mt": profile.total_extractable_reserve_mt if profile else None,
                "target_capacity_raw": profile.target_capacity_raw if profile else None,
                "data_status": profile.data_status if profile else "UNKNOWN",
                "geometry_status": profile.geometry_status if profile else "UNKNOWN"
            } if profile else None,
            "boundary": {
                "boundary_type": boundary.boundary_type if boundary else None,
                "geometry_status": boundary.geometry_status if boundary else "UNKNOWN",
                "min_latitude": boundary.min_latitude if boundary else None,
                "max_latitude": boundary.max_latitude if boundary else None,
                "min_longitude": boundary.min_longitude if boundary else None,
                "max_longitude": boundary.max_longitude if boundary else None
            } if boundary else None,
            "coordinates_count": len(coords),
            "seams_count": len(seams),
            "clearances_count": len(clearances)
        }

    @staticmethod
    def get_cmsms_workflow(
        db: Session,
        mine_id: int,
        user: User,
        workflow_stage: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        from app.services.government_rag_service import government_rag_service
        q = f"CMSMS Khanan Prahari {workflow_stage or 'complaint citizen routing field inspection satellite'}"
        results = government_rag_service.search(
            query=q,
            domain="CMSMS",
            source_tier="TIER_1_OFFICIAL_REGULATORY",
            top_k=4
        )
        return {
            "system": "COAL MINE SURVEILLANCE AND MANAGEMENT SYSTEM (CMSMS)",
            "app": "KHANAN PRAHARI",
            "workflow_stage": workflow_stage or "END_TO_END_SOP",
            "disclaimer": "OFFICIAL CMSMS WORKFLOW (Not connected to live government production database; operates via TRINETRA integration adapter)",
            "workflow_evidence": [
                {
                    "source": c.document_title,
                    "page": c.page_number,
                    "section": c.section_heading,
                    "text": c.text_content,
                    "file_hash": c.file_hash
                }
                for c, _ in results
            ]
        }

    @staticmethod
    def get_pgrm_workflow(
        db: Session,
        mine_id: int,
        user: User,
        topic: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        from app.services.government_rag_service import government_rag_service
        q = f"PGRM public grievance CPGRAMS {topic or 'redressal timeline nodal officer appeal'}"
        results = government_rag_service.search(
            query=q,
            domain="PGRM",
            source_tier="TIER_1_OFFICIAL_REGULATORY",
            top_k=4
        )
        return {
            "system": "PUBLIC GRIEVANCES REDRESSAL MECHANISM (PGRM)",
            "portal": "CPGRAMS (pgportal.gov.in)",
            "topic": topic or "STANDARD_REDRESSAL_SOP",
            "evidence": [
                {
                    "source": c.document_title,
                    "page": c.page_number,
                    "section": c.section_heading,
                    "text": c.text_content,
                    "file_hash": c.file_hash
                }
                for c, _ in results
            ]
        }

    @staticmethod
    def get_budget_indicator(
        db: Session,
        mine_id: int,
        user: User,
        scheme_name: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        from app.services.government_rag_service import government_rag_service
        q = f"Budget 2026-27 Demand No 8 {scheme_name or 'exploration R&D safety allocation output outcome'}"
        results = government_rag_service.search(
            query=q,
            domain="BUDGET",
            source_tier="TIER_1_OFFICIAL_REGULATORY",
            top_k=4
        )
        return {
            "fiscal_year": "2026-27",
            "demand_no": "Demand No. 8 (Ministry of Coal)",
            "scheme_query": scheme_name or "ALL_MAJOR_HEADS",
            "disclaimer": "Budgetary figures represent authorized government allocations and target indicators, not verified operational expenditure.",
            "budget_evidence": [
                {
                    "document": c.document_title,
                    "page": c.page_number,
                    "section": c.section_heading,
                    "text": c.text_content,
                    "file_hash": c.file_hash
                }
                for c, _ in results
            ]
        }

    @staticmethod
    def get_annual_report_evidence(
        db: Session,
        mine_id: int,
        user: User,
        chapter_or_topic: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        from app.services.government_rag_service import government_rag_service
        q = f"Annual Report 2025-26 Ministry of Coal {chapter_or_topic or 'safety production sustainability exploration workforce welfare'}"
        results = government_rag_service.search(
            query=q,
            source_tier="TIER_1_OFFICIAL_REGULATORY",
            top_k=4
        )
        return {
            "report": "Ministry of Coal Annual Report 2025-26",
            "query": chapter_or_topic or "GENERAL_REPORT",
            "disclaimer": "Government-reported national figures from official MoC Annual Report.",
            "report_evidence": [
                {
                    "document": c.document_title,
                    "page": c.page_number,
                    "section": c.section_heading,
                    "text": c.text_content,
                    "file_hash": c.file_hash
                }
                for c, _ in results
            ]
        }

    @staticmethod
    def search_uploaded_documents(
        db: Session,
        mine_id: int,
        user: User,
        query: str,
        doc_type: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        from app.models.document import Document, DocumentPage
        docs_query = db.query(Document).filter(
            (Document.mine_id == mine_id) | (Document.mine_id.is_(None))
        )
        if doc_type:
            docs_query = docs_query.filter(Document.doc_type == doc_type)
        docs = docs_query.order_by(Document.uploaded_at.desc()).limit(5).all()

        matching_pages = []
        for d in docs:
            for p in d.pages:
                if query.lower() in p.text_content.lower() or not query.strip():
                    matching_pages.append({
                        "document_id": d.id,
                        "document_title": d.title,
                        "doc_type": d.doc_type,
                        "page_number": p.page_number,
                        "extraction_method": p.extraction_method,
                        "ocr_provider": p.ocr_provider,
                        "ocr_confidence": p.ocr_confidence,
                        "quality_status": p.quality_status,
                        "file_hash": d.file_hash,
                        "excerpt": p.text_content[:240]
                    })

        return {
            "mine_id": mine_id,
            "query": query,
            "total_matches": len(matching_pages),
            "evidence": matching_pages[:4]
        }

    @staticmethod
    def get_uploaded_document_field_evidence(
        db: Session,
        mine_id: int,
        user: User,
        field_name: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        from app.models.document import Document, ExtractedDocumentField
        fields_query = db.query(ExtractedDocumentField).join(Document).filter(
            (Document.mine_id == mine_id) | (Document.mine_id.is_(None))
        )
        if field_name:
            fields_query = fields_query.filter(ExtractedDocumentField.field_name.ilike(f"%{field_name}%"))
        fields = fields_query.order_by(ExtractedDocumentField.created_at.desc()).limit(10).all()

        return {
            "mine_id": mine_id,
            "field_filter": field_name or "ALL_FIELDS",
            "extracted_fields": [
                {
                    "document_id": f.document_id,
                    "document_title": f.document.title if f.document else "Document",
                    "field_name": f.field_name,
                    "field_value": f.field_value,
                    "confidence": f.confidence,
                    "source_page": f.page_number,
                    "extraction_method": f.extraction_method,
                    "validation_status": f.validation_status,
                    "is_verified": f.is_verified,
                    "source_text": f.source_text
                }
                for f in fields
            ]
        }

    @staticmethod
    def get_spatial_risk_context(
        db: Session,
        mine_id: int,
        user: User,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        feature_id: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        from app.services.spatial_context_service import spatial_context_service
        from app.models.mine import Mine
        mine = db.query(Mine).filter(Mine.id == mine_id).first()
        if not mine:
            return {"error": f"Mine {mine_id} not found"}

        target_lat = latitude or mine.latitude or 23.5000
        target_lon = longitude or mine.longitude or 85.5000

        context_data = spatial_context_service.find_nearest_entities(
            db=db,
            mine_id=mine_id,
            target_lat=target_lat,
            target_lon=target_lon
        )
        risk_hotspots = spatial_context_service.aggregate_spatial_risk_hotspots(db=db, mine_id=mine_id)

        return {
            "mine_id": mine_id,
            "mine_name": mine.name,
            "target_coordinate": {"latitude": target_lat, "longitude": target_lon},
            "feature_id": feature_id,
            "boundary_status": context_data["boundary_status"],
            "nearest_sensors": context_data["nearest_sensors"],
            "nearest_incidents": context_data["nearest_incidents"],
            "nearest_inspections": context_data["nearest_inspections"],
            "active_spatial_risk_hotspots": risk_hotspots[:3]
        }



