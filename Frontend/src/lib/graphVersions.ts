import type {
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

export interface GraphVersionSnapshot
  extends GraphVersion {
  graph: InvestigationGraph
}


/*
 * The real IIS backend currently provides the
 * current investigation network.
 *
 * Historical graph versioning will be connected
 * to backend investigation snapshots later.
 *
 * For now, we expose the current backend graph
 * as a single live version instead of creating
 * fake V1/V2/V3 snapshots.
 */
export function buildGraphVersions(
  graph: InvestigationGraph,
): GraphVersionSnapshot[] {
  return [
    {
      id: 'current',

      label: 'CURRENT NETWORK',

      date: new Date().toLocaleDateString(
        'en-GB',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        },
      ),

      time: new Date().toLocaleTimeString(
        'en-GB',
        {
          hour: '2-digit',
          minute: '2-digit',
        },
      ),

      trigger:
        'Current investigation data',

      source:
        'IIS evidence analysis',

      description:
        'Current evidence-backed investigation network retrieved from the IIS backend.',

      graph,
    },
  ]
}