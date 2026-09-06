"""
IIS Prototype - Part 1: Data Structuring
------------------------------------------
Loads raw CAVIAR actor x actor matrices (per phase) and converts them into
IIS's structured entity model:

    Person       -> one row per actor ID
    Call (edge)  -> Person A -> Person B, weight = call count, phase = N
    Phase        -> investigation time-slice (1..11)
    Case         -> "CAVIAR" (the whole investigation)

Output: a single clean dataset (entities.json + relationships.json) that
later parts (Part 2: FastAPI+Postgres, Part 5: Neo4j) can load directly.
"""

import csv
import json
import os
import networkx as nx

DATA_DIR = "/home/claude/caviar/Caviar_CSV_v2"
OUT_DIR = "/home/claude/iis_prototype/output"
os.makedirs(OUT_DIR, exist_ok=True)

PHASE_FILES = {i: f"CAVIAR{i}.csv" for i in range(1, 12)}
CASE_ID = "CASE-CAVIAR"


def load_matrix(filepath):
    """Load a CAVIAR csv matrix into (actor_ids, matrix)."""
    with open(filepath, encoding="utf-8-sig") as fh:
        rows = list(csv.reader(fh))
    actor_ids = [c.strip() for c in rows[0][1:] if c.strip() != ""]
    matrix = []
    for r in rows[1:]:
        row_id = r[0].strip()
        values = [int(v) if v.strip() != "" else 0 for v in r[1:]]
        matrix.append((row_id, values))
    return actor_ids, matrix


def build_phase_graph(phase_num, filepath):
    """Convert one phase's matrix into a directed weighted graph."""
    actor_ids, matrix = load_matrix(filepath)
    G = nx.DiGraph()
    for aid in actor_ids:
        G.add_node(aid)

    for row_id, values in matrix:
        for col_idx, weight in enumerate(values):
            if weight > 0:
                target_id = actor_ids[col_idx]
                if row_id != target_id:
                    G.add_edge(row_id, target_id, weight=weight, phase=phase_num)
    return G


def build_all_phases():
    graphs = {}
    for phase_num, fname in PHASE_FILES.items():
        path = os.path.join(DATA_DIR, fname)
        if os.path.exists(path):
            graphs[phase_num] = build_phase_graph(phase_num, path)
    return graphs


def export_entities_and_relationships(graphs):
    """Flatten all phase graphs into IIS entity/relationship JSON."""
    all_actors = set()
    for G in graphs.values():
        all_actors.update(G.nodes())

    entities = [
        {
            "entity_id": f"P{actor_id}",
            "type": "Person",
            "label": f"Actor {actor_id}",
            "raw_actor_id": actor_id,
        }
        for actor_id in sorted(all_actors, key=lambda x: int(x))
    ]

    relationships = []
    for phase_num, G in graphs.items():
        for u, v, data in G.edges(data=True):
            relationships.append({
                "source": f"P{u}",
                "target": f"P{v}",
                "type": "CALLED",
                "weight": data["weight"],
                "phase": phase_num,
                "case_id": CASE_ID,
            })

    with open(os.path.join(OUT_DIR, "entities.json"), "w") as f:
        json.dump(entities, f, indent=2)

    with open(os.path.join(OUT_DIR, "relationships.json"), "w") as f:
        json.dump(relationships, f, indent=2)

    print(f"Entities: {len(entities)}")
    print(f"Relationships: {len(relationships)}")
    return entities, relationships


if __name__ == "__main__":
    graphs = build_all_phases()
    for phase_num, G in graphs.items():
        print(f"Phase {phase_num}: {G.number_of_nodes()} actors, {G.number_of_edges()} calls")
    export_entities_and_relationships(graphs)
