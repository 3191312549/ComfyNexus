/**
 * 快照创建进度弹窗
 *
 * 显示创建中的动画进度条、完成提示和失败提示。
 * 由于后端为单次调用（无流式进度），进度条使用模拟动画。
 */

import { useEffect, useRef, useState } from 'react'
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
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export type ProgressStatus = 'running' | 'success' | 'error'

interface Props {
  open: boolean
  status: ProgressStatus
  snapshotName: string
  errorMessage?: string
  onClose: () => void
}

function useSimulatedProgress(status: ProgressStatus): number {
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (status === 'running') {
      setProgress(0)
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          const remaining = 90 - prev
          const step = Math.max(0.3, remaining * 0.04)
          return Math.min(90, prev + step)
        })
      }, 200)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setProgress(status === 'success' ? 100 : 0)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [status])

  return progress
}

export default function SnapshotProgressDialog({
  open,
  status,
  snapshotName,
  errorMessage,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const progress = useSimulatedProgress(status)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const isRunning = status === 'running'
  const isSuccess = status === 'success'
  const isError = status === 'error'

  const title = isRunning ? t('snapshot.creating') : isSuccess ? t('snapshot.createSuccess') : t('snapshot.createFailed')

  const handleOpenChange = (v: boolean) => {
    if (!v && isRunning) {
      setShowCloseConfirm(true)
      return
    }
    if (!v) onClose()
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="truncate text-sm text-content-secondary">
            <span className="font-medium text-content-primary">
              {snapshotName}
            </span>
          </p>

          <div className="space-y-1.5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  isError
                    ? 'bg-danger'
                    : isSuccess
                    ? 'bg-success'
                    : 'bg-primary'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-content-muted">
              <span>
                {isRunning && t('snapshot.backingUp')}
                {isSuccess && t('snapshot.dataWritten')}
                {isError && (errorMessage || t('snapshot.createError'))}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          <div className="flex justify-center py-2">
            {isRunning && (
              <Loader2 className="size-8 animate-spin text-primary" />
            )}
            {isSuccess && (
              <CheckCircle2 className="size-8 text-success" />
            )}
            {isError && (
              <XCircle className="size-8 text-danger" />
            )}
          </div>

          {!isRunning && (
            <Button
              className="w-full"
              variant={isError ? 'destructive' : 'default'}
              onClick={onClose}
            >
              {t('common.close')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
    <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('snapshot.closeWarningTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('snapshot.closeWarning')}
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
