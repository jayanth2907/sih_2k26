from typing import Dict, Any, List, Callable
from sqlalchemy.orm import Session
from app.core.exceptions import PermissionDeniedError, BusinessRuleViolationError
from app.core.authz import check_mine_access, get_user_roles
from app.core.permissions import RoleEnum
from app.models.user import User
from app.copilot.tools import CopilotTools
from app.copilot.schemas import ToolDefinition

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, Dict[str, Any]] = {}
        self._register_default_tools()

    def _register_default_tools(self):
        all_operational_roles = [
            RoleEnum.SYSTEM_ADMIN.value,
            RoleEnum.MINE_MANAGER.value,
            RoleEnum.MINE_SAFETY_OFFICER.value,
            RoleEnum.FIELD_INSPECTOR.value,
            RoleEnum.CONTRACTOR_MANAGER.value,
            RoleEnum.REGULATOR.value
        ]
        
        governance_roles = [
            RoleEnum.SYSTEM_ADMIN.value,
            RoleEnum.MINE_MANAGER.value,
            RoleEnum.MINE_SAFETY_OFFICER.value,
            RoleEnum.REGULATOR.value
        ]

        self.register_tool(
            name="get_mine_summary",
            func=CopilotTools.get_mine_summary,
            description="Returns mine operational hierarchy, zones, levels, and total sensor counts.",
            allowed_roles=all_operational_roles,
            parameters={"mine_id": "int"}
        )
        self.register_tool(
            name="get_current_risk",
            func=CopilotTools.get_current_risk,
            description="Returns current deterministic multi-factor risk score and contributing factor breakdown.",
            allowed_roles=all_operational_roles,
            parameters={"mine_id": "int"}
        )
        self.register_tool(
            name="get_predicted_risk",
            func=CopilotTools.get_predicted_risk,
            description="Returns forward 30-minute machine learning predicted risk escalation score and signal attributions.",
            allowed_roles=all_operational_roles,
            parameters={"mine_id": "int"}
        )
        self.register_tool(
            name="get_active_anomalies",
            func=CopilotTools.get_active_anomalies,
            description="Returns recent atmospheric telemetry anomalies (gas spikes, ventilation drops).",
            allowed_roles=all_operational_roles,
            parameters={"mine_id": "int"}
        )
        self.register_tool(
            name="get_sensor_status",
            func=CopilotTools.get_sensor_status,
            description="Returns status distribution and critical threshold exceedances across underground sensor nodes.",
            allowed_roles=all_operational_roles,
            parameters={"mine_id": "int"}
        )
        self.register_tool(
            name="get_incidents",
            func=CopilotTools.get_incidents,
            description="Returns active and recent safety incidents, categories, and spatial coordinates.",
            allowed_roles=all_operational_roles,
            parameters={"mine_id": "int"}
        )
        self.register_tool(
            name="get_violations",
            func=CopilotTools.get_violations,
            description="Returns open statutory violations under Coal Mines Regulations 2017.",
            allowed_roles=all_operational_roles,
            parameters={"mine_id": "int"}
        )
        self.register_tool(
            name="get_corrective_actions",
            func=CopilotTools.get_corrective_actions,
            description="Returns overdue and pending safety corrective actions and resolution deadlines.",
            allowed_roles=all_operational_roles,
            parameters={"mine_id": "int"}
        )
        self.register_tool(
            name="get_environmental_observations",
            func=CopilotTools.get_environmental_observations,
            description="Returns underground environmental readings (methane, CO, respirable dust, air velocity).",
            allowed_roles=all_operational_roles,
            parameters={"mine_id": "int"}
        )
        self.register_tool(
            name="get_production_reports",
            func=CopilotTools.get_production_reports,
            description="Returns shift production tonnage, target variances, and deviation reviews.",
            allowed_roles=[RoleEnum.SYSTEM_ADMIN.value, RoleEnum.MINE_MANAGER.value, RoleEnum.FIELD_INSPECTOR.value, RoleEnum.REGULATOR.value],
            parameters={"mine_id": "int"}
        )
        self.register_tool(
            name="get_attendance_summary",
            func=CopilotTools.get_attendance_summary,
            description="Returns shift muster roll compliance and personnel attendance percentages.",
            allowed_roles=[RoleEnum.SYSTEM_ADMIN.value, RoleEnum.MINE_MANAGER.value, RoleEnum.CONTRACTOR_MANAGER.value, RoleEnum.REGULATOR.value],
            parameters={"mine_id": "int"}
        )
        self.register_tool(
            name="get_contractor_status",
            func=CopilotTools.get_contractor_status,
            description="Returns contractor directory, active agreements, and expiring contracts (<30 days).",
            allowed_roles=[RoleEnum.SYSTEM_ADMIN.value, RoleEnum.MINE_MANAGER.value, RoleEnum.CONTRACTOR_MANAGER.value, RoleEnum.REGULATOR.value],
            parameters={"mine_id": "int"}
        )
        self.register_tool(
            name="get_grievances",
            func=CopilotTools.get_grievances,
            description="Returns workforce grievance tickets, priority levels, and SLA breach statuses.",
            allowed_roles=all_operational_roles,
            parameters={"mine_id": "int"}
        )
        self.register_tool(
            name="get_pending_approvals",
            func=CopilotTools.get_pending_approvals,
            description="Returns pending digital sign-off requests requiring separation of duties.",
            allowed_roles=governance_roles,
            parameters={"mine_id": "int"}
        )
        self.register_tool(
            name="get_governance_tasks",
            func=CopilotTools.get_governance_tasks,
            description="Returns pending governance tasks and statutory action items.",
            allowed_roles=governance_roles,
            parameters={"mine_id": "int"}
        )
        self.register_tool(
            name="get_what_changed",
            func=CopilotTools.get_what_changed,
            description="Computes comparative changes in anomalies, incidents, and risk over the last hour.",
            allowed_roles=all_operational_roles,
            parameters={"mine_id": "int", "window_hours": "int"}
        )
        self.register_tool(
            name="get_audit_events",
            func=CopilotTools.get_audit_events,
            description="Returns recent SHA-256 tamper-evident governance ledger entries.",
            allowed_roles=governance_roles,
            parameters={"mine_id": "int", "limit": "int"}
        )

        # Phase 11C: Government & Mine Knowledge Tools
        self.register_tool(
            name="search_government_documents",
            func=CopilotTools.search_government_documents,
            description="Performs hybrid search across official government regulations, circulars, reports, and SOPs.",
            allowed_roles=all_operational_roles,
            parameters={"query": "str", "domain": "str", "source_tier": "str", "prefer_current": "bool"}
        )
        self.register_tool(
            name="get_document_evidence",
            func=CopilotTools.get_document_evidence,
            description="Retrieves exact page-level text chunk, SHA-256 hash, and section heading from an indexed document.",
            allowed_roles=all_operational_roles,
            parameters={"document_code": "str", "page_number": "int"}
        )
        self.register_tool(
            name="get_regulatory_requirement",
            func=CopilotTools.get_regulatory_requirement,
            description="Retrieves specific statutory requirements from Coal Mines Regulations 2017 or relevant DGMS notifications.",
            allowed_roles=all_operational_roles,
            parameters={"topic": "str", "domain": "str"}
        )
        self.register_tool(
            name="get_current_regulation",
            func=CopilotTools.get_current_regulation,
            description="Retrieves current active statutory frameworks (CMR 2017, DGMS active circulars, OSH Code).",
            allowed_roles=all_operational_roles,
            parameters={"topic": "str", "domain": "str"}
        )
        self.register_tool(
            name="get_historical_regulation",
            func=CopilotTools.get_historical_regulation,
            description="Retrieves historical or superseded regulations (Mines Rules 1955, Mines Act 1952) with historical marking.",
            allowed_roles=all_operational_roles,
            parameters={"topic": "str", "domain": "str"}
        )
        self.register_tool(
            name="get_mine_source_evidence",
            func=CopilotTools.get_mine_source_evidence,
            description="Retrieves official Phase 11A source-derived facts (area, reserves, seams, clearances, coordinates) for real coal blocks.",
            allowed_roles=all_operational_roles,
            parameters={"mine_id": "int", "category": "str"}
        )
        self.register_tool(
            name="get_cmsms_workflow",
            func=CopilotTools.get_cmsms_workflow,
            description="Retrieves official Standard Operating Procedures for CMSMS / Khanan Prahari illegal mining reporting & verification.",
            allowed_roles=all_operational_roles,
            parameters={"workflow_stage": "str"}
        )
        self.register_tool(
            name="get_pgrm_workflow",
            func=CopilotTools.get_pgrm_workflow,
            description="Retrieves official Public Grievances Redressal Mechanism (PGRM) SOPs, CPGRAMS routing, and statutory SLAs.",
            allowed_roles=all_operational_roles,
            parameters={"topic": "str"}
        )
        self.register_tool(
            name="get_budget_indicator",
            func=CopilotTools.get_budget_indicator,
            description="Retrieves Ministry of Coal Budget 2026-27 allocations, Demand No. 8 heads, and Output-Outcome targets.",
            allowed_roles=all_operational_roles,
            parameters={"scheme_name": "str"}
        )
        self.register_tool(
            name="get_annual_report_evidence",
            func=CopilotTools.get_annual_report_evidence,
            description="Retrieves Ministry of Coal Annual Report 2025-26 chapters evidence on safety, production, R&D, and sustainability.",
            allowed_roles=all_operational_roles,
            parameters={"chapter_or_topic": "str"}
        )
        self.register_tool(
            name="search_uploaded_documents",
            func=CopilotTools.search_uploaded_documents,
            description="Searches user-uploaded mine documents, OCR-digitized text, and verified pages.",
            allowed_roles=all_operational_roles,
            parameters={"query": "str", "doc_type": "str"}
        )
        self.register_tool(
            name="get_uploaded_document_field_evidence",
            func=CopilotTools.get_uploaded_document_field_evidence,
            description="Retrieves structured fields (dates, coordinates, quantities, regulation clauses) extracted from uploaded documents.",
            allowed_roles=all_operational_roles,
            parameters={"field_name": "str"}
        )
        self.register_tool(
            name="get_spatial_risk_context",
            func=CopilotTools.get_spatial_risk_context,
            description="Retrieves 2D GIS spatial context, boundary containment, nearest sensors/incidents, and risk hotspots for a coordinate.",
            allowed_roles=all_operational_roles,
            parameters={"latitude": "float", "longitude": "float", "feature_id": "str"}
        )


    def register_tool(
        self,
        name: str,
        func: Callable,
        description: str,
        allowed_roles: List[str],
        parameters: Dict[str, Any]
    ):
        self._tools[name] = {
            "name": name,
            "func": func,
            "description": description,
            "allowed_roles": allowed_roles,
            "parameters": parameters
        }

    def list_tools(self) -> List[ToolDefinition]:
        return [
            ToolDefinition(
                name=t["name"],
                description=t["description"],
                allowed_roles=t["allowed_roles"],
                parameters=t["parameters"]
            )
            for t in self._tools.values()
        ]

    def execute_tool(self, name: str, db: Session, mine_id: int, user: User, **kwargs) -> Dict[str, Any]:
        if name not in self._tools:
            raise BusinessRuleViolationError(f"Tool '{name}' is not registered in the allow-list.")

        tool_meta = self._tools[name]
        
        # Enforce Mine Isolation
        if not check_mine_access(user, mine_id, db):
            raise PermissionDeniedError(
                f"Access denied: User {user.email} is not authorized to query Mine ID {mine_id}."
            )

        # Enforce Role Authorization
        user_roles = get_user_roles(user, db)
        if not any(r in tool_meta["allowed_roles"] for r in user_roles) and not user.is_superuser:
            raise PermissionDeniedError(
                f"Access denied: User {user.email} with roles {user_roles} cannot execute tool '{name}'."
            )

        # Execute Tool securely
        func = tool_meta["func"]
        return func(db=db, mine_id=mine_id, user=user, **kwargs)

tool_registry = ToolRegistry()
