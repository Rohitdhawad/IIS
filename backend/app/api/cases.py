from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Case, Entity, Evidence, Relationship
from app.schemas import CaseCreate, CaseSummaryOut


router = APIRouter(
    prefix="/cases",
    tags=["cases"],
)


def summary(case: Case, db: Session) -> CaseSummaryOut:
    num_entities = (
        db.scalar(
            select(func.count())
            .select_from(Entity)
            .where(Entity.case_id == case.id)
        )
        or 0
    )

    num_relationships = (
        db.scalar(
            select(func.count())
            .select_from(Relationship)
            .where(Relationship.case_id == case.id)
        )
        or 0
    )

    num_evidence = (
        db.scalar(
            select(func.count())
            .select_from(Evidence)
            .where(Evidence.case_id == case.id)
        )
        or 0
    )

    return CaseSummaryOut(
        id=case.id,
        name=case.name,
        description=case.description,
        created_at=case.created_at,
        num_entities=num_entities,
        num_relationships=num_relationships,
        num_evidence=num_evidence,
    )


@router.post("", response_model=CaseSummaryOut, status_code=201)
def create_case(
    case_data: CaseCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new investigation case.
    """

    case_id = f"IIS-{uuid4().hex[:12].upper()}"

    case = Case(
        id=case_id,
        name=case_data.name.strip(),
        description=case_data.description,
    )

    if not case.name:
        raise HTTPException(
            status_code=400,
            detail="Case name cannot be empty.",
        )

    db.add(case)
    db.commit()
    db.refresh(case)

    return summary(case, db)


@router.get("", response_model=list[CaseSummaryOut])
def list_cases(
    db: Session = Depends(get_db),
):
    cases = db.scalars(
        select(Case).order_by(Case.created_at.desc(), Case.id)
    ).all()

    return [summary(case, db) for case in cases]


@router.get("/{case_id}", response_model=CaseSummaryOut)
def get_case(
    case_id: str,
    db: Session = Depends(get_db),
):
    case = db.get(Case, case_id)

    if not case:
        raise HTTPException(
            status_code=404,
            detail=f"Case '{case_id}' not found",
        )

    return summary(case, db)