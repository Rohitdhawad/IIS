"""
IIS Prototype - Part 5: Neo4j Graph Tests

Comprehensive test suite covering:
1. Round-trip counts (107 nodes, 650 relationships)
2. Cross-check: /graph/centrality/1 top result is P1 with betweenness ≈ 0.9066
3. Terminology guardrail: banned-term scan on response keys/values
4. 404 handling for unknown entity_id
5. 404 handling for /graph/path when no path exists

Run:
    pytest graph/tests/test_graph.py -v
"""
import pytest
import json
import os
import sys
from pathlib import Path
from neo4j import GraphDatabase

# Add graph/ to path for imports
graph_path = Path(__file__).parent.parent
sys.path.insert(0, str(graph_path))

from api.graph_routes import (
    get_neighbors,
    get_shortest_path,
    get_centrality,
    get_communities,
    health_check,
    get_neo4j_driver
)
from fastapi import HTTPException

# Expected values from Part 1
EXPECTED_NODE_COUNT = 107
EXPECTED_RELATIONSHIP_COUNT = 650
PHASE_1_TOP_ENTITY = "P1"
PHASE_1_TOP_BETWEENNESS = 0.9066
BETWEENNESS_TOLERANCE = 0.01  # ±1%

# Banned terms (terminology guardrail)
BANNED_TERMS = [
    "suspect", "suspects",
    "guilty", "guilt",
    "criminal", "criminals", "crime",
    "confirmed", "conviction",
    "perpetrator", "perpetrators",
    "offender", "offenders"
]


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture(scope="module")
def neo4j_driver():
    """Provide Neo4j driver for direct database queries."""
    from dotenv import load_dotenv
    
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
    else:
        load_dotenv(Path(__file__).parent.parent / ".env.example")
    
    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "password")
    
    driver = GraphDatabase.driver(uri, auth=(user, password))
    yield driver
    driver.close()


# ============================================================================
# Test 1: Round-Trip Counts
# ============================================================================

def test_round_trip_node_count(neo4j_driver):
    """Verify 107 entities were loaded into Neo4j."""
    with neo4j_driver.session() as session:
        result = session.run("MATCH (e:Entity) RETURN count(e) AS count")
        count = result.single()["count"]
        
        assert count == EXPECTED_NODE_COUNT, \
            f"Expected {EXPECTED_NODE_COUNT} nodes, got {count}"


def test_round_trip_relationship_count(neo4j_driver):
    """Verify 650 relationships were loaded into Neo4j."""
    with neo4j_driver.session() as session:
        result = session.run("MATCH ()-[r:CALLED]->() RETURN count(r) AS count")
        count = result.single()["count"]
        
        assert count == EXPECTED_RELATIONSHIP_COUNT, \
            f"Expected {EXPECTED_RELATIONSHIP_COUNT} relationships, got {count}"


def test_health_endpoint_reports_correct_counts():
    """Verify /graph/health endpoint returns correct counts."""
    response = health_check()
    
    assert response.status == "ok"
    assert response.neo4j == "connected"
    assert response.node_count == EXPECTED_NODE_COUNT
    assert response.relationship_count == EXPECTED_RELATIONSHIP_COUNT


# ============================================================================
# Test 2: Cross-Check Against Part 1
# ============================================================================

def test_centrality_phase1_top_entity_is_P1():
    """Verify phase 1 betweenness centrality top result is P1."""
    response = get_centrality(phase=1, algorithm="betweenness", limit=5)
    
    assert len(response.results) > 0, "No centrality results returned"
    
    top_entity = response.results[0]
    assert top_entity.entity_id == PHASE_1_TOP_ENTITY, \
        f"Expected top entity {PHASE_1_TOP_ENTITY}, got {top_entity.entity_id}"


def test_centrality_phase1_betweenness_score_matches_part1():
    """Verify phase 1 betweenness score for P1 is within tolerance of Part 1."""
    response = get_centrality(phase=1, algorithm="betweenness", limit=5)
    
    top_entity = response.results[0]
    score = top_entity.structural_centrality_score
    
    relative_error = abs(score - PHASE_1_TOP_BETWEENNESS) / PHASE_1_TOP_BETWEENNESS
    
    assert relative_error <= BETWEENNESS_TOLERANCE, \
        f"Betweenness score {score:.4f} differs from Part 1 baseline " \
        f"{PHASE_1_TOP_BETWEENNESS:.4f} by {relative_error*100:.2f}% " \
        f"(tolerance: {BETWEENNESS_TOLERANCE*100:.2f}%)"


# ============================================================================
# Test 3: Terminology Guardrail
# ============================================================================

