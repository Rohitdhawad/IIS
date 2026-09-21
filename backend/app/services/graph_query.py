from typing import Any

from app.config import settings
from app.services.neo4j_service import neo4j_service


class GraphQueryService:
    """Read focused investigation-network views from Neo4j."""

    def get_case_graph(
        self,
        case_id: str,
        entity_id: str | None = None,
        depth: int = 2,
        entity_type: str | None = None,
        relationship_type: str | None = None,
        limit: int = 100,
    ) -> dict[str, Any]:

        depth = max(1, min(depth, 5))
        limit = max(1, min(limit, 500))

        with neo4j_service.driver.session(
            database=settings.NEO4J_DATABASE
        ) as session:

            if entity_id:
                return self._focused_graph(
                    session=session,
                    case_id=case_id,
                    entity_id=entity_id,
                    depth=depth,
                    entity_type=entity_type,
                    relationship_type=relationship_type,
                    limit=limit,
                )

            return self._case_graph(
                session=session,
                case_id=case_id,
                entity_type=entity_type,
                relationship_type=relationship_type,
                limit=limit,
            )

    def _case_graph(
        self,
        session,
        case_id: str,
        entity_type: str | None,
        relationship_type: str | None,
        limit: int,
    ) -> dict[str, Any]:

        entity_filters = ["e.case_id = $case_id"]

        if entity_type:
            entity_filters.append("e.type = $entity_type")

        entity_query = f"""
        MATCH (e:Entity)
        WHERE {" AND ".join(entity_filters)}
        RETURN e
        LIMIT $limit
        """

        entity_result = session.run(
            entity_query,
            case_id=case_id,
            entity_type=entity_type,
            limit=limit,
        )

        nodes = {}

        for record in entity_result:
            node = record["e"]

            nodes[node["entity_id"]] = {
                "id": node["entity_id"],
                "type": node.get("type"),
                "label": node.get("label"),
                "case_id": node.get("case_id"),
            }

        relationships = {}

        relationship_filters = [
            "e.case_id = $case_id",
            "connected.case_id = $case_id",
        ]

        if entity_type:
            relationship_filters.append("e.type = $entity_type")

        if relationship_type:
            relationship_filters.append(
                "r.type = $relationship_type"
            )

        relationship_query = f"""
        MATCH (e:Entity)-[r:RELATED]-(connected:Entity)
        WHERE {" AND ".join(relationship_filters)}

        RETURN
            e,
            r,
            connected

        LIMIT $limit
        """

        relationship_result = session.run(
            relationship_query,
            case_id=case_id,
            entity_type=entity_type,
            relationship_type=relationship_type,
            limit=limit,
        )

        for record in relationship_result:
            source = record["e"]
            relationship = record["r"]
            target = record["connected"]

            for node in (source, target):
                nodes[node["entity_id"]] = {
                    "id": node["entity_id"],
                    "type": node.get("type"),
                    "label": node.get("label"),
                    "case_id": node.get("case_id"),
                }

            relationship_id = relationship.get(
                "relationship_id",
                str(relationship.id),
            )

            relationships[str(relationship_id)] = {
                "id": str(relationship_id),
                "source": relationship.start_node["entity_id"],
                "target": relationship.end_node["entity_id"],
                "type": relationship.get("type"),
                "weight": relationship.get("weight", 1),
                "observed_at": relationship.get("observed_at"),
            }

        return {
            "nodes": list(nodes.values()),
            "relationships": list(relationships.values()),
        }

    def _focused_graph(
        self,
        session,
        case_id: str,
        entity_id: str,
        depth: int,
        entity_type: str | None,
        relationship_type: str | None,
        limit: int,
    ) -> dict[str, Any]:

        entity_filters = [
            "e.case_id = $case_id",
            "e.entity_id = $entity_id",
        ]

        if entity_type:
            entity_filters.append("e.type = $entity_type")

        query = f"""
        MATCH (e:Entity)
        WHERE {" AND ".join(entity_filters)}

        OPTIONAL MATCH path = (e)-[*1..{depth}]-(connected:Entity)

        WHERE connected.case_id = $case_id

        RETURN
            e,
            collect(path) AS paths

        LIMIT 1
        """

        result = session.run(
            query,
            case_id=case_id,
            entity_id=entity_id,
            entity_type=entity_type,
        )

        record = result.single()

        if not record:
            return {
                "nodes": [],
                "relationships": [],
            }

        nodes = {}

        root = record["e"]

        nodes[root["entity_id"]] = {
            "id": root["entity_id"],
            "type": root.get("type"),
            "label": root.get("label"),
            "case_id": root.get("case_id"),
        }

        relationships = {}

        for path in record["paths"]:
            if path is None:
                continue

            for node in path.nodes:
                nodes[node["entity_id"]] = {
                    "id": node["entity_id"],
                    "type": node.get("type"),
                    "label": node.get("label"),
                    "case_id": node.get("case_id"),
                }

            for relationship in path.relationships:
                if (
                    relationship_type
                    and relationship.get("type") != relationship_type
                ):
                    continue

                relationship_id = relationship.get(
                    "relationship_id",
                    str(relationship.id),
                )

                relationships[str(relationship_id)] = {
                    "id": str(relationship_id),
                    "source": relationship.start_node["entity_id"],
                    "target": relationship.end_node["entity_id"],
                    "type": relationship.get("type"),
                    "weight": relationship.get("weight", 1),
                    "observed_at": relationship.get("observed_at"),
                }

        return {
            "nodes": list(nodes.values())[:limit],
            "relationships": list(relationships.values())[:limit],
        }


graph_query_service = GraphQueryService()