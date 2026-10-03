"""
Actionable intelligence generation for IIS.

Converts network-analysis signals into investigator-oriented leads.
The service does not determine guilt or criminal intent.
"""

from collections import defaultdict
from typing import Any

from sqlalchemy.orm import Session

from app.models import Entity, Relationship
from app.services.network_intelligence import (
    network_intelligence_service,
)


class ActionableIntelligenceService:
    """Builds prioritized intelligence from network signals."""

    PRIORITY_ORDER = {
        "CRITICAL": 4,
        "HIGH": 3,
        "MEDIUM": 2,
        "LOW": 1,
    }

    PATTERN_PRIORITY = {
        "NETWORK_BRIDGE": "HIGH",
        "SHARED_IDENTIFIER": "HIGH",
        "RELATIONSHIP_CONCENTRATION": "HIGH",
        "HIGH_CONNECTIVITY": "HIGH",
        "DENSE_CLUSTER": "MEDIUM",
        "TEMPORAL_ACTIVITY": "MEDIUM",
        "RECIPROCAL_RELATIONSHIP": "MEDIUM",
        "MULTI_RELATIONSHIP_ENTITY": "MEDIUM",
        "LOW_CONFIDENCE_KEY_LINK": "MEDIUM",
        "CROSS_DOMAIN_CONNECTION": "MEDIUM",
        "LOCAL_CLUSTER": "LOW",
    }

    PATTERN_ACTIONS = {
        "NETWORK_BRIDGE": (
            "Review the entity's connections across the "
            "identified communities and verify the evidence "
            "supporting those cross-community links."
        ),
        "SHARED_IDENTIFIER": (
            "Review the evidence connecting the shared "
            "identifier to each person and determine whether "
            "the association is independently supported."
        ),
        "RELATIONSHIP_CONCENTRATION": (
            "Review the entity's strongest and most recent "
            "connections to understand why a large portion "
            "of the network is concentrated around it."
        ),
        "HIGH_CONNECTIVITY": (
            "Review the entity's connected people, "
            "organizations, communication links and other "
            "cross-domain relationships."
        ),
        "DENSE_CLUSTER": (
            "Review the members and internal relationships "
            "of this dense cluster for recurring connections "
            "or shared evidence."
        ),
        "TEMPORAL_ACTIVITY": (
            "Review the evidence and timestamps around the "
            "concentrated activity period."
        ),
        "RECIPROCAL_RELATIONSHIP": (
            "Review the supporting evidence for both "
            "directions of the relationship."
        ),
        "MULTI_RELATIONSHIP_ENTITY": (
            "Review each relationship type separately and "
            "compare the supporting evidence."
        ),
        "LOW_CONFIDENCE_KEY_LINK": (
            "Review the supporting evidence and manually "
            "verify the relationship."
        ),
    }

    def _priority_for_finding(
        self,
        finding: dict[str, Any],
    ) -> str:
        pattern_type = finding.get("type")

        explicit = finding.get("severity")

        if explicit in self.PRIORITY_ORDER:
            priority = explicit
        else:
            priority = self.PATTERN_PRIORITY.get(
                pattern_type,
                "MEDIUM",
            )

        if pattern_type == "LOW_CONFIDENCE_KEY_LINK":
            return "MEDIUM"

        return priority

    def _score(
        self,
        finding: dict[str, Any],
        priority: str,
    ) -> float:
        base = {
            "CRITICAL": 85,
            "HIGH": 70,
            "MEDIUM": 50,
            "LOW": 30,
        }.get(priority, 40)

        confidence = finding.get(
            "confidence"
        )

        if confidence is not None:
            base -= (1.0 - confidence) * 15

        return round(
            max(0.0, min(100.0, base)),
            1,
        )

    def _build_intelligence_item(
        self,
        finding: dict[str, Any],
    ) -> dict[str, Any]:
        pattern_type = finding.get(
            "type",
            "UNKNOWN_PATTERN",
        )

        priority = self._priority_for_finding(
            finding
        )

        score = self._score(
            finding,
            priority,
        )

        entity_label = finding.get(
            "entity_label"
        )

        action = self.PATTERN_ACTIONS.get(
            pattern_type,
            (
                "Review the supporting evidence and "
                "verify the detected network pattern."
            ),
        )

        signals = [
            f"Pattern: {pattern_type}",
        ]

        if finding.get("reason"):
            signals.append(
                finding["reason"]
            )

        confidence = finding.get(
            "confidence"
        )

        if confidence is not None:
            signals.append(
                f"Confidence: {confidence:.0%}"
            )

        return {
            "id": (
                f"intelligence-"
                f"{pattern_type.lower()}-"
                f"{finding.get('entity_id', 'network')}-"
                f"{finding.get('relationship_id', 'signal')}"
            ),
            "category": pattern_type,
            "priority": priority,
            "score": score,
            "title": finding.get(
                "message",
                "Investigation pattern detected.",
            ),
            "entity_id": finding.get(
                "entity_id"
            ),
            "entity_type": finding.get(
                "entity_type"
            ),
            "entity_label": entity_label,
            "relationship_id": finding.get(
                "relationship_id"
            ),
            "summary": finding.get(
                "reason",
                "A structural pattern was detected "
                "in the investigation network.",
            ),
            "why_it_matters": (
                self._why_it_matters(
                    pattern_type
                )
            ),
            "signals": signals,
            "recommended_action": action,
        }

    def _why_it_matters(
        self,
        pattern_type: str,
    ) -> str:
        explanations = {
            "NETWORK_BRIDGE": (
                "A bridge entity can connect otherwise "
                "separate parts of the network and may "
                "help investigators trace how communities "
                "are related."
            ),
            "SHARED_IDENTIFIER": (
                "A shared phone, vehicle or account can "
                "provide a useful link between multiple "
                "entities and should be verified against "
                "the underlying evidence."
            ),
            "RELATIONSHIP_CONCENTRATION": (
                "A large concentration of network connections "
                "around one entity can make that entity an "
                "important point for further investigation."
            ),
            "HIGH_CONNECTIVITY": (
                "Highly connected entities can provide useful "
                "starting points when tracing network structure."
            ),
            "DENSE_CLUSTER": (
                "A dense cluster contains a high concentration "
                "of internal connections, making its members "
                "useful subjects for further relationship analysis."
            ),
            "TEMPORAL_ACTIVITY": (
                "Concentrated activity within a short time "
                "window can reveal periods that warrant closer "
                "timeline and evidence review."
            ),
            "RECIPROCAL_RELATIONSHIP": (
                "Two-way relationships provide additional "
                "structural evidence of interaction between "
                "the connected entities."
            ),
            "MULTI_RELATIONSHIP_ENTITY": (
                "Multiple relationship types can reveal "
                "different forms of interaction around the "
                "same entity."
            ),
            "LOW_CONFIDENCE_KEY_LINK": (
                "A structurally relevant relationship with "
                "lower extraction confidence should be verified "
                "before being treated as established evidence."
            ),
            "CROSS_DOMAIN_CONNECTION": (
                "Cross-domain connections can reveal links "
                "between different categories of entities."
            ),
        }

        return explanations.get(
            pattern_type,
            (
                "The detected pattern provides an analytical "
                "signal that may help guide further investigation."
            ),
        )

    def analyze(
        self,
        db: Session,
        case_id: str,
    ) -> dict[str, Any]:
        analysis = network_intelligence_service.analyze_case(
            db,
            case_id,
        )

        leads = []

        for finding in analysis["findings"]:
            leads.append(
                self._build_intelligence_item(
                    finding
                )
            )

        leads.sort(
            key=lambda item: (
                self.PRIORITY_ORDER.get(
                    item["priority"],
                    0,
                ),
                item["score"],
            ),
            reverse=True,
        )

        for index, lead in enumerate(
            leads,
            start=1,
        ):
            lead["rank"] = index

        priority_counts = defaultdict(int)
        category_counts = defaultdict(int)

        for lead in leads:
            priority_counts[
                lead["priority"]
            ] += 1

            category_counts[
                lead["category"]
            ] += 1

        return {
            "case_id": case_id,
            "statistics": {
                "total_intelligence": len(leads),
                "critical": priority_counts[
                    "CRITICAL"
                ],
                "high": priority_counts[
                    "HIGH"
                ],
                "medium": priority_counts[
                    "MEDIUM"
                ],
                "low": priority_counts[
                    "LOW"
                ],
                "categories": dict(
                    category_counts
                ),
            },
            "intelligence": leads,
        }


actionable_intelligence_service = (
    ActionableIntelligenceService()
)