"""
Evidence upload, extraction and network synchronization API.
"""

from uuid import NAMESPACE_URL, uuid4, uuid5

import boto3
from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
)
from sqlalchemy.orm import Session

from app.api.graph_versions import create_graph_version
from app.config import settings
from app.database import get_db
from app.models import (
    Case,
    Entity,
    EntityEvidence,
    Evidence,
    Relationship,
    RelationshipEvidence,
)
from app.schemas import EvidenceOut
from app.services.extraction_pipeline import (
    EvidenceExtractionPipeline,
)
from app.services.graph_sync import graph_sync_service


router = APIRouter(
    prefix="/evidence",
    tags=["evidence"],
)


# =========================================================
# R2 CLIENT
# =========================================================

r2 = boto3.client(
    "s3",
    endpoint_url=settings.R2_ENDPOINT_URL,
    aws_access_key_id=settings.R2_ACCESS_KEY_ID,
    aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
)


# =========================================================
# VALID SOURCE TYPES
# =========================================================

VALID_SOURCE_TYPES = {
    "FIR / Police Report",
    "Call Detail Records (CDR)",
    "Financial Transaction",
    "Surveillance Report",
    "Social Media Intelligence",
    "Criminal History",
    "Intelligence Agency Report",
    "Other",
}


# =========================================================
# UPLOAD EVIDENCE
# =========================================================

@router.post(
    "/cases/{case_id}",
    response_model=EvidenceOut,
)
async def upload_evidence(
    case_id: str,
    source_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    case = db.get(
        Case,
        case_id,
    )

    if not case:
        raise HTTPException(
            status_code=404,
            detail=f"Case '{case_id}' not found.",
        )

    if source_type not in VALID_SOURCE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid source_type '{source_type}'. "
                f"Allowed values: "
                f"{sorted(VALID_SOURCE_TYPES)}"
            ),
        )

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required.",
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    extension = ""

    if "." in file.filename:
        extension = (
            file.filename
            .rsplit(".", 1)[-1]
            .lower()
        )

    file_id = uuid4().hex

    storage_path = (
        f"cases/{case_id}/evidence/"
        f"{file_id}/{file.filename}"
    )

    try:
        r2.put_object(
            Bucket=settings.R2_BUCKET_NAME,
            Key=storage_path,
            Body=content,
            ContentType=(
                file.content_type
                or "application/octet-stream"
            ),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=(
                "Failed to upload evidence to storage: "
                f"{exc}"
            ),
        ) from exc

    evidence = Evidence(
        case_id=case_id,
        filename=file.filename,
        source_type=source_type,
        file_type=extension,
        storage_path=storage_path,
        status="uploaded",
        metadata_json={
            "content_type": file.content_type,
            "size_bytes": len(content),
        },
    )

    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    return evidence


# =========================================================
# LIST ALL EVIDENCE
# =========================================================

@router.get(
    "",
    response_model=list[EvidenceOut],
)
def list_evidence(
    case_id: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Evidence)

    if case_id:
        query = query.filter(
            Evidence.case_id == case_id
        )

    return (
        query
        .order_by(
            Evidence.uploaded_at.desc(),
            Evidence.id.desc(),
        )
        .all()
    )


# =========================================================
# GET SINGLE EVIDENCE
# =========================================================

@router.get(
    "/{evidence_id}",
    response_model=EvidenceOut,
)
def get_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
):
    evidence = db.get(
        Evidence,
        evidence_id,
    )

    if not evidence:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Evidence '{evidence_id}' not found."
            ),
        )

    return evidence


# =========================================================
# LIST CASE EVIDENCE
# =========================================================

@router.get(
    "/cases/{case_id}",
    response_model=list[EvidenceOut],
)
def list_case_evidence(
    case_id: str,
    db: Session = Depends(get_db),
):
    case = db.get(
        Case,
        case_id,
    )

    if not case:
        raise HTTPException(
            status_code=404,
            detail=f"Case '{case_id}' not found.",
        )

    return (
        db.query(Evidence)
        .filter(
            Evidence.case_id == case_id
        )
        .order_by(
            Evidence.uploaded_at.desc(),
            Evidence.id.desc(),
        )
        .all()
    )


# =========================================================
# EXTRACT + BUILD NETWORK
# =========================================================

