import type { PositionedGraphNode } from '../utils/graphDisplay'

interface GraphCanvasPackageTethersProps {
  localOnlyNodeIds: ReadonlySet<string>
  nodeById: Map<string, PositionedGraphNode>
  selectedNode: PositionedGraphNode | null
  sourceSafeNodeIds: ReadonlySet<string>
}

/** Shows which visible graph nodes are inside the source-safe agent package. */
export function GraphCanvasPackageTethers({
  localOnlyNodeIds,
  nodeById,
  selectedNode,
  sourceSafeNodeIds,
}: GraphCanvasPackageTethersProps) {
  if (!selectedNode || localOnlyNodeIds.has(selectedNode.id) || !sourceSafeNodeIds.has(selectedNode.id)) {
    return null
  }

  const tetheredNodes = [...sourceSafeNodeIds]
    .filter((id) => id !== selectedNode.id && !localOnlyNodeIds.has(id))
    .map((id) => nodeById.get(id))
    .filter((node): node is PositionedGraphNode => Boolean(node))
    .slice(0, 10)

  if (tetheredNodes.length === 0) return null

  return (
    <g className="grimoire-graph-package-tethers" data-testid="graph-package-tethers">
      {tetheredNodes.map((node) => (
        <line
          key={`${selectedNode.id}->${node.id}`}
          className="grimoire-graph-package-tether"
          x1={selectedNode.x}
          y1={selectedNode.y}
          x2={node.x}
          y2={node.y}
          strokeLinecap="round"
        />
      ))}
    </g>
  )
}
