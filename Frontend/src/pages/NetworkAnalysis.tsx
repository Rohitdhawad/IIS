import { useEffect, useMemo, useState } from 'react'
import {
  getVisualGraph,
  type InvestigationGraph,
  type GraphNode,
} from '../lib/dataClient'
import './NetworkAnalysis.css'

type AnalysisTab = 'overview' | 'influential' | 'patterns'

function getNodeLabel(graph: InvestigationGraph, id: string) {
  return (
    graph.nodes.find((node) => node.entity_id === id)?.label ||
    graph.nodes.find((node) => node.id === id)?.label ||
    id
  )
}

function getNodeType(graph: InvestigationGraph, id: string) {
  return (
    graph.nodes.find((node) => node.entity_id === id)?.type ||
    graph.nodes.find((node) => node.id === id)?.type ||
    'Entity'
  )
}

function EntityIcon({ type }: { type: string }) {
  const normalized = type.toLowerCase()

  if (normalized.includes('location')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z" />
        <circle cx="12" cy="9" r="2.2" />
      </svg>
    )
  }

  if (normalized.includes('vehicle')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M5 16l1.5-6h11L19 16" />
        <path d="M4 16h16v4H4z" />
        <circle cx="7.5" cy="20" r="1.3" />
        <circle cx="16.5" cy="20" r="1.3" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
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

export default function NetworkAnalysis() {
  const [graph, setGraph] = useState<InvestigationGraph | null>(null)
  const [activeTab, setActiveTab] = useState<AnalysisTab>('overview')

  useEffect(() => {
    getVisualGraph().then(setGraph)
  }, [])

  const nodes = graph?.nodes || []
  const relationships = graph?.relationships || []

  const topEntities = useMemo(() => {
    return [...nodes]
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 8)
  }, [nodes])

  const relationshipCounts = useMemo(() => {
    const counts = new Map<string, number>()

    relationships.forEach((relationship) => {
      counts.set(
        relationship.type,
        (counts.get(relationship.type) || 0) + 1,
      )
    })

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
  }, [relationships])

  const entityTypeCounts = useMemo(() => {
    const counts = new Map<string, number>()

    nodes.forEach((node) => {
      counts.set(
        node.type,
        (counts.get(node.type) || 0) + 1,
      )
    })

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
  }, [nodes])

  const averageDegree =
    nodes.length > 0
      ? nodes.reduce((sum, node) => sum + node.degree, 0) /
        nodes.length
      : 0

  const maxDegree =
    topEntities.length > 0
      ? topEntities[0].degree
      : 0

  const networkDensity =
    nodes.length > 1
      ? (
          (relationships.length /
            ((nodes.length * (nodes.length - 1)) / 2)) *
          100
        ).toFixed(1)
      : '0.0'

  return (
    <div className="network-analysis-page">

      {/* HEADER */}

      <header className="analysis-header">

        <div>

          <div className="analysis-breadcrumb">
            <span>Case Workspace</span>
            <span>/</span>
            <strong>Network Analysis</strong>
          </div>

          <div className="analysis-eyebrow mono">
            INVESTIGATION ANALYTICS
          </div>

          <h1>Network Analysis</h1>

          <p>
            Analyze structural properties of the investigation
            network and identify entities or relationship patterns
            that may require investigator attention.
          </p>

        </div>

        <div className="analysis-status">
          <span className="status-dot" />
          ANALYSIS READY
        </div>

      </header>


      {/* SUMMARY METRICS */}

      <section className="analysis-metrics">

        <div className="analysis-metric-card">
          <span className="metric-label">
            ENTITIES
          </span>

          <strong>
            {nodes.length}
          </strong>

          <small>
            nodes in network
          </small>
        </div>

        <div className="analysis-metric-card">
          <span className="metric-label">
            RELATIONSHIPS
          </span>

          <strong>
            {relationships.length}
          </strong>

          <small>
            observed connections
          </small>
        </div>

        <div className="analysis-metric-card">
          <span className="metric-label">
            AVG. DEGREE
          </span>

          <strong>
            {averageDegree.toFixed(1)}
          </strong>

          <small>
            connections / entity
          </small>
        </div>

        <div className="analysis-metric-card">
          <span className="metric-label">
            NETWORK DENSITY
          </span>

          <strong>
            {networkDensity}%
          </strong>

          <small>
            observed connectivity
          </small>
        </div>

      </section>


      {/* TABS */}

      <div className="analysis-tabs">

        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>

        <button
          className={activeTab === 'influential' ? 'active' : ''}
          onClick={() => setActiveTab('influential')}
        >
          Influential Entities
        </button>

        <button
          className={activeTab === 'patterns' ? 'active' : ''}
          onClick={() => setActiveTab('patterns')}
        >
          Relationship Patterns
        </button>

      </div>


      {/* OVERVIEW */}

      {activeTab === 'overview' && (

        <div className="analysis-grid">

          <section className="analysis-panel">

            <div className="panel-heading">

              <div>
                <span className="panel-eyebrow">
                  STRUCTURAL ANALYSIS
                </span>

                <h2>Network Composition</h2>
              </div>

              <span className="panel-code mono">
                N-01
              </span>

            </div>

            <div className="composition-list">

              {entityTypeCounts.map(
                ([type, count]) => {

                  const percentage =
                    nodes.length > 0
                      ? (count / nodes.length) * 100
                      : 0

                  return (
                    <div
                      className="composition-row"
                      key={type}
                    >

                      <div className="composition-label">
                        <span>
                          {type}
                        </span>

                        <strong>
                          {count}
                        </strong>
                      </div>

                      <div className="composition-bar">
                        <div
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>

                    </div>
                  )
                },
              )}

            </div>

          </section>


          <section className="analysis-panel">

            <div className="panel-heading">

              <div>
                <span className="panel-eyebrow">
                  RELATIONSHIP ANALYSIS
                </span>

                <h2>Relationship Distribution</h2>
              </div>

              <span className="panel-code mono">
                N-02
              </span>

            </div>

            <div className="relationship-distribution">

              {relationshipCounts.map(
                ([type, count]) => {

                  const percentage =
                    relationships.length > 0
                      ? (count / relationships.length) * 100
                      : 0

                  return (
                    <div
                      className="distribution-row"
                      key={type}
                    >

                      <div className="distribution-top">

                        <span>
                          {type}
                        </span>

                        <strong>
                          {count}
                        </strong>

                      </div>

                      <div className="distribution-bar">

                        <div
                          style={{
                            width: `${percentage}%`,
                          }}
                        />

                      </div>

                    </div>
                  )
                },
              )}

            </div>

          </section>


          <section className="analysis-panel wide">

            <div className="panel-heading">

              <div>
                <span className="panel-eyebrow">
                  NETWORK STRUCTURE
                </span>

                <h2>Most Connected Entities</h2>
              </div>

              <span className="panel-code mono">
                CENTRALITY
              </span>

            </div>

            <div className="influential-list">

              {topEntities.slice(0, 5).map(
                (entity, index) => (

                  <div
                    className="influential-row"
                    key={entity.entity_id}
                  >

                    <div className="rank-number mono">
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <div
                      className={`analysis-entity-icon ${getEntityClass(entity.type)}`}
                    >
                      <EntityIcon type={entity.type} />
                    </div>

                    <div className="influential-name">

                      <strong>
                        {entity.label}
                      </strong>

                      <small>
                        {entity.type}
                      </small>

                    </div>

                    <div className="centrality-bar-wrap">

                      <div className="centrality-bar">

                        <div
                          style={{
                            width: maxDegree
                              ? `${(entity.degree / maxDegree) * 100}%`
                              : '0%',
                          }}
                        />

                      </div>

                    </div>

                    <div className="centrality-score">

                      <strong>
                        {entity.degree}
                      </strong>

                      <span>
                        connections
                      </span>

                    </div>

                  </div>

                ),
              )}

            </div>

          </section>

        </div>
      )}


      {/* INFLUENTIAL ENTITIES */}

      {activeTab === 'influential' && (

        <section className="analysis-panel full-panel">

          <div className="panel-heading">

            <div>
              <span className="panel-eyebrow">
                ENTITY CENTRALITY
              </span>

              <h2>Influential Entities</h2>

              <p>
                Ranked using observed network connectivity.
                Higher connectivity indicates greater structural
                importance within the current graph.
              </p>
            </div>

            <span className="panel-code mono">
              DEGREE
            </span>

          </div>


          <div className="ranking-table">

            <div className="ranking-header">
              <span>Rank</span>
              <span>Entity</span>
              <span>Type</span>
              <span>Connections</span>
              <span>Relative Score</span>
            </div>

            {topEntities.map(
              (entity: GraphNode, index) => {

                const relativeScore =
                  maxDegree > 0
                    ? (entity.degree / maxDegree) * 100
                    : 0

                return (
                  <div
                    className="ranking-row"
                    key={entity.entity_id}
                  >

                    <span className="rank-number mono">
                      #{index + 1}
                    </span>

                    <div className="ranking-entity">

                      <div
                        className={`analysis-entity-icon ${getEntityClass(entity.type)}`}
                      >
                        <EntityIcon type={entity.type} />
                      </div>

                      <div>
                        <strong>
                          {entity.label}
                        </strong>

                        <small className="mono">
                          {entity.entity_id}
                        </small>
                      </div>

                    </div>

                    <span className="ranking-type">
                      {entity.type}
                    </span>

                    <strong className="ranking-connections">
                      {entity.degree}
                    </strong>

                    <div className="ranking-score">

                      <div>
                        <span
                          style={{
                            width: `${relativeScore}%`,
                          }}
                        />
                      </div>

                      <small>
                        {Math.round(relativeScore)}%
                      </small>

                    </div>

                  </div>
                )
              },
            )}

          </div>

        </section>
      )}


      {/* PATTERNS */}

      {activeTab === 'patterns' && (

        <div className="patterns-grid">

          <section className="analysis-panel">

            <div className="panel-heading">

              <div>
                <span className="panel-eyebrow">
                  OBSERVED PATTERN
                </span>

                <h2>High Connectivity</h2>
              </div>

              <span className="pattern-tag">
                STRUCTURAL
              </span>

            </div>

            <div className="pattern-content">

              <div className="pattern-number">
                {topEntities[0]?.degree || 0}
              </div>

              <p>
                {topEntities[0]
                  ? `${topEntities[0].label} has the highest observed number of network connections in the current graph.`
                  : 'No connected entities available.'}
              </p>

            </div>

          </section>


          <section className="analysis-panel">

            <div className="panel-heading">

              <div>
                <span className="panel-eyebrow">
                  OBSERVED PATTERN
                </span>

                <h2>Relationship Concentration</h2>
              </div>

              <span className="pattern-tag">
                DISTRIBUTION
              </span>

            </div>

            <div className="pattern-content">

              <div className="pattern-number">
                {relationshipCounts[0]?.[1] || 0}
              </div>

              <p>
                {relationshipCounts[0]
                  ? `${relationshipCounts[0][0]} is the most frequently observed relationship type in the current network.`
                  : 'No relationship data available.'}
              </p>

            </div>

          </section>


          <section className="analysis-panel">

            <div className="panel-heading">

              <div>
                <span className="panel-eyebrow">
                  INVESTIGATION SIGNAL
                </span>

                <h2>Cross-Entity Connectivity</h2>
              </div>

              <span className="pattern-tag">
                REVIEW
              </span>

            </div>

            <div className="pattern-content">

              <div className="pattern-number">
                {entityTypeCounts.length}
              </div>

              <p>
                Distinct entity categories are represented in
                the current network, allowing investigators to
                examine connections across different evidence
                domains.
              </p>

            </div>

          </section>

        </div>
      )}


      {/* DISCLAIMER */}

      <div className="analysis-disclaimer">

        <strong>Analytical interpretation:</strong>{' '}
        Network metrics describe structural properties of the
        available evidence graph. They identify entities or
        patterns for investigative review and do not establish
        guilt, intent, criminal involvement, or causation.

      </div>

    </div>
  )
}