def scan_for_banned_terms(obj, path=""):
    """
    Recursively scan an object (dict, list, str, etc.) for banned terms.
    Returns list of (path, term, context) tuples where banned terms were found.
    """
    violations = []
    
    if isinstance(obj, dict):
        for key, value in obj.items():
            # Check key names
            key_lower = key.lower()
            for term in BANNED_TERMS:
                if term in key_lower:
                    violations.append((f"{path}.{key}", term, f"key: {key}"))
            
            # Recurse into value
            violations.extend(scan_for_banned_terms(value, f"{path}.{key}"))
    
    elif isinstance(obj, list):
        for idx, item in enumerate(obj):
            violations.extend(scan_for_banned_terms(item, f"{path}[{idx}]"))
    
    elif isinstance(obj, str):
        obj_lower = obj.lower()
        for term in BANNED_TERMS:
            if term in obj_lower:
                violations.append((path, term, f"value: {obj[:100]}"))
    
    return violations


def test_centrality_response_terminology_guardrail():
    """Verify /graph/centrality response contains no banned terms."""
    response = get_centrality(phase=1, algorithm="betweenness", limit=5)
    response_dict = response.model_dump()
    
    violations = scan_for_banned_terms(response_dict)
    
    assert len(violations) == 0, \
        f"Found {len(violations)} banned term(s) in /graph/centrality response:\n" + \
        "\n".join([f"  {path}: '{term}' in {context}" for path, term, context in violations])


def test_communities_response_terminology_guardrail():
    """Verify /graph/communities response contains no banned terms."""
    response = get_communities(phase=1)
    response_dict = response.model_dump()
    
    violations = scan_for_banned_terms(response_dict)
    
    assert len(violations) == 0, \
        f"Found {len(violations)} banned term(s) in /graph/communities response:\n" + \
        "\n".join([f"  {path}: '{term}' in {context}" for path, term, context in violations])


def test_neighbors_response_terminology_guardrail():
    """Verify /graph/entities/{id}/neighbors response contains no banned terms."""
    response = get_neighbors(entity_id="P1", hops=1, phase=1)
    response_dict = response.model_dump()
    
    violations = scan_for_banned_terms(response_dict)
    
    assert len(violations) == 0, \
        f"Found {len(violations)} banned term(s) in /graph/neighbors response:\n" + \
        "\n".join([f"  {path}: '{term}' in {context}" for path, term, context in violations])


def test_path_response_terminology_guardrail():
    """Verify /graph/path response contains no banned terms."""
    response = get_shortest_path(from_id="P1", to_id="P89", phase=1)
    response_dict = response.model_dump()
    
    violations = scan_for_banned_terms(response_dict)
    
    assert len(violations) == 0, \
        f"Found {len(violations)} banned term(s) in /graph/path response:\n" + \
        "\n".join([f"  {path}: '{term}' in {context}" for path, term, context in violations])


# ============================================================================
# Test 4: 404 Handling for Unknown Entity
# ============================================================================

def test_neighbors_404_for_unknown_entity():
    """Verify /graph/entities/{id}/neighbors returns 404 for unknown entity."""
    with pytest.raises(HTTPException) as exc_info:
        get_neighbors(entity_id="P9999", hops=1, phase=None)
    
    assert exc_info.value.status_code == 404
    assert "not found" in str(exc_info.value.detail).lower()


def test_path_404_for_unknown_source():
    """Verify /graph/path returns 404 when source entity doesn't exist."""
    with pytest.raises(HTTPException) as exc_info:
        get_shortest_path(from_id="P9999", to_id="P1", phase=None)
    
    assert exc_info.value.status_code == 404
    assert "not found" in str(exc_info.value.detail).lower()


def test_path_404_for_unknown_target():
    """Verify /graph/path returns 404 when target entity doesn't exist."""
    with pytest.raises(HTTPException) as exc_info:
        get_shortest_path(from_id="P1", to_id="P9999", phase=None)
    
    assert exc_info.value.status_code == 404
    assert "not found" in str(exc_info.value.detail).lower()


# ============================================================================
# Test 5: Path Handling When No Path Exists
# ============================================================================

def test_path_no_path_exists_between_disconnected_entities(neo4j_driver):
    """
    Verify /graph/path returns path_exists=False when no path exists.
    
    We need to find two entities that are genuinely disconnected.
    In a fully connected graph like CAVIAR, this is tricky, but we can
    test with a phase filter that creates disconnected components.
    """
    # For phase-filtered queries, some entities may be disconnected
    # Let's try to find a case, or create a synthetic test
    
    # Strategy: Find two entities that don't appear in the same phase
    with neo4j_driver.session() as session:
        result = session.run("""
            MATCH (e1:Entity)-[r1:CALLED {phase: 1}]-()
            WITH collect(DISTINCT e1.entity_id) AS phase1_entities
            MATCH (e2:Entity)-[r2:CALLED {phase: 11}]-()
            WHERE NOT e2.entity_id IN phase1_entities
            RETURN e2.entity_id AS isolated_in_phase1
            LIMIT 1
        """)
        
        record = result.single()
        if record:
            # Found an entity active in phase 11 but not phase 1
            isolated_entity = record["isolated_in_phase1"]
            
            response = get_shortest_path(from_id="P1", to_id=isolated_entity, phase=1)
            
            assert response.path_exists == False, \
                f"Expected no path between P1 and {isolated_entity} in phase 1"
            assert response.path_length is None
            assert response.entity_sequence is None
        else:
            # Fallback: just verify the response structure works
            pytest.skip("Could not find disconnected entities for this test")


