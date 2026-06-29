/**
 * Git 权限修复对话框组件
 * 
 * 提供批量修复 Git 仓库权限问题的交互界面
 * - 显示确认界面说明操作内容
 * - 实时显示修复进度和当前处理的仓库
 * - 展示修复结果摘要（成功数、失败数、总耗时）
 * - 显示失败仓库的详细信息
 * 
 * **验证需求：3.2, 3.3, 3.4, 3.5**
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
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
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Clock,
  Wrench,
  TrendingUp,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { pluginService } from '@/services/pluginService'
import type { GitPermissionFixResponse, ProblemRepository } from '@/types/plugin'

/**
 * 修复阶段
 */
type FixStage = 'confirm' | 'fixing' | 'completed'

/**
 * GitPermissionFixDialog 组件属性
 */
export interface GitPermissionFixDialogProps {
  /** 是否打开对话框 */
  open: boolean
  /** 关闭对话框回调 */
  onClose: () => void
  /** 修复完成回调 */
  onComplete?: () => void
}

/**
 * Git 权限修复对话框
 * 
 * 工作流程：
 * 1. 确认阶段：显示操作说明，用户确认后开始修复
 * 2. 修复阶段：显示进度条和当前处理的仓库名称
 * 3. 完成阶段：显示结果摘要和失败详情
 * 
 * **验证需求：3.2, 3.3, 3.4, 3.5**
 */
