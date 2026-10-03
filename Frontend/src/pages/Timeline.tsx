import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import {
  getCase,
  getGraphVersions,
  type CaseInfo,
  type GraphVersion,
} from '../lib/dataClient'

import './Timeline.css'


interface TimelineEvent {
  id: string
  date: string
  type:
    | 'case'
    | 'evidence'
    | 'analysis'
    | 'version'
  title: string
  description: string
  meta?: string
}


function formatDate(
  value?: string | null,
) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  )
}


function getEventIcon(
  type: TimelineEvent['type'],
) {
  switch (type) {
    case 'case':
      return 'CASE'

    case 'evidence':
      return 'DATA'

    case 'analysis':
      return 'AI'

    case 'version':
      return 'GRAPH'

    default:
      return 'EVENT'
  }
}


export default function Timeline() {
  const { caseId } = useParams()

  const [caseInfo, setCaseInfo] =
    useState<CaseInfo | null>(null)

  const [versions, setVersions] =
    useState<GraphVersion[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')


  useEffect(() => {
    if (!caseId) {
      setError(
        'No investigation case selected.',
      )

      setLoading(false)

      return
    }

    let cancelled = false

    async function loadTimeline() {
      try {
        setLoading(true)
        setError('')

        const [
          currentCase,
          graphVersions,
        ] = await Promise.all([
          getCase(caseId),
          getGraphVersions(caseId),
        ])

        if (cancelled) return

        setCaseInfo(currentCase)
        setVersions(graphVersions)

      } catch (err) {
        if (cancelled) return

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load timeline.',
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadTimeline()

    return () => {
      cancelled = true
    }
  }, [caseId])


  const events = useMemo(() => {

    const result: TimelineEvent[] = []


    /* -------------------------------------------------------
       CASE CREATED
    ------------------------------------------------------- */

    if (caseInfo?.created_at) {

      result.push({
        id: `case-${caseInfo.id}`,
        date: caseInfo.created_at,
        type: 'case',
        title: 'Investigation created',
        description:
          'The investigation case was created and became available in the workspace.',
        meta: caseInfo.id,
      })

    }


    /* -------------------------------------------------------
       GRAPH VERSIONS
    ------------------------------------------------------- */

    versions.forEach(
      (version) => {

        const evidenceTitle =
          version.trigger_filename ||
          'Evidence analysis'

        result.push({
          id: `version-${version.id}`,
          date: version.created_at,
          type: 'version',
          title:
            `Graph Version ${version.version_number} created`,
          description:
            version.summary ||
            `Investigation graph snapshot created with ${version.entity_count} entities and ${version.relationship_count} relationships.`,
          meta:
            `${evidenceTitle} · ${
              version.trigger_source_type ||
              'Evidence analysis'
            }`,
        })

        if (
          version.trigger_evidence_id
        ) {

          result.push({
            id: `analysis-${version.id}`,
            date: version.created_at,
            type: 'analysis',
            title:
              'Evidence analysis completed',
            description:
              `Evidence was processed and contributed to Graph Version ${version.version_number}.`,
            meta:
              `${version.entity_count} entities · ${version.relationship_count} relationships`,
          })

        }

      },
    )


    return result.sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime(),
    )

  }, [
    caseInfo,
    versions,
  ])


  if (loading) {
    return (
      <div className="timeline-page">
        <div className="timeline-state">
          Loading investigation timeline...
        </div>
      </div>
    )
  }


  return (
    <div className="timeline-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="timeline-header">

        <div>

          <div className="timeline-eyebrow">
            CASE WORKSPACE
          </div>

          <h1>
            Investigation Timeline
          </h1>

          <p>
            Chronological record of case creation,
            evidence analysis and graph updates.
          </p>

        </div>


        <div className="timeline-case">

          <span>
            CASE
          </span>

          <strong>
            {caseInfo?.name ||
              'Investigation'}
          </strong>

          <code>
            {caseInfo?.id ||
              caseId ||
              '—'}
          </code>

        </div>

      </header>


      {error && (
        <div className="timeline-error">
          {error}
        </div>
      )}


      {/* =================================================
          SUMMARY
      ================================================= */}

      <section className="timeline-summary">

        <div>
          <strong>
            {events.length}
          </strong>

          <span>
            Recorded Events
          </span>
        </div>

        <div>
          <strong>
            {versions.length}
          </strong>

          <span>
            Graph Versions
          </span>
        </div>

        <div>
          <strong>
            {versions.reduce(
              (
                total,
                version,
              ) =>
                total +
                version.entity_count,
              0,
            )}
          </strong>

          <span>
            Snapshot Entity Records
          </span>
        </div>

      </section>


      {/* =================================================
          TIMELINE
      ================================================= */}

      {events.length === 0 ? (

        <div className="timeline-empty">

          <h2>
            No timeline activity yet
          </h2>

          <p>
            Upload and analyze evidence to
            start building the investigation
            history.
          </p>

        </div>

      ) : (

        <section className="timeline-list">

          {events.map(
            (event, index) => (

              <div
                key={event.id}
                className="timeline-event"
              >

                <div className="timeline-marker">

                  <span>
                    {getEventIcon(
                      event.type,
                    )}
                  </span>

                  {index <
                    events.length - 1 && (
                    <i />
                  )}

                </div>


                <div className="timeline-event-card">

                  <div className="timeline-event-top">

                    <div>

                      <span className="timeline-event-type">
                        {event.type}
                      </span>

                      <h3>
                        {event.title}
                      </h3>

                    </div>

                    <time>
                      {formatDate(
                        event.date,
                      )}
                    </time>

                  </div>


                  <p>
                    {event.description}
                  </p>


                  {event.meta && (
                    <div className="timeline-event-meta">
                      {event.meta}
                    </div>
                  )}

                </div>

              </div>

            ),
          )}

        </section>

      )}

    </div>
  )
}