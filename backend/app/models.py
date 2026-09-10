"""PostgreSQL source-of-truth models for extracted IIS facts."""
from sqlalchemy import BigInteger, Column, Float, ForeignKey, Integer, String, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship as orm_relationship

from app.database import Base


class Case(Base):
    __tablename__ = "cases"
    id = Column(String(64), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(String)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    entities = orm_relationship("Entity", back_populates="case", cascade="all, delete-orphan")
    relationships_ = orm_relationship("Relationship", back_populates="case", cascade="all, delete-orphan")


class Entity(Base):
    __tablename__ = "entities"
    entity_id = Column(String(128), primary_key=True)
    case_id = Column(String(64), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(64), nullable=False, index=True)
    label = Column(String(255), nullable=False)
    attributes = Column(JSONB, nullable=False, server_default="{}")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    case = orm_relationship("Case", back_populates="entities")


class Relationship(Base):
    __tablename__ = "relationships"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    case_id = Column(String(64), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(String(128), ForeignKey("entities.entity_id", ondelete="CASCADE"), nullable=False, index=True)
    target_id = Column(String(128), ForeignKey("entities.entity_id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(64), nullable=False, index=True)
    weight = Column(Integer, nullable=False, default=1)
    confidence = Column(Float, nullable=False, default=1.0)
    observed_at = Column(TIMESTAMP(timezone=True), index=True)
    attributes = Column(JSONB, nullable=False, server_default="{}")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    case = orm_relationship("Case", back_populates="relationships_")
