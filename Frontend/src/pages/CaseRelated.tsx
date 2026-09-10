import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getRelatedCases, type RelatedCase } from '../lib/dataClient'
import './CaseRelated.css'

const RELATION_LABELS: Record<string, string> = {
  SHARED_ENTITY: 'Shared Entity',
  HISTORICAL_RECORD: 'Historical Record',
  SHARED_LOCATION: 'Shared Location',
  FINANCIAL_LINK: 'Financial Link',
}

function ConfidencePill({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const cls = value >= 0.8 ? 'high' : value >= 0.65 ? 'med' : 'low'
  return <span className={`cr-conf-pill mono conf-${cls}`}>{pct}% confidence</span>
}

export default function CaseRelated() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const [related, setRelated] = useState<RelatedCase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!caseId) return
    getRelatedCases(caseId).then((data) => {
      setRelated(data)
      setLoading(false)
    })
  }, [caseId])

  return (
    <div className="case-related">
      <div className="cr-header">
        <div className="eyebrow mono">Case Workspace · {caseId}</div>
        <h2>Related Cases</h2>
        <p className="intro-text">
          Cases that may share entities, locations, vehicles or historical records with this
          investigation. Labelled as potentially related — not confirmed connections.
        </p>
      </div>

      {/* Banner */}
      <div className="cr-notice-banner">
        <span className="cr-notice-icon">ℹ</span>
        <span>
          These cases are flagged as <strong>potentially related</strong> based on analytical
          pattern matching. Shared entities or historical records do not confirm any connection
          between investigations. All links require investigator review.
        </span>
      </div>

      {loading && <div className="cr-status mono">Loading related cases...</div>}

      {!loading && related.length === 0 && (
        <div className="cr-status mono">No potentially related cases identified for this investigation.</div>
      )}

      {!loading && related.length > 0 && (
        <>
          <div className="cr-results-label mono">
            {related.length} potentially related case{related.length !== 1 ? 's' : ''} identified
          </div>

          <div className="cr-list">
            {related.map((rc) => (
              <div key={rc.case_id} className="cr-card">
                <div className="cr-card-head">
                  <span className="cr-id mono">{rc.case_id}</span>
                  <ConfidencePill value={rc.confidence} />
                  <span className="cr-relation-badge mono">
                    {RELATION_LABELS[rc.relationship_type] || rc.relationship_type}
                  </span>
                </div>

                <div className="cr-name">{rc.name}</div>
                <div className="cr-desc">{rc.description}</div>

                {rc.shared_entities.length > 0 && (
                  <div className="cr-shared">
                    <span className="cr-shared-label mono">Shared entities</span>
                    <div className="cr-shared-tags">
                      {rc.shared_entities.map((e) => (
                        <span key={e} className="cr-entity-tag mono">{e}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="cr-card-foot">
                  <span className="cr-analytical-note mono">
                    Potential connection · Requires investigator verification
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Back — deterministic */}
      <div className="cr-back-row">
        <button className="btn ghost" onClick={() => navigate(`/app/cases/${caseId}`)}>
          ← Back to Case Workspace
        </button>
      </div>

      <div className="disclaimer-block">
        Potentially related cases are identified through analytical pattern matching on shared
        entities, historical records and location data. These associations are analytical
        observations only and do not constitute legal findings or confirmed criminal links.
      </div>
    </div>
  )
}
