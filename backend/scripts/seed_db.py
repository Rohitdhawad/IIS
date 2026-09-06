"""
IIS Prototype - Part 2: Seed PostgreSQL from Part 1's read-only data/.

READS ONLY from data/ (entities.json, relationships.json, case_analysis.json).
Never writes to data/. Part 1 files are the source of truth and are not
imported as code here -- this script is self-contained.

Why this script recomputes entity-level metrics itself instead of just
copying case_analysis.json's top_relevant_entities:

  case_analysis.json only stores the TOP-K (5) entities per phase, because
  that's all the dossier UI needs to display. But phase_summaries.bridge_entities
  lists ALL bridge candidates for a phase (e.g. 6 names), which means a
  naive load would create a real inconsistency: the API would say "P3 is a
  bridge candidate" (from phase_summaries) but 404 when you look up P3's
  metrics (because entity_phase_metrics only has the top 5).

  So entity_phase_metrics here is computed fresh, directly from
  relationships.json, for EVERY entity in every phase -- using the exact
  same method as data/2_analyze.py (unweighted betweenness centrality,
  greedy modularity communities, bridge = neighbor communities >= 2) so
  the numbers match Part 1 exactly, just without the top-K truncation.

Run:
    python scripts/seed_db.py
"""
import json
import os
import sys

import networkx as nx
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, SessionLocal, Base
from app.models import Case, Entity, Relationship, PhaseSummary, EntityPhaseMetric
from app.config import settings

CASE_ID = "CASE-CAVIAR"
CASE_NAME = "CAVIAR Network Investigation"
CASE_DESCRIPTION = "Real covert-network dataset (Morselli). 11 phases of call records."

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", settings.DATA_DIR)
DATA_DIR = os.path.normpath(DATA_DIR)


