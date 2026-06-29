/**
 * 环境依赖面板组件
 */

import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Plug, AlertTriangle, CheckCircle, ExternalLink, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/Switch'
import { Button } from '@/components/ui/Button'
import { BatchInstallProgressModal } from './BatchInstallProgressModal'
import type { PluginDependency } from '@/types/workflow'

interface DependencyPanelProps {
  plugins: PluginDependency[]
  selectedPluginId?: string | null
  onPluginClick?: (pluginName: string) => void
  onRefresh?: () => void
  className?: string
}

const COMFY_CORE_URL = 'https://github.com/comfyanonymous/ComfyUI'

const isPluginMissing = (status: string) => status === 'missing' || status === 'unknown'

export function DependencyPanel({ 
  plugins, 
  selectedPluginId, 
  onPluginClick,
  onRefresh,
  className 
}: DependencyPanelProps) {
  const { t } = useTranslation()
  const [showOnlyMissing, setShowOnlyMissing] = useState(false)
  
  const [progressModalOpen, setProgressModalOpen] = useState(false)
  const [pluginsToInstall, setPluginsToInstall] = useState<Array<{ name: string; githubUrl: string }>>([])

  const corePlugins = useMemo(
    () => plugins.filter((p) => p.githubUrl === COMFY_CORE_URL),
    [plugins]
  )

  const thirdPartyPlugins = useMemo(
    () => plugins.filter((p) => p.githubUrl !== COMFY_CORE_URL),
    [plugins]
  )

  const missingCount = useMemo(
    () => thirdPartyPlugins.filter((p) => isPluginMissing(p.installStatus)).length,
    [thirdPartyPlugins]
  )

  const filteredPlugins = useMemo(() => {
    if (showOnlyMissing) {
      return thirdPartyPlugins.filter((p) => isPluginMissing(p.installStatus))
    }
    return thirdPartyPlugins
  }, [thirdPartyPlugins, showOnlyMissing])

  const handleOpenGithub = (url: string | undefined) => {
    if (url) {
      window.open(url, '_blank')
    }
  }

  const handleInstallPlugin = useCallback((plugin: PluginDependency) => {
    if (!plugin.githubUrl) {
      console.error('插件缺少 GitHub URL:', plugin.name)
      return
    }

    setPluginsToInstall([{ name: plugin.name, githubUrl: plugin.githubUrl }])
    setProgressModalOpen(true)
  }, [])

  const handleInstallAll = useCallback(() => {
    const missingPlugins = thirdPartyPlugins
      .filter((p) => isPluginMissing(p.installStatus) && p.githubUrl)
      .map(p => ({ name: p.name, githubUrl: p.githubUrl! }))
    
    if (missingPlugins.length === 0) return
    
    setPluginsToInstall(missingPlugins)
    setProgressModalOpen(true)
  }, [thirdPartyPlugins])

  const handleProgressModalClose = useCallback(() => {
    setProgressModalOpen(false)
    setPluginsToInstall([])
  }, [])

  const handleProgressModalRefresh = useCallback(() => {
    onRefresh?.()
  }, [onRefresh])

  const handlePluginClick = (pluginName: string) => {
    onPluginClick?.(pluginName)
  }

  return (
    <>
      <div className={cn('flex min-h-0 flex-1 flex-col bg-surface', className)}>
        <div className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-2.5">
          <div className="flex items-center gap-3">
            <h3 className="flex items-center gap-1.5 text-[12px] font-bold text-foreground">
              <Plug className="size-3.5 text-muted-foreground" />
              {t('workflow.dependency.title')}
            </h3>
            <label className="group flex cursor-pointer items-center gap-2">
              <span className="text-[11px] text-muted-foreground transition-colors group-hover:text-foreground">
                {t('workflow.dependency.showOnlyMissing')}
              </span>
              <Switch
                checked={showOnlyMissing}
                onCheckedChange={setShowOnlyMissing}
                className="h-4 w-7 data-[state=checked]:bg-danger"
              />
            </label>
          </div>
          {missingCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleInstallAll}
              disabled={progressModalOpen}
              className="h-6 gap-1 border border-primary/30 bg-primary/10 px-2 text-[11px] text-primary hover:bg-primary/20"
            >
              <Download className="size-3" />
              {t('workflow.dependency.installAll')}
            </Button>
          )}
        </div>

        {missingCount > 0 && (
          <div className="flex items-center justify-between border-b border-danger/20 bg-danger/10 px-4 py-2">
            <div className="flex items-center gap-1.5 text-[11px] text-danger">
              <AlertTriangle className="size-3.5 fill-current" />
              <span>{t('workflow.dependency.missingCount', { count: missingCount })}</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1.5">
            {corePlugins.length > 0 && (
              <>
                {corePlugins.map((plugin) => (
                  <div
                    key={plugin.name}
                    onClick={() => handlePluginClick(plugin.name)}
                    className={cn(
                      'group flex cursor-pointer items-center justify-between rounded-lg p-2.5 transition-colors',
                      'border border-transparent hover:border-border-subtle hover:bg-surface-hover',
                      selectedPluginId === plugin.name && 'border-primary/50 bg-primary/10'
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <CheckCircle className="size-4 shrink-0 text-success" />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-[12px] font-semibold text-foreground">
                          {t('workflow.dependency.comfyuiCore')}
                      </span>
                        <span className="text-[10px] text-muted-foreground">
                          {t('workflow.dependency.builtinNodes', { count: plugin.nodeCount })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="my-2 border-b border-border-subtle" />
              </>
            )}
            
            {filteredPlugins.map((plugin) => {
              const isMissing = isPluginMissing(plugin.installStatus)
              return (
                <div
                  key={plugin.name}
                  onClick={() => handlePluginClick(plugin.name)}
                  className={cn(
                    'group flex cursor-pointer items-center justify-between rounded-lg p-2.5 transition-colors',
                    isMissing
                      ? 'border border-danger/30 bg-danger/5'
                      : 'border border-transparent hover:border-border-subtle hover:bg-surface-hover',
                    selectedPluginId === plugin.name && 'border-primary/50 bg-primary/10'
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {isMissing ? (
                      <AlertTriangle className="size-4 shrink-0 text-danger" />
                    ) : (
                      <CheckCircle className="size-4 shrink-0 text-success" />
                    )}
                    <div className="flex min-w-0 flex-col">
                      <span
                        className={cn(
                          'truncate text-[12px] font-semibold',
                          isMissing
                            ? 'text-danger'
                            : selectedPluginId === plugin.name
                              ? 'text-primary'
                              : 'text-foreground'
                        )}
                      >
                        {plugin.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isMissing ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleInstallPlugin(plugin)
                        }}
                        disabled={!plugin.githubUrl || progressModalOpen}
                        className="h-6 gap-1 border border-primary/30 bg-primary/10 px-2 text-[10px] text-primary hover:bg-primary/20 disabled:opacity-50"
                      >
                        <Download className="size-3" />
                        {t('workflow.dependency.install')}
                      </Button>
                    ) : (
                      <span className="rounded border border-success/20 bg-success/10 px-2 py-0.5 text-[10px] text-success opacity-0 transition-opacity group-hover:opacity-100">
                        {t('workflow.dependency.installed')}
                      </span>
                    )}
                    {plugin.githubUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenGithub(plugin.githubUrl)
                        }}
                        className="size-6 rounded p-1 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                      >
                        <ExternalLink className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}

            {filteredPlugins.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {showOnlyMissing ? t('workflow.dependency.noMissing') : t('workflow.dependency.noDependencies')}
              </div>
            )}
          </div>
        </div>
      </div>

      <BatchInstallProgressModal
        open={progressModalOpen}
        onClose={handleProgressModalClose}
        plugins={pluginsToInstall}
        onRefresh={handleProgressModalRefresh}
      />
    </>
  )
}
