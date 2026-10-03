"""
IIS evidence extraction pipeline.

Flow:

PostgreSQL Evidence record
        ↓
Cloudflare R2 original file
        ↓
Content normalization
        ↓
Gemini extraction
        ↓
Structured ExtractionResult
        ↓
evidence.py persists entities,
relationships and provenance
"""

from __future__ import annotations

import csv
import io
import json
import zipfile
from pathlib import Path
from typing import Any
from xml.etree import ElementTree

import boto3
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Evidence
from app.services.gemini_provider import (
    ExtractionResult,
    gemini_provider,
)


# =========================================================
# R2 CLIENT
# =========================================================

r2 = boto3.client(
    "s3",
    endpoint_url=settings.R2_ENDPOINT_URL,
    aws_access_key_id=settings.R2_ACCESS_KEY_ID,
    aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
)


# =========================================================
# LIMITS
# =========================================================

MAX_TEXT_CHARS = 120_000
MAX_CSV_ROWS = 5_000
MAX_XLSX_ROWS = 5_000


# =========================================================
# PIPELINE
# =========================================================

class EvidenceExtractionPipeline:
    """
    Converts stored investigation evidence into a normalized
    AI extraction result.

    This class does NOT persist extracted entities or
    relationships. The evidence API owns that responsibility.
    """

    async def run(
        self,
        *,
        evidence_id: int,
        db: Session,
    ) -> ExtractionResult:

        # -------------------------------------------------
        # 1. Load evidence record
        # -------------------------------------------------

        evidence = db.get(
            Evidence,
            evidence_id,
        )

        if evidence is None:
            raise ValueError(
                f"Evidence '{evidence_id}' not found."
            )

        # -------------------------------------------------
        # 2. Download original evidence from R2
        # -------------------------------------------------

        content_bytes = (
            self._download_from_r2(
                evidence.storage_path
            )
        )

        if not content_bytes:
            raise RuntimeError(
                "Evidence file is empty."
            )

        # -------------------------------------------------
        # 3. Convert file into readable text
        # -------------------------------------------------

        content = self._normalize_content(
            content_bytes,
            filename=evidence.filename,
            file_type=evidence.file_type,
        )

        if not content.strip():
            raise RuntimeError(
                "No readable content could be extracted "
                "from the evidence file."
            )

        # Prevent unnecessarily large Gemini requests.
        content = content[:MAX_TEXT_CHARS]

        # -------------------------------------------------
        # 4. Send evidence to Gemini
        # -------------------------------------------------

        try:
            result = await gemini_provider.extract(
                content,
                filename=evidence.filename,
                source_type=evidence.source_type,
            )

        except RuntimeError:
            raise

        except Exception as exc:
            raise RuntimeError(
                f"AI extraction failed: {exc}"
            ) from exc

        # -------------------------------------------------
        # 5. Return structured extraction
        # -------------------------------------------------

        return result

    # =====================================================
    # DOWNLOAD FROM R2
    # =====================================================

    @staticmethod
    def _download_from_r2(
        storage_path: str,
    ) -> bytes:

        try:
            response = r2.get_object(
                Bucket=settings.R2_BUCKET_NAME,
                Key=storage_path,
            )

            body = response["Body"]

            try:
                return body.read()

            finally:
                body.close()

        except Exception as exc:
            raise RuntimeError(
                "Unable to retrieve evidence from "
                f"Cloudflare R2: {exc}"
            ) from exc

    # =====================================================
    # CONTENT NORMALIZATION
    # =====================================================

    def _normalize_content(
        self,
        content: bytes,
        *,
        filename: str,
        file_type: str,
    ) -> str:

        extension = (
            file_type or ""
        ).lower().strip()

        if not extension:
            extension = (
                Path(filename)
                .suffix
                .lower()
                .lstrip(".")
            )

        # Remove common MIME-style prefixes.
        if "/" in extension:
            extension = extension.split(
                "/"
            )[-1]

        # -------------------------------------------------
        # TEXT
        # -------------------------------------------------

        if extension in {
            "txt",
            "text",
            "log",
            "md",
            "plain",
        }:
            return self._decode_text(
                content
            )

        # -------------------------------------------------
        # JSON
        # -------------------------------------------------

        if extension == "json":
            return self._normalize_json(
                content
            )

        # -------------------------------------------------
        # CSV
        # -------------------------------------------------

        if extension == "csv":
            return self._normalize_csv(
                content
            )

        # -------------------------------------------------
        # XLSX / XLSM
        # -------------------------------------------------

        if extension in {
            "xlsx",
            "xlsm",
        }:
            return self._normalize_xlsx(
                content
            )

        # -------------------------------------------------
        # PDF
        # -------------------------------------------------

        if extension == "pdf":
            return self._normalize_pdf(
                content
            )

        # -------------------------------------------------
        # FALLBACK
        # -------------------------------------------------

        return self._decode_text(
            content
        )

    # =====================================================
    # TEXT
    # =====================================================

    @staticmethod
    def _decode_text(
        content: bytes,
    ) -> str:

        for encoding in (
            "utf-8",
            "utf-8-sig",
            "utf-16",
            "cp1252",
            "latin-1",
        ):
            try:
                return content.decode(
                    encoding
                )

            except UnicodeDecodeError:
                continue

        return content.decode(
            "utf-8",
            errors="replace",
        )

    # =====================================================
    # JSON
    # =====================================================

    @staticmethod
    def _normalize_json(
        content: bytes,
    ) -> str:

        text = (
            EvidenceExtractionPipeline
            ._decode_text(content)
        )

        try:
            data = json.loads(text)

        except json.JSONDecodeError:
            # If it is not valid JSON, let Gemini inspect
            # the original text instead of crashing.
            return text

        return json.dumps(
            data,
            ensure_ascii=False,
            indent=2,
        )

    # =====================================================
    # CSV
    # =====================================================

    @staticmethod
    def _normalize_csv(
        content: bytes,
    ) -> str:

        text = (
            EvidenceExtractionPipeline
            ._decode_text(content)
        )

        stream = io.StringIO(text)

        try:
            reader = csv.reader(stream)

            rows: list[list[str]] = []

            for index, row in enumerate(reader):

                if index >= MAX_CSV_ROWS:
                    break

                rows.append(
                    [
                        cell.strip()
                        for cell in row
                    ]
                )

        except csv.Error:
            return text

        if not rows:
            return ""

        return "\n".join(
            " | ".join(row)
            for row in rows
        )

    # =====================================================
    # XLSX
    # =====================================================

    @staticmethod
    def _normalize_xlsx(
        content: bytes,
    ) -> str:

        """
        Lightweight XLSX reader using the ZIP/XML structure.

        This avoids requiring pandas just to convert a
        spreadsheet into text for Gemini.
        """

        try:
            archive = zipfile.ZipFile(
                io.BytesIO(content)
            )

        except zipfile.BadZipFile as exc:
            raise RuntimeError(
                "The XLSX evidence file is invalid."
            ) from exc

        with archive:

            shared_strings = (
                EvidenceExtractionPipeline
                ._read_xlsx_shared_strings(
                    archive
                )
            )

            workbook = (
                EvidenceExtractionPipeline
                ._read_xlsx_workbook(
                    archive
                )
            )

            output: list[str] = []

            for sheet_name, sheet_path in workbook:

                try:
                    xml = archive.read(
                        sheet_path
                    )

                except KeyError:
                    continue

                rows = (
                    EvidenceExtractionPipeline
                    ._read_xlsx_sheet(
                        xml,
                        shared_strings,
                    )
                )

                if not rows:
                    continue

                output.append(
                    f"[SHEET: {sheet_name}]"
                )

                for row in rows[:MAX_XLSX_ROWS]:
                    output.append(
                        " | ".join(row)
                    )

            return "\n".join(output)

    # =====================================================
    # XLSX SHARED STRINGS
    # =====================================================

    @staticmethod
    def _read_xlsx_shared_strings(
        archive: zipfile.ZipFile,
    ) -> list[str]:

        try:
            xml = archive.read(
                "xl/sharedStrings.xml"
            )

        except KeyError:
            return []

        root = ElementTree.fromstring(xml)

        namespace = {
            "main":
                "http://schemas.openxmlformats.org/"
                "spreadsheetml/2006/main"
        }

        values: list[str] = []

        for item in root.findall(
            "main:si",
            namespace,
        ):

            parts = []

            for text_node in item.findall(
                ".//main:t",
                namespace,
            ):
                parts.append(
                    text_node.text or ""
                )

            values.append(
                "".join(parts)
            )

        return values

    # =====================================================
    # XLSX WORKBOOK
    # =====================================================

    @staticmethod
    def _read_xlsx_workbook(
        archive: zipfile.ZipFile,
    ) -> list[tuple[str, str]]:

        try:
            workbook_xml = archive.read(
                "xl/workbook.xml"
            )

            rels_xml = archive.read(
                "xl/_rels/workbook.xml.rels"
            )

        except KeyError:
            return []

        workbook_root = (
            ElementTree.fromstring(
                workbook_xml
            )
        )

        rels_root = (
            ElementTree.fromstring(
                rels_xml
            )
        )

        main_ns = (
            "http://schemas.openxmlformats.org/"
            "spreadsheetml/2006/main"
        )

        rel_ns = (
            "http://schemas.openxmlformats.org/"
            "package/2006/relationships"
        )

        relationships: dict[str, str] = {}

        for rel in rels_root.findall(
            f"{{{rel_ns}}}Relationship"
        ):

            relationships[
                rel.attrib.get(
                    "Id",
                    "",
                )
            ] = rel.attrib.get(
                "Target",
                "",
            )

        sheets: list[
            tuple[str, str]
        ] = []

        for sheet in workbook_root.findall(
            f"{{{main_ns}}}sheets/"
            f"{{{main_ns}}}sheet"
        ):

            name = sheet.attrib.get(
                "name",
                "Sheet",
            )

            relation_id = sheet.attrib.get(
                "{http://schemas.openxmlformats.org/"
                "officeDocument/2006/relationships}id",
                "",
            )

            target = relationships.get(
                relation_id
            )

            if not target:
                continue

            target = target.replace(
                "\\",
                "/",
            )

            if target.startswith("/"):
                target = target[1:]

            if not target.startswith("xl/"):
                target = "xl/" + target

            sheets.append(
                (
                    name,
                    target,
                )
            )

        return sheets

    # =====================================================
    # XLSX SHEET
    # =====================================================

    @staticmethod
    def _read_xlsx_sheet(
        xml: bytes,
        shared_strings: list[str],
    ) -> list[list[str]]:

        root = ElementTree.fromstring(xml)

        main_ns = (
            "http://schemas.openxmlformats.org/"
            "spreadsheetml/2006/main"
        )

        rows: list[list[str]] = []

        for row in root.findall(
            f".//{{{main_ns}}}row"
        ):

            values: list[str] = []

            for cell in row.findall(
                f"{{{main_ns}}}c"
            ):

                cell_type = cell.attrib.get(
                    "t"
                )

                value_node = cell.find(
                    f"{{{main_ns}}}v"
                )

                value = (
                    value_node.text
                    if value_node is not None
                    else ""
                ) or ""

                # Shared string.
                if (
                    cell_type == "s"
                    and value.isdigit()
                ):
                    index = int(value)

                    if (
                        0 <= index
                        < len(shared_strings)
                    ):
                        value = (
                            shared_strings[
                                index
                            ]
                        )

                # Inline string.
                elif cell_type == "inlineStr":

                    text_parts = []

                    for text_node in cell.findall(
                        f".//{{{main_ns}}}t"
                    ):
                        text_parts.append(
                            text_node.text or ""
                        )

                    value = "".join(
                        text_parts
                    )

                values.append(
                    value.strip()
                )

            if any(values):
                rows.append(values)

        return rows

    # =====================================================
    # PDF
    # =====================================================

    @staticmethod
    def _normalize_pdf(
        content: bytes,
    ) -> str:

        """
        Extract text from a PDF using pypdf.

        Scanned/image-only PDFs will not produce useful text
        through this method. OCR can be added later as a
        separate ingestion capability.
        """

        try:
            from pypdf import PdfReader

        except ImportError as exc:
            raise RuntimeError(
                "PDF extraction requires the 'pypdf' package. "
                "Install it with: python -m pip install pypdf"
            ) from exc

        try:
            reader = PdfReader(
                io.BytesIO(content)
            )

            pages: list[str] = []

            for page in reader.pages:

                text = (
                    page.extract_text()
                    or ""
                ).strip()

                if text:
                    pages.append(text)

            return "\n\n".join(pages)

        except Exception as exc:
            raise RuntimeError(
                f"Unable to extract text from PDF: {exc}"
            ) from exc


# =========================================================
# SHARED PIPELINE INSTANCE
# =========================================================

extraction_pipeline = EvidenceExtractionPipeline()