"""
IIS Prototype - Part 2: FastAPI + PostgreSQL backend entrypoint.

Run:
    uvicorn app.main:app --reload --port 8000

Then visit http://localhost:8000/docs for interactive API docs.
"""
import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine
from app.api import cases, entities, relationships, phases

# Part 5: Add graph/ to Python path for Neo4j routes
graph_path = Path(__file__).parent.parent.parent / "graph"
if graph_path.exists():
    sys.path.insert(0, str(graph_path))
    try:
        from api import graph_routes
        GRAPH_AVAILABLE = True
    except ImportError:
        GRAPH_AVAILABLE = False
else:
    GRAPH_AVAILABLE = False

app = FastAPI(
    title="IIS — Investigation Intelligence System API",
    description=(
        "Structural network analytics over investigation data. "
        "Part 2 (PostgreSQL): entity/relationship CRUD, phase summaries, metrics. "
        "Part 5 (Neo4j): graph traversal, pathfinding, GDS algorithms. "
        "All 'relevance' and 'bridge candidate' scores describe structural position "
        "in observed communication data ONLY — they are not assessments of guilt or "
        "criminal involvement."
    ),
    version="0.3.0",  # Updated to 0.3.0 for Part 5 integration
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cases.router)
app.include_router(entities.router)
app.include_router(relationships.router)
app.include_router(phases.router)

# Part 5: Mount Neo4j graph routes (if available)
if GRAPH_AVAILABLE:
    app.include_router(graph_routes.router)


@app.get("/health", tags=["health"])
def health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": "unreachable", "detail": str(e)}


# Part 5: Cleanup Neo4j driver on shutdown (if available)
if GRAPH_AVAILABLE:
    @app.on_event("shutdown")
    def shutdown_event():
        graph_routes.cleanup_driver()
