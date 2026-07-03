from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ScoreSnapshot(Base):
    __tablename__ = "score_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    current_esg_score = Column(Float, nullable=False)
    momentum_score = Column(Float, nullable=False)
    ai_adoption_score = Column(Float, nullable=False)
    controversy_risk = Column(Float, nullable=False)
    confidence_score = Column(Float, nullable=False)
    environmental_score = Column(Float, nullable=True)
    social_score = Column(Float, nullable=True)
    governance_score = Column(Float, nullable=True)
    classification = Column(String(100), nullable=False)  # Hidden Winner, Future Leader, etc.
    investor_signal = Column(String(100), nullable=False)  # Buy/Watchlist, Hold, Risk Alert, Avoid
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", back_populates="score_snapshots")
