"""
IIS Prototype - Step 6 + Step 10: Graph Analytics + Evidence-Backed Insights
------------------------------------------------------------------------------
Takes the structured phase graphs and surfaces entities that are structurally
significant in the observed COMMUNICATION network for this phase.

For each phase we compute:
    - Degree centrality       -> who has the most call activity
    - Betweenness centrality  -> who sits between separate communication clusters
    - Community detection     -> which sub-groups exist
    - Bridge candidates       -> nodes connecting 2+ communities

IMPORTANT - terminology and scope:
This module makes NO claims about guilt, criminality, or intent. It only
describes structural position within call-record data: "high betweenness"
means "this node's removal would disconnect two clusters of callers," full
stop. Downstream UI/reporting must use neutral terms:

    OK:   "Network-Relevant Entity", "Bridge Candidate", "High Network Centrality"
    NOT:  "Criminal", "Guilty person", "Confirmed suspect"

Every flagged entity carries the raw call records that produced its score,
so an investigator can see exactly why the metric fired (Evidence-Backed AI),
and judge relevance themselves rather than trusting a bare label.
"""

import json
from load_data import build_all_phases

TOP_K = 5


def analyze_phase(phase_num, G):
    undirected = G.to_undirected()

    # Degree: weighted by call volume -> "how much this actor communicates"
    degree = dict(G.degree(weight="weight"))

    # Betweenness: UNWEIGHTED (topology only), matching standard practice in
    # criminal-network literature (Morselli et al. analyze tie presence for
    # centrality, treating call frequency as a separate tie-strength signal).
    #
    # IMPORTANT: nx.betweenness_centrality's `weight` parameter treats edge
    # weight as a DISTANCE for shortest-path routing. Passing raw call counts
    # as `weight` would mean a pair with 9 calls is treated as HARDER to
    # reach than a pair with 1 call -- the opposite of what call volume
    # should mean. We deliberately compute betweenness without weight, and
    # keep call volume as a separate metric (`degree_weighted`) instead of
    # conflating "frequently contacted" with "structurally distant."
    betweenness = nx.betweenness_centrality(undirected) if len(G) > 2 else {}

    # Community detection (greedy modularity, works on undirected)
    try:
        communities = list(nx.algorithms.community.greedy_modularity_communities(undirected))
    except Exception:
        communities = []

    node_to_community = {}
    for idx, community in enumerate(communities):
        for node in community:
            node_to_community[node] = idx

    # Bridge candidates: nodes whose neighbors span 2+ communities.
    # We also record WHICH communities they connect, so the UI can say
    # "connects Community A <-> Community B" instead of a bare flag.
    bridges = []
    bridge_links = {}  # node -> sorted list of community ids it touches
    for node in G.nodes():
        neighbor_communities = {
            node_to_community.get(n) for n in undirected.neighbors(node)
        }
        neighbor_communities.discard(None)
        if len(neighbor_communities) >= 2:
            bridges.append(node)
            bridge_links[node] = sorted(neighbor_communities)

    ranked = sorted(
        G.nodes(),
        key=lambda n: (betweenness.get(n, 0), degree.get(n, 0)),
        reverse=True,
    )

    def build_entity_record(node):
        out_edges = [
            {"to": f"P{v}", "calls": d["weight"]}
            for _, v, d in G.out_edges(node, data=True)
        ]
        in_edges = [
            {"from": f"P{u}", "calls": d["weight"]}
            for u, _, d in G.in_edges(node, data=True)
        ]
        reasons = []
        if degree.get(node, 0) > 0:
            reasons.append(f"{G.degree(node)} distinct contacts, {degree[node]} total call volume this phase")
        if betweenness.get(node, 0) > 0:
            reasons.append(f"Betweenness centrality {betweenness[node]:.3f} — structurally sits between communication clusters")
        if node in bridge_links:
            comm_names = [f"Community {chr(65+c)}" for c in bridge_links[node]]
            reasons.append(f"Connects {' and '.join(comm_names)} in the observed call network")

        return {
            "entity_id": f"P{node}",
            "phase": phase_num,
            "degree": G.degree(node),
            "degree_weighted": degree.get(node, 0),
            "betweenness": round(betweenness.get(node, 0), 4),
            "num_communities_touched": len(bridge_links.get(node, [])),
            "is_bridge_candidate": node in bridges,
            "bridged_communities": [f"Community {chr(65+c)}" for c in bridge_links.get(node, [])],
            "reasons": reasons,
            "evidence": {"outgoing_calls": out_edges, "incoming_calls": in_edges},
        }

    # Full metrics for EVERY node (needed so the database has complete data --
    # e.g. so a "list all bridge candidates" query isn't silently missing
    # anyone who fell outside the top-K display list).
    all_entity_metrics = [build_entity_record(node) for node in ranked]

    # top_entities is a DISPLAY-ONLY slice for the dossier UI. Any consumer
    # that needs the full picture (like the DB loader) should use
    # all_entity_metrics instead.
    top_entities = all_entity_metrics[:TOP_K]

    # Sort ALL bridge candidates by the same ranking key used for top_entities
    # (betweenness desc, then degree desc) so the summary list at the bottom
    # of the UI is never out of sync with the ranked cards above it.
    bridges_sorted = sorted(
        bridges,
        key=lambda n: (betweenness.get(n, 0), degree.get(n, 0)),
        reverse=True,
    )

    return {
        "phase": phase_num,
        "num_actors": G.number_of_nodes(),
        "num_calls": G.number_of_edges(),
        "num_communities": len(communities),
        "bridge_entities": [f"P{b}" for b in bridges_sorted],
        "top_relevant_entities": top_entities,
    }


if __name__ == "__main__":
    import networkx as nx
    graphs = build_all_phases()
    report = {}
    for phase_num, G in graphs.items():
        report[phase_num] = analyze_phase(phase_num, G)

    with open("/home/claude/iis_prototype/output/case_analysis.json", "w") as f:
        json.dump(report, f, indent=2)

    # Print a human-readable summary for Phase 1 and the last phase as a sample
    for phase_num in [1, 11]:
        r = report[phase_num]
        print(f"\n=== PHASE {phase_num} ({r['num_actors']} actors, {r['num_calls']} calls, {r['num_communities']} communities) ===")
        for e in r["top_relevant_entities"]:
            print(f"  {e['entity_id']}  bridge_candidate={e['is_bridge_candidate']}  betweenness={e['betweenness']}")
            for reason in e["reasons"]:
                print(f"      - {reason}")
