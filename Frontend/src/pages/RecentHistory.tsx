import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCases, type CaseSummary } from '../lib/dataClient'
import './RecentHistory.css'



function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function RecentHistory() {
  const navigate = useNavigate()
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [usedFallback, setUsedFallback] = useState(false)
  const [search, setSearch] = useState('')
  

  useEffect(() => {
    let cancelled = false
    getCases().then((result) => {
      if (cancelled) return
      setCases(result.cases)
      setUsedFallback(result.usedFallback)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const filteredCases = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return cases
    return cases.filter((c) => {
      const haystack = `${c.id} ${c.name} ${c.description || ''}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [cases, search])

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)
  

  const openInvestigation = (caseId: string) => navigate(`/?case=${caseId}`)

  return (
    <div className="history-page">
      <div className="page-header">
        <div className="eyebrow mono">Investigation Intelligence System</div>
        <h2>Recent Investigation History</h2>
        <p className="intro-text">
          Review previously created investigation cases and access their evidence-backed records.
        </p>
      </div>

      <div className="history-controls">
        <label className="field search-field">
          <span className="field-label">Search</span>
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search cases, case IDs, or investigation names..."
          />
        </label>

       
      </div>

      {usedFallback && (
        <div className="fallback-note mono">Showing locally available investigation data.</div>
      )}

      {loading && <div className="history-status mono">Loading investigation history...</div>}

      {!loading && filteredCases.length === 0 && (
        <div className="history-status mono">No investigations match the current search.</div>
      )}

      {!loading && filteredCases.length > 0 && (
        <div className="case-records">
          {filteredCases.map((c) => (
            <div className="case-record" key={c.id}>
              <div className="case-record-top">
                <span className="case-id mono">{c.id}</span>
              </div>
              <div className="case-name">{c.name}</div>
              {c.description && <div className="case-description">{c.description}</div>}
              <div className="case-metrics mono">
                {c.num_entities} entities · {c.num_relationships} relationships
              </div>
              <div className="case-record-bottom">
                <span className="case-created mono">Created: {formatDate(c.created_at)}</span>
                <button className="btn primary" onClick={() => openInvestigation(c.id)}>
  Open Investigation
</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="disclaimer-block">
        Investigation records and relationships are provided as evidence-backed information for
        human review and do not independently establish guilt or intent.
      </div>
    </div>
  )
}
