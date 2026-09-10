import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCases, type CaseSummary } from '../lib/dataClient'
import './Dashboard.css'

function formatDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCases().then(({ cases }) => {
      setCases(cases)
      setLoading(false)
    })
  }, [])

  const activeCases = cases.filter((c) => c.status === 'Active').length
  const totalEntities = cases.reduce((sum, c) => sum + c.num_entities, 0)
  const totalRelationships = cases.reduce((sum, c) => sum + c.num_relationships, 0)
  const recentCases = cases.slice(0, 3)

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div className="eyebrow mono">Investigation Intelligence System</div>
        <h2>Investigator Dashboard</h2>
        <p className="intro-text">
          Command centre for active investigations. Select a case to enter its workspace.
        </p>
      </div>

      {/* Stats row */}
      {!loading && (
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-value mono">{cases.length}</div>
            <div className="stat-label">Total Cases</div>
          </div>
          <div className="stat-card">
            <div className="stat-value mono">{activeCases}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat-card">
            <div className="stat-value mono">{totalEntities}</div>
            <div className="stat-label">Total Entities</div>
          </div>
          <div className="stat-card">
            <div className="stat-value mono">{totalRelationships}</div>
            <div className="stat-label">Total Relationships</div>
          </div>
        </div>
      )}

      {/* Quick access — recent cases */}
      <div className="dashboard-section">
        <div className="dashboard-section-head">
          <h3>Recent Cases</h3>
          <button className="text-btn" onClick={() => navigate('/app/cases')}>
            View all →
          </button>
        </div>

        {loading && <div className="dashboard-loading mono">Loading cases...</div>}

        {!loading && (
          <div className="dashboard-case-list">
            {recentCases.map((c) => (
              <div key={c.id} className="dashboard-case-card">
                <div className="dashboard-case-top">
                  <span className="case-id mono">{c.id}</span>
                  {c.status && (
                    <span className={`status-badge mono status-${(c.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                      {c.status}
                    </span>
                  )}
                </div>
                <div className="dashboard-case-name">{c.name}</div>
                {c.description && (
                  <div className="dashboard-case-desc">{c.description}</div>
                )}
                <div className="dashboard-case-meta mono">
                  {c.num_entities} entities · {c.num_relationships} relationships
                  {c.location && ` · ${c.location}`}
                </div>
                <div className="dashboard-case-footer">
                  <span className="dashboard-case-date mono">
                    {formatDate(c.created_at)}
                  </span>
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
      </div>

      {/* Quick actions */}
      <div className="dashboard-section">
        <div className="dashboard-section-head">
          <h3>Quick Access</h3>
        </div>
        <div className="dashboard-quick-actions">
          <button className="quick-action-card" onClick={() => navigate('/app/cases')}>
            <div className="quick-action-title">Recent Cases</div>
            <div className="quick-action-desc">Browse all available investigation cases</div>
          </button>
          <button className="quick-action-card" onClick={() => navigate('/app/search')}>
            <div className="quick-action-title">Search Cases</div>
            <div className="quick-action-desc">Filter cases by ID, name, entity or location</div>
          </button>
        </div>
      </div>

      <div className="disclaimer-block">
        All information shown is for investigator review only. Relationships and analytical
        outputs do not independently establish guilt, intent or criminal involvement.
      </div>
    </div>
  )
}
