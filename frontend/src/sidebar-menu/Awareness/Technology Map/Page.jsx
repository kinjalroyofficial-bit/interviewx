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


function getNodeRadius(level) {
  if (level === 1) return 24
  if (level === 2) return 20
  if (level === 3) return 17
  return 14
}
export default function AwarenessTechnologyMapPage() {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const [isD3Ready, setIsD3Ready] = useState(Boolean(window.d3))

  const { nodeMap, childrenByParent, rootNodes } = useMemo(() => {
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

    return {
      nodeMap: nextNodeMap,
      childrenByParent: nextChildrenByParent,
      rootNodes: nextRootNodes
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

  const visibleLinks = useMemo(
    () => visibleNodes
      .filter((node) => node.parent && visibleNodeIds.has(node.parent))
      .map((node) => ({ source: node.parent, target: node.id })),
    [visibleNodes, visibleNodeIds]
  )

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
    const nodes = visibleNodes.map((node) => ({
      ...node,
      isExpandable: (childrenByParent.get(node.id) || []).length > 0,
      isExpanded: expandedNodes.has(node.id)
    }))

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance(110).strength(0.32))
      .force('charge', d3.forceManyBody().strength(-580))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d) => getNodeRadius(d.level) + 8))

    const link = svg.append('g')
      .attr('class', 'tech-map-links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke-width', 1.3)

    const node = svg.append('g')
      .attr('class', 'tech-map-nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'tech-map-node')
      .style('cursor', (d) => (d.isExpandable ? 'pointer' : 'default'))
      .on('click', (_, d) => {
        handleNodeToggle(d.id)
      })
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
          d.fx = null
          d.fy = null
        }))

    node.append('circle')
      .attr('r', (d) => getNodeRadius(d.level))
      .attr('fill', (d) => {
        if (d.level === 1) return '#4f7bff'
        if (d.level === 2) return '#3ca3d8'
        if (d.level === 3) return '#22c1a8'
        return '#63d471'
      })
      .attr('stroke', (d) => (d.isExpanded ? '#f4ff6d' : '#dce7ff'))
      .attr('stroke-width', (d) => (d.isExpanded ? 3 : 1.4))

    node.append('text')
      .text((d) => d.id)
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('class', 'tech-map-node-label')

    simulation.on('tick', () => {
      nodes.forEach((nodeItem) => {
        const radius = getNodeRadius(nodeItem.level)
        const horizontalPadding = Math.max(radius + 8, Math.min(110, String(nodeItem.id || '').length * 3.2))
        const minX = horizontalPadding
        const maxX = width - horizontalPadding
        const minY = radius + 8
        const maxY = height - radius - 8
        nodeItem.x = Math.max(minX, Math.min(maxX, nodeItem.x))
        nodeItem.y = Math.max(minY, Math.min(maxY, nodeItem.y))
      })

      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y)

      node.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })

    return () => {
      simulation.stop()
    }
  }, [isD3Ready, visibleNodes, visibleLinks, expandedNodes, childrenByParent])

  return (
    <section className="tech-map-wrapper">
      <p className="tech-map-instruction">Click any node to reveal the next level. Click again to collapse its branch.</p>
      <div className="tech-map-canvas-shell" ref={containerRef}>
        <svg ref={svgRef} role="img" aria-label="Technology map visualization" />
      </div>
    </section>
  )
}
