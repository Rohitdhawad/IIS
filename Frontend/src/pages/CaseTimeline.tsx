import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCaseTimeline, type TimelineEvent } from '../lib/dataClient'
import './CaseTimeline.css'

const EVENT_TYPE_LABELS: Record<string, string> = {
  case_opened: 'Case Opened',
  person_identified: 'Person Identified',
  phone_interaction: 'CDR / Phone',
  financial_transaction: 'Financial',
  location_visit: 'Co-location',
  investigation_update: 'Investigation Update',
  evidence_uploaded: 'Evidence Uploaded',
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  case_opened: 'var(--amber)',
  person_identified: 'var(--teal)',
  phone_interaction: '#6f8eb5',
  financial_transaction: '#b5453f',
  location_visit: '#8b9b68',
  investigation_update: 'var(--paper-dim)',
  evidence_uploaded: '#a77b9b',
}

function formatDateTime(ts: string): string {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ts
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function CaseTimeline() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    if (!caseId) return
    getCaseTimeline(caseId).then((evts) => {
      setEvents(evts)
      setLoading(false)
    })
  }, [caseId])

  const allTypes = ['All', ...Array.from(new Set(events.map((e) => e.type)))]
  const filtered = filter === 'All' ? events : events.filter((e) => e.type === filter)

  return (
    <div className="case-timeline">
      <div className="ct-header">
        <div className="eyebrow mono">Case Workspace · {caseId}</div>
        <h2>Timeline</h2>
        <p className="intro-text">
          Chronological reconstruction of events from ingested evidence sources.
        </p>
      </div>

      <div className="ct-controls">
        <label className="ct-filter-field">
          <span className="ct-filter-label mono">Filter by type</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {allTypes.map((t) => (
              <option key={t} value={t}>
                {t === 'All' ? 'All Events' : EVENT_TYPE_LABELS[t] || t}
              </option>
            ))}
          </select>
        </label>
        <span className="ct-count mono">{filtered.length} event{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading && <div className="ct-status mono">Loading timeline...</div>}

      {!loading && filtered.length === 0 && (
        <div className="ct-status mono">No events match the current filter.</div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="ct-track">
          {filtered.map((evt, i) => (
            <div key={evt.event_id} className="ct-event">
              {/* Timeline spine */}
              <div className="ct-spine">
                <div
                  className="ct-dot"
                  style={{ background: EVENT_TYPE_COLORS[evt.type] || 'var(--paper-dim)' }}
                />
                {i < filtered.length - 1 && <div className="ct-line" />}
              </div>

              {/* Event card */}
              <div className="ct-card">
                <div className="ct-card-head">
                  <span
                    className="ct-type-badge mono"
                    style={{ borderColor: EVENT_TYPE_COLORS[evt.type] || 'var(--line)', color: EVENT_TYPE_COLORS[evt.type] || 'var(--paper-dim)' }}
                  >
                    {EVENT_TYPE_LABELS[evt.type] || evt.type}
                  </span>
                  <span className="ct-timestamp mono">{formatDateTime(evt.timestamp)}</span>
                </div>
                <div className="ct-title">{evt.title}</div>
                <div className="ct-desc">{evt.description}</div>
                {evt.evidence_source && (
                  <div className="ct-source mono">Source: {evt.evidence_source}</div>
                )}
                {evt.entity_ids.length > 0 && (
                  <div className="ct-entities mono">
                    {evt.entity_ids.map((eid) => (
                      <span key={eid} className="ct-entity-tag">{eid}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Back to Case Workspace — deterministic, no navigate(-1) */}
      <div className="ct-back-row">
        <button className="btn ghost" onClick={() => navigate(`/app/cases/${caseId}`)}>
          ← Back to Case Workspace
        </button>
      </div>

      <div className="disclaimer-block">
        Timeline events are reconstructed from ingested evidence and are presented for
        investigator review. They do not independently establish a criminal narrative or intent.
      </div>
    </div>
  )
}
