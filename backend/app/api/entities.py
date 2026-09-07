from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Entity, Relationship
from app.schemas import EntityEvidenceOut, EntityOut, RelationshipOut

router = APIRouter(prefix="/entities", tags=["entities"])


@router.get("", response_model=list[EntityOut])
def list_entities(case_id: Optional[str] = None, entity_type: Optional[str] = None, limit: int = Query(100, ge=1, le=500), db: Session = Depends(get_db)):
    statement = select(Entity)
    if case_id:
        statement = statement.where(Entity.case_id == case_id)
    if entity_type:
        statement = statement.where(Entity.type == entity_type)
    return db.scalars(statement.order_by(Entity.type, Entity.label).limit(limit))


@router.get("/{entity_id}", response_model=EntityOut)
def get_entity(entity_id: str, db: Session = Depends(get_db)):
    entity = db.get(Entity, entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail=f"Entity '{entity_id}' not found")
    return entity


@router.get("/{entity_id}/evidence", response_model=EntityEvidenceOut)
def entity_evidence(entity_id: str, db: Session = Depends(get_db)):
    if not db.get(Entity, entity_id):
        raise HTTPException(status_code=404, detail=f"Entity '{entity_id}' not found")
    rows = list(db.scalars(select(Relationship).where(or_(Relationship.source_id == entity_id, Relationship.target_id == entity_id)).order_by(Relationship.observed_at)))
    return EntityEvidenceOut(entity_id=entity_id, outgoing_relationships=[RelationshipOut.model_validate(row) for row in rows if row.source_id == entity_id], incoming_relationships=[RelationshipOut.model_validate(row) for row in rows if row.target_id == entity_id])
