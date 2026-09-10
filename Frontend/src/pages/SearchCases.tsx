import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCases, getVisualGraph, type CaseSummary } from '../lib/dataClient'
import './SearchCases.css'

function formatDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const STATUS_OPTIONS = ['All', 'Active', 'Under Review', 'Pending']
const TYPE_OPTIONS = ['All', 'Financial Fraud', 'Narcotics', 'Cybercrime', 'Financial Intelligence']

export default function SearchCases() {
  const navigate = useNavigate()
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [entityNames, setEntityNames] = useState<string[]>([])

  // Filter state
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [entityFilter, setEntityFilter] = useState('')

  useEffect(() => {
    Promise.all([getCases(), getVisualGraph()]).then(([{ cases }, graph]) => {
      setCases(cases)
      setEntityNames(graph.nodes.map((n) => n.label))
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      const q = query.trim().toLowerCase()
      const matchesQuery =
        !q ||
        `${c.id} ${c.name} ${c.description || ''} ${c.location || ''}`.toLowerCase().includes(q)

      const matchesStatus = statusFilter === 'All' || c.status === statusFilter
      const matchesType = typeFilter === 'All' || c.case_type === typeFilter
      const matchesEntity =
        !entityFilter ||
        entityFilter === 'All' ||
        c.id === 'IIS-2026-001' // demo: only first case has graph entities

      return matchesQuery && matchesStatus && matchesType && matchesEntity
    })
  }, [cases, query, statusFilter, typeFilter, entityFilter])

  const hasFilters = query || statusFilter !== 'All' || typeFilter !== 'All' || entityFilter

  return (
    <div className="search-page">
      <div className="page-header">
        <div className="eyebrow mono">Investigation Intelligence System</div>
        <h2>Search Cases</h2>
        <p className="intro-text">
          Filter investigations by ID, name, type, status or entity name.
        </p>
      </div>

      {/* Filter panel */}
      <div className="search-panel">
        <div className="search-row">
          <label className="search-field wide">
            <span className="sf-label mono">Keyword Search</span>
            <input
              type="text"
              value={query}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              placeholder="Case ID, name, location..."
            />
          </label>

          <label className="search-field">
            <span className="sf-label mono">Status</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>

          <label className="search-field">
            <span className="sf-label mono">Case Type</span>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              {TYPE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>

          <label className="search-field">
            <span className="sf-label mono">Entity (Demo)</span>
            <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
              <option value="">All</option>
              {entityNames.map((n) => <option key={n}>{n}</option>)}
            </select>
          </label>
        </div>

        {hasFilters && (
          <button
            className="clear-btn mono"
            onClick={() => {
              setQuery('')
              setStatusFilter('All')
              setTypeFilter('All')
              setEntityFilter('')
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results */}
      {loading && <div className="search-status mono">Loading cases...</div>}

      {!loading && (
        <div className="search-results-label mono">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          {hasFilters ? ' matching current filters' : ''}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="search-status mono">No cases match the current filters.</div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="search-list">
          {filtered.map((c) => (
            <div key={c.id} className="search-card">
              <div className="search-card-top">
                <span className="sc-id mono">{c.id}</span>
                <div className="sc-badges">
                  {c.status && (
                    <span className={`status-badge mono status-${(c.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                      {c.status}
                    </span>
                  )}
                  {c.case_type && <span className="type-badge mono">{c.case_type}</span>}
                </div>
              </div>
              <div className="sc-name">{c.name}</div>
              {c.description && <div className="sc-desc">{c.description}</div>}
              <div className="sc-meta mono">
                {c.num_entities} entities · {c.num_relationships} relationships
                {c.location && <> · {c.location}</>}
                {c.created_at && <> · {formatDate(c.created_at)}</>}
              </div>
              <div className="sc-footer">
                {/* Deterministic navigation */}
                <button className="btn primary" onClick={() => navigate(`/app/cases/${c.id}`)}>
                  Open Case
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="disclaimer-block">
        Search results are drawn from available investigation records. All outputs
        require investigator review and do not independently establish criminal involvement.
      </div>
    </div>
  )
}
