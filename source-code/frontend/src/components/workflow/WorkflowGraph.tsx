/**
 * 工作流节点图组件
 */

import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type NodeTypes,
  type BackgroundVariant
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { WorkflowNode } from './WorkflowNode'
import { convertToReactFlow } from '@/utils/workflowParser'
import type { WorkflowJsonData } from '@/types/workflow'
import { cn } from '@/lib/utils'

const nodeTypes: NodeTypes = {
  workflowNode: WorkflowNode
}

interface WorkflowGraphProps {
  data: WorkflowJsonData
  selectedPluginId?: string | null
  className?: string
}

export function WorkflowGraph({ data, selectedPluginId, className }: WorkflowGraphProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => convertToReactFlow(data),
    [data]
  )

  const nodes = useMemo(() => {
    if (selectedPluginId === null) return initialNodes
    return initialNodes.map(node => ({
      ...node,
      style: {
        ...node.style,
        opacity: (node.data as { pluginName?: string })?.pluginName === selectedPluginId ? 1 : 0.15
      }
    }))
  }, [initialNodes, selectedPluginId])

  const edges = useMemo(() => {
    if (selectedPluginId === null) return initialEdges
    const nodeIds = new Set(
      initialNodes
        .filter(node => (node.data as { pluginName?: string })?.pluginName === selectedPluginId)
        .map(n => n.id)
    )
    return initialEdges.map(edge => ({
      ...edge,
      style: {
        ...edge.style,
        opacity: nodeIds.has(edge.source) && nodeIds.has(edge.target) ? 1 : 0.1
      }
    }))
  }, [initialEdges, initialNodes, selectedPluginId])

  const nodeColor = useCallback((node: { data: { pluginColor?: string; pluginName?: string } }) => {
    if (selectedPluginId && node.data?.pluginName !== selectedPluginId) {
      return 'hsl(var(--muted-foreground)/0.3)'
    }
    return node.data?.pluginColor || 'hsl(var(--muted-foreground))'
  }, [selectedPluginId])

  return (
    <div className={cn('size-full rounded-lg border border-border-subtle bg-background', className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { strokeWidth: 2 }
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={'dots' as BackgroundVariant} gap={20} size={1} color="hsl(var(--border-subtle))" />
        <Controls className="!bg-surface !border-border-subtle" />
        <MiniMap
          nodeColor={nodeColor}
          className="!bg-surface !border-border-subtle"
          maskColor="hsl(var(--background)/0.8)"
        />
      </ReactFlow>
    </div>
  )
}
