"""
Gemini extraction provider for IIS.

Responsibilities:
- Send investigation evidence to Gemini.
- Force a strict JSON response.
- Normalize and validate the returned entities,
  relationships and events.
- Never write directly to PostgreSQL or Neo4j.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

import httpx

from app.config import settings


# =========================================================
# RESULT TYPES
# =========================================================

@dataclass
class ExtractedEntity:
    type: str
    label: str
    attributes: dict[str, Any] = field(default_factory=dict)
    source_text: str = ""
    confidence: float = 0.0


@dataclass
class ExtractedRelationship:
    source: str
    target: str
    type: str
    attributes: dict[str, Any] = field(default_factory=dict)
    source_text: str = ""
    confidence: float = 0.0
    observed_at: datetime | None = None


@dataclass
class ExtractionResult:
    entities: list[ExtractedEntity] = field(default_factory=list)
    relationships: list[ExtractedRelationship] = field(
        default_factory=list
    )
    events: list[dict[str, Any]] = field(default_factory=list)
    raw_response: dict[str, Any] | None = None


# =========================================================
# ALLOWED ENTITY TYPES
# =========================================================

ALLOWED_ENTITY_TYPES = {
    "Person",
    "Organization",
    "Location",
    "Vehicle",
    "Phone",
    "Account",
    "AccountReference",
}


# =========================================================
# ALLOWED RELATIONSHIP TYPES
# =========================================================

ALLOWED_RELATIONSHIP_TYPES = {
    "KNOWS",
    "ASSOCIATED_WITH",
    "CALLED",
    "CONTACTED",
    "TRANSFERRED_TO",
    "PAID",
    "RECEIVED",
    "OWNS",
    "OPERATES",
    "USES",
    "LOCATED_AT",
    "WORKS_FOR",
    "MEMBER_OF",
    "CONNECTED_TO",
    "TRAVELLED_TO",
    "MET_WITH",
    "RELATED_TO",
}


# =========================================================
# PROVIDER
# =========================================================

class GeminiProvider:
    """
    Thin REST client around the Gemini generateContent API.

    Keeping the provider isolated means the extraction pipeline
    does not depend on a particular Gemini SDK version.
    """

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
    ):
        self.api_key = (
            api_key or settings.GEMINI_API_KEY
        )

        self.model = (
            model or settings.GEMINI_MODEL
        )

        if not self.api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not configured."
            )

    # =====================================================
    # PUBLIC API
    # =====================================================

    async def extract(
        self,
        content: str,
        *,
        filename: str,
        source_type: str,
    ) -> ExtractionResult:

        if not content.strip():
            return ExtractionResult()

        prompt = self._build_prompt(
            content=content,
            filename=filename,
            source_type=source_type,
        )

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": prompt,
                        }
                    ],
                }
            ],
            "generationConfig": {
                "temperature": 0,
                "responseMimeType": "application/json",
            },
        }

        url = (
            "https://generativelanguage.googleapis.com/"
            f"v1beta/models/{self.model}:generateContent"
        )

        try:
            async with httpx.AsyncClient(
                timeout=120.0
            ) as client:

                response = await client.post(
                    url,
                    params={
                        "key": self.api_key,
                    },
                    json=payload,
                )

        except httpx.TimeoutException as exc:
            raise RuntimeError(
                "Gemini extraction timed out."
            ) from exc

        except httpx.HTTPError as exc:
            raise RuntimeError(
                f"Gemini request failed: {exc}"
            ) from exc

        if response.status_code != 200:
            detail = self._safe_error(response)

            raise RuntimeError(
                "Gemini extraction failed "
                f"({response.status_code}): {detail}"
            )

        try:
            response_json = response.json()

        except ValueError as exc:
            raise RuntimeError(
                "Gemini returned an invalid API response."
            ) from exc

        text = self._extract_response_text(
            response_json
        )

        parsed = self._parse_json(text)

        return self._normalize_result(
            parsed,
            raw_response=response_json,
        )

    # =====================================================
    # PROMPT
    # =====================================================

    def _build_prompt(
        self,
        *,
        content: str,
        filename: str,
        source_type: str,
    ) -> str:

        return f"""
You are the extraction engine of an investigation intelligence
system.

The system analyzes crime and intelligence-related evidence to
discover entities and relationships that are explicitly supported
by the supplied evidence.

SOURCE INFORMATION
------------------
Filename: {filename}
Source type: {source_type}

IMPORTANT RULES
---------------

