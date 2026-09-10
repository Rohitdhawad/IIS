import localGraph from '../data/visual_graph.json'

const API_BASE_URL = import.meta.env.VITE_IIS_API_URL || 'http://localhost:8000'

export interface EntityAttributes {
  [key: string]: unknown
}

export interface RawGraphNode {
  entity_id: string
  type: string
  label: string
  attributes: EntityAttributes
}

export interface GraphNode extends RawGraphNode {
  id: string
  degree: number
}

export interface GraphRelationship {
  relationship_id: string
  source: string
  target: string
  type: string
  observed_at: string | null
  evidence: EntityAttributes
  selected_by?: string[]
  confidence?: number
  attributes?: EntityAttributes
  weight: number
}

export interface RawGraph {
  case_id?: string
  nodes: RawGraphNode[]
  relationships: Omit<GraphRelationship, 'weight'>[]
}

export interface InvestigationGraph extends RawGraph {
  nodes: GraphNode[]
  links: GraphRelationship[]
}

export interface CaseInfo {
  id: string
  name: string
  description: string
  num_entities: number
  num_relationships: number
}

export interface CaseSummary {
  id: string
  name: string
  description: string
  created_at: string | null
  num_entities: number
  num_relationships: number
  status?: string
  case_type?: string
  location?: string
}

export interface EntityRelationships {
  outgoing: GraphRelationship[]
  incoming: GraphRelationship[]
}

export interface TimelineEvent {
  event_id: string
  timestamp: string
  type: string
  title: string
  description: string
  entity_ids: string[]
  evidence_source?: string
}

export interface AuditRecord {
  record_id: string
  timestamp: string
  action: string
  actor: string
  details: string
  hash?: string
}

export interface AIInsight {
  insight_id: string
  type: string
  title: string
  description: string
  confidence: number
  entity_ids: string[]
  requires_verification: boolean
}

export interface RelatedCase {
  case_id: string
  name: string
  description: string
  shared_entities: string[]
  relationship_type: string
  confidence: number
}

// ─── Graph normalisation ───────────────────────────────────────────────────

let graphPromise: Promise<InvestigationGraph> | undefined

function normalizeGraph(graph: RawGraph): InvestigationGraph {
  const degree: Record<string, number> = {}
  graph.relationships.forEach((rel) => {
    degree[rel.source] = (degree[rel.source] || 0) + 1
    degree[rel.target] = (degree[rel.target] || 0) + 1
  })
  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({
      ...node,
      id: node.entity_id,
      degree: degree[node.entity_id] || 0,
    })),
    links: graph.relationships.map((rel) => ({
      ...rel,
      weight: rel.confidence || 1,
    })),
  }
}

async function loadGraph(): Promise<InvestigationGraph> {
  try {
    const response = await fetch(`${API_BASE_URL}/graph/visual`)
    if (!response.ok) throw new Error(`Graph request failed: ${response.status}`)
    return normalizeGraph(await response.json() as RawGraph)
  } catch {
    return normalizeGraph(localGraph as RawGraph)
  }
}

export function getVisualGraph(): Promise<InvestigationGraph> {
  if (!graphPromise) graphPromise = loadGraph()
  return graphPromise
}

// ─── Single-graph helpers (kept for backwards compat) ─────────────────────

export async function getCase(): Promise<CaseInfo> {
  const graph = await getVisualGraph()
  const caseEntity = graph.nodes.find((n) => n.type === 'Case')
  return {
    id: graph.case_id || caseEntity?.entity_id || 'IIS',
    name: (caseEntity?.attributes?.name as string) || graph.case_id || 'Investigation Network',
    description: 'Evidence-backed entities and relationships selected from ingested investigation data.',
    num_entities: graph.nodes.length,
    num_relationships: graph.relationships.length,
  }
}

export async function getEntity(entityId: string): Promise<GraphNode | null> {
  const graph = await getVisualGraph()
  return graph.nodes.find((e) => e.entity_id === entityId) || null
}

export async function getEntities(): Promise<GraphNode[]> {
  const graph = await getVisualGraph()
  return graph.nodes
}

