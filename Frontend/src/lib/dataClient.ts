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

export interface EntityRelationships {
  outgoing: GraphRelationship[]
  incoming: GraphRelationship[]
}

let graphPromise: Promise<InvestigationGraph> | undefined

function normalizeGraph(graph: RawGraph): InvestigationGraph {
  const degree: Record<string, number> = {}
  graph.relationships.forEach((relationship) => {
    degree[relationship.source] = (degree[relationship.source] || 0) + 1
    degree[relationship.target] = (degree[relationship.target] || 0) + 1
  })

  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({
      ...node,
      id: node.entity_id,
      degree: degree[node.entity_id] || 0,
    })),
    links: graph.relationships.map((relationship) => ({
      ...relationship,
      weight: relationship.confidence || 1,
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

export async function getCase(): Promise<CaseInfo> {
  const graph = await getVisualGraph()
  const caseEntity = graph.nodes.find((node) => node.type === 'Case')
  return {
    id: graph.case_id || caseEntity?.entity_id || 'IIS',
    name: caseEntity?.attributes?.name as string || graph.case_id || 'Investigation Network',
    description: 'Evidence-backed entities and relationships selected from ingested investigation data.',
    num_entities: graph.nodes.length,
    num_relationships: graph.relationships.length,
  }
}

export async function getEntity(entityId: string): Promise<GraphNode | null> {
  const graph = await getVisualGraph()
  return graph.nodes.find((entity) => entity.entity_id === entityId) || null
}

export async function getEntities(): Promise<GraphNode[]> {
  const graph = await getVisualGraph()
  return graph.nodes
}

export async function getEntityRelationships(entityId: string): Promise<EntityRelationships> {
  const graph = await getVisualGraph()
  const relationships = graph.links.filter(
    (relationship) => relationship.source === entityId || relationship.target === entityId
  )
  return {
    outgoing: relationships.filter((relationship) => relationship.source === entityId),
    incoming: relationships.filter((relationship) => relationship.target === entityId),
  }
}
