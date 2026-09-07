import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useNavigate } from 'react-router-dom'
import type { GraphNode, GraphRelationship } from '../lib/dataClient'
import './NetworkGraph.css'

interface NetworkGraphProps {
  nodes: GraphNode[]
  links: GraphRelationship[]
  height?: number
}

interface SimulationNode extends GraphNode, d3.SimulationNodeDatum {
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

interface SimulationLink extends Omit<GraphRelationship, 'source' | 'target'> {
  source: string | SimulationNode
  target: string | SimulationNode
}

const TYPE_COLORS: Record<string, string> = {
  Person: '#5f8b86',
  Vehicle: '#c99a4d',
  Location: '#8b9b68',
  AccountReference: '#a77b9b',
  Case: '#d9d3c1',
  Evidence: '#b56f55',
  Organization: '#6f8eb5',
}

export default function NetworkGraph({ nodes, links, height = 460 }: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [width, setWidth] = useState(800)

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width)
    })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!nodes.length || !width || !svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const nodeList: SimulationNode[] = nodes.map((node) => ({ ...node }))
    const linkList: SimulationLink[] = links.map((link) => ({ ...link }))

    const maxDegree = d3.max(nodeList, (node) => node.degree) || 1
    const radiusScale = d3.scaleSqrt().domain([0, maxDegree]).range([5, 22])
    const maxWeight = d3.max(linkList, (link) => link.weight) || 1
    const widthScale = d3.scaleLinear().domain([1, maxWeight]).range([0.6, 4])

    const simulation = d3.forceSimulation<SimulationNode>(nodeList)
      .force('link', d3.forceLink<SimulationNode, SimulationLink>(linkList).id((node) => node.id).distance(70).strength(0.35))
      .force('charge', d3.forceManyBody().strength(-160))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<SimulationNode>().radius((node) => radiusScale(node.degree) + 6))

    const graphGroup = svg.append('g')

    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.4, 3])
        .on('zoom', (event) => graphGroup.attr('transform', event.transform))
    )

    const link = graphGroup.append('g')
      .selectAll<SVGLineElement, SimulationLink>('line')
      .data(linkList)
      .join('line')
      .attr('stroke', 'var(--line)')
      .attr('stroke-opacity', 0.55)
      .attr('stroke-width', (link) => widthScale(link.weight))

    const node = graphGroup.append('g')
      .selectAll<SVGCircleElement, SimulationNode>('circle')
      .data(nodeList)
      .join('circle')
      .attr('r', (node) => radiusScale(node.degree))
      .attr('fill', (node) => TYPE_COLORS[node.type] || 'var(--teal)')
      .attr('fill-opacity', 0.85)
      .attr('stroke', 'var(--paper-dim)')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGCircleElement, SimulationNode>()
          .on('start', (event, node) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            node.fx = node.x
            node.fy = node.y
          })
          .on('drag', (event, node) => {
            node.fx = event.x
            node.fy = event.y
          })
          .on('end', (event, node) => {
            if (!event.active) simulation.alphaTarget(0)
            node.fx = null
            node.fy = null
          })
      )
      .on('mouseenter', (_event, node) => setHoveredNode(node))
      .on('mouseleave', () => setHoveredNode(null))
      .on('click', (_event, node) => navigate(`/entities/${node.id}`))

    const label = graphGroup.append('g')
      .selectAll<SVGTextElement, SimulationNode>('text')
      .data(nodeList.filter((node) => node.degree >= maxDegree * 0.4 || node.type === 'Case'))
      .join('text')
      .text((node) => node.label)
      .attr('font-size', 10)
      .attr('font-family', 'var(--font-mono)')
      .attr('fill', 'var(--paper-dim)')
      .attr('dx', (node) => radiusScale(node.degree) + 4)
      .attr('dy', 3)
      .style('pointer-events', 'none')

    simulation.on('tick', () => {
      link
        .attr('x1', (link) => (link.source as SimulationNode).x || 0)
        .attr('y1', (link) => (link.source as SimulationNode).y || 0)
        .attr('x2', (link) => (link.target as SimulationNode).x || 0)
        .attr('y2', (link) => (link.target as SimulationNode).y || 0)
      node.attr('cx', (node) => node.x || 0).attr('cy', (node) => node.y || 0)
      label.attr('x', (node) => node.x || 0).attr('y', (node) => node.y || 0)
    })

    return () => {
      simulation.stop()
    }
  }, [nodes, links, width, height, navigate])

  return (
    <div className="graph-container" ref={containerRef}>
      <svg ref={svgRef} width="100%" height={height} />
      {hoveredNode && (
        <div className="graph-tooltip mono">
          <div className="tt-id">{hoveredNode.label}</div>
          <div className="tt-row">Type: {hoveredNode.type}</div>
          <div className="tt-row">Connections: {hoveredNode.degree}</div>
          <div className="tt-id mono">{hoveredNode.id}</div>
        </div>
      )}
      <div className="graph-legend">
        <span className="legend-item"><i className="dot regular" /> Node color = entity type</span>
        <span className="legend-item"><i className="dot size" /> Node size = connections</span>
        <span className="legend-hint">Scroll to zoom · drag nodes · click to inspect</span>
      </div>
    </div>
  )
}
