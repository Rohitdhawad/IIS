"""Evidence provenance API for investigator drill-down."""

from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import (
    Entity,
    EntityEvidence,
    Evidence,
    Relationship,
    RelationshipEvidence,
)

router = APIRouter(
    prefix="/evidence-provenance",
    tags=["evidence-provenance"],
)


def evidence_payload(
    evidence: Evidence,
    *,
    source_text: str | None = None,
    extraction_confidence: float | None = None,
) -> dict:
    """Build a consistent investigator-facing evidence record."""

    public_url = None

    if settings.R2_PUBLIC_BASE_URL:
        public_url = (
            settings.R2_PUBLIC_BASE_URL.rstrip("/")
            + "/"
            + quote(evidence.storage_path, safe="/")
        )

    return {
        "evidence_id": evidence.id,
        "case_id": evidence.case_id,
        "filename": evidence.filename,
        "source_type": evidence.source_type,
        "file_type": evidence.file_type,
        "status": evidence.status,
        "storage_path": evidence.storage_path,
        "public_url": public_url,
        "uploaded_at": evidence.uploaded_at,
        "source_text": source_text,
        "extraction_confidence": extraction_confidence,
    }


@router.get("/entity/{entity_id}")
def get_entity_evidence(
    entity_id: str,
    db: Session = Depends(get_db),
):
    """Return all evidence that directly supports an extracted entity."""

    entity = db.get(Entity, entity_id)

    if entity is None:
        raise HTTPException(
            status_code=404,
            detail=f"Entity '{entity_id}' not found.",
        )

    rows = (
        db.query(EntityEvidence, Evidence)
        .join(
            Evidence,
            Evidence.id == EntityEvidence.evidence_id,
        )
        .filter(EntityEvidence.entity_id == entity_id)
        .order_by(Evidence.uploaded_at.desc())
        .all()
    )

    return {
        "entity": {
            "entity_id": entity.entity_id,
            "case_id": entity.case_id,
            "type": entity.type,
            "label": entity.label,
            "attributes": entity.attributes,
        },
        "evidence_count": len(rows),
        "evidence": [
            evidence_payload(
                evidence,
                source_text=link.source_text,
                extraction_confidence=link.extraction_confidence,
            )
            for link, evidence in rows
        ],
    }


@router.get("/relationship/{relationship_id}")
def get_relationship_evidence(
    relationship_id: int,
    db: Session = Depends(get_db),
):
    """Return all evidence that directly supports an extracted relationship."""

    relationship = db.get(Relationship, relationship_id)

    if relationship is None:
        raise HTTPException(
            status_code=404,
            detail=f"Relationship '{relationship_id}' not found.",
        )

    source = db.get(Entity, relationship.source_id)
    target = db.get(Entity, relationship.target_id)

    rows = (
        db.query(RelationshipEvidence, Evidence)
        .join(
            Evidence,
            Evidence.id == RelationshipEvidence.evidence_id,
        )
        .filter(
            RelationshipEvidence.relationship_id == relationship_id
        )
        .order_by(Evidence.uploaded_at.desc())
        .all()
    )

    return {
        "relationship": {
            "id": relationship.id,
            "case_id": relationship.case_id,
            "source": {
                "entity_id": source.entity_id,
                "label": source.label,
                "type": source.type,
            }
            if source
            else None,
            "target": {
                "entity_id": target.entity_id,
                "label": target.label,
                "type": target.type,
            }
            if target
            else None,
            "relationship_type": relationship.type,
            "weight": relationship.weight,
            "confidence": relationship.confidence,
            "observed_at": relationship.observed_at,
            "attributes": relationship.attributes,
        },
        "evidence_count": len(rows),
        "evidence": [
            evidence_payload(
                evidence,
                source_text=link.source_text,
                extraction_confidence=link.extraction_confidence,
            )
            for link, evidence in rows
        ],
    }


@router.get("/evidence/{evidence_id}")
def get_evidence_provenance(
    evidence_id: int,
    db: Session = Depends(get_db),
):
    """Return all persisted provenance links for one evidence item."""

    evidence = db.get(Evidence, evidence_id)

    if evidence is None:
        raise HTTPException(
            status_code=404,
            detail=f"Evidence '{evidence_id}' not found.",
        )

    entity_rows = (
        db.query(EntityEvidence, Entity)
        .join(
            Entity,
            Entity.entity_id == EntityEvidence.entity_id,
        )
        .filter(EntityEvidence.evidence_id == evidence_id)
        .all()
    )

    relationship_rows = (
        db.query(RelationshipEvidence, Relationship)
        .join(
            Relationship,
            Relationship.id == RelationshipEvidence.relationship_id,
        )
        .filter(RelationshipEvidence.evidence_id == evidence_id)
        .all()
    )

    return {
        "evidence": evidence_payload(evidence),
        "entities": [
            {
                "entity_id": entity.entity_id,
                "label": entity.label,
                "type": entity.type,
                "source_text": link.source_text,
                "extraction_confidence": link.extraction_confidence,
            }
            for link, entity in entity_rows
        ],
        "relationships": [
            {
                "relationship_id": relationship.id,
                "source_id": relationship.source_id,
                "target_id": relationship.target_id,
                "type": relationship.type,
                "weight": relationship.weight,
                "confidence": relationship.confidence,
                "observed_at": relationship.observed_at,
                "source_text": link.source_text,
                "extraction_confidence": link.extraction_confidence,
            }
            for link, relationship in relationship_rows
        ],
    }