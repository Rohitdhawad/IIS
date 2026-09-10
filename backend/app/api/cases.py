from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Case, Entity, Relationship
from app.schemas import CaseSummaryOut

router = APIRouter(prefix="/cases", tags=["cases"])


def summary(case: Case, db: Session) -> CaseSummaryOut:
    return CaseSummaryOut(
        id=case.id, name=case.name, description=case.description, created_at=case.created_at,
        num_entities=db.scalar(select(func.count()).select_from(Entity).where(Entity.case_id == case.id)) or 0,
        num_relationships=db.scalar(select(func.count()).select_from(Relationship).where(Relationship.case_id == case.id)) or 0,
    )


@router.get("", response_model=list[CaseSummaryOut])
def list_cases(db: Session = Depends(get_db)):
    return [summary(case, db) for case in db.scalars(select(Case).order_by(Case.id))]


@router.get("/{case_id}", response_model=CaseSummaryOut)
def get_case(case_id: str, db: Session = Depends(get_db)):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")
    return summary(case, db)