export function GitPermissionFixDialog({
  open,
  onClose,
  onComplete,
}: GitPermissionFixDialogProps) {
  const { t } = useTranslation()
  // 状态管理
  const [stage, setStage] = useState<FixStage>('confirm')
  const [progress, setProgress] = useState(0)
  const [currentRepo, setCurrentRepo] = useState<string>('')
  const [result, setResult] = useState<GitPermissionFixResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showFailedDetails, setShowFailedDetails] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  /**
   * 重置状态
   */
  const resetState = useCallback(() => {
    setStage('confirm')
    setProgress(0)
    setCurrentRepo('')
    setResult(null)
    setError(null)
    setShowFailedDetails(false)
  }, [])

  /**
   * 对话框关闭时重置状态
   */
  useEffect(() => {
    if (!open) {
      // 延迟重置，等待关闭动画完成
      const timer = setTimeout(resetState, 300)
      return () => clearTimeout(timer)
    }
  }, [open, resetState])

  /**
   * 执行权限修复
   */
  const executeFixPermissions = useCallback(async () => {
    try {
      // 切换到修复阶段
      setStage('fixing')
      setProgress(10)
      setCurrentRepo(t('plugin.gitPermission.scanningRepos'))

      console.log('[GitPermissionFixDialog] 开始修复 Git 权限')

      // 模拟进度更新（因为后端 API 不支持实时进度回调）
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev
          return prev + 5
        })
      }, 500)

      // 调用修复 API
      const response = await pluginService.fixGitPermissions()

      // 清除进度定时器
      clearInterval(progressInterval)

      if (response.success) {
        // 修复成功
        setProgress(100)
        setCurrentRepo(t('plugin.gitPermission.fixCompleted'))
        setResult(response)
        setStage('completed')

        console.log('[GitPermissionFixDialog] 修复完成', {
          total: response.total,
          fixed: response.fixed,
          failed: response.failed,
          duration: response.duration,
        })

        // 调用完成回调
        if (onComplete) {
          onComplete()
        }
      } else {
        // 修复失败
        const errorMsg = response.error || t('plugin.gitPermission.fixFailed')
        setError(errorMsg)
        setStage('completed')

        console.error('[GitPermissionFixDialog] 修复失败', errorMsg)
      }
    } catch (err: any) {
      // 处理异常
      const errorMsg = err?.message || t('plugin.gitPermission.fixError')
      setError(errorMsg)
      setStage('completed')

      console.error('[GitPermissionFixDialog] 修复异常', err)
    }
  }, [onComplete])

  /**
   * 处理确认修复
   */
  const handleConfirm = () => {
    executeFixPermissions()
  }

  /**
   * 处理关闭
   */
  const handleClose = () => {
    onClose()
  }

  /**
   * 切换失败详情显示
   */
  const toggleFailedDetails = () => {
    setShowFailedDetails(prev => !prev)
  }

  /**
   * 格式化耗时
   */
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return t('plugin.gitPermission.zeroSeconds')
    if (seconds < 60) return t('plugin.gitPermission.seconds', { count: Number(seconds.toFixed(1)) })
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return t('plugin.gitPermission.minutesSeconds', { minutes, seconds: remainingSeconds })
  }

  return (
    <>
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        if (stage === 'fixing') {
          setShowCloseConfirm(true)
          return
        }
        onClose()
      }
    }}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        {/* 确认阶段 */}
        {stage === 'confirm' && (
          <>
            {/* 标题 */}
            <div className="mb-6 flex items-center gap-2">
              <Wrench className="size-5 text-primary" />
              <h2 className="text-foreground text-lg font-semibold">{t("plugin.gitPermission.fixTitle")}</h2>
            </div>

            <p className="mb-6 text-sm text-muted-foreground">
              {t('plugin.gitPermission.batchFixDesc')}
            </p>

            <div className="space-y-4">
              <section className="border-info border-l-info bg-info/10 rounded-lg border border-l-4 p-4">
                <h3 className="text-foreground mb-2 text-sm font-semibold">
                  📋 {t('plugin.gitPermission.operationGuide')}
                </h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>{t("plugin.gitPermission.thisWill")}:</p>
                  <ul className="ml-2 list-inside list-disc space-y-1">
                    <li>{t("plugin.gitPermission.scanRepos")}</li>
                    <li>{t("plugin.gitPermission.detectIssues")}</li>
                    <li>{t("plugin.gitPermission.addToSafeList")}</li>
                    <li>{t("plugin.gitPermission.verifyFix")}</li>
                  </ul>
                </div>
              </section>

              <section>
                <h3 className="text-foreground mb-2 text-base font-semibold">
                  🔧 {t('plugin.gitPermission.fixPrinciple')}
                </h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    {t('plugin.gitPermission.fixPrincipleDesc')}
                  </p>
                  <div className="rounded-md bg-muted p-3 font-mono text-xs text-foreground">
                    git config --global --add safe.directory &lt;{t('plugin.gitPermission.pluginPath')}&gt;
                  </div>
                  <p className="text-xs">
                    {t('plugin.gitPermission.fixPrincipleNote')}
                  </p>
                </div>
              </section>

              <section className="border-warning border-l-warning bg-warning/10 rounded-lg border border-l-4 p-4">
                <h3 className="text-foreground mb-1 text-sm font-semibold">
                  ⚠️ {t('plugin.gitPermission.notes')}
                </h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• {t('plugin.gitPermission.noteTime')}</p>
                  <p>• {t('plugin.gitPermission.noteNoClose')}</p>
                  <p>• {t('plugin.gitPermission.noteRefresh')}</p>
                </div>
              </section>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={handleClose}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleConfirm}>
                {t('plugin.gitPermission.startFix')}
              </Button>
            </div>
          </>
        )}

        {/* 修复阶段 */}
        {stage === 'fixing' && (
          <>
            {/* 标题和关闭按钮 */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="size-5 animate-pulse text-primary" />
                <h2 className="text-foreground text-lg font-semibold">{t("plugin.gitPermission.fixing")}</h2>
              </div>
            </div>

            <p className="mb-6 text-sm text-muted-foreground">
              {t('plugin.gitPermission.pleaseWait')}
            </p>

            <div className="space-y-6">
              {/* 进度条 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("plugin.gitPermission.progress")}</span>
                  <span className="text-foreground font-semibold">{progress}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>

              {/* 当前处理的仓库 */}
              <div className="border-info bg-info/10 flex items-center gap-3 rounded-lg border p-4">
                <Clock className="text-info size-5 animate-spin" />
                <div className="flex-1">
                  <div className="mb-1 text-sm text-muted-foreground">{t("plugin.gitPermission.current")}</div>
                  <div className="text-foreground font-medium">{currentRepo}</div>
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                {t('plugin.gitPermission.doNotClose')}
              </div>
            </div>
          </>
        )}

        {/* 完成阶段 */}
        {stage === 'completed' && (
          <>
            {/* 标题 */}
            <div className="mb-6 flex items-center gap-2">
              {error ? (
                <>
                  <XCircle className="size-5 text-destructive" />
                  <h2 className="text-foreground text-lg font-semibold">{t("plugin.gitPermission.failed")}</h2>
                </>
              ) : (
                <>
                  <CheckCircle2 className="text-success size-5" />
                  <h2 className="text-foreground text-lg font-semibold">{t("plugin.gitPermission.completed")}</h2>
                </>
              )}
            </div>

            <p className="mb-6 text-sm text-muted-foreground">
              {error ? t('plugin.gitPermission.errorOccurred') : t('plugin.gitPermission.permissionFixed')}
            </p>

            <div className="space-y-4">
              {/* 错误提示 */}
              {error && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 size-5 text-destructive" />
                    <div className="flex-1">
                      <h4 className="mb-1 font-semibold text-destructive">{t("plugin.gitPermission.errorInfo")}</h4>
                      <p className="text-sm text-muted-foreground">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {result && !error && (
                <div className="border-info bg-info/10 rounded-lg border p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <TrendingUp className="size-5 text-primary" />
                    <h3 className="text-foreground font-semibold">{t("plugin.gitPermission.summary")}</h3>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-foreground text-2xl font-bold">
                        {result.total || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">{t("plugin.gitPermission.totalRepos")}</div>
                    </div>

                    <div className="text-center">
                      <div className="text-success text-2xl font-bold">
                        {result.fixed || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">{t("plugin.gitPermission.successCount")}</div>
                    </div>

                    <div className="text-center">
                      <div className="text-2xl font-bold text-destructive">
                        {result.failed || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">{t("plugin.gitPermission.failed")}</div>
                    </div>

                    <div className="text-center">
                      <div className="text-info text-2xl font-bold">
                        {formatDuration(result.duration)}
                      </div>
                      <div className="text-sm text-muted-foreground">{t("plugin.gitPermission.totalTime")}</div>
                    </div>
                  </div>
                </div>
              )}

              {result && result.failed_repos && result.failed_repos.length > 0 && (
                <div className="border-danger bg-danger/10 rounded-lg border">
                  <Button
                    onClick={toggleFailedDetails}
                    variant="ghost"
                    className="hover:bg-danger/20 w-full justify-between rounded-lg p-4"
                  >
                    <div className="flex items-center gap-2">
                      <XCircle className="size-5 text-destructive" />
                      <span className="text-foreground font-semibold">
                        {t('plugin.gitPermission.failedDetails')} ({result.failed_repos.length})
                      </span>
                    </div>
                    {showFailedDetails ? (
                      <ChevronUp className="size-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-5 text-muted-foreground" />
                    )}
                  </Button>

                  {showFailedDetails && (
                    <div className="border-danger border-t">
                      <div className="max-h-60 overflow-y-auto">
                        {result.failed_repos.map((repo: ProblemRepository, index: number) => (
                          <div
                            key={index}
                            className="border-danger border-b p-4 last:border-b-0"
                          >
                            <div className="flex items-start gap-3">
                              <XCircle className="mt-1 size-4 shrink-0 text-destructive" />
                              <div className="min-w-0 flex-1">
                                <div className="text-foreground mb-1 font-medium">
                                  {repo.name}
                                </div>
                                <div className="mb-2 break-all text-sm text-muted-foreground">
                                  {repo.path}
                                </div>
                                <div className="text-sm text-destructive">
                                  {repo.error}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {result && !error && result.failed === 0 && (
                <div className="border-success border-l-success bg-success/10 rounded-lg border border-l-4 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="text-success mt-0.5 size-5" />
                    <div className="flex-1">
                      <h4 className="text-foreground mb-1 font-semibold">
                        {t('plugin.gitPermission.allFixed')}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {t('plugin.gitPermission.allFixedDesc')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {result && !error && result.failed! > 0 && result.fixed! > 0 && (
                <div className="border-warning border-l-warning bg-warning/10 rounded-lg border border-l-4 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-warning mt-0.5 size-5" />
                    <div className="flex-1">
                      <h4 className="text-foreground mb-1 font-semibold">
                        {t('plugin.gitPermission.partialFixed')}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {t('plugin.gitPermission.partialFixedDesc')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end border-t pt-4">
              <Button onClick={handleClose}>
                {t('common.close')}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
    <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('plugin.gitPermission.closeWarningTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('plugin.gitPermission.closeWarningDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.continueWaiting')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => { setShowCloseConfirm(false); onClose() }}
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

export default GitPermissionFixDialog
