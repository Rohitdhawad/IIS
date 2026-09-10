import React from 'react';
import { NetworkEntity, NetworkRelationship } from '../../types/influencer';
import { calculateEntityInfluence, generateInfluenceExplanations } from '../../services/influencerAnalysis';

interface EntityAnalysisPanelProps {
  entity: NetworkEntity | null;
  relationships: NetworkRelationship[];
  totalEntitiesCount: number;
}

export const EntityAnalysisPanel: React.FC<EntityAnalysisPanelProps> = ({
  entity,
  relationships,
  totalEntitiesCount
}) => {
  if (!entity) {
    return (
      <div className="iis-card empty-analysis-card text-center text-muted">
        <p>Select any node in the network graph or entity from the ranking list to inspect analytical breakdown.</p>
      </div>
    );
  }

  const { score, factors } = calculateEntityInfluence(entity, relationships, totalEntitiesCount);
  const explanations = generateInfluenceExplanations(entity);

  return (
    <div className="iis-card entity-analysis-card">
      <div className="card-header-clean border-bottom pb-2">
        <div>
          <span className="eyebrow mono">SELECTED ENTITY DETAILED ANALYSIS</span>
          <h3 className="card-title mt-1">{entity.name}</h3>
        </div>
        <span className={`entity-type-pill type-${entity.type}`}>{entity.type}</span>
      </div>

      <div className="key-metrics-grid mt-3">
        <div className="metric-box">
          <span className="metric-label">Influence Score</span>
          <span className="metric-value highlight mono">{score}/100</span>
        </div>
        <div className="metric-box">
          <span className="metric-label">Centrality</span>
          <span className="metric-value mono">{entity.degreeCentrality.toFixed(2)}</span>
        </div>
        <div className="metric-box">
          <span className="metric-label">Bridge Rank</span>
          <span className={`metric-value bridge-${entity.bridgeScore.toLowerCase()} mono`}>{entity.bridgeScore}</span>
        </div>
        <div className="metric-box">
          <span className="metric-label">Direct Connections</span>
          <span className="metric-value mono">{entity.directConnectionsCount}</span>
        </div>
      </div>

      {/* Factors Breakdown */}
      <div className="analysis-section mt-4">
        <h4 className="section-subheading">Influence Calculation Factors</h4>
        <div className="factor-progress-group mt-2">
          <div className="factor-row">
            <span className="factor-name">Direct Connectivity (Max 30)</span>
            <span className="factor-val mono">{factors.directConnectivity}/30</span>
          </div>
          <div className="progress-bar-bg"><div className="progress-fill" style={{ width: `${(factors.directConnectivity / 30) * 100}%` }}></div></div>

          <div className="factor-row mt-2">
            <span className="factor-name">Network Centrality (Max 25)</span>
            <span className="factor-val mono">{factors.networkCentrality}/25</span>
          </div>
          <div className="progress-bar-bg"><div className="progress-fill" style={{ width: `${(factors.networkCentrality / 25) * 100}%` }}></div></div>

          <div className="factor-row mt-2">
            <span className="factor-name">Bridge Position (Max 20)</span>
            <span className="factor-val mono">{factors.bridgePosition}/20</span>
          </div>
          <div className="progress-bar-bg"><div className="progress-fill" style={{ width: `${(factors.bridgePosition / 20) * 100}%` }}></div></div>

          <div className="factor-row mt-2">
            <span className="factor-name">Cross-Entity Connections (Max 15)</span>
            <span className="factor-val mono">{factors.crossEntityConnections}/15</span>
          </div>
          <div className="progress-bar-bg"><div className="progress-fill" style={{ width: `${(factors.crossEntityConnections / 15) * 100}%` }}></div></div>

          <div className="factor-row mt-2">
            <span className="factor-name">Cross-Case Presence (Max 10)</span>
            <span className="factor-val mono">{factors.crossCasePresence}/10</span>
          </div>
          <div className="progress-bar-bg"><div className="progress-fill" style={{ width: `${(factors.crossCasePresence / 10) * 100}%` }}></div></div>
        </div>
      </div>

      {/* Why entity is influential */}
      <div className="analysis-section mt-4">
        <h4 className="section-subheading">Analytical Explanation</h4>
        <ul className="explanation-list mt-2">
          {explanations.map((exp, idx) => (
            <li key={idx} className="explanation-item text-muted">
              <span className="bullet-point">•</span> {exp}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};