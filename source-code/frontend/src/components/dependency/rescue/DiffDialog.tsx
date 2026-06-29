/**
 * 差异展示对话框
 *
 * 展示当前环境与快照之间的依赖/插件差异，
 * 提供确认恢复按钮，恢复完成后展示恢复报告。
 */

import { useTranslation } from 'react-i18next'
import { useEffect, useRef, useState } from 'react'
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
import { Badge } from '@/components/ui/Badge'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRescueStore } from '@/stores/useRescueStore'
import type { SnapshotInfo, DiffResult, RestoreReport } from '@/types/rescue'

/** 模拟进度：running 时缓慢爬升到 90%，完成后跳到 100% */
function useSimulatedProgress(active: boolean, done: boolean): number {
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (active && !done) {
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
      if (done) setProgress(100)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [active, done])

  return progress
}

interface Props {
  snapshot: SnapshotInfo
  open: boolean
  onClose: () => void
}

export default function DiffDialog({ snapshot, open, onClose }: Props) {
  const { t } = useTranslation()
  const { computeDiff, executeSmartRollback, restoring } = useRescueStore()

  const [diff, setDiff] = useState<DiffResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<RestoreReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const progress = useSimulatedProgress(restoring, !!report)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    computeDiff(snapshot.filePath).then((result) => {
      if (result) {
        setDiff(result)
      } else {
        setError(t('rescue.diff.calculateFailed'))
      }
      setLoading(false)
    })
  }, [open, snapshot.filePath, computeDiff])

  const backupOption = diff?.backupOption ?? 'all'
  const compareDeps = backupOption === 'deps_only' || backupOption === 'all'
  const comparePlugins = backupOption === 'plugins_only' || backupOption === 'all'

  const isEmpty = diff &&
    (!compareDeps || (
      diff.dependencies.added.length === 0 &&
      diff.dependencies.removed.length === 0 &&
      diff.dependencies.changed.length === 0
    )) &&
    (!comparePlugins || (
      diff.plugins.added.length === 0 &&
      diff.plugins.removed.length === 0
    ))

  const handleRollback = async () => {
    const result = await executeSmartRollback(snapshot.filePath)
    if (result) setReport(result)
  }

  const handleOpenChange = (v: boolean) => {
    if (!v && restoring) {
      setShowCloseConfirm(true)
      return
    }
    if (!v) onClose()
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{report ? t('rescue.diff.reportTitle') : t('rescue.diff.compareTitle')}</DialogTitle>
        </DialogHeader>
        <div className={cn('space-y-4', !report && 'max-h-[60vh] overflow-y-auto')}>
          {loading && (
            <p className="py-4 text-sm text-content-secondary">
              {t('rescue.diff.calculating')}
            </p>
          )}

          {error && (
            <p className="py-4 text-sm text-danger">{error}</p>
          )}

          {!loading && !error && isEmpty && !report && (
            <div className="space-y-2 py-4">
              <p className="text-sm text-content-secondary">
                {t('rescue.diff.noDiff')}
              </p>
              {backupOption !== 'all' && (
                <p className="text-xs text-warning">
                  {t('rescue.diff.snapshotPartialWithType', { type: backupOption === 'deps_only' ? t('rescue.diff.typeDeps') : t('rescue.diff.typePlugins') })}
                </p>
              )}
            </div>
          )}

          {!loading && !error && diff && !isEmpty && !report && !restoring && (
            <div className="space-y-4">
              {backupOption !== 'all' && (
                <p className="rounded bg-warning/10 px-3 py-1.5 text-xs text-warning">
                  {t('rescue.diff.snapshotPartialCompareNote', { type: backupOption === 'deps_only' ? t('rescue.diff.typeDeps') : t('rescue.diff.typePlugins') })}
                </p>
              )}
              {(diff.dependencies.added.length > 0 || diff.dependencies.removed.length > 0 || diff.dependencies.changed.length > 0) && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-content-primary">
                    {t('rescue.diff.depsDiff')}
                  </h4>
                  <div className="overflow-hidden rounded-md border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left text-content-secondary">{t("rescue.operation")}</th>
                          <th className="px-3 py-2 text-left text-content-secondary">{t("rescue.packageName")}</th>
                          <th className="px-3 py-2 text-left text-content-secondary">{t("rescue.detail")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {diff.dependencies.added.map((d) => (
                          <tr key={`add-${d.name}`}>
                            <td className="px-3 py-1.5"><Badge variant="destructive" className="text-xs">{t("rescue.uninstall")}</Badge></td>
                            <td className="px-3 py-1.5 text-content-primary">{d.name}</td>
                            <td className="px-3 py-1.5 text-content-secondary">{d.version}</td>
                          </tr>
                        ))}
                        {diff.dependencies.removed.map((d) => (
                          <tr key={`rm-${d.name}`}>
                            <td className="px-3 py-1.5"><Badge className="text-success-foreground bg-success text-xs">{t("rescue.install")}</Badge></td>
                            <td className="px-3 py-1.5 text-content-primary">{d.name}</td>
                            <td className="px-3 py-1.5 text-content-secondary">{d.version}</td>
                          </tr>
                        ))}
                        {diff.dependencies.changed.map((d) => (
                          <tr key={`chg-${d.name}`}>
                            <td className="px-3 py-1.5"><Badge variant="secondary" className="text-xs">{t("rescue.change")}</Badge></td>
                            <td className="px-3 py-1.5 text-content-primary">{d.name}</td>
                            <td className="px-3 py-1.5 text-content-secondary">{d.current} → {d.snapshot}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {(diff.plugins.added.length > 0 || diff.plugins.removed.length > 0) && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-content-primary">
                    {t('rescue.diff.pluginsDiff')}
                  </h4>
                  <div className="overflow-hidden rounded-md border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left text-content-secondary">{t("rescue.operation")}</th>
                          <th className="px-3 py-2 text-left text-content-secondary">{t("rescue.pluginName")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {diff.plugins.added.map((p) => (
                          <tr key={`padd-${p}`}>
                            <td className="px-3 py-1.5"><Badge variant="destructive" className="text-xs">{t("rescue.delete")}</Badge></td>
                            <td className="px-3 py-1.5 text-content-primary">{p}</td>
                          </tr>
                        ))}
                        {diff.plugins.removed.map((p) => (
                          <tr key={`prm-${p}`}>
                            <td className="px-3 py-1.5"><Badge className="text-success-foreground bg-success text-xs">{t("rescue.restore")}</Badge></td>
                            <td className="px-3 py-1.5 text-content-primary">{p}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {(restoring || (report && progress > 0)) && !report && (
            <div className="space-y-4 py-2">
              <div className="flex justify-center">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
              <div className="space-y-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-content-muted">
                  <span>{t("rescue.restoring")}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
              </div>
            </div>
          )}

          {report && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      report.failed > 0 ? 'bg-warning' : 'bg-success'
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-content-muted">
                  <span>{report.failed > 0 ? t('rescue.restoreAction.restorePartialFailed') : t('rescue.restoreAction.restoreComplete')}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {report.failed > 0
                  ? <XCircle className="size-5 shrink-0 text-warning" />
                  : <CheckCircle2 className="size-5 shrink-0 text-success" />
                }
                <span className="text-sm font-medium">
                  {report.failed > 0 ? t('rescue.restoreAction.partialFailed') : t('rescue.restoreAction.restoreSuccess')}
                </span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-content-secondary">
                  {t('rescue.report.total')}: <span className="font-medium text-content-primary">{report.totalItems}</span>
                </span>
                <span className="text-success">{t('rescue.report.successCount')}: {report.succeeded}</span>
                {report.failed > 0 && (
                  <span className="text-danger">{t('rescue.report.failedCount')}: {report.failed}</span>
                )}
              </div>
              {report.failures.length > 0 && (
                <div>
                  <h4 className="mb-1 text-sm font-medium text-danger">{t("rescue.failDetail")}</h4>
                  <div className="space-y-1">
                    {report.failures.map((f, i) => (
                      <div key={i} className="rounded bg-danger/10 px-2 py-1 text-xs text-content-secondary">
                        <span className="font-medium">{f.item}</span>: {f.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          {report ? (
            <Button onClick={onClose}>{t("common.close")}</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
              {!isEmpty && diff && (
                <Button onClick={handleRollback} disabled={restoring || loading}>
                  {restoring ? t('rescue.diff.restoring') : t('rescue.restoreAction.confirm')}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('rescue.closeWarningTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('rescue.closeWarningDescription')}
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
