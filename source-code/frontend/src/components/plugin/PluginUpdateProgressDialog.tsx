/**
 * 插件操作进度对话框
 * 
 * 显示插件更新或版本切换的阶段进度和依赖安装详情
 * 通过监听 CustomEvent 获取后端推送的进度
 * 支持两种模式：update（更新）和 switch（切换版本）
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, XCircle, Loader2, Package } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { PluginInfo } from '@/types/plugin'
import { pluginAPI } from '@/services/PluginAPIService'
import { switchPluginVersion } from '@/services/versionApi'

interface DepInstallResult {
  package: string
  version: string
  success: boolean
  error?: string
}

export interface PluginUpdateProgressDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pluginName: string
  mode: 'update' | 'switch'
  commitHash?: string
  commitDate?: string
  behindCommits?: number
  onComplete: (result: { success: boolean; message: string; plugin?: PluginInfo | null }) => void
}

interface ProgressData {
  plugin_name: string
  stage: string
  progress: number
  message: string
  detail?: string
}

export function PluginUpdateProgressDialog({
  open,
  onOpenChange,
  pluginName,
  mode,
  commitHash,
  commitDate,
  behindCommits,
  onComplete,
}: PluginUpdateProgressDialogProps) {
  const { t } = useTranslation()
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [detail, setDetail] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [resultMessage, setResultMessage] = useState('')
  const [installedDeps, setInstalledDeps] = useState<DepInstallResult[]>([])
  const [failedDeps, setFailedDeps] = useState<DepInstallResult[]>([])
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const isLocalChangesError = useCallback((msg: string): boolean => {
    const keywords = [
      // 未合并文件 (rebase/merge 中断后残留)
      'unmerged files',
      'your index file is unmerged',
      // 本地修改会被覆盖
      'would be overwritten by merge',
      'would be overwritten',
      'Your local changes to the following files would be overwritten',
      'your local changes would be overwritten',
      // 未跟踪文件冲突
      'untracked working tree files would be overwritten',
      'untracked working tree files would be removed',
      'Untracked working tree file',
      'untracked files in way',
      // 未暂存/未提交的更改
      'unstaged changes',
      'uncommitted changes',
      'local changes',
      'working tree',
      'Please commit your changes or stash them',
      'Please move or remove',
      // 之前的 merge/rebase/cherry-pick 未完成
      'You have not concluded your merge',
      'MERGE_HEAD exists',
      'CHERRY_PICK_HEAD exists',
      'rebase is already in progress',
      'cherry-pick is already in progress',
      'revert is already in progress',
      'git rebase --abort',
      'git merge --abort',
      'git cherry-pick --abort',
      // stash 应用冲突
      'local changes are stashed, however applying them resulted in conflicts',
      'cannot apply a stash in the middle of a merge',
      // 合并冲突
      'Automatic merge failed',
      'Merge with strategy',
      // 中文提示
      '被合并时覆盖',
      '未跟踪的工作树文件',
    ];
    return keywords.some(keyword => msg.toLowerCase().includes(keyword.toLowerCase()));
  }, []);

  const progressEventName = mode === 'update' ? 'plugin-update-progress' : 'plugin-switch-progress'

  useEffect(() => {
    if (!open) {
      setProgress(0)
      setMessage('')
      setDetail('')
      setIsComplete(false)
      setIsSuccess(false)
      setResultMessage('')
      setInstalledDeps([])
      setFailedDeps([])
      return
    }

    const handleProgress = (event: Event) => {
      const customEvent = event as CustomEvent<ProgressData>
      const data = customEvent.detail

      if (data.plugin_name !== pluginName) return

      setProgress(data.progress)
      setMessage(data.message)
      if (data.detail) {
        setDetail(data.detail)
      }

      if (data.stage === 'complete') {
        setIsComplete(true)
        setIsSuccess(true)
      } else if (data.stage === 'error') {
        setIsComplete(true)
        setIsSuccess(false)
        setResultMessage(data.message)
      }
    }

    window.addEventListener(progressEventName, handleProgress)
    
    if (mode === 'update') {
      pluginAPI.updatePlugin(pluginName, false).then(result => {
        if (result) {
          if (result.installed_deps) setInstalledDeps(result.installed_deps)
          if (result.failed_deps) setFailedDeps(result.failed_deps)
          setIsComplete(true)
          setIsSuccess(result.success)
          setResultMessage(result.message || '')
          if (result.success) {
            setProgress(100)
            onComplete({
              success: true,
              message: result.message || '',
              plugin: result.plugin,
            })
          }
        }
      }).catch(err => {
        setIsComplete(true)
        setIsSuccess(false)
        setResultMessage(err?.message || t('plugin.updateProgress.updateFailed'))
      })
    } else if (mode === 'switch' && commitHash) {
      switchPluginVersion(pluginName, commitHash, commitDate, behindCommits).then(result => {
        if (result) {
          if (result.installed_deps) setInstalledDeps(result.installed_deps)
          if (result.failed_deps) setFailedDeps(result.failed_deps)
          setIsComplete(true)
          setIsSuccess(result.success)
          setResultMessage(result.message || '')
          if (result.success) {
            setProgress(100)
            onComplete({
              success: true,
              message: result.message || '',
              plugin: result.plugin,
            })
          }
        }
      }).catch(err => {
        setIsComplete(true)
        setIsSuccess(false)
        setResultMessage(err?.message || t('plugin.updateProgress.switchFailed'))
      })
    }
    
    return () => {
      window.removeEventListener(progressEventName, handleProgress)
    }
  }, [open, pluginName, mode, commitHash, commitDate, behindCommits, progressEventName, t, onComplete])

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isComplete) {
      setShowCloseConfirm(true)
      return
    }
    onOpenChange(newOpen)
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  const handleForceAction = async (force: boolean) => {
    setIsComplete(false)
    setProgress(0)
    setMessage(mode === 'update' ? t('plugin.updateProgress.forceUpdating') : t('plugin.updateProgress.forceSwitching'))
    setDetail('')
    setResultMessage('')
    setInstalledDeps([])
    setFailedDeps([])
    try {
      let result
      if (mode === 'update') {
        result = await pluginAPI.updatePlugin(pluginName, force)
      } else if (commitHash) {
        result = await switchPluginVersion(pluginName, commitHash, commitDate, behindCommits)
      } else {
        setIsComplete(true)
        setIsSuccess(false)
        setResultMessage(t('plugin.updateProgress.switchFailed'))
        return
      }
      
      if (result) {
        if (result.installed_deps) setInstalledDeps(result.installed_deps)
        if (result.failed_deps) setFailedDeps(result.failed_deps)
        setIsComplete(true)
        setIsSuccess(result.success)
        setResultMessage(result.message || '')
        if (result.success) {
          setProgress(100)
          onComplete({ success: true, message: result.message || '', plugin: result.plugin })
        }
      }
    } catch {
      setIsComplete(true)
      setIsSuccess(false)
      setResultMessage(mode === 'update' ? t('plugin.updateProgress.updateFailed') : t('plugin.updateProgress.switchFailed'))
    }
  }

  const totalDeps = installedDeps.length + failedDeps.length

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {isComplete
                ? isSuccess
                  ? t(mode === 'update' ? 'plugin.updateProgress.updateComplete' : 'plugin.updateProgress.switchComplete')
                  : t(mode === 'update' ? 'plugin.updateProgress.updateFailed' : 'plugin.updateProgress.switchFailed')
                : t(mode === 'update' ? 'plugin.updateProgress.updating' : 'plugin.updateProgress.switching', { name: pluginName })}
            </DialogTitle>
            {!isComplete && (
              <DialogDescription>{t('plugin.updateProgress.closeWarning')}</DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4">
            {!isComplete && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-content-secondary">{message}</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                {detail && (
                  <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
                    <Package className="size-4 shrink-0 text-primary" />
                    <span className="truncate font-mono text-sm text-content-primary">{detail}</span>
                  </div>
                )}
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              </div>
            )}

            {isComplete && (
              <div className="space-y-4">
                <div className={cn(
                  "flex items-center gap-3 rounded-lg border p-4",
                  isSuccess
                    ? "border-success/50 bg-success/10"
                    : "border-danger/50 bg-danger/10"
                )}>
                  {isSuccess ? (
                    <CheckCircle2 className="size-5 shrink-0 text-success" />
                  ) : (
                    <XCircle className="size-5 shrink-0 text-danger" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-semibold", isSuccess ? "text-success" : "text-danger")}>
                      {isSuccess 
                        ? t(mode === 'update' ? 'plugin.updateProgress.updateSuccess' : 'plugin.updateProgress.switchSuccess')
                        : t(mode === 'update' ? 'plugin.updateProgress.updateFailed' : 'plugin.updateProgress.switchFailed')}
                    </p>
                    {!isSuccess && isLocalChangesError(resultMessage || message) ? null : (
                      <p className="mt-1 text-sm text-content-secondary">
                        {resultMessage || message}
                      </p>
                    )}
                  </div>
                </div>

                {!isSuccess && isLocalChangesError(resultMessage || message) && (
                  <div className="space-y-3 rounded-lg border border-warning/50 bg-warning/10 p-4">
                    <p className="text-sm text-content-primary">
                      {t('plugin.updateProgress.localChangesDetected')}
                    </p>
                    <p className="text-xs text-content-secondary">
                      {t('plugin.updateProgress.forceUpdateHint')}
                    </p>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleForceAction(true)}
                    >
                      {t('plugin.updateProgress.forceUpdateButton')}
                    </Button>
                  </div>
                )}

                {totalDeps > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-content-secondary">
                      {t('plugin.updateProgress.depInstallResult', { total: totalDeps, success: installedDeps.length, failed: failedDeps.length })}
                    </div>
                    <ScrollArea className="max-h-[200px] rounded-md border border-border bg-surface">
                      <div className="space-y-1 p-2">
                        {installedDeps.map((dep, index) => (
                          <div key={`ok-${index}`} className="flex items-center gap-2 rounded p-1.5 text-sm hover:bg-muted/50">
                            <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                            <span className="font-mono text-content-primary">{dep.package}</span>
                            {dep.version && <span className="text-content-muted">{dep.version}</span>}
                          </div>
                        ))}
                        {failedDeps.map((dep, index) => (
                          <div key={`fail-${index}`} className="flex items-start gap-2 rounded p-1.5 text-sm hover:bg-muted/50">
                            <XCircle className="mt-0.5 size-3.5 shrink-0 text-danger" />
                            <div className="min-w-0 flex-1">
                              <span className="font-mono text-content-primary">{dep.package}</span>
                              {dep.error && (
                                <p className="mt-0.5 break-words text-xs text-danger">{dep.error}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
            {isComplete ? (
              <Button onClick={handleClose}>{t('common.close')}</Button>
            ) : (
              <Button variant="outline" onClick={() => setShowCloseConfirm(true)}>
                {t('common.cancel')}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmClose')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('plugin.updateProgress.closeConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.continueWaiting')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowCloseConfirm(false); onOpenChange(false) }}>
              {t('common.confirmClose')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default PluginUpdateProgressDialog
