import { useEffect, useState, type ChangeEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCaseGraph, type InvestigationGraph, type GraphNode, type GraphRelationship } from '../lib/dataClient'
import NetworkGraph from '../components/NetworkGraph'
import './CaseNetwork.css'

export default function CaseNetwork() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()

  const [graph, setGraph] = useState<InvestigationGraph | null>(null)
  const [entityType, setEntityType] = useState('All')
  const [relationshipType, setRelationshipType] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!caseId) return
    getCaseGraph(caseId).then((g) => {
      setGraph(g)
      setLoading(false)
    })
  }, [caseId])

  const entityTypes = graph ? [...new Set(graph.nodes.map((n) => n.type))].sort() : []
  const relationshipTypes = graph ? [...new Set(graph.relationships.map((r) => r.type))].sort() : []

  const filteredNodes: GraphNode[] = graph
    ? graph.nodes.filter((n) => entityType === 'All' || n.type === entityType)
    : []

  const visibleIds = new Set(filteredNodes.map((n) => n.id))

  const filteredLinks: GraphRelationship[] = graph
    ? graph.links.filter((l) => {
        const matchesType = relationshipType === 'All' || l.type === relationshipType
        return matchesType && visibleIds.has(l.source as string) && visibleIds.has(l.target as string)
      })
    : []

  return (
    <div className="case-network">
      <div className="cn-header">
        <div className="eyebrow mono">Case Workspace · {caseId}</div>
        <h2>Network Graph</h2>
        <p className="intro-text">
          Evidence-backed entity relationship network for this case. Nodes represent entities;
          edges represent ingested relationships. Click a node to inspect it.
        </p>
      </div>

      {loading && <div className="cn-status mono">Loading network graph...</div>}

      {!loading && graph && (
        <>
          {/* Filters */}
          <div className="cn-filters">
            <label className="cn-filter-field">
              <span className="cn-filter-label mono">Entity type</span>
              <select
                value={entityType}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setEntityType(e.target.value)}
              >
                <option>All</option>
                {entityTypes.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="cn-filter-field">
              <span className="cn-filter-label mono">Relationship</span>
              <select
                value={relationshipType}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setRelationshipType(e.target.value)}
              >
                <option>All</option>
                {relationshipTypes.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <span className="cn-stats mono">
              {filteredNodes.length} entities · {filteredLinks.length} relationships
            </span>
          </div>

          {/* D3 Network Graph — reuses existing component */}
          <div className="cn-graph-wrap">
            <NetworkGraph nodes={filteredNodes} links={filteredLinks} height={520} />
          </div>

          {/* Entity type legend summary */}
          <div className="cn-entity-summary">
            <div className="cn-summary-label mono">Entity breakdown</div>
            <div className="cn-summary-pills">
              {entityTypes.map((type) => {
                const count = filteredNodes.filter((n) => n.type === type).length
                return (
                  <div key={type} className="cn-summary-pill">
                    <span className="cn-pill-type">{type}</span>
                    <span className="cn-pill-count mono">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Relationship type summary */}
          <div className="cn-entity-summary">
            <div className="cn-summary-label mono">Relationship types</div>
            <div className="cn-summary-pills">
              {relationshipTypes.map((type) => {
                const count = filteredLinks.filter((l) => l.type === type).length
                return (
                  <div key={type} className="cn-summary-pill">
                    <span className="cn-pill-type">{type}</span>
                    <span className="cn-pill-count mono">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Back — deterministic, no navigate(-1) */}
      <div className="cn-back-row">
        <button className="btn ghost" onClick={() => navigate(`/app/cases/${caseId}`)}>
          ← Back to Case Workspace
        </button>
      </div>

      <div className="disclaimer-block">
        The network graph shows evidence-backed relationships extracted from ingested source
        documents. It is a review aid and does not establish intent, guilt or criminal involvement.
        Click any node to inspect its full entity record and relationships.
      </div>
    </div>
  )
}
