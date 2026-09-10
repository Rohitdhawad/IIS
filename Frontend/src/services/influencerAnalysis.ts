import { CaseNetworkData, NetworkEntity, NetworkRelationship, InfluenceFactorBreakdown } from '../types/influencer';

// Calculates influence score transparently from graph metrics if backend scores are raw
export function calculateEntityInfluence(
  entity: NetworkEntity,
  relationships: NetworkRelationship[],
  totalEntitiesCount: number
): { score: number; factors: InfluenceFactorBreakdown } {
  const directRels = relationships.filter(r => r.source === entity.id || r.target === entity.id);
  const connCount = directRels.length;

  // 1. Direct Connectivity (Max 30)
  const maxExpectedConnections = Math.max(1, totalEntitiesCount * 0.25);
  const directConnectivity = Math.min(30, Math.round((connCount / maxExpectedConnections) * 30));

  // 2. Network Centrality (Max 25)
  const networkCentrality = Math.min(25, Math.round(entity.degreeCentrality * 25));

  // 3. Bridge Position (Max 20)
  const bridgeMap = { Critical: 20, High: 16, Medium: 10, Low: 4 };
  const bridgePosition = bridgeMap[entity.bridgeScore] || 5;

  // 4. Cross Entity Connections (Max 15)
  const connectedEntityIds = new Set(
    directRels.map(r => (r.source === entity.id ? r.target : r.source))
  );
  // Simulating diverse entity connection strength
  const crossEntityConnections = Math.min(15, Math.round((connectedEntityIds.size / Math.max(1, connCount)) * 15));

  // 5. Cross Case Presence (Max 10)
  const crossCaseCount = entity.metadata?.crossCaseCount || 1;
  const crossCasePresence = Math.min(10, crossCaseCount * 3.33);

  const totalScore = Math.min(100, directConnectivity + networkCentrality + bridgePosition + crossEntityConnections + crossCasePresence);

  return {
    score: Math.round(totalScore),
    factors: {
      directConnectivity,
      networkCentrality,
      bridgePosition,
      crossEntityConnections: Math.round(crossEntityConnections),
      crossCasePresence: Math.round(crossCasePresence)
    }
  };
}

export function generateInfluenceExplanations(entity: NetworkEntity): string[] {
  const points: string[] = [];
  
  if (entity.bridgeScore === 'Critical' || entity.bridgeScore === 'High') {
    points.push('Acts as a primary structural bridge between distinct network clusters.');
  }
  if (entity.directConnectionsCount >= 15) {
    points.push(`Maintains high direct connectivity (${entity.directConnectionsCount} direct relationships).`);
  }
  if (entity.degreeCentrality > 0.75) {
    points.push('High network centrality index indicating rapid access across entities.');
  }
  if (entity.metadata?.crossCaseCount && entity.metadata.crossCaseCount > 1) {
    points.push(`Identified across ${entity.metadata.crossCaseCount} separate ongoing investigation cases.`);
  }
  if (entity.type === 'person') {
    points.push('Links multiple non-person assets (financial accounts, burner lines, locations).');
  }

  if (points.length === 0) {
    points.push('Peripheral entity with standard relational density.');
    points.push('Requires secondary analytical verification through updated call logs.');
  }

  return points;
}

