import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getEntity,
  getEntityRelationships,
  type EntityRelationships,
  type GraphNode,
  type GraphRelationship,
} from '../lib/dataClient'
import './EntityDetail.css'

interface RelationshipRowProps {
  relationship: GraphRelationship
  direction: 'outgoing' | 'incoming'
  entityId: string
  caseId: string
}

function DetailIcon({
  type,
}: {
  type: 'person' | 'location' | 'vehicle' | 'organization' | 'phone' | 'relationship'
}) {
  const paths = {
    person: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 21c0-4 2.8-6 7-6s7 2 7 6" />
      </>
    ),

    location: (
      <>
        <path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z" />
        <circle cx="12" cy="9" r="2.2" />
      </>
    ),

    vehicle: (
      <>
        <path d="M5 16l1.5-6h11L19 16" />
        <path d="M4 16h16v4H4z" />
        <circle cx="7.5" cy="20" r="1.3" />
        <circle cx="16.5" cy="20" r="1.3" />
      </>
    ),

    organization: (
      <>
        <rect x="5" y="4" width="14" height="17" rx="1" />
        <path d="M9 8h6M9 12h6M9 16h6" />
      </>
    ),

    phone: (
      <>
        <rect x="7" y="3" width="10" height="18" rx="2" />
        <path d="M10 18h4" />
      </>
    ),

    relationship: (
      <>
        <circle cx="7" cy="17" r="3" />
        <circle cx="17" cy="7" r="3" />
        <path d="M9.2 14.8 14.8 9.2" />
      </>
    ),
  }

  return (
    <svg
      className="entity-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[type]}
    </svg>
  )
}

function getEntityIconType(type: string) {
  const normalized = type.toLowerCase()

  if (normalized.includes('location')) return 'location'
  if (normalized.includes('vehicle')) return 'vehicle'
  if (normalized.includes('organization')) return 'organization'
  if (normalized.includes('phone')) return 'phone'

  return 'person'
}

function RelationshipRow({
  relationship,
  direction,
  entityId,
  caseId,
}: RelationshipRowProps) {
  const otherEntity =
    direction === 'outgoing'
      ? relationship.target
      : relationship.source

  const relationshipText =
    direction === 'outgoing'
      ? `${entityId} → ${otherEntity}`
      : `${otherEntity} → ${entityId}`

  return (
    <div className="relationship-row">

      <div className="relationship-direction">
        <DetailIcon type="relationship" />
      </div>

      <div className="relationship-main">

        <Link
          to={`/cases/${caseId}/entities/${otherEntity}`}
          className="relationship-entity"
        >
          {relationshipText}
        </Link>

        <span className="relationship-id mono">
          {otherEntity}
        </span>

      </div>

      <div className="relationship-type">
        {relationship.type}
      </div>

      {relationship.confidence !== undefined && (
        <div className="relationship-confidence mono">
          {Math.round(relationship.confidence * 100)}%
        </div>
      )}

    </div>
  )
}

