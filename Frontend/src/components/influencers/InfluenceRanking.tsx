import React from 'react';
import { NetworkEntity, SortOption } from '../../types/influencer';

interface InfluenceRankingProps {
  entities: NetworkEntity[];
  selectedEntityId: string | null;
  onSelectEntity: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export const InfluenceRanking: React.FC<InfluenceRankingProps> = ({
  entities,
  selectedEntityId,
  onSelectEntity,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange
}) => {
  return (
    <div className="iis-card influence-ranking-card">
      <div className="card-header-clean">
        <h3 className="card-title">Influence Ranking</h3>
        <span className="badge-count mono">{entities.length} Ranked</span>
      </div>

      <div className="ranking-controls">
        <input
          type="text"
          className="iis-input mono"
          placeholder="Search name, ID, phone, org..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <select
          className="iis-select mono"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
        >
          <option value="influence">Sort: Highest Influence</option>
          <option value="connections">Sort: Connections</option>
          <option value="centrality">Sort: Centrality</option>
          <option value="bridge">Sort: Bridge Score</option>
        </select>
      </div>

      <div className="ranking-table-wrapper">
        <table className="iis-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Entity</th>
              <th>Type</th>
              <th className="text-right">Score</th>
              <th className="text-right">Conn</th>
              <th className="text-right">Centrality</th>
              <th>Bridge</th>
            </tr>
          </thead>
          <tbody>
            {entities.map((entity, index) => {
              const isSelected = entity.id === selectedEntityId;
              const rankStr = (index + 1).toString().padStart(2, '0');

              return (
                <tr
                  key={entity.id}
                  className={`ranking-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectEntity(entity.id)}
                >
                  <td className="mono rank-cell">#{rankStr}</td>
                  <td>
                    <div className="entity-name-cell">
                      <span className="entity-main-name">{entity.name}</span>
                      {entity.role && <span className="entity-role-sub text-muted">{entity.role}</span>}
                    </div>
                  </td>
                  <td>
                    <span className={`entity-type-pill type-${entity.type}`}>
                      {entity.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="text-right mono bold-score">
                    {entity.influenceScore}
                  </td>
                  <td className="text-right mono">{entity.directConnectionsCount}</td>
                  <td className="text-right mono">{entity.degreeCentrality.toFixed(2)}</td>
                  <td>
                    <span className={`bridge-badge bridge-${entity.bridgeScore.toLowerCase()}`}>
                      {entity.bridgeScore}
                    </span>
                  </td>
                </tr>
              );
            })}
            {entities.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted py-4">
                  No matching entities found in network analysis.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};