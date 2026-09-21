"""Network analysis and actionable intelligence API."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.actionable_intelligence import (
    actionable_intelligence_service,
)
from app.services.network_intelligence import (
    network_intelligence_service,
)

router = APIRouter(
    prefix="/network-analysis",
    tags=["network-analysis"],
)


@router.get("/case/{case_id}")
def analyze_case(
    case_id: str,
    db: Session = Depends(get_db),
):
    return network_intelligence_service.analyze_case(
        db,
        case_id,
    )


@router.get("/case/{case_id}/path")
def find_connection_path(
    case_id: str,
    source_id: str = Query(...),
    target_id: str = Query(...),
    db: Session = Depends(get_db),
):
    result = network_intelligence_service.find_shortest_path(
        db=db,
        case_id=case_id,
        source_id=source_id,
        target_id=target_id,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="No connection path found between the selected entities.",
        )

    return result


@router.get("/case/{case_id}/entity/{entity_id}")
def analyze_entity(
    case_id: str,
    entity_id: str,
    db: Session = Depends(get_db),
):
    result = network_intelligence_service.analyze_entity(
        db=db,
        case_id=case_id,
        entity_id=entity_id,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Entity not found in this case.",
        )

    return result


@router.get("/case/{case_id}/intelligence")
def actionable_intelligence(
    case_id: str,
    db: Session = Depends(get_db),
):
    """
    Return investigator-oriented intelligence generated from
    the current investigation graph.

    These are analytical leads, not conclusions of guilt.
    """
    return actionable_intelligence_service.analyze(
        db=db,
        case_id=case_id,
    )