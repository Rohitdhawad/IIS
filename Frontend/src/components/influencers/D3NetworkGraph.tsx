import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { NetworkEntity, NetworkRelationship } from '../../types/influencer';

interface D3NetworkGraphProps {
  entities: NetworkEntity[];
  relationships: NetworkRelationship[];
  selectedEntityId: string | null;
  onSelectEntity: (entityId: string) => void;
  onResetView?: () => void;
}

interface D3Node extends d3.SimulationNodeDatum, NetworkEntity {}
interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  id: string;
  type: string;
  strength: number;
}

export const D3NetworkGraph: React.FC<D3NetworkGraphProps> = ({
  entities,
  relationships,
  selectedEntityId,
  onSelectEntity,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || entities.length === 0) return;

    const width = svgRef.current.clientWidth || 700;
    const height = 520;

    // Clear previous SVG contents
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Map Nodes and Links for D3 Simulation
    const nodes: D3Node[] = entities.map(e => ({ ...e }));
    const links: D3Link[] = relationships.map(r => ({
      id: r.id,
      source: r.source,
      target: r.target,
      type: r.type,
      strength: r.strength
    }));

    // Main Container Group for Zoom/Pan
    const container = svg.append('g').attr('class', 'graph-container');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Force Simulation Setup
    const simulation = d3.forceSimulation<D3Node>(nodes)
      .force('link', d3.forceLink<D3Node, D3Link>(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-380))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<D3Node>().radius(d => Math.max(16, d.influenceScore / 3) + 10));

    // Draw Edges / Links
    const link = container.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#334155')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.max(1.2, d.strength * 0.8));

    // Draw Nodes Group
    const node = container.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .on('click', (_, d) => onSelectEntity(d.id));

    // Helper: Node Radius calculation based on Influence Score
    const getNodeRadius = (score: number) => Math.max(12, Math.min(28, score / 3.8));

    // Node Circles
    node.append('circle')
      .attr('r', d => getNodeRadius(d.influenceScore))
      .attr('fill', d => {
        if (d.type === 'person') return '#0284c7'; // Investigation Blue
        if (d.type === 'organization') return '#7c3aed'; // Purple
        if (d.type === 'financial_account') return '#16a34a'; // Emerald
        if (d.type === 'phone') return '#ea580c'; // Amber
        return '#64748b'; // Slate neutral
      })
      .attr('stroke', d => (d.id === selectedEntityId ? '#38bdf8' : '#0f172a'))
      .attr('stroke-width', d => (d.id === selectedEntityId ? 3.5 : 1.5))
      .attr('filter', d => (d.id === selectedEntityId ? 'drop-shadow(0 0 6px #0284c7)' : 'none'));

    // Node Labels
    node.append('text')
      .text(d => d.name)
      .attr('x', d => getNodeRadius(d.influenceScore) + 6)
      .attr('y', 4)
      .attr('fill', d => (d.id === selectedEntityId ? '#f8fafc' : '#94a3b8'))
      .attr('font-size', '11px')
      .attr('font-family', 'monospace')
      .attr('font-weight', d => (d.id === selectedEntityId ? 'bold' : 'normal'));

    // Drag behavior
    const drag = d3.drag<SVGGElement, D3Node>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(drag as any);

    // Simulation Tick Update
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as D3Node).x || 0)
        .attr('y1', d => (d.source as D3Node).y || 0)
        .attr('x2', d => (d.target as D3Node).x || 0)
        .attr('y2', d => (d.target as D3Node).y || 0);

      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [entities, relationships, selectedEntityId, onSelectEntity]);

  return (
    <div className="network-graph-card">
      <div className="graph-toolbar">
        <div className="graph-legend">
          <span className="legend-item"><span className="dot person"></span> Person</span>
          <span className="legend-item"><span className="dot org"></span> Organization</span>
          <span className="legend-item"><span className="dot finance"></span> Financial</span>
          <span className="legend-item"><span className="dot phone"></span> Phone</span>
        </div>
        <div className="graph-hint mono">
          Node Size = Influence Score · Line Weight = Relationship Strength
        </div>
      </div>

      <svg ref={svgRef} className="d3-network-svg" width="100%" height="520" />
    </div>
  );
};