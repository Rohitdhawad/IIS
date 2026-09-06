"""
SQLAlchemy ORM models -- 5 tables, per the reviewed Part 2 architecture:
    cases, entities, relationships, phase_summaries, entity_phase_metrics

Design principle (per SCHEMA.md): entities/relationships are generic and
typed so future entity types (Vehicle, Phone, Location, ...) slot in
without altering this schema.

Terminology note: nothing in entity_phase_metrics represents a guilt or
suspicion judgment. betweenness / is_bridge_candidate / reasons describe
STRUCTURAL position in observed communication data only.
"""
from sqlalchemy import (
    Column, String, Integer, BigInteger, Float, Boolean,
    ForeignKey, TIMESTAMP, func,
)
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
    phase_summaries = orm_relationship("PhaseSummary", back_populates="case", cascade="all, delete-orphan")
    entity_phase_metrics = orm_relationship("EntityPhaseMetric", back_populates="case", cascade="all, delete-orphan")


class Entity(Base):
    __tablename__ = "entities"

    entity_id = Column(String(64), primary_key=True)          # e.g. "P1"
    case_id = Column(String(64), ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    type = Column(String(64), nullable=False, index=True)     # "Person", "Vehicle", ...
    label = Column(String(255), nullable=False)                # "Actor 1"
    raw_actor_id = Column(String(64))                           # "1"
    attributes = Column(JSONB, server_default="{}")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    case = orm_relationship("Case", back_populates="entities")


class Relationship(Base):
    __tablename__ = "relationships"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    case_id = Column(String(64), ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    source_id = Column(String(64), ForeignKey("entities.entity_id", ondelete="CASCADE"), nullable=False, index=True)
    target_id = Column(String(64), ForeignKey("entities.entity_id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(64), nullable=False, index=True)      # "CALLED", "OWNS", ...
    weight = Column(Integer, nullable=False, default=1)          # e.g. call count
    phase = Column(Integer, index=True)                          # 1..11
    attributes = Column(JSONB, server_default="{}")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    case = orm_relationship("Case", back_populates="relationships_")


class PhaseSummary(Base):
    __tablename__ = "phase_summaries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String(64), ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    phase = Column(Integer, nullable=False, index=True)
    num_actors = Column(Integer, nullable=False)
    num_calls = Column(Integer, nullable=False)
    num_communities = Column(Integer, nullable=False)
    bridge_entities = Column(JSONB, nullable=False, server_default="[]")  # ordered by centrality
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    case = orm_relationship("Case", back_populates="phase_summaries")


class EntityPhaseMetric(Base):
    __tablename__ = "entity_phase_metrics"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    case_id = Column(String(64), ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    phase = Column(Integer, nullable=False, index=True)
    entity_id = Column(String(64), ForeignKey("entities.entity_id", ondelete="CASCADE"), nullable=False, index=True)

    degree = Column(Integer, nullable=False)               # distinct contacts
    degree_weighted = Column(Integer, nullable=False)      # total call volume
    betweenness = Column(Float, nullable=False)             # unweighted betweenness centrality
    num_communities_touched = Column(Integer, nullable=False)
    is_bridge_candidate = Column(Boolean, nullable=False)
    bridged_communities = Column(JSONB, nullable=False, server_default="[]")
    reasons = Column(JSONB, nullable=False, server_default="[]")
    evidence = Column(JSONB, nullable=False, server_default="{}")   # {"outgoing_calls":[...], "incoming_calls":[...]}
    rank = Column(Integer, nullable=False)                  # 1..N within phase, ALL entities ranked (not just top-K)

    case = orm_relationship("Case", back_populates="entity_phase_metrics")
