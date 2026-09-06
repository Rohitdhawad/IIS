"""
IIS Prototype - Validation Layer
------------------------------------------------------------------------------
Two independent kinds of validation, because "the code runs" and "the numbers
mean something" are different claims:

  (A) CORRECTNESS VALIDATION
      Are the metrics computed right? We recompute betweenness centrality
      from scratch (independent implementation, not calling networkx's
      internals) for a small phase and diff it against analyze.py's output.
      We also run structural sanity checks on the raw parsed data itself.

  (B) GROUND-TRUTH VALIDATION
      Published research on the real CAVIAR case (court proceedings,
      cited in academic literature on this exact dataset) names specific
      actors who held real management roles:
          N1  -> leader of the hashish group
          N12 -> leader of the cocaine group
          N3, N76 -> other management-level nodes
      Source: "A Synthetic Network Generator for Covert Network Analytics"
      (arXiv:2008.04445), which reports the highest relative betweenness
      centrality scores belong to management nodes N1, N3, N12, N76.

      We check whether our OWN pipeline -- with no knowledge of who the
      boss was -- independently surfaces these same actor IDs as high
      centrality / bridge candidates. This does not "prove" the algorithm
      correct in general, but it is a real, falsifiable check against an
      external, independently-sourced fact about this specific case.

      NOTE: this is validation of the RANKING METHOD, not evidence in an
      active case. Matching a documented historical outcome tells us the
      metric is picking up a real signal; it says nothing about anyone in
      a new, undecided case.
"""

import json
import networkx as nx
from load_data import build_all_phases

KNOWN_MANAGEMENT_NODES = {"1", "3", "12", "76"}  # N1, N3, N12, N76 per published source


# ---------------------------------------------------------------------------
# (A) Correctness validation
# ---------------------------------------------------------------------------

def brute_force_betweenness(G):
    """
    Independent, naive betweenness implementation (Brandes' algorithm is
    what networkx uses internally; here we do plain all-pairs shortest
    path counting instead, as a cross-check that isn't just calling the
    same code path twice).
    """
    nodes = list(G.nodes())
    betweenness = {n: 0.0 for n in nodes}
    UG = G.to_undirected()

    for s in nodes:
        # BFS shortest paths + path counting from source s
        lengths = {s: 0}
        num_paths = {s: 1}
        preds = {n: [] for n in nodes}
        queue = [s]
        order = []
        while queue:
            v = queue.pop(0)
            order.append(v)
            for w in UG.neighbors(v):
                if w not in lengths:
                    lengths[w] = lengths[v] + 1
                    num_paths[w] = 0
                    queue.append(w)
                if lengths[w] == lengths[v] + 1:
                    num_paths[w] += num_paths[v]
                    preds[w].append(v)

        dependency = {n: 0.0 for n in nodes}
        for w in reversed(order):
            for v in preds[w]:
                if num_paths[w] > 0:
                    dependency[v] += (num_paths[v] / num_paths[w]) * (1 + dependency[w])
            if w != s:
                betweenness[w] += dependency[w]

    n = len(nodes)
    norm = 1.0
    if n > 2:
        norm = 1.0 / ((n - 1) * (n - 2))
    return {k: v * norm for k, v in betweenness.items()}


def validate_correctness(graphs):
    print("=" * 70)
    print("(A) CORRECTNESS VALIDATION — independent betweenness recomputation")
    print("=" * 70)

    all_ok = True
    for phase_num, G in list(graphs.items())[:3]:  # check first 3 phases (keep runtime small)
        UG = G.to_undirected()
        # NOTE: unweighted on both sides -- see analyze.py for why we don't
        # pass call-count as a shortest-path distance weight.
        nx_bc = nx.betweenness_centrality(UG)
        my_bc = brute_force_betweenness(G)

        max_diff = 0.0
        for node in G.nodes():
            diff = abs(nx_bc.get(node, 0) - my_bc.get(node, 0))
            max_diff = max(max_diff, diff)

        status = "MATCH" if max_diff < 1e-6 else "MISMATCH"
        if status == "MISMATCH":
            all_ok = False
        print(f"  Phase {phase_num}: max diff vs. independent recomputation = {max_diff:.8f}  [{status}]")

    # Structural sanity checks on raw data
    print()
    print("  Structural sanity checks:")
    for phase_num, G in graphs.items():
        self_loops = list(nx.selfloop_edges(G))
        negative_weights = [
            (u, v) for u, v, d in G.edges(data=True) if d.get("weight", 0) < 0
        ]
        if self_loops:
            print(f"    Phase {phase_num}: WARNING — {len(self_loops)} self-loop(s) found: {self_loops}")
            all_ok = False
        if negative_weights:
            print(f"    Phase {phase_num}: WARNING — negative call weights found: {negative_weights}")
            all_ok = False
    if all_ok:
        print("    No self-loops, no negative weights, all phases clean.")

    print()
    print(f"  RESULT: {'PASS' if all_ok else 'FAIL — see warnings above'}")
    return all_ok


# ---------------------------------------------------------------------------
# (B) Ground-truth validation
# ---------------------------------------------------------------------------

def validate_against_ground_truth(analysis_report):
    print()
    print("=" * 70)
    print("(B) GROUND-TRUTH VALIDATION — vs. published CAVIAR court findings")
    print("=" * 70)
    print(f"  Known management nodes (from published research): "
          f"{{{', '.join('N'+n for n in sorted(KNOWN_MANAGEMENT_NODES, key=int))}}}")
    print()

    hits_by_phase = {}
    for phase_str, phase_data in analysis_report.items():
        flagged_ids = {e["entity_id"].replace("P", "") for e in phase_data["top_relevant_entities"]}
        hits = flagged_ids & KNOWN_MANAGEMENT_NODES
        hits_by_phase[phase_str] = hits
        marker = "✓" if hits else " "
        print(f"  [{marker}] Phase {phase_str}: top-5 flagged = {sorted(flagged_ids, key=int)}  "
              f"-> known management nodes present: {sorted(hits, key=int) if hits else 'none'}")

    total_phases = len(analysis_report)
    phases_with_hit = sum(1 for h in hits_by_phase.values() if h)
    print()
    print(f"  RESULT: known management nodes appeared in top-5 flagged entities "
          f"in {phases_with_hit}/{total_phases} phases.")
    print("  Interpretation: this indicates the centrality/bridge metric correlates")
    print("  with real documented management roles in this specific historical case.")
    print("  It is a sanity check on the METHOD, not proof about any individual.")
    return hits_by_phase


if __name__ == "__main__":
    graphs = build_all_phases()
    with open("/home/claude/iis_prototype/output/case_analysis.json") as f:
        report = json.load(f)

    correctness_ok = validate_correctness(graphs)
    ground_truth_hits = validate_against_ground_truth(report)

    summary = {
        "correctness_validation_passed": correctness_ok,
        "ground_truth_hits_by_phase": {k: sorted(v, key=int) for k, v in ground_truth_hits.items()},
        "known_management_nodes": sorted(KNOWN_MANAGEMENT_NODES, key=int),
        "source": "arXiv:2008.04445 - A Synthetic Network Generator for Covert Network Analytics",
    }
    with open("/home/claude/iis_prototype/output/validation_report.json", "w") as f:
        json.dump(summary, f, indent=2)
    print()
    print("Validation report saved to validation_report.json")
