import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  getCase,
  getVisualGraph,
  type CaseInfo,
  type InvestigationGraph,
  type GraphNode,
  type GraphRelationship,
} from '../lib/dataClient'

import { buildGraphVersions } from '../lib/graphVersions'
import NetworkGraph from '../components/NetworkGraph'

import './Dashboard.css'


/* =========================================
   ICONS
========================================= */

function Icon({
  type,
}: {
  type:
    | 'entities'
    | 'relationships'
    | 'records'
    | 'person'
    | 'link'
    | 'location'
    | 'calendar'
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

    person: (
      <>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5 21c0-4 2.8-6 7-6s7 2 7 6" />
      </>
    ),

    link: (
      <>
        <path d="M9 15l-2 2a4 4 0 0 1-6-6l3-3a4 4 0 0 1 6 0" />
        <path d="M15 9l2-2a4 4 0 0 1 6 6l-3 3a4 4 0 0 1-6 0" />
        <path d="M8 16l8-8" />
      </>
    ),

    location: (
      <>
        <path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z" />
        <circle cx="12" cy="9" r="2.2" />
      </>
    ),

    calendar: (
      <>
        <rect x="4" y="5" width="16" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
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


/* =========================================
   DASHBOARD
========================================= */

export default function Dashboard() {
  const { caseId } = useParams()

  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null)
  const [graph, setGraph] = useState<InvestigationGraph | null>(null)

  const [selectedVersion, setSelectedVersion] = useState('3')

  const [entityType, setEntityType] = useState('All')
  const [relationshipType, setRelationshipType] = useState('All')


  /* =========================================
     LOAD CASE + GRAPH
  ========================================= */

  useEffect(() => {
    getCase().then(setCaseInfo)
    getVisualGraph().then(setGraph)
  }, [])


  /* =========================================
     GRAPH VERSIONS
  ========================================= */

  const graphVersions = useMemo(
    () => (graph ? buildGraphVersions(graph) : []),
    [graph],
  )

  const activeVersion =
    graphVersions.find(
      (version) => version.id === selectedVersion,
    ) ||
    graphVersions[graphVersions.length - 1]

  const activeGraph =
    activeVersion?.graph || graph


  /* =========================================
     FILTER OPTIONS
  ========================================= */

  const entityTypes = activeGraph
    ? [
        ...new Set(
          activeGraph.nodes.map(
            (node) => node.type,
          ),
        ),
      ].sort()
    : []

  const relationshipTypes = activeGraph
    ? [
        ...new Set(
          activeGraph.relationships.map(
            (relationship) => relationship.type,
          ),
        ),
      ].sort()
    : []


  /* =========================================
     FILTERED GRAPH
  ========================================= */

  const filteredNodes: GraphNode[] =
    activeGraph?.nodes.filter(
      (node) =>
        entityType === 'All' ||
        node.type === entityType,
    ) || []

  const visibleIds = new Set(
    filteredNodes.map((node) => node.id),
  )

  const filteredLinks: GraphRelationship[] =
    activeGraph?.links.filter((link) => {
      const matchesType =
        relationshipType === 'All' ||
        link.type === relationshipType

      return (
        matchesType &&
        visibleIds.has(link.source) &&
        visibleIds.has(link.target)
      )
    }) || []


  /* =========================================
     TOP ENTITIES
  ========================================= */

  const topEntities = [...filteredNodes]
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 6)

  const mostConnectedEntity = topEntities[0]


  /* =========================================
     INSIGHTS
  ========================================= */

  const relationshipCounts = useMemo(() => {
    const counts: Record<string, number> = {}

    filteredLinks.forEach((link) => {
      counts[link.type] =
        (counts[link.type] || 0) + 1
    })

    return counts
  }, [filteredLinks])

  const mostCommonRelationship =
    Object.entries(relationshipCounts).sort(
      (a, b) => b[1] - a[1],
    )[0]

  const keyLocation = [...filteredNodes]
    .filter(
      (node) =>
        node.type.toLowerCase() === 'location',
    )
    .sort((a, b) => b.degree - a.degree)[0]

  const activityValue = filteredLinks.length


  /* =========================================
     FILTER HANDLERS
  ========================================= */

  const handleEntityTypeChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    setEntityType(event.target.value)
  }

  const handleRelationshipTypeChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    setRelationshipType(event.target.value)
  }


  /* =========================================
     CASE ID
  ========================================= */

  const displayCaseId =
    caseId ||
    caseInfo?.id ||
    'IIS-2026-001'


  /* =========================================
     RENDER
  ========================================= */

  return (
    <div className="dashboard">

      {/* =====================================
          HEADER
      ===================================== */}

      <header className="dashboard-header">

        <div className="dashboard-header-left">

          <div className="dashboard-breadcrumb">
            <span>Case Workspace</span>
            <span className="breadcrumb-separator">
              /
            </span>
            <strong>Dashboard</strong>
          </div>

          <h1>
            Investigation Network
          </h1>

          <p>
            Explore the entities and evidence-backed
            relationships selected from the data
            ingested into IIS.
          </p>

        </div>


        <div className="dashboard-updated">

          <Icon type="calendar" />

          <div>
            <span>Last updated</span>

            <strong>
              09 Sep 2026, 10:24 AM
            </strong>
          </div>

        </div>

      </header>


      {/* =====================================
          METRICS
      ===================================== */}

      <section className="dashboard-metrics">

        <div className="metric-item">

          <Icon type="entities" />

          <div>
            <strong>
              {activeGraph?.nodes.length ?? 0}
            </strong>

            <span>
              Entities
            </span>
          </div>

        </div>


        <div className="metric-divider" />


        <div className="metric-item">

          <Icon type="relationships" />

          <div>
            <strong>
              {activeGraph?.relationships.length ?? 0}
            </strong>

            <span>
              Relationships
            </span>
          </div>

        </div>


        <div className="metric-divider" />


        <div className="metric-item">

          <Icon type="records" />

          <div>
            <strong>
              {
                activeGraph?.nodes.filter(
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


      {/* =====================================
          MAIN ANALYSIS
      ===================================== */}

      <section className="dashboard-analysis">


        {/* ===================================
            NETWORK CARD
        =================================== */}

        <div className="network-card">


          {/* NETWORK HEADER */}

          <div className="network-card-header">

            <div className="network-title">

              <div className="network-title-icon">
                <Icon type="relationships" />
              </div>

              <div>

                <h2>
                  Evidence Network
                </h2>

                {activeVersion && (
                  <div className="active-version-label mono">

                    {activeVersion.label}

                    <span>·</span>

                    {activeVersion.trigger}

                  </div>
                )}

              </div>

            </div>


            {/* GRAPH VERSION SELECTOR */}

            <div className="graph-version-selector">

              <span className="version-selector-label">
                Graph version
              </span>

              <div className="version-buttons">

                {graphVersions.map(
                  (version) => (
                    <button
                      key={version.id}
                      type="button"
                      className={
                        selectedVersion ===
                        version.id
                          ? 'version-button active'
                          : 'version-button'
                      }
                      onClick={() =>
                        setSelectedVersion(
                          version.id,
                        )
                      }
                    >
                      {version.id}
                    </button>
                  ),
                )}

              </div>

            </div>

          </div>


          {/* VERSION INFORMATION */}

          {activeVersion && (
            <div className="graph-version-info">

              <div>

                <span className="version-info-label">
                  SNAPSHOT
                </span>

                <strong className="mono">
                  {activeVersion.label}
                </strong>

              </div>


              <div>

                <span className="version-info-label">
                  CREATED
                </span>

                <strong className="mono">
                  {activeVersion.date}
                  {' · '}
                  {activeVersion.time}
                </strong>

              </div>


              <div>

                <span className="version-info-label">
                  TRIGGER
                </span>

                <strong>
                  {activeVersion.trigger}
                </strong>

              </div>


              <div>

                <span className="version-info-label">
                  SOURCE
                </span>

                <strong>
                  {activeVersion.source}
                </strong>

              </div>

            </div>
          )}


          {/* =================================
              GRAPH
          ================================= */}

          <div className="network-graph-wrapper">

            <NetworkGraph
              nodes={filteredNodes}
              links={filteredLinks}
              height={370}
            />

          </div>


          {/* =================================
              GRAPH FILTERS
          ================================= */}

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
                value={relationshipType}
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

          </div>

        </div>


        {/* ===================================
            NETWORK INSIGHTS
        =================================== */}

        <aside className="insights-card">

          <div className="insights-header">

            <div className="insights-icon">
              <span>▥</span>
            </div>

            <h2>
              Network Insights
            </h2>

          </div>


          <div className="insight-list">


            {/* MOST CONNECTED */}

            <div className="insight-item">

              <div className="insight-item-icon">
                <Icon type="person" />
              </div>

              <div className="insight-content">

                <span>
                  Most Connected Entity
                </span>

                <strong>
                  {
                    mostConnectedEntity?.label ||
                    'No data'
                  }
                </strong>

                <small>
                  {
                    mostConnectedEntity?.degree ||
                    0
                  }{' '}
                  connections
                </small>

              </div>

            </div>


            {/* COMMON RELATIONSHIP */}

            <div className="insight-item">

              <div className="insight-item-icon">
                <Icon type="link" />
              </div>

              <div className="insight-content">

                <span>
                  Most Common Relationship
                </span>

                <strong>
                  {
                    mostCommonRelationship?.[0] ||
                    'No data'
                  }
                </strong>

                <small>
                  {
                    mostCommonRelationship?.[1] ||
                    0
                  }{' '}
                  instances
                </small>

              </div>

            </div>


            {/* KEY LOCATION */}

            <div className="insight-item">

              <div className="insight-item-icon">
                <Icon type="location" />
              </div>

              <div className="insight-content">

                <span>
                  Key Location
                </span>

                <strong>
                  {
                    keyLocation?.label ||
                    'No location'
                  }
                </strong>

                <small>
                  {
                    keyLocation?.degree ||
                    0
                  }{' '}
                  connections
                </small>

              </div>

            </div>


            {/* ACTIVITY */}

            <div className="insight-item">

              <div className="insight-item-icon">
                <Icon type="calendar" />
              </div>

              <div className="insight-content">

                <span>
                  Network Activity
                </span>

                <strong>
                  {
                    activeVersion?.label ||
                    'Current Analysis'
                  }
                </strong>

                <small>
                  {activityValue}{' '}
                  relationships analyzed
                </small>

              </div>

            </div>

          </div>

        </aside>

      </section>


      {/* =====================================
          CONNECTED ENTITIES
      ===================================== */}

      <section className="connected-section">

        <div className="connected-header">

          <div className="connected-title">

            <div className="connected-icon">
              <Icon type="relationships" />
            </div>

            <h2>
              Most Connected Entities
            </h2>

          </div>


          <Link
            to={`/cases/${displayCaseId}/entities`}
            className="view-all"
          >
            View all entities →
          </Link>

        </div>


        <div className="entity-grid">

          {topEntities.map(
            (entity) => {

              const entityPath =
                `/cases/${displayCaseId}/entities/${entity.entity_id}`

              const normalizedType =
                entity.type.toLowerCase()

              return (
                <Link
                  to={entityPath}
                  key={entity.entity_id}
                  className="entity-card"
                >

                  <div className="entity-card-top">

                    <div
                      className={`entity-type-icon ${normalizedType}`}
                    >

                      <Icon
                        type={
                          normalizedType ===
                          'location'
                            ? 'location'
                            : normalizedType ===
                              'vehicle'
                              ? 'records'
                              : 'person'
                        }
                      />

                    </div>


                    <div className="entity-card-name">
                      {entity.label}
                    </div>

                  </div>


                  <span className="entity-badge">
                    {entity.type}
                  </span>


                  <div className="entity-connections">
                    {entity.degree}{' '}
                    connected records
                  </div>


                  <div className="entity-id mono">
                    {entity.entity_id}
                  </div>

                </Link>
              )
            },
          )}

        </div>

      </section>


      {/* =====================================
          DISCLAIMER
      ===================================== */}

      <div className="dashboard-disclaimer">

        The graph shows extracted and selected
        relationships from ingested evidence. It is
        a review aid and does not establish intent,
        guilt, or criminal involvement.

      </div>

    </div>
  )
}