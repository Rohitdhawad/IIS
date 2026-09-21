import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import {
  getGraphVersion,
  getGraphVersions,
  type GraphVersion,
} from '../lib/dataClient'

import './GraphVersions.css'


function formatDate(value?: string | null) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}


function ChangeCount({
  label,
  count,
}: {
  label: string
  count: number
}) {
  return (
    <div className="gv-change-count">
      <strong>{count}</strong>
      <span>{label}</span>
    </div>
  )
}


export default function GraphVersions() {
  const { caseId } = useParams()

  const [versions, setVersions] =
    useState<GraphVersion[]>([])

  const [selectedVersion, setSelectedVersion] =
    useState<GraphVersion | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [detailLoading, setDetailLoading] =
    useState(false)

  const [error, setError] =
    useState('')


  useEffect(() => {
    if (!caseId) {
      setError('No investigation case selected.')
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadVersions() {
      try {
        setLoading(true)
        setError('')

        const result =
          await getGraphVersions(caseId)

        if (cancelled) return

        setVersions(result)

        if (result.length > 0) {
          setSelectedVersion(
            result[result.length - 1],
          )
        }
      } catch (err) {
        if (cancelled) return

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load graph versions.',
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadVersions()

    return () => {
      cancelled = true
    }
  }, [caseId])


  async function selectVersion(
    versionNumber: number,
  ) {
    if (!caseId) return

    try {
      setDetailLoading(true)
      setError('')

      const version =
        await getGraphVersion(
          caseId,
          versionNumber,
        )

      setSelectedVersion(version)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load graph version.',
      )
    } finally {
      setDetailLoading(false)
    }
  }


  if (loading) {
    return (
      <div className="graph-versions-page">
        <div className="gv-state">
          <div className="gv-spinner" />
          <strong>
            Loading graph history...
          </strong>
        </div>
      </div>
    )
  }


  return (
    <div className="graph-versions-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="gv-header">

        <div>
          <div className="gv-eyebrow">
            INVESTIGATION HISTORY
          </div>

          <h1>
            Graph Versions
          </h1>

          <p>
            Historical snapshots of the investigation
            network created after evidence analysis.
          </p>
        </div>

        <div className="gv-case-id">
          <span>CASE</span>
          <strong>
            {caseId || '—'}
          </strong>
        </div>

      </header>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="gv-error">
          {error}
        </div>
      )}


      {/* =================================================
          EMPTY STATE
      ================================================= */}

      {versions.length === 0 ? (
        <div className="gv-empty">

          <div className="gv-empty-icon">
            GV
          </div>

          <h2>
            No graph versions yet
          </h2>

          <p>
            Analyze evidence from the Data / Reports
            section to create the first investigation
            snapshot.
          </p>

        </div>
      ) : (

        <div className="gv-layout">

          {/* =============================================
              VERSION LIST
          ============================================= */}

          <aside className="gv-version-list">

            <div className="gv-list-header">
              <div>
                <strong>
                  Saved Versions
                </strong>

                <span>
                  {versions.length}{' '}
                  snapshot
                  {versions.length === 1
                    ? ''
                    : 's'}
                </span>
              </div>
            </div>


            <div className="gv-list">

              {versions.map(
                (version) => {

                  const active =
                    selectedVersion?.version_number ===
                    version.version_number

                  return (
                    <button
                      key={version.id}
                      type="button"
                      className={
                        active
                          ? 'gv-version-item active'
                          : 'gv-version-item'
                      }
                      onClick={() =>
                        selectVersion(
                          version.version_number,
                        )
                      }
                    >

                      <div className="gv-version-number">
                        {version.version_number}
                      </div>

                      <div className="gv-version-item-main">

                        <strong>
                          Version{' '}
                          {version.version_number}
                        </strong>

                        <span>
                          {formatDate(
                            version.created_at,
                          )}
                        </span>

                        <small>
                          {version.entity_count}{' '}
                          entities ·{' '}
                          {version.relationship_count}{' '}
                          relationships
                        </small>

                      </div>

                    </button>
                  )
                },
              )}

            </div>

          </aside>


          {/* =============================================
              DETAILS
          ============================================= */}

          <main className="gv-details">

            {detailLoading ? (
              <div className="gv-detail-loading">
                <div className="gv-spinner" />
                Loading version details...
              </div>
            ) : selectedVersion ? (
              <>

                {/* ---------------------------------------
                    DETAIL HEADER
                --------------------------------------- */}

                <section className="gv-detail-header">

                  <div>

                    <div className="gv-version-badge">
                      VERSION{' '}
                      {
                        selectedVersion.version_number
                      }
                    </div>

                    <h2>
                      Graph Snapshot
                    </h2>

                    <p>
                      Created{' '}
                      {formatDate(
                        selectedVersion.created_at,
                      )}
                    </p>

                  </div>

                  <div className="gv-snapshot-stats">

                    <div>
                      <strong>
                        {
                          selectedVersion.entity_count
                        }
                      </strong>
                      <span>
                        Entities
                      </span>
                    </div>

                    <div>
                      <strong>
                        {
                          selectedVersion.relationship_count
                        }
                      </strong>
                      <span>
                        Relationships
                      </span>
                    </div>

                  </div>

                </section>


                {/* ---------------------------------------
                    SUMMARY
                --------------------------------------- */}

                <section className="gv-section">

                  <div className="gv-section-title">
                    <h3>
                      Change Summary
                    </h3>
                  </div>

                  <div className="gv-summary">
                    {selectedVersion.summary ||
                      'No change summary available.'}
                  </div>

                </section>


                {/* ---------------------------------------
                    TRIGGER
                --------------------------------------- */}

                <section className="gv-section">

                  <div className="gv-section-title">
                    <h3>
                      Trigger Evidence
                    </h3>
                  </div>

                  <div className="gv-trigger">

                    <div>
                      <span>
                        Evidence
                      </span>

                      <strong>
                        {
                          selectedVersion.trigger_filename ||
                          'Manual / Initial Snapshot'
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Source Type
                      </span>

                      <strong>
                        {
                          selectedVersion.trigger_source_type ||
                          '—'
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Evidence ID
                      </span>

                      <strong>
                        {
                          selectedVersion.trigger_evidence_id ??
                          '—'
                        }
                      </strong>
                    </div>

                  </div>

                </section>


                {/* ---------------------------------------
                    CHANGE COUNTS
                --------------------------------------- */}

                <section className="gv-section">

                  <div className="gv-section-title">
                    <h3>
                      Changes in This Version
                    </h3>
                  </div>

                  <div className="gv-change-grid">

                    <div className="gv-change-card">

                      <div className="gv-change-card-title">
                        Entities
                      </div>

                      <div className="gv-change-counts">

                        <ChangeCount
                          label="Added"
                          count={
                            selectedVersion
                              .entities_added
                              .length
                          }
                        />

                        <ChangeCount
                          label="Removed"
                          count={
                            selectedVersion
                              .entities_removed
                              .length
                          }
                        />

                        <ChangeCount
                          label="Changed"
                          count={
                            selectedVersion
                              .entities_changed
                              .length
                          }
                        />

                      </div>

                    </div>


                    <div className="gv-change-card">

                      <div className="gv-change-card-title">
                        Relationships
                      </div>

                      <div className="gv-change-counts">

                        <ChangeCount
                          label="Added"
                          count={
                            selectedVersion
                              .relationships_added
                              .length
                          }
                        />

                        <ChangeCount
                          label="Removed"
                          count={
                            selectedVersion
                              .relationships_removed
                              .length
                          }
                        />

                        <ChangeCount
                          label="Changed"
                          count={
                            selectedVersion
                              .relationships_changed
                              .length
                          }
                        />

                      </div>

                    </div>

                  </div>

                </section>


                {/* ---------------------------------------
                    ENTITY CHANGES
                --------------------------------------- */}

                <section className="gv-section">

                  <div className="gv-section-title">
                    <h3>
                      Entity Changes
                    </h3>

                    <span>
                      {
                        selectedVersion
                          .entities_added
                          .length +
                        selectedVersion
                          .entities_removed
                          .length +
                        selectedVersion
                          .entities_changed
                          .length
                      }{' '}
                      changes
                    </span>
                  </div>


                  <div className="gv-change-list">

                    {selectedVersion
                      .entities_added
                      .map(
                        (entity) => (
                          <div
                            className="gv-change-row added"
                            key={`entity-added-${entity.id}`}
                          >
                            <span className="gv-change-tag">
                              ADDED
                            </span>

                            <div>
                              <strong>
                                {entity.label}
                              </strong>

                              <small>
                                {entity.type}
                              </small>
                            </div>
                          </div>
                        ),
                      )}


                    {selectedVersion
                      .entities_removed
                      .map(
                        (entity) => (
                          <div
                            className="gv-change-row removed"
                            key={`entity-removed-${entity.id}`}
                          >
                            <span className="gv-change-tag">
                              REMOVED
                            </span>

                            <div>
                              <strong>
                                {entity.label}
                              </strong>

                              <small>
                                {entity.type}
                              </small>
                            </div>
                          </div>
                        ),
                      )}


                    {selectedVersion
                      .entities_changed
                      .map(
                        (change) => (
                          <div
                            className="gv-change-row changed"
                            key={`entity-changed-${change.id}`}
                          >
                            <span className="gv-change-tag">
                              CHANGED
                            </span>

                            <div>
                              <strong>
                                {
                                  change.after
                                    ?.label ||
                                  change.before
                                    ?.label
                                }
                              </strong>

                              <small>
                                {
                                  change.after
                                    ?.type ||
                                  change.before
                                    ?.type
                                }
                              </small>
                            </div>
                          </div>
                        ),
                      )}


                    {selectedVersion
                      .entities_added.length === 0 &&
                      selectedVersion
                        .entities_removed.length === 0 &&
                      selectedVersion
                        .entities_changed.length === 0 && (
                        <div className="gv-no-changes">
                          No entity changes recorded.
                        </div>
                      )}

                  </div>

                </section>


                {/* ---------------------------------------
                    RELATIONSHIP CHANGES
                --------------------------------------- */}

                <section className="gv-section">

                  <div className="gv-section-title">
                    <h3>
                      Relationship Changes
                    </h3>

                    <span>
                      {
                        selectedVersion
                          .relationships_added
                          .length +
                        selectedVersion
                          .relationships_removed
                          .length +
                        selectedVersion
                          .relationships_changed
                          .length
                      }{' '}
                      changes
                    </span>
                  </div>


                  <div className="gv-change-list">

                    {selectedVersion
                      .relationships_added
                      .map(
                        (relationship) => (
                          <div
                            className="gv-change-row added"
                            key={`relationship-added-${relationship.id}`}
                          >
                            <span className="gv-change-tag">
                              ADDED
                            </span>

                            <div>
                              <strong>
                                {
                                  relationship.type
                                }
                              </strong>

                              <small>
                                {
                                  relationship.source
                                }
                                {' → '}
                                {
                                  relationship.target
                                }
                              </small>
                            </div>
                          </div>
                        ),
                      )}


                    {selectedVersion
                      .relationships_removed
                      .map(
                        (relationship) => (
                          <div
                            className="gv-change-row removed"
                            key={`relationship-removed-${relationship.id}`}
                          >
                            <span className="gv-change-tag">
                              REMOVED
                            </span>

                            <div>
                              <strong>
                                {
                                  relationship.type
                                }
                              </strong>

                              <small>
                                {
                                  relationship.source
                                }
                                {' → '}
                                {
                                  relationship.target
                                }
                              </small>
                            </div>
                          </div>
                        ),
                      )}


                    {selectedVersion
                      .relationships_changed
                      .map(
                        (change) => (
                          <div
                            className="gv-change-row changed"
                            key={`relationship-changed-${change.id}`}
                          >
                            <span className="gv-change-tag">
                              CHANGED
                            </span>

                            <div>
                              <strong>
                                {
                                  change.after
                                    ?.type ||
                                  change.before
                                    ?.type
                                }
                              </strong>

                              <small>
                                {
                                  change.after
                                    ?.source ||
                                  change.before
                                    ?.source
                                }
                                {' → '}
                                {
                                  change.after
                                    ?.target ||
                                  change.before
                                    ?.target
                                }
                              </small>
                            </div>
                          </div>
                        ),
                      )}


                    {selectedVersion
                      .relationships_added
                      .length === 0 &&
                      selectedVersion
                        .relationships_removed
                        .length === 0 &&
                      selectedVersion
                        .relationships_changed
                        .length === 0 && (
                        <div className="gv-no-changes">
                          No relationship changes recorded.
                        </div>
                      )}

                  </div>

                </section>

              </>
            ) : null}

          </main>

        </div>
      )}

    </div>
  )
}