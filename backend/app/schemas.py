"""API response schemas for IIS extracted evidence."""
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class CaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None


class CaseSummaryOut(CaseOut):
    num_entities: int
    num_relationships: int


class EntityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    entity_id: str
    case_id: str
    type: str
    label: str
    attributes: dict[str, Any] = {}


class RelationshipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    source_id: str
    target_id: str
    type: str
    weight: int
    confidence: float
    observed_at: Optional[datetime] = None
    attributes: dict[str, Any] = {}


class EntityEvidenceOut(BaseModel):
    entity_id: str
    outgoing_relationships: list[RelationshipOut]
    incoming_relationships: list[RelationshipOut]
