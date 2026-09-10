import { useNavigate } from 'react-router-dom'
import './Landing.css'

const FLOW_STEPS = [
  { icon: '⬡', label: 'Fragmented Crime Data', sub: 'FIRs, CDRs, Financial Records, Surveillance' },
  { icon: '⬡', label: 'AI-Powered Analysis', sub: 'Entity extraction, anomaly detection, pattern recognition' },
  { icon: '⬡', label: 'Data Correlation', sub: 'Cross-source, cross-case relationship mapping' },
  { icon: '⬡', label: 'Connected Criminal Network', sub: 'Interactive knowledge graph visualization' },
  { icon: '⬡', label: 'Investigator Insights', sub: 'Actionable analytical intelligence for investigators' },
]

const CAPABILITY_CARDS = [
  {
    title: 'Network Graph Analysis',
    description: 'Visualise entities — persons, vehicles, locations, accounts — and the evidence-backed relationships connecting them across cases.',
  },
  {
    title: 'Cross-Case Correlation',
    description: 'Automatically surface connections between active and archived investigations through shared entities, locations and historical records.',
  },
  {
    title: 'Timeline Reconstruction',
    description: 'Build a chronological picture of events from fragmented multi-source evidence: CDRs, surveillance reports, financial transactions and more.',
  },
  {
    title: 'Evidence Provenance',
    description: 'Maintain a tamper-evident audit chain for every piece of evidence — from initial upload through hash verification to investigator review.',
  },
  {
    title: 'AI-Assisted Pattern Detection',
    description: 'Flag high-value transfers, repeated co-location events, communication clusters and cross-case anomalies for investigator verification.',
  },
  {
    title: 'Structured Case Workspaces',
    description: 'Each investigation gets a dedicated workspace — overview, timeline, evidence, network graph, AI insights and entity explorer — in one place.',
  },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="landing">
      {/* ── Header bar ── */}
      <header className="landing-header">
        <div className="landing-brand">
          <span className="landing-brand-mark mono">IIS</span>
          <span className="landing-brand-name">Investigation Intelligence System</span>
        </div>
        <div className="landing-header-actions">
          <button
            className="landing-login-btn mono"
            onClick={() => navigate('/login')}
          >
            Login →
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-eyebrow mono">Smart India Hackathon · AI-Powered Investigation</div>
          <h1 className="landing-title">
            AI-Powered Criminal<br />Network Analysis System
          </h1>
          <p className="landing-subtitle">
            IIS helps investigators transform fragmented evidence — call records, financial
            transactions, surveillance data and criminal history — into a connected,
            queryable intelligence picture. Discover relationships, trace timelines and
            surface analytical insights across active and archived cases.
          </p>
          <div className="landing-hero-actions">
            <button
              className="landing-cta"
              onClick={() => navigate('/login')}
            >
              Login to IIS
            </button>
            <span className="landing-cta-note mono">Prototype demonstration — use any valid-format credentials</span>
          </div>
        </div>

        <div className="landing-hero-badge">
          <div className="badge-ring">
            <div className="badge-inner mono">IIS</div>
          </div>
        </div>
      </section>

      {/* ── Intelligence flow ── */}
      <section className="landing-flow">
        <div className="landing-section-label mono">Intelligence Pipeline</div>
        <div className="flow-steps">
          {FLOW_STEPS.map((step, i) => (
            <div key={i} className="flow-step">
              <div className="flow-step-body">
                <div className="flow-step-title">{step.label}</div>
                <div className="flow-step-sub">{step.sub}</div>
              </div>
              {i < FLOW_STEPS.length - 1 && (
                <div className="flow-arrow" aria-hidden="true">↓</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Capabilities ── */}
      <section className="landing-capabilities">
        <div className="landing-section-label mono">System Capabilities</div>
        <div className="capability-grid">
          {CAPABILITY_CARDS.map((card, i) => (
            <div key={i} className="capability-card">
              <div className="capability-number mono">0{i + 1}</div>
              <div className="capability-title">{card.title}</div>
              <div className="capability-desc">{card.description}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA footer band ── */}
      <section className="landing-cta-band">
        <div className="landing-cta-band-inner">
          <h2 className="landing-cta-band-title">Ready to explore the prototype?</h2>
          <p className="landing-cta-band-sub">
            Navigate through investigation cases, explore entity networks and review AI-generated
            analytical insights — all backed by synthetic demonstration data.
            Use any valid-format credentials to authenticate for the prototype.
          </p>
          <button
            className="landing-cta"
            onClick={() => navigate('/login')}
          >
            Login to IIS
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-brand mono">IIS — Investigation Intelligence System</div>
        <div className="landing-footer-disclaimer">
          This is a prototype built for demonstration purposes. All data is synthetic and fictional.
          AI-generated insights are analytical aids and require investigator verification.
          This system does not independently establish guilt, intent or criminal involvement.
        </div>
      </footer>
    </div>
  )
}
