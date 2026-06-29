/**
 * 进度对话框组件
 * 
 * 显示批量操作的进度和结果摘要
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, XCircle, Loader2, X } from 'lucide-react'
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

export interface InstallationDetail {
  package: string
  success: boolean
  error: string | null
  logFile?: string
}

export interface InstallationReport {
  total: number
  succeeded: number
  failed: number
  skipped?: number
  details: InstallationDetail[]
}

export interface ProgressDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  progress: number
  message: string
  isComplete: boolean
  report?: InstallationReport | null
  onCancel?: () => void
  onClose?: () => void
}

export function ProgressDialog({
  open,
  onOpenChange,
  title,
  progress,
  message,
  isComplete,
  report,
  onCancel,
  onClose
}: ProgressDialogProps) {
  const { t } = useTranslation()
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const handleClose = () => {
    if (onClose) {
      onClose()
    }
    onOpenChange(false)
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
  }

  const handleOpenLogFile = async (logFile: string) => {
    try {
      if (window.pywebview?.api?.open_log_file) {
        const result = await window.pywebview.api.open_log_file(logFile)
        if (!result.success) {
          console.error('[ProgressDialog] 打开日志文件失败:', result.message)
        }
      }
    } catch (err) {
      console.error('[ProgressDialog] 打开日志文件异常:', err)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open && !isComplete) {
      setShowCloseConfirm(true)
      return
    }
    onOpenChange(open)
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title || (isComplete ? t('common.operationComplete') : t('common.processing'))}</DialogTitle>
          {!isComplete && (
            <DialogDescription>{t('dependency.processingWarning')}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {!isComplete && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-content-secondary">
                  {message}
                </span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {isComplete && report && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 rounded-lg border border-border bg-muted/50 p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-content-primary">
                    {report.total}
                  </div>
                  <div className="text-sm text-content-muted">
                    {t('common.total')}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">
                    {report.succeeded}
                  </div>
                  <div className="text-sm text-content-muted">
                    {t('common.success')}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-danger">
                    {report.failed}
                  </div>
                  <div className="text-sm text-content-muted">
                    {t('common.failed')}
                  </div>
                </div>
              </div>

              {report.details.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-content-secondary">
                    {t('common.detailInfo')}
                  </div>
                  <ScrollArea className="h-[200px] rounded-md border border-border bg-surface">
                    <div className="space-y-2 p-3">
                      {report.details.map((detail, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 rounded p-2 text-sm hover:bg-muted/50"
                        >
                          {detail.success ? (
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                          ) : (
                            <XCircle className="mt-0.5 size-4 shrink-0 text-danger" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="break-all font-mono font-medium text-content-primary">
                              {detail.package}
                            </div>
                            {!detail.success && (
                              <div className="mt-1 space-y-1 text-xs">
                                {detail.error && (
                                  <div className="whitespace-pre-wrap break-words text-danger">
                                    {detail.error}
                                  </div>
                                )}
                                {detail.logFile && (
                                  <Button
                                    onClick={() => handleOpenLogFile(detail.logFile!)}
                                    variant="link"
                                    className="block cursor-pointer p-0 text-left"
                                  >
                                    {t('common.openLogFile')}
                                  </Button>
                                )}
                              </div>
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

          {!isComplete && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
          {!isComplete ? (
            <>
              {onCancel && (
                <Button
                  variant="outline"
                  onClick={handleCancel}
                >
                  <X className="mr-2 size-4" />
                  {t('common.cancel')}
                </Button>
              )}
            </>
          ) : (
            <Button onClick={handleClose}>
              {t('common.close')}
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
            {t('common.progressCloseWarning')}
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

export default ProgressDialog