@router.post(
    "/{evidence_id}/extract",
)
async def extract_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
):
    """
    Complete investigation ingestion flow:

    Evidence
        ↓
    Gemini extraction
        ↓
    PostgreSQL entities
        ↓
    Entity provenance
        ↓
    PostgreSQL relationships
        ↓
    Relationship provenance
        ↓
    Neo4j synchronization
        ↓
    Immutable graph version
        ↓
    analyzed
    """

    # -----------------------------------------------------
    # LOAD EVIDENCE
    # -----------------------------------------------------

    evidence = db.get(
        Evidence,
        evidence_id,
    )

    if not evidence:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Evidence '{evidence_id}' not found."
            ),
        )

    # -----------------------------------------------------
    # PROCESSING
    # -----------------------------------------------------

    evidence.status = "processing"
    db.commit()

    # -----------------------------------------------------
    # AI EXTRACTION
    # -----------------------------------------------------

    evidence.status = "extracting"
    db.commit()

    pipeline = EvidenceExtractionPipeline()

    try:
        result = await pipeline.run(
            evidence_id=evidence_id,
            db=db,
        )

    except ValueError as exc:
        evidence.status = "failed"
        db.commit()

        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    except RuntimeError as exc:
        evidence.status = "failed"
        db.commit()

        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        evidence.status = "failed"
        db.commit()

        raise HTTPException(
            status_code=500,
            detail=(
                "Evidence extraction failed: "
                f"{exc}"
            ),
        ) from exc

    # -----------------------------------------------------
    # SAVE ENTITIES
    # -----------------------------------------------------

    saved_entities = []

    for extracted in result.entities:

        normalized_label = (
            extracted.label
            .strip()
        )

        if not normalized_label:
            continue

        entity_id = str(
            uuid5(
                NAMESPACE_URL,
                (
                    f"iis:"
                    f"{evidence.case_id}:"
                    f"{extracted.type}:"
                    f"{normalized_label.lower()}"
                ),
            )
        )

        entity = db.get(
            Entity,
            entity_id,
        )

        if entity is None:

            entity = Entity(
                entity_id=entity_id,
                case_id=evidence.case_id,
                type=extracted.type,
                label=normalized_label,
                attributes={
                    **extracted.attributes,
                },
            )

            db.add(entity)

        else:

            entity.attributes = {
                **(
                    entity.attributes
                    or {}
                ),
                **extracted.attributes,
            }

        db.flush()

        # -------------------------------------------------
        # ENTITY ↔ EVIDENCE PROVENANCE
        # -------------------------------------------------

        existing_link = (
            db.query(EntityEvidence)
            .filter(
                EntityEvidence.entity_id
                == entity.entity_id,
                EntityEvidence.evidence_id
                == evidence_id,
            )
            .first()
        )

        if existing_link is None:

            db.add(
                EntityEvidence(
                    entity_id=entity.entity_id,
                    evidence_id=evidence_id,
                    source_text=(
                        extracted.source_text
                        or None
                    ),
                    extraction_confidence=(
                        extracted.confidence
                    ),
                )
            )

        else:

            existing_link.source_text = (
                extracted.source_text
                or None
            )

            existing_link.extraction_confidence = (
                extracted.confidence
            )

        saved_entities.append(entity)

    # -----------------------------------------------------
    # SAVE RELATIONSHIPS
    # -----------------------------------------------------

    saved_relationships = []

    for extracted in result.relationships:

        source_label = (
            extracted.source.strip()
        )

        target_label = (
            extracted.target.strip()
        )

        if (
            not source_label
            or not target_label
        ):
            continue

        # -------------------------------------------------
        # FIND SOURCE
        # -------------------------------------------------

        source_entity = (
            db.query(Entity)
            .filter(
                Entity.case_id
                == evidence.case_id,
                Entity.label.ilike(
                    source_label
                ),
            )
            .first()
        )

        # -------------------------------------------------
        # FIND TARGET
        # -------------------------------------------------

        target_entity = (
            db.query(Entity)
            .filter(
                Entity.case_id
                == evidence.case_id,
                Entity.label.ilike(
                    target_label
                ),
            )
            .first()
        )

        # Both endpoints must exist.
        if (
            source_entity is None
            or target_entity is None
        ):
            continue

        # Do not create self relationships.
        if (
            source_entity.entity_id
            == target_entity.entity_id
        ):
            continue

        # -------------------------------------------------
        # FIND EXISTING RELATIONSHIP
        # -------------------------------------------------

        relationship = (
            db.query(Relationship)
            .filter(
                Relationship.case_id
                == evidence.case_id,
                Relationship.source_id
                == source_entity.entity_id,
                Relationship.target_id
                == target_entity.entity_id,
                Relationship.type
                == extracted.type,
            )
            .first()
        )

        existing_evidence_link = None

        if relationship is not None:

            existing_evidence_link = (
                db.query(
                    RelationshipEvidence
                )
                .filter(
                    RelationshipEvidence.relationship_id
                    == relationship.id,
                    RelationshipEvidence.evidence_id
                    == evidence_id,
                )
                .first()
            )

        # -------------------------------------------------
        # CREATE
        # -------------------------------------------------

        if relationship is None:

            relationship = Relationship(
                case_id=evidence.case_id,
                source_id=source_entity.entity_id,
                target_id=target_entity.entity_id,
                type=extracted.type,
                weight=1,
                confidence=extracted.confidence,
                observed_at=extracted.observed_at,
                attributes={
                    **extracted.attributes,
                },
            )

            db.add(relationship)
            db.flush()

        # -------------------------------------------------
        # UPDATE
        # -------------------------------------------------

        else:

            relationship.attributes = {
                **(
                    relationship.attributes
                    or {}
                ),
                **extracted.attributes,
            }

            # Weight represents independent evidence
            # supporting the same relationship.
            if existing_evidence_link is None:
                relationship.weight += 1

            if (
                extracted.observed_at
                is not None
            ):
                relationship.observed_at = (
                    extracted.observed_at
                )

            if (
                extracted.confidence
                > relationship.confidence
            ):
                relationship.confidence = (
                    extracted.confidence
                )

        # -------------------------------------------------
        # RELATIONSHIP ↔ EVIDENCE
        # -------------------------------------------------

        if existing_evidence_link is None:

            db.add(
                RelationshipEvidence(
                    relationship_id=relationship.id,
                    evidence_id=evidence_id,
                    source_text=(
                        extracted.source_text
                        or None
                    ),
                    extraction_confidence=(
                        extracted.confidence
                    ),
                )
            )

        else:

            existing_evidence_link.source_text = (
                extracted.source_text
                or None
            )

            existing_evidence_link.extraction_confidence = (
                extracted.confidence
            )

        saved_relationships.append(
            relationship
        )

    # -----------------------------------------------------
    # SAVE ALL POSTGRES DATA
    # -----------------------------------------------------

    try:
        db.commit()

    except Exception as exc:
        db.rollback()

        evidence.status = "failed"
        db.commit()

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to persist extracted "
                f"investigation data: {exc}"
            ),
        ) from exc

    # -----------------------------------------------------
    # UPDATE NEO4J
    # -----------------------------------------------------

    evidence.status = "updating_network"
    db.commit()

    try:

        graph_result = (
            graph_sync_service.sync_case(
                db=db,
                case_id=evidence.case_id,
            )
        )

    except Exception as exc:

        evidence.status = "failed"
        db.commit()

        raise HTTPException(
            status_code=502,
            detail=(
                "Evidence was extracted and saved "
                "successfully, but the investigation "
                "network could not be updated: "
                f"{exc}"
            ),
        ) from exc

    # -----------------------------------------------------
    # CREATE IMMUTABLE GRAPH VERSION
    # -----------------------------------------------------

    try:

        graph_version = create_graph_version(
            db=db,
            case_id=evidence.case_id,
            evidence_id=evidence.id,
        )

        db.commit()
        db.refresh(graph_version)

    except Exception as exc:

        db.rollback()

        evidence = db.get(
            Evidence,
            evidence_id,
        )

        if evidence:
            evidence.status = "failed"
            db.commit()

        raise HTTPException(
            status_code=500,
            detail=(
                "Network synchronization succeeded, "
                "but graph version creation failed: "
                f"{exc}"
            ),
        ) from exc

    # -----------------------------------------------------
    # COMPLETE
    # -----------------------------------------------------

    evidence = db.get(
        Evidence,
        evidence_id,
    )

    evidence.status = "analyzed"
    db.commit()

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return {
        "evidence_id": evidence_id,
        "status": evidence.status,

        "entities": [
            {
                "entity_id": entity.entity_id,
                "type": entity.type,
                "label": entity.label,
                "attributes": (
                    entity.attributes
                    or {}
                ),
            }
            for entity in saved_entities
        ],

        "relationships": [
            {
                "id": relationship.id,
                "source_id": relationship.source_id,
                "target_id": relationship.target_id,
                "type": relationship.type,
                "weight": relationship.weight,
                "confidence": relationship.confidence,
                "observed_at": (
                    relationship.observed_at
                ),
                "attributes": (
                    relationship.attributes
                    or {}
                ),
            }
            for relationship in saved_relationships
        ],

        "events": result.events,

        "network": {
            "case_id": graph_result[
                "case_id"
            ],
            "entities_synced": (
                graph_result[
                    "entities_synced"
                ]
            ),
            "relationships_synced": (
                graph_result[
                    "relationships_synced"
                ]
            ),
        },

        "graph_version": {
            "id": graph_version.id,
            "version_number": (
                graph_version.version_number
            ),
            "entity_count": (
                graph_version.entity_count
            ),
            "relationship_count": (
                graph_version.relationship_count
            ),
            "summary": (
                graph_version.summary
            ),
        },
    }