import { Link } from 'react-router-dom'
import './CaseManagement.css'

interface CaseRecord {
  id: string
  name: string
  categories: string[]
  created: string
  entities: number
  relationships: number
  status: 'ACTIVE' | 'REVIEW'
}

const MOCK_CASES: CaseRecord[] = [
  {
    id: 'IIS-2026-001',
    name: 'Project Nightfall',
    categories: ['Organized Crime', 'Financial Crime'],
    created: '14 JUN 2026',
    entities: 7,
    relationships: 24,
    status: 'ACTIVE',
  },
  {
    id: 'IIS-2026-002',
    name: 'Operation Riverbank',
    categories: ['Murder', 'Organized Crime'],
    created: '09 JUN 2026',
    entities: 18,
    relationships: 41,
    status: 'ACTIVE',
  },
  {
    id: 'IIS-2026-003',
    name: 'Case Meridian',
    categories: ['Financial Crime'],
    created: '28 MAY 2026',
    entities: 11,
    relationships: 19,
    status: 'REVIEW',
  },
]

export default function CaseManagement() {
  return (
    <div className="case-management">
      <header className="cm-header">
        <div>
          <div className="eyebrow mono">INVESTIGATION INTELLIGENCE SYSTEM</div>
          <h1>Case Management</h1>
          <p>
            Select an investigation to continue or create a new case.
            Each investigation maintains its own evidence, analysis, and network history.
          </p>
        </div>

        <Link to="/cases/create" className="cm-primary-button">
          <span>+ CREATE NEW CASE</span>
          <span>→</span>
        </Link>
      </header>

      <section className="cm-overview">
        <div className="cm-overview-item">
          <span className="mono">ACTIVE CASES</span>
          <strong>{MOCK_CASES.filter((c) => c.status === 'ACTIVE').length}</strong>
        </div>

        <div className="cm-overview-item">
          <span className="mono">TOTAL CASES</span>
          <strong>{MOCK_CASES.length}</strong>
        </div>

        <div className="cm-overview-item">
          <span className="mono">SYSTEM STATUS</span>
          <strong className="status-ready">● READY</strong>
        </div>
      </section>

      <section className="cm-section">
        <div className="cm-section-header">
          <div>
            <div className="section-label mono">CURRENT INVESTIGATIONS</div>
            <h2>Active Cases</h2>
          </div>

          <Link to="/cases/history" className="cm-history-link mono">
            VIEW CASE HISTORY →
          </Link>
        </div>

        <div className="case-list">
          {MOCK_CASES.map((caseItem) => (
            <article className="case-card" key={caseItem.id}>
              <div className="case-card-main">
                <div className="case-card-top">
                  <span className="case-id mono">{caseItem.id}</span>
                  <span className={`case-status ${caseItem.status.toLowerCase()} mono`}>
                    ● {caseItem.status}
                  </span>
                </div>

                <h3>{caseItem.name}</h3>

                <div className="case-categories">
                  {caseItem.categories.map((category) => (
                    <span className="category-tag mono" key={category}>
                      {category}
                    </span>
                  ))}
                </div>
              </div>

              <div className="case-card-info">
                <div>
                  <span className="mono">CREATED</span>
                  <strong>{caseItem.created}</strong>
                </div>

                <div>
                  <span className="mono">ENTITIES</span>
                  <strong>{caseItem.entities}</strong>
                </div>

                <div>
                  <span className="mono">RELATIONSHIPS</span>
                  <strong>{caseItem.relationships}</strong>
                </div>
              </div>

              <Link
                to={`/cases/${caseItem.id}/dashboard`}
                className="case-open-button"
              >
                OPEN CASE
                <span>→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="cm-history-panel">
        <div>
          <div className="section-label mono">ARCHIVE</div>
          <h2>Historical Investigations</h2>
          <p>
            Review previous investigations and use historical case information
            for comparative analysis and case intelligence.
          </p>
        </div>

        <Link to="/cases/history" className="cm-secondary-button">
          VIEW HISTORY →
        </Link>
      </section>

      <div className="disclaimer-block cm-disclaimer">
        Case information and analytical relationships are provided as investigation
        aids. System observations do not independently establish intent, guilt,
        or criminal involvement.
      </div>
    </div>
  )
}