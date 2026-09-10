import { useState } from 'react'
import './GraphVersions.css'

type GraphVersion = {
  version: string
  date: string
  time: string
  trigger: string
  source: string
  entities: number
  relationships: number
  changes: string
  status: 'Current' | 'Archived'
}

const GRAPH_VERSIONS: GraphVersion[] = [
  {
    version: 'GRAPH V3',
    date: '14 Mar 2026',
    time: '16:42',
    trigger: 'Investigator review',
    source: 'Manual graph update',
    entities: 8,
    relationships: 11,
    changes: '+1 relationship',
    status: 'Current',
  },
  {
    version: 'GRAPH V2',
    date: '10 Mar 2026',
    time: '11:18',
    trigger: 'Surveillance evidence',
    source: 'Surveillance Report',
    entities: 8,
    relationships: 10,
    changes: '+2 relationships',
    status: 'Archived',
  },
  {
    version: 'GRAPH V1',
    date: '08 Mar 2026',
    time: '09:35',
    trigger: 'Financial transaction analysis',
    source: 'Financial Transaction',
    entities: 8,
    relationships: 8,
    changes: 'Initial network',
    status: 'Archived',
  },
]

export default function GraphVersions() {
  const [selectedVersion, setSelectedVersion] = useState('GRAPH V3')

  const selected = GRAPH_VERSIONS.find(
    (version) => version.version === selectedVersion,
  )

  return (
    <div className="graph-versions-page">
      <div className="page-header">
        <div className="eyebrow mono">NETWORK HISTORY</div>

        <h2>Graph Versions</h2>

        <p className="intro-text">
          Review immutable snapshots of the investigation network as new
          evidence is ingested or the graph is manually updated.
        </p>
      </div>

      <div className="version-layout">
        {/* VERSION LIST */}
        <section className="versions-panel">
          <div className="panel-heading">
            <div>
              <div className="section-label">NETWORK SNAPSHOTS</div>
              <h3>Graph history</h3>
            </div>

            <span className="version-count mono">
              {GRAPH_VERSIONS.length} versions
            </span>
          </div>

          <div className="version-list">
            {GRAPH_VERSIONS.map((version) => (
              <button
                key={version.version}
                className={`version-row ${
                  selectedVersion === version.version ? 'selected' : ''
                }`}
                onClick={() => setSelectedVersion(version.version)}
              >
                <div className="version-marker">
                  <span />
                </div>

                <div className="version-main">
                  <div className="version-top">
                    <span className="version-name mono">
                      {version.version}
                    </span>

                    <span
                      className={`version-status ${
                        version.status === 'Current' ? 'current' : ''
                      }`}
                    >
                      {version.status}
                    </span>
                  </div>

                  <div className="version-trigger">
                    {version.trigger}
                  </div>

                  <div className="version-meta mono">
                    {version.date} · {version.time}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* VERSION DETAIL */}
        <section className="version-detail">
          {selected && (
            <>
              <div className="detail-heading">
                <div>
                  <div className="eyebrow mono">SELECTED SNAPSHOT</div>

                  <h3>{selected.version}</h3>

                  <p>
                    {selected.trigger} · {selected.source}
                  </p>
                </div>

                <span
                  className={`detail-status ${
                    selected.status === 'Current' ? 'current' : ''
                  }`}
                >
                  {selected.status}
                </span>
              </div>

              <div className="version-metrics">
                <div className="metric-card">
                  <span className="metric-label">ENTITIES</span>
                  <strong>{selected.entities}</strong>
                </div>

                <div className="metric-card">
                  <span className="metric-label">RELATIONSHIPS</span>
                  <strong>{selected.relationships}</strong>
                </div>

                <div className="metric-card">
                  <span className="metric-label">CHANGE</span>
                  <strong className="change-value">
                    {selected.changes}
                  </strong>
                </div>
              </div>

              <div className="snapshot-section">
                <div className="section-label">VERSION INFORMATION</div>

                <div className="info-grid">
                  <div className="info-item">
                    <span>Created</span>
                    <strong className="mono">
                      {selected.date} · {selected.time}
                    </strong>
                  </div>

                  <div className="info-item">
                    <span>Trigger</span>
                    <strong>{selected.trigger}</strong>
                  </div>

                  <div className="info-item">
                    <span>Source</span>
                    <strong>{selected.source}</strong>
                  </div>

                  <div className="info-item">
                    <span>Graph state</span>
                    <strong>
                      {selected.status === 'Current'
                        ? 'Active investigation state'
                        : 'Historical snapshot'}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="snapshot-note">
                <span className="note-icon">i</span>

                <p>
                  This snapshot is immutable. Subsequent evidence ingestion
                  or investigator edits create a new graph version rather
                  than modifying this state.
                </p>
              </div>
            </>
          )}
        </section>
      </div>

      <div className="disclaimer-block">
        Graph versions represent analytical states of the investigation
        network. Structural changes and connectivity do not establish intent,
        guilt, or criminal involvement.
      </div>
    </div>
  )
}