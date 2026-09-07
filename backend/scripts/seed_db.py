"""Load the synthetic IIS case into PostgreSQL after extraction has completed."""
import json
import sys
from datetime import datetime
from pathlib import Path

from sqlalchemy import text

BACKEND_DIR = Path(__file__).resolve().parents[1]
IIS_DIR = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(IIS_DIR))

from app.database import Base, SessionLocal, engine
from app.models import Case, Entity, Relationship
from pipeline.synthetic_case_pipeline import run

PROCESSED_DIR = IIS_DIR / "processed"
CASE_ID = "IIS-2026-001"


def load(name: str):
    return json.loads((PROCESSED_DIR / name).read_text(encoding="utf-8"))


def seed() -> None:
    run()  # extraction and anomaly selection always precede persistence
    entities, relationships = load("entities.json"), load("relationships.json")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Development-only repeatable seed. Production upload must upsert only one case.
        db.execute(text("TRUNCATE relationships, entities, cases RESTART IDENTITY CASCADE"))
        db.add(Case(id=CASE_ID, name="Project Nightfall", description="Synthetic fictional investigation data."))
        for item in entities:
            db.add(Entity(entity_id=item["entity_id"], case_id=CASE_ID, type=item["type"], label=item["label"], attributes=item["attributes"]))
        for item in relationships:
            db.add(Relationship(
                case_id=CASE_ID, source_id=item["source"], target_id=item["target"], type=item["type"], weight=1,
                confidence=item["confidence"], observed_at=datetime.fromisoformat(item["observed_at"]) if item["observed_at"] else None,
                attributes={"relationship_id": item["relationship_id"], "evidence": item["evidence"], **item["attributes"]},
            ))
        db.commit()
        print(f"Seeded {len(entities)} entities and {len(relationships)} evidence-backed relationships.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
