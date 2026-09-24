from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Index, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base

class RiskPrediction(Base):
    __tablename__ = "risk_predictions"

    id = Column(Integer, primary_key=True, index=True)
    mine_id = Column(Integer, ForeignKey("mines.id", ondelete="CASCADE"), nullable=False, index=True)
    zone_id = Column(Integer, ForeignKey("mine_zones.id", ondelete="SET NULL"), nullable=True, index=True)
    level_id = Column(Integer, ForeignKey("mine_levels.id", ondelete="SET NULL"), nullable=True, index=True)
    
    prediction_timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    horizon_minutes = Column(Integer, default=30, nullable=False) # e.g. 15, 30, 60 minutes
    
    predicted_risk_score = Column(Float, nullable=False) # 0 to 100
    predicted_severity = Column(String(50), nullable=False) # LOW, MEDIUM, HIGH, CRITICAL
    probability = Column(Float, nullable=False) # Calibrated model probability (0.0 to 1.0)
    predicted_class = Column(Integer, default=0, nullable=False) # 0: Normal, 1: Escalation Likely
    current_risk_score = Column(Float, nullable=False) # Snapshot of current risk at inference time
    
    model_name = Column(String(100), default="TRINETRA-RiskGradientBoosting", nullable=False)
    model_version = Column(String(50), default="risk-escalation-v1.0", nullable=False)
    dataset_type = Column(String(50), default="SIMULATED_DEMO", nullable=False) # SIMULATED_DEMO or PRODUCTION
    
    feature_snapshot_json = Column(Text, nullable=False) # Snapshot of input features for reproducibility & audit
    explanation_json = Column(Text, nullable=False) # Top feature attributions & directional impact
    
    data_quality_score = Column(Float, default=1.0, nullable=False) # 0.0 - 1.0 feature completeness score
    data_quality_notes = Column(String(255), default="Full telemetry available (100% online sensors)", nullable=False)
    is_alert_generated = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Field Verification & Operational Tracking (MOBILE-15)
    field_verified = Column(Boolean, default=False, nullable=False, index=True)
    field_outcome = Column(String(50), nullable=True) # NO_ISSUE_OBSERVED, ISSUE_FOUND, REQUIRES_FURTHER_REVIEW
    field_notes = Column(Text, nullable=True)
    verified_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    verified_at = Column(DateTime, nullable=True)
    
    # Downstream Linkages
    related_task_id = Column(Integer, ForeignKey("governance_tasks.id", ondelete="SET NULL"), nullable=True, index=True)
    related_incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Evidence & GPS Context
    evidence_url = Column(String(255), nullable=True)
    evidence_file_name = Column(String(255), nullable=True)
    evidence_file_hash = Column(String(64), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_context = Column(String(255), nullable=True)

    mine = relationship("Mine")
    zone = relationship("MineZone")
    level = relationship("MineLevel")
    verified_by = relationship("User", foreign_keys=[verified_by_id])
    related_task = relationship("GovernanceTask", foreign_keys=[related_task_id])
    related_incident = relationship("Incident", foreign_keys=[related_incident_id])

Index("idx_risk_pred_mine_time", RiskPrediction.mine_id, RiskPrediction.prediction_timestamp)
Index("idx_risk_pred_zone_time", RiskPrediction.zone_id, RiskPrediction.prediction_timestamp)
Index("idx_risk_pred_verified", RiskPrediction.mine_id, RiskPrediction.field_verified)
