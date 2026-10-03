import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  getCase,
  getGraphVersion,
  getGraphVersions,
  graphVersionToInvestigationGraph,
  getVisualGraph,
  type CaseInfo,
  type GraphNode,
  type GraphRelationship,
  type InvestigationGraph,
  type GraphVersion,
} from '../lib/dataClient'

import NetworkGraph from '../components/NetworkGraph'

import './Dashboard.css'


/* =========================================================
   ICONS
========================================================= */

function Icon({
  type,
}: {
  type:
    | 'entities'
    | 'relationships'
    | 'records'
    | 'calendar'
    | 'person'
    | 'location'
    | 'link'
    | 'assistant'
    | 'evidence'
}) {
  const paths = {
    entities: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20c0-3.3 3.1-5 7-5s7 1.7 7 5" />
        <path d="M18 5.5c1.7.2 3 1.2 3 3.2" />
        <path d="M21 15c1.4.8 2 2 2 3.5" />
      </>
    ),

    relationships: (
      <>
        <circle cx="7" cy="17" r="3" />
        <circle cx="17" cy="7" r="3" />
        <path d="M9.2 14.8 14.8 9.2" />
      </>
    ),

    records: (
      <>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M15 3v5h5" />
        <path d="M9 13h6M9 17h6" />
      </>
    ),

    calendar: (
      <>
        <rect
          x="4"
          y="5"
          width="16"
          height="16"
          rx="2"
        />
        <path d="M8 3v4M16 3v4M4 10h16" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </>
    ),

    person: (
      <>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5 21c0-4 2.8-6 7-6s7 2 7 6" />
      </>
    ),

    location: (
      <>
        <path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z" />
        <circle cx="12" cy="9" r="2.2" />
      </>
    ),

    link: (
      <>
        <path d="M9 15l-2 2a4 4 0 0 1-6-6l3-3a4 4 0 0 1 6 0" />
        <path d="M15 9l2-2a4 4 0 0 1 6 6l-3 3a4 4 0 0 1-6 0" />
        <path d="M8 16l8-8" />
      </>
    ),

    assistant: (
      <>
        <rect x="4" y="5" width="16" height="14" rx="3" />
        <path d="M8 10h8M8 14h5" />
        <path d="M9 19v2M15 19v2" />
      </>
    ),

    evidence: (
      <>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M15 3v5h5" />
        <path d="M9 13h6M9 17h4" />
      </>
    ),
  }

  return (
    <svg
      className="dashboard-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[type]}
    </svg>
  )
}


/* =========================================================
   DATE
========================================================= */

function formatDate(value?: string | null) {
  if (!value) return 'No data'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'No data'
  }

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}


/* =========================================================
   DASHBOARD
========================================================= */

