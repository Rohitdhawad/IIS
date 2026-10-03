"""IIS Investigation Intelligence System API."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api import (
    cases,
    entities,
    relationships,
    evidence,
    graph_versions,
    network_analysis,
)
from app.api.evidence_provenance import router as evidence_provenance_router
from app.database import engine
from app.models import GraphVersion


app = FastAPI(
    title="IIS Investigation Intelligence System API",
    description=(
        "AI-powered investigation intelligence system with "
        "evidence-backed entity extraction, relationship analysis, "
        "Neo4j network analysis and persistent graph versions."
    ),
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATABASE
# ============================================================

try:
    GraphVersion.__table__.create(
        bind=engine,
        checkfirst=True,
    )
except Exception as exc:
    print(
        f"Warning: could not initialize graph_versions table: {exc}"
    )


# ============================================================
# ROUTERS
# ============================================================

app.include_router(cases.router)
app.include_router(entities.router)
app.include_router(relationships.router)
app.include_router(evidence.router)
app.include_router(graph_versions.router)
app.include_router(network_analysis.router)
app.include_router(evidence_provenance_router)


# ============================================================
# HEALTH
# ============================================================

@app.get(
    "/health",
    tags=["health"],
)
def health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "ok",
            "database": "connected",
        }

    except Exception as exc:
        return {
            "status": "error",
            "database": "unreachable",
            "detail": str(exc),
        }