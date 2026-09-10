# IIS Frontend - Investigation Intelligence System

React frontend for the Investigation Intelligence System. It visualizes the
evidence-backed network produced by the IIS ingestion pipeline.

## Pages

- **Investigation Network** (`/`) - interactive force-directed graph of
  ingested entities and evidence-backed relationships, with type filters
- **Entity Detail** (`/entities/:id`) - entity attributes and incoming or
  outgoing evidence relationships

## Setup

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`.

## Production build

```bash
npm run build
npm run preview
```

## Data source

The frontend requests the selected visualization graph from the IIS API at
`http://localhost:8000/graph/visual`. If the API is unavailable, it falls
back to `src/data/visual_graph.json`, copied from the processed IIS graph.

Set `VITE_IIS_API_URL` when the API runs at another address:

```powershell
$env:VITE_IIS_API_URL = "http://localhost:8001"
```

All graph access goes through `src/lib/dataClient.js`. Pages do not need to
know whether the graph came from the live API or the local IIS fallback.

The graph contract is `case_id`, `nodes`, and `relationships`. Nodes contain
`entity_id`, `type`, `label`, and `attributes`; relationships contain source,
target, type, timestamp, confidence, and evidence metadata.

## Design notes

- Dark evidence-review theme with entity-type colors and relationship detail
- IBM Plex Sans for UI text and IBM Plex Mono for identifiers and data
- The UI describes relationships as evidence-backed observations and avoids
  presenting graph structure as a conclusion about guilt or intent