1. Extract only information supported by the evidence.
2. Do not invent names, relationships, dates, phone numbers,
   vehicles, organizations or locations.
3. Do not decide that a person is guilty, criminal or a suspect.
4. A relationship means that the evidence indicates a connection
   between two extracted entities.
5. Preserve the wording of names and identifiers as they appear
   in the evidence where practical.
6. If the same entity appears multiple times, return it once.
7. Every entity and relationship should contain source_text showing
   the relevant evidence fragment.
8. confidence must be a number between 0 and 1.
9. If information is ambiguous, lower confidence instead of
   guessing.
10. Do not create an entity merely because a word looks like a name.
11. Do not create relationships unless both endpoints are present
    as entities.
12. Dates should be returned as ISO-8601 values when possible.
13. Extract useful attributes when clearly supported.
14. Keep the output concise and machine-readable.

ENTITY TYPES
------------

Only use these entity types:

Person
Organization
Location
Vehicle
Phone
Account
AccountReference

RELATIONSHIP TYPES
------------------

Prefer these relationship types:

KNOWS
ASSOCIATED_WITH
CALLED
CONTACTED
TRANSFERRED_TO
PAID
RECEIVED
OWNS
OPERATES
USES
LOCATED_AT
WORKS_FOR
MEMBER_OF
CONNECTED_TO
TRAVELLED_TO
MET_WITH
RELATED_TO

OUTPUT
------

Return ONLY valid JSON with this exact top-level structure:

{{
  "entities": [
    {{
      "type": "Person",
      "label": "Example Person",
      "attributes": {{}},
      "source_text": "relevant evidence",
      "confidence": 0.95
    }}
  ],
  "relationships": [
    {{
      "source": "Example Person",
      "target": "Example Organization",
      "type": "WORKS_FOR",
      "attributes": {{}},
      "source_text": "relevant evidence",
      "confidence": 0.9,
      "observed_at": null
    }}
  ],
  "events": []
}}

Do not wrap the JSON in Markdown.

EVIDENCE
--------

