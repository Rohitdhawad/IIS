from sqlalchemy.orm import Session

from app.config import settings
from app.models import Entity, Relationship
from app.services.neo4j_service import neo4j_service


class GraphSyncService:
    """Synchronizes the investigation network from PostgreSQL into Neo4j."""

    def sync_case(self, db: Session, case_id: str) -> dict:
        entities = (
            db.query(Entity)
            .filter(Entity.case_id == case_id)
            .all()
        )

        relationships = (
            db.query(Relationship)
            .filter(Relationship.case_id == case_id)
            .all()
        )

        with neo4j_service.driver.session(
            database=settings.NEO4J_DATABASE
        ) as session:

            # -------------------------------------------------
            # CREATE / UPDATE ENTITY NODES
            # -------------------------------------------------

            for entity in entities:
                session.run(
                    """
                    MERGE (e:Entity {entity_id: $entity_id})
                    SET
                        e.case_id = $case_id,
                        e.type = $type,
                        e.label = $label
                    """,
                    entity_id=entity.entity_id,
                    case_id=entity.case_id,
                    type=entity.type,
                    label=entity.label,
                )

            # -------------------------------------------------
            # CREATE / UPDATE RELATIONSHIPS
            # -------------------------------------------------

            for relationship in relationships:
                session.run(
                    """
                    MATCH (source:Entity {entity_id: $source_id})
                    MATCH (target:Entity {entity_id: $target_id})

                    MERGE (
                        source
                    )-[r:RELATED {
                        relationship_id: $relationship_id
                    }]->(
                        target
                    )

                    SET
                        r.case_id = $case_id,
                        r.type = $type,
                        r.weight = $weight,
                        r.confidence = $confidence,
                        r.observed_at = $observed_at
                    """,
                    relationship_id=relationship.id,
                    source_id=relationship.source_id,
                    target_id=relationship.target_id,
                    case_id=relationship.case_id,
                    type=relationship.type,
                    weight=relationship.weight,
                    confidence=relationship.confidence,
                    observed_at=(
                        relationship.observed_at.isoformat()
                        if relationship.observed_at
                        else None
                    ),
                )

        return {
            "case_id": case_id,
            "entities_synced": len(entities),
            "relationships_synced": len(relationships),
        }


graph_sync_service = GraphSyncService()