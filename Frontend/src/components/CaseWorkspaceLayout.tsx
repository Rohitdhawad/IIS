import {
  NavLink,
  Outlet,
  useParams,
  useNavigate,
} from 'react-router-dom'
import { useEffect, useState } from 'react'
import './CaseWorkspaceLayout.css'

const API_BASE_URL =
  import.meta.env.VITE_IIS_API_URL || 'http://localhost:8000'

interface CaseInfo {
  id: string
  name: string
  description?: string | null
  num_entities?: number
  num_relationships?: number
  num_evidence?: number
}

interface NavItem {
  label: string
  path: string
  icon: string
}

export default function CaseWorkspaceLayout() {
  const { caseId } = useParams()
  const navigate = useNavigate()

  const [caseInfo, setCaseInfo] =
    useState<CaseInfo | null>(null)

  const [loading, setLoading] = useState(true)

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem(
      'iis-sidebar-collapsed',
    ) === 'true'
  })

  useEffect(() => {
    if (!caseId) {
      setLoading(false)
      return
    }

    const loadCase = async () => {
      try {
        setLoading(true)

        const response = await fetch(
          `${API_BASE_URL}/cases/${encodeURIComponent(caseId)}`,
        )

        if (!response.ok) {
          throw new Error(
            `Failed to load case (${response.status})`,
          )
        }

        const data = (await response.json()) as CaseInfo

        setCaseInfo(data)
      } catch (error) {
        console.error(
          'Failed to load case workspace:',
          error,
        )

        setCaseInfo(null)
      } finally {
        setLoading(false)
      }
    }

    loadCase()
  }, [caseId])

  const toggleSidebar = () => {
    setCollapsed((current) => {
      const next = !current

      localStorage.setItem(
        'iis-sidebar-collapsed',
        String(next),
      )

      return next
    })
  }

  const resolvedCaseId = caseId || ''

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: `/cases/${resolvedCaseId}/dashboard`,
      icon: '⌂',
    },
    {
      label: 'Data / Reports',
      path: `/cases/${resolvedCaseId}/upload`,
      icon: '⇧',
    },
    {
      label: 'Entities',
      path: `/cases/${resolvedCaseId}/entities`,
      icon: '◎',
    },
    {
      label: 'Relationships',
      path: `/cases/${resolvedCaseId}/relationships`,
      icon: '⌁',
    },
    {
      label: 'Network Analysis',
      path: `/cases/${resolvedCaseId}/network`,
      icon: '◈',
    },
    {
      label: 'Timeline',
      path: `/cases/${resolvedCaseId}/timeline`,
      icon: '◷',
    },
    {
      label: 'Graph Versions',
      path: `/cases/${resolvedCaseId}/graphs`,
      icon: '◫',
    },
  ]

  if (!caseId) {
    return (
      <div className="workspace-shell">
        <main className="workspace-content">
          <div style={{ padding: '40px' }}>
            <div className="eyebrow">
              CASE WORKSPACE
            </div>

            <h2>
              No case selected
            </h2>

            <p className="intro-text">
              A valid investigation case is required.
            </p>

            <button
              className="back-to-cases"
              onClick={() => navigate('/cases')}
            >
              ← Case Management
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div
      className={`workspace-shell ${
        collapsed
          ? 'workspace-shell-collapsed'
          : ''
      }`}
    >

      {/* SIDEBAR */}

      <aside className="workspace-sidebar">

        {/* BRAND */}

        <div className="workspace-brand">

          <div className="workspace-brand-mark">
            IIS
          </div>

          <div className="workspace-brand-copy">

            <div className="workspace-brand-title">
              Investigation
            </div>

            <div className="workspace-brand-subtitle">
              Intelligence System
            </div>

          </div>

        </div>


        {/* ACTIVE CASE */}

        <div className="workspace-case">

          <div className="workspace-case-label">
            ACTIVE CASE
          </div>

          {loading ? (

            <div className="workspace-case-name">
              Loading...
            </div>

          ) : (

            <>

              <div
                className="workspace-case-name"
                title={
                  caseInfo?.name ||
                  'Unknown Case'
                }
              >
                {caseInfo?.name || 'Unknown Case'}
              </div>

              <div className="workspace-case-id mono">
                {caseInfo?.id || caseId}
              </div>

            </>

          )}

        </div>


        {/* NAVIGATION */}

        <nav className="workspace-nav">

          <div className="workspace-nav-label">
            INVESTIGATION
          </div>

          {navItems.map((item) => (

            <NavLink
              key={item.path}
              to={item.path}
              title={
                collapsed
                  ? item.label
                  : undefined
              }
              className={({ isActive }) =>
                `workspace-nav-item ${
                  isActive
                    ? 'active'
                    : ''
                }`
              }
            >

              <span className="workspace-nav-icon">
                {item.icon}
              </span>

              <span className="workspace-nav-text">
                {item.label}
              </span>

            </NavLink>

          ))}

        </nav>


        {/* SIDEBAR FOOTER */}

        <div className="workspace-sidebar-bottom">

          <button
            className="back-to-cases"
            onClick={() => navigate('/cases')}
            title={
              collapsed
                ? 'Case Management'
                : undefined
            }
          >

            <span className="workspace-footer-icon">
              ←
            </span>

            <span className="workspace-footer-text">
              Case Management
            </span>

          </button>


          <button
            className="workspace-collapse"
            onClick={toggleSidebar}
            title={
              collapsed
                ? 'Expand sidebar'
                : 'Collapse sidebar'
            }
            aria-label={
              collapsed
                ? 'Expand sidebar'
                : 'Collapse sidebar'
            }
          >

            <span
              className={
                collapsed
                  ? 'workspace-collapse-arrow collapsed'
                  : 'workspace-collapse-arrow'
              }
            >
              ‹
            </span>

            <span className="workspace-collapse-text">
              {collapsed
                ? 'Expand'
                : 'Collapse'}
            </span>

          </button>

        </div>

      </aside>


      {/* CONTENT */}

      <main className="workspace-content">

        <Outlet />

      </main>

    </div>
  )
}