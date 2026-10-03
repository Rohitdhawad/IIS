"""
Network intelligence and suspicious-pattern analysis for IIS.

All findings are derived from the investigation graph stored in PostgreSQL.
The service reports structural signals and analytical patterns; it does not
determine guilt or criminal intent.
"""

from collections import defaultdict, deque
from typing import Any

from sqlalchemy.orm import Session

from app.models import Entity, Relationship


class NetworkIntelligenceService:
    """Analyzes investigation networks using graph-based signals."""

    def _load_graph(
        self,
        db: Session,
        case_id: str,
    ):
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

        entity_map = {
            entity.entity_id: entity
            for entity in entities
        }

        adjacency = defaultdict(list)

        for relationship in relationships:
            adjacency[relationship.source_id].append(
                {
                    "relationship": relationship,
                    "other_id": relationship.target_id,
                }
            )

            adjacency[relationship.target_id].append(
                {
                    "relationship": relationship,
                    "other_id": relationship.source_id,
                }
            )

        return (
            entities,
            relationships,
            entity_map,
            adjacency,
        )

    @staticmethod
    def _relationship_weight(
        relationship: Relationship,
    ) -> float:
        return max(
            0.0,
            float(relationship.weight or 1)
            * float(relationship.confidence or 1.0),
        )

    def _build_communities(
        self,
        entities,
        adjacency,
    ):
        visited = set()
        communities = []

        for entity in entities:
            if entity.entity_id in visited:
                continue

            queue = deque([entity.entity_id])
            visited.add(entity.entity_id)
            member_ids = []

            while queue:
                current_id = queue.popleft()
                member_ids.append(current_id)

                for item in adjacency.get(current_id, []):
                    other_id = item["other_id"]

                    if other_id not in visited:
                        visited.add(other_id)
                        queue.append(other_id)

            communities.append(member_ids)

        return communities

    def _entity_metrics(
        self,
        entities,
        adjacency,
    ):
        metrics = []

        for entity in entities:
            neighbors = adjacency.get(
                entity.entity_id,
                [],
            )

            relationship_types = sorted(
                {
                    item["relationship"].type
                    for item in neighbors
                }
            )

            connected_types = sorted(
                {
                    item["relationship"].case_id
                    for item in neighbors
                    if item["relationship"].case_id
                }
            )

            weighted_degree = sum(
                self._relationship_weight(
                    item["relationship"]
                )
                for item in neighbors
            )

            metrics.append(
                {
                    "entity": entity,
                    "degree": len(neighbors),
                    "weighted_degree": round(
                        weighted_degree,
                        2,
                    ),
                    "relationship_count": len(neighbors),
                    "relationship_types": relationship_types,
                    "connected_entity_types": connected_types,
                }
            )

        metrics.sort(
            key=lambda item: (
                item["weighted_degree"],
                item["degree"],
            ),
            reverse=True,
        )

        return metrics

    def _detect_bridge_entities(
        self,
        entities,
        adjacency,
        entity_map,
        communities,
    ):
        """
        Identify entities whose direct neighbors belong to multiple
        connected components when the entity itself is temporarily removed.
        """

        findings = []

        if len(communities) <= 1:
            return findings

        base_community_map = {}

        for index, member_ids in enumerate(communities, start=1):
            for entity_id in member_ids:
                base_community_map[entity_id] = index

        for entity in entities:
            neighbors = adjacency.get(
                entity.entity_id,
                [],
            )

            if len(neighbors) < 2:
                continue

            neighbor_communities = {
                base_community_map.get(
                    item["other_id"]
                )
                for item in neighbors
            }

            neighbor_communities.discard(None)

            if len(neighbor_communities) < 2:
                continue

            findings.append(
                {
                    "type": "NETWORK_BRIDGE",
                    "severity": "HIGH",
                    "entity_id": entity.entity_id,
                    "entity_label": entity.label,
                    "message": (
                        f"{entity.label} connects multiple "
                        "network communities."
                    ),
                    "reason": (
                        f"The entity has {len(neighbors)} direct "
                        f"connections spanning "
                        f"{len(neighbor_communities)} network "
                        "communities."
                    ),
                }
            )

        return findings

    def _detect_dense_clusters(
        self,
        entities,
        adjacency,
        communities,
    ):
        findings = []

        entity_sets = {
            entity.entity_id
            for entity in entities
        }

        for index, member_ids in enumerate(
            communities,
            start=1,
        ):
            size = len(member_ids)

            if size < 3:
                continue

            member_set = set(member_ids)

            possible_edges = size * (size - 1)

            if possible_edges <= 0:
                continue

            internal_edges = 0

            for entity_id in member_ids:
                for item in adjacency.get(
                    entity_id,
                    [],
                ):
                    if item["other_id"] in member_set:
                        internal_edges += 1

            density = internal_edges / possible_edges

            if density < 0.50:
                continue

            findings.append(
                {
                    "type": "DENSE_CLUSTER",
                    "severity": "MEDIUM",
                    "message": (
                        f"Community {index} forms a dense "
                        "relationship cluster."
                    ),
                    "reason": (
                        f"The {size}-entity community has "
                        f"{density:.0%} observed connection density."
                    ),
                }
            )

        return findings

    def _detect_shared_identifiers(
        self,
        entities,
        adjacency,
        entity_map,
    ):
        findings = []

        identifier_types = {
            "phone",
            "vehicle",
            "account",
            "accountreference",
        }

        for identifier in entities:
            if identifier.type.lower() not in identifier_types:
                continue

            connected_people = []

            for item in adjacency.get(
                identifier.entity_id,
                [],
            ):
                other = entity_map.get(
                    item["other_id"]
                )

                if (
                    other
                    and other.type.lower() == "person"
                ):
                    connected_people.append(other)

            unique_people = {
                person.entity_id
                for person in connected_people
            }

            if len(unique_people) < 2:
                continue

            names = [
                entity_map[person_id].label
                for person_id in unique_people
                if person_id in entity_map
            ]

            findings.append(
                {
                    "type": "SHARED_IDENTIFIER",
                    "severity": "HIGH",
                    "entity_id": identifier.entity_id,
                    "entity_label": identifier.label,
                    "message": (
                        f"{identifier.label} is linked to "
                        f"{len(unique_people)} people."
                    ),
                    "reason": (
                        f"A shared {identifier.type} is connected "
                        f"to multiple Person entities: "
                        f"{', '.join(names[:6])}."
                    ),
                }
            )

        return findings

    def _detect_reciprocal_relationships(
        self,
        relationships,
    ):
        findings = []

        directed_pairs = defaultdict(list)

        for relationship in relationships:
            directed_pairs[
                (
                    relationship.source_id,
                    relationship.target_id,
                    relationship.type,
                )
            ].append(relationship)

        seen = set()

        for relationship in relationships:
            key = (
                relationship.source_id,
                relationship.target_id,
                relationship.type,
            )

            reverse_key = (
                relationship.target_id,
                relationship.source_id,
                relationship.type,
            )

            if key in seen:
                continue

            if reverse_key not in directed_pairs:
                continue

            seen.add(key)
            seen.add(reverse_key)

            findings.append(
                {
                    "type": "RECIPROCAL_RELATIONSHIP",
                    "severity": "MEDIUM",
                    "relationship_id": relationship.id,
                    "entity_id": relationship.source_id,
                    "message": (
                        f"Reciprocal {relationship.type} "
                        "relationship detected."
                    ),
                    "reason": (
                        "The same relationship type is represented "
                        "in both directions between the two entities."
                    ),
                }
            )

        return findings

    def _detect_relationship_concentration(
        self,
        entities,
        adjacency,
    ):
        findings = []

        if not entities:
            return findings

        degrees = {
            entity.entity_id: len(
                adjacency.get(
                    entity.entity_id,
                    [],
                )
            )
            for entity in entities
        }

        total_degree = sum(degrees.values())

        if total_degree <= 0:
            return findings

        for entity in entities:
            degree = degrees[entity.entity_id]

            share = degree / total_degree

            if degree < 4 or share < 0.20:
                continue

            findings.append(
                {
                    "type": "RELATIONSHIP_CONCENTRATION",
                    "severity": "HIGH",
                    "entity_id": entity.entity_id,
                    "entity_label": entity.label,
                    "message": (
                        f"{entity.label} accounts for a "
                        "large share of network connections."
                    ),
                    "reason": (
                        f"{degree} direct connections represent "
                        f"{share:.0%} of the graph's total degree."
                    ),
                }
            )

        return findings

    def _detect_temporal_activity(
        self,
        relationships,
        entity_map,
    ):
        findings = []

        entity_times = defaultdict(list)

        for relationship in relationships:
            if not relationship.observed_at:
                continue

            entity_times[
                relationship.source_id
            ].append(
                relationship.observed_at
            )

            entity_times[
                relationship.target_id
            ].append(
                relationship.observed_at
            )

        for entity_id, timestamps in entity_times.items():
            if len(timestamps) < 3:
                continue

            timestamps.sort()

            max_window_count = 0

            for index, start in enumerate(
                timestamps
            ):
                count = 0

                for timestamp in timestamps[index:]:
                    delta = timestamp - start

                    if delta.total_seconds() <= 86400:
                        count += 1
                    else:
                        break

                max_window_count = max(
                    max_window_count,
                    count,
                )

            if max_window_count < 3:
                continue

            entity = entity_map.get(entity_id)

            if not entity:
                continue

            findings.append(
                {
                    "type": "TEMPORAL_ACTIVITY",
                    "severity": "MEDIUM",
                    "entity_id": entity_id,
                    "entity_label": entity.label,
                    "message": (
                        f"Concentrated relationship activity "
                        f"detected around {entity.label}."
                    ),
                    "reason": (
                        f"{max_window_count} observed relationship "
                        "events occurred within a 24-hour window."
                    ),
                }
            )

        return findings

    def _detect_existing_patterns(
        self,
        entities,
        relationships,
        adjacency,
    ):
        findings = []

        for entity in entities:
            neighbors = adjacency.get(
                entity.entity_id,
                [],
            )

            degree = len(neighbors)

            if degree >= 5:
                findings.append(
                    {
                        "type": "HIGH_CONNECTIVITY",
                        "severity": "HIGH",
                        "entity_id": entity.entity_id,
                        "entity_label": entity.label,
                        "message": (
                            f"{entity.label} has high network "
                            "connectivity."
                        ),
                        "reason": (
                            f"The entity has {degree} direct "
                            "network connections."
                        ),
                    }
                )

            relationship_types = {
                item["relationship"].type
                for item in neighbors
            }

            if len(relationship_types) >= 3:
                findings.append(
                    {
                        "type": "MULTI_RELATIONSHIP_ENTITY",
                        "severity": "MEDIUM",
                        "entity_id": entity.entity_id,
                        "entity_label": entity.label,
                        "message": (
                            f"{entity.label} participates in "
                            "multiple relationship types."
                        ),
                        "reason": (
                            f"{len(relationship_types)} different "
                            "relationship types were observed."
                        ),
                    }
                )

        for relationship in relationships:
            if relationship.confidence < 0.65:
                findings.append(
                    {
                        "type": "LOW_CONFIDENCE_KEY_LINK",
                        "severity": "MEDIUM",
                        "entity_id": relationship.source_id,
                        "relationship_id": relationship.id,
                        "message": (
                            "Low-confidence relationship "
                            "requires verification."
                        ),
                        "reason": (
                            f"Relationship {relationship.type} "
                            f"has {relationship.confidence:.0%} "
                            "confidence."
                        ),
                        "confidence": relationship.confidence,
                    }
                )

        return findings

    def _build_findings(
        self,
        entities,
        relationships,
        entity_map,
        adjacency,
        communities,
    ):
        findings = []

        findings.extend(
            self._detect_existing_patterns(
                entities,
                relationships,
                adjacency,
            )
        )

        findings.extend(
            self._detect_bridge_entities(
                entities,
                adjacency,
                entity_map,
                communities,
            )
        )

        findings.extend(
            self._detect_dense_clusters(
                entities,
                adjacency,
                communities,
            )
        )

        findings.extend(
            self._detect_shared_identifiers(
                entities,
                adjacency,
                entity_map,
            )
        )

        findings.extend(
            self._detect_reciprocal_relationships(
                relationships,
            )
        )

        findings.extend(
            self._detect_relationship_concentration(
                entities,
                adjacency,
            )
        )

        findings.extend(
            self._detect_temporal_activity(
                relationships,
                entity_map,
            )
        )

        return findings

    def analyze_case(
        self,
        db: Session,
        case_id: str,
    ) -> dict[str, Any]:
        (
            entities,
            relationships,
            entity_map,
            adjacency,
        ) = self._load_graph(
            db,
            case_id,
        )

        communities = self._build_communities(
            entities,
            adjacency,
        )

        metrics = self._entity_metrics(
            entities,
            adjacency,
        )

        key_entities = []

        for rank, metric in enumerate(
            metrics,
            start=1,
        ):
            entity = metric["entity"]

            connected_entity_types = sorted(
                {
                    entity_map[item["other_id"]].type
                    for item in adjacency.get(
                        entity.entity_id,
                        [],
                    )
                    if item["other_id"]
                    in entity_map
                }
            )

            key_entities.append(
                {
                    "entity_id": entity.entity_id,
                    "label": entity.label,
                    "type": entity.type,
                    "degree": metric["degree"],
                    "weighted_degree": metric[
                        "weighted_degree"
                    ],
                    "relationship_count": metric[
                        "relationship_count"
                    ],
                    "relationship_types": metric[
                        "relationship_types"
                    ],
                    "connected_entity_types":
                        connected_entity_types,
                    "rank": rank,
                }
            )

        findings = self._build_findings(
            entities,
            relationships,
            entity_map,
            adjacency,
            communities,
        )

        community_output = []

        for community_id, member_ids in enumerate(
            communities,
            start=1,
        ):
            member_entities = [
                entity_map[entity_id]
                for entity_id in member_ids
                if entity_id in entity_map
            ]

            community_output.append(
                {
                    "community_id": community_id,
                    "size": len(member_entities),
                    "entity_ids": member_ids,
                    "entities": [
                        {
                            "id": entity.entity_id,
                            "label": entity.label,
                            "type": entity.type,
                        }
                        for entity in member_entities
                    ],
                }
            )

        return {
            "case_id": case_id,
            "statistics": {
                "entities": len(entities),
                "relationships": len(relationships),
                "communities": len(communities),
                "findings": len(findings),
            },
            "key_entities": key_entities,
            "communities": community_output,
            "findings": findings,
        }

    def find_shortest_path(
        self,
        db: Session,
        case_id: str,
        source_id: str,
        target_id: str,
    ):
        (
            entities,
            relationships,
            entity_map,
            adjacency,
        ) = self._load_graph(
            db,
            case_id,
        )

        if (
            source_id not in entity_map
            or target_id not in entity_map
        ):
            return None

        queue = deque([source_id])
        previous = {
            source_id: None,
        }

        while queue:
            current = queue.popleft()

            if current == target_id:
                break

            for item in adjacency.get(
                current,
                [],
            ):
                neighbor = item["other_id"]

                if neighbor in previous:
                    continue

                previous[neighbor] = current
                queue.append(neighbor)

        if target_id not in previous:
            return {
                "case_id": case_id,
                "found": False,
                "source": {
                    "id": source_id,
                    "label": entity_map[
                        source_id
                    ].label,
                    "type": entity_map[
                        source_id
                    ].type,
                },
                "target": {
                    "id": target_id,
                    "label": entity_map[
                        target_id
                    ].label,
                    "type": entity_map[
                        target_id
                    ].type,
                },
            }

        entity_ids = []
        current = target_id

        while current is not None:
            entity_ids.append(current)
            current = previous[current]

        entity_ids.reverse()

        relationship_ids = []

        for index in range(
            len(entity_ids) - 1
        ):
            current_id = entity_ids[index]
            next_id = entity_ids[index + 1]

            relationship_id = None

            for item in adjacency.get(
                current_id,
                [],
            ):
                if (
                    item["other_id"]
                    == next_id
                ):
                    relationship_id = (
                        item["relationship"].id
                    )
                    break

            if relationship_id is not None:
                relationship_ids.append(
                    relationship_id
                )

        return {
            "case_id": case_id,
            "found": True,
            "source": {
                "id": source_id,
                "label": entity_map[
                    source_id
                ].label,
                "type": entity_map[
                    source_id
                ].type,
            },
            "target": {
                "id": target_id,
                "label": entity_map[
                    target_id
                ].label,
                "type": entity_map[
                    target_id
                ].type,
            },
            "distance": len(entity_ids) - 1,
            "entity_ids": entity_ids,
            "relationships": relationship_ids,
        }

    def analyze_entity(
        self,
        db: Session,
        case_id: str,
        entity_id: str,
    ):
        result = self.analyze_case(
            db,
            case_id,
        )

        for entity in result["key_entities"]:
            if entity["entity_id"] == entity_id:
                entity_findings = [
                    finding
                    for finding in result["findings"]
                    if finding.get("entity_id")
                    == entity_id
                ]

                return {
                    "case_id": case_id,
                    "entity": entity,
                    "findings": entity_findings,
                }

        return None


network_intelligence_service = NetworkIntelligenceService()