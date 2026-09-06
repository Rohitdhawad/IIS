# Part 5: Neo4j Knowledge Graph Layer

## Status: Implementation Complete, Awaiting Neo4j Deployment

All code for Part 5 has been implemented and is ready to run. However, **Neo4j requires Docker with virtualization enabled** to start the database. Once Docker/Neo4j is available, follow the steps below.

---

## What's Already Working (Part 1 & Part 2)

✅ **Part 1 (data/)**: Data processing pipeline with NetworkX analysis  
✅ **Part 2 (backend/)**: FastAPI + PostgreSQL API running on http://localhost:8001  
✅ **Database**: PostgreSQL with 107 entities, 650 relationships, 11 phases

---

## Part 5 Architecture

Part 5 adds a **graph-native layer** using Neo4j for queries that Postgres handles poorly:
- Multi-hop traversal ("find all entities within N hops")
- Shortest path finding
- Native graph algorithms (GDS betweenness centrality, Louvain communities)

**Key principle**: Neo4j is **additive**, not a replacement. Part 2 remains the system of record.

---

## Prerequisites

### Option A: Docker (Recommended)
1. **Enable virtualization in BIOS**:
   - Restart computer
   - Enter BIOS (usually `Del`, `F2`, or `F10` during startup)
   - Find "Intel VT-x" or "AMD-V" setting
   - Enable it
   - Save and restart

2. **Start Docker Desktop** and verify it's running

### Option B: Native Neo4j Installation
If Docker isn't an option:
1. Download Neo4j Desktop from https://neo4j.com/download/
2. Install and create a new database
3. Install APOC and GDS plugins via Neo4j Desktop
4. Update `graph/.env` with your connection details

---

## Quick Start (Once Docker/Neo4j is Available)

### Step 1: Start Neo4j

```powershell
cd sih/graph
docker compose up -d
```

Wait for Neo4j to be ready (~30 seconds). Verify at http://localhost:7474

### Step 2: Run Ingestion Script

```powershell
cd sih/graph
python ingest/load_to_neo4j.py
```

Expected output:
```
✓ Connected to Neo4j at bolt://localhost:7687
✓ Constraints and indexes applied
✓ Ingested 107 entities
✓ Ingested 650 relationships

📊 Final counts:
   Nodes (Entity): 107
   Relationships (CALLED): 650

✅ Ingestion complete.
```

### Step 3: Run Cross-Validation (Critical!)

```powershell
python validation/cross_check.py
```

This **must pass** before using the API. It verifies GDS betweenness matches Part 1's NetworkX baseline (P1, score ≈ 0.9066).

Expected output:
```
✅ Cross-validation PASSED (top entity P1, score within 0.XX% of baseline)
```

### Step 4: Restart Backend to Enable Graph Routes

The backend will automatically detect Neo4j is available and mount the `/graph` routes:

```powershell
cd sih/backend
# Stop the current backend (Ctrl+C in its terminal)
python -m uvicorn app.main:app --reload --port 8001
```

### Step 5: Test the Graph API

Open http://localhost:8001/docs

New endpoints under `/graph`:
- `GET /graph/health` - Neo4j connectivity check
- `GET /graph/entities/{entity_id}/neighbors` - N-hop traversal
- `GET /graph/path` - Shortest path between two entities
- `GET /graph/centrality/{phase}` - GDS betweenness/degree centrality
- `GET /graph/communities/{phase}` - Louvain community detection

### Step 6: Run Tests

```powershell
cd sih/graph
pytest tests/test_graph.py -v
```

Tests cover:
- ✅ Round-trip counts (107 nodes, 650 relationships)
- ✅ Cross-check against Part 1 baseline
- ✅ Terminology guardrail (no "suspect", "guilty", etc.)
- ✅ 404 handling
- ✅ Functional endpoint tests

---

## Directory Structure

```
sih/graph/
├── docker-compose.yml       # Neo4j 5 Community + APOC + GDS
├── .env                      # Connection config (created from .env.example)
├── requirements.txt          # neo4j driver, networkx, python-dotenv
├── ingest/
│   └── load_to_neo4j.py     # Idempotent ingestion from data/*.json
├── validation/
│   └── cross_check.py       # GDS vs Part 1 NetworkX validation
├── queries/
│   └── cypher_reference.cypher  # Example queries (documentation)
├── api/
│   └── graph_routes.py      # FastAPI router with /graph endpoints
└── tests/
    └── test_graph.py        # Comprehensive pytest suite
```

