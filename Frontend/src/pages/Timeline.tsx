import { useMemo, useState } from 'react'
import './Timeline.css'

type EventCategory =
  | 'Incident'
  | 'Evidence'
  | 'Analysis'
  | 'Investigation'

interface TimelineEvent {
  id: string
  date: string
  time: string
  title: string
  description: string
  category: EventCategory
  source?: string
  entities?: string[]
  graphVersion?: string
}

const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: 'evt-001',
    date: '02 Mar 2026',
    time: '09:15',
    title: 'Initial incident recorded',
    description:
      'Initial case information and incident details were entered into the investigation workspace.',
    category: 'Incident',
    source: 'FIR / Police Report',
    entities: ['Project Nightfall'],
    graphVersion: 'V1',
  },
  {
    id: 'evt-002',
    date: '04 Mar 2026',
    time: '11:40',
    title: 'Call detail records ingested',
    description:
      'Communication records were processed and relevant person-to-person relationships were extracted.',
    category: 'Evidence',
    source: 'Call Detail Records (CDR)',
    entities: ['Arjun Kale', 'Neel Shah', 'Rohan Mehta', 'Sameer Joshi'],
    graphVersion: 'V1',
  },
  {
    id: 'evt-003',
    date: '06 Mar 2026',
    time: '14:20',
    title: 'Entity extraction completed',
    description:
      'People, vehicles and locations were identified from the available investigation records.',
    category: 'Analysis',
    source: 'IIS Entity Extraction',
    entities: [
      'Arjun Kale',
      'Neel Shah',
      'Rohan Mehta',
      'Sameer Joshi',
      'Warehouse-W17',
      'MH12AB4821',
    ],
    graphVersion: 'V1',
  },
  {
    id: 'evt-004',
    date: '08 Mar 2026',
    time: '10:05',
    title: 'Financial transaction analyzed',
    description:
      'Financial evidence was processed and a transaction relationship was added to the investigation network.',
    category: 'Evidence',
    source: 'Financial Transaction',
    entities: ['Arjun Kale'],
    graphVersion: 'V2',
  },
  {
    id: 'evt-005',
    date: '10 Mar 2026',
    time: '16:35',
    title: 'Surveillance evidence processed',
    description:
      'Surveillance observations were analyzed and location-based relationships were identified.',
    category: 'Evidence',
    source: 'Surveillance Report',
    entities: ['Warehouse-W17', 'Arjun Kale'],
    graphVersion: 'V3',
  },
  {
    id: 'evt-006',
    date: '12 Mar 2026',
    time: '12:10',
    title: 'Network structure analyzed',
    description:
      'The current evidence graph was analyzed for connectivity, relationship distribution and influential entities.',
    category: 'Analysis',
    source: 'IIS Network Analysis',
    entities: ['Arjun Kale', 'Warehouse-W17'],
    graphVersion: 'V3',
  },
  {
    id: 'evt-007',
    date: '14 Mar 2026',
    time: '15:45',
    title: 'Investigation review completed',
    description:
      'Investigative findings and extracted relationships were reviewed within the current case workspace.',
    category: 'Investigation',
    source: 'Investigator Review',
    entities: ['Project Nightfall'],
    graphVersion: 'V3',
  },
]

const CATEGORY_OPTIONS = [
  'All',
  'Incident',
  'Evidence',
  'Analysis',
  'Investigation',
]

function CategoryIcon({ category }: { category: EventCategory }) {
  if (category === 'Incident') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5M12 16h.01" />
      </svg>
    )
  }

  if (category === 'Evidence') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h4M10 13h5M10 17h5" />
      </svg>
    )
  }

  if (category === 'Analysis') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M5 19V9M12 19V5M19 19v-8" />
        <path d="M3 19h18" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </svg>
  )
}

