export type EntityType = 'person' | 'organization' | 'phone' | 'vehicle' | 'location' | 'financial_account';

export interface NetworkEntity {
  id: string;
  name: string;
  type: EntityType;
  role?: string;
  clusterId: string;
  influenceScore: number; // 0 - 100
  degreeCentrality: number; // 0 - 1.0
  bridgeScore: 'Low' | 'Medium' | 'High' | 'Critical';
  directConnectionsCount: number;
  metadata?: {
    phone?: string;
    accountNo?: string;
    location?: string;
    organization?: string;
    riskCategory?: string;
    crossCaseCount?: number;
  };
}

export interface NetworkRelationship {
  id: string;
  source: string; // entity id
  target: string; // entity id
  type: 'financial_transfer' | 'call_log' | 'associate' | 'ownership' | 'meeting' | 'co_location';
  strength: number; // 1 - 5
  description?: string;
}

export interface NetworkCluster {
  id: string;
  name: string;
  type: 'Financial' | 'Communication' | 'Logistics' | 'Core Network' | 'Operations';
  entityCount: number;
  relationshipCount: number;
  topInfluencerId: string;
  topInfluencerName: string;
  connectivityLevel: 'High' | 'Moderate' | 'Sparse';
}

export interface InfluenceFactorBreakdown {
  directConnectivity: number; // Max 30
  networkCentrality: number;   // Max 25
  bridgePosition: number;      // Max 20
  crossEntityConnections: number; // Max 15
  crossCasePresence: number;   // Max 10
}

export interface CaseNetworkData {
  caseId: string;
  caseName: string;
  totalEntities: number;
  totalRelationships: number;
  totalIndividuals: number;
  highInfluenceCount: number;
  entities: NetworkEntity[];
  relationships: NetworkRelationship[];
  clusters: NetworkCluster[];
}

export type SortOption = 'influence' | 'connections' | 'centrality' | 'bridge';
export type FilterEntityCategory = 'all' | 'person' | 'organization' | 'cross_case';