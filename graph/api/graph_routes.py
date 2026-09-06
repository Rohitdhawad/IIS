"""
IIS Prototype - Part 5: Neo4j Graph API Routes

FastAPI router providing graph traversal and GDS algorithm endpoints.
All routes are mounted under /graph prefix to distinguish from Part 2's
Postgres-backed routes.

TERMINOLOGY GUARDRAIL (non-negotiable):
  All responses describe structural position in observed communication data ONLY.
  Never use "suspect," "guilty," "criminal," or "confirmed" in field names/descriptions.
  Enforced by test_graph.py's banned-term scan.
"""
import os
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
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

# Initialize Neo4j driver (singleton pattern)
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

router = APIRouter(prefix="/graph", tags=["graph"])


# ============================================================================
# Response Models (Pydantic schemas)
# ============================================================================

class NeighborEntity(BaseModel):
    entity_id: str = Field(..., description="Entity identifier")
    label: str = Field(..., description="Human-readable label")
    hops: int = Field(..., description="Number of hops from center entity")
    interaction_count: int = Field(..., description="Number of distinct interactions")
    total_calls: int = Field(..., description="Total call volume")


class NeighborsResponse(BaseModel):
    center_entity_id: str
    max_hops: int
    phase_filter: Optional[int]
    neighbors: List[NeighborEntity]


class PathSegment(BaseModel):
    from_id: str
    to_id: str
    calls: int


class PathResponse(BaseModel):
    from_id: str
    to_id: str
    path_exists: bool
    path_length: Optional[int] = Field(None, description="Number of hops in path")
    entity_sequence: Optional[List[str]] = Field(None, description="Ordered list of entity IDs in path")
    segments: Optional[List[PathSegment]] = Field(None, description="Edge details between entities")


class CentralityResult(BaseModel):
    entity_id: str = Field(..., description="Entity identifier")
    label: str = Field(..., description="Human-readable label")
    structural_centrality_score: float = Field(
        ..., 
        description="Structural position score in observed communication network (NOT an assessment of guilt)"
    )
    rank: int = Field(..., description="Rank by centrality score (1 = highest)")


class CentralityResponse(BaseModel):
    phase: int
    algorithm: str = Field(..., description="betweenness or degree")
    disclaimer: str = Field(
        default="Scores describe structural position in observed communication data ONLY. "
                "Not assessments of guilt or criminal involvement."
    )
    results: List[CentralityResult]


class CommunityMember(BaseModel):
    entity_id: str
    label: str
    community_id: int = Field(..., description="Community cluster identifier")


class CommunitiesResponse(BaseModel):
    phase: int
    algorithm: str = Field(default="louvain", description="Community detection algorithm used")
    note: str = Field(
        default="Part 1 used greedy modularity (NetworkX) while Part 5 uses Louvain (GDS). "
                "Different algorithms may produce different community groupings."
    )
    num_communities: int
    members: List[CommunityMember]


class HealthResponse(BaseModel):
    status: str
    neo4j: str
    node_count: Optional[int] = None
    relationship_count: Optional[int] = None


# ============================================================================
# Helper Functions
# ============================================================================

def get_neo4j_driver():
    """Get Neo4j driver (dependency injection pattern for testing)."""
    return driver


