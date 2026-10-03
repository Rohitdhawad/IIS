import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import * as d3 from 'd3'

import type {
  GraphNode,
  GraphRelationship,
} from '../lib/dataClient'

import './NetworkGraph.css'


interface NetworkGraphProps {
  nodes: GraphNode[]
  links: GraphRelationship[]
  height?: number
}


interface LayoutNode extends GraphNode {
  x: number
  y: number
  level: number
  component: number
}


interface LayoutLink extends GraphRelationship {
  sourceNode: LayoutNode
  targetNode: LayoutNode
  important: boolean
}


interface Point {
  x: number
  y: number
}


type ViewMode =
  | 'full'
  | 'focus'


/* =========================================================
   ENTITY COLORS
========================================================= */

const TYPE_COLORS: Record<string, string> = {
  Person: '#4f8cff',
  Organization: '#9b6cff',
  Location: '#35b99a',
  Vehicle: '#f59e42',
  Phone: '#e05d9f',
  Account: '#7c8cf8',
  AccountReference: '#7c8cf8',
  Case: '#64748b',
  Evidence: '#f05d5e',
}


/* =========================================================
   HELPERS
========================================================= */

function getNodeTypeColor(
  type: string,
) {
  return (
    TYPE_COLORS[type] ||
    '#7f8a96'
  )
}


function nodeKey(
  value: string | LayoutNode,
) {
  return typeof value === 'string'
    ? value
    : value.id
}


/* =========================================================
   ADJACENCY
========================================================= */

function buildAdjacency(
  nodes: GraphNode[],
  links: GraphRelationship[],
) {
  const adjacency =
    new Map<
      string,
      Set<string>
    >()

  nodes.forEach((node) => {
    adjacency.set(
      node.id,
      new Set(),
    )
  })

  links.forEach((link) => {
    const source =
      nodeKey(link.source)

    const target =
      nodeKey(link.target)

    if (!adjacency.has(source)) {
      adjacency.set(
        source,
        new Set(),
      )
    }

    if (!adjacency.has(target)) {
      adjacency.set(
        target,
        new Set(),
      )
    }

    adjacency
      .get(source)!
      .add(target)

    adjacency
      .get(target)!
      .add(source)
  })

  return adjacency
}


/* =========================================================
   BFS
========================================================= */

function calculateLevels(
  rootId: string,
  adjacency: Map<
    string,
    Set<string>
  >,
  maxDepth?: number,
) {
  const levels =
    new Map<string, number>()

  const queue: string[] = [
    rootId,
  ]

  levels.set(
    rootId,
    0,
  )

  while (queue.length) {

    const current =
      queue.shift()!

    const currentLevel =
      levels.get(current) || 0

    if (
      maxDepth !== undefined &&
      currentLevel >= maxDepth
    ) {
      continue
    }

    const neighbors =
      adjacency.get(
        current,
      ) ||
      new Set<string>()


    neighbors.forEach(
      (neighbor) => {

        if (
          !levels.has(
            neighbor,
          )
        ) {

          levels.set(
            neighbor,
            currentLevel + 1,
          )

          queue.push(
            neighbor,
          )

        }

      },
    )
  }

  return levels
}


/* =========================================================
   COMPONENTS
========================================================= */

function calculateComponents(
  nodes: GraphNode[],
  adjacency: Map<
    string,
    Set<string>
  >,
) {
  const visited =
    new Set<string>()

  const components:
    string[][] = []


  nodes.forEach((node) => {

    if (
      visited.has(
        node.id,
      )
    ) {
      return
    }


    const component:
      string[] = []

    const queue = [
      node.id,
    ]

    visited.add(
      node.id,
    )


    while (queue.length) {

      const current =
        queue.shift()!

      component.push(
        current,
      )


      const neighbors =
        adjacency.get(
          current,
        ) ||
        new Set<string>()


      neighbors.forEach(
        (neighbor) => {

          if (
            !visited.has(
              neighbor,
            )
          ) {

            visited.add(
              neighbor,
            )

            queue.push(
              neighbor,
            )

          }

        },
      )

    }


    components.push(
      component,
    )

  })


  return components
}


/* =========================================================
   FIND DEFAULT KEY ENTITY
========================================================= */

