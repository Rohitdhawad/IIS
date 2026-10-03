"""PostgreSQL source-of-truth models for IIS."""

from sqlalchemy import (
    BigInteger,
    Column,
    Float,
    ForeignKey,
    Integer,
    String,
    TIMESTAMP,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship as orm_relationship

from app.database import Base


class Case(Base):
    __tablename__ = "cases"

    id = Column(String(64), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    entities = orm_relationship(
        "Entity",
        back_populates="case",
        cascade="all, delete-orphan",
    )

    relationships_ = orm_relationship(
        "Relationship",
        back_populates="case",
        cascade="all, delete-orphan",
    )

    evidence = orm_relationship(
        "Evidence",
        back_populates="case",
        cascade="all, delete-orphan",
    )

    graph_versions = orm_relationship(
        "GraphVersion",
        back_populates="case",
        cascade="all, delete-orphan",
        order_by="GraphVersion.version_number",
    )


class Evidence(Base):
    """
    A piece of source material uploaded to an investigation.
    """

    __tablename__ = "evidence"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    case_id = Column(
        String(64),
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    filename = Column(String(512), nullable=False)

    source_type = Column(
        String(64),
        nullable=False,
        index=True,
    )

    file_type = Column(String(32), nullable=False)

    storage_path = Column(String(1024), nullable=False)

    status = Column(
        String(32),
        nullable=False,
        default="uploaded",
        index=True,
    )

    metadata_json = Column(
        "metadata",
        JSONB,
        nullable=False,
        server_default="{}",
    )

    uploaded_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    case = orm_relationship(
        "Case",
        back_populates="evidence",
    )


class Entity(Base):
    __tablename__ = "entities"

    entity_id = Column(String(128), primary_key=True)

    case_id = Column(
        String(64),
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    type = Column(String(64), nullable=False, index=True)

    label = Column(String(255), nullable=False)

    attributes = Column(
        JSONB,
        nullable=False,
        server_default="{}",
    )

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
    )

    case = orm_relationship(
        "Case",
        back_populates="entities",
    )


class Relationship(Base):
    __tablename__ = "relationships"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    case_id = Column(
        String(64),
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    source_id = Column(
        String(128),
        ForeignKey("entities.entity_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    target_id = Column(
        String(128),
        ForeignKey("entities.entity_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    type = Column(
        String(64),
        nullable=False,
        index=True,
    )

    weight = Column(
        Integer,
        nullable=False,
        default=1,
    )

    confidence = Column(
        Float,
        nullable=False,
        default=1.0,
    )

    observed_at = Column(
        TIMESTAMP(timezone=True),
        index=True,
    )

    attributes = Column(
        JSONB,
        nullable=False,
        server_default="{}",
    )

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
    )

    case = orm_relationship(
        "Case",
        back_populates="relationships_",
    )


class EntityEvidence(Base):
    """
    Links an extracted entity to the evidence that supports it.
    """

    __tablename__ = "entity_evidence"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    entity_id = Column(
        String(128),
        ForeignKey(
            "entities.entity_id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    evidence_id = Column(
        BigInteger,
        ForeignKey(
            "evidence.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    source_text = Column(Text)

    extraction_confidence = Column(
        Float,
        nullable=False,
        default=1.0,
    )

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
    )


class RelationshipEvidence(Base):
    """
    Links an extracted relationship to the evidence that supports it.
    """

    __tablename__ = "relationship_evidence"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    relationship_id = Column(
        BigInteger,
        ForeignKey(
            "relationships.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    evidence_id = Column(
        BigInteger,
        ForeignKey(
            "evidence.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    source_text = Column(Text)

    extraction_confidence = Column(
        Float,
        nullable=False,
        default=1.0,
    )

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
    )


class GraphVersion(Base):
    """
    Immutable snapshot of an investigation graph.

    Each successful evidence analysis can create one version.
    The complete graph snapshot is stored so historical versions
    remain reproducible even after the live graph changes.
    """

    __tablename__ = "graph_versions"

    __table_args__ = (
        UniqueConstraint(
            "case_id",
            "version_number",
            name="uq_graph_versions_case_version",
        ),
    )

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    case_id = Column(
        String(64),
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    version_number = Column(
        Integer,
        nullable=False,
    )

    trigger_evidence_id = Column(
        BigInteger,
        ForeignKey("evidence.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    trigger_filename = Column(
        String(512),
        nullable=True,
    )

    trigger_source_type = Column(
        String(64),
        nullable=True,
    )

    summary = Column(
        Text,
        nullable=True,
    )

    entity_count = Column(
        Integer,
        nullable=False,
        default=0,
    )

    relationship_count = Column(
        Integer,
        nullable=False,
        default=0,
    )

    entities_added = Column(
        JSONB,
        nullable=False,
        server_default="[]",
    )

    entities_removed = Column(
        JSONB,
        nullable=False,
        server_default="[]",
    )

    entities_changed = Column(
        JSONB,
        nullable=False,
        server_default="[]",
    )

    relationships_added = Column(
        JSONB,
        nullable=False,
        server_default="[]",
    )

    relationships_removed = Column(
        JSONB,
        nullable=False,
        server_default="[]",
    )

    relationships_changed = Column(
        JSONB,
        nullable=False,
        server_default="[]",
    )

    snapshot = Column(
        JSONB,
        nullable=False,
    )

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    case = orm_relationship(
        "Case",
        back_populates="graph_versions",
    )

    trigger_evidence = orm_relationship(
        "Evidence",
        foreign_keys=[trigger_evidence_id],
    )