def ensure_gds_projection_exists(session, phase: int, projection_name: str):
    """
    Create GDS projection for a phase if it doesn't exist.
    Returns (nodeCount, relationshipCount).
    """
    # Check if projection exists
    result = session.run(
        "CALL gds.graph.exists($name) YIELD exists RETURN exists",
        name=projection_name
    )
    exists = result.single()["exists"]
    
    if not exists:
        # Create projection
        result = session.run("""
            CALL gds.graph.project(
                $name,
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
                    relationshipFilter: 'r.phase = $phase'
                }
            )
            YIELD graphName, nodeCount, relationshipCount
            RETURN nodeCount, relationshipCount
        """, name=projection_name, phase=phase)
        
        stats = result.single()
        return stats["nodeCount"], stats["relationshipCount"]
    else:
        # Get stats for existing projection
        result = session.run("""
            CALL gds.graph.list($name)
            YIELD nodeCount, relationshipCount
            RETURN nodeCount, relationshipCount
        """, name=projection_name)
        
        stats = result.single()
        return stats["nodeCount"], stats["relationshipCount"]


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/entities/{entity_id}/neighbors", response_model=NeighborsResponse)
def get_neighbors(
    entity_id: str,
    hops: int = Query(1, ge=1, le=3, description="Number of hops (max 3)"),
    phase: Optional[int] = Query(None, ge=1, le=11, description="Filter by phase")
):
    """
    Find entities within N hops of the given entity.
    
    This is a traversal query that Postgres handles poorly past 1 hop
    (would require recursive CTEs). Cypher handles it natively.
    """
    with get_neo4j_driver().session() as session:
        # Check if center entity exists
        check_result = session.run("""
            MATCH (e:Entity {entity_id: $entity_id})
            RETURN e.entity_id AS id, e.label AS label
        """, entity_id=entity_id)
        
        if not check_result.single():
            raise HTTPException(status_code=404, detail=f"Entity '{entity_id}' not found")
        
        # Build query with optional phase filter
        if phase is not None:
            query = """
                MATCH path = (center:Entity {entity_id: $entity_id})-[r:CALLED*1..$hops]-(neighbor:Entity)
                WHERE ALL(rel IN relationships(path) WHERE rel.phase = $phase)
                  AND center <> neighbor
                WITH DISTINCT neighbor, min(length(path)) AS min_hops
                MATCH (center:Entity {entity_id: $entity_id})-[r:CALLED]-(neighbor)
                WHERE r.phase = $phase
                RETURN neighbor.entity_id AS entity_id,
                       neighbor.label AS label,
                       min_hops,
                       count(r) AS interaction_count,
                       sum(r.weight) AS total_calls
                ORDER BY min_hops, total_calls DESC
            """
            params = {"entity_id": entity_id, "hops": hops, "phase": phase}
        else:
            query = """
                MATCH path = (center:Entity {entity_id: $entity_id})-[:CALLED*1..$hops]-(neighbor:Entity)
                WHERE center <> neighbor
                WITH DISTINCT neighbor, min(length(path)) AS min_hops
                MATCH (center:Entity {entity_id: $entity_id})-[r:CALLED]-(neighbor)
                RETURN neighbor.entity_id AS entity_id,
                       neighbor.label AS label,
                       min_hops,
                       count(r) AS interaction_count,
                       sum(r.weight) AS total_calls
                ORDER BY min_hops, total_calls DESC
            """
            params = {"entity_id": entity_id, "hops": hops}
        
        result = session.run(query, **params)
        
        neighbors = [
            NeighborEntity(
                entity_id=record["entity_id"],
                label=record["label"],
                hops=record["min_hops"],
                interaction_count=record["interaction_count"],
                total_calls=record["total_calls"]
            )
            for record in result
        ]
        
        return NeighborsResponse(
            center_entity_id=entity_id,
            max_hops=hops,
            phase_filter=phase,
            neighbors=neighbors
        )


@router.get("/path", response_model=PathResponse)
def get_shortest_path(
    from_id: str = Query(..., description="Source entity ID"),
    to_id: str = Query(..., description="Target entity ID"),
    phase: Optional[int] = Query(None, ge=1, le=11, description="Filter by phase")
):
    """
    Find the shortest path between two entities.
    
    Returns 404 if no path exists. Returns the sequence of entity IDs
    and the relationship weights along the path.
    """
    with get_neo4j_driver().session() as session:
        # Check if both entities exist
        check_result = session.run("""
            MATCH (a:Entity {entity_id: $from_id})
            MATCH (b:Entity {entity_id: $to_id})
            RETURN a.entity_id AS from_exists, b.entity_id AS to_exists
        """, from_id=from_id, to_id=to_id)
        
        check = check_result.single()
        if not check:
            if not check.get("from_exists"):
                raise HTTPException(status_code=404, detail=f"Entity '{from_id}' not found")
            if not check.get("to_exists"):
                raise HTTPException(status_code=404, detail=f"Entity '{to_id}' not found")
        
        # Find shortest path
        if phase is not None:
            query = """
                MATCH path = shortestPath(
                    (a:Entity {entity_id: $from_id})-[r:CALLED*]-(b:Entity {entity_id: $to_id})
                )
                WHERE ALL(rel IN relationships(path) WHERE rel.phase = $phase)
                RETURN [node IN nodes(path) | node.entity_id] AS entity_sequence,
                       [rel IN relationships(path) | rel.weight] AS weights,
                       length(path) AS path_length
            """
            params = {"from_id": from_id, "to_id": to_id, "phase": phase}
        else:
            query = """
                MATCH path = shortestPath(
                    (a:Entity {entity_id: $from_id})-[:CALLED*]-(b:Entity {entity_id: $to_id})
                )
                RETURN [node IN nodes(path) | node.entity_id] AS entity_sequence,
                       [rel IN relationships(path) | rel.weight] AS weights,
                       length(path) AS path_length
            """
            params = {"from_id": from_id, "to_id": to_id}
        
        result = session.run(query, **params)
        record = result.single()
        
        if not record:
            # No path exists
            return PathResponse(
                from_id=from_id,
                to_id=to_id,
                path_exists=False
            )
        
        # Build segments
        entity_sequence = record["entity_sequence"]
        weights = record["weights"]
        segments = [
            PathSegment(
                from_id=entity_sequence[i],
                to_id=entity_sequence[i + 1],
                calls=weights[i]
            )
            for i in range(len(entity_sequence) - 1)
        ]
        
        return PathResponse(
            from_id=from_id,
            to_id=to_id,
            path_exists=True,
            path_length=record["path_length"],
            entity_sequence=entity_sequence,
            segments=segments
        )


