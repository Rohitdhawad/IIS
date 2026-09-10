"""
IIS Prototype - Part 5: Neo4j Ingestion Script

READS ONLY from data/ (entities.json, relationships.json) — same read-only
Part 1 sources that Part 2's seed_db.py used. This keeps Part 5 independently
reproducible even if Postgres is down.

Why idempotent MERGE instead of CREATE:
  Running this script multiple times against the same Neo4j instance should
  not create duplicate nodes/relationships. MERGE = "create if not exists,
  otherwise match" — safe to re-run.

Run:
    python ingest/load_to_neo4j.py
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

CASE_ID = "CASE-CAVIAR"


def get_data_path(filename):
    """Resolve data file path relative to this script."""
    base_dir = Path(__file__).parent.parent / DATA_DIR
    return base_dir / filename


def load_json(filename):
    """Load JSON data from the read-only Part 1 data directory."""
    path = get_data_path(filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def create_constraints_and_indexes(driver):
    """Apply schema constraints and indexes (idempotent with IF NOT EXISTS)."""
    with driver.session() as session:
        # Unique constraint on entity_id
        session.run("""
            CREATE CONSTRAINT entity_id_unique IF NOT EXISTS
            FOR (e:Entity) REQUIRE e.entity_id IS UNIQUE
        """)
        
        # Index on entity type for filtering
        session.run("""
            CREATE INDEX entity_type_idx IF NOT EXISTS
            FOR (e:Entity) ON (e.type)
        """)
        
        # Index on relationship phase for time-slice queries
        session.run("""
            CREATE INDEX called_phase_idx IF NOT EXISTS
            FOR ()-[r:CALLED]-() ON (r.phase)
        """)
        
        print("✓ Constraints and indexes applied")


def ingest_entities(driver, entities_data):
    """
    MERGE entities as nodes with two labels:
      - Generic :Entity label (for cross-type queries)
      - Specific type label (:Person today; :Vehicle, :Phone, etc. later)
    """
    with driver.session() as session:
        for entity in entities_data:
            entity_id = entity["entity_id"]
            entity_type = entity["type"]
            label = entity["label"]
            raw_actor_id = entity.get("raw_actor_id")
            
            # Build Cypher with dynamic label (e.g., MERGE (e:Entity:Person {...}))
            # Note: entity_type must be a valid Neo4j label (alphanumeric)
            cypher = f"""
                MERGE (e:Entity:{entity_type} {{entity_id: $entity_id}})
                SET e.type = $type,
                    e.label = $label,
                    e.raw_actor_id = $raw_actor_id,
                    e.case_id = $case_id
            """
            
            session.run(cypher, 
                entity_id=entity_id,
                type=entity_type,
                label=label,
                raw_actor_id=raw_actor_id,
                case_id=CASE_ID
            )
        
        print(f"✓ Ingested {len(entities_data)} entities")


def ingest_relationships(driver, relationships_data):
    """
    MERGE relationships between entities.
    Relationship type name matches the interaction (CALLED today; OWNS, etc. later).
    """
    with driver.session() as session:
        for rel in relationships_data:
            source_id = rel["source"]
            target_id = rel["target"]
            rel_type = rel["type"]
            weight = rel["weight"]
            phase = rel["phase"]
            
            # Dynamic relationship type (e.g., -[:CALLED]->)
            cypher = f"""
                MATCH (source:Entity {{entity_id: $source_id}})
                MATCH (target:Entity {{entity_id: $target_id}})
                MERGE (source)-[r:{rel_type}]->(target)
                SET r.weight = $weight,
                    r.phase = $phase,
                    r.case_id = $case_id
            """
            
            session.run(cypher,
                source_id=source_id,
                target_id=target_id,
                weight=weight,
                phase=phase,
                case_id=CASE_ID
            )
        
        print(f"✓ Ingested {len(relationships_data)} relationships")


def verify_counts(driver):
    """Print final node and relationship counts for verification."""
    with driver.session() as session:
        node_count = session.run("MATCH (e:Entity) RETURN count(e) as count").single()["count"]
        rel_count = session.run("MATCH ()-[r:CALLED]->() RETURN count(r) as count").single()["count"]
        
        print(f"\n📊 Final counts:")
        print(f"   Nodes (Entity): {node_count}")
        print(f"   Relationships (CALLED): {rel_count}")
        
        return node_count, rel_count


def main():
    """Main ingestion workflow."""
    print("🔄 Starting Neo4j ingestion from data/*.json...\n")
    
    # Load data from Part 1's read-only JSON files
    entities_data = load_json("entities.json")
    relationships_data = load_json("relationships.json")
    
    print(f"📂 Loaded from data/:")
    print(f"   {len(entities_data)} entities")
    print(f"   {len(relationships_data)} relationships\n")
    
    # Connect to Neo4j
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    try:
        # Test connection
        driver.verify_connectivity()
        print(f"✓ Connected to Neo4j at {NEO4J_URI}\n")
        
        # Apply schema (idempotent)
        create_constraints_and_indexes(driver)
        
        # Ingest data (idempotent)
        print("\n🔄 Ingesting entities...")
        ingest_entities(driver, entities_data)
        
        print("🔄 Ingesting relationships...")
        ingest_relationships(driver, relationships_data)
        
        # Verify
        node_count, rel_count = verify_counts(driver)
        
        # Sanity check
        if node_count != len(entities_data):
            print(f"⚠️  Warning: Expected {len(entities_data)} nodes, got {node_count}")
        if rel_count != len(relationships_data):
            print(f"⚠️  Warning: Expected {len(relationships_data)} relationships, got {rel_count}")
        
        print("\n✅ Ingestion complete.")
        
    except Exception as e:
        print(f"\n❌ Error during ingestion: {e}")
        raise
    finally:
        driver.close()


if __name__ == "__main__":
    main()
