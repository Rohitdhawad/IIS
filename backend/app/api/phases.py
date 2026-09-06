from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PhaseSummary, EntityPhaseMetric, Entity
from app.schemas import PhaseSummaryOut, EntityPhaseMetricOut

router = APIRouter(prefix="/cases/{case_id}/phases", tags=["phases"])


@router.get("", response_model=list[PhaseSummaryOut])
def list_phase_summaries(case_id: str, db: Session = Depends(get_db)):
    rows = db.execute(
        select(PhaseSummary).where(PhaseSummary.case_id == case_id).order_by(PhaseSummary.phase)
    ).scalars().all()
    if not rows:
        raise HTTPException(status_code=404, detail=f"No phases found for case '{case_id}'")
    return rows


@router.get("/{phase}", response_model=PhaseSummaryOut)
def get_phase_summary(case_id: str, phase: int, db: Session = Depends(get_db)):
    row = db.execute(
        select(PhaseSummary).where(PhaseSummary.case_id == case_id, PhaseSummary.phase == phase)
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail=f"Phase {phase} not found for case '{case_id}'")
    return row


@router.get("/{phase}/entities", response_model=list[EntityPhaseMetricOut])
def phase_ranked_entities(
    case_id: str,
    phase: int,
    limit: int = Query(default=5, ge=1, le=500, description="Top-N by network relevance (rank ascending)"),
    db: Session = Depends(get_db),
):
    """
    Entities ranked by structural network relevance (betweenness, then
    weighted degree) for this phase. Scores describe communication-network
    STRUCTURE only -- not a guilt or suspicion assessment. Increase `limit`
    up to the full entity count for this phase to see everyone, not just
    the top-K headline candidates.
    """
    rows = db.execute(
        select(EntityPhaseMetric)
        .where(EntityPhaseMetric.case_id == case_id, EntityPhaseMetric.phase == phase)
        .order_by(EntityPhaseMetric.rank.asc())
        .limit(limit)
    ).scalars().all()
    if not rows:
        raise HTTPException(status_code=404, detail=f"No metrics found for case '{case_id}' phase {phase}")
    return rows


@router.get("/{phase}/bridge-candidates", response_model=list[EntityPhaseMetricOut])
def phase_bridge_candidates(case_id: str, phase: int, db: Session = Depends(get_db)):
    """
    ALL bridge candidates for this phase (not just the top-K display slice),
    ordered by centrality. Structural signal only -- not a guilt assessment.
    """
    rows = db.execute(
        select(EntityPhaseMetric)
        .where(
            EntityPhaseMetric.case_id == case_id,
            EntityPhaseMetric.phase == phase,
            EntityPhaseMetric.is_bridge_candidate.is_(True),
        )
        .order_by(EntityPhaseMetric.rank.asc())
    ).scalars().all()
    return rows
