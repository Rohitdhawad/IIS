from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Relationship
from app.schemas import RelationshipOut

router = APIRouter(prefix="/relationships", tags=["relationships"])


@router.get("", response_model=list[RelationshipOut])
def list_relationships(
    case_id: Optional[str] = None,
    phase: Optional[int] = None,
    source_id: Optional[str] = None,
    target_id: Optional[str] = None,
    relation_type: Optional[str] = Query(default=None, alias="type"),
    limit: int = Query(default=200, ge=1, le=2000),
    db: Session = Depends(get_db),
):
    """Query the call/interaction graph directly, with optional filters."""
    stmt = select(Relationship)
    if case_id:
        stmt = stmt.where(Relationship.case_id == case_id)
    if phase is not None:
        stmt = stmt.where(Relationship.phase == phase)
    if source_id:
        stmt = stmt.where(Relationship.source_id == source_id)
    if target_id:
        stmt = stmt.where(Relationship.target_id == target_id)
    if relation_type:
        stmt = stmt.where(Relationship.type == relation_type)
    stmt = stmt.limit(limit)
    return db.execute(stmt).scalars().all()