function findDefaultRoot(
  nodes: GraphNode[],
  links: GraphRelationship[],
) {
  if (!nodes.length) {
    return ''
  }


  const adjacency =
    buildAdjacency(
      nodes,
      links,
    )


  const components =
    calculateComponents(
      nodes,
      adjacency,
    )


  const largestComponent =
    [...components].sort(
      (a, b) =>
        b.length -
        a.length,
    )[0] || []


  const componentSet =
    new Set(
      largestComponent,
    )


  const root =
    nodes
      .filter((node) =>
        componentSet.has(
          node.id,
        ),
      )
      .sort(
        (a, b) => {

          if (
            b.degree !==
            a.degree
          ) {
            return (
              b.degree -
              a.degree
            )
          }

          return a.label.localeCompare(
            b.label,
          )

        },
      )[0] || nodes[0]


  return root.id
}


/* =========================================================
   CREATE LAYOUT
========================================================= */

function createInvestigatorLayout(
  nodes: GraphNode[],
  links: GraphRelationship[],
  width: number,
  height: number,
  rootId: string,
  focusMode: boolean,
  depth: number,
  rotationSeed: number,
) {

  if (!nodes.length) {

    return {
      nodes: [] as LayoutNode[],
      links: [] as LayoutLink[],
    }

  }


  const adjacency =
    buildAdjacency(
      nodes,
      links,
    )


  const components =
    calculateComponents(
      nodes,
      adjacency,
    )


  const actualRootId =
    rootId ||
    findDefaultRoot(
      nodes,
      links,
    )


  /*
   * In Focus Mode:
   *
   * Only nodes within the selected
   * number of hops are displayed.
   */

  const levels =
    calculateLevels(
      actualRootId,
      adjacency,
      focusMode
        ? depth
        : undefined,
    )


  let visibleNodes: GraphNode[]


  if (focusMode) {

    visibleNodes =
      nodes.filter(
        (node) =>
          levels.has(
            node.id,
          ),
      )

  } else {

    visibleNodes =
      [...nodes]

  }


  const visibleIds =
    new Set(
      visibleNodes.map(
        (node) =>
          node.id,
      ),
    )


  const visibleLinks =
    links.filter(
      (link) =>
        visibleIds.has(
          nodeKey(
            link.source,
          ),
        ) &&
        visibleIds.has(
          nodeKey(
            link.target,
          ),
        ),
    )


  const centerX =
    width / 2

  const centerY =
    height / 2


  const usableWidth =
    Math.max(
      width - 160,
      420,
    )


  const usableHeight =
    Math.max(
      height - 130,
      300,
    )


  const maxRadius =
    Math.min(
      usableWidth / 2,
      usableHeight / 2,
    )


  const maxVisibleLevel =
    Math.max(
      ...Array.from(
        levels.values(),
      ),
      1,
    )


  const ringGap =
    Math.max(
      90,
      Math.min(
        145,
        maxRadius /
          Math.max(
            maxVisibleLevel,
            2,
          ),
      ),
    )


  const rotation =
    (rotationSeed % 12) *
    (Math.PI / 6)


  const positioned =
    new Map<
      string,
      LayoutNode
    >()


  /* =======================================================
     ROOT
  ======================================================= */

  const root =
    nodes.find(
      (node) =>
        node.id ===
        actualRootId,
    )


  if (root) {

    positioned.set(
      root.id,
      {
        ...root,
        x: centerX,
        y: centerY,
        level: 0,
        component:
          components.findIndex(
            (component) =>
              component.includes(
                root.id,
              ),
          ),
      },
    )

  }


  /* =======================================================
     RINGS
  ======================================================= */

  const levelsToRender =
    Array.from(
      new Set(
        visibleNodes
          .filter(
            (node) =>
              node.id !==
              actualRootId,
          )
          .map(
            (node) =>
              levels.get(
                node.id,
              ) ?? 1,
          ),
      ),
    ).sort(
      (a, b) =>
        a - b,
    )


  levelsToRender.forEach(
    (level) => {

      const levelNodes =
        visibleNodes
          .filter(
            (node) =>
              node.id !==
                actualRootId &&
              (
                levels.get(
                  node.id,
                ) ?? level
              ) === level,
          )
          .sort(
            (a, b) => {

              if (
                b.degree !==
                a.degree
              ) {
                return (
                  b.degree -
                  a.degree
                )
              }

              return a.label.localeCompare(
                b.label,
              )

            },
          )


      if (!levelNodes.length) {
        return
      }


      const radius =
        Math.min(
          ringGap * level,
          maxRadius,
        )


      const angleStep =
        (Math.PI * 2) /
        Math.max(
          levelNodes.length,
          1,
        )


      levelNodes.forEach(
        (
          node,
          index,
        ) => {

          const angle =
            rotation -
            Math.PI / 2 +
            index *
              angleStep


          positioned.set(
            node.id,
            {
              ...node,

              x:
                centerX +
                Math.cos(
                  angle,
                ) *
                  radius,

              y:
                centerY +
                Math.sin(
                  angle,
                ) *
                  radius,

              level,

              component:
                components.findIndex(
                  (
                    component,
                  ) =>
                    component.includes(
                      node.id,
                    ),
                ),
            },
          )

        },
      )

    },
  )


  /* =======================================================
     FULL NETWORK PERIPHERAL COMPONENTS
  ======================================================= */

  if (!focusMode) {

    const rootComponentIndex =
      components.findIndex(
        (component) =>
          component.includes(
            actualRootId,
          ),
      )


    const disconnected =
      components.filter(
        (_component, index) =>
          index !==
          rootComponentIndex,
      )


    disconnected.forEach(
      (
        component,
        componentIndex,
      ) => {

        const angle =
          rotation +
          componentIndex *
            (
              (Math.PI * 2) /
              Math.max(
                disconnected.length,
                1,
              )
            )


        const radius =
          maxRadius *
          0.9


        const clusterX =
          centerX +
          Math.cos(angle) *
            radius


        const clusterY =
          centerY +
          Math.sin(angle) *
            radius


        const clusterNodes =
          nodes.filter(
            (node) =>
              component.includes(
                node.id,
              ),
          )


        const localRadius =
          Math.min(
            42 +
              clusterNodes.length *
                8,
            85,
          )


        clusterNodes.forEach(
          (
            node,
            index,
          ) => {

            const localAngle =
              rotation +
              index *
                (
                  (Math.PI * 2) /
                  Math.max(
                    clusterNodes.length,
                    1,
                  )
                )


            positioned.set(
              node.id,
              {
                ...node,

                x:
                  clusterX +
                  Math.cos(
                    localAngle,
                  ) *
                    localRadius,

                y:
                  clusterY +
                  Math.sin(
                    localAngle,
                  ) *
                    localRadius,

                level:
                  maxVisibleLevel +
                  1,

                component:
                  componentIndex,
              },
            )

          },
        )

      },
    )

  }


  /* =======================================================
     SAFETY FALLBACK
  ======================================================= */

  visibleNodes.forEach(
    (node) => {

      if (
        !positioned.has(
          node.id,
        )
      ) {

        positioned.set(
          node.id,
          {
            ...node,

            x:
              centerX,

            y:
              centerY,

            level:
              maxVisibleLevel +
              1,

            component: 0,
          },
        )

      }

    },
  )


  const layoutNodes =
    Array.from(
      positioned.values(),
    )


  const layoutLinks =
    visibleLinks.map(
      (link) => {

        const source =
          positioned.get(
            nodeKey(
              link.source,
            ),
          )!

        const target =
          positioned.get(
            nodeKey(
              link.target,
            ),
          )!


        return {
          ...link,

          sourceNode:
            source,

          targetNode:
            target,

          important:
            source.id ===
              actualRootId ||
            target.id ===
              actualRootId ||
            source.level <= 1 ||
            target.level <= 1,
        }

      },
    )


  return {
    nodes:
      layoutNodes,

    links:
      layoutLinks,
  }
}