export async function getEntityRelationships(entityId: string): Promise<EntityRelationships> {
  const graph = await getVisualGraph()
  const rels = graph.links.filter((r) => r.source === entityId || r.target === entityId)
  return {
    outgoing: rels.filter((r) => r.source === entityId),
    incoming: rels.filter((r) => r.target === entityId),
  }
}

// ─── Multi-case demo data ──────────────────────────────────────────────────

const DEMO_CASES: CaseSummary[] = [
  {
    id: 'IIS-2026-001',
    name: 'Project Nightfall',
    description:
      'Organised financial fraud and suspected smuggling network operating across Pune and Mumbai. Multiple persons of interest identified via CDR, financial transactions, and surveillance data.',
    created_at: '2026-06-10T08:00:00',
    num_entities: 7,
    num_relationships: 24,
    status: 'Active',
    case_type: 'Financial Fraud',
    location: 'Pune, Maharashtra',
  },
  {
    id: 'IIS-2026-002',
    name: 'Operation Redline',
    description:
      'Cross-border narcotics trafficking ring with suspected links to shell companies in Rajasthan. Three primary suspects with overlapping criminal history records.',
    created_at: '2026-07-03T10:30:00',
    num_entities: 12,
    num_relationships: 38,
    status: 'Active',
    case_type: 'Narcotics',
    location: 'Jaipur, Rajasthan',
  },
  {
    id: 'IIS-2026-003',
    name: 'Silverbridge Inquiry',
    description:
      'Cybercrime and identity theft syndicate targeting government portal credentials. Digital evidence trail spans five states.',
    created_at: '2026-08-15T14:00:00',
    num_entities: 9,
    num_relationships: 19,
    status: 'Under Review',
    case_type: 'Cybercrime',
    location: 'Bengaluru, Karnataka',
  },
  {
    id: 'IIS-2026-004',
    name: 'Dusk Protocol',
    description:
      'Suspected extremist financing network. Unusual fund transfers across three accounts flagged by financial intelligence unit for investigation.',
    created_at: '2026-08-28T09:15:00',
    num_entities: 5,
    num_relationships: 11,
    status: 'Pending',
    case_type: 'Financial Intelligence',
    location: 'Hyderabad, Telangana',
  },
]

