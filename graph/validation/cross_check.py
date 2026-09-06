"""
IIS Prototype - Part 5: Cross-Validation Against Part 1

Runs GDS betweenness centrality for phase 1 and compares the top result
against Part 1's already-validated NetworkX value from case_analysis.json.

This MUST run and pass BEFORE the API layer is built — if GDS betweenness
disagrees substantially with the already-proven-correct NetworkX value,
that's a graph-projection or algorithm-configuration bug to fix first.

Expected baseline from Part 1 (data/case_analysis.json):
  Phase 1, entity P1: betweenness ≈ 0.9066

Tolerance: ±0.01 (1% relative error is acceptable given different algorithm
implementations may have minor numerical differences)

Run:
    python validation/cross_check.py
"""
import json
import os
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Load environment variables
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    load_dotenv(Path(__file__).parent.parent / ".env.example")

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")
DATA_DIR = os.getenv("DATA_DIR", "../data")

# Expected baseline from Part 1
PHASE_1_EXPECTED_TOP_ENTITY = "P1"
PHASE_1_EXPECTED_BETWEENNESS = 0.9066
TOLERANCE = 0.01  # ±1% relative error


def get_data_path(filename):
    """Resolve data file path relative to this script."""
    base_dir = Path(__file__).parent.parent / DATA_DIR
    return base_dir / filename


def load_case_analysis():
    """Load Part 1's validated case_analysis.json for comparison."""
    path = get_data_path("case_analysis.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def run_gds_betweenness_phase1(driver):
    """
    Project phase 1 graph and run GDS betweenness centrality.
    
    Returns list of (entity_id, betweenness_score) tuples, sorted desc by score.
    """
    with driver.session() as session:
        # Step 1: Create an in-memory graph projection for phase 1
        # Using UNDIRECTED because Part 1's NetworkX used undirected betweenness
        # (see data/2_analyze.py: undirected = G.to_undirected())
        
        # First, check if projection already exists and drop it
        session.run("""
            CALL gds.graph.exists('phase1')
            YIELD exists
            WITH exists
            WHERE exists
            CALL gds.graph.drop('phase1')
            YIELD graphName
            RETURN graphName
        """)
        
        # Create new projection
        result = session.run("""
            CALL gds.graph.project(
                'phase1',
                'Entity',
                {
                    CALLED: {
                        type: 'CALLED',
                        orientation: 'UNDIRECTED',
                        properties: {
                            weight: {
                                property: 'weight',
                                defaultValue: 1.0
                            }
                        }
                    }
                },
                {
                    relationshipProperties: 'weight',
                    nodeProperties: [],
                    relationshipFilter: 'r.phase = 1'
                }
            )
            YIELD graphName, nodeCount, relationshipCount
            RETURN graphName, nodeCount, relationshipCount
        """)
        
        projection_info = result.single()
        print(f"✓ Created GDS projection '{projection_info['graphName']}'")
        print(f"  Nodes: {projection_info['nodeCount']}")
        print(f"  Relationships: {projection_info['relationshipCount']}")
        
        # Step 2: Run betweenness centrality (stream mode, unweighted)
        # Note: Part 1 used UNWEIGHTED betweenness (see load_to_neo4j.py docstring
        # and data/2_analyze.py's note about why weight is NOT used as distance)
        result = session.run("""
            CALL gds.betweenness.stream('phase1')
            YIELD nodeId, score
            RETURN gds.util.asNode(nodeId).entity_id AS entity_id, score
            ORDER BY score DESC
        """)
        
        scores = [(record["entity_id"], record["score"]) for record in result]
        
        # Clean up projection
        session.run("CALL gds.graph.drop('phase1')")
        
        return scores


def compare_with_baseline(gds_results, case_analysis):
    """
    Compare GDS results with Part 1's validated NetworkX betweenness.
    
    Returns (passed, message) tuple.
    """
    # Extract Part 1's phase 1 top entity
    phase1_data = case_analysis["1"]
    expected_top = phase1_data["top_relevant_entities"][0]
    expected_id = expected_top["entity_id"]
    expected_score = expected_top["betweenness"]
    
    print(f"\n📊 Part 1 Baseline (NetworkX):")
    print(f"   Top entity: {expected_id}")
    print(f"   Betweenness: {expected_score:.4f}")
    
    if not gds_results:
        return False, "❌ No GDS results returned"
    
    # Get GDS top result
    gds_top_id, gds_top_score = gds_results[0]
    
    print(f"\n📊 Part 5 GDS Result:")
    print(f"   Top entity: {gds_top_id}")
    print(f"   Betweenness: {gds_top_score:.4f}")
    
    # Check 1: Same top entity
    if gds_top_id != expected_id:
        return False, f"❌ Top entity mismatch: expected {expected_id}, got {gds_top_id}"
    
    # Check 2: Score within tolerance
    relative_error = abs(gds_top_score - expected_score) / expected_score
    
    print(f"\n🔍 Validation:")
    print(f"   Relative error: {relative_error:.4f} ({relative_error*100:.2f}%)")
    print(f"   Tolerance: {TOLERANCE:.4f} ({TOLERANCE*100:.2f}%)")
    
    if relative_error > TOLERANCE:
        return False, f"❌ Score differs by {relative_error*100:.2f}% (tolerance: {TOLERANCE*100:.2f}%)"
    
    return True, f"✅ Cross-validation PASSED (top entity {gds_top_id}, score within {relative_error*100:.2f}% of baseline)"


def main():
    """Main cross-validation workflow."""
    print("🔄 Starting Part 5 cross-validation against Part 1...\n")
    
    # Load Part 1's validated results
    case_analysis = load_case_analysis()
    print(f"✓ Loaded Part 1 case_analysis.json\n")
    
    # Connect to Neo4j
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    try:
        # Test connection
        driver.verify_connectivity()
        print(f"✓ Connected to Neo4j at {NEO4J_URI}\n")
        
        # Run GDS betweenness for phase 1
        print("🔄 Running GDS betweenness centrality for phase 1...")
        gds_results = run_gds_betweenness_phase1(driver)
        
        # Compare with Part 1 baseline
        passed, message = compare_with_baseline(gds_results, case_analysis)
        
        print(f"\n{message}")
        
        if not passed:
            print("\n⚠️  CRITICAL: GDS results do not match Part 1's validated NetworkX baseline.")
            print("   This indicates a graph projection or algorithm configuration issue.")
            print("   DO NOT proceed with API implementation until this is resolved.")
            exit(1)
        else:
            print("\n✅ Cross-validation complete. GDS betweenness matches Part 1 baseline.")
            print("   Safe to proceed with API implementation.")
            exit(0)
        
    except Exception as e:
        print(f"\n❌ Error during cross-validation: {e}")
        raise
    finally:
        driver.close()


if __name__ == "__main__":
    main()
