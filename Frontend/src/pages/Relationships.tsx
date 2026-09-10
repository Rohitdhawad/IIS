import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getVisualGraph,
  type InvestigationGraph,
} from '../lib/dataClient'
import './Relationships.css'

type SortOption = 'confidence' | 'relationship' | 'source' | 'target'

function RelationshipIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7" cy="17" r="3" />
      <circle cx="17" cy="7" r="3" />
      <path d="M9.2 14.8 14.8 9.2" />
    </svg>
  )
}

function getNodeLabel(
  graph: InvestigationGraph,
  id: string,
) {
  return (
    graph.nodes.find((node) => node.entity_id === id)?.label ||
    graph.nodes.find((node) => node.id === id)?.label ||
    id
  )
}

function getNodeType(
  graph: InvestigationGraph,
  id: string,
) {
  return (
    graph.nodes.find((node) => node.entity_id === id)?.type ||
    graph.nodes.find((node) => node.id === id)?.type ||
    'Entity'
  )
}

export default function Relationships() {
  const [graph, setGraph] =
    useState<InvestigationGraph | null>(null)

  const [search, setSearch] = useState('')
  const [relationshipFilter, setRelationshipFilter] =
    useState('All')

  const [sortBy, setSortBy] =
    useState<SortOption>('confidence')

  useEffect(() => {
    getVisualGraph().then(setGraph)
  }, [])

  const relationships = graph?.relationships || []

  const relationshipTypes = useMemo(
    () =>
      [
        ...new Set(
          relationships.map(
            (relationship) => relationship.type,
          ),
        ),
      ].sort(),
    [relationships],
  )

  const filteredRelationships = useMemo(() => {
    const query = search.trim().toLowerCase()

    const filtered = relationships.filter(
      (relationship) => {
        const sourceLabel = graph
          ? getNodeLabel(graph, relationship.source)
          : relationship.source

        const targetLabel = graph
          ? getNodeLabel(graph, relationship.target)
          : relationship.target

        const matchesSearch =
          !query ||
          sourceLabel.toLowerCase().includes(query) ||
          targetLabel.toLowerCase().includes(query) ||
          relationship.source.toLowerCase().includes(query) ||
          relationship.target.toLowerCase().includes(query) ||
          relationship.type.toLowerCase().includes(query)

        const matchesType =
          relationshipFilter === 'All' ||
          relationship.type === relationshipFilter

        return matchesSearch && matchesType
      },
    )

    return [...filtered].sort((a, b) => {
      if (sortBy === 'relationship') {
        return a.type.localeCompare(b.type)
      }

      if (sortBy === 'source' && graph) {
        return getNodeLabel(graph, a.source).localeCompare(
          getNodeLabel(graph, b.source),
        )
      }

      if (sortBy === 'target' && graph) {
        return getNodeLabel(graph, a.target).localeCompare(
          getNodeLabel(graph, b.target),
        )
      }

      return (
        (b.confidence ?? 0) -
        (a.confidence ?? 0)
      )
    })
  }, [
    relationships,
    graph,
    search,
    relationshipFilter,
    sortBy,
  ])

  const averageConfidence =
    relationships.length > 0
      ? relationships.reduce(
          (sum, relationship) =>
            sum + (relationship.confidence ?? 0),
          0,
        ) / relationships.length
      : 0

  return (
    <div className="relationships-page">

      {/* =========================================
          HEADER
      ========================================== */}

      <header className="relationships-header">

        <div>

          <div className="relationships-breadcrumb">
            <span>Case Workspace</span>
            <span>/</span>
            <strong>Relationships</strong>
          </div>

          <h1>Relationships</h1>

          <p>
            Review evidence-backed connections between entities
            identified across the investigation data.
          </p>

        </div>

        <div className="relationships-header-stat">

          <span>TOTAL RELATIONSHIPS</span>

          <strong>
            {relationships.length}
          </strong>

          <small>
            {relationshipTypes.length} relationship types
          </small>

        </div>

      </header>


      {/* =========================================
          SUMMARY
      ========================================== */}

      <div className="relationships-summary">

        <div className="relationship-summary-item">

          <span className="summary-number">
            {relationships.length}
          </span>

          <span className="summary-label">
            Relationships
          </span>

        </div>

        <div className="summary-divider" />

        <div className="relationship-summary-item">

          <span className="summary-number">
            {relationshipTypes.length}
          </span>

          <span className="summary-label">
            Relationship Types
          </span>

        </div>

        <div className="summary-divider" />

        <div className="relationship-summary-item">

          <span className="summary-number">
            {Math.round(averageConfidence * 100)}%
          </span>

          <span className="summary-label">
            Avg. Confidence
          </span>

        </div>

      </div>


      {/* =========================================
          FILTERS
      ========================================== */}

      <section className="relationships-controls">

        <div className="relationship-search">

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search source, target or relationship..."
          />

        </div>


        <label className="relationship-filter">

          <span>
            Relationship
          </span>

          <select
            value={relationshipFilter}
            onChange={(event) =>
              setRelationshipFilter(event.target.value)
            }
          >

            <option value="All">
              All
            </option>

            {relationshipTypes.map((type) => (
              <option
                key={type}
                value={type}
              >
                {type}
              </option>
            ))}

          </select>

        </label>


        <label className="relationship-filter">

          <span>
            Sort
          </span>

          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(
                event.target.value as SortOption,
              )
            }
          >

            <option value="confidence">
              Confidence
            </option>

            <option value="relationship">
              Relationship
            </option>

            <option value="source">
              Source
            </option>

            <option value="target">
              Target
            </option>

          </select>

        </label>

      </section>


      {/* =========================================
          RELATIONSHIP TABLE
      ========================================== */}

      <section className="relationships-table-card">

        <div className="relationships-table-top">

          <div>

            <span className="section-step">
              EVIDENCE NETWORK
            </span>

            <h2>
              Relationship Registry
            </h2>

          </div>

          <span className="relationship-count mono">
            {filteredRelationships.length} SHOWN
          </span>

        </div>


        <div className="relationships-table">

          <div className="relationships-table-header">

            <span>Source Entity</span>

            <span>Relationship</span>

            <span>Target Entity</span>

            <span>Confidence</span>

            <span />

          </div>


          {filteredRelationships.length > 0 ? (

            filteredRelationships.map(
              (relationship) => {

                const sourceLabel = graph
                  ? getNodeLabel(
                      graph,
                      relationship.source,
                    )
                  : relationship.source

                const targetLabel = graph
                  ? getNodeLabel(
                      graph,
                      relationship.target,
                    )
                  : relationship.target

                const sourceType = graph
                  ? getNodeType(
                      graph,
                      relationship.source,
                    )
                  : 'Entity'

                const targetType = graph
                  ? getNodeType(
                      graph,
                      relationship.target,
                    )
                  : 'Entity'

                const confidence =
                  relationship.confidence ?? 0

                return (

                  <div
                    key={relationship.relationship_id}
                    className="relationship-table-row"
                  >

                    {/* SOURCE */}

                    <Link
                      to={`/cases/IIS-2026-001/entities/${relationship.source}`}
                      className="relationship-entity-cell"
                    >

                      <div className="relationship-icon">
                        <RelationshipIcon />
                      </div>

                      <div className="relationship-entity-content">

                        <strong>
                          {sourceLabel}
                        </strong>

                        <small>
                          {sourceType}
                        </small>

                      </div>

                    </Link>


                    {/* RELATIONSHIP */}

                    <div className="relationship-type-cell">

                      <span className="relationship-type-badge">
                        {relationship.type}
                      </span>

                    </div>


                    {/* TARGET */}

                    <Link
                      to={`/cases/IIS-2026-001/entities/${relationship.target}`}
                      className="relationship-entity-cell"
                    >

                      <div className="relationship-icon target">
                        <RelationshipIcon />
                      </div>

                      <div className="relationship-entity-content">

                        <strong>
                          {targetLabel}
                        </strong>

                        <small>
                          {targetType}
                        </small>

                      </div>

                    </Link>


                    {/* CONFIDENCE */}

                    <div className="relationship-confidence-cell">

                      <div className="confidence-value">
                        {Math.round(
                          confidence * 100,
                        )}%
                      </div>

                      <div className="confidence-bar">

                        <div
                          className="confidence-fill"
                          style={{
                            width: `${confidence * 100}%`,
                          }}
                        />

                      </div>

                    </div>


                    <div className="relationship-arrow">
                      →
                    </div>

                  </div>

                )
              },
            )

          ) : (

            <div className="relationships-empty">

              <strong>
                No relationships found
              </strong>

              <span>
                Try changing the search or relationship filter.
              </span>

            </div>

          )}

        </div>

      </section>


      {/* =========================================
          DISCLAIMER
      ========================================== */}

      <div className="relationships-disclaimer">

        Relationships represent connections extracted from
        available evidence. Confidence indicates the system's
        confidence in the extracted relationship and does not
        represent guilt, intent, or criminal involvement.

      </div>

    </div>
  )
}