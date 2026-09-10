import type {
  GraphNode,
  GraphRelationship,
  InvestigationGraph,
} from './dataClient'

export interface GraphVersion {
  id: string
  label: string
  date: string
  time: string
  trigger: string
  source: string
  description: string
}

export interface GraphVersionSnapshot extends GraphVersion {
  graph: InvestigationGraph
}

export const GRAPH_VERSION_INFO: GraphVersion[] = [
  {
    id: '1',
    label: 'GRAPH V1',
    date: '08 Mar 2026',
    time: '09:35',
    trigger: 'Initial network',
    source: 'Financial Transaction',
    description:
      'Initial network constructed from the first analyzed evidence.',
  },
  {
    id: '2',
    label: 'GRAPH V2',
    date: '10 Mar 2026',
    time: '11:18',
    trigger: 'Surveillance evidence',
    source: 'Surveillance Report',
    description:
      'Network expanded after surveillance evidence was analyzed.',
  },
  {
    id: '3',
    label: 'GRAPH V3',
    date: '14 Mar 2026',
    time: '16:42',
    trigger: 'Investigator review',
    source: 'Manual graph update',
    description:
      'Current analytical state after investigator review.',
  },
]

function buildSnapshot(
  graph: InvestigationGraph,
  version: number,
): InvestigationGraph {
  const allLinks: GraphRelationship[] = graph.links

  let selectedLinks: GraphRelationship[]

  if (version === 1) {
    selectedLinks = allLinks.slice(
      0,
      Math.max(1, Math.ceil(allLinks.length * 0.55)),
    )
  } else if (version === 2) {
    selectedLinks = allLinks.slice(
      0,
      Math.max(1, Math.ceil(allLinks.length * 0.8)),
    )
  } else {
    selectedLinks = allLinks
  }

  const visibleIds = new Set<string>()

  selectedLinks.forEach((link) => {
    visibleIds.add(link.source)
    visibleIds.add(link.target)
  })

  graph.nodes
    .filter((node) => node.type === 'Case')
    .forEach((node) => {
      visibleIds.add(node.id)
    })

  const selectedNodes: GraphNode[] = graph.nodes.filter((node) =>
    visibleIds.has(node.id),
  )

  return {
    ...graph,
    nodes: selectedNodes,
    links: selectedLinks,
    relationships: selectedLinks,
  }
}

/*
 * Build all available graph snapshots.
 *
 * This is currently frontend prototype data.
 * Later this will be replaced by real backend graph versions.
 */
export function buildGraphVersions(
  graph: InvestigationGraph,
): GraphVersionSnapshot[] {
  return GRAPH_VERSION_INFO.map((info) => ({
    ...info,
    graph: buildSnapshot(graph, Number(info.id)),
  }))
}