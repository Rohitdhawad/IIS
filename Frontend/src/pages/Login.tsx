import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const [officerId, setOfficerId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (!officerId.trim() || !password.trim()) {
      setError('Enter investigator ID and password.')
      return
    }

    // Temporary demo authentication.
    // Real authentication will be connected to the backend later.
    navigate('/cases')
  }

  return (
    <div className="login-page">
      <div className="login-topbar">
        <Link to="/" className="login-back mono">← IIS SYSTEM</Link>
        <span className="mono">SECURE INVESTIGATION ACCESS</span>
      </div>

      <div className="login-layout">
        <section className="login-intro">
          <div className="eyebrow mono">INVESTIGATION INTELLIGENCE SYSTEM</div>

          <h1>
            Secure access to
            <br />
            investigation
            <br />
            intelligence.
          </h1>

          <p>
            Access case investigations, evidence, relationship networks,
            analytical findings, and investigation history.
          </p>

          <div className="login-system-info mono">
            <div>
              <span>SYSTEM</span>
              <strong>IIS</strong>
            </div>
            <div>
              <span>ACCESS</span>
              <strong>AUTHORIZED USERS</strong>
            </div>
            <div>
              <span>MODE</span>
              <strong>INVESTIGATION</strong>
            </div>
          </div>
        </section>

        <section className="login-panel">
          <div className="login-panel-header">
            <span className="mono">01 / AUTHENTICATION</span>
            <span className="login-status mono">● SYSTEM READY</span>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="login-field">
              <span className="mono">INVESTIGATOR ID</span>
              <input
                type="text"
                value={officerId}
                onChange={(event) => setOfficerId(event.target.value)}
                placeholder="Enter investigator ID"
                autoComplete="username"
              />
            </label>

            <label className="login-field">
              <span className="mono">PASSWORD</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </label>

            {error && (
              <div className="login-error mono">
                {error}
              </div>
            )}

            <button type="submit" className="login-button">
              <span>Authenticate</span>
              <span>→</span>
            </button>
          </form>

          <div className="login-notice">
            <span className="mono">ACCESS NOTICE</span>
            <p>
              This system is intended for authorized investigation personnel.
              All investigation activity is subject to system audit.
            </p>
          </div>
        </section>
      </div>

      <div className="login-footer mono">
        <span>INVESTIGATION INTELLIGENCE SYSTEM</span>
        <span>AUTHORIZED ACCESS ONLY</span>
      </div>
    </div>
  )
}