export default function Dashboard() {
  const { caseId } = useParams()

  const [caseInfo, setCaseInfo] =
    useState<CaseInfo | null>(null)

  const [graph, setGraph] =
    useState<InvestigationGraph | null>(null)

  const [graphVersions, setGraphVersions] =
    useState<GraphVersion[]>([])

  const [selectedVersion, setSelectedVersion] =
    useState<number | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [versionLoading, setVersionLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  const [entityType, setEntityType] =
    useState('All')

  const [relationshipType, setRelationshipType] =
    useState('All')


  /* =======================================================
     LOAD CASE + LIVE GRAPH + SAVED VERSIONS
  ======================================================= */

  useEffect(() => {
    if (!caseId) {
      setError('No investigation case selected.')
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')

        const [
          currentCase,
          currentGraph,
          versions,
        ] = await Promise.all([
          getCase(caseId),
          getVisualGraph(caseId),
          getGraphVersions(caseId),
        ])

        if (cancelled) return

        setCaseInfo(currentCase)
        setGraph(currentGraph)
        setGraphVersions(versions)

        if (versions.length > 0) {
          setSelectedVersion(
            versions[versions.length - 1].version_number,
          )
        }
      } catch (err) {
        if (cancelled) return

        console.error(
          'Failed to load dashboard:',
          err,
        )

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load investigation data.',
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      cancelled = true
    }
  }, [caseId])


  /* =======================================================
     LOAD SELECTED VERSION
  ======================================================= */

  async function handleVersionChange(
    versionNumber: number,
  ) {
    if (!caseId) return

    try {
      setVersionLoading(true)
      setError('')

      const version =
        await getGraphVersion(
          caseId,
          versionNumber,
        )

      setGraph(
        graphVersionToInvestigationGraph(
          version,
        ),
      )

      setSelectedVersion(versionNumber)
    } catch (err) {
      console.error(
        'Failed to load graph version:',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load graph version.',
      )
    } finally {
      setVersionLoading(false)
    }
  }


  /* =======================================================
     FILTER OPTIONS
  ======================================================= */

  const entityTypes = useMemo(
    () =>
      graph
        ? [
            ...new Set(
              graph.nodes.map(
                (node) => node.type,
              ),
            ),
          ].sort()
        : [],
    [graph],
  )

  const relationshipTypes = useMemo(
    () =>
      graph
        ? [
            ...new Set(
              graph.relationships.map(
                (relationship) =>
                  relationship.type,
              ),
            ),
          ].sort()
        : [],
    [graph],
  )


  /* =======================================================
     FILTERED GRAPH
  ======================================================= */

  const filteredNodes: GraphNode[] =
    graph?.nodes.filter(
      (node) =>
        entityType === 'All' ||
        node.type === entityType,
    ) || []

  const visibleIds =
    new Set(
      filteredNodes.map(
        (node) => node.id,
      ),
    )

  const filteredLinks: GraphRelationship[] =
    graph?.links.filter(
      (link) => {
        const matchesRelationship =
          relationshipType === 'All' ||
          link.type === relationshipType

        return (
          matchesRelationship &&
          visibleIds.has(link.source) &&
          visibleIds.has(link.target)
        )
      },
    ) || []


  /* =======================================================
     INSIGHTS
  ======================================================= */

  const topEntities = [
    ...filteredNodes,
  ]
    .sort(
      (a, b) =>
        b.degree - a.degree,
    )
    .slice(0, 6)

  const mostConnectedEntity =
    topEntities[0]

  const relationshipCounts =
    useMemo(() => {
      const counts: Record<string, number> = {}

      filteredLinks.forEach(
        (link) => {
          counts[link.type] =
            (counts[link.type] || 0) + 1
        },
      )

      return counts
    }, [filteredLinks])

  const mostCommonRelationship =
    Object.entries(
      relationshipCounts,
    ).sort(
      (a, b) => b[1] - a[1],
    )[0]

  const keyLocation =
    [...filteredNodes]
      .filter(
        (node) =>
          node.type.toLowerCase() ===
          'location',
      )
      .sort(
        (a, b) =>
          b.degree - a.degree,
      )[0]

  const activityValue =
    filteredLinks.length


  /* =======================================================
     ACTIVE VERSION
  ======================================================= */

  const activeVersion =
    graphVersions.find(
      (version) =>
        version.version_number ===
        selectedVersion,
    )

  const lastUpdated =
    activeVersion?.created_at ||
    caseInfo?.created_at


  /* =======================================================
     HANDLERS
  ======================================================= */

  const handleEntityTypeChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    setEntityType(event.target.value)
  }

  const handleRelationshipTypeChange =
    (
      event: ChangeEvent<HTMLSelectElement>,
    ) => {
      setRelationshipType(event.target.value)
    }


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="dashboard dashboard-state">
        <div className="dashboard-state-card">
          <div className="dashboard-spinner" />

          <strong>
            Loading investigation...
          </strong>

          <span>
            Preparing the evidence network.
          </span>
        </div>
      </div>
    )
  }


  /* =======================================================
     ERROR
  ======================================================= */

  if (error && !graph) {
    return (
      <div className="dashboard dashboard-state">
        <div className="dashboard-state-card error">
          <strong>
            Unable to load investigation
          </strong>

          <span>{error}</span>
        </div>
      </div>
    )
  }


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="dashboard">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="dashboard-header">

        <div className="dashboard-header-left">

          <div className="dashboard-breadcrumb">
            <span>
              Case Workspace
            </span>

            <span className="breadcrumb-separator">
              /
            </span>

            <strong>
              Dashboard
            </strong>
          </div>

          <h1>
            Investigation Network
          </h1>

          <p>
            Explore the entities and
            evidence-backed relationships
            selected from the data ingested
            into IIS.
          </p>

        </div>

        <div className="dashboard-updated">

          <Icon type="calendar" />

          <div>
            <span>
              Last updated
            </span>

            <strong>
              {formatDate(lastUpdated)}
            </strong>
          </div>

        </div>

      </header>


      {/* =================================================
          METRICS
      ================================================= */}

      <section className="dashboard-metrics">

        <div className="metric-item metric-entities">
          <Icon type="entities" />

          <div>
            <strong>
              {graph?.nodes.length ?? 0}
            </strong>

            <span>
              Entities
            </span>
          </div>
        </div>

        <div className="metric-divider" />

        <div className="metric-item metric-relationships">
          <Icon type="relationships" />

          <div>
            <strong>
              {graph?.relationships.length ?? 0}
            </strong>

            <span>
              Relationships
            </span>
          </div>
        </div>

        <div className="metric-divider" />

        <div className="metric-item metric-records">
          <Icon type="records" />

          <div>
            <strong>
              {
                graph?.nodes.filter(
                  (node) =>
                    node.type === 'Case',
                ).length || 0
              }
            </strong>

            <span>
              Case Records
            </span>
          </div>
        </div>

      </section>


      {/* =================================================
          MAIN ANALYSIS
      ================================================= */}

      <section className="dashboard-analysis">

        <div className="dashboard-primary-grid">

          {/* =============================================
              NETWORK
          ============================================= */}

          <div className="network-card">

            <div className="network-card-header">

              <div className="network-title">

                <div className="network-title-icon">
                  <Icon type="relationships" />
                </div>

                <div>

                  <h2>
                    Evidence Network
                  </h2>

                  <p>
                    {activeVersion
                      ? `Saved snapshot · Version ${activeVersion.version_number}`
                      : 'Current investigation network'}
                  </p>

                </div>

              </div>


              <div className="graph-version-selector">

                <span className="version-selector-label">
                  Graph version
                </span>

                <div className="version-buttons">

                  {graphVersions.length === 0 ? (
                    <span className="no-version-label">
                      No saved versions
                    </span>
                  ) : (
                    graphVersions.map(
                      (version) => (
                        <button
                          key={
                            version.version_number
                          }
                          type="button"
                          disabled={
                            versionLoading
                          }
                          className={
                            selectedVersion ===
                            version.version_number
                              ? 'version-button active'
                              : 'version-button'
                          }
                          onClick={() =>
                            handleVersionChange(
                              version.version_number,
                            )
                          }
                        >
                          {
                            version.version_number
                          }
                        </button>
                      ),
                    )
                  )}

                </div>

              </div>

            </div>


            {error && (
              <div className="dashboard-inline-error">
                {error}
              </div>
            )}


            <div className="network-graph-wrapper">

              {versionLoading ? (
                <div className="network-loading">
                  <div className="dashboard-spinner" />

                  <span>
                    Loading saved graph...
                  </span>
                </div>
              ) : (
                <NetworkGraph
                  nodes={filteredNodes}
                  links={filteredLinks}
                  height={420}
                />
              )}

            </div>


            <div className="network-controls">

              <div className="network-filter">

                <label htmlFor="entity-type">
                  Entity
                </label>

                <select
                  id="entity-type"
                  value={entityType}
                  onChange={
                    handleEntityTypeChange
                  }
                >
                  <option value="All">
                    All
                  </option>

                  {entityTypes.map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    ),
                  )}

                </select>

              </div>


              <div className="network-filter">

                <label htmlFor="relationship-type">
                  Relationship
                </label>

                <select
                  id="relationship-type"
                  value={
                    relationshipType
                  }
                  onChange={
                    handleRelationshipTypeChange
                  }
                >
                  <option value="All">
                    All
                  </option>

                  {relationshipTypes.map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    ),
                  )}

                </select>

              </div>


              <div className="network-filter-summary">

                <strong>
                  {filteredNodes.length}
                </strong>

                <span>
                  entities
                </span>

                <span className="summary-dot">
                  ·
                </span>

                <strong>
                  {filteredLinks.length}
                </strong>

                <span>
                  relationships
                </span>

              </div>

            </div>

          </div>


          {/* =============================================
              FUTURE INVESTIGATOR ASSISTANT
          ============================================= */}

          <aside className="investigator-assistant">

            <div className="assistant-header">

              <div className="assistant-title">

                <div className="assistant-icon">
                  <Icon type="assistant" />
                </div>

                <div>
                  <span>
                    INVESTIGATOR ASSIST
                  </span>

                  <h2>
                    Ask IIS
                  </h2>
                </div>

              </div>

              <span className="assistant-status">
                Coming soon
              </span>

            </div>


            <div className="assistant-intro">

              <p>
                Ask questions about this
                investigation and get answers
                grounded in the case network,
                evidence, and analysis.
              </p>

            </div>


            <div className="assistant-preview">

              <div className="assistant-preview-label">
                Example
              </div>

              <div className="assistant-message">
                Who are the key entities in
                this investigation?
              </div>

              <div className="assistant-preview-answer">
                The completed assistant will
                analyse the current case and
                return relevant entities,
                relationships, evidence, and
                investigation findings.
              </div>

            </div>


            <div className="assistant-input-preview">

              <input
                type="text"
                placeholder="Ask about this investigation..."
                disabled
                aria-label="Future investigator assistant input"
              />

              <button
                type="button"
                disabled
              >
                Ask IIS
              </button>

            </div>


            <div className="assistant-suggestions">

              <span>
                Suggested questions
              </span>

              <button
                type="button"
                disabled
              >
                Who are the key entities?
              </button>

              <button
                type="button"
                disabled
              >
                What suspicious patterns exist?
              </button>

              <button
                type="button"
                disabled
              >
                How are two entities connected?
              </button>

              <button
                type="button"
                disabled
              >
                What evidence supports this entity?
              </button>

            </div>

          </aside>

        </div>


        {/* =================================================
            INSIGHTS
        ================================================= */}

        <div className="dashboard-insights">

          <div className="insight-card">

            <div className="insight-card-header">

              <span>
                KEY ENTITY
              </span>

              <Icon type="person" />

            </div>

            <strong>
              {mostConnectedEntity?.label ||
                'No data'}
            </strong>

            <p>
              {mostConnectedEntity
                ? `${mostConnectedEntity.degree} network connections`
                : 'No connected entities found'}
            </p>

          </div>


          <div className="insight-card">

            <div className="insight-card-header">

              <span>
                DOMINANT RELATIONSHIP
              </span>

              <Icon type="link" />

            </div>

            <strong>
              {mostCommonRelationship?.[0] ||
                'No data'}
            </strong>

            <p>
              {mostCommonRelationship
                ? `${mostCommonRelationship[1]} observed connections`
                : 'No relationships found'}
            </p>

          </div>


          <div className="insight-card">

            <div className="insight-card-header">

              <span>
                KEY LOCATION
              </span>

              <Icon type="location" />

            </div>

            <strong>
              {keyLocation?.label ||
                'No location'}
            </strong>

            <p>
              {keyLocation
                ? `${keyLocation.degree} network connections`
                : 'No location entities found'}
            </p>

          </div>


          <div className="insight-card">

            <div className="insight-card-header">

              <span>
                NETWORK ACTIVITY
              </span>

              <Icon type="relationships" />

            </div>

            <strong>
              {activityValue}
            </strong>

            <p>
              Relationships in current view
            </p>

          </div>

        </div>


        {/* =================================================
            BOTTOM
        ================================================= */}

        <div className="dashboard-bottom-grid">

          {/* ---------------------------------------------
              TOP ENTITIES
          --------------------------------------------- */}

          <div className="dashboard-panel">

            <div className="dashboard-panel-header">

              <div>
                <h3>
                  Most Connected Entities
                </h3>

                <p>
                  Entities with the highest
                  number of observed connections.
                </p>
              </div>

            </div>


            {topEntities.length === 0 ? (
              <div className="dashboard-empty">
                No entities available.
              </div>
            ) : (
              <div className="top-entities-list">

                {topEntities.map(
                  (entity, index) => (
                    <Link
                      key={
                        entity.entity_id
                      }
                      to={`/cases/${caseId}/entities/${encodeURIComponent(
                        entity.entity_id,
                      )}`}
                      className="top-entity-row"
                    >

                      <span className="entity-rank">
                        {String(
                          index + 1,
                        ).padStart(
                          2,
                          '0',
                        )}
                      </span>

                      <div className="entity-row-main">

                        <strong>
                          {entity.label}
                        </strong>

                        <span>
                          {entity.type}
                        </span>

                      </div>

                      <div className="entity-degree">

                        <strong>
                          {entity.degree}
                        </strong>

                        <span>
                          links
                        </span>

                      </div>

                    </Link>
                  ),
                )}

              </div>
            )}

          </div>


          {/* ---------------------------------------------
              CASE CONTEXT
          --------------------------------------------- */}

          <div className="dashboard-panel">

            <div className="dashboard-panel-header">

              <div>
                <h3>
                  Investigation Context
                </h3>

                <p>
                  Current case and snapshot information.
                </p>
              </div>

            </div>


            <div className="context-list">

              <div>
                <span>
                  Case
                </span>

                <strong>
                  {caseInfo?.name ||
                    'Investigation'}
                </strong>
              </div>

              <div>
                <span>
                  Case ID
                </span>

                <strong className="mono">
                  {caseInfo?.id ||
                    caseId ||
                    '—'}
                </strong>
              </div>

              <div>
                <span>
                  Active snapshot
                </span>

                <strong>
                  {activeVersion
                    ? `Version ${activeVersion.version_number}`
                    : 'Live graph'}
                </strong>
              </div>

              <div>
                <span>
                  Snapshot date
                </span>

                <strong>
                  {formatDate(
                    activeVersion?.created_at,
                  )}
                </strong>
              </div>

            </div>

          </div>

        </div>

      </section>

    </div>
  )
}