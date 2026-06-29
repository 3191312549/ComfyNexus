/**
 * 工作流详情对话框 - 显示节点图和插件信息
 */

import { useMemo, useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Send } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { WorkflowGraph } from './WorkflowGraph'
import { WorkflowStats } from './WorkflowStats'
import { WorkflowInfoEditor } from './WorkflowInfoEditor'
import { DependencyPanel } from './DependencyPanel'
import { getWorkflowStats, loadNodeTypeMap, loadLocalNodeMap } from '@/utils/workflowParser'
import { workflowApi } from '@/api/workflow'
import type { WorkflowJsonData, PluginDependency, WorkflowInfoUpdate, PluginInstallStatus } from '@/types/workflow'

interface WorkflowDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  description?: string
  tags?: string[]
  data: WorkflowJsonData | null
  onSaveInfo?: (info: WorkflowInfoUpdate) => void
}

export function WorkflowDetailDialog({
  open,
  onOpenChange,
  name,
  description: initialDescription,
  tags: initialTags,
  data,
  onSaveInfo
}: WorkflowDetailDialogProps) {
  const { t } = useTranslation()
  const [workflowName, setWorkflowName] = useState(name)
  const [description, setDescription] = useState(initialDescription || '')
  const [tags, setTags] = useState<string[]>(initialTags || [])
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null)
  const [pluginStatusMap, setPluginStatusMap] = useState<Record<string, PluginInstallStatus>>({})
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  // 当 props 变化时，同步状态
  useEffect(() => {
    if (open) {
      setWorkflowName(name)
      setDescription(initialDescription || '')
      setTags(initialTags || [])
    }
  }, [open, name, initialDescription, initialTags])

  useEffect(() => {
    if (open) {
      loadNodeTypeMap().then(() => {
        return loadLocalNodeMap()
      }).then(() => {
        setIsMapLoaded(true)
      }).catch(error => {
        console.error('加载映射表失败:', error)
        setIsMapLoaded(true)
      })
    }
  }, [open])

  const stats = useMemo(() => {
    if (!data || !isMapLoaded) return null
    return getWorkflowStats(data)
  }, [data, isMapLoaded])

  useEffect(() => {
    if (stats && stats.plugins.length > 0) {
      const pluginsInfo = stats.plugins.map(p => ({
        githubUrl: p.githubUrl,
        name: p.name
      }))
      console.log('[DEBUG] stats.plugins:', stats.plugins)
      console.log('[DEBUG] pluginsInfo to check:', pluginsInfo)
      workflowApi.checkPluginsStatus(pluginsInfo).then(result => {
        console.log('[DEBUG] checkPluginsStatus result:', result)
        setPluginStatusMap(result)
      }).catch(error => {
        console.error('获取插件状态失败:', error)
      })
    }
  }, [stats])

  const plugins: PluginDependency[] = useMemo(() => {
    if (!stats) return []
    console.log('[DEBUG] pluginStatusMap:', pluginStatusMap)
    return stats.plugins.map((p) => {
      const status = pluginStatusMap[p.name] || 'missing'
      console.log(`[DEBUG] plugin: ${p.name}, githubUrl: ${p.githubUrl}, status: ${status}`)
      return {
        githubUrl: p.githubUrl,
        name: p.name,
        color: p.color,
        nodeCount: p.count,
        nodes: p.nodes,
        installStatus: status
      }
    })
  }, [stats, pluginStatusMap])

  const handleSaveInfo = useCallback((info: WorkflowInfoUpdate) => {
    if (info.name) setWorkflowName(info.name)
    if (info.description) setDescription(info.description)
    if (info.tags) setTags(info.tags)
    onSaveInfo?.(info)
  }, [onSaveInfo])

  const handlePluginClick = useCallback((pluginName: string) => {
    setSelectedPluginId(prev => prev === pluginName ? null : pluginName)
  }, [])

  const handleRefreshPluginStatus = useCallback(() => {
    if (stats && stats.plugins.length > 0) {
      const pluginsInfo = stats.plugins.map(p => ({
        githubUrl: p.githubUrl,
        name: p.name
      }))
      workflowApi.checkPluginsStatus(pluginsInfo).then(result => {
        setPluginStatusMap(result)
      }).catch(error => {
        console.error('刷新插件状态失败:', error)
      })
    }
  }, [stats])

  if (!data || !stats) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface p-0 shadow-2xl">
        <DialogTitle className="sr-only">{workflowName}</DialogTitle>
        <DialogDescription className="sr-only">{t('workflow.detail.reportTitle')}</DialogDescription>
        
        <header className="flex h-14 shrink-0 items-center border-b border-border-subtle bg-surface px-5">
          <div className="flex flex-1 items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded bg-primary/20 text-primary">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <div className="flex max-w-md flex-1 flex-col">
              <h2 className="-ml-1 w-full border-b border-transparent bg-transparent px-1 text-[15px] font-bold leading-tight text-foreground">
                {workflowName}
              </h2>
              <p className="px-1 font-mono text-[11px] text-muted-foreground">{t('workflow.detail.reportTitle')}</p>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <div className="relative flex-1 overflow-hidden border-r border-border-subtle bg-background">
            <WorkflowGraph 
              data={data} 
              selectedPluginId={selectedPluginId}
              className="size-full" 
            />
          </div>

          <div className="flex w-[400px] shrink-0 flex-col bg-surface">
            <div className="border-b border-border-subtle p-4">
              <WorkflowInfoEditor
                name={workflowName}
                description={description || ''}
                tags={tags}
                onSave={handleSaveInfo}
              />
            </div>

            <div className="border-b border-border-subtle p-4">
              <WorkflowStats
                totalNodes={stats.totalNodes}
                totalLinks={stats.totalLinks}
                nodeTypesCount={stats.nodeTypes.length}
                pluginsCount={stats.plugins.length}
              />
            </div>

            <DependencyPanel 
              plugins={plugins} 
              selectedPluginId={selectedPluginId}
              onPluginClick={handlePluginClick}
              onRefresh={handleRefreshPluginStatus}
              className="flex-1" 
            />

            <div className="border-t border-border-subtle bg-surface p-4">
              <Button className="flex w-full items-center justify-center gap-2 bg-primary py-2.5 text-[13px] font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary-hover">
                <Send className="size-4" />
                {t('workflow.detail.load')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
