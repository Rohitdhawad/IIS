from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Case, Entity, Relationship, PhaseSummary
from app.schemas import CaseSummaryOut

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("", response_model=list[CaseSummaryOut])
def list_cases(db: Session = Depends(get_db)):
    """List all investigation cases with basic counts."""
    cases = db.execute(select(Case)).scalars().all()
    result = []
    for c in cases:
        num_entities = db.execute(
            select(func.count()).select_from(Entity).where(Entity.case_id == c.id)
        ).scalar_one()
        num_relationships = db.execute(
            select(func.count()).select_from(Relationship).where(Relationship.case_id == c.id)
        ).scalar_one()
        num_phases = db.execute(
            select(func.count()).select_from(PhaseSummary).where(PhaseSummary.case_id == c.id)
        ).scalar_one()
        result.append(CaseSummaryOut(
            id=c.id, name=c.name, description=c.description, created_at=c.created_at,
            num_phases=num_phases, num_entities=num_entities, num_relationships=num_relationships,
        ))
    return result


@router.get("/{case_id}", response_model=CaseSummaryOut)
def get_case(case_id: str, db: Session = Depends(get_db)):
    c = db.get(Case, case_id)
    if not c:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")
    num_entities = db.execute(
        select(func.count()).select_from(Entity).where(Entity.case_id == c.id)
    ).scalar_one()
    num_relationships = db.execute(
        select(func.count()).select_from(Relationship).where(Relationship.case_id == c.id)
    ).scalar_one()
    num_phases = db.execute(
        select(func.count()).select_from(PhaseSummary).where(PhaseSummary.case_id == c.id)
    ).scalar_one()
    return CaseSummaryOut(
        id=c.id, name=c.name, description=c.description, created_at=c.created_at,
        num_phases=num_phases, num_entities=num_entities, num_relationships=num_relationships,
    )