{content}
""".strip()

    # =====================================================
    # RESPONSE PARSING
    # =====================================================

    @staticmethod
    def _extract_response_text(
        response: dict[str, Any],
    ) -> str:

        candidates = (
            response.get("candidates")
            or []
        )

        if not candidates:
            raise RuntimeError(
                "Gemini returned no candidates."
            )

        parts = (
            candidates[0]
            .get("content", {})
            .get("parts", [])
        )

        text_parts = [
            part.get("text", "")
            for part in parts
            if isinstance(part, dict)
            and part.get("text")
        ]

        text = "\n".join(
            text_parts
        ).strip()

        if not text:
            raise RuntimeError(
                "Gemini returned an empty extraction response."
            )

        return text

    @staticmethod
    def _parse_json(
        text: str,
    ) -> dict[str, Any]:

        cleaned = text.strip()

        if cleaned.startswith("```"):
            cleaned = re.sub(
                r"^```(?:json)?\s*",
                "",
                cleaned,
                flags=re.IGNORECASE,
            )

            cleaned = re.sub(
                r"\s*```$",
                "",
                cleaned,
            )

        try:
            value = json.loads(cleaned)

        except json.JSONDecodeError as exc:

            start = cleaned.find("{")
            end = cleaned.rfind("}")

            if start == -1 or end == -1:
                raise RuntimeError(
                    "Gemini returned malformed extraction JSON."
                ) from exc

            try:
                value = json.loads(
                    cleaned[start : end + 1]
                )

            except json.JSONDecodeError as inner_exc:
                raise RuntimeError(
                    "Gemini returned malformed extraction JSON."
                ) from inner_exc

        if not isinstance(value, dict):
            raise RuntimeError(
                "Gemini extraction result must be a JSON object."
            )

        return value

    # =====================================================
    # NORMALIZATION
    # =====================================================

    def _normalize_result(
        self,
        data: dict[str, Any],
        *,
        raw_response: dict[str, Any],
    ) -> ExtractionResult:

        entities = self._normalize_entities(
            data.get("entities", [])
        )

        relationships = (
            self._normalize_relationships(
                data.get("relationships", []),
                entities,
            )
        )

        events = data.get(
            "events",
            [],
        )

        if not isinstance(events, list):
            events = []

        return ExtractionResult(
            entities=entities,
            relationships=relationships,
            events=events,
            raw_response=raw_response,
        )

    # =====================================================
    # ENTITY NORMALIZATION
    # =====================================================

    @staticmethod
    def _normalize_entities(
        raw_entities: Any,
    ) -> list[ExtractedEntity]:

        if not isinstance(
            raw_entities,
            list,
        ):
            return []

        normalized: list[
            ExtractedEntity
        ] = []

        seen: set[tuple[str, str]] = set()

        for item in raw_entities:

            if not isinstance(
                item,
                dict,
            ):
                continue

            entity_type = str(
                item.get("type", "")
            ).strip()

            label = str(
                item.get("label", "")
            ).strip()

            if (
                entity_type
                not in ALLOWED_ENTITY_TYPES
                or not label
            ):
                continue

            confidence = (
                GeminiProvider._confidence(
                    item.get("confidence")
                )
            )

            attributes = item.get(
                "attributes",
                {},
            )

            if not isinstance(
                attributes,
                dict,
            ):
                attributes = {}

            source_text = str(
                item.get(
                    "source_text",
                    "",
                )
                or ""
            ).strip()

            key = (
                entity_type.lower(),
                label.lower(),
            )

            if key in seen:
                continue

            seen.add(key)

            normalized.append(
                ExtractedEntity(
                    type=entity_type,
                    label=label,
                    attributes=attributes,
                    source_text=source_text,
                    confidence=confidence,
                )
            )

        return normalized

    # =====================================================
    # RELATIONSHIP NORMALIZATION
    # =====================================================

    @staticmethod
    def _normalize_relationships(
        raw_relationships: Any,
        entities: list[ExtractedEntity],
    ) -> list[ExtractedRelationship]:

        if not isinstance(
            raw_relationships,
            list,
        ):
            return []

        entity_labels = {
            entity.label.lower()
            for entity in entities
        }

        normalized: list[
            ExtractedRelationship
        ] = []

        seen: set[
            tuple[str, str, str]
        ] = set()

        for item in raw_relationships:

            if not isinstance(
                item,
                dict,
            ):
                continue

            source = str(
                item.get("source", "")
            ).strip()

            target = str(
                item.get("target", "")
            ).strip()

            relationship_type = str(
                item.get("type", "")
            ).strip().upper()

            if (
                not source
                or not target
                or source.lower()
                not in entity_labels
                or target.lower()
                not in entity_labels
            ):
                continue

            if (
                relationship_type
                not in ALLOWED_RELATIONSHIP_TYPES
            ):
                relationship_type = (
                    "RELATED_TO"
                )

            if (
                source.lower()
                == target.lower()
            ):
                continue

            confidence = (
                GeminiProvider._confidence(
                    item.get("confidence")
                )
            )

            attributes = item.get(
                "attributes",
                {},
            )

            if not isinstance(
                attributes,
                dict,
            ):
                attributes = {}

            source_text = str(
                item.get(
                    "source_text",
                    "",
                )
                or ""
            ).strip()

            observed_at = (
                GeminiProvider._parse_datetime(
                    item.get(
                        "observed_at"
                    )
                )
            )

            key = (
                source.lower(),
                target.lower(),
                relationship_type,
            )

            if key in seen:
                continue

            seen.add(key)

            normalized.append(
                ExtractedRelationship(
                    source=source,
                    target=target,
                    type=relationship_type,
                    attributes=attributes,
                    source_text=source_text,
                    confidence=confidence,
                    observed_at=observed_at,
                )
            )

        return normalized

    # =====================================================
    # VALUE HELPERS
    # =====================================================

    @staticmethod
    def _confidence(
        value: Any,
    ) -> float:

        try:
            confidence = float(value)

        except (
            TypeError,
            ValueError,
        ):
            return 0.5

        return max(
            0.0,
            min(
                1.0,
                confidence,
            ),
        )

    @staticmethod
    def _parse_datetime(
        value: Any,
    ) -> datetime | None:

        if not value:
            return None

        if isinstance(
            value,
            datetime,
        ):
            return value

        text = str(value).strip()

        if not text:
            return None

        try:
            return datetime.fromisoformat(
                text.replace(
                    "Z",
                    "+00:00",
                )
            )

        except ValueError:
            return None

    @staticmethod
    def _safe_error(
        response: httpx.Response,
    ) -> str:

        try:
            data = response.json()

            error = data.get(
                "error",
                {},
            )

            if isinstance(
                error,
                dict,
            ):
                message = error.get(
                    "message"
                )

                if message:
                    return str(
                        message
                    )

        except Exception:
            pass

        return response.text[:500]


gemini_provider = GeminiProvider()