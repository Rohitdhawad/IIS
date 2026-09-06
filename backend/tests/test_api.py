"""
Test suite for the IIS FastAPI backend.

Assumes the database has already been seeded (run scripts/seed_db.py first).
These tests hit the real seeded PostgreSQL data -- not mocks -- so they
double as a round-trip verification that Part 1's numbers survived the
load into Part 2 unchanged.

Run:
    pytest tests/ -v
"""
import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ---------------------------------------------------------------------------
# Round-trip counts (per the seed plan: 107 entities, 650 relationships, 11 phases)
# ---------------------------------------------------------------------------

def test_case_counts_match_part1():
    r = client.get("/cases/CASE-CAVIAR")
    assert r.status_code == 200
    data = r.json()
    assert data["num_entities"] == 107
    assert data["num_relationships"] == 650
    assert data["num_phases"] == 11


def test_list_cases_includes_caviar():
    r = client.get("/cases")
    assert r.status_code == 200
    ids = [c["id"] for c in r.json()]
    assert "CASE-CAVIAR" in ids


# ---------------------------------------------------------------------------
# Phase summaries
# ---------------------------------------------------------------------------

def test_phase_1_summary_matches_part1():
    r = client.get("/cases/CASE-CAVIAR/phases/1")
    assert r.status_code == 200
    data = r.json()
    assert data["num_actors"] == 15
    assert data["num_calls"] == 26
    assert "P1" in data["bridge_entities"]


def test_unknown_phase_returns_404():
    r = client.get("/cases/CASE-CAVIAR/phases/999")
    assert r.status_code == 404


def test_unknown_case_phases_returns_404():
    r = client.get("/cases/NOT-A-REAL-CASE/phases")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Regression test: exact ground-truth value from Part 1 validation.
# If a future refactor reintroduces the weighted-betweenness bug (call-count
# used as shortest-path distance), this test will catch it immediately.
# ---------------------------------------------------------------------------

def test_p1_phase1_betweenness_matches_validated_value():
    r = client.get("/cases/CASE-CAVIAR/phases/1/entities?limit=1")
    assert r.status_code == 200
    top = r.json()[0]
    assert top["entity_id"] == "P1"
    assert abs(top["betweenness"] - 0.9066) < 1e-4
    assert top["is_bridge_candidate"] is True


# ---------------------------------------------------------------------------
# Completeness fix regression test: P3 is a real bridge candidate in phase 1
# but was NOT in the old top-5-only entity_metrics table. This must resolve.
# ---------------------------------------------------------------------------

def test_bridge_candidate_outside_top5_is_queryable():
    r = client.get("/cases/CASE-CAVIAR/phases/1/bridge-candidates")
    assert r.status_code == 200
    bridge_ids = [e["entity_id"] for e in r.json()]
    assert "P3" in bridge_ids, "P3 should be a bridge candidate in phase 1 but was missing"

    r2 = client.get("/entities/P3")
    assert r2.status_code == 200, "P3 must be queryable directly, not just listed in bridge_entities"


def test_bridge_candidates_consistent_with_phase_summary():
    """The full bridge-candidates list must exactly match phase_summaries.bridge_entities."""
    summary = client.get("/cases/CASE-CAVIAR/phases/1").json()
    candidates = client.get("/cases/CASE-CAVIAR/phases/1/bridge-candidates").json()

    summary_ids = set(summary["bridge_entities"])
    candidate_ids = set(e["entity_id"] for e in candidates)
    assert summary_ids == candidate_ids


# ---------------------------------------------------------------------------
# Entities & evidence
# ---------------------------------------------------------------------------

def test_get_known_entity():
    r = client.get("/entities/P1")
    assert r.status_code == 200
    assert r.json()["type"] == "Person"


def test_unknown_entity_returns_404():
    r = client.get("/entities/P99999")
    assert r.status_code == 404


def test_entity_evidence_has_outgoing_and_incoming():
    r = client.get("/entities/P1/evidence?phase=1")
    assert r.status_code == 200
    data = r.json()
    assert len(data["outgoing_calls"]) > 0
    assert len(data["incoming_calls"]) > 0


def test_evidence_for_unknown_entity_returns_404():
    r = client.get("/entities/P99999/evidence")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Relationships
# ---------------------------------------------------------------------------

def test_relationships_filter_by_phase_and_source():
    r = client.get("/relationships?phase=1&source_id=P1")
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) > 0
    assert all(row["source_id"] == "P1" and row["phase"] == 1 for row in rows)


# ---------------------------------------------------------------------------
# Terminology / ethics guardrail: response schema should not contain
# guilt-implying fields. This is a structural check, not exhaustive, but
# catches an obvious regression (e.g. someone adding a "suspect" field).
# ---------------------------------------------------------------------------

def test_entity_metrics_schema_has_no_guilt_language():
    r = client.get("/cases/CASE-CAVIAR/phases/1/entities?limit=5")
    assert r.status_code == 200
    banned_terms = {"suspect", "guilty", "criminal", "confirmed"}
    for entity in r.json():
        for key in entity.keys():
            assert key.lower() not in banned_terms
