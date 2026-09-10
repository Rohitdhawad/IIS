import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {}

    if (!email.trim()) {
      newErrors.email = 'Agent ID or email address is required.'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid internal email address.'
    }

    if (!password) {
      newErrors.password = 'Security credential key is required.'
    } else if (password.length < 6) {
      newErrors.password = 'Credential key must be at least 6 characters.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    setErrors({})

    // Prototype authentication — replace with real backend call when available
    setTimeout(() => {
      setIsSubmitting(false)
      navigate('/app/dashboard')
    }, 1000)
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Brand / Logo Header */}
        <div style={styles.header}>
          <div style={styles.brandBadge} className="mono">
            <span style={styles.badgeDot} />
            SIH26189 // SECURE ACCESS
          </div>
          <h1 style={styles.title}>System Login</h1>
          <p style={styles.subtitle}>
            Authenticate clearance credentials to access Investigation Intelligence System.
          </p>
        </div>

        {/* Global Error Alert */}
        {errors.general && (
          <div style={styles.errorAlert} role="alert">
            <span>[!] {errors.general}</span>
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Email Field */}
          <div style={styles.fieldGroup}>
            <label htmlFor="email" style={styles.label} className="mono">
              Agent Email / Identifier
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@sih26189.internal"
              disabled={isSubmitting}
              style={{
                ...styles.input,
                borderColor: errors.email ? 'var(--red)' : 'var(--line)',
              }}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <span id="email-error" style={styles.fieldError} className="mono">
                {errors.email}
              </span>
            )}
          </div>

          {/* Password Field */}
          <div style={styles.fieldGroup}>
            <div style={styles.labelRow}>
              <label htmlFor="password" style={styles.label} className="mono">
                Security Key
              </label>
              <a href="#forgot" onClick={(e) => e.preventDefault()} style={styles.forgotLink}>
                Forgot key?
              </a>
            </div>

            <div style={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={isSubmitting}
                style={{
                  ...styles.input,
                  borderColor: errors.password ? 'var(--red)' : 'var(--line)',
                  paddingRight: '64px',
                }}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.toggleBtn}
                className="mono"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>

            {errors.password && (
              <span id="password-error" style={styles.fieldError} className="mono">
                {errors.password}
              </span>
            )}
          </div>

          {/* Remember Token Checkbox */}
          <div style={styles.rememberRow}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isSubmitting}
                style={styles.checkbox}
              />
              <span style={{ color: 'var(--paper-dim)', fontSize: '12.5px' }}>
                Maintain authenticated session token
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              ...styles.submitBtn,
              opacity: isSubmitting ? 0.75 : 1,
              cursor: isSubmitting ? 'wait' : 'pointer',
            }}
            className="mono"
          >
            {isSubmitting ? 'VERIFYING CREDENTIALS...' : 'AUTHENTICATE ACCESS →'}
          </button>
        </form>

        {/* Footer */}
        <div style={styles.footer}>
          <span style={{ color: 'var(--paper-faint)', fontSize: '12px' }}>
            Unregistered clearance level?
          </span>{' '}
          <a href="#request-access" onClick={(e) => e.preventDefault()} style={styles.signupLink}>
            Request Clearance
          </a>
        </div>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg)',
    color: 'var(--paper)',
    padding: '24px',
    boxSizing: 'border-box',
  },
  card: {
    width: '100%',
    maxWidth: '410px',
    backgroundColor: 'var(--panel)',
    border: '1px solid var(--line)',
    borderRadius: '4px',
    padding: '32px 28px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  },
  header: {
    marginBottom: '24px',
  },
  brandBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '11px',
    color: 'var(--amber)',
    backgroundColor: 'var(--amber-glow)',
    border: '1px solid var(--amber-dim)',
    padding: '3px 8px',
    borderRadius: '2px',
    letterSpacing: '0.05em',
    marginBottom: '14px',
  },
  badgeDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: 'var(--amber)',
    display: 'inline-block',
  },
  title: {
    fontSize: '22px',
    fontWeight: 600,
    color: 'var(--paper)',
    margin: '0 0 6px 0',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--paper-dim)',
    margin: 0,
    lineHeight: '1.5',
  },
  errorAlert: {
    backgroundColor: 'rgba(181, 69, 63, 0.15)',
    border: '1px solid var(--red)',
    color: '#f87171',
    fontSize: '12.5px',
    padding: '10px 12px',
    borderRadius: '3px',
    marginBottom: '20px',
  },
  fieldGroup: {
    marginBottom: '18px',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  label: {
    display: 'block',
    fontSize: '11px',
    color: 'var(--paper-dim)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  forgotLink: {
    fontSize: '11.5px',
    color: 'var(--amber)',
    textDecoration: 'none',
  },
  input: {
    width: '100%',
    backgroundColor: 'var(--panel-2)',
    border: '1px solid var(--line)',
    borderRadius: '3px',
    padding: '10px 12px',
    color: 'var(--paper)',
    fontSize: '13.5px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease',
  },
  passwordWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  toggleBtn: {
    position: 'absolute',
    right: '8px',
    background: 'none',
    border: 'none',
    color: 'var(--paper-faint)',
    fontSize: '10.5px',
    fontWeight: 600,
    padding: '4px 6px',
    cursor: 'pointer',
    letterSpacing: '0.05em',
  },
  fieldError: {
    display: 'block',
    fontSize: '11.5px',
    color: 'var(--red)',
    marginTop: '5px',
  },
  rememberRow: {
    marginBottom: '22px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  checkbox: {
    accentColor: 'var(--amber)',
    width: '14px',
    height: '14px',
    cursor: 'pointer',
  },
  submitBtn: {
    width: '100%',
    backgroundColor: 'var(--amber)',
    color: '#0e1210',
    border: 'none',
    borderRadius: '3px',
    padding: '11px',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    transition: 'background-color 0.15s ease',
  },
  footer: {
    marginTop: '22px',
    paddingTop: '16px',
    borderTop: '1px solid var(--line-soft)',
    textAlign: 'center',
  },
  signupLink: {
    fontSize: '12px',
    color: 'var(--amber)',
    textDecoration: 'none',
    fontWeight: 500,
  },
}