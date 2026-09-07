import { useEffect, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { getCase, getVisualGraph, type CaseInfo, type InvestigationGraph, type GraphNode, type GraphRelationship } from '../lib/dataClient'
import NetworkGraph from '../components/NetworkGraph'
import './Dashboard.css'

export default function Dashboard() {
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null)
  const [graph, setGraph] = useState<InvestigationGraph | null>(null)
  const [entityType, setEntityType] = useState('All')
  const [relationshipType, setRelationshipType] = useState('All')

  useEffect(() => {
    getCase().then(setCaseInfo)
    getVisualGraph().then(setGraph)
  }, [])

  const entityTypes = graph ? [...new Set(graph.nodes.map((node) => node.type))].sort() : []
  const relationshipTypes = graph ? [...new Set(graph.relationships.map((relationship) => relationship.type))].sort() : []
  const filteredNodes: GraphNode[] = graph?.nodes.filter((node) => entityType === 'All' || node.type === entityType) || []
  const visibleIds = new Set(filteredNodes.map((node) => node.id))
  const filteredLinks: GraphRelationship[] = graph?.links.filter((link) => {
    const matchesType = relationshipType === 'All' || link.type === relationshipType
    return matchesType && visibleIds.has(link.source) && visibleIds.has(link.target)
  }) || []
  const topEntities = [...filteredNodes].sort((a, b) => b.degree - a.degree).slice(0, 6)

  const handleEntityTypeChange = (event: ChangeEvent<HTMLSelectElement>) => setEntityType(event.target.value)
  const handleRelationshipTypeChange = (event: ChangeEvent<HTMLSelectElement>) => setRelationshipType(event.target.value)

  return (
    <div className="dashboard">
      <div className="page-header">
        <div className="eyebrow mono">Investigation Intelligence System</div>
        <h2>{caseInfo?.name || 'Ingested Investigation Network'}</h2>
        <p className="intro-text">Explore the entities and evidence-backed relationships selected from the data ingested into IIS.</p>
        {caseInfo && (
          <div className="case-stats">
            <span><b>{caseInfo.num_entities}</b> entities</span>
            <span><b>{caseInfo.num_relationships}</b> relationships</span>
            <span><b>{graph?.nodes.filter((node) => node.type === 'Case').length || 0}</b> case records</span>
          </div>
        )}
      </div>

      <div className="graph-section">
        <div className="graph-section-head">
          <h3>Evidence Network</h3>
          <div className="network-filters">
            <label>Entity type
              <select value={entityType} onChange={handleEntityTypeChange}>
                <option>All</option>
                {entityTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>
            <label>Relationship
              <select value={relationshipType} onChange={handleRelationshipTypeChange}>
                <option>All</option>
                {relationshipTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>
          </div>
        </div>
        <NetworkGraph nodes={filteredNodes} links={filteredLinks} height={480} />
        <div className="graph-stats-row mono">{filteredNodes.length} entities · {filteredLinks.length} relationships shown</div>
      </div>

      <div className="preview-section">
        <div className="preview-head">
          <h3>Most Connected Entities</h3>
          <span className="preview-link">Select an entity to inspect its evidence</span>
        </div>
        <div className="preview-grid">
          {topEntities.map((e) => (
            <Link to={`/entities/${e.entity_id}`} key={e.entity_id} className="preview-card">
              <div className="preview-id">{e.label}</div>
              <div className="preview-badge mono">{e.type}</div>
              <div className="preview-metric mono">{e.degree} connected records</div>
              <div className="preview-sub">{e.entity_id}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="disclaimer-block">
        The graph shows extracted and selected relationships from ingested
        evidence. It is a review aid and does not establish intent, guilt, or
        criminal involvement.
      </div>
    </div>
  )
}
