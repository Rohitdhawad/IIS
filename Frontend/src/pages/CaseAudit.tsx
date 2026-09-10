import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCaseAudit, type AuditRecord } from '../lib/dataClient'
import './CaseAudit.css'

const ACTION_LABELS: Record<string, string> = {
  CASE_CREATED: 'Case Created',
  EVIDENCE_UPLOADED: 'Evidence Uploaded',
  HASH_VERIFIED: 'Hash Verified',
  ENTITY_EXTRACTED: 'Entities Extracted',
  RECORD_REVIEWED: 'Record Reviewed',
  AUDIT_LOGGED: 'Audit Logged',
}

const ACTION_COLORS: Record<string, string> = {
  CASE_CREATED: 'var(--amber)',
  EVIDENCE_UPLOADED: '#6f8eb5',
  HASH_VERIFIED: 'var(--teal)',
  ENTITY_EXTRACTED: '#8b9b68',
  RECORD_REVIEWED: '#a77b9b',
  AUDIT_LOGGED: 'var(--paper-dim)',
}

// Simulated provenance chain steps shown at the top
const PROVENANCE_CHAIN = [
  { label: 'Evidence Uploaded', desc: 'Raw file ingested into IIS' },
  { label: 'SHA-256 Hash Generated', desc: 'Cryptographic fingerprint computed' },
  { label: 'Timestamp Recorded', desc: 'UTC timestamp anchored to record' },
  { label: 'Audit Record Created', desc: 'Immutable entry written to audit log' },
  { label: 'Investigator Review', desc: 'Record reviewed and confirmed by analyst' },
]

function formatDateTime(ts: string): string {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ts
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function truncateHash(hash: string | undefined): string {
  if (!hash) return '—'
  return hash.length > 20 ? `${hash.slice(0, 10)}...${hash.slice(-10)}` : hash
}

export default function CaseAudit() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const [records, setRecords] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedHash, setExpandedHash] = useState<string | null>(null)

  useEffect(() => {
    if (!caseId) return
    getCaseAudit(caseId).then((data) => {
      setRecords(data)
      setLoading(false)
    })
  }, [caseId])

  return (
    <div className="case-audit">
      <div className="ca-header">
        <div className="eyebrow mono">Case Workspace · {caseId}</div>
        <h2>Evidence Provenance &amp; Audit Trail</h2>
        <p className="intro-text">
          Chronological chain of custody for all evidence ingested into this case.
        </p>
      </div>

      {/* Prototype disclaimer */}
      <div className="ca-prototype-banner">
        <span className="ca-banner-icon mono">[PROTOTYPE]</span>
        <span>
          This audit trail simulates a tamper-evident ledger for demonstration purposes.
          The hash values and timestamps shown are synthetic. In a production deployment,
          this layer would be connected to a cryptographically verified, append-only audit
          store. This prototype does <strong>not</strong> constitute a real blockchain or
          legally admissible chain of custody.
        </span>
      </div>

      {/* Provenance chain diagram */}
      <div className="ca-section">
        <div className="ca-section-label mono">Evidence Provenance Chain</div>
        <div className="ca-chain">
          {PROVENANCE_CHAIN.map((step, i) => (
            <div key={i} className="ca-chain-item">
              <div className="ca-chain-step">
                <div className="ca-chain-dot" />
                <div className="ca-chain-body">
                  <div className="ca-chain-title">{step.label}</div>
                  <div className="ca-chain-desc">{step.desc}</div>
                </div>
              </div>
              {i < PROVENANCE_CHAIN.length - 1 && (
                <div className="ca-chain-connector" aria-hidden="true">↓</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Audit log */}
      <div className="ca-section">
        <div className="ca-section-label mono">Audit Log</div>

        {loading && <div className="ca-status mono">Loading audit records...</div>}

        {!loading && records.length === 0 && (
          <div className="ca-status mono">No audit records found for this case.</div>
        )}

        {!loading && records.length > 0 && (
          <div className="ca-log">
            {records.map((rec) => (
              <div key={rec.record_id} className="ca-log-row">
                {/* Spine */}
                <div className="ca-log-spine">
                  <div
                    className="ca-log-dot"
                    style={{ background: ACTION_COLORS[rec.action] || 'var(--paper-dim)' }}
                  />
                  <div className="ca-log-line" />
                </div>

                {/* Record */}
                <div className="ca-log-card">
                  <div className="ca-log-head">
                    <span
                      className="ca-action-badge mono"
                      style={{
                        color: ACTION_COLORS[rec.action] || 'var(--paper-dim)',
                        borderColor: ACTION_COLORS[rec.action] || 'var(--line)',
                      }}
                    >
                      {ACTION_LABELS[rec.action] || rec.action}
                    </span>
                    <span className="ca-log-ts mono">{formatDateTime(rec.timestamp)}</span>
                    <span className="ca-log-actor mono">{rec.actor}</span>
                  </div>

                  <div className="ca-log-details">{rec.details}</div>

                  {rec.hash && (
                    <div className="ca-hash-row mono">
                      <span className="ca-hash-label">SHA-256</span>
                      <button
                        className="ca-hash-value"
                        onClick={() => setExpandedHash(expandedHash === rec.record_id ? null : rec.record_id)}
                        title="Click to expand hash"
                      >
                        {expandedHash === rec.record_id ? rec.hash : truncateHash(rec.hash)}
                      </button>
                      <span className="ca-hash-note">· simulated · prototype only</span>
                    </div>
                  )}

                  <span className="ca-record-id mono">{rec.record_id}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Back — deterministic */}
      <div className="ca-back-row">
        <button className="btn ghost" onClick={() => navigate(`/app/cases/${caseId}`)}>
          ← Back to Case Workspace
        </button>
      </div>

      <div className="disclaimer-block">
        This is a prototype audit trail simulating evidence provenance. Hash values and
        timestamps are synthetic demonstration data. This system is not connected to a
        production blockchain or legally certified chain-of-custody system.
        All records require independent verification before legal use.
      </div>
    </div>
  )
}
