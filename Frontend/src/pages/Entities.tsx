import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  getCase,
  getVisualGraph,
  type CaseInfo,
  type GraphNode,
} from '../lib/dataClient'

import './Entities.css'

const ENTITY_TYPES = [
  'All',
  'Person',
  'Organization',
  'Phone',
  'Vehicle',
  'Location',
]

function normalizeType(type: string) {
  return type.trim().toLowerCase()
}

function EntityIcon({ type }: { type: string }) {
  const normalized = normalizeType(type)

  if (normalized === 'location') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z" />
        <circle cx="12" cy="9" r="2.2" />
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

  if (normalized === 'organization') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 21V5h10v16" />
        <path d="M14 9h6v12" />
        <path d="M7 8h3M7 12h3M7 16h3M17 13h1M17 17h1" />
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

export default function Entities() {
  const { caseId } = useParams()

  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null)
  const [entities, setEntities] = useState<GraphNode[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
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
        setEntities(graph.nodes)
      } catch (err) {
        if (cancelled) return

        console.error('Failed to load entities:', err)
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load entities.',
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

  const availableTypes = useMemo(() => {
    const types = new Set(
      entities.map((entity) => entity.type).filter(Boolean),
    )

    return [
      'All',
      ...Array.from(types).sort((a, b) =>
        a.localeCompare(b),
      ),
    ]
  }, [entities])

  const filteredEntities = useMemo(() => {
    const query = search.trim().toLowerCase()

    return entities
      .filter((entity) => {
        const matchesType =
          typeFilter === 'All' ||
          entity.type.toLowerCase() === typeFilter.toLowerCase()

        if (!matchesType) return false

        if (!query) return true

        return (
          entity.label.toLowerCase().includes(query) ||
          entity.entity_id.toLowerCase().includes(query) ||
          entity.type.toLowerCase().includes(query)
        )
      })
      .sort((a, b) => {
        if (b.degree !== a.degree) {
          return b.degree - a.degree
        }

        return a.label.localeCompare(b.label)
      })
  }, [entities, search, typeFilter])

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}

    for (const entity of entities) {
      counts[entity.type] = (counts[entity.type] || 0) + 1
    }

    return counts
  }, [entities])

  if (!caseId) {
    return (
      <div className="entities-page">
        <div className="entities-empty">
          <h2>No case selected</h2>
          <p>Select a case before opening the entity workspace.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="entities-page">
      <header className="entities-header">
        <div>
          <div className="entities-breadcrumb">
            Case Workspace / <strong>Entities</strong>
          </div>

          <h1>Entities</h1>

          <p>
            Extracted entities connected to the evidence in this
            investigation.
          </p>

          <div className="entities-case-meta">
            <span>{caseInfo?.name || 'Investigation'}</span>
            <span className="mono">{caseId}</span>
          </div>
        </div>

        <Link
          to={`/cases/${caseId}/network`}
          className="entities-network-link"
        >
          Open Network →
        </Link>
      </header>

      <section className="entities-summary">
        <div className="entities-summary-card">
          <strong>{entities.length}</strong>
          <span>Total entities</span>
        </div>

        {Object.entries(typeCounts).map(([type, count]) => (
          <div
            className="entities-summary-card"
            key={type}
          >
            <strong>{count}</strong>
            <span>{type}</span>
          </div>
        ))}
      </section>

      <section className="entities-toolbar">
        <div className="entities-search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 5 5" />
          </svg>

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search entities..."
          />
        </div>

        <select
          value={typeFilter}
          onChange={(event) =>
            setTypeFilter(event.target.value)
          }
        >
          {availableTypes.length > 1
            ? availableTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))
            : ENTITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
        </select>

        <div className="entities-result-count">
          {filteredEntities.length} shown
        </div>
      </section>

      {loading ? (
        <div className="entities-empty">
          <div className="entities-loader" />
          <p>Loading entities...</p>
        </div>
      ) : error ? (
        <div className="entities-empty entities-error">
          <h2>Unable to load entities</h2>
          <p>{error}</p>
        </div>
      ) : filteredEntities.length === 0 ? (
        <div className="entities-empty">
          <h2>No entities found</h2>
          <p>
            Upload and analyze evidence, or change the current
            search/filter.
          </p>
        </div>
      ) : (
        <section className="entities-grid">
          {filteredEntities.map((entity) => (
            <EntityCard
              key={entity.entity_id}
              entity={entity}
              caseId={caseId}
            />
          ))}
        </section>
      )}

      {!loading && entities.length > 0 && (
        <div className="entities-footer">
          Showing {filteredEntities.length} of {entities.length}{' '}
          entities
        </div>
      )}
    </div>
  )
}

function EntityCard({
  entity,
  caseId,
}: {
  entity: GraphNode
  caseId: string
}) {
  return (
    <Link
      to={`/cases/${caseId}/entities/${encodeURIComponent(
        entity.entity_id,
      )}`}
      className="entity-list-card"
    >
      <div className="entity-list-card-header">
        <div
          className={`entity-list-icon ${normalizeType(
            entity.type,
          )}`}
        >
          <EntityIcon type={entity.type} />
        </div>

        <span className="entity-list-type">
          {entity.type}
        </span>
      </div>

      <h3>{entity.label}</h3>

      <div className="entity-list-id mono">
        {entity.entity_id}
      </div>

      <div className="entity-list-footer">
        <span>
          <strong>{entity.degree}</strong> connections
        </span>

        <span>View →</span>
      </div>
    </Link>
  )
}