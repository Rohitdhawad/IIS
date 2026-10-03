import pytest

from app.services.gemini_provider import GeminiProvider


@pytest.mark.asyncio
async def test_gemini_provider_extract():
    provider = GeminiProvider()

    result = await provider.extract(
        """
        Investigation note:

        Rahul Sharma met Amit Patil at Pune Railway Station
        on 15 August 2026. Rahul used phone number 9876543210.
        """,
        filename="test_investigation.txt",
        source_type="Other",
    )

    assert result is not None
    assert hasattr(result, "entities")
    assert hasattr(result, "relationships")