@router.get("/centrality/{phase}", response_model=CentralityResponse)
def get_centrality(
    phase: int = Query(..., ge=1, le=11, description="Phase number"),
    algorithm: str = Query("betweenness", regex="^(betweenness|degree)$", description="Algorithm: betweenness or degree"),
    limit: int = Query(5, ge=1, le=50, description="Number of top results to return")
):
    """
    Run GDS centrality algorithm for a phase and return top-ranked entities.
    
    Results are labeled as "structural centrality" / "network relevance" —
    NOT "suspect" or "guilty". Describes structural position in observed
    communication data ONLY.
    """
    with get_neo4j_driver().session() as session:
        projection_name = f"phase{phase}"
        
        # Ensure GDS projection exists
        try:
            node_count, rel_count = ensure_gds_projection_exists(session, phase, projection_name)
            
            if node_count == 0:
                raise HTTPException(
                    status_code=404,
                    detail=f"No data found for phase {phase}"
                )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create GDS projection: {str(e)}"
            )
        
        # Run appropriate algorithm
        if algorithm == "betweenness":
            # Unweighted betweenness (matches Part 1's approach)
            query = """
                CALL gds.betweenness.stream($projection)
                YIELD nodeId, score
                RETURN gds.util.asNode(nodeId).entity_id AS entity_id,
                       gds.util.asNode(nodeId).label AS label,
                       score
                ORDER BY score DESC
                LIMIT $limit
            """
        else:  # degree
            query = """
                CALL gds.degree.stream($projection)
                YIELD nodeId, score
                RETURN gds.util.asNode(nodeId).entity_id AS entity_id,
                       gds.util.asNode(nodeId).label AS label,
                       score
                ORDER BY score DESC
                LIMIT $limit
            """
        
        result = session.run(query, projection=projection_name, limit=limit)
        
        results = [
            CentralityResult(
                entity_id=record["entity_id"],
                label=record["label"],
                structural_centrality_score=record["score"],
                rank=idx + 1
            )
            for idx, record in enumerate(result)
        ]
        
        return CentralityResponse(
            phase=phase,
            algorithm=algorithm,
            results=results
        )


@router.get("/communities/{phase}", response_model=CommunitiesResponse)
def get_communities(
    phase: int = Query(..., ge=1, le=11, description="Phase number")
):
    """
    Run GDS Louvain community detection for a phase.
    
    Returns entity_id → community_id mapping.
    
    Note: Part 1 used greedy modularity (NetworkX) while Part 5 uses
    Louvain (GDS). Different algorithms, so community groupings may differ.
    """
    with get_neo4j_driver().session() as session:
        projection_name = f"phase{phase}"
        
        # Ensure GDS projection exists
        try:
            node_count, rel_count = ensure_gds_projection_exists(session, phase, projection_name)
            
            if node_count == 0:
                raise HTTPException(
                    status_code=404,
                    detail=f"No data found for phase {phase}"
                )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create GDS projection: {str(e)}"
            )
        
        # Run Louvain community detection
        query = """
            CALL gds.louvain.stream($projection)
            YIELD nodeId, communityId
            RETURN gds.util.asNode(nodeId).entity_id AS entity_id,
                   gds.util.asNode(nodeId).label AS label,
                   communityId
            ORDER BY communityId, entity_id
        """
        
        result = session.run(query, projection=projection_name)
        
        members = [
            CommunityMember(
                entity_id=record["entity_id"],
                label=record["label"],
                community_id=record["communityId"]
            )
            for record in result
        ]
        
        num_communities = len(set(m.community_id for m in members))
        
        return CommunitiesResponse(
            phase=phase,
            num_communities=num_communities,
            members=members
        )


@router.get("/health", response_model=HealthResponse)
def health_check():
    """
    Check Neo4j connectivity separately from Part 2's /health (which checks Postgres).
    """
    try:
        with get_neo4j_driver().session() as session:
            # Simple query to verify connectivity
            result = session.run("""
                MATCH (e:Entity)
                WITH count(e) AS node_count
                MATCH ()-[r:CALLED]->()
                WITH node_count, count(r) AS rel_count
                RETURN node_count, rel_count
            """)
            
            record = result.single()
            
            return HealthResponse(
                status="ok",
                neo4j="connected",
                node_count=record["node_count"] if record else 0,
                relationship_count=record["rel_count"] if record else 0
            )
    except Exception as e:
        return HealthResponse(
            status="error",
            neo4j=f"unreachable: {str(e)}"
        )


# ============================================================================
# Cleanup on shutdown
# ============================================================================

def cleanup_driver():
    """Close Neo4j driver on application shutdown."""
    driver.close()
