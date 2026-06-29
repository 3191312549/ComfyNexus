/**
 * 批量安装进度弹窗组件
 * 
 * 显示工作流缺失插件的批量安装进度
 * 支持最小化悬浮显示
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Minimize2,
  FileText,
  RefreshCw
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/Button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { bridgeService } from '@/services/bridge'
import type { InstallTask, InstallTaskStatus, BatchInstallProgressModalProps } from '@/types/workflow'

const statusIcons: Record<InstallTaskStatus, React.ReactNode> = {
  pending: <Clock className="size-4 text-muted-foreground" />,
  cloning: <Loader2 className="size-4 animate-spin text-primary" />,
  installing_deps: <Loader2 className="size-4 animate-spin text-primary" />,
  success: <CheckCircle className="size-4 text-success" />,
  failed: <XCircle className="size-4 text-danger" />
}

export function BatchInstallProgressModal({
  open,
  onClose,
  plugins,
  onRefresh
}: BatchInstallProgressModalProps) {
  const { t } = useTranslation()
  
  const [tasks, setTasks] = useState<InstallTask[]>([])
  const [minimized, setMinimized] = useState(false)
  const [showForceCloseConfirm, setShowForceCloseConfirm] = useState(false)
  const isClosedRef = useRef(false)
  const isRunningRef = useRef(false)

  const getStatusLabels = useCallback(() => ({
    pending: t('workflow.install.status.pending'),
    cloning: t('workflow.install.status.cloning'),
    installing_deps: t('workflow.install.status.installingDeps'),
    success: t('workflow.install.status.success'),
    failed: t('workflow.install.status.failed')
  }), [t])

  const pollInstallProgress = useCallback(async (taskId: string, taskIndex: number, statusLabels: Record<InstallTaskStatus, string>) => {
    return new Promise<void>((resolve) => {
      const poll = async () => {
        if (isClosedRef.current) {
          resolve()
          return
        }
        
        try {
          const progress = await bridgeService.marketplaceGetInstallProgress(taskId)
          
          if (progress.success && progress.progress) {
            const { status, stage, progress: percent, message } = progress.progress
            
            let taskStatus: InstallTaskStatus = 'cloning'
            if (stage === 'installing_deps' || status === 'installing_deps') {
              taskStatus = 'installing_deps'
            }
            
            setTasks(prev => prev.map((t, idx) => 
              idx === taskIndex ? { 
                ...t, 
                status: taskStatus,
                progress: percent,
                message: message || statusLabels[taskStatus]
              } : t
            ))
            
            if (status === 'completed' || status === 'success') {
              setTasks(prev => prev.map((t, idx) => 
                idx === taskIndex ? { 
                  ...t, 
                  status: 'success',
                  progress: 100,
                  message: statusLabels.success
                } : t
              ))
              resolve()
            } else if (status === 'failed' || status === 'error') {
              setTasks(prev => prev.map((t, idx) => 
                idx === taskIndex ? { 
                  ...t, 
                  status: 'failed',
                  message: message || statusLabels.failed
                } : t
              ))
              resolve()
            } else {
              setTimeout(poll, 500)
            }
          } else {
            setTimeout(poll, 500)
          }
        } catch (error) {
          setTasks(prev => prev.map((t, idx) => 
            idx === taskIndex ? { 
              ...t, 
              status: 'failed',
              message: error instanceof Error ? error.message : statusLabels.failed
            } : t
          ))
          resolve()
        }
      }
      
      poll()
    })
  }, [])

  const startInstallation = useCallback(async (initialTasks: InstallTask[]) => {
    const taskList = [...initialTasks]
    const statusLabels = getStatusLabels()
    
    for (let i = 0; i < taskList.length; i++) {
      if (isClosedRef.current) break
      
      const task = taskList[i]
      if (task.status === 'success') continue
      
      setTasks(prev => prev.map((t, idx) => 
        idx === i ? { ...t, status: 'cloning', message: statusLabels.cloning } : t
      ))
      
      try {
        const result = await bridgeService.marketplaceInstallPlugin(task.githubUrl, true)
        
        if (result.success && result.task_id) {
          await pollInstallProgress(result.task_id, i, statusLabels)
        } else {
          setTasks(prev => prev.map((t, idx) => 
            idx === i ? { 
              ...t, 
              status: 'failed', 
              message: result.message || statusLabels.failed
            } : t
          ))
        }
      } catch (error) {
        setTasks(prev => prev.map((t, idx) => 
          idx === i ? { 
            ...t, 
            status: 'failed', 
            message: error instanceof Error ? error.message : statusLabels.failed
          } : t
        ))
      }
    }
    
    isRunningRef.current = false
    onRefresh?.()
  }, [getStatusLabels, pollInstallProgress, onRefresh])

  useEffect(() => {
    if (open && plugins.length > 0) {
      const initialTasks: InstallTask[] = plugins.map(p => ({
        pluginName: p.name,
        githubUrl: p.githubUrl,
        status: 'pending' as InstallTaskStatus,
        progress: 0,
        message: ''
      }))
      setTasks(initialTasks)
      isRunningRef.current = true
      isClosedRef.current = false
      startInstallation(initialTasks)
    }
  }, [open, plugins, startInstallation])

  const handleOpenLog = async (logPath: string) => {
    try {
      if (window.pywebview?.api?.open_log_file) {
        await window.pywebview.api.open_log_file(logPath)
      }
    } catch (error) {
      console.error('打开日志文件失败:', error)
    }
  }

  const handleRetry = async (taskIndex: number) => {
    const task = tasks[taskIndex]
    if (!task || task.status !== 'failed') return
    
    const statusLabels = getStatusLabels()
    
    setTasks(prev => prev.map((t, idx) => 
      idx === taskIndex ? { ...t, status: 'pending', progress: 0, message: '' } : t
    ))
    
    isRunningRef.current = true
    
    setTasks(prev => prev.map((t, idx) => 
      idx === taskIndex ? { ...t, status: 'cloning', message: statusLabels.cloning } : t
    ))
    
    try {
      const result = await bridgeService.marketplaceInstallPlugin(task.githubUrl, true)
      
      if (result.success && result.task_id) {
        await pollInstallProgress(result.task_id, taskIndex, statusLabels)
      } else {
        setTasks(prev => prev.map((t, idx) => 
          idx === taskIndex ? { 
            ...t, 
            status: 'failed', 
            message: result.message || statusLabels.failed
          } : t
        ))
      }
    } catch (error) {
      setTasks(prev => prev.map((t, idx) => 
        idx === taskIndex ? { 
          ...t, 
          status: 'failed', 
          message: error instanceof Error ? error.message : statusLabels.failed
        } : t
      ))
    }
    
    isRunningRef.current = false
    onRefresh?.()
  }

  const handleRetryFailed = async () => {
    const failedIndices = tasks
      .map((t, idx) => t.status === 'failed' ? idx : -1)
      .filter(idx => idx !== -1)
    
    if (failedIndices.length === 0) return
    
    isRunningRef.current = true
    
    for (const idx of failedIndices) {
      await handleRetry(idx)
    }
    
    isRunningRef.current = false
  }

  const handleToggleMinimize = () => {
    setMinimized(!minimized)
  }

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      if (isRunningRef.current) {
        setMinimized(true)
      } else {
        isClosedRef.current = true
        onClose()
      }
    }
  }

  const handleClose = () => {
    isClosedRef.current = true
    onClose()
  }

  const successCount = tasks.filter(t => t.status === 'success').length
  const failedCount = tasks.filter(t => t.status === 'failed').length
  const totalCount = tasks.length
  const isComplete = !isRunningRef.current && totalCount > 0
  const statusLabels = getStatusLabels()

  if (minimized && isRunningRef.current) {
    const currentTask = tasks.find(t => t.status === 'cloning' || t.status === 'installing_deps')
    return (
      <div 
        className="animate-in fade-in slide-in-from-bottom-2 fixed bottom-5 right-5 z-50 cursor-pointer rounded-lg border border-border bg-surface p-3 shadow-xl"
        onClick={handleToggleMinimize}
      >
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin text-primary" />
          <span className="font-medium">{t('workflow.install.installing')}</span>
          <span className="text-muted-foreground">
            {successCount + 1} / {totalCount}
          </span>
          {currentTask && (
            <span className="text-primary">
              - {currentTask.pluginName}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-lg flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{t('workflow.install.title')}</DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center justify-between px-1 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">
              {t('workflow.install.progress', { 
                current: successCount + failedCount, 
                total: totalCount 
              })}
            </span>
            {successCount > 0 && (
              <span className="text-success">{t('workflow.install.successCount', { count: successCount })}</span>
            )}
            {failedCount > 0 && (
              <span className="text-danger">{t('workflow.install.failedCount', { count: failedCount })}</span>
            )}
          </div>
        </div>
        
        <ScrollArea className="-mx-2 flex-1 px-2">
          <div className="space-y-2 py-2">
            {tasks.map((task, index) => (
              <div
                key={task.githubUrl}
                className={cn(
                  'flex items-start gap-3 rounded-lg p-3 transition-colors',
                  task.status === 'success' && 'bg-success/10',
                  task.status === 'failed' && 'bg-danger/10'
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {statusIcons[task.status]}
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'break-all font-medium',
                      task.status === 'success' && 'text-success',
                      task.status === 'failed' && 'text-danger',
                      task.status === 'pending' && 'text-muted-foreground'
                    )}>
                      {task.pluginName}
                    </span>
                  </div>
                  
                  <div className="mt-1 text-xs text-muted-foreground">
                    {task.status === 'cloning' && statusLabels.cloning}
                    {task.status === 'installing_deps' && statusLabels.installing_deps}
                    {task.status === 'pending' && statusLabels.pending}
                    {task.status === 'success' && statusLabels.success}
                    {task.status === 'failed' && task.message}
                  </div>
                </div>
                
                {task.status === 'failed' && (
                  <div className="flex shrink-0 items-center gap-1">
                    {task.logPath && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenLog(task.logPath!)}
                        className="h-7 px-2 text-xs"
                      >
                        <FileText className="mr-1 size-3" />
                        {t('workflow.install.viewLog')}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRetry(index)}
                      disabled={isRunningRef.current}
                      className="h-7 px-2 text-xs"
                    >
                      <RefreshCw className="mr-1 size-3" />
                      {t('workflow.install.retry')}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <div className="flex shrink-0 justify-end gap-2 border-t border-border pt-4">
          {isRunningRef.current ? (
            <>
              <Button
                variant="outline"
                onClick={handleToggleMinimize}
                className="gap-2"
              >
                <Minimize2 className="size-4" />
                {t('workflow.install.minimize')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowForceCloseConfirm(true)}
                className="gap-2 text-muted-foreground"
              >
                {t('common.forceClose')}
              </Button>
            </>
          ) : (
            <>
              {failedCount > 0 && (
                <Button
                  variant="outline"
                  onClick={handleRetryFailed}
                  className="gap-2"
                >
                  <RefreshCw className="size-4" />
                  {t('workflow.install.retryFailed')}
                </Button>
              )}
              <Button onClick={handleClose}>
                {isComplete ? t('common.close') : t('common.cancel')}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    <AlertDialog open={showForceCloseConfirm} onOpenChange={setShowForceCloseConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('workflow.install.forceCloseWarningTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('workflow.install.forceCloseWarningDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.continueWaiting')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => { setShowForceCloseConfirm(false); handleClose() }}
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            {t('common.forceClose')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}

export default BatchInstallProgressModal
