import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  getCaseGraph,
  getEntityRelationships,
  type GraphNode,
  type GraphRelationship,
} from '../lib/dataClient'
import './CaseEntities.css'

// ─── Entity list view ─────────────────────────────────────────────────────

function EntityList({
  nodes,
  caseId,
  onSelect,
  selectedId,
}: {
  nodes: GraphNode[]
  caseId: string
  onSelect: (id: string) => void
  selectedId: string | null
}) {
  return (
    <div className="ce-entity-list">
      {nodes.map((n) => (
        <button
          key={n.entity_id}
          className={`ce-entity-row${selectedId === n.entity_id ? ' selected' : ''}`}
          onClick={() => onSelect(n.entity_id)}
        >
          <div className="ce-entity-label">{n.label}</div>
          <div className="ce-entity-meta mono">
            <span className="ce-entity-type">{n.type}</span>
            <span className="ce-entity-degree">{n.degree} connections</span>
          </div>
        </button>
      ))}
    </div>
  )
}

// ─── Entity detail panel ──────────────────────────────────────────────────

function EntityPanel({
  entity,
  relationships,
  caseId,
}: {
  entity: GraphNode
  relationships: { outgoing: GraphRelationship[]; incoming: GraphRelationship[] }
  caseId: string
}) {
  const attrs = Object.entries(entity.attributes || {})
  const total = relationships.outgoing.length + relationships.incoming.length

  return (
    <div className="ce-panel">
      <div className="ce-panel-header">
        <div className="ce-panel-eyebrow mono">Entity Record</div>
        <h3 className="ce-panel-title">{entity.label}</h3>
        <div className="ce-panel-badges">
          <span className="ce-type-badge mono">{entity.type}</span>
          <span className="ce-deg-badge mono">{total} connections</span>
        </div>
      </div>

      <div className="ce-panel-id-block mono">{entity.entity_id}</div>

      {attrs.length > 0 && (
        <div className="ce-panel-section">
          <div className="ce-panel-section-label mono">Attributes</div>
          <div className="ce-attr-grid">
            {attrs.map(([k, v]) => (
              <div key={k} className="ce-attr-row">
                <span className="ce-attr-key mono">{k}</span>
                <span className="ce-attr-val">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ce-panel-section">
        <div className="ce-panel-section-label mono">Relationships</div>
        <div className="ce-rel-grid">
          <div>
            <div className="ce-rel-col-label mono">Outgoing — {relationships.outgoing.length}</div>
            {relationships.outgoing.length === 0 && (
              <div className="ce-rel-empty">None recorded</div>
            )}
            {relationships.outgoing.map((r) => (
              <div key={r.relationship_id} className="ce-rel-row">
                <span className="ce-rel-arrow mono">→</span>
                <Link
                  to={`/app/cases/${caseId}/entities/${r.target}`}
                  className="ce-rel-link"
                >
                  {r.target}
                </Link>
                <span className="ce-rel-type mono">{r.type}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="ce-rel-col-label mono">Incoming — {relationships.incoming.length}</div>
            {relationships.incoming.length === 0 && (
              <div className="ce-rel-empty">None recorded</div>
            )}
            {relationships.incoming.map((r) => (
              <div key={r.relationship_id} className="ce-rel-row">
                <span className="ce-rel-arrow mono">←</span>
                <Link
                  to={`/app/cases/${caseId}/entities/${r.source}`}
                  className="ce-rel-link"
                >
                  {r.source}
                </Link>
                <span className="ce-rel-type mono">{r.type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ce-panel-disclaimer">
        Relationships shown are evidence-backed records from ingested source documents.
        They do not by themselves establish intent, guilt or criminal involvement.
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────

export default function CaseEntities() {
  const { caseId, entityId } = useParams<{ caseId: string; entityId?: string }>()
  const navigate = useNavigate()

  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [typeFilter, setTypeFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [selectedId, setSelectedId] = useState<string | null>(entityId || null)
  const [selectedEntity, setSelectedEntity] = useState<GraphNode | null>(null)
  const [selectedRels, setSelectedRels] = useState<{
    outgoing: GraphRelationship[]
    incoming: GraphRelationship[]
  }>({ outgoing: [], incoming: [] })
  const [loadingEntity, setLoadingEntity] = useState(false)

  // Load all entities for case
  useEffect(() => {
    if (!caseId) return
    getCaseGraph(caseId).then((g) => {
      const sorted = [...g.nodes].sort((a, b) => b.degree - a.degree)
      setNodes(sorted)
      setLoading(false)
    })
  }, [caseId])

  // When entityId param changes (deep-link), sync selected
  useEffect(() => {
    if (entityId) setSelectedId(entityId)
  }, [entityId])

  // Load selected entity detail
  useEffect(() => {
    if (!selectedId) return
    setLoadingEntity(true)
    Promise.all([
      nodes.find((n) => n.entity_id === selectedId) || null,
      getEntityRelationships(selectedId),
    ]).then(([entity, rels]) => {
      // If not in cache yet, find from nodes state after load
      const found = entity || nodes.find((n) => n.entity_id === selectedId) || null
      setSelectedEntity(found)
      setSelectedRels(rels)
      setLoadingEntity(false)
    })
  }, [selectedId, nodes])

  const entityTypes = ['All', ...Array.from(new Set(nodes.map((n) => n.type))).sort()]

  const filteredNodes = nodes.filter((n) => {
    const matchType = typeFilter === 'All' || n.type === typeFilter
    const q = search.trim().toLowerCase()
    const matchSearch = !q || n.label.toLowerCase().includes(q) || n.entity_id.toLowerCase().includes(q)
    return matchType && matchSearch
  })

  const handleSelect = (id: string) => {
    setSelectedId(id)
    // Update URL without full navigation so back stays deterministic
    navigate(`/app/cases/${caseId}/entities/${id}`, { replace: true })
  }

  return (
    <div className="case-entities">
      <div className="ce-header">
        <div className="eyebrow mono">Case Workspace · {caseId}</div>
        <h2>Entity Explorer</h2>
        <p className="intro-text">
          Browse entities associated with this investigation. Select one to inspect its
          attributes and evidence relationships.
        </p>
      </div>

      {loading && <div className="ce-status mono">Loading entities...</div>}

      {!loading && (
        <div className="ce-layout">
          {/* Left: entity list */}
          <div className="ce-list-col">
            <div className="ce-list-controls">
              <input
                type="text"
                className="ce-search-input"
                placeholder="Search entities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="ce-type-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                {entityTypes.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="ce-list-count mono">{filteredNodes.length} entities</div>
            <EntityList
              nodes={filteredNodes}
              caseId={caseId!}
              onSelect={handleSelect}
              selectedId={selectedId}
            />
          </div>

          {/* Right: entity detail */}
          <div className="ce-detail-col">
            {!selectedId && (
              <div className="ce-select-prompt">
                <div className="ce-select-prompt-text mono">
                  Select an entity from the list to inspect its record.
                </div>
              </div>
            )}
            {selectedId && loadingEntity && (
              <div className="ce-status mono">Loading entity record...</div>
            )}
            {selectedId && !loadingEntity && selectedEntity && (
              <EntityPanel
                entity={selectedEntity}
                relationships={selectedRels}
                caseId={caseId!}
              />
            )}
            {selectedId && !loadingEntity && !selectedEntity && (
              <div className="ce-status mono">Entity not found in ingested data.</div>
            )}
          </div>
        </div>
      )}

      {/* Back — deterministic */}
      <div className="ce-back-row">
        <button
          className="btn ghost"
          onClick={() => navigate(`/app/cases/${caseId}`)}
        >
          ← Back to Case Workspace
        </button>
      </div>

      <div className="disclaimer-block">
        Entity records and relationships are derived from ingested evidence documents.
        They are presented for investigator review and do not independently establish
        intent, guilt or criminal involvement.
      </div>
    </div>
  )
}
