/**
 * 工作流类型定义
 */

export interface Workflow {
  id: string
  name: string
  description: string
  preview?: string
  previews?: string[]
  nodes: number
  createdAt: string
  updatedAt: string
  tags: string[]
  isFavorite?: boolean
  folderId?: string | null
  rawData?: WorkflowJsonData
}

export interface WorkflowJsonData {
  id: string
  revision: number
  last_node_id: number
  last_link_id: number
  nodes: ComfyNode[]
  links: ComfyLink[] | null
  extra?: {
    groupNodes?: Record<string, { nodes?: ComfyNode[] }>
    [key: string]: unknown
  }
}

export interface ComfyNode {
  id: number
  type: string
  pos: [number, number]
  size: [number, number]
  flags: Record<string, unknown>
  order: number
  mode: number
  inputs: ComfyNodePort[]
  outputs: ComfyNodePort[]
  properties: {
    'Node name for S&R'?: string
    cnr_id?: string
    ver?: string
    [key: string]: unknown
  }
  widgets_values: unknown[]
}

export interface ComfyNodePort {
  label?: string
  localized_name?: string
  name: string
  type: string
  link?: number | null
  links?: number[]
  slot?: number
  widget?: { name: string }
}

export type ComfyLink = [number, number, number, number, number, string]

export type PluginInstallStatus = 'installed' | 'missing' | 'unknown'

export interface PluginDependency {
  githubUrl: string
  name: string
  color: string
  nodeCount: number
  nodes: string[]
  installStatus: PluginInstallStatus
}

export interface WorkflowFolder {
  id: string
  name: string
  parentId?: string | null
  createdAt: string
  updatedAt: string
}

export interface WorkflowStatsData {
  totalNodes: number
  totalLinks: number
  nodeTypes: string[]
  plugins: PluginDependency[]
}

export interface WorkflowInfoUpdate {
  name?: string
  description?: string
  tags?: string[]
}

export type InstallTaskStatus = 'pending' | 'cloning' | 'installing_deps' | 'success' | 'failed'

export interface InstallTask {
  pluginName: string
  githubUrl: string
  status: InstallTaskStatus
  progress: number
  message: string
  logPath?: string
  depCount?: number
  taskId?: string
}

export interface BatchInstallProgressModalProps {
  open: boolean
  onClose: () => void
  plugins: Array<{
    name: string
    githubUrl: string
  }>
  onRefresh?: () => void
}
