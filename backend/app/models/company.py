from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    ticker = Column(String(20), unique=True, nullable=True, index=True)
    exchange = Column(String(40), nullable=True, index=True)
    industry = Column(String(255), nullable=True)
    country = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    logo_url = Column(String(500), nullable=True)
    website_url = Column(String(500), nullable=True)
    executive_name = Column(String(255), nullable=True)
    executive_url = Column(String(500), nullable=True)
    market_cap = Column(String(50), nullable=True)

    reports = relationship("Report", back_populates="company", cascade="all, delete-orphan")
    evidences = relationship("Evidence", back_populates="company", cascade="all, delete-orphan")
    esg_metrics = relationship("ESGMetric", back_populates="company", cascade="all, delete-orphan")
    signals = relationship("Signal", back_populates="company", cascade="all, delete-orphan")
    score_snapshots = relationship("ScoreSnapshot", back_populates="company", cascade="all, delete-orphan")
