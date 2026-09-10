import { NavLink, Outlet } from 'react-router-dom'
import './Layout.css'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Investigation Network', end: true },
  { to: '/upload', label: 'Upload Data' },
]

export default function Layout() {
  return (
    <div className="shell">
      <aside className="shell-sidebar">
        <div className="brand">
          <div className="brand-eyebrow mono">IIS SYSTEM</div>
          <h1 className="brand-title">Investigation<br />Intelligence</h1>
          <div className="brand-case mono">INGESTED NETWORK</div>
        </div>

        <nav className="shell-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="shell-footnote">
          Relationships shown here are evidence-backed records selected from
          ingested investigation data for human review.
        </div>
      </aside>

      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  )
}
