/*
IIS Prototype - Part 5: Neo4j Cypher Reference Queries

Documented example queries for the CAVIAR graph.
These are NOT executed as code — they serve as reference documentation
for developers exploring the graph manually via Neo4j Browser or cypher-shell.

Graph Schema:
  (:Entity:Person {entity_id, label, raw_actor_id, type, case_id})
      -[:CALLED {weight, phase, case_id}]->
  (:Entity:Person)

Constraints & Indexes:
  - UNIQUE constraint on Entity.entity_id
  - INDEX on Entity.type
  - INDEX on :CALLED.phase
*/

-- =============================================================================
-- Basic Graph Exploration
-- =============================================================================

-- Count all entities
MATCH (e:Entity)
RETURN count(e) AS total_entities;
// Expected: 107

-- Count all relationships
MATCH ()-[r:CALLED]->()
RETURN count(r) AS total_relationships;
// Expected: 650

-- Inspect a specific entity
MATCH (e:Entity {entity_id: 'P1'})
RETURN e;

-- List all entity types (should be just "Person" for CAVIAR)
MATCH (e:Entity)
RETURN DISTINCT e.type;

-- =============================================================================
-- Phase-Specific Queries
-- =============================================================================

-- Count entities and relationships in phase 1
MATCH (e:Entity)-[r:CALLED {phase: 1}]-()
RETURN count(DISTINCT e) AS entities_in_phase1,
       count(r) AS relationships_in_phase1;
// Expected: 15 entities, 26 relationships (per case_analysis.json)

-- Get all calls in a specific phase
MATCH (source:Entity)-[r:CALLED {phase: 1}]->(target:Entity)
RETURN source.entity_id AS from,
       target.entity_id AS to,
       r.weight AS calls
ORDER BY r.weight DESC
LIMIT 10;

-- =============================================================================
-- Neighborhood / Traversal Queries
-- =============================================================================

-- Find direct neighbors of P1 (1-hop)
MATCH (center:Entity {entity_id: 'P1'})-[r:CALLED]-(neighbor:Entity)
RETURN DISTINCT neighbor.entity_id AS neighbor_id,
       neighbor.label AS label,
       count(r) AS num_interactions,
       sum(r.weight) AS total_calls
ORDER BY total_calls DESC;

-- Find neighbors within 2 hops of P1
MATCH path = (center:Entity {entity_id: 'P1'})-[:CALLED*1..2]-(neighbor:Entity)
WHERE center <> neighbor
RETURN DISTINCT neighbor.entity_id AS neighbor_id,
       neighbor.label AS label,
       min(length(path)) AS min_hops
ORDER BY min_hops, neighbor_id;

-- Find neighbors in a specific phase within N hops
MATCH path = (center:Entity {entity_id: 'P1'})-[r:CALLED*1..2]-(neighbor:Entity)
WHERE ALL(rel IN relationships(path) WHERE rel.phase = 1)
  AND center <> neighbor
RETURN DISTINCT neighbor.entity_id AS neighbor_id,
       min(length(path)) AS min_hops
ORDER BY min_hops, neighbor_id;

-- =============================================================================
-- Path Finding
-- =============================================================================

-- Shortest path between two entities (any phase)
MATCH path = shortestPath(
  (a:Entity {entity_id: 'P1'})-[:CALLED*]-(b:Entity {entity_id: 'P76'})
)
RETURN [node IN nodes(path) | node.entity_id] AS path_entities,
       length(path) AS path_length;

-- Shortest path in a specific phase
MATCH path = shortestPath(
  (a:Entity {entity_id: 'P1'})-[r:CALLED*]-(b:Entity {entity_id: 'P76'})
)
WHERE ALL(rel IN relationships(path) WHERE rel.phase = 2)
RETURN [node IN nodes(path) | node.entity_id] AS path_entities,
       [rel IN relationships(path) | rel.weight] AS call_weights,
       length(path) AS path_length;

-- All shortest paths between two entities (may return multiple if ties exist)
MATCH path = allShortestPaths(
  (a:Entity {entity_id: 'P1'})-[:CALLED*]-(b:Entity {entity_id: 'P89'})
)
RETURN [node IN nodes(path) | node.entity_id] AS path_entities,
       length(path) AS path_length;

-- =============================================================================
-- Degree / Basic Centrality
-- =============================================================================