export default function Timeline() {
  const [category, setCategory] = useState('All')

  const filteredEvents = useMemo(() => {
    if (category === 'All') {
      return TIMELINE_EVENTS
    }

    return TIMELINE_EVENTS.filter(
      (event) => event.category === category,
    )
  }, [category])

  const evidenceCount = TIMELINE_EVENTS.filter(
    (event) => event.category === 'Evidence',
  ).length

  const analysisCount = TIMELINE_EVENTS.filter(
    (event) => event.category === 'Analysis',
  ).length

  const graphVersions = new Set(
    TIMELINE_EVENTS
      .map((event) => event.graphVersion)
      .filter(Boolean),
  ).size

  return (
    <div className="timeline-page">

      {/* HEADER */}

      <header className="timeline-header">

        <div>

          <div className="timeline-breadcrumb">
            <span>Case Workspace</span>
            <span>/</span>
            <strong>Timeline</strong>
          </div>

          <div className="timeline-eyebrow mono">
            INVESTIGATION CHRONOLOGY
          </div>

          <h1>Case Timeline</h1>

          <p>
            Review the chronological progression of incidents,
            evidence ingestion, analytical activity and
            investigation events for this case.
          </p>

        </div>

        <div className="timeline-header-stat">

          <span>TOTAL EVENTS</span>

          <strong>
            {TIMELINE_EVENTS.length}
          </strong>

          <small>
            investigation events
          </small>

        </div>

      </header>


      {/* SUMMARY */}

      <section className="timeline-summary">

        <div className="timeline-summary-card">

          <span className="timeline-summary-label">
            EVIDENCE EVENTS
          </span>

          <strong>
            {evidenceCount}
          </strong>

          <small>
            source activity
          </small>

        </div>

        <div className="timeline-summary-card">

          <span className="timeline-summary-label">
            ANALYSIS EVENTS
          </span>

          <strong>
            {analysisCount}
          </strong>

          <small>
            IIS processing
          </small>

        </div>

        <div className="timeline-summary-card">

          <span className="timeline-summary-label">
            GRAPH VERSIONS
          </span>

          <strong>
            {graphVersions}
          </strong>

          <small>
            network states
          </small>

        </div>

        <div className="timeline-summary-card">

          <span className="timeline-summary-label">
            CURRENT STATE
          </span>

          <strong className="active-state">
            ACTIVE
          </strong>

          <small>
            investigation ongoing
          </small>

        </div>

      </section>


      {/* FILTER */}

      <div className="timeline-toolbar">

        <div>

          <span className="toolbar-eyebrow">
            EVENT STREAM
          </span>

          <h2>
            Investigation History
          </h2>

        </div>

        <label className="timeline-filter">

          <span>Category</span>

          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value)
            }
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option
                key={option}
                value={option}
              >
                {option}
              </option>
            ))}
          </select>

        </label>

      </div>


      {/* TIMELINE */}

      <section className="timeline-container">

        <div className="timeline-line" />

        {filteredEvents.map((event, index) => (

          <article
            className="timeline-event"
            key={event.id}
          >

            {/* DATE */}

            <div className="timeline-date">

              <strong>
                {event.date}
              </strong>

              <span className="mono">
                {event.time}
              </span>

            </div>


            {/* MARKER */}

            <div
              className={`timeline-marker ${event.category.toLowerCase()}`}
            >
              <CategoryIcon
                category={event.category}
              />
            </div>


            {/* CONTENT */}

            <div className="timeline-event-card">

              <div className="timeline-event-top">

                <div>

                  <span
                    className={`timeline-category ${event.category.toLowerCase()}`}
                  >
                    {event.category}
                  </span>

                  <h3>
                    {event.title}
                  </h3>

                </div>

                {event.graphVersion && (
                  <span className="graph-version mono">
                    {event.graphVersion}
                  </span>
                )}

              </div>


              <p className="timeline-description">
                {event.description}
              </p>


              <div className="timeline-event-meta">

                {event.source && (
                  <div className="timeline-meta-item">

                    <span>
                      SOURCE
                    </span>

                    <strong>
                      {event.source}
                    </strong>

                  </div>
                )}

                {event.entities &&
                  event.entities.length > 0 && (
                    <div className="timeline-meta-item entities-meta">

                      <span>
                        ENTITIES
                      </span>

                      <div className="timeline-entities">

                        {event.entities
                          .slice(0, 4)
                          .map((entity) => (
                            <span
                              key={entity}
                              className="timeline-entity"
                            >
                              {entity}
                            </span>
                          ))}

                        {event.entities.length > 4 && (
                          <span className="timeline-entity-more">
                            +{event.entities.length - 4}
                          </span>
                        )}

                      </div>

                    </div>
                  )}

              </div>

            </div>

          </article>

        ))}

        {filteredEvents.length === 0 && (

          <div className="timeline-empty">

            <strong>
              No timeline events found
            </strong>

            <span>
              Try selecting another event category.
            </span>

          </div>

        )}

      </section>


      {/* CURRENT STATE */}

      <section className="timeline-current-state">

        <div className="current-state-marker" />

        <div>

          <span className="current-state-eyebrow mono">
            CURRENT INVESTIGATION STATE
          </span>

          <h2>
            Investigation remains active
          </h2>

          <p>
            The timeline represents the chronological state
            of the case based on currently available evidence
            and recorded investigation activity.
          </p>

        </div>

        <div className="current-state-version mono">
          GRAPH V3
        </div>

      </section>


      {/* DISCLAIMER */}

      <div className="timeline-disclaimer">

        Timeline events represent recorded investigation,
        evidence and analytical activity. Dates and event
        descriptions should be interpreted alongside their
        underlying source records.

      </div>

    </div>
  )
}