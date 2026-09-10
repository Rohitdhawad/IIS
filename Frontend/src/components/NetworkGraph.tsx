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

export default function NetworkGraph({
  nodes,
  links,
  height = 460,
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const navigate = useNavigate()

  const [hoveredNode, setHoveredNode] =
    useState<GraphNode | null>(null)

  const [width, setWidth] = useState(800)

  const [isFullscreen, setIsFullscreen] =
    useState(false)

  const [fullscreenSize, setFullscreenSize] =
    useState({
      width: window.innerWidth,
      height: window.innerHeight,
    })

  /* =========================================
     OBSERVE GRAPH WIDTH
  ========================================= */

  useEffect(() => {
    const container = containerRef.current

    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]

      if (!entry) return

      const nextWidth = Math.max(
        Math.round(entry.contentRect.width),
        300,
      )

      setWidth(nextWidth)

      /*
       * When fullscreen, also capture the actual
       * graph height.
       */
      if (
        document.fullscreenElement === container
      ) {
        setFullscreenSize({
          width: window.innerWidth,
          height: window.innerHeight,
        })
      }
    })

    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [])

  /* =========================================
     FULLSCREEN STATE
  ========================================= */

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreen =
        document.fullscreenElement ===
        containerRef.current

      setIsFullscreen(fullscreen)

      if (fullscreen) {
        requestAnimationFrame(() => {
          setFullscreenSize({
            width: window.innerWidth,
            height: window.innerHeight,
          })
        })
      }
    }

    document.addEventListener(
      'fullscreenchange',
      handleFullscreenChange,
    )

    return () => {
      document.removeEventListener(
        'fullscreenchange',
        handleFullscreenChange,
      )
    }
  }, [])

  /* =========================================
     FULLSCREEN WINDOW RESIZE
  ========================================= */

  useEffect(() => {
    if (!isFullscreen) return

    const handleResize = () => {
      setFullscreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener(
      'resize',
      handleResize,
    )

    handleResize()

    return () => {
      window.removeEventListener(
        'resize',
        handleResize,
      )
    }
  }, [isFullscreen])

  /* =========================================
     FULLSCREEN TOGGLE
  ========================================= */

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        return
      }

      if (containerRef.current) {
        await containerRef.current.requestFullscreen()
      }
    } catch (error) {
      console.error(
        'Unable to toggle fullscreen:',
        error,
      )
    }
  }

  /* =========================================
     DRAW GRAPH
  ========================================= */

  useEffect(() => {
    if (
      !nodes.length ||
      !svgRef.current
    ) {
      return
    }

    /*
     * NORMAL:
     * Use Dashboard graph dimensions.
     *
     * FULLSCREEN:
     * Use the actual browser viewport.
     */
    const graphWidth = isFullscreen
      ? fullscreenSize.width
      : width

    const graphHeight = isFullscreen
      ? fullscreenSize.height
      : height

    if (
      graphWidth < 300 ||
      graphHeight < 200
    ) {
      return
    }

    const svg = d3.select(svgRef.current)

    svg.selectAll('*').remove()

    svg
      .attr('width', graphWidth)
      .attr('height', graphHeight)
      .attr(
        'viewBox',
        `0 0 ${graphWidth} ${graphHeight}`,
      )
      .attr(
        'preserveAspectRatio',
        'xMidYMid meet',
      )

    /* =======================================
       COPY GRAPH DATA
    ======================================= */

    const nodeList: SimulationNode[] =
      nodes.map((node) => ({
        ...node,
      }))

    const linkList: SimulationLink[] =
      links.map((link) => ({
        ...link,
      }))

    /* =======================================
       SCALES
    ======================================= */

    const maxDegree =
      d3.max(
        nodeList,
        (node) => node.degree,
      ) || 1

    const radiusScale =
      d3
        .scaleSqrt()
        .domain([0, maxDegree])
        .range([7, 24])

    const maxWeight =
      d3.max(
        linkList,
        (link) => link.weight,
      ) || 1

    const widthScale =
      d3
        .scaleLinear()
        .domain([
          1,
          Math.max(maxWeight, 1),
        ])
        .range([1, 3.5])

    /* =======================================
       GRAPH GROUP
    ======================================= */

    const graphGroup =
      svg
        .append('g')
        .attr(
          'class',
          'graph-group',
        )

    /* =======================================
       ZOOM + PAN
    ======================================= */

    const zoom =
      d3
        .zoom<
          SVGSVGElement,
          unknown
        >()
        .scaleExtent([
          0.35,
          4,
        ])
        .on(
          'zoom',
          (event) => {
            graphGroup.attr(
              'transform',
              event.transform,
            )
          },
        )

    svg.call(zoom)

    /* =======================================
       EDGES
    ======================================= */

    const link =
      graphGroup
        .append('g')
        .attr(
          'class',
          'graph-edges',
        )
        .selectAll<
          SVGLineElement,
          SimulationLink
        >('line')
        .data(linkList)
        .join('line')
        .attr(
          'class',
          'graph-edge',
        )
        .attr(
          'stroke-width',
          (link) =>
            widthScale(
              link.weight,
            ),
        )

    /* =======================================
       NODES
    ======================================= */

    const node =
      graphGroup
        .append('g')
        .attr(
          'class',
          'graph-nodes',
        )
        .selectAll<
          SVGCircleElement,
          SimulationNode
        >('circle')
        .data(nodeList)
        .join('circle')
        .attr(
          'class',
          'graph-node',
        )
        .attr(
          'r',
          (node) =>
            radiusScale(
              node.degree,
            ),
        )
        .attr(
          'fill',
          (node) =>
            TYPE_COLORS[
              node.type
            ] ||
            'var(--teal)',
        )
        .attr(
          'fill-opacity',
          0.88,
        )
        .attr(
          'stroke',
          'var(--paper-dim)',
        )
        .attr(
          'stroke-width',
          1,
        )
        .style(
          'cursor',
          'pointer',
        )

    /* =======================================
       LABELS
    ======================================= */

    const label =
      graphGroup
        .append('g')
        .attr(
          'class',
          'graph-labels',
        )
        .selectAll<
          SVGTextElement,
          SimulationNode
        >('text')
        .data(
          nodeList.filter(
            (node) =>
              node.degree >=
                maxDegree * 0.35 ||
              node.type === 'Case',
          ),
        )
        .join('text')
        .attr(
          'class',
          'graph-label',
        )
        .text(
          (node) =>
            node.label,
        )
        .attr(
          'font-size',
          10,
        )
        .attr(
          'font-family',
          'var(--font-mono)',
        )
        .attr(
          'fill',
          'var(--paper-dim)',
        )
        .style(
          'pointer-events',
          'none',
        )

    /* =======================================
       FORCE SIMULATION
       
       IMPORTANT:
       
       We KEEP the floating D3 behavior.
       
       We are only reducing the "rubber band"
       feeling by increasing velocity decay
       and using a faster alpha decay.
       
       The simulation is NOT manually stopped.
    ======================================= */

    const simulation =
  d3
    .forceSimulation<SimulationNode>(
      nodeList,
    )
    .randomSource(
      d3.randomLcg(0.42),
    )
    .force(
      'link',
      d3
        .forceLink<
          SimulationNode,
          SimulationLink
        >(linkList)
        .id(
          (node) =>
            node.id,
        )
        .distance(
          isFullscreen
            ? 145
            : 85,
        )
        .strength(
          0.18,
        ),
    )
    .force(
      'charge',
      d3
        .forceManyBody<
          SimulationNode
        >()
        .strength(
          isFullscreen
            ? -280
            : -160,
        ),
    )
    .force(
      'center',
      d3.forceCenter(
        graphWidth / 2,
        graphHeight / 2,
      ),
    )
    .force(
      'collision',
      d3
        .forceCollide<
          SimulationNode
        >()
        .radius(
          (node) =>
            radiusScale(
              node.degree,
            ) + 12,
        ),
    )
    .velocityDecay(
      0.88,
    )
    .alphaDecay(
      0.08,
    )
    .alpha(
      1,
    )

    /* =======================================
       UPDATE GRAPH
    ======================================= */

    const updateGraph = () => {
      link
        .attr(
          'x1',
          (link) =>
            (
              link.source as SimulationNode
            ).x || 0,
        )
        .attr(
          'y1',
          (link) =>
            (
              link.source as SimulationNode
            ).y || 0,
        )
        .attr(
          'x2',
          (link) =>
            (
              link.target as SimulationNode
            ).x || 0,
        )
        .attr(
          'y2',
          (link) =>
            (
              link.target as SimulationNode
            ).y || 0,
        )

      node
        .attr(
          'cx',
          (node) =>
            node.x || 0,
        )
        .attr(
          'cy',
          (node) =>
            node.y || 0,
        )

      label
        .attr(
          'x',
          (node) =>
            (node.x || 0) +
            radiusScale(
              node.degree,
            ) +
            7,
        )
        .attr(
          'y',
          (node) =>
            node.y || 0,
        )
    }

    /* =======================================
       SIMULATION
    ======================================= */

    simulation.on(
      'tick',
      updateGraph,
    )

    /*
     * Start the floating animation.
     *
     * D3 will naturally cool down as alpha
     * decreases. We do NOT call stop().
     */
    simulation.restart()

    /* =======================================
       DRAG
    ======================================= */

    node.call(
      d3
        .drag<
          SVGCircleElement,
          SimulationNode
        >()
        .on(
          'start',
          function (
            event,
            draggedNode,
          ) {
            if (!event.active) {
              simulation.alphaTarget(
                0.18,
              ).restart()
            }

            draggedNode.fx =
              draggedNode.x

            draggedNode.fy =
              draggedNode.y

            d3
              .select(this)
              .raise()
              .classed(
                'dragging',
                true,
              )
          },
        )
        .on(
          'drag',
          function (
            event,
            draggedNode,
          ) {
            draggedNode.fx =
              event.x

            draggedNode.fy =
              event.y

            updateGraph()
          },
        )
        .on(
          'end',
          function (
            event,
            draggedNode,
          ) {
            if (!event.active) {
              simulation.alphaTarget(0)
            }

            /*
             * Release the fixed position so the
             * graph remains genuinely interactive.
             */
            draggedNode.fx = null
            draggedNode.fy = null

            d3
              .select(this)
              .classed(
                'dragging',
                false,
              )
          },
        ),
    )

    /* =======================================
       HOVER
    ======================================= */

    node
      .on(
        'mouseenter',
        (_event, node) => {
          setHoveredNode(node)
        },
      )
      .on(
        'mouseleave',
        () => {
          setHoveredNode(null)
        },
      )

    /* =======================================
       CLICK
    ======================================= */

    node.on(
      'click',
      (_event, node) => {
        navigate(
          `/entities/${node.id}`,
        )
      },
    )

    /* =======================================
       CLEANUP
    ======================================= */

    return () => {
      simulation.stop()

      svg.on(
        '.zoom',
        null,
      )
    }
  }, [
    nodes,
    links,
    width,
    height,
    isFullscreen,
    fullscreenSize.width,
    fullscreenSize.height,
    navigate,
  ])

  /* =========================================
     RENDER
  ========================================= */

  return (
    <div
      ref={containerRef}
      className={
        isFullscreen
          ? 'graph-container graph-fullscreen'
          : 'graph-container'
      }
    >

      {/* =====================================
          TOOLBAR
      ===================================== */}

      <div className="graph-toolbar">

        <button
          type="button"
          className="fullscreen-control"
          onClick={
            toggleFullscreen
          }
        >
          {isFullscreen
            ? '⛶ Exit fullscreen'
            : '⛶ Fullscreen'}
        </button>

      </div>


      {/* =====================================
          GRAPH
      ===================================== */}

      <svg
        ref={svgRef}
        width="100%"
        height={height}
        aria-label="Investigation network graph"
      />


      {/* =====================================
          TOOLTIP
      ===================================== */}

      {hoveredNode && (
        <div className="graph-tooltip mono">

          <div className="tt-id">
            {hoveredNode.label}
          </div>

          <div className="tt-row">
            Type: {hoveredNode.type}
          </div>

          <div className="tt-row">
            Connections:{' '}
            {hoveredNode.degree}
          </div>

          <div className="tt-id mono">
            {hoveredNode.id}
          </div>

        </div>
      )}


      {/* =====================================
          LEGEND
      ===================================== */}

      <div className="graph-legend">

        <span className="legend-item">
          <i className="dot regular" />
          Node color = entity type
        </span>

        <span className="legend-item">
          <i className="dot size" />
          Node size = connections
        </span>

        <span className="legend-hint">
          Scroll to zoom · drag nodes · click to inspect
        </span>

      </div>

    </div>
  )
}