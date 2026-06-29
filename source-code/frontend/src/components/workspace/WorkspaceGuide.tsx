/**
 * 工作台启动引导界面
 */

import { useTranslation } from 'react-i18next'
import { Monitor, Loader2, Square, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui'
import { useEnvStore } from '@/stores/useEnvStore'
import { EnvRequiredGuide } from '@/components/common/EnvRequiredGuide'
import type { WorkspaceGuideProps } from '@/types/workspace'

export function WorkspaceGuide({ onStart, onStartAndOpenBrowser, onOpenBrowser, isStarting, isPortAvailable, onStop }: WorkspaceGuideProps) {
  const { t } = useTranslation()
  const { environments, currentEnvId } = useEnvStore()
  
  const currentEnv = environments.find(env => env.id === currentEnvId)
  
  const noEnvironment = environments.length === 0 || !currentEnvId

  if (noEnvironment) {
    return (
      <EnvRequiredGuide 
        icon={<Monitor className="size-24 text-muted-foreground" />}
      />
    )
  }

  // 端口可用时的状态显示
  const getStatusDisplay = () => {
    if (isPortAvailable) {
      return {
        title: t('workspace.running'),
        description: t('workspace.runningDesc')
      }
    }
    if (isStarting) {
      return {
        title: t('workspace.starting'),
        description: t('workspace.startingDesc')
      }
    }
    return {
      title: t('workspace.notRunning'),
      description: t('workspace.notRunningDesc')
    }
  }

  const statusDisplay = getStatusDisplay()

  return (
    <div className="flex h-full flex-col items-center justify-center space-y-8 p-8">
      {/* 图标 */}
      <div className="relative">
        <Monitor className="size-24 text-muted-foreground" />
        {isStarting && !isPortAvailable && (
          <div className="absolute -bottom-2 -right-2">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        )}
        {isPortAvailable && (
          <div className="absolute -bottom-2 -right-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-success">
              <div className="size-3 rounded-full bg-primary-foreground" />
            </div>
          </div>
        )}
      </div>
      
      {/* 标题 */}
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">
          {statusDisplay.title}
        </h2>
        <p className="text-muted-foreground">
          {statusDisplay.description}
        </p>
      </div>

      {/* 当前环境信息卡片 */}
      {currentEnv && (
        <div className="w-full max-w-2xl space-y-4 rounded-lg border border-border bg-surface p-6">
          {/* 环境名称和路径 */}
          <div className="border-b border-border pb-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-content-primary">{t("workspace.currentEnv")}</h3>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                {currentEnv.alias}
              </span>
            </div>
            <div className="break-all text-sm text-content-muted">
              {currentEnv.general?.comfyuiPath || t('common.notSet')}
            </div>
          </div>

          {/* 版本信息 */}
          <div className="space-y-3">
            {/* ComfyUI 核心版本 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-content-muted">{t("workspace.coreVersion")}:</span>
              <div className="flex items-center gap-2">
                {currentEnv.envType === 'desktop' ? (
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-sm font-medium text-primary">
                    {t('workspace.desktopVersion')}
                  </span>
                ) : (
                  <>
                    <span className="font-mono text-sm text-content-primary">
                      {currentEnv.versionInfo?.commitHash || currentEnv.version || 'Unknown'}
                    </span>
                    {currentEnv.versionInfo?.isDev && (
                      <span className="rounded bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning">
                        DEV
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 更新时间 */}
            {currentEnv.envType !== 'desktop' && currentEnv.versionInfo?.lastUpdated && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-content-muted">Updated:</span>
                <span className="text-sm text-content-primary">
                  {new Date(currentEnv.versionInfo.lastUpdated).toLocaleDateString()}
                </span>
              </div>
            )}

            {/* 分隔线 */}
            {(currentEnv.dependencies?.pythonVersion || 
              currentEnv.dependencies?.pytorchVersion || 
              currentEnv.dependencies?.cudaVersion) && (
              <div className="border-t border-border pt-3" />
            )}

            {/* Python 版本 */}
            {currentEnv.dependencies?.pythonVersion && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-content-muted">Python:</span>
                <span className="font-mono text-sm text-content-primary">
                  {currentEnv.dependencies.pythonVersion}
                </span>
              </div>
            )}

            {/* PyTorch 版本 */}
            {currentEnv.dependencies?.pytorchVersion && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-content-muted">PyTorch:</span>
                <span className="font-mono text-sm text-content-primary">
                  {currentEnv.dependencies.pytorchVersion}
                </span>
              </div>
            )}

            {/* CUDA 版本 */}
            {currentEnv.dependencies?.cudaVersion && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-content-muted">CUDA:</span>
                <span className="font-mono text-sm text-content-primary">
                  {currentEnv.dependencies.cudaVersion}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 按钮区域 */}
      {!isStarting && (
        <div className="flex items-center gap-4">
          {isPortAvailable ? (
            <>
              {/* 打开浏览器按钮 - 左侧 */}
              {onOpenBrowser && (
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={onOpenBrowser}
                  className="px-6"
                >
                  <ExternalLink className="mr-2 size-4" />
                  {t('workspace.openBrowser')}
                </Button>
              )}
              {/* 打开工作台按钮 - 右侧 */}
              <Button 
                size="lg" 
                onClick={onStart}
                className="px-8"
              >
                {t('workspace.openWorkspace')}
              </Button>
            </>
          ) : (
            <>
              {/* 启动工作台按钮 - 左侧 */}
              <Button 
                size="lg" 
                onClick={onStart}
                className="px-8"
              >
                {t('workspace.startWorkspace')}
              </Button>
              {/* 启动并在浏览器打开按钮 - 右侧 */}
              {onStartAndOpenBrowser && (
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={onStartAndOpenBrowser}
                  className="px-6"
                >
                  <ExternalLink className="mr-2 size-4" />
                  {t('workspace.startAndOpenBrowser')}
                </Button>
              )}
            </>
          )}
          
          {/* 停止 ComfyUI 按钮 */}
          {onStop && (
            <Button 
              size="lg" 
              variant="outline"
              onClick={onStop}
              disabled={!isPortAvailable}
              className="px-6"
            >
              <Square className="mr-2 size-4" />
              {t('workspace.stopComfyUI')}
            </Button>
          )}
        </div>
      )}
      
      {/* 启动进度提示 */}
      {isStarting && (
        <div className="animate-pulse text-sm text-muted-foreground">
          {t('workspace.initializing')}
        </div>
      )}
    </div>
  )
}
