"""Convert stored evidence files into text for AI processing."""

from io import BytesIO
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

from app.config import settings


def get_r2_client():
    """Create an S3-compatible Cloudflare R2 client."""

    return boto3.client(
        "s3",
        endpoint_url=settings.R2_ENDPOINT_URL,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
    )


def download_evidence(storage_path: str) -> bytes:
    """
    Download an evidence object from Cloudflare R2.

    Returns the original file bytes.
    """

    r2 = get_r2_client()

    try:
        response = r2.get_object(
            Bucket=settings.R2_BUCKET_NAME,
            Key=storage_path,
        )

        return response["Body"].read()

    except ClientError as exc:
        raise RuntimeError(
            "Unable to retrieve evidence from object storage."
        ) from exc


def evidence_bytes_to_text(
    content: bytes,
    filename: str,
) -> str:
    """
    Convert supported evidence formats into text.

    The extraction layer receives text regardless of the
    original storage format.
    """

    suffix = Path(filename).suffix.lower()

    if suffix in {".txt", ".log"}:
        return content.decode(
            "utf-8",
            errors="replace",
        )

    if suffix == ".csv":
        return content.decode(
            "utf-8",
            errors="replace",
        )

    if suffix in {".json", ".xml"}:
        return content.decode(
            "utf-8",
            errors="replace",
        )

    if suffix == ".pdf":
        return _extract_pdf_text(content)

    raise ValueError(
        f"Unsupported evidence format: {suffix or 'unknown'}"
    )


def _extract_pdf_text(content: bytes) -> str:
    """Extract text from a PDF."""

    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise RuntimeError(
            "PDF support requires the 'pypdf' package."
        ) from exc

    reader = PdfReader(BytesIO(content))

    pages = []

    for page in reader.pages:
        text = page.extract_text()

        if text:
            pages.append(text)

    return "\n\n".join(pages)