"""Extraction orchestration for IIS."""

from typing import Any

from app.services.ai_provider import AIProvider
from app.services.extraction_schema import ExtractionResult


class ExtractionEngine:
    """
    Orchestrates evidence extraction through an AI provider.

    This layer contains IIS extraction logic, while the provider
    handles communication with a particular AI model/service.
    """

    def __init__(self, provider: AIProvider):
        self.provider = provider

    async def extract(
        self,
        evidence_id: int,
        content: str,
    ) -> ExtractionResult:
        """
        Perform fast extraction from evidence.

        The evidence_id is assigned by IIS itself so that every
        extracted fact retains a reliable provenance reference.
        """

        if not content.strip():
            return ExtractionResult(
                evidence_id=evidence_id,
            )

        result = await self.provider.extract(
            content=content,
        )

        if not isinstance(result, dict):
            raise ValueError(
                "AI provider returned invalid extraction data."
            )

        result["evidence_id"] = evidence_id

        for entity in result.get("entities", []):
            entity["evidence_id"] = evidence_id

        for relationship in result.get("relationships", []):
            relationship["evidence_id"] = evidence_id

        for event in result.get("events", []):
            event["evidence_id"] = evidence_id

        return ExtractionResult.model_validate(result)

    async def reconcile(
        self,
        content: str,
        findings: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """
        Reconcile conflicting or incomplete extraction findings.
        """

        if not content.strip():
            return {
                "entities": [],
                "relationships": [],
                "events": [],
            }

        return await self.provider.reconcile(
            content=content,
            findings=findings,
        )

    async def analyze(
        self,
        investigation_context: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Perform deeper intelligence analysis.
        """

        return await self.provider.analyze(
            investigation_context=investigation_context,
        )