from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Signal(Base):
    __tablename__ = "signals"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    title = Column(String(500), nullable=False)
    category = Column(String(100), nullable=False)  # environmental, social, governance, ai_adoption, neutral, controversy
    sentiment = Column(String(50), nullable=True)  # positive, negative, neutral
    severity = Column(Float, default=0.0)  # 0-10
    date = Column(String(50), nullable=True)
    source = Column(String(500), nullable=True)
    explanation = Column(Text, nullable=True)
    confidence_score = Column(Float, default=0.5)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", back_populates="signals")