# ============================================================================
# Test 6: API Endpoint Functional Tests
# ============================================================================

def test_neighbors_returns_expected_structure():
    """Verify /graph/entities/{id}/neighbors returns correct structure."""
    response = get_neighbors(entity_id="P1", hops=1, phase=1)
    
    assert response.center_entity_id == "P1"
    assert response.max_hops == 1
    assert response.phase_filter == 1
    assert len(response.neighbors) > 0
    
    # Check first neighbor structure
    neighbor = response.neighbors[0]
    assert hasattr(neighbor, "entity_id")
    assert hasattr(neighbor, "label")
    assert hasattr(neighbor, "hops")
    assert hasattr(neighbor, "interaction_count")
    assert hasattr(neighbor, "total_calls")


def test_neighbors_respects_hop_limit():
    """Verify neighbors are within requested hop distance."""
    response = get_neighbors(entity_id="P1", hops=2, phase=None)
    
    for neighbor in response.neighbors:
        assert neighbor.hops <= 2, \
            f"Neighbor {neighbor.entity_id} has {neighbor.hops} hops, exceeds limit of 2"


def test_path_returns_valid_path():
    """Verify /graph/path returns valid path structure."""
    response = get_shortest_path(from_id="P1", to_id="P89", phase=1)
    
    if response.path_exists:
        assert response.path_length is not None
        assert response.entity_sequence is not None
        assert response.segments is not None
        
        # First entity should be source
        assert response.entity_sequence[0] == "P1"
        # Last entity should be target
        assert response.entity_sequence[-1] == "P89"
        
        # Path length should match number of edges
        assert response.path_length == len(response.segments)
        # Number of nodes should be edges + 1
        assert len(response.entity_sequence) == response.path_length + 1


def test_centrality_returns_ranked_results():
    """Verify centrality results are ranked correctly."""
    response = get_centrality(phase=1, algorithm="betweenness", limit=5)
    
    assert len(response.results) <= 5
    
    # Verify ranks are sequential
    for idx, result in enumerate(response.results):
        assert result.rank == idx + 1
    
    # Verify scores are descending
    scores = [r.structural_centrality_score for r in response.results]
    assert scores == sorted(scores, reverse=True), \
        "Centrality scores should be in descending order"


def test_communities_returns_all_entities():
    """Verify community detection includes all entities in phase."""
    response = get_communities(phase=1)
    
    # Phase 1 has 15 entities (from case_analysis.json)
    expected_entities_phase1 = 15
    
    assert len(response.members) == expected_entities_phase1, \
        f"Expected {expected_entities_phase1} entities in phase 1, got {len(response.members)}"
    
    # Verify we have at least one community
    assert response.num_communities > 0


def test_centrality_404_for_invalid_phase():
    """Verify centrality returns 404 for phase with no data."""
    with pytest.raises(HTTPException) as exc_info:
        get_centrality(phase=99, algorithm="betweenness", limit=5)
    
    assert exc_info.value.status_code == 404
    assert "No data found" in str(exc_info.value.detail)


# ============================================================================
# Test 7: Data Integrity
# ============================================================================

def test_all_entities_have_required_properties(neo4j_driver):
    """Verify all entities have entity_id, label, type, case_id."""
    with neo4j_driver.session() as session:
        result = session.run("""
            MATCH (e:Entity)
            WHERE e.entity_id IS NULL
               OR e.label IS NULL
               OR e.type IS NULL
               OR e.case_id IS NULL
            RETURN count(e) AS invalid_count
        """)
        
        invalid_count = result.single()["invalid_count"]
        assert invalid_count == 0, \
            f"Found {invalid_count} entities with missing required properties"


def test_all_relationships_have_required_properties(neo4j_driver):
    """Verify all relationships have weight, phase, case_id."""
    with neo4j_driver.session() as session:
        result = session.run("""
            MATCH ()-[r:CALLED]->()
            WHERE r.weight IS NULL
               OR r.phase IS NULL
               OR r.case_id IS NULL
            RETURN count(r) AS invalid_count
        """)
        
        invalid_count = result.single()["invalid_count"]
        assert invalid_count == 0, \
            f"Found {invalid_count} relationships with missing required properties"


def test_phase_range_is_valid(neo4j_driver):
    """Verify phases are in expected range 1..11."""
    with neo4j_driver.session() as session:
        result = session.run("""
            MATCH ()-[r:CALLED]->()
            RETURN min(r.phase) AS min_phase,
                   max(r.phase) AS max_phase,
                   count(DISTINCT r.phase) AS num_phases
        """)
        
        record = result.single()
        assert record["min_phase"] == 1
        assert record["max_phase"] == 11
        assert record["num_phases"] == 11


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])
