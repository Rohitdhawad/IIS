import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DEMO_CASES } from '../services/influencerAnalysis';
import { SortOption } from '../types/influencer';
import { D3NetworkGraph } from '../components/influencers/D3NetworkGraph';
import { InfluenceRanking } from '../components/influencers/InfluenceRanking';
import { EntityAnalysisPanel } from '../components/influencers/EntityAnalysisPanel';

export const InfluencerDetection: React.FC = () => {
  const { caseId } = useParams<{ caseId?: string }>();
  const navigate = useNavigate();

  // Active Case State
  const activeCaseId = caseId || 'CASE-2026-0147';
  const currentCase = DEMO_CASES[activeCaseId] || DEMO_CASES['CASE-2026-0147'];

  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(currentCase.entities[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('influence');

  // Filter & Sort Entities
  const filteredAndSortedEntities = useMemo(() => {
    let result = currentCase.entities.filter(e => {
      const q = searchQuery.toLowerCase();
      return (
        e.name.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        (e.role && e.role.toLowerCase().includes(q))
      );
    });

    return result.sort((a, b) => {
      if (sortBy === 'influence') return b.influenceScore - a.influenceScore;
      if (sortBy === 'connections') return b.directConnectionsCount - a.directConnectionsCount;
      if (sortBy === 'centrality') return b.degreeCentrality - a.degreeCentrality;
      if (sortBy === 'bridge') {
        const order = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        return order[b.bridgeScore] - order[a.bridgeScore];
      }
      return 0;
    });
  }, [currentCase, searchQuery, sortBy]);

  const selectedEntity = useMemo(() => {
    return currentCase.entities.find(e => e.id === selectedEntityId) || null;
  }, [currentCase, selectedEntityId]);

  return (
    <div className="iis-workspace-container">
      {/* Header */}
      <header className="iis-page-header">
        <div className="header-titles">
          <span className="eyebrow mono">NETWORK ANALYSIS</span>
          <h1 className="page-heading">Key Influencer Detection</h1>
          <p className="page-description text-muted">
            Identify individuals with significant influence, connectivity, and bridge positions within an investigation network.
          </p>
        </div>
        <div className="header-status-badge mono">
          <span className="status-indicator active"></span>
          AI NETWORK ANALYSIS · ANALYTICAL VIEW
        </div>
      </header>

      {/* Case Selector Row */}
      <div className="case-selector-bar iis-card mt-3">
        <div className="selector-info">
          <label className="input-label mono">ACTIVE INVESTIGATION CASE</label>
          <select
            className="case-dropdown mono"
            value={activeCaseId}
            onChange={(e) => navigate(`/app/cases/${e.target.value}/influencers`)}
          >
            {Object.values(DEMO_CASES).map(c => (
              <option key={c.caseId} value={c.caseId}>
                {c.caseId} — {c.caseName}
              </option>
            ))}
          </select>
        </div>
        <div className="case-meta-counts mono text-muted">
          <span>{currentCase.totalEntities} entities</span>
          <span className="divider">·</span>
          <span>{currentCase.totalRelationships} relationships</span>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="stats-grid mt-3">
        <div className="stat-card">
          <span className="stat-label">Network Entities</span>
          <span className="stat-value mono">{currentCase.totalEntities}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Relationships</span>
          <span className="stat-value mono">{currentCase.totalRelationships}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Individuals</span>
          <span className="stat-value mono">{currentCase.totalIndividuals}</span>
        </div>
        <div className="stat-card highlight-border">
          <span className="stat-label">High Influence</span>
          <span className="stat-value mono text-highlight">{currentCase.highInfluenceCount}</span>
        </div>
      </div>

      {/* Main Analysis Area Grid */}
      <div className="main-analysis-grid mt-4">
        {/* Left Column: Interactive D3 Graph */}
        <div className="grid-left-column">
          <D3NetworkGraph
            entities={filteredAndSortedEntities}
            relationships={currentCase.relationships}
            selectedEntityId={selectedEntityId}
            onSelectEntity={(id) => setSelectedEntityId(id)}
          />
          
          {/* Cluster Summary Row below Graph */}
          <div className="iis-card mt-3">
            <h4 className="card-title border-bottom pb-2">Detected Network Clusters</h4>
            <div className="clusters-grid mt-2">
              {currentCase.clusters.map(cluster => (
                <div key={cluster.id} className="cluster-item-box">
                  <span className="cluster-name">{cluster.name}</span>
                  <div className="cluster-meta mono text-muted mt-1">
                    <span>{cluster.entityCount} Entities</span> · <span>Top: {cluster.topInfluencerName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Ranking + Selected Analysis */}
        <div className="grid-right-column">
          <EntityAnalysisPanel
            entity={selectedEntity}
            relationships={currentCase.relationships}
            totalEntitiesCount={currentCase.totalEntities}
          />

          <div className="mt-3">
            <InfluenceRanking
              entities={filteredAndSortedEntities}
              selectedEntityId={selectedEntityId}
              onSelectEntity={(id) => setSelectedEntityId(id)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </div>
        </div>
      </div>

      {/* Investigator Safety / Disclaimer Block */}
      <div className="disclaimer-block mt-4">
        <strong className="mono">INVESTIGATOR NOTICE:</strong> Influence scores are analytical indicators derived from available network relationships. They do not independently establish leadership, guilt, intent, or criminal involvement. All outputs require investigator verification.
      </div>
    </div>
  );
};