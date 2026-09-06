"""
Pydantic schemas for API responses.
"""
from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel, ConfigDict


class CaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None


class CaseSummaryOut(CaseOut):
    num_phases: int
    num_entities: int
    num_relationships: int


class EntityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    entity_id: str
    case_id: Optional[str] = None
    type: str
    label: str
    raw_actor_id: Optional[str] = None
    attributes: dict = {}


class RelationshipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    source_id: str
    target_id: str
    type: str
    weight: int
    phase: Optional[int] = None


class PhaseSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    phase: int
    num_actors: int
    num_calls: int
    num_communities: int
    bridge_entities: list[str] = []


class EntityPhaseMetricOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    entity_id: str
    phase: int
    degree: int
    degree_weighted: int
    betweenness: float
    num_communities_touched: int
    is_bridge_candidate: bool
    bridged_communities: list[str] = []
    reasons: list[str] = []
    rank: int


class EntityEvidenceOut(BaseModel):
    entity_id: str
    phase: Optional[int] = None
    outgoing_calls: list[dict[str, Any]] = []
    incoming_calls: list[dict[str, Any]] = []