// Synthetic Investigation Case Repository
export const DEMO_CASES: Record<string, CaseNetworkData> = {
  'CASE-2026-0147': {
    caseId: 'CASE-2026-0147',
    caseName: 'Organized Financial & Smuggling Network',
    totalEntities: 127,
    totalRelationships: 214,
    totalIndividuals: 42,
    highInfluenceCount: 7,
    clusters: [
      { id: 'c1', name: 'Cluster A — Financial', type: 'Financial', entityCount: 38, relationshipCount: 64, topInfluencerId: 'e1', topInfluencerName: 'Rajiv Sharma', connectivityLevel: 'High' },
      { id: 'c2', name: 'Cluster B — Communications', type: 'Communication', entityCount: 42, relationshipCount: 71, topInfluencerId: 'e2', topInfluencerName: 'Amit Verma', connectivityLevel: 'High' },
      { id: 'c3', name: 'Cluster C — Logistics & Assets', type: 'Logistics', entityCount: 29, relationshipCount: 48, topInfluencerId: 'e3', topInfluencerName: 'S. Khan', connectivityLevel: 'Moderate' },
      { id: 'c4', name: 'Cluster D — Core Operational Syndicate', type: 'Core Network', entityCount: 18, relationshipCount: 31, topInfluencerId: 'e4', topInfluencerName: 'Neha Patel', connectivityLevel: 'High' }
    ],
    entities: [
      { id: 'e1', name: 'Rajiv Sharma', type: 'person', role: 'Key Syndicate Financier', clusterId: 'c1', influenceScore: 94, degreeCentrality: 0.91, bridgeScore: 'Critical', directConnectionsCount: 27, metadata: { phone: '+91 98765 11001', location: 'Mumbai Central', organization: 'Apex Global Holdings', crossCaseCount: 3 } },
      { id: 'e2', name: 'Amit Verma', type: 'person', role: 'Operations Coordinator', clusterId: 'c2', influenceScore: 87, degreeCentrality: 0.83, bridgeScore: 'High', directConnectionsCount: 21, metadata: { phone: '+91 98112 33445', location: 'Delhi NCR', crossCaseCount: 2 } },
      { id: 'e3', name: 'S. Khan', type: 'person', role: 'Logistics Liaison', clusterId: 'c3', influenceScore: 81, degreeCentrality: 0.77, bridgeScore: 'High', directConnectionsCount: 19, metadata: { phone: '+91 97654 22110', location: 'Surat Port', crossCaseCount: 1 } },
      { id: 'e4', name: 'Neha Patel', type: 'person', role: 'Shell Co. Director', clusterId: 'c4', influenceScore: 78, degreeCentrality: 0.72, bridgeScore: 'Medium', directConnectionsCount: 16, metadata: { organization: 'Zenith Export Pvt Ltd', crossCaseCount: 2 } },
      { id: 'e5', name: 'Arjun Mehta', type: 'person', role: 'Primary Transport Driver', clusterId: 'c3', influenceScore: 69, degreeCentrality: 0.61, bridgeScore: 'Medium', directConnectionsCount: 12, metadata: { location: 'Ahmedabad Highway', crossCaseCount: 1 } },
      { id: 'e6', name: 'Apex Global Holdings', type: 'organization', role: 'Front Business', clusterId: 'c1', influenceScore: 85, degreeCentrality: 0.80, bridgeScore: 'High', directConnectionsCount: 22, metadata: { accountNo: 'ACC-88902112', location: 'Mumbai' } },
      { id: 'e7', name: '+91 98765 11001', type: 'phone', role: 'Encrypted Burner Line', clusterId: 'c2', influenceScore: 72, degreeCentrality: 0.68, bridgeScore: 'Medium', directConnectionsCount: 14 },
      { id: 'e8', name: 'ACC-99014421 (HDFC)', type: 'financial_account', role: 'Mule Settlement Account', clusterId: 'c1', influenceScore: 64, degreeCentrality: 0.55, bridgeScore: 'Low', directConnectionsCount: 9 },
      { id: 'e9', name: 'MH-04-CZ-9912', type: 'vehicle', role: 'Logistics Transport', clusterId: 'c3', influenceScore: 52, degreeCentrality: 0.42, bridgeScore: 'Low', directConnectionsCount: 6 },
      { id: 'e10', name: 'Surat Dock Warehouse 4', type: 'location', role: 'Drop-off Point', clusterId: 'c3', influenceScore: 58, degreeCentrality: 0.49, bridgeScore: 'Medium', directConnectionsCount: 8 }
    ],
    relationships: [
      { id: 'r1', source: 'e1', target: 'e6', type: 'ownership', strength: 5, description: 'Majority shareholder' },
      { id: 'r2', source: 'e1', target: 'e2', type: 'associate', strength: 4, description: 'Direct communications' },
      { id: 'r3', source: 'e1', target: 'e8', type: 'financial_transfer', strength: 5, description: 'Frequent wire transfers' },
      { id: 'r4', source: 'e2', target: 'e7', type: 'call_log', strength: 5, description: '142 incoming calls logged' },
      { id: 'r5', source: 'e2', target: 'e3', type: 'associate', strength: 4, description: 'Cross-cluster coordinator' },
      { id: 'r6', source: 'e3', target: 'e5', type: 'associate', strength: 3, description: 'Supervises driver' },
      { id: 'r7', source: 'e3', target: 'e10', type: 'co_location', strength: 4, description: 'Frequent geo-pings' },
      { id: 'r8', source: 'e5', target: 'e9', type: 'ownership', strength: 4, description: 'Registered driver' },
      { id: 'r9', source: 'e4', target: 'e1', type: 'financial_transfer', strength: 4, description: 'Capital influx' },
      { id: 'r10', source: 'e4', target: 'e6', type: 'associate', strength: 3, description: 'Board advisor' }
    ]
  }
};