export async function getCases(): Promise<{ cases: CaseSummary[]; usedFallback: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/cases`)
    if (!response.ok) throw new Error('Failed to fetch cases')
    const cases = await response.json()
    return { cases, usedFallback: false }
  } catch {
    return { cases: DEMO_CASES, usedFallback: true }
  }
}

export async function getCaseById(caseId: string): Promise<CaseSummary | null> {
  const { cases } = await getCases()
  return cases.find((c) => c.id === caseId) || null
}

// ─── Case-specific graph data ──────────────────────────────────────────────
// For the prototype, all cases use the same demo graph (IIS-2026-001).
// Future: fetch /cases/:caseId/graph from backend.

export async function getCaseGraph(_caseId: string): Promise<InvestigationGraph> {
  return getVisualGraph()
}

// ─── Timeline ─────────────────────────────────────────────────────────────

const DEMO_TIMELINE: TimelineEvent[] = [
  {
    event_id: 'EVT-001',
    timestamp: '2026-06-10T08:00:00',
    type: 'case_opened',
    title: 'FIR Registered',
    description: 'First Information Report filed. Case IIS-2026-001 opened for investigation.',
    entity_ids: [],
    evidence_source: '01_FIR_Case_Report.csv',
  },
  {
    event_id: 'EVT-002',
    timestamp: '2026-06-12T10:00:00',
    type: 'person_identified',
    title: 'Primary Suspect Identified',
    description: 'Rohan Mehta identified as primary person of interest following initial CDR analysis.',
    entity_ids: ['person:rohan-mehta'],
    evidence_source: '02_CDR.csv',
  },
  {
    event_id: 'EVT-003',
    timestamp: '2026-06-14T09:12:00',
    type: 'phone_interaction',
    title: 'CDR Activity — Multiple Calls Logged',
    description: 'Multiple calls recorded between Rohan Mehta, Arjun Kale, Sameer Joshi and Neel Shah within a 12-hour window.',
    entity_ids: ['person:rohan-mehta', 'person:arjun-kale', 'person:sameer-joshi', 'person:neel-shah'],
    evidence_source: '02_CDR.csv',
  },
  {
    event_id: 'EVT-004',
    timestamp: '2026-06-14T10:32:00',
    type: 'financial_transaction',
    title: 'High-Value Transfer Flagged',
    description: 'Financial transaction of ₹1,85,000 from Rohan Mehta to Neel Shah recorded. Amount exceeds review threshold of ₹1,61,000.',
    entity_ids: ['person:rohan-mehta', 'person:neel-shah'],
    evidence_source: '03_Financial_Transactions.csv',
  },
  {
    event_id: 'EVT-005',
    timestamp: '2026-06-14T11:35:00',
    type: 'location_visit',
    title: 'Surveillance — Warehouse-W17 (Incident 1)',
    description: 'Rohan Mehta and Arjun Kale observed at Warehouse-W17. Vehicles MH12AB4821 and MH14CD7319 also recorded at the same location via CCTV.',
    entity_ids: ['person:rohan-mehta', 'person:arjun-kale', 'vehicle:mh12ab4821', 'vehicle:mh14cd7319', 'location:warehouse-w17'],
    evidence_source: '05_Surveillance_Report_01.txt',
  },
  {
    event_id: 'EVT-006',
    timestamp: '2026-06-15T08:42:00',
    type: 'phone_interaction',
    title: 'Second Wave of CDR Activity',
    description: 'Additional calls recorded between Neel Shah, Sameer Joshi and Arjun Kale on a second day.',
    entity_ids: ['person:neel-shah', 'person:sameer-joshi', 'person:arjun-kale'],
    evidence_source: '02_CDR.csv',
  },
  {
    event_id: 'EVT-007',
    timestamp: '2026-06-16T10:40:00',
    type: 'location_visit',
    title: 'Surveillance — Warehouse-W17 (Incident 2)',
    description: 'Second confirmed gathering at Warehouse-W17. Rohan Mehta, Arjun Kale and Sameer Joshi all present. Both vehicles again observed via CCTV.',
    entity_ids: ['person:rohan-mehta', 'person:arjun-kale', 'person:sameer-joshi', 'vehicle:mh12ab4821', 'vehicle:mh14cd7319', 'location:warehouse-w17'],
    evidence_source: '06_Surveillance_Report_02.txt',
  },
  {
    event_id: 'EVT-008',
    timestamp: '2026-06-18T09:00:00',
    type: 'investigation_update',
    title: 'Criminal History Records Reviewed',
    description: 'Historical association records reviewed for Arjun Kale, Neel Shah and Sameer Joshi. Prior-case links identified.',
    entity_ids: ['person:arjun-kale', 'person:neel-shah', 'person:sameer-joshi'],
    evidence_source: '07_Criminal_History.csv',
  },
  {
    event_id: 'EVT-009',
    timestamp: '2026-06-20T14:00:00',
    type: 'evidence_uploaded',
    title: 'Evidence Register Compiled',
    description: 'All collected evidence items catalogued and logged into the evidence register.',
    entity_ids: [],
    evidence_source: '08_Evidence_Register.csv',
  },
  {
    event_id: 'EVT-010',
    timestamp: '2026-06-22T11:00:00',
    type: 'investigation_update',
    title: 'Investigation Notes Updated',
    description: 'Lead investigator updated case notes with cross-case observations and next steps.',
    entity_ids: [],
    evidence_source: '09_Investigation_Notes.txt',
  },
]

export async function getCaseTimeline(caseId: string): Promise<TimelineEvent[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/timeline`)
    if (!response.ok) throw new Error('Timeline not available')
    return await response.json()
  } catch {
    return DEMO_TIMELINE
  }
}

// ─── Audit Trail ──────────────────────────────────────────────────────────