-- Degree centrality for phase 1 (simple node degree, not GDS)
MATCH (e:Entity)-[r:CALLED {phase: 1}]-()
RETURN e.entity_id AS entity_id,
       count(r) AS degree,
       sum(r.weight) AS weighted_degree
ORDER BY degree DESC, weighted_degree DESC
LIMIT 10;

-- Entities with highest outgoing call volume in phase 1
MATCH (e:Entity)-[r:CALLED {phase: 1}]->()
RETURN e.entity_id AS entity_id,
       count(r) AS outgoing_degree,
       sum(r.weight) AS total_outgoing_calls
ORDER BY total_outgoing_calls DESC
LIMIT 10;

-- =============================================================================
-- GDS Graph Projections
-- =============================================================================

-- Create an in-memory graph projection for phase 1 (undirected)
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
    relationshipFilter: 'r.phase = 1'
  }
)
YIELD graphName, nodeCount, relationshipCount
RETURN graphName, nodeCount, relationshipCount;

-- List all GDS graph projections
CALL gds.graph.list()
YIELD graphName, nodeCount, relationshipCount
RETURN graphName, nodeCount, relationshipCount;

-- Drop a GDS graph projection
CALL gds.graph.drop('phase1')
YIELD graphName;

-- =============================================================================
-- GDS Betweenness Centrality
-- =============================================================================

-- Run betweenness centrality (stream mode) on a projected graph
// First create projection (see above), then:
CALL gds.betweenness.stream('phase1')
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).entity_id AS entity_id,
       score
ORDER BY score DESC
LIMIT 10;

-- Run betweenness centrality and write results back to graph
// (mutate mode - stores results in projection, not persisted to DB)
CALL gds.betweenness.mutate('phase1', {
  mutateProperty: 'betweenness'
})
YIELD centralityDistribution
RETURN centralityDistribution;

-- =============================================================================
-- GDS Community Detection (Louvain)
-- =============================================================================

-- Run Louvain community detection (stream mode)
CALL gds.louvain.stream('phase1')
YIELD nodeId, communityId
RETURN gds.util.asNode(nodeId).entity_id AS entity_id,
       communityId
ORDER BY communityId, entity_id;

-- Run Louvain with intermediate communities
CALL gds.louvain.stream('phase1', {
  includeIntermediateCommunities: true
})
YIELD nodeId, communityId, intermediateCommunityIds
RETURN gds.util.asNode(nodeId).entity_id AS entity_id,
       communityId AS final_community,
       intermediateCommunityIds
ORDER BY communityId;

-- =============================================================================
-- Cross-Phase Analysis
-- =============================================================================

-- Entities active across multiple phases
MATCH (e:Entity)-[r:CALLED]-()
RETURN e.entity_id AS entity_id,
       count(DISTINCT r.phase) AS num_phases_active,
       collect(DISTINCT r.phase) AS phases
ORDER BY num_phases_active DESC
LIMIT 10;

-- Total call volume per entity across all phases
MATCH (e:Entity)-[r:CALLED]-()
RETURN e.entity_id AS entity_id,
       sum(r.weight) AS total_calls_all_phases
ORDER BY total_calls_all_phases DESC
LIMIT 10;

-- Evolution of entity's degree over phases
MATCH (e:Entity {entity_id: 'P1'})-[r:CALLED]-()
RETURN r.phase AS phase,
       count(r) AS degree_in_phase,
       sum(r.weight) AS weighted_degree_in_phase
ORDER BY phase;

-- =============================================================================
-- Data Quality / Validation Queries
-- =============================================================================

-- Check for orphaned entities (no relationships)
MATCH (e:Entity)
WHERE NOT (e)-[:CALLED]-()
RETURN e.entity_id, e.label;
// Expected: empty result set

-- Check for relationships with missing weight or phase
MATCH ()-[r:CALLED]->()
WHERE r.weight IS NULL OR r.phase IS NULL
RETURN count(r) AS invalid_relationships;
// Expected: 0

-- Check phase range (should be 1..11 for CAVIAR)
MATCH ()-[r:CALLED]->()
RETURN min(r.phase) AS min_phase,
       max(r.phase) AS max_phase,
       count(DISTINCT r.phase) AS num_phases;
// Expected: min=1, max=11, num_phases=11

-- =============================================================================
-- Cleanup
-- =============================================================================

-- Delete all nodes and relationships (CAUTION: destroys all data)
// MATCH (n) DETACH DELETE n;

-- Delete only a specific case's data
// MATCH (n {case_id: 'CASE-CAVIAR'})
// DETACH DELETE n;
