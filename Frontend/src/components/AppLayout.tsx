import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import './AppLayout.css'

const GLOBAL_NAV = [
  { to: '/app/dashboard', label: 'Dashboard', end: true },
  { to: '/app/cases', label: 'Recent Cases' },
  { to: '/app/search', label: 'Search Cases' },
]

export default function AppLayout() {
  const navigate = useNavigate()

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        {/* Brand */}
        <div className="app-brand">
          <div className="app-brand-eyebrow mono">IIS SYSTEM</div>
          <h1 className="app-brand-title">Investigation<br />Intelligence</h1>
        </div>

        {/* Global navigation */}
        <nav className="app-nav" aria-label="Global navigation">
          {GLOBAL_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => 'app-nav-item' + (isActive ? ' active' : '')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Back to Landing */}
        <div className="app-sidebar-footer">
          <button
            className="back-to-landing"
            onClick={() => navigate('/')}
            type="button"
          >
            ← Back to Landing
          </button>
          <div className="app-footnote">
            Relationships are evidence-backed records for investigator review only.
          </div>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
