import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from app.services.government_rag_service import government_rag_service

logger = logging.getLogger(__name__)

class EvaluationItem(BaseModel):
    id: int
    category: str  # Government, DGMS, CMSMS, PGRM, Annual Report, Budget, Real Mine, Operational+Regulatory
    question: str
    expected_source: str
    expected_page: Optional[int] = None
    expected_domain: str
    expected_status: str
    expected_behavior: str

# 30-Question Authoritative Evaluation Dataset
EVALUATION_DATASET: List[EvaluationItem] = [
    # --- Category 1: Government (5 Questions) ---
    EvaluationItem(
        id=1,
        category="Government",
        question="What is the current regulatory framework for coal mine safety in India?",
        expected_source="Coal Mines Regulations, 2017",
        expected_page=1,
        expected_domain="SAFETY",
        expected_status="CURRENT_RELEVANT_REGULATION",
        expected_behavior="Must cite Coal Mines Regulations 2017 as active framework with DGMS provenance."
    ),
    EvaluationItem(
        id=2,
        category="Government",
        question="What was the historical scope of the Mines Rules 1955 before modern statutory updates?",
        expected_source="Mines Rules, 1955",
        expected_page=1,
        expected_domain="GOVERNANCE",
        expected_status="HISTORICAL",
        expected_behavior="Must retrieve Mines Rules 1955 and explicitly flag it as HISTORICAL / SUPERSEDED."
    ),
    EvaluationItem(
        id=3,
        category="Government",
        question="What are the statutory guidelines for electronic detonators and blasting security?",
        expected_source="DGMS Safety Circular 06 - Explosives and Blasting Precautions",
        expected_page=1,
        expected_domain="EXPLOSIVES",
        expected_status="CURRENT",
        expected_behavior="Must cite DGMS explosive safety circular with safe storage and flyrock precautions."
    ),
    EvaluationItem(
        id=4,
        category="Government",
        question="What are the vocational training and PPE requirements for contractual mine workers?",
        expected_source="DGMS Circular 07 - Contractor Worker Competency & Safety Induction",
        expected_page=1,
        expected_domain="CONTRACTOR",
        expected_status="CURRENT",
        expected_behavior="Must cite mandatory VTC induction and safety passport issuance."
    ),
    EvaluationItem(
        id=5,
        category="Government",
        question="What are the statutory requirements for digital records and shift registers under DGMS?",
        expected_source="DGMS Circular No. 06 of 2026 - Digital Records & Statutory Registers",
        expected_page=1,
        expected_domain="STATUTORY_REPORTING",
        expected_status="CURRENT",
        expected_behavior="Must cite digital register mandate and electronic sign-offs."
    ),

    # --- Category 2: DGMS (5 Questions) ---
    EvaluationItem(
        id=6,
        category="DGMS",
        question="What is the mandatory air quantity standard for underground coal mines?",
        expected_source="DGMS Technical Circular 2 of 2025 - Ventilation in Coal Mines",
        expected_page=1,
        expected_domain="VENTILATION",
        expected_status="CURRENT",
        expected_behavior="Must cite 6.0 m³/min per person or 2.5 m³/min per daily tonne output."
    ),
    EvaluationItem(
        id=7,
        category="DGMS",
        question="What are the statutory auxiliary fan placement rules and methane interlock cut-off thresholds?",
        expected_source="DGMS Technical Circular 2 of 2025 - Ventilation in Coal Mines",
        expected_page=2,
        expected_domain="VENTILATION",
        expected_status="CURRENT",
        expected_behavior="Must cite 4.5m inbye intake placement and 1.25% CH4 electrical cut-off."
    ),
    EvaluationItem(
        id=8,
        category="DGMS",
        question="What are the precautionary measures mandated by DGMS against inundation and surface water danger?",
        expected_source="DGMS Safety Circular on Inundation and Water Danger Management",
        expected_page=1,
        expected_domain="INUNDATION",
        expected_status="CURRENT",
        expected_behavior="Must cite Standing Committee on Inundation before June 15th and HFL marking."
    ),
    EvaluationItem(
        id=9,
        category="DGMS",
        question="What barrier thickness is required when approaching water-logged underground workings?",
        expected_source="DGMS Safety Circular on Inundation and Water Danger Management",
        expected_page=2,
        expected_domain="INUNDATION",
        expected_status="CURRENT",
        expected_behavior="Must cite Regulation 149 barrier requirement of 60 meters and pilot advance boreholes."
    ),
    EvaluationItem(
        id=10,
        category="DGMS",
        question="What safety systems and proximity warning standards are required on heavy dumpers and shovels?",
        expected_source="DGMS Circular No. 07 of 2026 - Standard Heavy Earth Moving Machinery (HEMM) Safety",
        expected_page=1,
        expected_domain="HEMM",
        expected_status="CURRENT",
        expected_behavior="Must cite Proximity Warning System (PWS) 30m detection and 360-degree cameras."
    ),

    # --- Category 3: CMSMS / Khanan Prahari (3 Questions) ---
    EvaluationItem(
        id=11,
        category="CMSMS",
        question="How does a citizen report suspected illegal coal mining using the Khanan Prahari mobile app?",
        expected_source="Coal Mine Surveillance & Management System (CMSMS) and Khanan Prahari Mobile App SOP",
        expected_page=2,
        expected_domain="CMSMS",
        expected_status="CURRENT",
        expected_behavior="Must cite citizen upload of geo-tagged photographs and coordinates via mobile app."
    ),
    EvaluationItem(
        id=12,
        category="CMSMS",
        question="What is the nodal officer routing and satellite GIS verification workflow in CMSMS?",
        expected_source="Coal Mine Surveillance & Management System (CMSMS) and Khanan Prahari Mobile App SOP",
        expected_page=2,
        expected_domain="CMSMS",
        expected_status="CURRENT",
        expected_behavior="Must cite automatic lease boundary overlay and ground dispatch to Colliery Nodal Officer."
    ),
    EvaluationItem(
        id=13,
        category="CMSMS",
        question="What field investigation actions accompany a verified CMSMS illegal mining alert?",
        expected_source="Coal Mine Surveillance & Management System (CMSMS) and Khanan Prahari Mobile App SOP",
        expected_page=5,
        expected_domain="CMSMS",
        expected_status="CURRENT",
        expected_behavior="Must cite field inquiry, photographic compliance upload, and mock adapter note."
    ),

    # --- Category 4: PGRM (3 Questions) ---
    EvaluationItem(
        id=14,
        category="PGRM",
        question="How is a public grievance lodged and routed under the Ministry of Coal Public Grievance Cell?",
        expected_source="Public Grievances Redressal Mechanism (PGRM) SOP & Citizen Charter",
        expected_page=1,
        expected_domain="PGRM",
        expected_status="CURRENT",
        expected_behavior="Must cite CPGRAMS portal (pgportal.gov.in) and 2-day routing to PSU Nodal Officer."
    ),
    EvaluationItem(
        id=15,
        category="PGRM",
        question="What is the mandatory statutory SLA timeline for resolving public grievances under PGRM?",
        expected_source="Public Grievances Redressal Mechanism (PGRM) SOP & Citizen Charter",
        expected_page=3,
        expected_domain="PGRM",
        expected_status="CURRENT",
        expected_behavior="Must cite maximum 30 days resolution deadline and 15 days interim reply."
    ),
    EvaluationItem(
        id=16,
        category="PGRM",
        question="What appellate escalation mechanism exists if a citizen is dissatisfied with a grievance disposal?",
        expected_source="Public Grievances Redressal Mechanism (PGRM) SOP & Citizen Charter",
        expected_page=4,
        expected_domain="PGRM",
        expected_status="CURRENT",
        expected_behavior="Must cite appeal to Designated Appellate Authority (Joint Secretary) within 30 days."
    ),

    # --- Category 5: Annual Report (3 Questions) ---
    EvaluationItem(
        id=17,
        category="Annual Report",
        question="What safety and risk assessment initiatives are reported in Annual Report Chapter 14?",
        expected_source="Annual Report 2025-26: Chapter 14 - Safety in Coal Mines",
        expected_page=1,
        expected_domain="SAFETY",
        expected_status="CURRENT",
        expected_behavior="Must cite national safety audits, SMP implementation, and fatality rate reductions."
    ),
    EvaluationItem(
        id=18,
        category="Annual Report",
        question="What sustainable development and eco-restoration activities are reported in Chapter 7?",
        expected_source="Annual Report 2025-26: Chapter 7 - Sustainability in Coal Mines",
        expected_page=1,
        expected_domain="ENVIRONMENT",
        expected_status="CURRENT",
        expected_behavior="Must cite bio-reclamation, solar installation, and mine water supply to local communities."
    ),
    EvaluationItem(
        id=19,
        category="Annual Report",
        question="What exploration drilling programs by CMPDI and MECL are reported in Chapter 12?",
        expected_source="Annual Report 2025-26: Chapter 12 - Promotional and Detailed Exploration",
        expected_page=1,
        expected_domain="EXPLORATION",
        expected_status="CURRENT",
        expected_behavior="Must cite promotional drilling across non-CIL and commercial coal blocks."
    ),

    # --- Category 6: Budget 2026-27 (3 Questions) ---
    EvaluationItem(
        id=20,
        category="Budget",
        question="What is the budgetary allocation for Promotional & Detailed Exploration under Demand No. 8 for FY 2026-27?",
        expected_source="Ministry of Coal Detailed Demands for Grants (DDG) 2026-27",
        expected_page=5,
        expected_domain="BUDGET",
        expected_status="CURRENT",
        expected_behavior="Must cite Rs 350.00 Crore allocation for promotional and detailed coal exploration."
    ),
    EvaluationItem(
        id=21,
        category="Budget",
        question="What are the quantifiable drilling meterage targets in Output-Outcome Monitoring Framework 2026-27?",
        expected_source="Ministry of Coal Output-Outcome Monitoring Framework (OOMF) 2026-27",
        expected_page=2,
        expected_domain="BUDGET",
        expected_status="CURRENT",
        expected_behavior="Must cite 5.50 Lakh meters target output for exploration drilling."
    ),
    EvaluationItem(
        id=22,
        category="Budget",
        question="What allocation and target output are provided for Clean Coal R&D and CCUS in Budget 2026-27?",
        expected_source="Ministry of Coal Detailed Demands for Grants (DDG) 2026-27",
        expected_page=12,
        expected_domain="BUDGET",
        expected_status="CURRENT",
        expected_behavior="Must cite Rs 65.00 Crore R&D grant for 14 S&T projects including CCUS & UCG."
    ),

    # --- Category 7: Real Mine Documents (5 Questions) ---
    EvaluationItem(
        id=23,
        category="Real Mine",
        question="What is the documented geological block area and coalfield of Rohne Coal Block?",
        expected_source="Summary of Rohne Coal Block (Mine Summary 69)",
        expected_page=1,
        expected_domain="EXPLORATION",
        expected_status="REAL_SOURCE",
        expected_behavior="Must cite 4.90 sq km block area in North Karanpura Coalfield, Jharkhand."
    ),
    EvaluationItem(
        id=24,
        category="Real Mine",
        question="What is the documented geological block area and reserve for Jogeshwar Coal Block?",
        expected_source="Summary of Jogeshwar & Khas Jogeshwar Coal Block (Mine Summary 67)",
        expected_page=1,
        expected_domain="EXPLORATION",
        expected_status="REAL_SOURCE",
        expected_behavior="Must cite 3.79 sq km area and 84.03 MT geological reserve in West Bokaro Coalfield."
    ),
    EvaluationItem(
        id=25,
        category="Real Mine",
        question="What does the Choritand Tilaya source document state regarding geological reserve?",
        expected_source="Summary of Choritand Tilaya Coal Block (Mine Summary 66)",
        expected_page=1,
        expected_domain="EXPLORATION",
        expected_status="REAL_SOURCE",
        expected_behavior="Must cite 101.40 MT geological reserve and 1.35 sq km area."
    ),
    EvaluationItem(
        id=26,
        category="Real Mine",
        question="What are the documented geological area and coalfield for Rabodh Coal Block?",
        expected_source="Summary of Rabodh Coal Block (Mine Summary 68)",
        expected_page=1,
        expected_domain="EXPLORATION",
        expected_status="REAL_SOURCE",
        expected_behavior="Must cite 3.44 sq km area and 133.45 MT reserve in West Bokaro Coalfield."
    ),
    EvaluationItem(
        id=27,
        category="Real Mine",
        question="What is the documented status and block area of North of Arkhapal Srirampur Coal Block?",
        expected_source="Summary of North of Arkhapal Srirampur Coal Block (Northern Part) (Mine Summary 71)",
        expected_page=1,
        expected_domain="EXPLORATION",
        expected_status="APPROXIMATE",
        expected_behavior="Must explicitly preserve APPROXIMATE geometry status with 9.60 sq km area."
    ),

    # --- Category 8: Operational + Regulatory Cross-Reference (3 Questions) ---
    EvaluationItem(
        id=28,
        category="Operational+Regulatory",
        question="Zone 3 has an elevated methane anomaly reading. What statutory DGMS standard should be verified?",
        expected_source="Coal Mines Regulations, 2017 / DGMS Ventilation Standards",
        expected_page=42,
        expected_domain="VENTILATION",
        expected_status="CURRENT_RELEVANT_REGULATION",
        expected_behavior="Must cross-reference methane anomaly with Regulation 153/Tech Circular 2 of 2025 and recommend human inspection."
    ),

    EvaluationItem(
        id=29,
        category="Operational+Regulatory",
        question="Why is East Longwall Face projecting critical predictive risk escalation in the next 30 minutes?",
        expected_source="Coal Mines Regulations, 2017",
        expected_page=42,
        expected_domain="SAFETY",
        expected_status="CURRENT_RELEVANT_REGULATION",
        expected_behavior="Must combine ML risk score with statutory ventilation standards and generate 3D focus action."
    ),
    EvaluationItem(
        id=30,
        category="Operational+Regulatory",
        question="What action should the mine safety manager verify regarding open ventilation violations?",
        expected_source="Coal Mines Regulations, 2017",
        expected_page=42,
        expected_domain="SAFETY",
        expected_status="CURRENT_RELEVANT_REGULATION",
        expected_behavior="Must recommend physical verification by certified officer without auto-declaring legal non-compliance."
    ),
]


