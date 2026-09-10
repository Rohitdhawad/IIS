import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCaseInsights, type AIInsight } from '../lib/dataClient'
import './CaseInsights.css'

const INSIGHT_TYPE_LABELS: Record<string, string> = {
  COMMUNICATION_CLUSTER: 'Communication Cluster',
  HIGH_VALUE_TRANSFER: 'High-Value Transfer',
  REPEATED_CO_LOCATION: 'Repeated Co-location',
  CROSS_CASE_LINK: 'Cross-Case Link',
  TEMPORAL_PATTERN: 'Temporal Pattern',
}

const INSIGHT_TYPE_COLORS: Record<string, string> = {
  COMMUNICATION_CLUSTER: '#6f8eb5',
  HIGH_VALUE_TRANSFER: '#b5453f',
  REPEATED_CO_LOCATION: '#8b9b68',
  CROSS_CASE_LINK: '#a77b9b',
  TEMPORAL_PATTERN: 'var(--amber)',
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = value >= 0.85 ? 'var(--amber)' : value >= 0.7 ? 'var(--teal)' : 'var(--paper-dim)'
  return (
    <div className="ci-conf-wrap">
      <div className="ci-conf-bar">
        <div className="ci-conf-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="ci-conf-label mono">{pct}%</span>
    </div>
  )
}

export default function CaseInsights() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    if (!caseId) return
    getCaseInsights(caseId).then((data) => {
      setInsights(data)
      setLoading(false)
    })
  }, [caseId])

  const allTypes = ['All', ...Array.from(new Set(insights.map((i) => i.type)))]
  const filtered = filter === 'All' ? insights : insights.filter((i) => i.type === filter)

  return (
    <div className="case-insights">
      <div className="ci-header">
        <div className="eyebrow mono">Case Workspace · {caseId}</div>
        <h2>AI Insights</h2>
        <p className="intro-text">
          Analytical observations generated from ingested evidence. All insights require
          investigator verification before any action is taken.
        </p>
      </div>

      {/* Global AI disclaimer banner */}
      <div className="ci-disclaimer-banner">
        <span className="ci-banner-icon">⚠</span>
        <span>
          AI-generated insights are analytical aids and require investigator verification.
          They do not independently establish guilt, intent or criminal involvement.
          All outputs are based on available ingested data and may be incomplete.
        </span>
      </div>

      {/* Filter */}
      {!loading && insights.length > 0 && (
        <div className="ci-controls">
          <label className="ci-filter-field">
            <span className="ci-filter-label mono">Filter by type</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              {allTypes.map((t) => (
                <option key={t} value={t}>
                  {t === 'All' ? 'All Insights' : INSIGHT_TYPE_LABELS[t] || t}
                </option>
              ))}
            </select>
          </label>
          <span className="ci-count mono">
            {filtered.length} insight{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {loading && <div className="ci-status mono">Loading analytical insights...</div>}

      {!loading && filtered.length === 0 && (
        <div className="ci-status mono">No insights match the current filter.</div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="ci-list">
          {filtered.map((insight) => (
            <div key={insight.insight_id} className="ci-card">
              <div className="ci-card-head">
                <span
                  className="ci-type-badge mono"
                  style={{
                    borderColor: INSIGHT_TYPE_COLORS[insight.type] || 'var(--line)',
                    color: INSIGHT_TYPE_COLORS[insight.type] || 'var(--paper-dim)',
                  }}
                >
                  {INSIGHT_TYPE_LABELS[insight.type] || insight.type}
                </span>
                <span className="ci-verify-tag mono">Requires Verification</span>
              </div>

              <div className="ci-title">{insight.title}</div>
              <div className="ci-desc">{insight.description}</div>

              <div className="ci-meta-row">
                <div className="ci-conf-section">
                  <span className="ci-meta-label mono">Analytical Confidence</span>
                  <ConfidenceBar value={insight.confidence} />
                </div>
                {insight.entity_ids.length > 0 && (
                  <div className="ci-entities">
                    <span className="ci-meta-label mono">Entities</span>
                    <div className="ci-entity-tags">
                      {insight.entity_ids.map((eid) => (
                        <span key={eid} className="ci-entity-tag mono">{eid}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="ci-insight-note mono">
                Potential connection · Analytical observation · Requires investigator verification
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Back — deterministic */}
      <div className="ci-back-row">
        <button className="btn ghost" onClick={() => navigate(`/app/cases/${caseId}`)}>
          ← Back to Case Workspace
        </button>
      </div>

      <div className="disclaimer-block">
        AI-assisted analysis is provided to support — not replace — investigator judgement.
        Confidence scores reflect analytical pattern matching against ingested data only.
        No output constitutes legal evidence or proof of criminal activity.
      </div>
    </div>
  )
}
