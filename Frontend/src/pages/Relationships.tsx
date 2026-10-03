import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  getCase,
  getVisualGraph,
  type CaseInfo,
  type GraphNode,
  type GraphRelationship,
} from '../lib/dataClient'

import './Relationships.css'

function EntityIcon({ type }: { type: string }) {
  const normalized = type.toLowerCase()

  if (normalized === 'location') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z" />
        <circle cx="12" cy="9" r="2.2" />
      </svg>
    )
  }

  if (normalized === 'organization') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 21V5h10v16" />
        <path d="M14 9h6v12" />
        <path d="M7 8h3M7 12h3M7 16h3M17 13h1M17 17h1" />
      </svg>
    )
  }

  if (normalized === 'phone') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="7" y="2.5" width="10" height="19" rx="2" />
        <path d="M10 5h4M11 18.5h2" />
      </svg>
    )
  }

  if (normalized === 'vehicle') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 16l1.5-6h11L19 16" />
        <path d="M4 16h16v3H4z" />
        <circle cx="7" cy="19" r="1.5" />
        <circle cx="17" cy="19" r="1.5" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 21c0-4 2.8-6 7-6s7 2 7 6" />
    </svg>
  )
}

export default function Relationships() {
  const { caseId } = useParams()

  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [relationships, setRelationships] = useState<
    GraphRelationship[]
  >([])

  const [search, setSearch] = useState('')
  const [relationshipFilter, setRelationshipFilter] =
    useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!caseId) {
      setLoading(false)
      setError('No case selected.')
      return
    }

    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError('')

        const [loadedCase, graph] = await Promise.all([
          getCase(caseId),
          getVisualGraph(caseId),
        ])

        if (cancelled) return

        setCaseInfo(loadedCase)
        setNodes(graph.nodes)
        setRelationships(graph.relationships)
      } catch (err) {
        if (cancelled) return

        console.error(
          'Failed to load relationships:',
          err,
        )

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load relationships.',
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [caseId])

  const nodeMap = useMemo(() => {
    return new Map(
      nodes.map((node) => [node.entity_id, node]),
    )
  }, [nodes])

  const relationshipTypes = useMemo(() => {
    return [
      'All',
      ...Array.from(
        new Set(
          relationships
            .map((relationship) => relationship.type)
            .filter(Boolean),
        ),
      ).sort(),
    ]
  }, [relationships])

  const filteredRelationships = useMemo(() => {
    const query = search.trim().toLowerCase()

    return relationships
      .filter((relationship) => {
        if (
          relationshipFilter !== 'All' &&
          relationship.type.toLowerCase() !==
            relationshipFilter.toLowerCase()
        ) {
          return false
        }

        if (!query) return true

        const source =
          nodeMap.get(relationship.source)
        const target =
          nodeMap.get(relationship.target)

        return (
          relationship.type
            .toLowerCase()
            .includes(query) ||
          relationship.source
            .toLowerCase()
            .includes(query) ||
          relationship.target
            .toLowerCase()
            .includes(query) ||
          source?.label
            .toLowerCase()
            .includes(query) ||
          target?.label
            .toLowerCase()
            .includes(query)
        )
      })
      .sort((a, b) => {
        if (b.weight !== a.weight) {
          return b.weight - a.weight
        }

        return a.type.localeCompare(b.type)
      })
  }, [
    relationships,
    relationshipFilter,
    search,
    nodeMap,
  ])

  const relationshipCounts = useMemo(() => {
    const counts: Record<string, number> = {}

    relationships.forEach((relationship) => {
      counts[relationship.type] =
        (counts[relationship.type] || 0) + 1
    })

    return Object.entries(counts).sort(
      (a, b) => b[1] - a[1],
    )
  }, [relationships])

  if (!caseId) {
    return (
      <div className="relationships-page">
        <div className="relationships-empty">
          <h2>No case selected</h2>
          <p>Select a case before opening relationships.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relationships-page">
      <header className="relationships-header">
        <div>
          <div className="relationships-breadcrumb">
            Case Workspace / <strong>Relationships</strong>
          </div>

          <h1>Relationships</h1>

          <p>
            Evidence-backed connections extracted from the
            investigation data.
          </p>

          <div className="relationships-case-meta">
            <span>
              {caseInfo?.name || 'Investigation'}
            </span>
            <span className="mono">{caseId}</span>
          </div>
        </div>

        <Link
          to={`/cases/${caseId}/network`}
          className="relationships-network-link"
        >
          Open Network →
        </Link>
      </header>

      <section className="relationships-summary">
        <div className="relationships-summary-card">
          <strong>{relationships.length}</strong>
          <span>Total relationships</span>
        </div>

        <div className="relationships-summary-card">
          <strong>{relationshipCounts.length}</strong>
          <span>Relationship types</span>
        </div>

        <div className="relationships-summary-card">
          <strong>{nodes.length}</strong>
          <span>Connected entities</span>
        </div>
      </section>

      <section className="relationships-toolbar">
        <div className="relationships-search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 5 5" />
          </svg>

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search entities or relationships..."
          />
        </div>

        <select
          value={relationshipFilter}
          onChange={(event) =>
            setRelationshipFilter(event.target.value)
          }
        >
          {relationshipTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <div className="relationships-result-count">
          {filteredRelationships.length} shown
        </div>
      </section>

      {!loading && relationshipCounts.length > 0 && (
        <section className="relationship-types">
          {relationshipCounts.map(([type, count]) => (
            <button
              key={type}
              type="button"
              className={
                relationshipFilter === type
                  ? 'relationship-type-chip active'
                  : 'relationship-type-chip'
              }
              onClick={() =>
                setRelationshipFilter(
                  relationshipFilter === type
                    ? 'All'
                    : type,
                )
              }
            >
              <span>{type}</span>
              <strong>{count}</strong>
            </button>
          ))}
        </section>
      )}

      {loading ? (
        <div className="relationships-empty">
          <div className="relationships-loader" />
          <p>Loading relationships...</p>
        </div>
      ) : error ? (
        <div className="relationships-empty relationships-error">
          <h2>Unable to load relationships</h2>
          <p>{error}</p>
        </div>
      ) : filteredRelationships.length === 0 ? (
        <div className="relationships-empty">
          <h2>No relationships found</h2>
          <p>
            Analyze evidence or change the current search/filter.
          </p>
        </div>
      ) : (
        <section className="relationships-list">
          {filteredRelationships.map((relationship) => {
            const source = nodeMap.get(relationship.source)
            const target = nodeMap.get(relationship.target)

            return (
              <RelationshipCard
                key={relationship.relationship_id}
                relationship={relationship}
                source={source}
                target={target}
                caseId={caseId}
              />
            )
          })}
        </section>
      )}

      {!loading && relationships.length > 0 && (
        <div className="relationships-footer">
          Showing {filteredRelationships.length} of{' '}
          {relationships.length} relationships
        </div>
      )}
    </div>
  )
}

function RelationshipCard({
  relationship,
  source,
  target,
  caseId,
}: {
  relationship: GraphRelationship
  source?: GraphNode
  target?: GraphNode
  caseId: string
}) {
  return (
    <div className="relationship-card">
      <div className="relationship-entity">
        <div
          className={`relationship-entity-icon ${
            source?.type.toLowerCase() || 'entity'
          }`}
        >
          <EntityIcon type={source?.type || 'Person'} />
        </div>

        <div className="relationship-entity-content">
          <Link
            to={`/cases/${caseId}/entities/${encodeURIComponent(
              relationship.source,
            )}`}
          >
            {source?.label || relationship.source}
          </Link>

          <span>
            {source?.type || 'Entity'}
          </span>

          <small className="mono">
            {relationship.source}
          </small>
        </div>
      </div>

      <div className="relationship-middle">
        <span className="relationship-type">
          {relationship.type}
        </span>

        <span className="relationship-arrow">
          →
        </span>

        <span className="relationship-weight">
          {relationship.weight > 1
            ? `${relationship.weight} observations`
            : 'Observed connection'}
        </span>
      </div>

      <div className="relationship-entity relationship-target">
        <div
          className={`relationship-entity-icon ${
            target?.type.toLowerCase() || 'entity'
          }`}
        >
          <EntityIcon type={target?.type || 'Person'} />
        </div>

        <div className="relationship-entity-content">
          <Link
            to={`/cases/${caseId}/entities/${encodeURIComponent(
              relationship.target,
            )}`}
          >
            {target?.label || relationship.target}
          </Link>

          <span>
            {target?.type || 'Entity'}
          </span>

          <small className="mono">
            {relationship.target}
          </small>
        </div>
      </div>

      <div className="relationship-confidence">
        <span>Confidence</span>
        <strong>
          {Math.round(
            (relationship.confidence ?? 1) * 100,
          )}
          %
        </strong>
      </div>
    </div>
  )
}