def load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    with open(path) as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Metric computation (mirrors data/2_analyze.py's method, computed for ALL
# entities rather than just a top-K slice)
# ---------------------------------------------------------------------------

def build_phase_graph(phase_num, relationships):
    G = nx.DiGraph()
    for r in relationships:
        if r["phase"] == phase_num:
            G.add_edge(r["source"], r["target"], weight=r["weight"])
    return G


def compute_full_phase_metrics(phase_num, G):
    """Returns a list of metric dicts, ONE PER ENTITY in this phase's graph,
    ranked 1..N by (betweenness desc, degree_weighted desc)."""
    undirected = G.to_undirected()
    degree_weighted = dict(G.degree(weight="weight"))

    # Unweighted betweenness -- see analyze.py's note: raw call-count must
    # NOT be passed as a shortest-path distance weight (that would treat
    # high-contact pairs as "farther apart", which is backwards).
    betweenness = nx.betweenness_centrality(undirected) if len(G) > 2 else {n: 0.0 for n in G.nodes()}

    try:
        communities = list(nx.algorithms.community.greedy_modularity_communities(undirected))
    except Exception:
        communities = []
    node_to_community = {}
    for idx, community in enumerate(communities):
        for node in community:
            node_to_community[node] = idx

    bridge_links = {}
    for node in G.nodes():
        neighbor_communities = {node_to_community.get(n) for n in undirected.neighbors(node)}
        neighbor_communities.discard(None)
        if len(neighbor_communities) >= 2:
            bridge_links[node] = sorted(neighbor_communities)

    ranked_nodes = sorted(
        G.nodes(),
        key=lambda n: (betweenness.get(n, 0), degree_weighted.get(n, 0)),
        reverse=True,
    )

    metrics = []
    for rank, node in enumerate(ranked_nodes, start=1):
        # node is already the full entity_id (e.g. "P1") -- relationships.json
        # stores prefixed IDs, so no extra "P" prefix should be added here.
        out_edges = [{"to": v, "calls": d["weight"]} for _, v, d in G.out_edges(node, data=True)]
        in_edges = [{"from": u, "calls": d["weight"]} for u, _, d in G.in_edges(node, data=True)]

        reasons = []
        if degree_weighted.get(node, 0) > 0:
            reasons.append(f"{G.degree(node)} distinct contacts, {degree_weighted[node]} total call volume this phase")
        if betweenness.get(node, 0) > 0:
            reasons.append(f"Betweenness centrality {betweenness[node]:.3f} — structurally sits between communication clusters")
        bridged = bridge_links.get(node, [])
        if bridged:
            comm_names = [f"Community {chr(65 + c)}" for c in bridged]
            reasons.append(f"Connects {' and '.join(comm_names)} in the observed call network")

        metrics.append({
            "entity_id": node,
            "phase": phase_num,
            "degree": G.degree(node),
            "degree_weighted": degree_weighted.get(node, 0),
            "betweenness": round(betweenness.get(node, 0), 4),
            "num_communities_touched": len(bridged),
            "is_bridge_candidate": node in bridge_links,
            "bridged_communities": [f"Community {chr(65 + c)}" for c in bridged],
            "reasons": reasons,
            "evidence": {"outgoing_calls": out_edges, "incoming_calls": in_edges},
            "rank": rank,
        })
    return metrics


# ---------------------------------------------------------------------------
# Seeding
# ---------------------------------------------------------------------------

def seed():
    entities_data = load_json("entities.json")
    relationships_data = load_json("relationships.json")
    case_analysis = load_json("case_analysis.json")

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Wipe existing data for a clean, repeatable seed (idempotent script)
        db.execute(text("TRUNCATE entity_phase_metrics, phase_summaries, relationships, entities, cases RESTART IDENTITY CASCADE"))
        db.commit()

        # 1. Case
        db.add(Case(id=CASE_ID, name=CASE_NAME, description=CASE_DESCRIPTION))
        db.commit()

        # 2. Entities
        for e in entities_data:
            db.add(Entity(
                entity_id=e["entity_id"],
                case_id=CASE_ID,
                type=e["type"],
                label=e["label"],
                raw_actor_id=e.get("raw_actor_id"),
                attributes={},
            ))
        db.commit()
        print(f"Seeded {len(entities_data)} entities")

        # 3. Relationships
        for r in relationships_data:
            db.add(Relationship(
                case_id=CASE_ID,
                source_id=r["source"],
                target_id=r["target"],
                type=r["type"],
                weight=r["weight"],
                phase=r["phase"],
                attributes={},
            ))
        db.commit()
        print(f"Seeded {len(relationships_data)} relationships")

        # 4. Phase summaries (direct mapping from case_analysis.json, per plan)
        for phase_str, phase_data in case_analysis.items():
            db.add(PhaseSummary(
                case_id=CASE_ID,
                phase=int(phase_str),
                num_actors=phase_data["num_actors"],
                num_calls=phase_data["num_calls"],
                num_communities=phase_data["num_communities"],
                bridge_entities=phase_data["bridge_entities"],
            ))
        db.commit()
        print(f"Seeded {len(case_analysis)} phase summaries")

        # 5. Entity-phase metrics -- computed FRESH for every entity in
        # every phase (completeness fix; see module docstring).
        total_metric_rows = 0
        for phase_str in case_analysis.keys():
            phase_num = int(phase_str)
            G = build_phase_graph(phase_num, relationships_data)
            metrics = compute_full_phase_metrics(phase_num, G)
            for m in metrics:
                db.add(EntityPhaseMetric(
                    case_id=CASE_ID,
                    phase=m["phase"],
                    entity_id=m["entity_id"],
                    degree=m["degree"],
                    degree_weighted=m["degree_weighted"],
                    betweenness=m["betweenness"],
                    num_communities_touched=m["num_communities_touched"],
                    is_bridge_candidate=m["is_bridge_candidate"],
                    bridged_communities=m["bridged_communities"],
                    reasons=m["reasons"],
                    evidence=m["evidence"],
                    rank=m["rank"],
                ))
            total_metric_rows += len(metrics)
        db.commit()
        print(f"Seeded {total_metric_rows} entity_phase_metrics rows (ALL entities, all phases)")

        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