const DEMO_AUDIT: AuditRecord[] = [
  {
    record_id: 'AUD-001',
    timestamp: '2026-06-10T08:01:33',
    action: 'CASE_CREATED',
    actor: 'System',
    details: 'Case IIS-2026-001 created and initialised in IIS.',
    hash: 'a3f2e1c7d9b4f82a10e5c3d6b7f9a2e4',
  },
  {
    record_id: 'AUD-002',
    timestamp: '2026-06-10T08:05:00',
    action: 'EVIDENCE_UPLOADED',
    actor: 'Investigator',
    details: 'File 01_FIR_Case_Report.csv uploaded. SHA-256 hash recorded.',
    hash: 'b7c1d4e9f3a5b82e0d6c4f8e2a1b9c3d',
  },
  {
    record_id: 'AUD-003',
    timestamp: '2026-06-10T08:06:12',
    action: 'HASH_VERIFIED',
    actor: 'System',
    details: 'SHA-256 hash for 01_FIR_Case_Report.csv verified. Integrity confirmed.',
    hash: 'b7c1d4e9f3a5b82e0d6c4f8e2a1b9c3d',
  },
  {
    record_id: 'AUD-004',
    timestamp: '2026-06-12T09:15:00',
    action: 'EVIDENCE_UPLOADED',
    actor: 'Investigator',
    details: 'File 02_CDR.csv uploaded. SHA-256 hash recorded.',
    hash: 'c9d2e5f8a1b4c7e0d3f6a9b2c5d8e1f4',
  },
  {
    record_id: 'AUD-005',
    timestamp: '2026-06-12T09:16:44',
    action: 'ENTITY_EXTRACTED',
    actor: 'System',
    details: '4 person entities and 9 CDR relationships extracted from 02_CDR.csv.',
    hash: undefined,
  },
  {
    record_id: 'AUD-006',
    timestamp: '2026-06-13T11:00:00',
    action: 'EVIDENCE_UPLOADED',
    actor: 'Investigator',
    details: 'File 03_Financial_Transactions.csv uploaded. SHA-256 hash recorded.',
    hash: 'd1e4f7a0b3c6d9f2e5a8b1c4d7e0f3a6',
  },
  {
    record_id: 'AUD-007',
    timestamp: '2026-06-14T08:00:00',
    action: 'EVIDENCE_UPLOADED',
    actor: 'Field Analyst',
    details: 'Files 04_Vehicle_Records.csv, 05_Surveillance_Report_01.txt uploaded.',
    hash: 'e3f6a9b2c5d8e1f4a7b0c3d6e9f2a5b8',
  },
  {
    record_id: 'AUD-008',
    timestamp: '2026-06-17T13:45:00',
    action: 'EVIDENCE_UPLOADED',
    actor: 'Field Analyst',
    details: 'File 06_Surveillance_Report_02.txt uploaded. Hash recorded.',
    hash: 'f5a8b1c4d7e0f3a6b9c2d5e8f1a4b7c0',
  },
  {
    record_id: 'AUD-009',
    timestamp: '2026-06-18T08:30:00',
    action: 'EVIDENCE_UPLOADED',
    actor: 'Investigator',
    details: 'File 07_Criminal_History.csv uploaded. Cross-case links flagged.',
    hash: 'a2b5c8d1e4f7a0b3c6d9e2f5a8b1c4d7',
  },
  {
    record_id: 'AUD-010',
    timestamp: '2026-06-20T14:10:00',
    action: 'RECORD_REVIEWED',
    actor: 'Lead Investigator',
    details: 'All evidence records reviewed. No tampering detected. Case status confirmed Active.',
    hash: undefined,
  },
]

