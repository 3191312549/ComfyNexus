/**
 * PyPI 镜像源测速 Dialog 组件
 * 显示所有镜像源的测速进度和结果
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui'
import { Gauge, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react'

interface PyPIMirrorSpeedTestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SpeedTestResult {
  source: string
  latency: number
  timestamp: number
}

const SOURCE_KEYS = ['tuna', 'bfsu', 'aliyun', 'tencent', 'official'] as const

export function PyPIMirrorSpeedTestDialog({ open, onOpenChange }: PyPIMirrorSpeedTestDialogProps) {
  const { t } = useTranslation()
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState<SpeedTestResult[]>([])
  const [results, setResults] = useState<Record<string, number> | null>(null)
  const [pollTimer, setPollTimer] = useState<ReturnType<typeof setInterval> | null>(null)

  const pollStatus = useCallback(async () => {
    if (!window.pywebview?.api) return
    try {
      const status = await window.pywebview.api.get_pypi_mirror_speed_test_status()
      if (status.success) {
        setIsRunning(status.isRunning)
        setProgress(status.progress || [])
        setResults(status.results || null)

        if (!status.isRunning && pollTimer) {
          clearInterval(pollTimer)
          setPollTimer(null)
        }
      }
    } catch (e) {
      console.error('[PyPIMirrorSpeedTestDialog] 轮询状态失败:', e)
    }
  }, [pollTimer])

  const startTest = async () => {
    if (!window.pywebview?.api) return
    try {
      setProgress([])
      setResults(null)
      const result = await window.pywebview.api.start_pypi_mirror_speed_test()
      if (result.success) {
        setIsRunning(true)
        const timer = setInterval(pollStatus, 1000)
        setPollTimer(timer)
      } else {
        console.error('[PyPIMirrorSpeedTestDialog] 启动测速失败:', result.message)
      }
    } catch (e) {
      console.error('[PyPIMirrorSpeedTestDialog] 启动测速异常:', e)
    }
  }

  useEffect(() => {
    if (open) {
      pollStatus()
    }
    return () => {
      if (pollTimer) {
        clearInterval(pollTimer)
      }
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (pollTimer) {
        clearInterval(pollTimer)
      }
    }
  }, [pollTimer])

  const displayResults = results || buildResultsFromProgress(progress)

  const totalTests = SOURCE_KEYS.length
  const completedTests = progress.length
  const progressPercent = totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0

  const handleOpenChange = useCallback((v: boolean) => {
    if (!v && isRunning && pollTimer) {
      clearInterval(pollTimer)
      setPollTimer(null)
    }
    onOpenChange(v)
  }, [isRunning, pollTimer, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="size-5" />
            {t('settings.pypiMirror.speedTestTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isRunning && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t('settings.pypiMirror.testingInProgress')}
            </div>
          )}

          {!isRunning && results && (
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="size-4" />
              {t('settings.pypiMirror.testComplete')}
            </div>
          )}

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">{t('settings.pypiMirror.mirrorSource')}</th>
                  <th className="px-3 py-2 text-center font-medium">{t('settings.pypiMirror.latency')}</th>
                  <th className="px-3 py-2 text-center font-medium">{t('settings.pypiMirror.status')}</th>
                </tr>
              </thead>
              <tbody>
                {SOURCE_KEYS.map((key) => {
                  const label = t(`settings.pypiMirror.sources.${key}`)
                  const latency = displayResults[key] || 0
                  const isBest = latency > 0 && latency < 300
                  const isFailed = latency === -1
                  const isPending = latency === 0

                  return (
                    <tr key={key} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium">{label}</td>
                      <td className="px-3 py-2 text-center">
                        <LatencyCell latency={latency} isRunning={isRunning} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        {isPending ? (
                          isRunning ? (
                            <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Clock className="mx-auto size-4 text-muted-foreground" />
                          )
                        ) : isBest ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                            ✅ {t('settings.pypiMirror.recommended')}
                          </span>
                        ) : isFailed ? (
                          <XCircle className="mx-auto size-4 text-danger" />
                        ) : (
                          <CheckCircle2 className="mx-auto size-4 text-success" />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {isRunning && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('settings.pypiMirror.progress')}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {!isRunning && !results && (
            <Button onClick={startTest}>
              <Gauge className="mr-2 size-4" />
              {t('settings.pypiMirror.startTest')}
            </Button>
          )}
          {!isRunning && results && (
            <Button onClick={startTest}>
              <Gauge className="mr-2 size-4" />
              {t('settings.pypiMirror.retest')}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LatencyCell({ latency, isRunning }: { latency: number; isRunning: boolean }) {
  if (latency === 0 && isRunning) {
    return <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" />
  }
  if (latency === 0) {
    return <span className="text-muted-foreground">-</span>
  }
  if (latency < 0) {
    return <span className="text-danger">✗</span>
  }
  const display = getLatencyColor(latency)
  return <span className={display.className}>{latency}ms</span>
}

function getLatencyColor(latency: number) {
  if (latency < 200) return { className: 'text-success font-medium' }
  if (latency < 500) return { className: 'text-warning' }
  return { className: 'text-danger' }
}

function buildResultsFromProgress(progress: SpeedTestResult[]): Record<string, number> {
  const results: Record<string, number> = {}
  for (const item of progress) {
    results[item.source] = item.latency
  }
  return results
}
