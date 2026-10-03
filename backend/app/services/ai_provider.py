"""AI provider contract for IIS."""


from abc import ABC, abstractmethod
from typing import Any


class AIProvider(ABC):
    """
    Common interface for an AI provider used by IIS.

    Providers are responsible for communicating with a specific
    AI model/service. They do not decide how multiple providers
    are combined.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Return a human-readable provider name."""
        raise NotImplementedError

    @abstractmethod
    async def extract(
        self,
        content: str,
    ) -> dict[str, Any]:
        """
        Perform fast evidence extraction.

        The result should contain information compatible with
        IIS's extraction schema.
        """
        raise NotImplementedError

    @abstractmethod
    async def reconcile(
        self,
        content: str,
        findings: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """
        Resolve conflicting or incomplete extraction findings.

        The original evidence content is supplied again so the
        provider can ground reconciliation in the source itself.
        """
        raise NotImplementedError

    @abstractmethod
    async def analyze(
        self,
        investigation_context: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Perform deeper investigation/intelligence analysis.

        This can be used for relationship reasoning, unusual
        pattern detection, hidden connections, and similar
        higher-level analysis.
        """
        raise NotImplementedError