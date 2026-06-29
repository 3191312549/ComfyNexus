/**
 * 工作台页面
 * 注意：iframe 现在由 MainLayout 全局管理，此页面只负责显示引导界面
 */

import { memo, useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Monitor, Loader2 } from 'lucide-react'
import { Loading, Button } from '@/components/ui'
import { WorkspaceGuide } from '@/components/workspace/WorkspaceGuide'
import { useProcessStore } from '@/stores/useProcessStore'
import { toast } from '@/utils/toast'

const WorkspacePage = memo(() => {
  const { t } = useTranslation()
  const { 
    comfyUIStatus, 
    loading, 
    isStarting,
    loadComfyUIStatus, 
    startComfyUI,
    startComfyUIAndOpenBrowser,
    stopComfyUI,
    openComfyUI,
    showWorkspaceIframe,
    setShowWorkspaceIframe,
    setStartedFromWorkspace
  } = useProcessStore()
  
  const [error, setError] = useState<string | null>(null)
  const pollingIntervalRef = useRef<number | null>(null)
  
  // 判断 ComfyUI 是否正在运行：端口存在即认为运行中
  const isPortAvailable = comfyUIStatus?.portAvailable ?? false
  
  // 调试日志
  useEffect(() => {
    console.log('[WorkspacePage] comfyUIStatus:', comfyUIStatus)
    console.log('[WorkspacePage] isPortAvailable:', isPortAvailable)
  }, [comfyUIStatus, isPortAvailable])
  
  // 组件挂载时加载 ComfyUI 状态
  useEffect(() => {
    loadComfyUIStatus().catch((err) => {
      console.error('[WorkspacePage] 加载 ComfyUI 状态失败:', err)
      setError(t('workspace.loadStatusFailed'))
    })
  }, [loadComfyUIStatus, t])
  
  // 当端口不可用时，重置 showWorkspaceIframe 状态
  useEffect(() => {
    if (!isPortAvailable) {
      setShowWorkspaceIframe(false)
    }
  }, [isPortAvailable, setShowWorkspaceIframe])
  
  // 启动中时轮询状态（每 2 秒检查一次）
  useEffect(() => {
    if (isStarting) {
      console.log('[WorkspacePage] 开始轮询状态（启动中）')
      pollingIntervalRef.current = window.setInterval(() => {
        loadComfyUIStatus().catch((err) => {
          console.error('[WorkspacePage] 轮询状态失败:', err)
        })
      }, 2000)
    } else {
      // 清除轮询
      if (pollingIntervalRef.current) {
        console.log('[WorkspacePage] 停止轮询状态')
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
    
    // 清理函数
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [isStarting, loadComfyUIStatus])
  
  // 启动工作台
  const handleStartWorkspace = async () => {
    try {
      setError(null)
      
      // 如果端口已存在，直接捕获（无需启动）
      if (isPortAvailable) {
        console.log('[WorkspacePage] 端口已存在，直接捕获工作台')
        setShowWorkspaceIframe(true)
        return
      }
      
      // 设置标记：从工作台页面启动
      setStartedFromWorkspace(true)
      
      // 端口不存在，启动 ComfyUI
      await startComfyUI()
    } catch (err) {
      console.error('[WorkspacePage] 启动工作台失败:', err)
      setError(t('workspace.startFailed'))
    }
  }
  
  // 停止 ComfyUI
  const handleStopComfyUI = async () => {
    try {
      setError(null)
      setShowWorkspaceIframe(false)
      await stopComfyUI()
      toast.success(t('workspace.comfyuiStopped'))
    } catch (err) {
      console.error('[WorkspacePage] 停止 ComfyUI 失败:', err)
      setError(t('workspace.stopFailed'))
    }
  }
  
  // 在浏览器中打开 ComfyUI
  const handleOpenBrowser = async () => {
    try {
      setError(null)
      await openComfyUI()
    } catch (err) {
      console.error('[WorkspacePage] 打开浏览器失败:', err)
      setError(t('workspace.openBrowserFailed'))
    }
  }
  
  // 启动 ComfyUI 并在浏览器中打开
  const handleStartAndOpenBrowser = async () => {
    try {
      setError(null)
      await startComfyUIAndOpenBrowser()
    } catch (err) {
      console.error('[WorkspacePage] 启动并在浏览器打开失败:', err)
      setError(t('workspace.startFailed'))
    }
  }
  
  // 重试加载状态
  const handleRetry = () => {
    setError(null)
    loadComfyUIStatus().catch((err) => {
      console.error('[WorkspacePage] 加载 ComfyUI 状态失败:', err)
      setError(t('workspace.loadStatusFailed'))
    })
  }
  
  // 加载中（首次加载）
  if (loading && !comfyUIStatus) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loading size="lg" text={t('common.loading')} />
      </div>
    )
  }
  
  // 错误状态
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 p-8">
        <AlertCircle className="text-red-500 size-16" />
        <p className="text-lg font-medium">{t("workspace.error")}</p>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          {error}
        </p>
        <Button onClick={handleRetry}>{t("workspace.retry")}</Button>
      </div>
    )
  }
  
  // 状态数据缺失
  if (!comfyUIStatus) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 p-8">
        <AlertCircle className="text-yellow-500 size-16" />
        <p className="text-lg font-medium">{t("workspace.statusUnknown")}</p>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          {t('workspace.statusInfoMissing')}
        </p>
        <Button onClick={handleRetry}>{t("workspace.refreshStatus")}</Button>
      </div>
    )
  }
  
  // ComfyUI 正在启动中（isStarting 为 true 但端口还不可用）
  if (isStarting && !isPortAvailable) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 p-8">
        <div className="relative">
          <Monitor className="size-24 text-muted-foreground" />
          <div className="absolute -bottom-2 -right-2">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        </div>
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold">{t('workspace.comfyUIStarting')}</h2>
          <p className="text-muted-foreground">
            {t('workspace.serviceInitializing')}
          </p>
        </div>
        <div className="animate-pulse text-sm text-muted-foreground">
          {t('workspace.waitingForPort', { port: comfyUIStatus.port || 8188 })}
        </div>
      </div>
    )
  }
  
  // 端口可用且用户点击了打开工作台 - 显示 iframe 占位
  if (isPortAvailable && showWorkspaceIframe) {
    return (
      <div className="h-full">
        {/* iframe 由 MainLayout 管理，此处为占位 */}
      </div>
    )
  }
  
  // 显示引导界面（带启动/打开工作台按钮和停止按钮）
  return (
    <WorkspaceGuide 
      onStart={handleStartWorkspace}
      onStartAndOpenBrowser={handleStartAndOpenBrowser}
      onOpenBrowser={handleOpenBrowser}
      isStarting={isStarting}
      isPortAvailable={isPortAvailable}
      onStop={handleStopComfyUI}
    />
  )
})

WorkspacePage.displayName = 'WorkspacePage'

export default WorkspacePage
