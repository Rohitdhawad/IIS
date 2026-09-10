import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getVisualGraph,
  type GraphNode,
  type InvestigationGraph,
} from '../lib/dataClient'
import './Entities.css'

type SortOption = 'connections' | 'name' | 'type'

function EntityIcon({ type }: { type: string }) {
  const normalized = type.toLowerCase()

  if (normalized.includes('location')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z" />
        <circle cx="12" cy="9" r="2.2" />
      </svg>
    )
  }

  if (normalized.includes('vehicle')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 16l1.5-6h11L19 16" />
        <path d="M4 16h16v4H4z" />
        <circle cx="7.5" cy="20" r="1.3" />
        <circle cx="16.5" cy="20" r="1.3" />
      </svg>
    )
  }

  if (normalized.includes('organization')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="5" y="4" width="14" height="17" rx="1" />
        <path d="M9 8h6M9 12h6M9 16h6" />
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="3" />
      <path d="M5 21c0-4 2.8-6 7-6s7 2 7 6" />
    </svg>
  )
}

function getEntityClass(type: string) {
  const normalized = type.toLowerCase()

  if (normalized.includes('location')) return 'location'
  if (normalized.includes('vehicle')) return 'vehicle'
  if (normalized.includes('organization')) return 'organization'

  return 'person'
}

export default function Entities() {
  const [graph, setGraph] = useState<InvestigationGraph | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [sortBy, setSortBy] =
    useState<SortOption>('connections')

  useEffect(() => {
    getVisualGraph().then(setGraph)
  }, [])

  const entities = graph?.nodes || []

  const entityTypes = useMemo(
    () =>
      [...new Set(
        entities.map((entity) => entity.type),
      )].sort(),
    [entities],
  )

  const filteredEntities = useMemo(() => {
    const query = search.trim().toLowerCase()

    const filtered = entities.filter((entity) => {
      const matchesSearch =
        !query ||
        entity.label.toLowerCase().includes(query) ||
        entity.entity_id.toLowerCase().includes(query) ||
        entity.type.toLowerCase().includes(query)

      const matchesType =
        typeFilter === 'All' ||
        entity.type === typeFilter

      return matchesSearch && matchesType
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.label.localeCompare(b.label)
      }

      if (sortBy === 'type') {
        return a.type.localeCompare(b.type)
      }

      return b.degree - a.degree
    })
  }, [entities, search, typeFilter, sortBy])

  const totalConnections = entities.reduce(
    (sum, entity) => sum + entity.degree,
    0,
  )

  return (
    <div className="entities-page">

      {/* =========================================
          HEADER
      ========================================== */}

      <header className="entities-header">

        <div>

          <div className="entities-breadcrumb">
            <span>Case Workspace</span>
            <span>/</span>
            <strong>Entities</strong>
          </div>

          <h1>Entities</h1>

          <p>
            Review people, locations, vehicles and other
            entities extracted from the investigation evidence.
          </p>

        </div>

        <div className="entities-header-stat">
          <span>TOTAL ENTITIES</span>

          <strong>
            {entities.length}
          </strong>

          <small>
            {totalConnections} connections
          </small>
        </div>

      </header>


      {/* =========================================
          SUMMARY
      ========================================== */}

      <div className="entities-summary">

        <div className="entity-summary-item">

          <span className="summary-number">
            {entities.length}
          </span>

          <span className="summary-label">
            Entities
          </span>

        </div>

        <div className="summary-divider" />

        <div className="entity-summary-item">

          <span className="summary-number">
            {entityTypes.length}
          </span>

          <span className="summary-label">
            Entity Types
          </span>

        </div>

        <div className="summary-divider" />

        <div className="entity-summary-item">

          <span className="summary-number">
            {totalConnections}
          </span>

          <span className="summary-label">
            Connected Records
          </span>

        </div>

      </div>


      {/* =========================================
          CONTROLS
      ========================================== */}

      <section className="entities-controls">

        <div className="entity-search">

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
            placeholder="Search by name, identifier or type..."
          />

        </div>


        <label className="entity-filter">

          <span>
            Entity type
          </span>

          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value)
            }
          >
            <option value="All">
              All
            </option>

            {entityTypes.map((type) => (
              <option
                key={type}
                value={type}
              >
                {type}
              </option>
            ))}

          </select>

        </label>


        <label className="entity-filter">

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
            <option value="connections">
              Connections
            </option>

            <option value="name">
              Name
            </option>

            <option value="type">
              Type
            </option>

          </select>

        </label>

      </section>


      {/* =========================================
          ENTITY TABLE
      ========================================== */}

      <section className="entities-table-card">

        <div className="entities-table-top">

          <div>

            <span className="section-step">
              INVESTIGATION ENTITIES
            </span>

            <h2>
              Entity Registry
            </h2>

          </div>

          <span className="entity-count mono">
            {filteredEntities.length} SHOWN
          </span>

        </div>


        <div className="entities-table">

          <div className="entities-table-header">

            <span>Entity</span>
            <span>Type</span>
            <span>Connections</span>
            <span>Identifier</span>
            <span />

          </div>


          {filteredEntities.length > 0 ? (

            filteredEntities.map(
              (entity: GraphNode) => {

                const entityClass =
                  getEntityClass(entity.type)

                return (

                  <Link
                    key={entity.entity_id}
                    to={`/cases/IIS-2026-001/entities/${entity.entity_id}`}
                    className="entity-table-row"
                  >

                    <div className="entity-name-cell">

                      <div
                        className={`entity-list-icon ${entityClass}`}
                      >
                        <EntityIcon
                          type={entity.type}
                        />
                      </div>

                      <div className="entity-name-content">

                        <strong>
                          {entity.label}
                        </strong>

                        <small>
                          {entity.type}
                        </small>

                      </div>

                    </div>


                    <div className="entity-type-cell">

                      <span
                        className={`entity-type-badge ${entityClass}`}
                      >
                        {entity.type}
                      </span>

                    </div>


                    <div className="entity-connections-cell">

                      <strong>
                        {entity.degree}
                      </strong>

                      <span>
                        connected records
                      </span>

                    </div>


                    <div className="entity-id-cell mono">
                      {entity.entity_id}
                    </div>


                    <div className="entity-arrow">
                      →
                    </div>

                  </Link>
                )
              },
            )

          ) : (

            <div className="entities-empty">

              <strong>
                No entities found
              </strong>

              <span>
                Try changing the search or entity type filter.
              </span>

            </div>

          )}

        </div>

      </section>


      {/* =========================================
          DISCLAIMER
      ========================================== */}

      <div className="entities-disclaimer">

        Entity records are extracted from ingested investigation
        sources. Presence in the registry does not establish
        criminal involvement, intent or guilt.

      </div>

    </div>
  )
}