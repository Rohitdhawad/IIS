from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Relationship
from app.schemas import RelationshipOut

router = APIRouter(prefix="/relationships", tags=["relationships"])


@router.get("", response_model=list[RelationshipOut])
def list_relationships(case_id: Optional[str] = None, source_id: Optional[str] = None, target_id: Optional[str] = None, relation_type: Optional[str] = Query(None, alias="type"), limit: int = Query(200, ge=1, le=2000), db: Session = Depends(get_db)):
    statement = select(Relationship)
    if case_id:
        statement = statement.where(Relationship.case_id == case_id)
    if source_id:
        statement = statement.where(Relationship.source_id == source_id)
    if target_id:
        statement = statement.where(Relationship.target_id == target_id)
    if relation_type:
        statement = statement.where(Relationship.type == relation_type)
    return db.scalars(statement.order_by(Relationship.observed_at, Relationship.id).limit(limit))
