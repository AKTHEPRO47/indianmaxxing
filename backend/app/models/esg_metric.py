from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ESGMetric(Base):
    __tablename__ = "esg_metrics"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=True)
    metric_name = Column(String(255), nullable=False)
    pillar = Column(String(50), nullable=False)  # environmental, social, governance
    value = Column(Float, nullable=True)
    unit = Column(String(100), nullable=True)
    year = Column(Integer, nullable=True)
    confidence_score = Column(Float, default=0.5)
    evidence_id = Column(Integer, ForeignKey("evidences.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", back_populates="esg_metrics")
    evidence = relationship("Evidence", back_populates="esg_metrics")
