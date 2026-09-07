import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getEntity, getEntityRelationships, type EntityRelationships, type GraphNode, type GraphRelationship } from '../lib/dataClient'
import './EntityDetail.css'

interface RelationshipRowProps {
  relationship: GraphRelationship
  direction: 'outgoing' | 'incoming'
  entityId: string
}

function RelationshipRow({ relationship, direction, entityId }: RelationshipRowProps) {
  const otherEntity = direction === 'outgoing' ? relationship.target : relationship.source
  return (
    <div className="ev-row">
      <Link to={`/entities/${otherEntity}`}>
        {direction === 'outgoing' ? `${entityId} -> ${otherEntity}` : `${otherEntity} -> ${entityId}`}
      </Link>
      <span className="ev-calls">{relationship.type}</span>
    </div>
  )
}

export default function EntityDetail() {
  const { id } = useParams<{ id: string }>()
  const [entity, setEntity] = useState<GraphNode | null>(null)
  const [relationships, setRelationships] = useState<EntityRelationships>({ outgoing: [], incoming: [] })
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) {
      setNotFound(true)
      return
    }
    setEntity(null)
    setNotFound(false)
    Promise.all([getEntity(id), getEntityRelationships(id)]).then(([loadedEntity, loadedRelationships]) => {
      if (!loadedEntity) {
        setNotFound(true)
        return
      }
      setEntity(loadedEntity)
      setRelationships(loadedRelationships)
    })
  }, [id])

  if (notFound) {
    return (
      <div className="page-header">
        <h2>Entity not found</h2>
        <p className="intro-text">No entity with ID "{id}" exists in the ingested network.</p>
        <Link to="/" className="preview-link">Back to investigation network</Link>
      </div>
    )
  }

  if (!entity) {
    return <div className="page-header"><p className="intro-text">Loading entity evidence...</p></div>
  }

  const attributes = Object.entries(entity.attributes || {})
  const totalConnections = relationships.outgoing.length + relationships.incoming.length

  return (
    <div>
      <div className="page-header">
        <div className="eyebrow mono">Ingested Entity</div>
        <h2>{entity.label}</h2>
        <div className="case-stats">
          <span><b>{entity.type}</b> entity type</span>
          <span><b>{totalConnections}</b> connected records</span>
        </div>
      </div>

      <div className="section-label mono">ENTITY IDENTIFIER</div>
      <div className="entity-id-panel mono">{entity.entity_id}</div>

      {attributes.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 30 }}>Extracted attributes</div>
          <div className="attribute-grid">
            {attributes.map(([key, value]) => (
              <div className="attribute" key={key}>
                <span className="attribute-key mono">{key}</span>
                <span>{String(value)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-label" style={{ marginTop: 30 }}>Evidence relationships</div>
      <div className="rank-evidence-grid">
        <div>
          <div className="ev-col-label">OUTGOING — {relationships.outgoing.length}</div>
          {relationships.outgoing.length ? relationships.outgoing.map((relationship) => (
            <RelationshipRow key={relationship.relationship_id} relationship={relationship} direction="outgoing" entityId={entity.entity_id} />
          )) : <div className="ev-empty">No outgoing relationships recorded</div>}
        </div>
        <div>
          <div className="ev-col-label">INCOMING — {relationships.incoming.length}</div>
          {relationships.incoming.length ? relationships.incoming.map((relationship) => (
            <RelationshipRow key={relationship.relationship_id} relationship={relationship} direction="incoming" entityId={entity.entity_id} />
          )) : <div className="ev-empty">No incoming relationships recorded</div>}
        </div>
      </div>

      <div className="disclaimer-block" style={{ marginTop: 28 }}>
        Relationships are evidence-backed observations from ingested source
        records. They are presented for investigation review and do not by
        themselves establish intent, guilt, or criminal involvement.
      </div>
    </div>
  )
}
