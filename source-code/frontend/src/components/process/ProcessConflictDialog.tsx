/**
 * 进程冲突提示对话框组件
 * 
 * 当检测到不受管理的 ComfyUI 进程时显示此对话框，
 * 提供三种操作选项：结束进程、继续启动、取消
 */

import { Trans, useTranslation } from 'react-i18next'
import React from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ConflictProcess } from '@/types/process'

/**
 * ProcessConflictDialog 组件属性
 */
export interface ProcessConflictDialogProps {
  /** 是否打开对话框 */
  open: boolean
  /** 冲突进程列表 */
  processes: ConflictProcess[]
  /** 是否存在端口冲突 */
  hasPortConflict: boolean
  /** 目标端口 */
  targetPort: number
  /** 结束进程回调 */
  onKillProcesses: () => Promise<void>
  /** 继续启动回调 */
  onContinue: () => void
  /** 取消回调 */
  onCancel: () => void
  /** 是否正在处理（可选） */
  loading?: boolean
}

/**
 * 进程冲突提示对话框组件
 * 
 * @example
 * ```tsx
 * <ProcessConflictDialog
 *   open={showDialog}
 *   processes={conflictProcesses}
 *   hasPortConflict={true}
 *   targetPort={8188}
 *   onKillProcesses={handleKillProcesses}
 *   onContinue={handleContinue}
 *   onCancel={handleCancel}
 * />
 * ```
 */
export const ProcessConflictDialog: React.FC<ProcessConflictDialogProps> = ({
  open,
  processes,
  hasPortConflict,
  targetPort,
  onKillProcesses,
  onContinue,
  onCancel,
  loading = false,
}) => {
  const { t, i18n } = useTranslation()
  /**
   * 处理结束进程操作
   */
  const handleKillProcesses = async () => {
    try {
      await onKillProcesses()
    } catch (error) {
      console.error('[ProcessConflictDialog] 结束进程失败:', error)
      // 错误处理由父组件负责（通过 Toast 显示）
    }
  }

  /**
   * 格式化时间戳为可读字符串
   */
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleString(i18n.language, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && loading) return
      if (!isOpen) onCancel()
    }}>
      <AlertDialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        {/* 对话框标题和描述 */}
        <AlertDialogHeader>
          <AlertDialogTitle>{t("process.conflict.detected")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('process.conflict.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* 对话框内容 */}
        <div className="space-y-4 py-4">
          {/* 端口冲突警告 */}
          {hasPortConflict && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>{t("process.conflict.portWarning")}</AlertTitle>
              <AlertDescription>
                <Trans
                  i18nKey="process.conflict.portConflictDesc"
                  values={{ port: targetPort }}
                  components={{ strong: <strong /> }}
                />
              </AlertDescription>
            </Alert>
          )}

          {/* 进程列表 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">
              {t('process.conflict.unmanagedProcesses', { count: processes.length })}
            </h4>
            
            <div className="max-h-[300px] space-y-2 overflow-y-auto">
              {processes.map((proc) => (
                <Card key={proc.pid} className="border-muted">
                  <CardContent className="py-4">
                    <div className="space-y-2 text-sm">
                      {/* 进程 ID */}
                      <div className="flex items-start gap-2">
                        <span className="min-w-[80px] font-semibold text-muted-foreground">
                          {t('process.conflict.processId')}
                        </span>
                        <span className="font-mono text-foreground">
                          {proc.pid}
                        </span>
                      </div>

                      {/* 监听端口 */}
                      <div className="flex items-start gap-2">
                        <span className="min-w-[80px] font-semibold text-muted-foreground">
                          {t('process.conflict.listenPort')}
                        </span>
                        <span className="font-mono text-foreground">
                          {proc.port}
                          {proc.port === targetPort && (
                            <span className="ml-2 text-xs font-semibold text-destructive">
                              {t('process.conflict.conflictTag')}
                            </span>
                          )}
                        </span>
                      </div>

                      {/* 工作目录 */}
                      <div className="flex items-start gap-2">
                        <span className="min-w-[80px] font-semibold text-muted-foreground">
                          {t('process.conflict.workingDir')}
                        </span>
                        <span className="break-all font-mono text-xs text-muted-foreground">
                          {proc.cwd}
                        </span>
                      </div>

                      {/* 创建时间 */}
                      <div className="flex items-start gap-2">
                        <span className="min-w-[80px] font-semibold text-muted-foreground">
                          {t('process.conflict.createTime')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(proc.create_time)}
                        </span>
                      </div>

                      {/* 命令行（可选展开） */}
                      {proc.cmdline && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                            {t('process.conflict.viewCmdline')}
                          </summary>
                          <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">
                            {proc.cmdline}
                          </pre>
                        </details>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* 操作说明 */}
          <div className="rounded-md bg-muted p-3">
            <p className="text-sm text-muted-foreground">
              <strong>{t("process.conflict.operationGuide")}:</strong>
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>
                <strong>{t("process.conflict.killProcess")}:</strong>
                {t('process.conflict.killProcessDesc')}
              </li>
              <li>
                <strong>{t("process.conflict.continueStart")}:</strong>
                {t('process.conflict.continueStartDesc')}
              </li>
              <li>
                <strong>{t("process.conflict.cancel")}:</strong>
                {t('process.conflict.cancelDesc')}
              </li>
            </ul>
          </div>
        </div>

        {/* 操作按钮 */}
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {t('process.conflict.cancel')}
          </Button>
          <Button
            variant="secondary"
            onClick={onContinue}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {t('process.conflict.continueStartNotRecommended')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleKillProcesses}
            disabled={loading}
            className="flex w-full items-center gap-2 sm:w-auto"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? t('process.conflict.killingProcess') : t('process.conflict.killAndStart')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
