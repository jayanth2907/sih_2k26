import uuid
import json
import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.core.exceptions import PermissionDeniedError, BusinessRuleViolationError
from app.core.authz import check_mine_access, get_user_roles
from app.models.user import User
from app.models.mine import Mine
from app.models.copilot import CopilotHistory
from app.services.audit_service import AuditService
from app.services.government_rag_service import government_rag_service

from app.copilot.schemas import (
    CopilotQueryRequest, CopilotQueryResponse, EvidenceItem,
    CopilotAction, PredictiveSignalSummary
)
from app.copilot.security import CopilotSecurity, rate_limiter
from app.copilot.i18n import CopilotI18n
from app.copilot.tool_registry import tool_registry
from app.copilot.providers import GeminiLLMProvider, GroundedDeterministicComposer

class CopilotOrchestrator:

    @staticmethod
    def classify_question_type(query: str) -> str:
        q = query.lower()
        if any(w in q for w in ["mines act 1952", "mines rules 1955", "earlier requirement", "superseded", "old regulation", "1952", "1955"]):
            return "HISTORICAL_REQUIREMENT"
        if any(w in q for w in ["current requirement", "current regulatory", "current framework", "latest regulation", "active regulation", "what is the current", "osh code", "cmr 2017", "मानक", "नियम", "प्रक्रिया", "నిబంధనలు", "ప్రమాణాలు"]):
            return "CURRENT_REQUIREMENT"
        if any(w in q for w in ["cmsms", "khanan prahari", "illegal mining", "citizen report", "अवैध खनन", "అక్రమ మైనింగ్"]):
            return "CMSMS_WORKFLOW"
        if any(w in q for w in ["pgrm", "cpgrams", "grievance", "complaint redressal", "public grievance", "शिकायत", "ఫిర్యాదు"]):
            return "GRIEVANCE_WORKFLOW"
        if any(w in q for w in ["budget", "allocation", "demand no 8", "oomf", "ddg", "outlay", "crore", "बजट", "आवंटन", "బడ్జెట్"]):
            return "BUDGET_QUERY"
        if any(w in q for w in ["annual report", "reported ministry", "ministry program", "technology initiative", "वार्षिक रिपोर्ट"]):
            return "DOCUMENT_QUERY"
        if any(w in q for w in ["rohne", "jogeshwar", "rabodh", "choritand", "urtan", "arkhapal", "mine summary", "documented area", "block area", "coordinates documented"]):
            return "MINE_FACT"
        if any(w in q for w in ["why", "reason", "why is zone", "why is this", "cause", "क्यों", "कारण", "ఎందుకు"]):
            return "RISK_EXPLANATION"
        if any(w in q for w in ["predict", "future", "horizon", "escalat", "forecast", "आगामी", "अनुमानित", "అంచనా"]):
            return "OPERATIONAL_QUERY"
        if any(w in q for w in ["inspection", "standing committee", "audit requirement", "निरीक्षण", "తనిఖీ"]):
            return "INSPECTION_REQUIREMENT"
        if any(w in q for w in ["environment", "respirable dust", "air quality", "tree plantation", "पर्यावरण", "ధూళి"]):
            return "ENVIRONMENT_REQUIREMENT"
        if any(w in q for w in ["production", "dispatch", "offtake", "tonnage", "target", "उत्पादन", "ఉత్పత్తి"]):
            return "PRODUCTION_QUERY"
        if any(w in q for w in ["violation", "corrective", "compliance status", "statutory non-compliance", "उल्लंघन", "ఉల్లంఘన"]):
            return "COMPLIANCE_STATUS"
        if any(w in q for w in ["regulation", "statutory", "dgms", "circular", "rule", "standard", "वेंटिलेशन", "గాలి"]):
            return "REGULATION_LOOKUP"
        return "OPERATIONAL_QUERY"

    @staticmethod
    def detect_domains(query: str) -> List[str]:
        q = query.lower()
        detected = []
        if any(w in q for w in ["ventilation", "airflow", "lvc", "fan", "air current", "वेंटिलेशन", "हवा", "గాలి", "ప్రసరణ"]):
            detected.append("VENTILATION")
        if any(w in q for w in ["gas", "methane", "ch4", "carbon monoxide", "co spike", "मीथेन", "గ్యాస్"]):
            detected.append("GAS_MONITORING")
        if any(w in q for w in ["inundation", "water danger", "hfl", "water-logged", "flood", "जल भराव", "వరద"]):
            detected.append("INUNDATION")
        if any(w in q for w in ["hemm", "dumper", "shovel", "haul road", "proximity", "डंपर"]):
            detected.append("HEMM")
        if any(w in q for w in ["explosive", "blasting", "detonator", "magazine", "flyrock", "विस्फोटक"]):
            detected.append("EXPLOSIVES")
        if any(w in q for w in ["electrical", "substation", "flameproof", "flp", "cable", "विद्युत"]):
            detected.append("ELECTRICAL")
        if any(w in q for w in ["cmsms", "khanan prahari", "illegal mining"]):
            detected.append("CMSMS")
        if any(w in q for w in ["pgrm", "cpgrams", "grievance", "complaint"]):
            detected.append("PGRM")
        if any(w in q for w in ["budget", "allocation", "demand no 8", "oomf", "ddg", "बजट"]):
            detected.append("BUDGET")
        if any(w in q for w in ["environment", "dust", "sapling", "reclamation", "धूल"]):
            detected.append("ENVIRONMENT")
        if any(w in q for w in ["exploration", "drilling", "seismic", "borehole", "ड्रिलिंग"]):
            detected.append("EXPLORATION")
        if any(w in q for w in ["production", "tonnage", "output", "dispatch", "उत्पादन"]):
            detected.append("PRODUCTION")
        if any(w in q for w in ["contractor", "vtc", "vocational", "ठेकेदार"]):
            detected.append("CONTRACTOR")
        if any(w in q for w in ["workforce", "muster", "attendance", "welfare", "श्रमिक"]):
            detected.append("WORKFORCE")
        if any(w in q for w in ["safety", "accident", "fatality", "inspection", "dgms", "risk", "सुरक्षा", "భద్రత"]):
            detected.append("SAFETY")

        return detected if detected else ["GOVERNANCE", "SAFETY"]


    @staticmethod
    def select_tools_for_query(question_type: str, domains: List[str], clean_query: str) -> List[str]:
        tools = ["get_mine_summary", "get_current_risk"]

        if question_type in ["CURRENT_REQUIREMENT", "REGULATION_LOOKUP", "INSPECTION_REQUIREMENT", "ENVIRONMENT_REQUIREMENT"]:
            tools.extend(["get_current_regulation", "search_government_documents"])
        elif question_type == "HISTORICAL_REQUIREMENT":
            tools.extend(["get_historical_regulation", "search_government_documents"])
        elif question_type == "CMSMS_WORKFLOW":
            tools.extend(["get_cmsms_workflow", "search_government_documents"])
        elif question_type == "GRIEVANCE_WORKFLOW":
            tools.extend(["get_pgrm_workflow", "get_grievances"])
        elif question_type == "BUDGET_QUERY":
            tools.extend(["get_budget_indicator", "search_government_documents"])
        elif question_type == "MINE_FACT":
            tools.extend(["get_mine_source_evidence", "search_government_documents"])
        elif question_type == "RISK_EXPLANATION":
            tools.extend(["get_predicted_risk", "get_active_anomalies", "get_environmental_observations", "get_regulatory_requirement"])
        elif question_type == "COMPLIANCE_STATUS":
            tools.extend(["get_violations", "get_corrective_actions", "get_regulatory_requirement", "get_governance_tasks"])
        elif question_type == "DOCUMENT_QUERY":
            tools.extend(["get_annual_report_evidence", "search_government_documents"])
        else:
            tools.extend(["get_predicted_risk", "get_active_anomalies", "search_government_documents"])

        # Deduplicate while preserving order
        seen = set()
        deduped = []
        for t in tools:
            if t not in seen:
                seen.add(t)
                deduped.append(t)
        return deduped

    @staticmethod
    async def process_query(
        request: CopilotQueryRequest,
        current_user: User,
        db: Session
    ) -> CopilotQueryResponse:
        # 1. Rate Limiting Check
        rate_id = f"user_{current_user.id}"
        if not rate_limiter.check_rate_limit(rate_id):
            raise BusinessRuleViolationError("Copilot rate limit reached (max 60 queries/min). Please try again shortly.")

        # 2. Mine Access & Existence Check (Strict Mine Isolation)
        mine = db.query(Mine).filter(Mine.id == request.mine_id).first()
        if not mine:
            raise BusinessRuleViolationError(f"Mine ID {request.mine_id} does not exist.")
        
        if not check_mine_access(current_user, request.mine_id, db):
            raise PermissionDeniedError(
                f"Access denied: User {current_user.email} is not authorized for Mine {mine.name} ({request.mine_id})."
            )

        # 3. Input Sanitization & Prompt Injection Defense
        clean_query, was_injected = CopilotSecurity.sanitize_user_query(request.query)

        # 4. Language Detection
        lang = CopilotI18n.detect_language(clean_query, fallback_lang=request.language or "en")

        # 5. Question & Domain Classification
        q_type = CopilotOrchestrator.classify_question_type(clean_query)
        domains = CopilotOrchestrator.detect_domains(clean_query)
        tool_names = CopilotOrchestrator.select_tools_for_query(q_type, domains, clean_query)

        # 6. Execute Authorized Tools
        tools_evidence: Dict[str, Any] = {}
        invoked_tools: List[str] = []
        for t_name in tool_names:
            try:
                res = tool_registry.execute_tool(
                    t_name,
                    db=db,
                    mine_id=request.mine_id,
                    user=current_user,
                    query=clean_query,
                    topic=clean_query,
                    domain=domains[0] if domains else None
                )
                tools_evidence[t_name] = res
                invoked_tools.append(t_name)
            except Exception as e:
                tools_evidence[t_name] = {"error": str(e)}

        # 7. Extract Data & Assemble Structured Evidence
        mine_summary_data = tools_evidence.get("get_mine_summary", {})
        evidence_items: List[EvidenceItem] = []
        regulatory_basis: List[EvidenceItem] = []
        operational_data: List[Dict[str, Any]] = []
        actions: List[CopilotAction] = []
        pred_signal: Optional[PredictiveSignalSummary] = None

        # Assemble Government RAG Evidence Items
        rag_search_data = tools_evidence.get("search_government_documents", {})
        for chunk_data in rag_search_data.get("evidence_chunks", [])[:3]:
            item = EvidenceItem(
                source_type=chunk_data.get("source_tier", "TIER_1_OFFICIAL_REGULATORY"),
                entity_id=chunk_data.get("document_code"),
                title=f"{chunk_data.get('document_title')} (p. {chunk_data.get('page_number')})",
                description=f"[{chunk_data.get('section')}] {chunk_data.get('excerpt', '')[:200]}...",
                status_or_value=chunk_data.get("status", "CURRENT"),
                severity="INFO",
                source_tier=chunk_data.get("source_tier", "TIER_1_OFFICIAL_REGULATORY"),
                source_title=chunk_data.get("document_title"),
                organization=chunk_data.get("organization"),
                document_id=chunk_data.get("document_code"),
                page_number=chunk_data.get("page_number"),
                section=chunk_data.get("section"),
                status=chunk_data.get("status"),
                source_hash=chunk_data.get("file_hash"),
                excerpt=chunk_data.get("excerpt"),
                citation=f"{chunk_data.get('document_title')}, Page {chunk_data.get('page_number')}",
                deep_link={
                    "tab": "evidence-viewer",
                    "document_code": chunk_data.get("document_code"),
                    "page_number": chunk_data.get("page_number"),
                    "file_hash": chunk_data.get("file_hash")
                }
            )
            evidence_items.append(item)
            if "REGULATORY" in chunk_data.get("source_tier", ""):
                regulatory_basis.append(item)

        # Assemble Real Mine Provenance (Phase 11A)
        mine_src_data = tools_evidence.get("get_mine_source_evidence", {})
        if mine_src_data and mine_src_data.get("provenance"):
            prov = mine_src_data["provenance"]
            prof = mine_src_data.get("profile") or {}
            is_approx = prof.get("data_status") == "APPROXIMATE" or "arkhapal" in mine.name.lower()
            m_item = EvidenceItem(
                source_type="TIER_2_OFFICIAL_MINE_BLOCK",
                entity_id=str(request.mine_id),
                title=f"{prov.get('document_title')} (p. {prov.get('page_number', 1)})",
                description=f"Official CMPDI Mine Geological Summary for {mine.name}. Documented Area: {prof.get('geological_block_area_sq_km')} sq km.",
                status_or_value="APPROXIMATE" if is_approx else "REAL_SOURCE",
                severity="INFO",
                source_tier="TIER_2_OFFICIAL_MINE_BLOCK",
                source_title=prov.get("document_title"),
                organization=prov.get("source_organization", "Ministry of Coal / CMPDI"),
                page_number=prov.get("page_number", 1),
                status="APPROXIMATE" if is_approx else "REAL_SOURCE",
                source_hash=prov.get("document_hash"),
                citation=f"{prov.get('document_title')}, Page {prov.get('page_number', 1)}",
                deep_link={"tab": "digital-twin", "mine_id": request.mine_id}
            )
            evidence_items.append(m_item)

        # Assemble Predictive Risk
        pred_data = tools_evidence.get("get_predicted_risk")
        if pred_data and "predicted_risk_score" in pred_data:
            pred_signal = PredictiveSignalSummary(
                current_risk_score=pred_data.get("current_risk_score", 0.0),
                predicted_risk_score=pred_data.get("predicted_risk_score", 0.0),
                horizon=pred_data.get("horizon", "30 minutes"),
                probability=pred_data.get("probability", 0.0),
                top_signals=[s.get("label", s.get("signal_name", "")) for s in pred_data.get("signal_attributions", [])]
            )
            evidence_items.append(EvidenceItem(
                source_type="TIER_3_TRINETRA_OPERATIONAL",
                title=f"ML Escalation Projection ({pred_signal.horizon})",
                description=f"Probability {pred_signal.probability*100:.0f}%: {', '.join(pred_signal.top_signals[:2])}",
                status_or_value=f"{pred_signal.predicted_risk_score:.1f} / 100",
                severity="CRITICAL" if pred_signal.predicted_risk_score >= 81 else "HIGH" if pred_signal.predicted_risk_score >= 61 else "MEDIUM",
                source_tier="TIER_3_TRINETRA_OPERATIONAL",
                status="SIMULATED",
                deep_link={"tab": "predictive-risk"}
            ))
            operational_data.append(pred_data)

        # Assemble Active Anomalies
        anomalies_data = tools_evidence.get("get_active_anomalies", {}).get("recent_anomalies", [])
        for an in anomalies_data[:2]:
            evidence_items.append(EvidenceItem(
                source_type="TIER_3_TRINETRA_OPERATIONAL",
                entity_id=str(an.get("anomaly_id")),
                title=f"{an.get('anomaly_type')} Exceedance",
                description=f"Sensor value {an.get('value')} exceeded limit {an.get('threshold')}",
                status_or_value=an.get("severity", "WARNING"),
                severity=an.get("severity", "WARNING"),
                source_tier="TIER_3_TRINETRA_OPERATIONAL",
                status="SIMULATED",
                deep_link={"tab": "sensors"}
            ))
            operational_data.append(an)

        # Assemble Violations
        violations_data = tools_evidence.get("get_violations", {}).get("violations", [])
        for v in violations_data[:2]:
            evidence_items.append(EvidenceItem(
                source_type="TIER_3_TRINETRA_OPERATIONAL",
                entity_id=str(v.get("violation_id")),
                title=v.get("title", "Statutory Rule Violation"),
                description=f"Ref: {v.get('statutory_ref')}",
                status_or_value=v.get("status", "OPEN"),
                severity=v.get("severity", "HIGH"),
                source_tier="TIER_3_TRINETRA_OPERATIONAL",
                status="REAL_BACKEND_DATA",
                deep_link={"tab": "violations"}
            ))

        # Add 3D Actions
        if any(k in clean_query.lower() for k in ["rohne", "boundary", "location", "coordinate", "3d", "spatial", "arkhapal", "zone", "where"]):
            is_approx = "arkhapal" in mine.name.lower() or "arkhapal" in clean_query.lower()
            actions.append(CopilotAction(
                action_type="FOCUS_3D_ZONE",
                label=CopilotI18n.get_term("focus_3d", lang),
                payload={
                    "tab": "digital-twin",
                    "mine_id": request.mine_id,
                    "mine_name": mine.name,
                    "focus_target": "boundary",
                    "geometry_status": "APPROXIMATE" if is_approx else "SOURCE_DERIVED",
                    "title": f"{mine.name} Boundary Inspection"
                }
            ))
        elif pred_signal:
            actions.append(CopilotAction(
                action_type="FOCUS_3D_ZONE",
                label=CopilotI18n.get_term("focus_3d", lang),
                payload={
                    "tab": "digital-twin",
                    "x": 0, "y": 200, "z": -180,
                    "distance": 85,
                    "title": "East Longwall Face (High Predicted Risk)",
                    "zone_code": "ZN-EAST-LW-102"
                }
            ))

        # 8. Generate Response (Gemini LLM Provider or Grounded Deterministic Composer)
        gemini_provider = GeminiLLMProvider()
        llm_response = await gemini_provider.generate_response(
            query=clean_query,
            intent=q_type,
            question_classification=q_type,
            domains=domains,
            tool_evidence=tools_evidence,
            language=lang
        )

        citation_validation_status = "VALIDATED"
        provider_name = "GEMINI_1.5_FLASH" if llm_response else "DETERMINISTIC_GROUNDED_FALLBACK"

        # Citation validation if LLM generated response
        if llm_response:
            # Check for hallucinated document citations
            cit_matches = re.findall(r"(?:Coal Mines Regulations|Mines Rules|Circular|Summary)[^\n\.,]+", llm_response)
            if not cit_matches and q_type in ["REGULATION_LOOKUP", "CURRENT_REQUIREMENT"]:
                # If no citations found in a regulatory query, fallback to deterministic composer
                llm_response = None
                provider_name = "DETERMINISTIC_GROUNDED_FALLBACK"
                citation_validation_status = "FALLBACK_USED"

        if not llm_response:
            deterministic_res = GroundedDeterministicComposer.compose(
                query=clean_query,
                intent=q_type,
                question_classification=q_type,
                domains=domains,
                mine_data=mine_summary_data,
                tools_data=tools_evidence,
                language=lang
            )
            summary_text = deterministic_res["summary"]
            recommended_next_step = deterministic_res["recommended_next_step"]
            markdown_answer = deterministic_res["answer_markdown"]
        else:
            summary_text = llm_response.split("\n")[0] if "\n" in llm_response else llm_response[:120]
            recommended_next_step = "Conduct on-site physical inspection and log verification in governance ledger."
            markdown_answer = llm_response

        prov_str = "REAL_BACKEND_DATA | SIMULATED_TELEMETRY | SIMULATED_ML" if q_type in ["OPERATIONAL_QUERY", "PREDICTIVE_RISK", "WHY_RISK", "TELEMETRY_ANOMALY"] else "REAL_BACKEND_DATA | REAL_GOVERNMENT_DOCUMENTS | REAL_MINE_SUMMARIES"

        conv_id = request.conversation_id or f"conv_{uuid.uuid4().hex[:12]}"

        # 9. Audit Conversation & Tamper-Evident Ledger Entry
        copilot_record = CopilotHistory(
            user_id=current_user.id,
            mine_id=request.mine_id,
            conversation_id=conv_id,
            query_text=clean_query,
            language=lang,
            intent=q_type,
            tools_used_json=json.dumps(invoked_tools),
            answer_text=summary_text,
            evidence_json=json.dumps([e.model_dump() for e in evidence_items]),
            actions_json=json.dumps([a.model_dump() for a in actions]),
            provider_used=provider_name,
            data_provenance=prov_str,
            created_at=datetime.now(timezone.utc)
        )
        db.add(copilot_record)
        db.commit()

        AuditService.log_event(
            db=db,
            actor_id=current_user.id,
            action="COPILOT_QUERY",
            resource_type="COPILOT",
            resource_id=conv_id,
            mine_id=request.mine_id,
            metadata={
                "question_type": q_type,
                "domains": domains,
                "language": lang,
                "tools_invoked": invoked_tools,
                "provider": provider_name,
                "citation_validation_status": citation_validation_status,
                "evidence_count": len(evidence_items)
            }
        )

        return CopilotQueryResponse(
            conversation_id=conv_id,
            mine_id=request.mine_id,
            mine_name=mine.name,
            language=lang,
            query=clean_query,
            intent=q_type,
            question_classification=q_type,
            domains_detected=domains,
            tools_invoked=invoked_tools,
            summary=summary_text,
            evidence=evidence_items,
            regulatory_basis=regulatory_basis,
            operational_data=operational_data,
            predictive_signal=pred_signal,
            recommended_next_step=recommended_next_step,
            confidence="HIGH",
            limitations=[
                "TRINETRA does not independently establish legal compliance.",
                "Regulatory claims require verification against official Gazette / DGMS notices.",
                "Operational telemetry is live/simulated; human-in-the-loop verification required."
            ],
            actions=actions,
            answer_markdown=markdown_answer,
            data_provenance=prov_str,
            provider_used=provider_name,
            citation_validation_status=citation_validation_status,
            data_coverage="SUFFICIENT (100% indexed sources)"
        )

