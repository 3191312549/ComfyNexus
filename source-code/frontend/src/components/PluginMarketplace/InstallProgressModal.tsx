/**
 * 安装进度模态弹窗组件
 * 
 * 功能：
 * - 显示插件安装进度
 * - 实时更新安装状态
 * - 显示成功/失败结果
 * - 提供查看日志功能
 * - 安装前检查依赖冲突并显示警告（需求 8.5, 8.6）
 * 
 * 验证需求：9.1, 8.5, 8.6
 */

import React, { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  InstallProgressModalProps, 
  InstallStage, 
  InstallStatus,
  DependencyConflict,
  ConflictSeverity 
} from '@/types/plugin-marketplace'
import { pluginMarketplaceService } from '@/services/pluginMarketplaceService'

enum ModalStage {
  CHECKING_CONFLICTS = 'checking_conflicts',
  CONFLICT_WARNING = 'conflict_warning',
  INSTALLING = 'installing',
  COMPLETED = 'completed'
}

export const InstallProgressModal: React.FC<InstallProgressModalProps> = ({
  isOpen,
  pluginName,
  githubUrl,
  autoInstallDeps,
  onClose,
  onInstallComplete
}) => {
  const { t } = useTranslation()
  const [modalStage, setModalStage] = useState<ModalStage>(ModalStage.CHECKING_CONFLICTS)
  const [stage, setStage] = useState<InstallStage>(InstallStage.CLONING)
  const [progress, setProgress] = useState<number>(0)
  const [currentPackage, setCurrentPackage] = useState<string>('')
  const [status, setStatus] = useState<InstallStatus>(InstallStatus.PENDING)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [logPath, setLogPath] = useState<string>('')
  const [conflictWarnings, setConflictWarnings] = useState<DependencyConflict[]>([])
  const [isCheckingConflicts, setIsCheckingConflicts] = useState<boolean>(false)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false)
  const [isCancelling, setIsCancelling] = useState<boolean>(false)
  const isClosedRef = useRef<boolean>(false)

  useEffect(() => {
    if (!isOpen || !githubUrl) {
      return
    }

    setModalStage(ModalStage.CHECKING_CONFLICTS)
    setStage(InstallStage.CLONING)
    setProgress(0)
    setCurrentPackage('')
    setStatus(InstallStatus.PENDING)
    setErrorMessage('')
    setLogPath('')
    setConflictWarnings([])
    setTaskId(null)
    setIsCheckingConflicts(true)
    isClosedRef.current = false

    if (!autoInstallDeps) {
      console.log('[InstallProgressModal] 已关闭自动安装依赖，跳过依赖检查')
      setIsCheckingConflicts(false)
      
      const startDirectly = async () => {
        if (!isClosedRef.current) {
          console.log('[InstallProgressModal] 直接开始安装（跳过依赖检查）')
          await startInstallation()
        }
      }
      
      startDirectly()
      return
    }

    const checkConflicts = async () => {
      try {
        console.log('[InstallProgressModal] 检查依赖冲突:', githubUrl)
        const response = await pluginMarketplaceService.checkDependencies(githubUrl)
        
        if (isClosedRef.current) {
          console.log('[InstallProgressModal] 弹窗已关闭，中止安装')
          return
        }
        
        if (response.success) {
          const conflicts = response.conflicts || []
          setConflictWarnings(conflicts)
          
          if (conflicts.length > 0) {
            console.log('[InstallProgressModal] 检测到依赖冲突:', conflicts)
            setModalStage(ModalStage.CONFLICT_WARNING)
          } else {
            console.log('[InstallProgressModal] 无依赖冲突，准备开始安装')
            
            if (!isClosedRef.current) {
              console.log('[InstallProgressModal] 弹窗未关闭，开始安装')
              await startInstallation()
            } else {
              console.log('[InstallProgressModal] 弹窗已关闭，中止安装')
            }
          }
        } else {
          console.warn('[InstallProgressModal] 依赖冲突检查失败:', response.error_message)
          setModalStage(ModalStage.CONFLICT_WARNING)
          setErrorMessage(response.error_message || t('pluginMarket.install.depsCheckFailed'))
        }
      } catch (error) {
        console.error('[InstallProgressModal] 依赖冲突检查异常:', error)
        setModalStage(ModalStage.CONFLICT_WARNING)
        setErrorMessage(t('pluginMarket.install.depsCheckFailed'))
      } finally {
        setIsCheckingConflicts(false)
      }
    }

    checkConflicts()
  }, [isOpen, githubUrl, autoInstallDeps])

  const startInstallation = async () => {
    try {
      console.log('[InstallProgressModal] ========== 开始安装插件 ==========')
      console.log('[InstallProgressModal] GitHub URL:', githubUrl)
      console.log('[InstallProgressModal] autoInstallDeps:', autoInstallDeps)
      
      setModalStage(ModalStage.INSTALLING)
      setStatus(InstallStatus.RUNNING)
      
      console.log('[InstallProgressModal] 调用 pluginMarketplaceService.installPlugin')
      const response = await pluginMarketplaceService.installPlugin(githubUrl, autoInstallDeps)
      
      console.log('[InstallProgressModal] 收到响应:', response)
      
      if (response.success && response.task_id) {
        setTaskId(response.task_id)
        console.log('[InstallProgressModal] ✅ 安装任务已启动，task_id:', response.task_id)
      } else {
        console.error('[InstallProgressModal] ❌ 安装启动失败')
        setStatus(InstallStatus.FAILED)
        setErrorMessage(response.error_message || t('pluginMarket.install.stage.failed'))
        setModalStage(ModalStage.COMPLETED)
      }
      
      console.log('[InstallProgressModal] ========== 安装插件调用完成 ==========')
    } catch (error) {
      console.error('[InstallProgressModal] ========== 安装插件异常 ==========')
      console.error('[InstallProgressModal] 启动安装失败:', error)
      setStatus(InstallStatus.FAILED)
      setErrorMessage(t('pluginMarket.install.stage.failed'))
      setModalStage(ModalStage.COMPLETED)
    }
  }

  useEffect(() => {
    if (!taskId || modalStage !== ModalStage.INSTALLING) {
      return
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await pluginMarketplaceService.getInstallProgress(taskId)
        
        if (response.success && response.task) {
          const task = response.task
          
          setStage(task.stage)
          setProgress(task.progress)
          setCurrentPackage(task.current_package || '')
          setStatus(task.status)
          setErrorMessage(task.error_message || '')
          setLogPath(task.log_path || '')

          if (task.status === InstallStatus.SUCCESS || task.status === InstallStatus.FAILED) {
            clearInterval(pollInterval)
            setModalStage(ModalStage.COMPLETED)
            
            if (onInstallComplete) {
              onInstallComplete(task.status === InstallStatus.SUCCESS)
            }
          }
        }
      } catch (error) {
        console.error('[InstallProgressModal] 获取安装进度失败:', error)
        clearInterval(pollInterval)
        setStatus(InstallStatus.FAILED)
        setErrorMessage(t('pluginMarket.install.stage.failed'))
        setModalStage(ModalStage.COMPLETED)
      }
    }, 500)

    return () => {
      clearInterval(pollInterval)
    }
  }, [taskId, modalStage])

  const handleConfirmInstall = async () => {
    await startInstallation()
  }

  const handleCancelInstall = () => {
    onClose()
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      console.log('[InstallProgressModal] handleOpenChange 被调用')
      
      if (
        (modalStage === ModalStage.CHECKING_CONFLICTS) ||
        (modalStage === ModalStage.INSTALLING && status === InstallStatus.RUNNING)
      ) {
        console.log('[InstallProgressModal] 正在检查冲突或安装中，显示确认对话框')
        setShowCancelConfirm(true)
        return
      }
      
      if (modalStage === ModalStage.COMPLETED || modalStage === ModalStage.CONFLICT_WARNING) {
        console.log('[InstallProgressModal] 允许直接关闭')
        isClosedRef.current = true
        onClose()
      }
    }
  }
  
  const handleConfirmCancel = async () => {
    console.log('[InstallProgressModal] ========== 开始取消安装 ==========')
    
    isClosedRef.current = true
    setIsCancelling(true)
    
    try {
      if (taskId) {
        console.log('[InstallProgressModal] 调用后端 API 取消安装')
        const timeoutPromise = new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 10000)
        })
        
        await Promise.race([
          pluginMarketplaceService.cancelInstallation(taskId).then(() => {}),
          timeoutPromise
        ])
      }
      
      setStatus(InstallStatus.FAILED)
      setErrorMessage(t('pluginMarket.install.cancelConfirm.description'))
      setModalStage(ModalStage.COMPLETED)
      
      if (onInstallComplete) {
        onInstallComplete(false)
      }
      
      setShowCancelConfirm(false)
      onClose()
      
      console.log('[InstallProgressModal] ========== 取消安装完成 ==========')
    } catch (error) {
      console.error('[InstallProgressModal] 取消安装异常:', error)
      setErrorMessage(t('pluginMarket.install.stage.failed'))
      setShowCancelConfirm(false)
      onClose()
    } finally {
      setIsCancelling(false)
    }
  }
  
  const handleOpenLog = async () => {
    if (logPath) {
      try {
        if (window.pywebview?.api?.open_log_file) {
          const result = await window.pywebview.api.open_log_file(logPath)
          if (!result.success) {
            console.error('[InstallProgressModal] 打开日志文件失败:', result.message)
          }
        }
      } catch (error) {
        console.error('[InstallProgressModal] 打开日志文件异常:', error)
      }
    }
  }

  const getStageText = (): string => {
    if (modalStage === ModalStage.CHECKING_CONFLICTS) {
      return t('pluginMarket.install.stage.checkingConflicts')
    }
    
    if (modalStage === ModalStage.CONFLICT_WARNING) {
      if (conflictWarnings.length > 0) {
        return t('pluginMarket.install.stage.conflictDetected')
      } else if (errorMessage) {
        return t('pluginMarket.install.stage.checkFailed')
      } else {
        return t('pluginMarket.install.stage.preparing')
      }
    }
    
    switch (stage) {
      case InstallStage.CLONING:
        return t('pluginMarket.install.stage.cloning')
      case InstallStage.CHECKING_DEPS:
        return t('pluginMarket.install.stage.checkingDeps')
      case InstallStage.INSTALLING_DEPS:
        return t('pluginMarket.install.stage.installingDeps')
      case InstallStage.SUCCESS:
        return t('pluginMarket.install.stage.success')
      case InstallStage.FAILED:
        return t('pluginMarket.install.stage.failed')
      default:
        return t('pluginMarket.install.stage.preparingPlugin')
    }
  }

  const getStatusIcon = (): React.ReactNode => {
    if (modalStage === ModalStage.CHECKING_CONFLICTS) {
      return (
        <div className="flex size-16 items-center justify-center">
          <svg className="size-12 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )
    }
    
    if (modalStage === ModalStage.CONFLICT_WARNING) {
      if (conflictWarnings.length > 0) {
        return (
          <div className="flex size-16 items-center justify-center rounded-full bg-warning/20">
            <svg className="size-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        )
      }
    }
    
    if (status === InstallStatus.SUCCESS) {
      return (
        <div className="flex size-16 items-center justify-center rounded-full bg-success/20">
          <svg className="size-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )
    }

    if (status === InstallStatus.FAILED) {
      return (
        <div className="flex size-16 items-center justify-center rounded-full bg-danger/20">
          <svg className="size-8 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )
    }

    return (
      <div className="flex size-16 items-center justify-center">
        <svg className="size-12 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    )
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("common.title.installPlugin", { name: pluginName })}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex justify-center">
              {getStatusIcon()}
            </div>

            <div className="text-center">
              <p className="text-lg font-medium">
                {getStageText()}
              </p>
            </div>

            {modalStage === ModalStage.CONFLICT_WARNING && conflictWarnings.length > 0 && (
              <Alert variant="destructive" className="border-warning/50 bg-warning/10">
                <AlertTitle className="mb-2 font-semibold text-warning">
                  {t('pluginMarket.install.conflictCount', { count: conflictWarnings.length })}
                </AlertTitle>
                <AlertDescription>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {conflictWarnings.map((conflict, index) => (
                      <div 
                        key={index} 
                        className="rounded bg-warning/10 p-2 text-sm text-warning"
                      >
                        <div className="font-medium">{conflict.package}</div>
                        <div className="mt-1 text-xs">
                          {t('pluginMarket.install.requiredVersion')} <span className="font-mono">{conflict.required_version}</span>
                          {' | '}
                          {t('pluginMarket.install.installedVersion')} <span className="font-mono">{conflict.installed_version}</span>
                        </div>
                        {conflict.severity === ConflictSeverity.ERROR && (
                          <div className="mt-1 text-xs text-danger">
                            ⚠️ {t('pluginMarket.install.severeConflict')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-warning">
                    {t('pluginMarket.install.conflictWarning')}
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {modalStage === ModalStage.CONFLICT_WARNING && conflictWarnings.length === 0 && errorMessage && (
              <Alert variant="destructive" className="border-warning/50 bg-warning/10">
                <AlertTitle className="font-semibold text-warning">
                  {t('pluginMarket.install.depsCheckFailed')}
                </AlertTitle>
                <AlertDescription className="text-sm text-warning">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}

            {modalStage === ModalStage.INSTALLING && status === InstallStatus.RUNNING && (
              <div className="space-y-2">
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  {Math.round(progress)}%
                </p>
                {stage === InstallStage.INSTALLING_DEPS && currentPackage && (
                  <p className="mt-2 break-all text-center text-sm font-medium text-primary">
                    {currentPackage}
                  </p>
                )}
              </div>
            )}

            {modalStage === ModalStage.COMPLETED && status === InstallStatus.FAILED && errorMessage && (
              <div className="rounded-lg border border-danger/50 bg-danger/10 p-4">
                <p className="text-sm text-danger">
                  {errorMessage}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              {modalStage === ModalStage.CONFLICT_WARNING && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCancelInstall}
                    disabled={isCheckingConflicts}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleConfirmInstall}
                    disabled={isCheckingConflicts}
                    variant="default"
                  >
                    {conflictWarnings.length > 0 ? t('pluginMarket.install.continue') : t('pluginMarket.install.start')}
                  </Button>
                </>
              )}

              {modalStage === ModalStage.COMPLETED && (
                <>
                  {status === InstallStatus.FAILED && logPath && (
                    <Button
                      variant="outline"
                      onClick={handleOpenLog}
                    >
                      {t('pluginMarket.install.viewLog')}
                    </Button>
                  )}

                  <Button
                    onClick={() => handleOpenChange(false)}
                    variant={status === InstallStatus.SUCCESS ? 'default' : 'outline'}
                  >
                    {status === InstallStatus.SUCCESS ? t('common.done') : t('common.close')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('pluginMarket.install.cancelConfirm.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('pluginMarket.install.cancelConfirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>
              {t('pluginMarket.install.continue')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? t('pluginMarket.install.cancelling') : t('pluginMarket.install.confirmCancel')}
            </AlertDialogAction>
            {isCancelling && (
              <Button
                variant="destructive"
                onClick={() => { setShowCancelConfirm(false); onClose() }}
              >
                {t('common.forceClose')}
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