---

## Graph Data Model

```
(:Entity:Person {entity_id, label, raw_actor_id, type, case_id})
    -[:CALLED {weight, phase, case_id}]->
(:Entity:Person)
```

**Dual labels**: `:Entity` (generic) + `:Person` (specific type)  
**Extensibility**: Add `:Vehicle`, `:Phone`, `:Location` later with zero schema migration

---

## API Examples

### Find neighbors within 2 hops
```bash
GET /graph/entities/P1/neighbors?hops=2&phase=1
```

### Shortest path between P1 and P76
```bash
GET /graph/path?from_id=P1&to_id=P76&phase=2
```

### Top 5 betweenness centrality in phase 1
```bash
GET /graph/centrality/1?algorithm=betweenness&limit=5
```

### Community detection for phase 3
```bash
GET /graph/communities/3
```

---

## Terminology Guardrail

All responses use structural terminology ONLY:
- ✅ "structural centrality", "network relevance"
- ✅ "bridge candidate", "communication cluster"
- ❌ "suspect", "guilty", "criminal", "confirmed"

Enforced by `test_graph.py` banned-term scanner.

---

## Differences from Part 1

| Aspect | Part 1 (NetworkX) | Part 5 (GDS) |
|--------|------------------|--------------|
| **Community Detection** | Greedy Modularity | Louvain |
| **Betweenness** | Unweighted | Unweighted (same) |
| **Scope** | All entities | All entities |

Community groupings may differ between Part 1 and Part 5 due to different algorithms. This is **expected and documented** in API responses.

---

## Troubleshooting

### "Neo4j connection refused"
- Verify Docker container is running: `docker ps`
- Check Neo4j is healthy: `docker logs iis_neo4j`
- Wait 30 seconds after `docker compose up` for initialization

### "GDS projection failed"
- Verify GDS plugin is loaded: Check Neo4j logs for "GDS" mentions
- Restart Neo4j container: `docker compose restart`

### "Cross-validation failed"
- This is **critical** - do not proceed with API usage
- Check ingestion completed successfully (107 nodes, 650 rels)
- Verify Part 1 data files (data/case_analysis.json) are intact
- Review error message for specific mismatch

### "Backend doesn't show /graph routes"
- Verify Neo4j is running and reachable
- Restart backend to trigger graph route detection
- Check backend logs for import errors

---

## Current System Status

**As of this session:**

✅ **Completed:**
- Part 1: Data processing with NetworkX (read-only)
- Part 2: PostgreSQL + FastAPI backend (running on port 8001)
- Part 5: All code implemented (graph/, backend integration)

⏳ **Pending:**
- Neo4j deployment (blocked by Docker virtualization requirement)
- Ingestion execution
- Cross-validation
- Graph API testing

**To complete**: Enable BIOS virtualization → Start Docker → Follow Quick Start above.

---

## Integration with Part 2

Part 2's `backend/app/main.py` now conditionally imports graph routes:

```python
# Part 5: Add graph/ to Python path for Neo4j routes
graph_path = Path(__file__).parent.parent.parent / "graph"
if graph_path.exists():
    sys.path.insert(0, str(graph_path))
    try:
        from api import graph_routes
        GRAPH_AVAILABLE = True
    except ImportError:
        GRAPH_AVAILABLE = False

# Later...
if GRAPH_AVAILABLE:
    app.include_router(graph_routes.router)
```

This means:
- ✅ Backend runs fine **without** Neo4j (Part 2 routes still work)
- ✅ Graph routes auto-mount when Neo4j becomes available
- ✅ No code changes needed when switching between states

---

## Next Steps

1. **Enable virtualization in BIOS** (one-time setup)
2. **Start Docker Desktop**
3. **Follow Quick Start above** (5 steps, ~5 minutes)
4. **Access graph API** at http://localhost:8001/docs under `/graph` section

---

## Support

For issues specific to:
- **Part 1/2 (data, backend)**: Already working ✅
- **Part 5 (graph)**: Check this README's troubleshooting section
- **Docker/Neo4j**: See Neo4j documentation or Docker Desktop docs
