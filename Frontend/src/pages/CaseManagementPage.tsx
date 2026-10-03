import {
  useEffect,
  useState,
} from 'react'
import { Link } from 'react-router-dom'
import {
  getCases,
  type CaseInfo,
} from '../lib/dataClient'
import './CaseManagement.css'

export default function CaseManagement() {
  const [cases, setCases] =
    useState<CaseInfo[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  useEffect(() => {
    const loadCases = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await getCases()

        setCases(data)
      } catch (err) {
        console.error(
          'Failed to load cases:',
          err,
        )

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load cases.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadCases()
  }, [])

  return (
    <div className="case-management">

      <header className="cm-header">

        <div>

          <div className="eyebrow mono">
            INVESTIGATION INTELLIGENCE SYSTEM
          </div>

          <h1>
            Case Management
          </h1>

          <p>
            Select an investigation to continue or create
            a new case. Each investigation maintains its own
            evidence, analysis, and network.
          </p>

        </div>

        <Link
          to="/cases/create"
          className="cm-primary-button"
        >
          <span>
            + CREATE NEW CASE
          </span>

          <span>
            →
          </span>
        </Link>

      </header>


      <section className="cm-overview">

        <div className="cm-overview-item">

          <span className="mono">
            ACTIVE CASES
          </span>

          <strong>
            {cases.length}
          </strong>

        </div>

        <div className="cm-overview-item">

          <span className="mono">
            TOTAL CASES
          </span>

          <strong>
            {cases.length}
          </strong>

        </div>

        <div className="cm-overview-item">

          <span className="mono">
            SYSTEM STATUS
          </span>

          <strong className="status-ready">
            ● READY
          </strong>

        </div>

      </section>


      <section className="cm-section">

        <div className="cm-section-header">

          <div>

            <div className="section-label mono">
              CURRENT INVESTIGATIONS
            </div>

            <h2>
              Cases
            </h2>

          </div>

          <Link
            to="/cases/history"
            className="cm-history-link mono"
          >
            VIEW CASE HISTORY →
          </Link>

        </div>


        {loading && (
          <div className="case-list">
            <article className="case-card">
              <div className="case-card-main">
                <h3>
                  Loading investigations...
                </h3>
              </div>
            </article>
          </div>
        )}


        {!loading && error && (
          <div className="case-list">
            <article className="case-card">
              <div className="case-card-main">
                <span className="case-status review mono">
                  ● ERROR
                </span>

                <h3>
                  Unable to load investigations
                </h3>

                <p>
                  {error}
                </p>
              </div>
            </article>
          </div>
        )}


        {!loading &&
          !error &&
          cases.length === 0 && (
            <div className="case-list">
              <article className="case-card">
                <div className="case-card-main">
                  <span className="case-id mono">
                    NO CASES
                  </span>

                  <h3>
                    No investigations created yet
                  </h3>

                  <p>
                    Create your first investigation to begin
                    adding evidence and building the network.
                  </p>
                </div>

                <Link
                  to="/cases/create"
                  className="case-open-button"
                >
                  CREATE CASE
                  <span>→</span>
                </Link>
              </article>
            </div>
          )}


        {!loading &&
          !error &&
          cases.length > 0 && (
            <div className="case-list">

              {cases.map((caseItem) => (

                <article
                  className="case-card"
                  key={caseItem.id}
                >

                  <div className="case-card-main">

                    <div className="case-card-top">

                      <span className="case-id mono">
                        {caseItem.id}
                      </span>

                      <span className="case-status active mono">
                        ● ACTIVE
                      </span>

                    </div>

                    <h3>
                      {caseItem.name}
                    </h3>

                    <p>
                      {caseItem.description ||
                        'No case description provided.'}
                    </p>

                  </div>


                  <div className="case-card-info">

                    <div>

                      <span className="mono">
                        CREATED
                      </span>

                      <strong>
                        {caseItem.created_at
                          ? new Date(
                              caseItem.created_at,
                            ).toLocaleDateString(
                              'en-GB',
                              {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              },
                            )
                          : '—'}
                      </strong>

                    </div>


                    <div>

                      <span className="mono">
                        ENTITIES
                      </span>

                      <strong>
                        {caseItem.num_entities}
                      </strong>

                    </div>


                    <div>

                      <span className="mono">
                        RELATIONSHIPS
                      </span>

                      <strong>
                        {caseItem.num_relationships}
                      </strong>

                    </div>

                  </div>


                  <Link
                    to={`/cases/${encodeURIComponent(
                      caseItem.id,
                    )}/dashboard`}
                    className="case-open-button"
                  >
                    OPEN CASE
                    <span>→</span>
                  </Link>

                </article>

              ))}

            </div>
          )}

      </section>


      <section className="cm-history-panel">

        <div>

          <div className="section-label mono">
            ARCHIVE
          </div>

          <h2>
            Historical Investigations
          </h2>

          <p>
            Review previous investigations and use historical
            case information for comparative analysis.
          </p>

        </div>

        <Link
          to="/cases/history"
          className="cm-secondary-button"
        >
          VIEW HISTORY →
        </Link>

      </section>


      <div className="disclaimer-block cm-disclaimer">

        Case information and analytical relationships are
        provided as investigation aids. System observations
        do not independently establish intent, guilt, or
        criminal involvement.

      </div>

    </div>
  )
}