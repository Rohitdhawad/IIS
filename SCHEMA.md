# IIS Data Model — Current State vs. Target State

## Why CAVIAR only gives us Person <-> CALLED <-> Person

CAVIAR is a phone-call dataset. It contains actor IDs and call counts between
them — nothing about vehicles, accounts, locations, or seized evidence. So the
prototype currently only produces:

    PERSON --[CALLED]--> PERSON

This is correct and intentional: we are not inventing Phone/Vehicle/Location
records that don't exist in the source data just to look complete. A fabricated
"Vehicle" node with no real data behind it would be worse than no Vehicle node —
it would make the demo look evidence-backed when it isn't.

## How the schema already supports growing beyond this

Both `entities.json` and `relationships.json` are typed and generic, not
CAVIAR-specific:

```json
// entities.json — every entity has a "type" field
{"entity_id": "P1", "type": "Person", "label": "Actor 1", "raw_actor_id": "1"}

// relationships.json — every relationship has a "type" field
{"source": "P1", "target": "P89", "type": "CALLED", "weight": 4, "phase": 1, "case_id": "CASE-CAVIAR"}
```

Adding a new entity type later (e.g. once you have a dataset or synthetic
records with vehicles) means adding new rows with a different `type`, not
redesigning the model:

```json
{"entity_id": "V001", "type": "Vehicle", "label": "MH12 AB 1234"}
{"source": "P1", "target": "V001", "type": "OWNS", "case_id": "CASE-CAVIAR"}
```

The graph analytics in `2_analyze.py` (degree, betweenness, community
detection) work on the graph structure and don't care what the node types
are — a `Vehicle` or `Location` node behaves the same way in the math as a
`Person` node. So Part 5 (Neo4j) and Part 6 (Graph Analytics) don't need to
change when new entity types are added; only the ingestion step
(`1_load_data.py`-equivalent for that new source) needs to be written.

## Target model (Part 8+, once more data sources exist)

```
PERSON
 ├── (OWNS)        VEHICLE
 ├── (USES)        PHONE
 ├── (VISITED)     LOCATION
 ├── (HOLDS)       ACCOUNT
 ├── (MEMBER_OF)   ORGANIZATION
 ├── (INVOLVED_IN) CASE
 └── (SUPPORTED_BY) EVIDENCE
```

## What to build next, in order

1. Keep CAVIAR as the Person/CALLED backbone for demoing graph analytics —
   it's real, and it's enough to demonstrate Steps 6, 7, 8, 10.
2. When you're ready to demo the fuller model, add ONE new synthetic or
   real small dataset for a single new entity type (e.g. a small vehicle
   registry or FIR excerpt) rather than fabricating all seven types at once.
   Validate the ingestion + schema pattern on one new type before scaling out.
3. Only then move to Part 2 (Postgres) / Part 5 (Neo4j) so the storage layer
   is designed against a schema that's actually been exercised with 2+ entity
   types, not just guessed at.
