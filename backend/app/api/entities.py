from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Entity, Relationship
from app.schemas import EntityOut, EntityEvidenceOut

router = APIRouter(prefix="/entities", tags=["entities"])


@router.get("", response_model=list[EntityOut])
def list_entities(
    case_id: Optional[str] = None,
    entity_type: Optional[str] = Query(default=None, description="Filter by type, e.g. 'Person'"),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """List / search entities, optionally filtered by case or type."""
    stmt = select(Entity)
    if case_id:
        stmt = stmt.where(Entity.case_id == case_id)
    if entity_type:
        stmt = stmt.where(Entity.type == entity_type)
    stmt = stmt.limit(limit)
    return db.execute(stmt).scalars().all()


@router.get("/{entity_id}", response_model=EntityOut)
def get_entity(entity_id: str, db: Session = Depends(get_db)):
    e = db.get(Entity, entity_id)
    if not e:
        raise HTTPException(status_code=404, detail=f"Entity '{entity_id}' not found")
    return e


@router.get("/{entity_id}/evidence", response_model=EntityEvidenceOut)
def entity_evidence(
    entity_id: str,
    phase: Optional[int] = Query(default=None, description="Restrict to a single phase"),
    db: Session = Depends(get_db),
):
    """
    Raw relationship records behind an entity -- the actual call records
    that any structural score for this entity is built from. This is what
    'evidence-backed' means in practice: nothing is asserted without these
    rows being retrievable.
    """
    if not db.get(Entity, entity_id):
        raise HTTPException(status_code=404, detail=f"Entity '{entity_id}' not found")

    stmt = select(Relationship).where(
        or_(Relationship.source_id == entity_id, Relationship.target_id == entity_id)
    )
    if phase is not None:
        stmt = stmt.where(Relationship.phase == phase)
    stmt = stmt.order_by(Relationship.phase, Relationship.weight.desc())

    rows = db.execute(stmt).scalars().all()
    outgoing = [
        {"to": r.target_id, "calls": r.weight, "phase": r.phase}
        for r in rows if r.source_id == entity_id
    ]
    incoming = [
        {"from": r.source_id, "calls": r.weight, "phase": r.phase}
        for r in rows if r.target_id == entity_id
    ]
    return EntityEvidenceOut(entity_id=entity_id, phase=phase, outgoing_calls=outgoing, incoming_calls=incoming)
