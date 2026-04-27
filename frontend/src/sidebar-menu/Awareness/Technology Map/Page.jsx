import { useEffect, useMemo, useRef, useState } from 'react'
import technologyMapData from '../../../data/technology-map.json'

const D3_SCRIPT_SELECTOR = 'script[data-interviewx-d3="true"]'

function collectDescendants(nodeId, childrenByParent, output) {
  const children = childrenByParent.get(nodeId) || []
  children.forEach((childId) => {
    if (!output.has(childId)) {
      output.add(childId)
      collectDescendants(childId, childrenByParent, output)
    }
  })
}

function getNodeDimensions(node) {
  const baseHeight = node.level === 1 ? 32 : 28
  const charWidth = node.level === 1 ? 7.1 : 6.5
  const width = Math.max(58, node.id.length * charWidth + 14)
  return {
    width,
    height: baseHeight,
    cornerRadius: baseHeight / 2
  }
}

export default function AwarenessTechnologyMapPage() {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const zoomStateRef = useRef({ x: 0, y: 0, k: 1 })
  const nodePositionsRef = useRef(new Map())
  const [isD3Ready, setIsD3Ready] = useState(Boolean(window.d3))

  const { nodeMap, childrenByParent, rootNodes, rootNodeLinks } = useMemo(() => {
    const nodes = technologyMapData.nodes || []
    const nextNodeMap = new Map(nodes.map((node) => [node.id, node]))
    const nextChildrenByParent = new Map()

    nodes.forEach((node) => {
      if (!node.parent) return
      const currentChildren = nextChildrenByParent.get(node.parent) || []
      currentChildren.push(node.id)
      nextChildrenByParent.set(node.parent, currentChildren)
    })

    const nextRootNodes = nodes.filter((node) => Number(node.level) === 1)
    const nextRootNodeLinks = []

    for (let index = 0; index < nextRootNodes.length; index += 1) {
      for (let offset = index + 1; offset < nextRootNodes.length; offset += 1) {
        nextRootNodeLinks.push({ source: nextRootNodes[index].id, target: nextRootNodes[offset].id, relation: 'root-interlink' })
      }
    }

    return {
      nodeMap: nextNodeMap,
      childrenByParent: nextChildrenByParent,
      rootNodes: nextRootNodes,
      rootNodeLinks: nextRootNodeLinks
    }
  }, [])

  const [expandedNodes, setExpandedNodes] = useState(() => new Set())

  const visibleNodeIds = useMemo(() => {
    const visible = new Set(rootNodes.map((node) => node.id))

    expandedNodes.forEach((nodeId) => {
      const children = childrenByParent.get(nodeId) || []
      children.forEach((childId) => visible.add(childId))
    })

    return visible
  }, [expandedNodes, childrenByParent, rootNodes])

  const visibleNodes = useMemo(
    () => [...visibleNodeIds].map((nodeId) => nodeMap.get(nodeId)).filter(Boolean),
    [visibleNodeIds, nodeMap]
  )

  const visibleLinks = useMemo(() => {
    const hierarchicalLinks = visibleNodes
      .filter((node) => node.parent && visibleNodeIds.has(node.parent))
      .map((node) => ({ source: node.parent, target: node.id, relation: 'hierarchy' }))

    const visibleRootLinks = rootNodeLinks
      .filter((link) => visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target))
      .map((link) => ({ ...link }))

    return [...hierarchicalLinks, ...visibleRootLinks]
  }, [visibleNodes, visibleNodeIds, rootNodeLinks])

  function handleNodeToggle(nodeId) {
    const directChildren = childrenByParent.get(nodeId) || []
    if (!directChildren.length) return

    setExpandedNodes((current) => {
      const next = new Set(current)
      const isExpanded = next.has(nodeId)

      if (!isExpanded) {
        next.add(nodeId)
        return next
      }

      next.delete(nodeId)
      const descendants = new Set()
      collectDescendants(nodeId, childrenByParent, descendants)
      descendants.forEach((descendantId) => next.delete(descendantId))
      return next
    })
  }

  useEffect(() => {
    if (window.d3) {
      setIsD3Ready(true)
      return undefined
    }

    const existingScript = document.querySelector(D3_SCRIPT_SELECTOR)

    if (existingScript) {
      const handleLoad = () => setIsD3Ready(true)
      existingScript.addEventListener('load', handleLoad)
      return () => existingScript.removeEventListener('load', handleLoad)
    }

    const script = document.createElement('script')
    script.src = 'https://d3js.org/d3.v7.min.js'
    script.async = true
    script.dataset.interviewxD3 = 'true'
    script.onload = () => setIsD3Ready(true)
    document.head.appendChild(script)

    return undefined
  }, [])

  useEffect(() => {
    if (!isD3Ready || !window.d3 || !containerRef.current || !svgRef.current) return undefined

    const d3 = window.d3
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const bounds = containerRef.current.getBoundingClientRect()
    const width = Math.max(720, bounds.width)
    const height = Math.max(520, bounds.height)

    svg.attr('width', width).attr('height', height)

    const links = visibleLinks.map((link) => ({ ...link }))
    const nodes = visibleNodes.map((node) => {
      const dimensions = getNodeDimensions(node)
      const previousPosition = nodePositionsRef.current.get(node.id)
      const parentPosition = node.parent ? nodePositionsRef.current.get(node.parent) : null

      const seededPosition = previousPosition
        ? { x: previousPosition.x, y: previousPosition.y, vx: previousPosition.vx || 0, vy: previousPosition.vy || 0 }
        : parentPosition
          ? {
              x: parentPosition.x + (Math.random() - 0.5) * 36,
              y: parentPosition.y + (Math.random() - 0.5) * 36,
              vx: 0,
              vy: 0
            }
          : {}

      return {
        ...node,
        ...dimensions,
        ...seededPosition,
        isExpandable: (childrenByParent.get(node.id) || []).length > 0,
        isExpanded: expandedNodes.has(node.id)
      }
    })

    const zoomLayer = svg.append('g').attr('class', 'tech-map-zoom-layer')
    const linkLayer = zoomLayer.append('g').attr('class', 'tech-map-links')
    const nodeLayer = zoomLayer.append('g').attr('class', 'tech-map-nodes')

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance((d) => (d.relation === 'root-interlink' ? 220 : 130)).strength((d) => (d.relation === 'root-interlink' ? 0.08 : 0.3)))
      .force('charge', d3.forceManyBody().strength(-680))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d) => Math.max(34, d.width * 0.55)))

    const zoomBehavior = d3.zoom()
      .scaleExtent([0.45, 2.6])
      .on('zoom', (event) => {
        zoomLayer.attr('transform', event.transform)
        zoomStateRef.current = { x: event.transform.x, y: event.transform.y, k: event.transform.k }
      })

    svg.call(zoomBehavior)

    const savedZoom = zoomStateRef.current
    const initialTransform = d3.zoomIdentity.translate(savedZoom.x, savedZoom.y).scale(savedZoom.k)
    svg.call(zoomBehavior.transform, initialTransform)

    const link = linkLayer
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke-width', (d) => (d.relation === 'root-interlink' ? 1.1 : 1.5))
      .attr('stroke-dasharray', (d) => (d.relation === 'root-interlink' ? '4 4' : 'none'))

    function centerNode(event, nodeData) {
      const scale = 1.05
      const nextX = width / 2 - nodeData.x * scale
      const nextY = height / 2 - nodeData.y * scale
      svg.transition().duration(420).call(zoomBehavior.transform, d3.zoomIdentity.translate(nextX, nextY).scale(scale))
      event.stopPropagation()
    }

    const node = nodeLayer
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'tech-map-node')
      .style('cursor', (d) => (d.isExpandable ? 'pointer' : 'default'))
      .on('click', (_, d) => {
        handleNodeToggle(d.id)
      })
      .on('dblclick', centerNode)
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0)

          const clampedX = Math.max(d.width / 2 + 8, Math.min(width - d.width / 2 - 8, d.x))
          const clampedY = Math.max(d.height / 2 + 8, Math.min(height - d.height / 2 - 8, d.y))

          d.fx = clampedX
          d.fy = clampedY

          window.setTimeout(() => {
            d.fx = null
            d.fy = null
          }, 140)
        }))

    node.append('rect')
      .attr('x', (d) => -d.width / 2)
      .attr('y', (d) => -d.height / 2)
      .attr('width', (d) => d.width)
      .attr('height', (d) => d.height)
      .attr('rx', (d) => d.cornerRadius)
      .attr('ry', (d) => d.cornerRadius)
      .attr('fill', (d) => {
        if (d.level === 1) return '#4f7bff'
        if (d.level === 2) return '#2e9ad0'
        if (d.level === 3) return '#25b99f'
        return '#46be6a'
      })
      .attr('stroke', (d) => (d.isExpanded ? '#f7ff9b' : '#dce7ff'))
      .attr('stroke-width', (d) => (d.isExpanded ? 2.4 : 1.2))

    node.append('text')
      .text((d) => d.id)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.34em')
      .attr('class', 'tech-map-node-label')

    const livelinessInterval = d3.interval(() => {
      nodes.forEach((nodeItem) => {
        if (nodeItem.fx != null || nodeItem.fy != null) return
        nodeItem.vx += (Math.random() - 0.5) * 0.08
        nodeItem.vy += (Math.random() - 0.5) * 0.08
      })
      simulation.alphaTarget(0.045).restart()
      window.setTimeout(() => simulation.alphaTarget(0), 220)
    }, 1400)

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y)

      node.attr('transform', (d) => `translate(${d.x},${d.y})`)

      nodes.forEach((nodeItem) => {
        nodePositionsRef.current.set(nodeItem.id, {
          x: nodeItem.x,
          y: nodeItem.y,
          vx: nodeItem.vx,
          vy: nodeItem.vy
        })
      })
    })

    return () => {
      livelinessInterval.stop()
      simulation.stop()
    }
  }, [isD3Ready, visibleNodes, visibleLinks, expandedNodes, childrenByParent])

  return (
    <section className="tech-map-wrapper">
      <div className="tech-map-canvas-shell" ref={containerRef}>
        <svg ref={svgRef} role="img" aria-label="Technology map visualization" />

        <aside className="tech-map-tips" aria-label="Tips">
          <h3>Tips</h3>
          <ol>
            <li>Pinch-zoom or scroll to zoom</li>
            <li>Drag labels or nodes to adjust</li>
            <li>Drag map to explore</li>
            <li>Double-click a node to center</li>
            <li>The map is interconnected — explore freely</li>
          </ol>
        </aside>
      </div>
    </section>
  )
}