class EvaluationResult(BaseModel):
    total_questions: int
    passed_count: int
    failed_count: int
    pass_rate_percentage: float
    retrieval_success_rate: float
    citation_correctness_rate: float
    temporal_correctness_rate: float
    results: List[Dict[str, Any]]


class Evaluator:
    @staticmethod
    def run_evaluations() -> EvaluationResult:
        rag = government_rag_service
        rag.initialize()

        results_list = []
        retrieval_passed = 0
        citation_passed = 0
        temporal_passed = 0
        overall_passed = 0

        for item in EVALUATION_DATASET:
            # Perform RAG retrieval
            is_hist = item.expected_status in ["HISTORICAL", "SUPERSEDED"]
            search_res = rag.search(
                query=item.question,
                domain=item.expected_domain,
                temporal_mode="HISTORICAL_ALLOWED" if is_hist else "CURRENT_ONLY",
                top_k=3
            )

            retrieval_ok = False
            citation_ok = False
            temporal_ok = False
            top_match_title = ""
            top_match_page = None
            top_match_status = ""

            if search_res:
                top_chunk, score = search_res[0]
                top_match_title = top_chunk.document_title
                top_match_page = top_chunk.page_number
                top_match_status = top_chunk.source_status

                # 1. Retrieval check (check if expected source keywords match top chunk)
                exp_key = item.expected_source.lower()
                top_key = top_chunk.document_title.lower()
                if any(w in top_key for w in exp_key.split()[:3]) or exp_key in top_key:
                    retrieval_ok = True
                    retrieval_passed += 1

                # 2. Citation validity check
                if rag.validate_citation(top_chunk.document_code, top_chunk.page_number, top_chunk.file_hash):
                    citation_ok = True
                    citation_passed += 1

                # 3. Temporal validity check
                if is_hist and top_chunk.source_status in ["HISTORICAL", "SUPERSEDED"]:
                    temporal_ok = True
                    temporal_passed += 1
                elif not is_hist and "CURRENT" in top_chunk.source_status or top_chunk.source_status in ["REAL_SOURCE", "APPROXIMATE"]:
                    temporal_ok = True
                    temporal_passed += 1

            passed = retrieval_ok and citation_ok and temporal_ok
            if passed:
                overall_passed += 1

            results_list.append({
                "id": item.id,
                "category": item.category,
                "question": item.question,
                "expected_source": item.expected_source,
                "retrieved_source": top_match_title,
                "retrieved_page": top_match_page,
                "retrieved_status": top_match_status,
                "retrieval_ok": retrieval_ok,
                "citation_ok": citation_ok,
                "temporal_ok": temporal_ok,
                "passed": passed
            })

        total = len(EVALUATION_DATASET)
        return EvaluationResult(
            total_questions=total,
            passed_count=overall_passed,
            failed_count=total - overall_passed,
            pass_rate_percentage=round((overall_passed / total) * 100, 2),
            retrieval_success_rate=round((retrieval_passed / total) * 100, 2),
            citation_correctness_rate=round((citation_passed / total) * 100, 2),
            temporal_correctness_rate=round((temporal_passed / total) * 100, 2),
            results=results_list
        )


if __name__ == "__main__":
    res = Evaluator.run_evaluations()
    print(f"=== TRINETRA Phase 11C Evaluation Results ===")
    print(f"Total Questions: {res.total_questions}")
    print(f"Passed: {res.passed_count}/{res.total_questions} ({res.pass_rate_percentage}%)")
    print(f"Retrieval Success: {res.retrieval_success_rate}%")
    print(f"Citation Correctness: {res.citation_correctness_rate}%")
    print(f"Temporal Correctness: {res.temporal_correctness_rate}%")
