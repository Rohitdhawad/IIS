"""IIS API: complete extracted facts in PostgreSQL, selected graph in Neo4j."""
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api import cases, entities, relationships
from app.database import engine

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
    title="IIS Investigation Intelligence System API",
    description="Evidence-backed extraction and review patterns. PostgreSQL stores complete facts; Neo4j stores only the post-analysis visualization graph.",
    version="1.0.0",
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(cases.router)
app.include_router(entities.router)
app.include_router(relationships.router)
if GRAPH_AVAILABLE:
    app.include_router(graph_routes.router)


@app.get("/health", tags=["health"])
def health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as exc:
        return {"status": "error", "database": "unreachable", "detail": str(exc)}


if GRAPH_AVAILABLE:
    @app.on_event("shutdown")
    def shutdown_event():
        graph_routes.cleanup_driver()
