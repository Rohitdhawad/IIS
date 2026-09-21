import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  getCase,
  getEntity,
  getEntityRelationships,
  type CaseInfo,
  type GraphNode,
  type GraphRelationship,
} from '../lib/dataClient'

import './EntityDetail.css'

function formatDate(value?: string | null) {
  if (!value) return 'Not available'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Not available'
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getTypeClass(type: string) {
  const normalized = type.toLowerCase()

  if (normalized.includes('organization')) {
    return 'organization'
  }

  if (normalized.includes('location')) {
    return 'location'
  }

  if (normalized.includes('phone')) {
    return 'phone'
  }

  if (normalized.includes('vehicle')) {
    return 'vehicle'
  }

  return 'person'
}

function EntityIcon({ type }: { type: string }) {
  const normalized = type.toLowerCase()

  if (normalized.includes('location')) {
    return (
      <svg viewBox="0 0 24 24">
        <path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z" />
        <circle cx="12" cy="9" r="2.2" />
      </svg>
    )
  }

  if (normalized.includes('organization')) {
    return (
      <svg viewBox="0 0 24 24">
        <path d="M4 21V5h10v16" />
        <path d="M14 9h6v12" />
        <path d="M7 8h3M7 12h3M7 16h3M17 13h1M17 17h1" />
      </svg>
    )
  }

  if (normalized.includes('phone')) {
    return (
      <svg viewBox="0 0 24 24">
        <rect x="7" y="2.5" width="10" height="19" rx="2" />
        <path d="M10 5h4M11 18.5h2" />
      </svg>
    )
  }

  if (normalized.includes('vehicle')) {
    return (
      <svg viewBox="0 0 24 24">
        <path d="M5 16l1.5-6h11L19 16" />
        <path d="M4 16h16v3H4z" />
        <circle cx="7" cy="19" r="1.5" />
        <circle cx="17" cy="19" r="1.5" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 21c0-4 2.8-6 7-6s7 2 7 6" />
    </svg>
  )
}

/* ============================================================
   EVIDENCE PROVENANCE
   ============================================================ */

type EntityEvidenceRecord = {
  evidence_id: number
  case_id: string
  filename: string
  source_type: string
  file_type: string
  status: string
  storage_path: string
  public_url?: string | null
  uploaded_at?: string | null
  source_text?: string | null
  extraction_confidence?: number | null
}

type EntityEvidenceResponse = {
  entity: {
    entity_id: string
    case_id: string
    type: string
    label: string
    attributes?: Record<string, unknown>
  }
  evidence_count: number
  evidence: EntityEvidenceRecord[]
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8000'

async function getEntityEvidence(
  entityId: string,
): Promise<EntityEvidenceResponse> {
  const response = await fetch(
    `${API_BASE_URL}/evidence-provenance/entity/${encodeURIComponent(
      entityId,
    )}`,
  )

  if (!response.ok) {
    let message = 'Failed to load entity evidence.'

    try {
      const body = await response.json()

      if (body?.detail) {
        message = body.detail
      }
    } catch {
      // Keep default error message.
    }

    throw new Error(message)
  }

  return response.json()
}

export default function EntityDetail() {
  const { caseId, entityId } = useParams()

  const [caseInfo, setCaseInfo] =
    useState<CaseInfo | null>(null)

  const [entity, setEntity] =
    useState<GraphNode | null>(null)

  const [relationships, setRelationships] =
    useState<GraphRelationship[]>([])

  const [evidence, setEvidence] =
    useState<EntityEvidenceRecord[]>([])

  const [evidenceLoading, setEvidenceLoading] =
    useState(false)

  const [evidenceError, setEvidenceError] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    if (!caseId || !entityId) {
      setLoading(false)
      setError('Entity or case was not specified.')
      return
    }

    let cancelled = false

    async function loadEntity() {
      try {
        setLoading(true)
        setError('')
        setEvidenceError('')

        const decodedEntityId =
          decodeURIComponent(entityId)

        const [
          loadedCase,
          loadedEntity,
          loadedRelationships,
        ] = await Promise.all([
          getCase(caseId),
          getEntity(
            decodedEntityId,
            caseId,
          ),
          getEntityRelationships(
            decodedEntityId,
            caseId,
          ),
        ])

        if (cancelled) return

        setCaseInfo(loadedCase)
        setEntity(loadedEntity)

        const merged = [
          ...loadedRelationships.outgoing,
          ...loadedRelationships.incoming,
        ]

        const unique = Array.from(
          new Map(
            merged.map((relationship) => [
              relationship.relationship_id,
              relationship,
            ]),
          ).values(),
        )

        setRelationships(unique)

        /* ------------------------------------------------------
           Load direct evidence provenance for this entity.
        ------------------------------------------------------ */

        setEvidenceLoading(true)

        try {
          const provenance =
            await getEntityEvidence(
              decodedEntityId,
            )

          if (!cancelled) {
            setEvidence(
              provenance.evidence || [],
            )
          }
        } catch (provenanceError) {
          if (!cancelled) {
            console.error(
              'Failed to load entity evidence:',
              provenanceError,
            )

            setEvidenceError(
              provenanceError instanceof Error
                ? provenanceError.message
                : 'Failed to load evidence provenance.',
            )
          }
        } finally {
          if (!cancelled) {
            setEvidenceLoading(false)
          }
        }
      } catch (err) {
        if (cancelled) return

        console.error(
          'Failed to load entity:',
          err,
        )

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load entity.',
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadEntity()

    return () => {
      cancelled = true
    }
  }, [caseId, entityId])

  const outgoing = useMemo(
    () =>
      relationships.filter(
        (relationship) =>
          relationship.source === entity?.entity_id,
      ),
    [relationships, entity],
  )

  const incoming = useMemo(
    () =>
      relationships.filter(
        (relationship) =>
          relationship.target === entity?.entity_id,
      ),
    [relationships, entity],
  )

  const attributes = useMemo(() => {
    if (!entity?.attributes) return []

    return Object.entries(entity.attributes).filter(
      ([, value]) =>
        value !== null &&
        value !== undefined &&
        value !== '',
    )
  }, [entity])

  if (!caseId || !entityId) {
    return (
      <div className="entity-detail-page">
        <div className="entity-detail-empty">
          <h2>Entity not specified</h2>
          <p>
            Return to the entity list and select an entity.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="entity-detail-page">
        <div className="entity-detail-empty">
          <div className="entity-detail-loader" />
          <p>Loading entity intelligence...</p>
        </div>
      </div>
    )
  }

  if (error || !entity) {
    return (
      <div className="entity-detail-page">
        <div className="entity-detail-empty entity-detail-error">
          <h2>Unable to load entity</h2>
          <p>
            {error || 'The requested entity was not found.'}
          </p>

          <Link
            to={`/cases/${caseId}/entities`}
            className="entity-detail-back"
          >
            ← Back to Entities
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="entity-detail-page">
      <header className="entity-detail-header">
        <div>
          <div className="entity-detail-breadcrumb">
            <Link
              to={`/cases/${caseId}/entities`}
            >
              Entities
            </Link>

            <span>/</span>

            <strong>{entity.label}</strong>
          </div>

          <div className="entity-detail-case">
            <span>
              {caseInfo?.name || 'Investigation'}
            </span>

            <span className="mono">
              {caseId}
            </span>
          </div>
        </div>

        <div className="entity-detail-actions">
          <Link
            to={`/cases/${caseId}/network`}
            className="entity-detail-action"
          >
            Network →
          </Link>

          <Link
            to={`/cases/${caseId}/entities`}
            className="entity-detail-action secondary"
          >
            All Entities
          </Link>
        </div>
      </header>

      <section className="entity-hero">
        <div
          className={`entity-hero-icon ${getTypeClass(
            entity.type,
          )}`}
        >
          <EntityIcon type={entity.type} />
        </div>

        <div className="entity-hero-content">
          <span className="entity-hero-type">
            {entity.type}
          </span>

          <h1>{entity.label}</h1>

          <div className="entity-hero-id mono">
            {entity.entity_id}
          </div>
        </div>

        <div className="entity-hero-stat">
          <strong>{entity.degree}</strong>
          <span>Connections</span>
        </div>
      </section>

      <section className="entity-detail-grid">
        <div className="entity-detail-main">

          {/* ==================================================
              ENTITY PROFILE
          ================================================== */}

          <section className="entity-detail-panel">
            <div className="entity-panel-heading">
              <div>
                <span className="entity-panel-eyebrow">
                  ENTITY PROFILE
                </span>

                <h2>Attributes</h2>
              </div>
            </div>

            {attributes.length === 0 ? (
              <div className="entity-no-data">
                No additional attributes were extracted
                for this entity.
              </div>
            ) : (
              <div className="entity-attributes">
                {attributes.map(
                  ([key, value]) => (
                    <div
                      className="entity-attribute"
                      key={key}
                    >
                      <span>
                        {key.replaceAll('_', ' ')}
                      </span>

                      <strong>
                        {typeof value === 'object'
                          ? JSON.stringify(value)
                          : String(value)}
                      </strong>
                    </div>
                  ),
                )}
              </div>
            )}
          </section>

          {/* ==================================================
              EVIDENCE PROVENANCE
          ================================================== */}

          <section className="entity-detail-panel">
            <div className="entity-panel-heading">
              <div>
                <span className="entity-panel-eyebrow">
                  EVIDENCE PROVENANCE
                </span>

                <h2>Supporting Evidence</h2>
              </div>

              <span className="entity-panel-count">
                {evidence.length}
              </span>
            </div>

            {evidenceLoading ? (
              <div className="entity-no-data">
                Loading supporting evidence...
              </div>
            ) : evidenceError ? (
              <div className="entity-no-data">
                Unable to load evidence provenance.
                <br />
                <span
                  style={{
                    display: 'block',
                    marginTop: '6px',
                    fontSize: '10px',
                    opacity: 0.7,
                  }}
                >
                  {evidenceError}
                </span>
              </div>
            ) : evidence.length === 0 ? (
              <div className="entity-no-data">
                No direct evidence has been linked to this
                entity yet.
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {evidence.map((item) => (
                  <details
                    key={item.evidence_id}
                    style={{
                      border:
                        '1px solid var(--line-soft)',
                      background:
                        'var(--panel-2)',
                      borderRadius: '5px',
                      overflow: 'hidden',
                    }}
                  >
                    <summary
                      style={{
                        cursor: 'pointer',
                        padding: '13px 14px',
                        listStyle: 'none',
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            '1fr auto',
                          gap: '12px',
                          alignItems: 'center',
                        }}
                      >
                        <div
                          style={{
                            minWidth: 0,
                          }}
                        >
                          <strong
                            style={{
                              display: 'block',
                              color:
                                'var(--paper)',
                              fontSize: '11px',
                              marginBottom:
                                '5px',
                              overflow:
                                'hidden',
                              textOverflow:
                                'ellipsis',
                              whiteSpace:
                                'nowrap',
                            }}
                          >
                            {item.filename}
                          </strong>

                          <span
                            style={{
                              color:
                                'var(--paper-dim)',
                              fontSize: '9px',
                              fontFamily:
                                'var(--font-mono)',
                            }}
                          >
                            {item.source_type}
                            {' · '}
                            Evidence #{item.evidence_id}
                          </span>
                        </div>

                        <span
                          style={{
                            color:
                              'var(--amber)',
                            fontFamily:
                              'var(--font-mono)',
                            fontSize: '9px',
                            whiteSpace:
                              'nowrap',
                          }}
                        >
                          {item.extraction_confidence !==
                          null &&
                          item.extraction_confidence !==
                          undefined
                            ? `${Math.round(
                                item.extraction_confidence *
                                  100,
                              )}% CONF.`
                            : 'CONF. N/A'}
                        </span>
                      </div>
                    </summary>

                    <div
                      style={{
                        padding:
                          '0 14px 14px',
                        borderTop:
                          '1px solid var(--line-soft)',
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            'repeat(2, minmax(0, 1fr))',
                          gap: '10px',
                          padding:
                            '12px 0',
                        }}
                      >
                        <div>
                          <span
                            style={{
                              display:
                                'block',
                              color:
                                'var(--paper-dim)',
                              fontSize: '8px',
                              marginBottom:
                                '4px',
                            }}
                          >
                            SOURCE
                          </span>

                          <strong
                            style={{
                              color:
                                'var(--paper)',
                              fontSize: '10px',
                            }}
                          >
                            {item.source_type}
                          </strong>
                        </div>

                        <div>
                          <span
                            style={{
                              display:
                                'block',
                              color:
                                'var(--paper-dim)',
                              fontSize: '8px',
                              marginBottom:
                                '4px',
                            }}
                          >
                            FILE TYPE
                          </span>

                          <strong
                            style={{
                              color:
                                'var(--paper)',
                              fontSize: '10px',
                            }}
                          >
                            {item.file_type}
                          </strong>
                        </div>

                        <div>
                          <span
                            style={{
                              display:
                                'block',
                              color:
                                'var(--paper-dim)',
                              fontSize: '8px',
                              marginBottom:
                                '4px',
                            }}
                          >
                            STATUS
                          </span>

                          <strong
                            style={{
                              color:
                                'var(--paper)',
                              fontSize: '10px',
                            }}
                          >
                            {item.status}
                          </strong>
                        </div>

                        <div>
                          <span
                            style={{
                              display:
                                'block',
                              color:
                                'var(--paper-dim)',
                              fontSize: '8px',
                              marginBottom:
                                '4px',
                            }}
                          >
                            UPLOADED
                          </span>

                          <strong
                            style={{
                              color:
                                'var(--paper)',
                              fontSize: '10px',
                            }}
                          >
                            {formatDate(
                              item.uploaded_at,
                            )}
                          </strong>
                        </div>
                      </div>

                      {item.source_text && (
                        <div
                          style={{
                            marginTop: '4px',
                          }}
                        >
                          <span
                            style={{
                              display:
                                'block',
                              color:
                                'var(--paper-dim)',
                              fontSize: '8px',
                              marginBottom:
                                '6px',
                            }}
                          >
                            EXTRACTED SOURCE TEXT
                          </span>

                          <div
                            style={{
                              padding:
                                '11px 12px',
                              border:
                                '1px solid var(--line-soft)',
                              borderRadius:
                                '4px',
                              background:
                                'var(--panel-3)',
                              color:
                                'var(--paper)',
                              fontSize:
                                '10px',
                              lineHeight:
                                1.6,
                              fontFamily:
                                'var(--font-mono)',
                            }}
                          >
                            "{item.source_text}"
                          </div>
                        </div>
                      )}

                      {item.storage_path && (
                        <div
                          style={{
                            marginTop: '10px',
                          }}
                        >
                          <span
                            style={{
                              display:
                                'block',
                              color:
                                'var(--paper-dim)',
                              fontSize: '8px',
                              marginBottom:
                                '5px',
                            }}
                          >
                            EVIDENCE LOCATION
                          </span>

                          <span
                            className="mono"
                            style={{
                              display:
                                'block',
                              color:
                                'var(--paper-faint)',
                              fontSize: '8px',
                              lineHeight:
                                1.5,
                              wordBreak:
                                'break-all',
                            }}
                          >
                            {item.storage_path}
                          </span>
                        </div>
                      )}

                      {item.public_url && (
                        <div
                          style={{
                            marginTop: '12px',
                          }}
                        >
                          <a
                            href={item.public_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              color:
                                'var(--amber)',
                              fontSize: '9px',
                              fontFamily:
                                'var(--font-mono)',
                              textDecoration:
                                'none',
                            }}
                          >
                            OPEN ORIGINAL EVIDENCE →
                          </a>
                        </div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </section>

          {/* ==================================================
              NETWORK CONNECTIONS
          ================================================== */}

          <section className="entity-detail-panel">
            <div className="entity-panel-heading">
              <div>
                <span className="entity-panel-eyebrow">
                  NETWORK CONNECTIONS
                </span>

                <h2>
                  Relationships
                </h2>
              </div>

              <span className="entity-panel-count">
                {relationships.length}
              </span>
            </div>

            {relationships.length === 0 ? (
              <div className="entity-no-data">
                No relationships have been extracted for
                this entity yet.
              </div>
            ) : (
              <div className="entity-relationships">
                {relationships.map(
                  (relationship) => {
                    const isOutgoing =
                      relationship.source ===
                      entity.entity_id

                    const connectedId =
                      isOutgoing
                        ? relationship.target
                        : relationship.source

                    return (
                      <div
                        className="entity-relationship"
                        key={
                          relationship.relationship_id
                        }
                      >
                        <div className="entity-relationship-direction">
                          <span
                            className={
                              isOutgoing
                                ? 'outgoing'
                                : 'incoming'
                            }
                          >
                            {isOutgoing
                              ? 'OUT'
                              : 'IN'}
                          </span>

                          <span className="relationship-arrow">
                            →
                          </span>
                        </div>

                        <div className="entity-relationship-main">
                          <strong>
                            {relationship.type}
                          </strong>

                          <span className="mono">
                            {connectedId}
                          </span>
                        </div>

                        <div className="entity-relationship-meta">
                          <span>
                            Weight
                          </span>

                          <strong>
                            {relationship.weight}
                          </strong>
                        </div>

                        <div className="entity-relationship-meta">
                          <span>
                            Confidence
                          </span>

                          <strong>
                            {Math.round(
                              (relationship.confidence ??
                                1) * 100,
                            )}
                            %
                          </strong>
                        </div>
                      </div>
                    )
                  },
                )}
              </div>
            )}
          </section>
        </div>

        {/* ====================================================
            SIDEBAR
        ==================================================== */}

        <aside className="entity-detail-sidebar">
          <section className="entity-detail-panel">
            <div className="entity-panel-heading">
              <div>
                <span className="entity-panel-eyebrow">
                  NETWORK POSITION
                </span>

                <h2>Connectivity</h2>
              </div>
            </div>

            <div className="entity-connectivity">
              <div>
                <span>Total connections</span>
                <strong>{entity.degree}</strong>
              </div>

              <div>
                <span>Outgoing</span>
                <strong>
                  {outgoing.length}
                </strong>
              </div>

              <div>
                <span>Incoming</span>
                <strong>
                  {incoming.length}
                </strong>
              </div>
            </div>
          </section>

          <section className="entity-detail-panel">
            <div className="entity-panel-heading">
              <div>
                <span className="entity-panel-eyebrow">
                  IDENTIFICATION
                </span>

                <h2>Case Context</h2>
              </div>
            </div>

            <div className="entity-context">
              <div>
                <span>Case</span>
                <strong>
                  {caseInfo?.name || caseId}
                </strong>
              </div>

              <div>
                <span>Case ID</span>
                <strong className="mono">
                  {caseId}
                </strong>
              </div>

              <div>
                <span>Entity ID</span>
                <strong className="mono">
                  {entity.entity_id}
                </strong>
              </div>
            </div>
          </section>

          <section className="entity-detail-panel entity-review-panel">
            <span className="entity-panel-eyebrow">
              INVESTIGATOR REVIEW
            </span>

            <p>
              Connectivity represents relationships
              extracted from available evidence. It is a
              structural network measure and does not by
              itself establish criminal involvement.
            </p>
          </section>
        </aside>
      </section>
    </div>
  )
}