export default function EntityDetail() {
  const { id, caseId } = useParams<{
    id: string
    caseId: string
  }>()

  const [entity, setEntity] = useState<GraphNode | null>(null)

  const [relationships, setRelationships] =
    useState<EntityRelationships>({
      outgoing: [],
      incoming: [],
    })

  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) {
      setNotFound(true)
      return
    }

    setEntity(null)
    setNotFound(false)

    Promise.all([
      getEntity(id),
      getEntityRelationships(id),
    ]).then(
      ([loadedEntity, loadedRelationships]) => {
        if (!loadedEntity) {
          setNotFound(true)
          return
        }

        setEntity(loadedEntity)
        setRelationships(loadedRelationships)
      },
    )
  }, [id])

  const activeCaseId = caseId || 'IIS-2026-001'

  if (notFound) {
    return (
      <div className="entity-detail-page">

        <div className="entity-not-found">

          <span className="section-step">
            ENTITY LOOKUP
          </span>

          <h1>Entity not found</h1>

          <p>
            No entity with ID{' '}
            <strong>{id}</strong>{' '}
            exists in the ingested investigation network.
          </p>

          <Link
            to={`/cases/${activeCaseId}/entities`}
            className="entity-back-link"
          >
            ← Back to entities
          </Link>

        </div>

      </div>
    )
  }

  if (!entity) {
    return (
      <div className="entity-detail-page">

        <div className="entity-loading">
          Loading entity evidence...
        </div>

      </div>
    )
  }

  const attributes = Object.entries(
    entity.attributes || {},
  )

  const totalConnections =
    relationships.outgoing.length +
    relationships.incoming.length

  const iconType = getEntityIconType(entity.type)

  return (
    <div className="entity-detail-page">

      {/* =========================================
          HEADER
      ========================================== */}

      <header className="entity-header">

        <div>

          <div className="entity-breadcrumb">
            <span>Case Workspace</span>
            <span>/</span>
            <Link
              to={`/cases/${activeCaseId}/entities`}
            >
              Entities
            </Link>
            <span>/</span>
            <strong>{entity.label}</strong>
          </div>

          <div className="entity-title-row">

            <div
              className={`entity-main-icon ${iconType}`}
            >
              <DetailIcon type={iconType as any} />
            </div>

            <div>

              <div className="entity-type-label">
                {entity.type.toUpperCase()} ENTITY
              </div>

              <h1>
                {entity.label}
              </h1>

              <code>
                {entity.entity_id}
              </code>

            </div>

          </div>

        </div>


        <div className="entity-connection-summary">

          <span>
            TOTAL CONNECTIONS
          </span>

          <strong>
            {totalConnections}
          </strong>

          <small>
            evidence relationships
          </small>

        </div>

      </header>


      {/* =========================================
          SUMMARY CARDS
      ========================================== */}

      <section className="entity-summary-grid">

        <div className="entity-info-card">

          <div className="card-heading">
            <h2>Entity Information</h2>
          </div>

          <div className="info-list">

            <div className="info-row">
              <span>Entity Type</span>
              <strong>{entity.type}</strong>
            </div>

            <div className="info-row">
              <span>Identifier</span>
              <code>{entity.entity_id}</code>
            </div>

            <div className="info-row">
              <span>Outgoing Relationships</span>
              <strong>
                {relationships.outgoing.length}
              </strong>
            </div>

            <div className="info-row">
              <span>Incoming Relationships</span>
              <strong>
                {relationships.incoming.length}
              </strong>
            </div>

          </div>

        </div>


        <div className="entity-analysis-card">

          <div className="card-heading">
            <h2>Investigation Summary</h2>
          </div>

          <div className="analysis-stat-grid">

            <div>
              <strong>{totalConnections}</strong>
              <span>Connections</span>
            </div>

            <div>
              <strong>
                {relationships.outgoing.length}
              </strong>
              <span>Outgoing</span>
            </div>

            <div>
              <strong>
                {relationships.incoming.length}
              </strong>
              <span>Incoming</span>
            </div>

          </div>

          <div className="analysis-note">
            Connection counts represent relationships extracted
            from available evidence.
          </div>

        </div>

      </section>


      {/* =========================================
          ATTRIBUTES
      ========================================== */}

      {attributes.length > 0 && (

        <section className="entity-section">

          <div className="section-heading">

            <div>
              <span className="section-step">
                ENTITY DATA
              </span>

              <h2>
                Extracted Attributes
              </h2>

              <p>
                Information extracted from ingested investigation
                sources.
              </p>
            </div>

          </div>


          <div className="attribute-grid">

            {attributes.map(([key, value]) => (

              <div
                className="attribute-card"
                key={key}
              >

                <span className="attribute-key mono">
                  {key}
                </span>

                <strong>
                  {String(value)}
                </strong>

              </div>

            ))}

          </div>

        </section>

      )}


      {/* =========================================
          RELATIONSHIPS
      ========================================== */}

      <section className="entity-section">

        <div className="section-heading">

          <div>

            <span className="section-step">
              EVIDENCE NETWORK
            </span>

            <h2>
              Evidence Relationships
            </h2>

            <p>
              Evidence-backed relationships connected to this
              entity.
            </p>

          </div>

          <div className="relationship-total mono">
            {totalConnections} TOTAL
          </div>

        </div>


        <div className="relationship-columns">

          {/* OUTGOING */}

          <div className="relationship-panel">

            <div className="relationship-panel-header">
              <span>
                OUTGOING
              </span>

              <strong>
                {relationships.outgoing.length}
              </strong>
            </div>

            <div className="relationship-list">

              {relationships.outgoing.length > 0 ? (
                relationships.outgoing.map(
                  (relationship) => (
                    <RelationshipRow
                      key={relationship.relationship_id}
                      relationship={relationship}
                      direction="outgoing"
                      entityId={entity.entity_id}
                      caseId={activeCaseId}
                    />
                  ),
                )
              ) : (
                <div className="relationship-empty">
                  No outgoing relationships recorded.
                </div>
              )}

            </div>

          </div>


          {/* INCOMING */}

          <div className="relationship-panel">

            <div className="relationship-panel-header">
              <span>
                INCOMING
              </span>

              <strong>
                {relationships.incoming.length}
              </strong>
            </div>

            <div className="relationship-list">

              {relationships.incoming.length > 0 ? (
                relationships.incoming.map(
                  (relationship) => (
                    <RelationshipRow
                      key={relationship.relationship_id}
                      relationship={relationship}
                      direction="incoming"
                      entityId={entity.entity_id}
                      caseId={activeCaseId}
                    />
                  ),
                )
              ) : (
                <div className="relationship-empty">
                  No incoming relationships recorded.
                </div>
              )}

            </div>

          </div>

        </div>

      </section>


      {/* =========================================
          DISCLAIMER
      ========================================== */}

      <div className="entity-disclaimer">

        Relationships are evidence-backed observations from
        ingested source records. They are presented for
        investigation review and do not by themselves establish
        intent, guilt, or criminal involvement.

      </div>

    </div>
  )
}