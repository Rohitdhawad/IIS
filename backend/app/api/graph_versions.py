"""Graph version snapshot and history API."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Case,
    Entity,
    Evidence,
    GraphVersion,
    Relationship,
)


router = APIRouter(
    prefix="/graph-versions",
    tags=["graph versions"],
)


# ============================================================
# RESPONSE SCHEMAS
# ============================================================


class GraphVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: str
    version_number: int

    trigger_evidence_id: int | None = None
    trigger_filename: str | None = None
    trigger_source_type: str | None = None

    summary: str | None = None

    entity_count: int
    relationship_count: int

    entities_added: list[dict[str, Any]] = Field(default_factory=list)
    entities_removed: list[dict[str, Any]] = Field(default_factory=list)
    entities_changed: list[dict[str, Any]] = Field(default_factory=list)

    relationships_added: list[dict[str, Any]] = Field(default_factory=list)
    relationships_removed: list[dict[str, Any]] = Field(default_factory=list)
    relationships_changed: list[dict[str, Any]] = Field(default_factory=list)

    snapshot: dict[str, Any]

    created_at: Any


class CreateGraphVersionRequest(BaseModel):
    evidence_id: int | None = None


# ============================================================
# SNAPSHOT HELPERS
# ============================================================


def _entity_snapshot(entity: Entity) -> dict[str, Any]:
    return {
        "id": entity.entity_id,
        "entity_id": entity.entity_id,
        "type": entity.type,
        "label": entity.label,
        "attributes": entity.attributes or {},
        "case_id": entity.case_id,
    }


def _relationship_snapshot(
    relationship: Relationship,
) -> dict[str, Any]:
    return {
        "id": str(relationship.id),
        "relationship_id": str(relationship.id),
        "source": relationship.source_id,
        "target": relationship.target_id,
        "type": relationship.type,
        "weight": relationship.weight,
        "confidence": relationship.confidence,
        "observed_at": (
            relationship.observed_at.isoformat()
            if relationship.observed_at
            else None
        ),
        "attributes": relationship.attributes or {},
        "case_id": relationship.case_id,
    }


def _entity_signature(entity: dict[str, Any]) -> tuple:
    return (
        entity.get("type"),
        entity.get("label"),
        entity.get("attributes") or {},
    )


def _relationship_signature(
    relationship: dict[str, Any],
) -> tuple:
    return (
        relationship.get("source"),
        relationship.get("target"),
        relationship.get("type"),
        relationship.get("weight"),
        relationship.get("confidence"),
        relationship.get("observed_at"),
        relationship.get("attributes") or {},
    )


def _calculate_changes(
    previous_snapshot: dict[str, Any] | None,
    current_nodes: list[dict[str, Any]],
    current_relationships: list[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    """
    Compare the complete current graph against the previous snapshot.
    """

    if not previous_snapshot:
        return {
            "entities_added": current_nodes,
            "entities_removed": [],
            "entities_changed": [],
            "relationships_added": current_relationships,
            "relationships_removed": [],
            "relationships_changed": [],
        }

    previous_nodes = previous_snapshot.get("nodes", [])
    previous_relationships = previous_snapshot.get(
        "relationships",
        [],
    )

    previous_entities_by_id = {
        str(node.get("id", node.get("entity_id"))): node
        for node in previous_nodes
    }

    current_entities_by_id = {
        str(node.get("id", node.get("entity_id"))): node
        for node in current_nodes
    }

    entities_added = []
    entities_removed = []
    entities_changed = []

    for entity_id, entity in current_entities_by_id.items():
        if entity_id not in previous_entities_by_id:
            entities_added.append(entity)
        elif (
            _entity_signature(entity)
            != _entity_signature(
                previous_entities_by_id[entity_id]
            )
        ):
            entities_changed.append(
                {
                    "id": entity_id,
                    "before": previous_entities_by_id[entity_id],
                    "after": entity,
                }
            )

    for entity_id, entity in previous_entities_by_id.items():
        if entity_id not in current_entities_by_id:
            entities_removed.append(entity)

    previous_relationships_by_id = {
        str(
            relationship.get(
                "id",
                relationship.get("relationship_id"),
            )
        ): relationship
        for relationship in previous_relationships
    }

    current_relationships_by_id = {
        str(
            relationship.get(
                "id",
                relationship.get("relationship_id"),
            )
        ): relationship
        for relationship in current_relationships
    }

    relationships_added = []
    relationships_removed = []
    relationships_changed = []

    for relationship_id, relationship in current_relationships_by_id.items():
        if relationship_id not in previous_relationships_by_id:
            relationships_added.append(relationship)
        elif (
            _relationship_signature(relationship)
            != _relationship_signature(
                previous_relationships_by_id[relationship_id]
            )
        ):
            relationships_changed.append(
                {
                    "id": relationship_id,
                    "before": previous_relationships_by_id[
                        relationship_id
                    ],
                    "after": relationship,
                }
            )

    for relationship_id, relationship in previous_relationships_by_id.items():
        if relationship_id not in current_relationships_by_id:
            relationships_removed.append(relationship)

    return {
        "entities_added": entities_added,
        "entities_removed": entities_removed,
        "entities_changed": entities_changed,
        "relationships_added": relationships_added,
        "relationships_removed": relationships_removed,
        "relationships_changed": relationships_changed,
    }


# ============================================================
# CREATE VERSION
# ============================================================


def create_graph_version(
    db: Session,
    case_id: str,
    evidence_id: int | None = None,
) -> GraphVersion:
    """
    Create the next immutable graph snapshot for a case.

    PostgreSQL is used as the source of truth for the snapshot.
    Neo4j remains the live graph used for graph analysis/visualization.
    """

    case = (
        db.query(Case)
        .filter(Case.id == case_id)
        .first()
    )

    if not case:
        raise ValueError(
            f"Case '{case_id}' does not exist."
        )

    entities = (
        db.query(Entity)
        .filter(Entity.case_id == case_id)
        .order_by(Entity.entity_id)
        .all()
    )

    relationships = (
        db.query(Relationship)
        .filter(Relationship.case_id == case_id)
        .order_by(Relationship.id)
        .all()
    )

    previous_version = (
        db.query(GraphVersion)
        .filter(GraphVersion.case_id == case_id)
        .order_by(
            GraphVersion.version_number.desc()
        )
        .first()
    )

    next_version_number = (
        previous_version.version_number + 1
        if previous_version
        else 1
    )

    nodes = [
        _entity_snapshot(entity)
        for entity in entities
    ]

    links = [
        _relationship_snapshot(relationship)
        for relationship in relationships
    ]

    changes = _calculate_changes(
        previous_version.snapshot
        if previous_version
        else None,
        nodes,
        links,
    )

    evidence = None

    if evidence_id is not None:
        evidence = (
            db.query(Evidence)
            .filter(
                Evidence.id == evidence_id,
                Evidence.case_id == case_id,
            )
            .first()
        )

        if not evidence:
            raise ValueError(
                f"Evidence '{evidence_id}' does not belong "
                f"to case '{case_id}'."
            )

    added_entities = len(
        changes["entities_added"]
    )
    removed_entities = len(
        changes["entities_removed"]
    )
    changed_entities = len(
        changes["entities_changed"]
    )

    added_relationships = len(
        changes["relationships_added"]
    )
    removed_relationships = len(
        changes["relationships_removed"]
    )
    changed_relationships = len(
        changes["relationships_changed"]
    )

    if previous_version is None:
        summary = (
            f"Initial graph snapshot with "
            f"{len(nodes)} entities and "
            f"{len(links)} relationships."
        )
    else:
        summary = (
            f"Graph updated: "
            f"{added_entities} entities added, "
            f"{removed_entities} removed, "
            f"{changed_entities} changed; "
            f"{added_relationships} relationships added, "
            f"{removed_relationships} removed, "
            f"{changed_relationships} changed."
        )

    version = GraphVersion(
        case_id=case_id,
        version_number=next_version_number,
        trigger_evidence_id=(
            evidence.id if evidence else None
        ),
        trigger_filename=(
            evidence.filename if evidence else None
        ),
        trigger_source_type=(
            evidence.source_type if evidence else None
        ),
        summary=summary,
        entity_count=len(nodes),
        relationship_count=len(links),
        entities_added=changes["entities_added"],
        entities_removed=changes["entities_removed"],
        entities_changed=changes["entities_changed"],
        relationships_added=changes[
            "relationships_added"
        ],
        relationships_removed=changes[
            "relationships_removed"
        ],
        relationships_changed=changes[
            "relationships_changed"
        ],
        snapshot={
            "case_id": case_id,
            "nodes": nodes,
            "relationships": links,
        },
    )

    db.add(version)
    db.flush()

    return version


# ============================================================
# API ROUTES
# ============================================================


@router.get(
    "/case/{case_id}",
    response_model=list[GraphVersionOut],
)
def get_graph_versions(
    case_id: str,
    db: Session = Depends(get_db),
):
    case = (
        db.query(Case)
        .filter(Case.id == case_id)
        .first()
    )

    if not case:
        raise HTTPException(
            status_code=404,
            detail="Case not found.",
        )

    return (
        db.query(GraphVersion)
        .filter(GraphVersion.case_id == case_id)
        .order_by(GraphVersion.version_number)
        .all()
    )


@router.get(
    "/case/{case_id}/{version_number}",
    response_model=GraphVersionOut,
)
def get_graph_version(
    case_id: str,
    version_number: int,
    db: Session = Depends(get_db),
):
    version = (
        db.query(GraphVersion)
        .filter(
            GraphVersion.case_id == case_id,
            GraphVersion.version_number == version_number,
        )
        .first()
    )

    if not version:
        raise HTTPException(
            status_code=404,
            detail="Graph version not found.",
        )

    return version


@router.post(
    "/case/{case_id}",
    response_model=GraphVersionOut,
)
def create_graph_version_endpoint(
    case_id: str,
    payload: CreateGraphVersionRequest,
    db: Session = Depends(get_db),
):
    try:
        version = create_graph_version(
            db=db,
            case_id=case_id,
            evidence_id=payload.evidence_id,
        )

        db.commit()
        db.refresh(version)

        return version

    except ValueError as exc:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception:
        db.rollback()
        raise