import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import './CaseWorkspaceLayout.css'

export default function CaseWorkspaceLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const caseId =
    location.pathname.split('/')[2] || 'IIS-2026-001'

  const navItems = [
    {
      label: 'Dashboard',
      path: `/cases/${caseId}/dashboard`,
    },
    {
      label: 'Data / Reports',
      path: `/cases/${caseId}/upload`,
    },
    {
      label: 'Entities',
      path: `/cases/${caseId}/entities`,
    },
    {
      label: 'Relationships',
      path: `/cases/${caseId}/relationships`,
    },
    {
      label: 'Network Analysis',
      path: `/cases/${caseId}/network`,
    },
    {
      label: 'Timeline',
      path: `/cases/${caseId}/timeline`,
    },
    {
      label: 'Graph Versions',
      path: `/cases/${caseId}/graphs`,
    },
  ]

  return (
    <div className="workspace-shell">

      <aside className="workspace-sidebar">

        <div className="workspace-brand">
          <div className="workspace-brand-mark">IIS</div>
          <div>
            <div className="workspace-brand-title">
              Investigation
            </div>
            <div className="workspace-brand-subtitle">
              Intelligence System
            </div>
          </div>
        </div>

        <div className="workspace-case">
          <div className="workspace-case-label">
            ACTIVE CASE
          </div>

          <div className="workspace-case-name">
            Project Nightfall
          </div>

          <div className="workspace-case-id mono">
            {caseId}
          </div>
        </div>

        <nav className="workspace-nav">

          <div className="workspace-nav-label">
            INVESTIGATION
          </div>

          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `workspace-nav-item ${
                  isActive ? 'active' : ''
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}

        </nav>

        <div className="workspace-sidebar-bottom">

          <button
            className="back-to-cases"
            onClick={() => navigate('/cases')}
          >
            ← Case Management
          </button>

        </div>

      </aside>

      <main className="workspace-content">
        <Outlet />
      </main>

    </div>
  )
}