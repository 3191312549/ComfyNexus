/**
 * 工作流节点组件
 */

import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'
import type { ComfyNodePort } from '@/types/workflow'

export interface WorkflowNodeData {
  label: string
  nodeType: string
  cnr_id: string
  pluginName: string
  pluginColor: string
  inputs: ComfyNodePort[]
  outputs: ComfyNodePort[]
  isReroute?: boolean
}

function WorkflowNodeComponent({ data, selected }: NodeProps) {
  const { t } = useTranslation()
  const nodeData = data as unknown as WorkflowNodeData
  const { label, pluginColor, inputs, outputs, isReroute } = nodeData

  const hasPorts = inputs.length > 0 || outputs.length > 0

  if (isReroute) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded bg-surface-active text-xs',
          selected && 'ring-2 ring-primary'
        )}
        style={{ width: 75, height: 26 }}
      >
        <Handle
          type="target"
          position={Position.Left}
          id="input-0"
          className="!size-3 !border-2 !border-muted-foreground !bg-surface"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="output-0"
          className="!size-3 !border-2 !border-muted-foreground !bg-surface"
        />
      </div>
    )
  }

  if (!hasPorts) {
    return (
      <div
        className={cn(
          'min-w-[150px] rounded-lg border-2 bg-surface px-4 py-3 shadow-lg',
          selected && 'ring-2 ring-primary'
        )}
        style={{ borderColor: pluginColor }}
      >
        <div
          className="rounded-t-md text-center text-sm font-medium text-black"
          style={{ backgroundColor: pluginColor }}
        >
          {label}
        </div>
        <div className="mt-2 text-center text-xs text-muted-foreground">
          {t('workflow.node.noPorts')}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'min-w-[180px] rounded-lg border-2 bg-surface shadow-lg',
        selected && 'ring-2 ring-primary'
      )}
      style={{ borderColor: pluginColor }}
    >
      <div
        className="rounded-t-md px-3 py-1.5 text-sm font-medium text-black"
        style={{ backgroundColor: pluginColor }}
      >
        {label}
      </div>
      
      <div className="relative flex">
        <div className="flex-1 space-y-1 py-2">
          {inputs.length > 0 && (
            <div className="space-y-1">
              {inputs.map((input: ComfyNodePort, index: number) => (
                <div key={`input-${index}`} className="relative flex items-center pl-1">
                  <Handle
                    type="target"
                    position={Position.Left}
                    id={`input-${index}`}
                    className="!left-0 !size-2.5 !border-2"
                    style={{ borderColor: pluginColor, backgroundColor: 'hsl(var(--bg-surface))' }}
                  />
                  <span className="ml-3 truncate text-xs text-muted-foreground" title={input.name}>
                    {input.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex-1 space-y-1 py-2">
          {outputs.length > 0 && (
            <div className="space-y-1">
              {outputs.map((output: ComfyNodePort, index: number) => (
                <div key={`output-${index}`} className="relative flex items-center justify-end pr-1">
                  <span className="mr-3 truncate text-xs text-muted-foreground" title={output.name}>
                    {output.name}
                  </span>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`output-${index}`}
                    className="!right-0 !size-2.5 !border-2"
                    style={{ borderColor: pluginColor, backgroundColor: 'hsl(var(--bg-surface))' }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const WorkflowNode = memo(WorkflowNodeComponent)
