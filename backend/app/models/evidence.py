from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Evidence(Base):
    __tablename__ = "evidences"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=True)
    source_type = Column(String(100), nullable=False)  # pdf, news, api, manual
    source_name = Column(String(500), nullable=True)
    source_date = Column(String(50), nullable=True)
    page_number = Column(Integer, nullable=True)
    url = Column(String(1000), nullable=True)
    evidence_text = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)  # environmental, social, governance, ai_adoption
    confidence_score = Column(Float, default=0.5)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", back_populates="evidences")
    report = relationship("Report")
    esg_metrics = relationship("ESGMetric", back_populates="evidence")
