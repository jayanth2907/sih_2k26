from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
from sqlalchemy.orm import Session

from app.models.mine import Mine
from app.models.contractor import Contractor, Contract, ContractRequirement
from app.models.governance_task import GovernanceTask
from app.schemas.analytics import (
    TimeRangeEnum,
    TimeRangeDTO,
    DataQualityDTO,
    ContractorAnalyticsDTO,
    CategoryBreakdownDTO,
)
from app.services.analytics.time_utils import TimeRangeHelper


class ContractorAnalyticsService:
    @staticmethod
    def get_contractor_analytics(
        mine_id: int,
        db: Session,
        range_type: TimeRangeEnum = TimeRangeEnum.LAST_30_DAYS,
        custom_start: Optional[datetime] = None,
        custom_end: Optional[datetime] = None,
    ) -> ContractorAnalyticsDTO:
        mine = db.query(Mine).filter(Mine.id == mine_id).first()
        mine_name = mine.name if mine else f"Mine {mine_id}"
        is_sim = mine.is_simulated if mine else "NO"
        data_mode = "SIMULATED" if is_sim == "YES" else "OPERATIONAL"

        now = datetime.now(timezone.utc)
        today = now.date()
        tr = TimeRangeHelper.resolve_time_range(range_type, custom_start, custom_end, as_of=now)

        contracts = db.query(Contract).filter(Contract.mine_id == mine_id).all()
        contract_ids = [c.id for c in contracts]
        contractor_ids = list(set(c.contractor_id for c in contracts))

        active_contractors = db.query(Contractor).filter(
            Contractor.id.in_(contractor_ids),
            Contractor.status == "ACTIVE"
        ).count() if contractor_ids else 0

        total_contracts = len(contracts)
        active_contracts = sum(1 for c in contracts if c.status == "ACTIVE")
        expired_contracts = sum(1 for c in contracts if c.end_date < today or c.status == "EXPIRED")
        
        # Expiring within 30 days
        thirty_days_later = today + timedelta(days=30)
        expiring_soon = sum(1 for c in contracts if today <= c.end_date <= thirty_days_later and c.status == "ACTIVE")

        total_value = sum(c.total_value for c in contracts)

        # Requirements and deviations
        reqs = db.query(ContractRequirement).filter(ContractRequirement.contract_id.in_(contract_ids)).all() if contract_ids else []
        deviations_count = sum(1 for r in reqs if r.status in ["PENDING", "EXPIRED", "NOT_PROVIDED"])

        # Contractor-related governance tasks
        gov_tasks_count = db.query(GovernanceTask).filter(
            GovernanceTask.mine_id == mine_id,
            GovernanceTask.domain == "CONTRACTOR",
            GovernanceTask.created_at >= tr.start_time,
            GovernanceTask.created_at <= tr.end_time
        ).count()

        # Status breakdown
        status_map: Dict[str, List[int]] = {}
        for c in contracts:
            status_map.setdefault(c.status, []).append(c.id)

        by_status = [
            CategoryBreakdownDTO(
                category=k,
                count=len(v),
                percentage=round((len(v) / total_contracts * 100.0), 1) if total_contracts > 0 else 0.0,
                entity_type="CONTRACT",
                entity_ids=v
            )
            for k, v in status_map.items()
        ]

        data_quality = DataQualityDTO(
            record_count=total_contracts + len(reqs),
            missing_periods=[],
            data_mode=data_mode,
            is_simulated=is_sim,
            data_as_of=now,
            notes="Aggregated over active contracts, contractor compliance, and statutory filing checks."
        )

        return ContractorAnalyticsDTO(
            mine_id=mine_id,
            mine_name=mine_name,
            time_range=tr,
            data_as_of=now,
            data_quality=data_quality,
            active_contractors_count=active_contractors,
            total_contracts=total_contracts,
            active_contracts=active_contracts,
            expiring_soon_contracts=expiring_soon,
            expired_contracts=expired_contracts,
            total_contract_value=round(total_value, 2),
            requirement_deviations_count=deviations_count,
            contractor_governance_tasks=gov_tasks_count,
            contracts_by_status=by_status
        )
