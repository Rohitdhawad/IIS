import { Link } from 'react-router-dom'
import './Landing.css'

export default function Landing() {
  return (
    <div className="landing-page">
      <div className="landing-grid">
        <div className="landing-content">
          <div className="eyebrow mono">IIS SYSTEM · INVESTIGATION INTELLIGENCE</div>

          <h1 className="landing-title">
            AI-Powered
            <br />
            Criminal Network
            <br />
            Analysis
          </h1>

          <p className="landing-description">
            An evidence-driven intelligence system for analyzing fragmented
            investigation data, discovering relationships, and visualizing
            complex criminal networks.
          </p>

          <div className="landing-actions">
            <Link to="/login" className="landing-button primary">
              Enter Investigation System
              <span>→</span>
            </Link>
          </div>

          <div className="landing-capabilities">
            <div className="capability">
              <span className="capability-index mono">01</span>
              <div>
                <strong>Multi-source intelligence</strong>
                <p>FIRs · CDRs · Financial · Surveillance · Intelligence</p>
              </div>
            </div>

            <div className="capability">
              <span className="capability-index mono">02</span>
              <div>
                <strong>Entity & relationship analysis</strong>
                <p>People · Vehicles · Locations · Organizations</p>
              </div>
            </div>

            <div className="capability">
              <span className="capability-index mono">03</span>
              <div>
                <strong>Network intelligence</strong>
                <p>Connections · Patterns · Anomalies · Evidence</p>
              </div>
            </div>
          </div>
        </div>

        <div className="landing-visual">
          <div className="visual-label mono">NETWORK INTELLIGENCE</div>

          <div className="network-preview">
            <div className="network-line line-a" />
            <div className="network-line line-b" />
            <div className="network-line line-c" />
            <div className="network-line line-d" />
            <div className="network-line line-e" />

            <div className="network-node node-center">
              <span />
            </div>

            <div className="network-node node-one">
              <span />
            </div>

            <div className="network-node node-two">
              <span />
            </div>

            <div className="network-node node-three">
              <span />
            </div>

            <div className="network-node node-four">
              <span />
            </div>

            <div className="network-node node-five">
              <span />
            </div>

            <div className="network-label label-center mono">ENTITY</div>
            <div className="network-label label-one mono">PERSON</div>
            <div className="network-label label-two mono">PERSON</div>
            <div className="network-label label-three mono">VEHICLE</div>
            <div className="network-label label-four mono">LOCATION</div>
          </div>

          <div className="visual-footer mono">
            <span>RELATIONSHIP GRAPH</span>
            <span>● EVIDENCE-BACKED</span>
          </div>
        </div>
      </div>

      <div className="landing-footer mono">
        <span>INVESTIGATION INTELLIGENCE SYSTEM</span>
        <span>AI-POWERED ANALYSIS PLATFORM</span>
      </div>
    </div>
  )
}