/* =========================================================
   COMPONENT
========================================================= */

export default function NetworkGraph({
  nodes,
  links,
  height = 420,
}: NetworkGraphProps) {

  const svgRef =
    useRef<SVGSVGElement | null>(
      null,
    )

  const containerRef =
    useRef<HTMLDivElement | null>(
      null,
    )


  const navigate =
    useNavigate()


  const [
    width,
    setWidth,
  ] =
    useState(900)


  const [
    hoveredNode,
    setHoveredNode,
  ] =
    useState<GraphNode | null>(
      null,
    )


  const [
    selectedNodeId,
    setSelectedNodeId,
  ] =
    useState<string | null>(
      null,
    )


  const [
    focusNodeId,
    setFocusNodeId,
  ] =
    useState<string | null>(
      null,
    )


  const [
    viewMode,
    setViewMode,
  ] =
    useState<ViewMode>(
      'full',
    )


  const [
    depth,
    setDepth,
  ] =
    useState<1 | 2 | 3>(
      1,
    )


  const [
    rotationSeed,
    setRotationSeed,
  ] =
    useState(0)


  const [
    isFullscreen,
    setIsFullscreen,
  ] =
    useState(false)


  const [
    fullscreenSize,
    setFullscreenSize,
  ] =
    useState({
      width:
        window.innerWidth,
      height:
        window.innerHeight,
    })


  /* =======================================================
     DEFAULT ROOT
  ======================================================= */

  const defaultRootId =
    useMemo(
      () =>
        findDefaultRoot(
          nodes,
          links,
        ),
      [
        nodes,
        links,
      ],
    )


  /*
   * If the selected/focused entity disappears
   * after a case/filter update, recover safely.
   */

  useEffect(() => {

    if (
      focusNodeId &&
      !nodes.some(
        (node) =>
          node.id ===
          focusNodeId,
      )
    ) {

      setFocusNodeId(
        null,
      )

      setViewMode(
        'full',
      )

    }

  }, [
    nodes,
    focusNodeId,
  ])


  /* =======================================================
     CURRENT FOCUS
  ======================================================= */

  const activeFocusId =
    focusNodeId ||
    defaultRootId


  const activeFocusNode =
    nodes.find(
      (node) =>
        node.id ===
        activeFocusId,
    ) || null


  /* =======================================================
     RESIZE
  ======================================================= */

  useEffect(() => {

    const container =
      containerRef.current

    if (!container) {
      return
    }


    const observer =
      new ResizeObserver(
        (entries) => {

          const entry =
            entries[0]

          if (!entry) {
            return
          }


          setWidth(
            Math.max(
              entry.contentRect.width,
              320,
            ),
          )

        },
      )


    observer.observe(
      container,
    )


    return () => {
      observer.disconnect()
    }

  }, [])


  /* =======================================================
     FULLSCREEN
  ======================================================= */

  useEffect(() => {

    const handler =
      () => {

        const active =
          document.fullscreenElement ===
          containerRef.current


        setIsFullscreen(
          active,
        )


        if (active) {

          setFullscreenSize({
            width:
              window.innerWidth,
            height:
              window.innerHeight,
          })

        }

      }


    document.addEventListener(
      'fullscreenchange',
      handler,
    )


    return () => {

      document.removeEventListener(
        'fullscreenchange',
        handler,
      )

    }

  }, [])


  useEffect(() => {

    if (!isFullscreen) {
      return
    }


    const resize =
      () => {

        setFullscreenSize({
          width:
            window.innerWidth,
          height:
            window.innerHeight,
        })

      }


    window.addEventListener(
      'resize',
      resize,
    )


    resize()


    return () => {

      window.removeEventListener(
        'resize',
        resize,
      )

    }

  }, [
    isFullscreen,
  ])


  const toggleFullscreen =
    async () => {

      try {

        if (
          document.fullscreenElement
        ) {

          await document.exitFullscreen()

          return

        }


        if (
          containerRef.current
        ) {

          await containerRef.current
            .requestFullscreen()

        }

      } catch (error) {

        console.error(
          'Fullscreen error:',
          error,
        )

      }

    }


  /* =======================================================
     ENTER FOCUS
  ======================================================= */

  const enterFocusMode =
    () => {

      const target =
        selectedNodeId ||
        defaultRootId


      if (!target) {
        return
      }


      setFocusNodeId(
        target,
      )

      setViewMode(
        'focus',
      )

      setDepth(
        1,
      )

      setRotationSeed(
        (value) =>
          value + 1,
      )

    }


  /* =======================================================
     EXIT FOCUS
  ======================================================= */

  const exitFocusMode =
    () => {

      setViewMode(
        'full',
      )

      setFocusNodeId(
        null,
      )

      setRotationSeed(
        (value) =>
          value + 1,
      )

    }


  /* =======================================================
     CHANGE DEPTH
  ======================================================= */

  const changeDepth =
    (
      value: 1 | 2 | 3,
    ) => {

      setDepth(
        value,
      )

      setRotationSeed(
        (seed) =>
          seed + 1,
      )

    }


  /* =======================================================
     LAYOUT
  ======================================================= */

  const layout =
    useMemo(
      () =>
        createInvestigatorLayout(
          nodes,
          links,

          isFullscreen
            ? fullscreenSize.width
            : width,

          isFullscreen
            ? fullscreenSize.height
            : height,

          activeFocusId,

          viewMode ===
            'focus',

          depth,

          rotationSeed,
        ),

      [
        nodes,
        links,
        width,
        height,
        activeFocusId,
        viewMode,
        depth,
        rotationSeed,
        isFullscreen,
        fullscreenSize.width,
        fullscreenSize.height,
      ],
    )


  /* =======================================================
     DRAW GRAPH
  ======================================================= */

  useEffect(() => {

    if (
      !svgRef.current ||
      !layout.nodes.length
    ) {
      return
    }


    const graphWidth =
      isFullscreen
        ? fullscreenSize.width
        : width


    const graphHeight =
      isFullscreen
        ? fullscreenSize.height
        : height


    const svg =
      d3.select(
        svgRef.current,
      )


    svg.selectAll('*')
      .remove()


    svg
      .attr(
        'width',
        graphWidth,
      )
      .attr(
        'height',
        graphHeight,
      )
      .attr(
        'viewBox',
        `0 0 ${graphWidth} ${graphHeight}`,
      )


    const graphGroup =
      svg
        .append('g')
        .attr(
          'class',
          'graph-group',
        )


    const zoom =
      d3
        .zoom<
          SVGSVGElement,
          unknown
        >()
        .scaleExtent([
          0.4,
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


    svg.call(
      zoom,
    )


    /* =====================================================
       NODE SIZE
    ===================================================== */

    const maxDegree =
      Math.max(
        ...layout.nodes.map(
          (node) =>
            node.degree,
        ),
        1,
      )


    const radiusScale =
      d3
        .scaleSqrt()
        .domain([
          0,
          maxDegree,
        ])
        .range([
          7,
          23,
        ])


    /* =====================================================
       EDGES
    ===================================================== */

    const edgeGroup =
      graphGroup
        .append('g')
        .attr(
          'class',
          'graph-edges',
        )


    const edgePaths =
      edgeGroup
        .selectAll<
          SVGPathElement,
          LayoutLink
        >('path')
        .data(
          layout.links,
        )
        .join('path')
        .attr(
          'class',
          (link) =>
            link.important
              ? 'graph-edge important'
              : 'graph-edge secondary',
        )
        .attr(
          'stroke-width',
          (link) =>
            link.important
              ? Math.min(
                  2.4,
                  1 +
                    link.weight *
                      0.25,
                )
              : 1,
        )
        .attr(
          'fill',
          'none',
        )


    /* =====================================================
       NODES
    ===================================================== */

    const nodeGroup =
      graphGroup
        .append('g')
        .attr(
          'class',
          'graph-nodes',
        )


    const nodeGroups =
      nodeGroup
        .selectAll<
          SVGGElement,
          LayoutNode
        >('g')
        .data(
          layout.nodes,
        )
        .join('g')
        .attr(
          'class',
          'graph-node-group',
        )
        .attr(
          'transform',
          (node) =>
            `translate(${node.x}, ${node.y})`,
        )
        .style(
          'cursor',
          'pointer',
        )


    /* =====================================================
       NODE CIRCLES
    ===================================================== */

    nodeGroups
      .append('circle')
      .attr(
        'class',
        (node) =>
          node.id ===
          activeFocusId
            ? 'graph-node root'
            : 'graph-node',
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
          getNodeTypeColor(
            node.type,
          ),
      )
      .attr(
        'fill-opacity',
        0.9,
      )


    /* =====================================================
       ROOT HALO
    ===================================================== */

    nodeGroups
      .filter(
        (node) =>
          node.id ===
          activeFocusId,
      )
      .append('circle')
      .attr(
        'class',
        'graph-root-halo',
      )
      .attr(
        'r',
        (node) =>
          radiusScale(
            node.degree,
          ) + 7,
      )


    /* =====================================================
       LABELS
    ===================================================== */

    nodeGroups
      .filter(
        (node) => {

          return (
            node.id ===
              activeFocusId ||
            node.id ===
              selectedNodeId ||
            node.level <= 1 ||
            node.degree >=
              maxDegree * 0.55
          )

        },
      )
      .append('text')
      .attr(
        'class',
        'graph-label',
      )
      .attr(
        'x',
        (node) =>
          radiusScale(
            node.degree,
          ) + 7,
      )
      .attr(
        'y',
        0,
      )
      .attr(
        'dominant-baseline',
        'middle',
      )
      .text(
        (node) =>
          node.label,
      )


    /* =====================================================
       KEY ENTITY LABEL
    ===================================================== */

    nodeGroups
      .filter(
        (node) =>
          node.id ===
          activeFocusId,
      )
      .append('text')
      .attr(
        'class',
        'graph-root-label',
      )
      .attr(
        'x',
        0,
      )
      .attr(
        'y',
        (node) =>
          -(
            radiusScale(
              node.degree,
            ) + 13
          ),
      )
      .attr(
        'text-anchor',
        'middle',
      )
      .text(
        'FOCUS ENTITY',
      )


    /* =====================================================
       EDGE CURVES
    ===================================================== */

    const drawEdges =
      () => {

        edgePaths.attr(
          'd',
          (link) => {

            const source =
              link.sourceNode

            const target =
              link.targetNode


            const sx =
              source.x

            const sy =
              source.y

            const tx =
              target.x

            const ty =
              target.y


            const dx =
              tx - sx

            const dy =
              ty - sy


            const distance =
              Math.sqrt(
                dx * dx +
                  dy * dy,
              )


            if (
              distance < 1
            ) {

              return `
                M ${sx} ${sy}
                L ${tx} ${ty}
              `

            }


            const curve =
              Math.min(
                38,
                Math.max(
                  10,
                  distance *
                    0.1,
                ),
              )


            const nx =
              -dy /
              distance

            const ny =
              dx /
              distance


            const direction =
              (
                source.id.length +
                target.id.length
              ) % 2 === 0
                ? 1
                : -1


            const cx =
              (sx + tx) / 2 +
              nx *
                curve *
                direction

            const cy =
              (sy + ty) / 2 +
              ny *
                curve *
                direction


            return `
              M ${sx} ${sy}
              Q ${cx} ${cy}
                ${tx} ${ty}
            `

          },
        )

      }


    drawEdges()


    /* =====================================================
       HOVER
    ===================================================== */

    nodeGroups
      .on(
        'mouseenter',
        (_event, node) => {

          setHoveredNode(
            node,
          )


          const neighborIds =
            new Set<string>([
              node.id,
            ])


          layout.links.forEach(
            (link) => {

              if (
                link.sourceNode.id ===
                node.id
              ) {

                neighborIds.add(
                  link.targetNode.id,
                )

              }


              if (
                link.targetNode.id ===
                node.id
              ) {

                neighborIds.add(
                  link.sourceNode.id,
                )

              }

            },
          )


          nodeGroups
            .classed(
              'dimmed',
              (candidate) =>
                !neighborIds.has(
                  candidate.id,
                ),
            )


          edgePaths
            .classed(
              'highlighted',
              (link) =>
                link.sourceNode.id ===
                  node.id ||
                link.targetNode.id ===
                  node.id,
            )

        },
      )
      .on(
        'mouseleave',
        () => {

          setHoveredNode(
            null,
          )


          nodeGroups
            .classed(
              'dimmed',
              false,
            )


          edgePaths
            .classed(
              'highlighted',
              false,
            )

        },
      )


    /* =====================================================
       CLICK
    ===================================================== */

    nodeGroups.on(
      'click',
      (
        event,
        node,
      ) => {

        event.stopPropagation()

        setSelectedNodeId(
          node.id,
        )

      },
    )


    /* =====================================================
       DOUBLE CLICK
    ===================================================== */

    nodeGroups.on(
      'dblclick',
      (
        event,
        node,
      ) => {

        event.stopPropagation()


        navigate(
          `../entities/${encodeURIComponent(
            node.id,
          )}`,
        )

      },
    )


    /* =====================================================
       DRAG
    ===================================================== */

    nodeGroups.call(
      d3
        .drag<
          SVGGElement,
          LayoutNode
        >()

        .on(
          'start',
          function () {

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
            node,
          ) {

            node.x =
              event.x

            node.y =
              event.y


            d3
              .select(this)
              .attr(
                'transform',
                `translate(${node.x}, ${node.y})`,
              )


            drawEdges()

          },
        )

        .on(
          'end',
          function () {

            d3
              .select(this)
              .classed(
                'dragging',
                false,
              )

          },
        ),
    )


    /* =====================================================
       EMPTY GRAPH CLICK
    ===================================================== */

    svg.on(
      'click',
      () => {

        setSelectedNodeId(
          null,
        )

      },
    )


    return () => {

      svg
        .selectAll('*')
        .remove()

    }

  }, [
    layout,
    width,
    height,
    isFullscreen,
    fullscreenSize.width,
    fullscreenSize.height,
    activeFocusId,
    selectedNodeId,
    navigate,
  ])


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      ref={containerRef}
      className={
        isFullscreen
          ? 'graph-container graph-fullscreen'
          : 'graph-container'
      }
    >

      <div className="graph-toolbar">

        <div className="graph-network-summary">

          <strong>
            {layout.nodes.length}
          </strong>

          <span>
            visible
          </span>

          <i>•</i>

          <strong>
            {nodes.length}
          </strong>

          <span>
            total
          </span>

        </div>


        {/* ===============================================
            VIEW MODE
        =============================================== */}

        <div className="graph-view-switch">

          <button
            type="button"
            className={
              viewMode === 'full'
                ? 'active'
                : ''
            }
            onClick={
              exitFocusMode
            }
          >
            Full Network
          </button>


          <button
            type="button"
            className={
              viewMode === 'focus'
                ? 'active'
                : ''
            }
            onClick={
              enterFocusMode
            }
          >
            Focus
          </button>

        </div>


        {/* ===============================================
            DEPTH
        =============================================== */}

        {viewMode ===
          'focus' && (

          <div className="graph-depth-control">

            {[1, 2, 3].map(
              (value) => (

                <button
                  key={value}
                  type="button"
                  className={
                    depth === value
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    changeDepth(
                      value as
                        1 | 2 | 3,
                    )
                  }
                >
                  {value}
                </button>

              ),
            )}

          </div>

        )}


        {/* ===============================================
            RE-LAYOUT
        =============================================== */}

        <button
          type="button"
          className="layout-control"
          onClick={() =>
            setRotationSeed(
              (value) =>
                value + 1,
            )
          }
          title="Generate another clean network arrangement"
        >
          ↻ Re-layout
        </button>


        {/* ===============================================
            FULLSCREEN
        =============================================== */}

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


      {/* =================================================
          FOCUS STATUS
      ================================================= */}

      {viewMode ===
        'focus' &&
        activeFocusNode && (

        <div className="graph-focus-banner">

          <div>

            <span>
              INVESTIGATING
            </span>

            <strong>
              {activeFocusNode.label}
            </strong>

          </div>


          <div className="graph-focus-depth">

            <span>
              DEPTH
            </span>

            <strong>
              {depth}
            </strong>

          </div>


          <button
            type="button"
            onClick={
              exitFocusMode
            }
          >
            Clear Focus
          </button>

        </div>

      )}


      {/* =================================================
          GRAPH
      ================================================= */}

      {layout.nodes.length ? (

        <svg
          ref={svgRef}
          width="100%"
          height={height}
          aria-label="Investigation network graph"
        />

      ) : (

        <div className="graph-empty">

          No network data available.

        </div>

      )}


      {/* =================================================
          TOOLTIP
      ================================================= */}

      {hoveredNode && (

        <div className="graph-tooltip">

          <div className="graph-tooltip-type">
            {hoveredNode.type}
          </div>

          <div className="graph-tooltip-name">
            {hoveredNode.label}
          </div>

          <div className="graph-tooltip-row">

            <span>
              Connections
            </span>

            <strong>
              {hoveredNode.degree}
            </strong>

          </div>

          <div className="graph-tooltip-id mono">
            {hoveredNode.id}
          </div>

          <div className="graph-tooltip-action">
            Click to select · Focus to investigate · Double-click to inspect
          </div>

        </div>

      )}


      {/* =================================================
          LEGEND
      ================================================= */}

      <div className="graph-legend">

        <span className="legend-item">
          <i className="dot entity" />
          Entity
        </span>

        <span className="legend-item">
          <i className="dot key" />
          Focus entity
        </span>

        <span className="legend-item">
          <i className="dot connection" />
          Direct connection
        </span>

        <span className="legend-hint">
          Click to select · drag to reposition · double-click to inspect · scroll to zoom
        </span>

      </div>

    </div>
  )
}