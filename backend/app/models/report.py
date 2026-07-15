from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    file_name = Column(String(500), nullable=False)
    year = Column(Integer, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    extracted_text_path = Column(String(1000), nullable=True)
    page_count = Column(Integer, nullable=True)
    status = Column(String(50), default="pending")  # pending, processing, done, failed

    company = relationship("Company", back_populates="reports")
    owner = relationship("User", back_populates="reports")