export async function getCaseAudit(caseId: string): Promise<AuditRecord[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/audit`)
    if (!response.ok) throw new Error('Audit not available')
    return await response.json()
  } catch {
    return DEMO_AUDIT
  }
}

// ─── AI Insights ──────────────────────────────────────────────────────────

const DEMO_INSIGHTS: AIInsight[] = [
  {
    insight_id: 'INS-001',
    type: 'COMMUNICATION_CLUSTER',
    title: 'Tightly Clustered Communication Group',
    description:
      'Rohan Mehta, Arjun Kale, Neel Shah and Sameer Joshi form a densely connected communication cluster with 9 CDR records across two days. Arjun Kale appears as a potential communication hub, appearing in 7 of 9 CDR relationships.',
    confidence: 0.87,
    entity_ids: ['person:rohan-mehta', 'person:arjun-kale', 'person:neel-shah', 'person:sameer-joshi'],
    requires_verification: true,
  },
  {
    insight_id: 'INS-002',
    type: 'HIGH_VALUE_TRANSFER',
    title: 'Anomalous Financial Transfer Detected',
    description:
      'A transfer of ₹1,85,000 from Rohan Mehta to Neel Shah on 14 June 2026 exceeds the analytical review threshold of ₹1,61,000. The stated purpose is listed as "Consulting". This transfer is potentially significant given the concurrent CDR and surveillance activity on the same date.',
    confidence: 0.92,
    entity_ids: ['person:rohan-mehta', 'person:neel-shah'],
    requires_verification: true,
  },
  {
    insight_id: 'INS-003',
    type: 'REPEATED_CO_LOCATION',
    title: 'Multiple Co-Location Events at Single Address',
    description:
      'Warehouse-W17 has been identified as a repeated co-location point. Three persons of interest and two vehicles were independently observed at this location on two separate dates (14 June and 16 June 2026). The analytical significance of this convergence pattern should be evaluated by the investigating officer.',
    confidence: 0.85,
    entity_ids: ['location:warehouse-w17', 'person:rohan-mehta', 'person:arjun-kale', 'person:sameer-joshi'],
    requires_verification: true,
  },
  {
    insight_id: 'INS-004',
    type: 'CROSS_CASE_LINK',
    title: 'Prior-Case Associations Identified',
    description:
      'Criminal history records indicate that Arjun Kale, Neel Shah and Sameer Joshi have pre-existing associations documented in prior cases. These historical associations may be relevant to the current investigation and warrant cross-case analysis.',
    confidence: 0.78,
    entity_ids: ['person:arjun-kale', 'person:neel-shah', 'person:sameer-joshi'],
    requires_verification: true,
  },
  {
    insight_id: 'INS-005',
    type: 'TEMPORAL_PATTERN',
    title: 'Coordinated Activity on 14 June 2026',
    description:
      'The analytical system identified a concentration of multi-modal activity on 14 June 2026: 4 CDR events, 1 high-value financial transfer and a confirmed group co-location at Warehouse-W17 all occurred within a 3-hour window (09:12 to 11:42). This temporal overlap across independent evidence sources is analytically notable.',
    confidence: 0.83,
    entity_ids: ['person:rohan-mehta', 'person:arjun-kale', 'person:neel-shah', 'vehicle:mh12ab4821'],
    requires_verification: true,
  },
]

export async function getCaseInsights(caseId: string): Promise<AIInsight[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/insights`)
    if (!response.ok) throw new Error('Insights not available')
    return await response.json()
  } catch {
    return DEMO_INSIGHTS
  }
}

// ─── Related Cases ─────────────────────────────────────────────────────────

const DEMO_RELATED: RelatedCase[] = [
  {
    case_id: 'IIS-2026-002',
    name: 'Operation Redline',
    description: 'Cross-border narcotics trafficking ring. Arjun Kale appears in historical association records linked to a suspect in this case.',
    shared_entities: ['person:arjun-kale'],
    relationship_type: 'SHARED_ENTITY',
    confidence: 0.72,
  },
  {
    case_id: 'IIS-2024-017',
    name: 'Case Horizon (Archived)',
    description: 'Prior financial fraud case from 2024. Neel Shah was identified as a person of interest. Historical association records from the current case reference this prior investigation.',
    shared_entities: ['person:neel-shah'],
    relationship_type: 'HISTORICAL_RECORD',
    confidence: 0.68,
  },
  {
    case_id: 'IIS-2025-033',
    name: 'Ashoka Network Inquiry (Archived)',
    description: 'Sameer Joshi was previously linked to an organised network under investigation in 2025. Criminal history records cross-reference this case.',
    shared_entities: ['person:sameer-joshi'],
    relationship_type: 'HISTORICAL_RECORD',
    confidence: 0.61,
  },
]

export async function getRelatedCases(caseId: string): Promise<RelatedCase[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/related`)
    if (!response.ok) throw new Error('Related cases not available')
    return await response.json()
  } catch {
    return DEMO_RELATED
  }
}
