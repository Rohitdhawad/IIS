import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCaseById, getCaseGraph, getRelatedCases, getCaseTimeline, type CaseSummary } from '../lib/dataClient'
import './CaseOverview.css'

function formatDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function CaseOverview() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const [caseInfo, setCaseInfo] = useState<CaseSummary | null>(null)
  const [entityCount, setEntityCount] = useState(0)
  const [relCount, setRelCount] = useState(0)
  const [keyEntities, setKeyEntities] = useState<{ label: string; type: string; degree: number }[]>([])
  const [relatedCount, setRelatedCount] = useState(0)
  const [eventCount, setEventCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!caseId) return
    Promise.all([
      getCaseById(caseId),
      getCaseGraph(caseId),
      getRelatedCases(caseId),
      getCaseTimeline(caseId),
    ]).then(([info, graph, related, timeline]) => {
      setCaseInfo(info)
      setEntityCount(graph.nodes.length)
      setRelCount(graph.relationships.length)
      setKeyEntities(
        [...graph.nodes]
          .sort((a, b) => b.degree - a.degree)
          .slice(0, 5)
          .map((n) => ({ label: n.label, type: n.type, degree: n.degree }))
      )
      setRelatedCount(related.length)
      setEventCount(timeline.length)
      setLoading(false)
    })
  }, [caseId])

  if (loading) {
    return (
      <div className="case-overview">
        <div className="co-loading mono">Loading case overview...</div>
      </div>
    )
  }

  return (
    <div className="case-overview">
      {/* Header */}
      <div className="co-header">
        <div className="eyebrow mono">Case Workspace · Overview</div>
        <h2>{caseInfo?.name || caseId}</h2>
        <div className="co-id-row">
          <span className="co-id mono">{caseId}</span>
          {caseInfo?.status && (
            <span className={`status-badge mono status-${(caseInfo.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
              {caseInfo.status}
            </span>
          )}
          {caseInfo?.case_type && (
            <span className="type-badge mono">{caseInfo.case_type}</span>
          )}
        </div>
        {caseInfo?.description && (
          <p className="co-desc">{caseInfo.description}</p>
        )}
      </div>

      {/* Stats grid */}
      <div className="co-stats">
        <div className="co-stat">
          <div className="co-stat-val mono">{entityCount}</div>
          <div className="co-stat-label">Entities</div>
        </div>
        <div className="co-stat">
          <div className="co-stat-val mono">{relCount}</div>
          <div className="co-stat-label">Relationships</div>
        </div>
        <div className="co-stat">
          <div className="co-stat-val mono">{eventCount}</div>
          <div className="co-stat-label">Timeline Events</div>
        </div>
        <div className="co-stat">
          <div className="co-stat-val mono">{relatedCount}</div>
          <div className="co-stat-label">Potentially Related Cases</div>
        </div>
      </div>

      {/* Details row */}
      <div className="co-details">
        {caseInfo?.location && (
          <div className="co-detail-row">
            <span className="co-detail-key mono">Location</span>
            <span className="co-detail-val">{caseInfo.location}</span>
          </div>
        )}
        <div className="co-detail-row">
          <span className="co-detail-key mono">Opened</span>
          <span className="co-detail-val">{formatDate(caseInfo?.created_at || null)}</span>
        </div>
      </div>

      {/* Key entities */}
      {keyEntities.length > 0 && (
        <div className="co-section">
          <div className="co-section-label mono">Most Connected Entities</div>
          <div className="co-entity-list">
            {keyEntities.map((e, i) => (
              <div key={i} className="co-entity-row">
                <span className="co-entity-label">{e.label}</span>
                <span className="co-entity-type mono">{e.type}</span>
                <span className="co-entity-degree mono">{e.degree} connections</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Summary excerpt */}
      <div className="co-ai-summary">
        <div className="co-section-label mono">AI Analytical Summary</div>
        <div className="co-ai-card">
          <div className="co-ai-text">
            The ingested evidence for this case contains <strong>{entityCount} entities</strong> and{' '}
            <strong>{relCount} evidence-backed relationships</strong> across multiple source documents.
            Analytical review has identified {relatedCount} potentially related case{relatedCount !== 1 ? 's' : ''} based on shared entities.
            The timeline spans {eventCount} recorded events. Key persons of interest appear to be
            connected through communication, financial and co-location evidence patterns.
            See AI Insights for detailed analytical observations.
          </div>
          <div className="co-ai-disclaimer">
            AI-generated insights are analytical aids and require investigator verification.
            They do not independently establish guilt or intent.
          </div>
        </div>
      </div>

      {/* Module quick-nav */}
      <div className="co-section">
        <div className="co-section-label mono">Case Modules</div>
        <div className="co-modules-grid">
          {[
            { label: 'Timeline', path: 'timeline', desc: 'Chronological event reconstruction' },
            { label: 'Evidence', path: 'evidence', desc: 'Available and required evidence' },
            { label: 'Network Graph', path: 'network', desc: 'Entity relationship visualisation' },
            { label: 'AI Insights', path: 'insights', desc: 'Analytical pattern observations' },
            { label: 'Related Cases', path: 'related', desc: 'Potentially linked investigations' },
            { label: 'Entities', path: 'entities', desc: 'Entity and relationship explorer' },
            { label: 'Audit Trail', path: 'audit', desc: 'Evidence provenance chain' },
          ].map((m) => (
            <button
              key={m.path}
              className="co-module-card"
              onClick={() => navigate(`/app/cases/${caseId}/${m.path}`)}
            >
              <div className="co-module-title">{m.label}</div>
              <div className="co-module-desc">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="disclaimer-block">
        This case overview is generated from ingested evidence records.
        AI-generated insights are analytical aids and require investigator verification.
        They do not independently establish guilt, intent or criminal involvement.
      </div>
    </div>
  )
}
