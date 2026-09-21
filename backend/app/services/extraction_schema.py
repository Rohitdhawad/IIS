"""Common investigation information schema for IIS extraction."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class ExtractedEntity(BaseModel):
    """An entity identified in evidence."""

    entity_id: Optional[str] = None

    type: str
    label: str

    attributes: dict[str, Any] = Field(
        default_factory=dict
    )

    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
    )

    evidence_id: Optional[int] = None

    source_text: Optional[str] = None


class ExtractedRelationship(BaseModel):
    """A relationship identified between investigation entities."""

    source: str
    target: str
    type: str

    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
    )

    evidence_id: Optional[int] = None

    source_text: Optional[str] = None

    observed_at: Optional[datetime] = None

    attributes: dict[str, Any] = Field(
        default_factory=dict
    )


class ExtractedEvent(BaseModel):
    """An event or activity identified in evidence."""

    event_type: str

    description: str

    timestamp: Optional[datetime] = None

    location: Optional[str] = None

    participants: list[str] = Field(
        default_factory=list
    )

    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
    )

    evidence_id: Optional[int] = None

    source_text: Optional[str] = None

    attributes: dict[str, Any] = Field(
        default_factory=dict
    )


class ExtractionResult(BaseModel):
    """Complete information extracted from one piece of evidence."""

    evidence_id: int

    entities: list[ExtractedEntity] = Field(
        default_factory=list
    )

    relationships: list[ExtractedRelationship] = Field(
        default_factory=list
    )

    events: list[ExtractedEvent] = Field(
        default_factory=list
    )