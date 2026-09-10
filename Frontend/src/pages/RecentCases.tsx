import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCases, type CaseSummary } from '../lib/dataClient'
import './RecentCases.css'

function formatDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function RecentCases() {
  const navigate = useNavigate()
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [usedFallback, setUsedFallback] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    getCases().then(({ cases, usedFallback }) => {
      if (cancelled) return
      setCases(cases)
      setUsedFallback(usedFallback)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const filteredCases = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return cases
    return cases.filter((c) =>
      `${c.id} ${c.name} ${c.description || ''} ${c.location || ''} ${c.case_type || ''}`.toLowerCase().includes(q)
    )
  }, [cases, search])

  return (
    <div className="recent-cases-page">
      <div className="page-header">
        <div className="eyebrow mono">Investigation Intelligence System</div>
        <h2>Recent Cases</h2>
        <p className="intro-text">
          Select an investigation to enter its case workspace.
        </p>
      </div>

      <div className="rc-controls">
        <label className="rc-search-field">
          <span className="rc-field-label mono">Search</span>
          <input
            type="text"
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Search by case ID, name or description..."
          />
        </label>
      </div>

      {usedFallback && (
        <div className="rc-fallback-note mono">Showing locally available investigation data.</div>
      )}

      {loading && <div className="rc-status mono">Loading investigation cases...</div>}

      {!loading && filteredCases.length === 0 && (
        <div className="rc-status mono">No cases match the current search.</div>
      )}

      {!loading && filteredCases.length > 0 && (
        <div className="rc-list">
          {filteredCases.map((c) => (
            <div key={c.id} className="rc-card">
              <div className="rc-card-top">
                <span className="rc-id mono">{c.id}</span>
                <div className="rc-badges">
                  {c.status && (
                    <span className={`status-badge mono status-${(c.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                      {c.status}
                    </span>
                  )}
                  {c.case_type && (
                    <span className="type-badge mono">{c.case_type}</span>
                  )}
                </div>
              </div>
              <div className="rc-name">{c.name}</div>
              {c.description && <div className="rc-desc">{c.description}</div>}
              <div className="rc-meta mono">
                {c.num_entities} entities · {c.num_relationships} relationships
                {c.location && <> · {c.location}</>}
              </div>
              <div className="rc-footer">
                <span className="rc-date mono">Created: {formatDate(c.created_at)}</span>
                {/* Deterministic navigation to case workspace */}
                <button
                  className="btn primary"
                  onClick={() => navigate(`/app/cases/${c.id}`)}
                >
                  Open Case
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="disclaimer-block">
        Investigation records are provided for human review and do not independently
        establish guilt or criminal involvement.
      </div>
    </div>
  )
}
