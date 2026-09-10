import { NavLink, Outlet, useParams, useNavigate } from 'react-router-dom'
import './CaseWorkspace.css'

const CASE_NAV = [
  { path: '', label: 'Overview', end: true },
  { path: 'timeline', label: 'Timeline' },
  { path: 'evidence', label: 'Evidence' },
  { path: 'network', label: 'Network Graph' },
  { path: 'insights', label: 'AI Insights' },
  { path: 'related', label: 'Related Cases' },
  { path: 'entities', label: 'Entities' },
  { path: 'audit', label: 'Audit Trail' },
]

export default function CaseWorkspace() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()

  return (
    <div className="workspace-shell">
      {/* Case-specific secondary sidebar */}
      <aside className="workspace-sidebar">
        <div className="workspace-case-label">
          <div className="workspace-case-eyebrow mono">Case Workspace</div>
          <div className="workspace-case-id mono">{caseId}</div>
        </div>

        <nav className="workspace-nav" aria-label="Case navigation">
          {CASE_NAV.map((item) => {
            const to = `/app/cases/${caseId}${item.path ? `/${item.path}` : ''}`
            return (
              <NavLink
                key={to}
                to={to}
                end={item.end}
                className={({ isActive }) => 'workspace-nav-item' + (isActive ? ' active' : '')}
              >
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="workspace-sidebar-footer">
          {/* Deterministic back — no navigate(-1) */}
          <button
            className="workspace-back-btn"
            onClick={() => navigate('/app/cases')}
            type="button"
          >
            ← All Cases
          </button>
        </div>
      </aside>

      {/* Case page content */}
      <div className="workspace-content">
        <Outlet />
      </div>
    </div>
  )
}
