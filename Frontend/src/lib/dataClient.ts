const API_BASE_URL =
  import.meta.env.VITE_IIS_API_URL || 'http://localhost:8000'

export interface EntityAttributes {
  [key: string]: unknown
}

export interface RawGraphNode {
  id: string
  type: string
  label: string
  attributes?: EntityAttributes
  case_id?: string
}

export interface GraphNode {
  id: string
  entity_id: string
  type: string
  label: string
  attributes: EntityAttributes
  case_id?: string
  degree: number
}

export interface RawGraphRelationship {
  id: string
  source: string
  target: string
  type: string
  weight?: number
  observed_at?: string | null
  confidence?: number
  attributes?: EntityAttributes
}

export interface GraphRelationship {
  relationship_id: string
  source: string
  target: string
  type: string
  observed_at: string | null
  evidence?: EntityAttributes
  selected_by?: string[]
  confidence?: number
  attributes?: EntityAttributes
  weight: number
}

export interface RawGraph {
  case_id?: string
  nodes: RawGraphNode[]
  relationships: RawGraphRelationship[]
}

export interface InvestigationGraph {
  case_id?: string
  nodes: GraphNode[]
  links: GraphRelationship[]
  relationships: GraphRelationship[]
}

export interface CaseInfo {
  id: string
  name: string
  description: string
  created_at?: string
  num_entities: number
  num_relationships: number
  num_evidence: number
}

export interface EntityRelationships {
  outgoing: GraphRelationship[]
  incoming: GraphRelationship[]
}

export interface GraphVersion {
  id: number
  case_id: string
  version_number: number

  trigger_evidence_id: number | null
  trigger_filename: string | null
  trigger_source_type: string | null

  summary: string | null

  entity_count: number
  relationship_count: number

  entities_added: EntityVersionChange[]
  entities_removed: EntityVersionChange[]
  entities_changed: EntityVersionChanged[]

  relationships_added: RelationshipVersionChange[]
  relationships_removed: RelationshipVersionChange[]
  relationships_changed: RelationshipVersionChanged[]

  snapshot: RawGraph

  created_at: string
}

export interface EntityVersionChange {
  id?: string
  entity_id?: string
  type: string
  label: string
  attributes?: EntityAttributes
  case_id?: string
}

export interface EntityVersionChanged {
  id: string
  before: EntityVersionChange
  after: EntityVersionChange
}

export interface RelationshipVersionChange {
  id?: string
  relationship_id?: string
  source: string
  target: string
  type: string
  weight?: number
  confidence?: number
  observed_at?: string | null
  attributes?: EntityAttributes
  case_id?: string
}

export interface RelationshipVersionChanged {
  id: string
  before: RelationshipVersionChange
  after: RelationshipVersionChange
}


// ============================================================
// GRAPH NORMALIZATION
// ============================================================

function normalizeGraph(
  graph: RawGraph,
): InvestigationGraph {
  const degreeMap = new Map<string, number>()

  for (const node of graph.nodes) {
    degreeMap.set(node.id, 0)
  }

  for (const relationship of graph.relationships) {
    degreeMap.set(
      relationship.source,
      (degreeMap.get(relationship.source) || 0) + 1,
    )

    degreeMap.set(
      relationship.target,
      (degreeMap.get(relationship.target) || 0) + 1,
    )
  }

  const nodes: GraphNode[] = graph.nodes.map((node) => ({
    id: node.id,
    entity_id: node.id,
    type: node.type,
    label: node.label,
    attributes: node.attributes || {},
    case_id: node.case_id || graph.case_id,
    degree: degreeMap.get(node.id) || 0,
  }))

  const relationships: GraphRelationship[] =
    graph.relationships.map((relationship) => ({
      relationship_id: relationship.id,
      source: relationship.source,
      target: relationship.target,
      type: relationship.type,
      observed_at: relationship.observed_at ?? null,
      confidence: relationship.confidence,
      attributes: relationship.attributes || {},
      weight: relationship.weight ?? 1,
    }))

  return {
    case_id: graph.case_id,
    nodes,
    links: relationships,
    relationships,
  }
}


// ============================================================
// API HELPER
// ============================================================

async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    },
  )

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`

    try {
      const body = await response.json()

      if (body?.detail) {
        message = body.detail
      }
    } catch {
      // Keep default error message.
    }

    throw new Error(message)
  }

  return response.json()
}


// ============================================================
// CASES
// ============================================================

export async function getCases(): Promise<CaseInfo[]> {
  return apiRequest<CaseInfo[]>('/cases')
}

export async function getCase(
  caseId: string,
): Promise<CaseInfo> {
  return apiRequest<CaseInfo>(
    `/cases/${encodeURIComponent(caseId)}`,
  )
}


// ============================================================
// LIVE GRAPH
// ============================================================

export async function getCaseGraph(
  caseId: string,
): Promise<InvestigationGraph> {
  const graph = await apiRequest<RawGraph>(
    `/entities/case/${encodeURIComponent(caseId)}/graph`,
  )

  return normalizeGraph(graph)
}

export async function getFocusedGraph(
  caseId: string,
  entityId: string,
  depth = 1,
): Promise<InvestigationGraph> {
  const params = new URLSearchParams({
    entity_id: entityId,
    depth: String(depth),
  })

  const graph = await apiRequest<RawGraph>(
    `/entities/case/${encodeURIComponent(caseId)}/graph?${params.toString()}`,
  )

  return normalizeGraph(graph)
}

export async function getVisualGraph(
  caseId: string,
): Promise<InvestigationGraph> {
  return getCaseGraph(caseId)
}


// ============================================================
// GRAPH VERSIONS
// ============================================================

export async function getGraphVersions(
  caseId: string,
): Promise<GraphVersion[]> {
  return apiRequest<GraphVersion[]>(
    `/graph-versions/case/${encodeURIComponent(caseId)}`,
  )
}

export async function getGraphVersion(
  caseId: string,
  versionNumber: number,
): Promise<GraphVersion> {
  return apiRequest<GraphVersion>(
    `/graph-versions/case/${encodeURIComponent(caseId)}/${versionNumber}`,
  )
}

export function graphVersionToInvestigationGraph(
  version: GraphVersion,
): InvestigationGraph {
  return normalizeGraph(version.snapshot)
}


// ============================================================
// ENTITIES
// ============================================================

export async function getEntity(
  entityId: string,
  caseId: string,
): Promise<GraphNode | null> {
  const graph = await getCaseGraph(caseId)

  return (
    graph.nodes.find(
      (node) =>
        node.entity_id === entityId ||
        node.id === entityId,
    ) || null
  )
}

export async function getEntities(
  caseId: string,
): Promise<GraphNode[]> {
  const graph = await getCaseGraph(caseId)

  return graph.nodes
}

export async function getEntityRelationships(
  entityId: string,
  caseId: string,
): Promise<EntityRelationships> {
  const graph = await getCaseGraph(caseId)

  return {
    outgoing: graph.relationships.filter(
      (relationship) =>
        relationship.source === entityId,
    ),

    incoming: graph.relationships.filter(
      (relationship) =>
        relationship.target === entityId,
    ),
  }
}