/**
 * Civitai 拉取方式选择弹窗
 */

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
import { useTranslation } from 'react-i18next'
import { CloudDownload, RefreshCw, Loader2, Hash, Search, CheckCircle, Minimize2, Square, AlertTriangle } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import type { LoraModel } from '@/services/bridge'

interface ProgressInfo {
  stage: 'hash' | 'fetch' | 'done'
  current: number
  total: number
  message: string
  modelData?: LoraModel | null
}

interface CivitaiPullModalProps {
  open: boolean
  onClose: () => void
  onFullPull: () => void
  onIncrementalPull: () => void
  onStop: () => void
  loading: boolean
  progress: ProgressInfo | null
  minimized: boolean
  stopping: boolean
  onToggleMinimize: () => void
}

const stageIcons: Record<string, React.ReactNode> = {
  hash: <Hash className="size-4" />,
  fetch: <Search className="size-4" />,
  done: <CheckCircle className="size-4 text-success" />
}

function getStageLabels(t: (key: string) => string): Record<string, string> {
  return {
    hash: t('lora.pullStage.hash'),
    fetch: t('lora.pullStage.fetch'),
    done: t('lora.pullStage.done')
  }
}

export function CivitaiPullModal({ 
  open, 
  onClose, 
  onFullPull, 
  onIncrementalPull, 
  onStop,
  loading,
  progress,
  minimized,
  stopping,
  onToggleMinimize
}: CivitaiPullModalProps) {
  const { t } = useTranslation()
  const [showForceCloseConfirm, setShowForceCloseConfirm] = useState(false)
  const [stoppingTimeout, setStoppingTimeout] = useState(false)
  const stoppingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stageLabels = getStageLabels(t)

  useEffect(() => {
    if (stopping) {
      stoppingTimerRef.current = setTimeout(() => {
        setStoppingTimeout(true)
      }, 15000)
    } else {
      setStoppingTimeout(false)
      if (stoppingTimerRef.current) {
        clearTimeout(stoppingTimerRef.current)
        stoppingTimerRef.current = null
      }
    }
    return () => {
      if (stoppingTimerRef.current) {
        clearTimeout(stoppingTimerRef.current)
      }
    }
  }, [stopping])
  const progressPercent = progress && progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : (progress?.stage === 'done' ? 100 : 0)

  if (minimized && loading && progress) {
    return (
      <div 
        className="animate-in fade-in slide-in-from-bottom-2 fixed bottom-5 right-5 z-50 cursor-pointer rounded-lg border border-border bg-surface p-3 shadow-xl"
        onClick={onToggleMinimize}
      >
        <div className="flex items-center gap-2 text-sm">
          {stopping ? (
            <Square className="size-4 text-warning" />
          ) : (
            <Loader2 className="size-4 animate-spin text-primary" />
          )}
          <span className="font-medium">{stopping ? t('lora.pullStage.stopping') : stageLabels[progress.stage]}</span>
          <span className="text-muted-foreground">
            {progress.current} / {progress.total}
          </span>
          <span className={stopping ? "font-medium text-warning" : "font-medium text-primary"}>
            {progressPercent}%
          </span>
        </div>
      </div>
    )
  }

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      if (loading && progress && progress.stage !== 'done') {
        onToggleMinimize()
      } else {
        onClose()
      }
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t("common.title.pullFromCivitai")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 overflow-y-auto flex-1 pr-2 -mr-2">
          {(loading || (progress && progress.stage === 'done')) && progress ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {stopping ? (
                    <Square className="size-4 text-warning" />
                  ) : progress.stage === 'done' ? (
                    <CheckCircle className="size-4 text-success" />
                  ) : (
                    stageIcons[progress.stage] || <Loader2 className="size-4 animate-spin" />
                  )}
                  <span className={stopping ? 'text-warning' : progress.stage === 'done' ? 'text-success' : ''}>
                    {stopping ? t('lora.pullStage.stopping') + '...' : (stageLabels[progress.stage] || t('lora.pullStage.processing'))}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {progress.current} / {progress.total} ({progressPercent}%)
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div 
                    className={`h-full transition-all duration-300 ease-out ${stopping ? 'bg-warning' : progress.stage === 'done' ? 'bg-success' : 'bg-primary'}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                
                <div 
                  className="max-h-20 overflow-y-auto rounded-md bg-muted/50 px-4 py-2 text-center text-sm text-muted-foreground break-words"
                  title={stopping ? t('lora.pullStage.stoppingWait') : progress.message}
                >
                  {stopping ? t('lora.pullStage.stoppingWait') : progress.message}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-2 flex-shrink-0">
                {progress.stage === 'done' ? (
                  <Button 
                    onClick={onClose}
                    className="gap-2"
                  >
                    <CheckCircle className="size-4" />
                    {t('common.close')}
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={onToggleMinimize}
                      className="gap-2 flex-shrink-0"
                      disabled={stopping}
                    >
                      <Minimize2 className="size-4" />
                      {t('lora.pull.minimize')}
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setShowForceCloseConfirm(true)}
                      className="gap-2 flex-shrink-0 text-muted-foreground"
                      disabled={stopping && !stoppingTimeout}
                    >
                      {t('common.forceClose')}
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={onStop}
                      className="gap-2 flex-shrink-0"
                      disabled={stopping}
                    >
                      {stopping ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Square className="size-4" />
                      )}
                      {stopping ? t('lora.pull.stopping') : t('lora.pull.stop')}
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
                  <div className="text-sm">
                    <div className="mb-1 font-medium text-warning">{t("lora.pull.beforeUse")}:</div>
                    <ul className="list-inside list-disc space-y-1 text-warning/80">
                      <li>{t('lora.pull.civitaiApiKeyConfigured')}</li>
                      <li>{t('lora.pull.proxyConfigured')}</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {t('lora.pull.selectPullMethod')}:
              </p>
              
              <div className="space-y-3">
                <Button
                  onClick={() => {
                    onFullPull()
                  }}
                  disabled={loading}
                  className="h-auto w-full justify-start gap-4 py-4"
                  variant="outline"
                >
                  {loading ? (
                    <Loader2 className="size-6 shrink-0 animate-spin" />
                  ) : (
                    <RefreshCw className="size-6 shrink-0" />
                  )}
                  <div className="text-left min-w-0 flex-1">
                    <div className="text-base font-medium whitespace-normal">{t("lora.pull.fullPull")}</div>
                    <div className="text-sm font-normal text-muted-foreground whitespace-normal">
                      {t('lora.pull.fullPullDescription')}
                    </div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => {
                    onIncrementalPull()
                  }}
                  disabled={loading}
                  className="h-auto w-full justify-start gap-4 py-4"
                  variant="outline"
                >
                  {loading ? (
                    <Loader2 className="size-6 shrink-0 animate-spin" />
                  ) : (
                    <CloudDownload className="size-6 shrink-0" />
                  )}
                  <div className="text-left min-w-0 flex-1">
                    <div className="text-base font-medium whitespace-normal">{t("lora.pull.incrementalPull")}</div>
                    <div className="text-sm font-normal text-muted-foreground whitespace-normal">
                      {t('lora.pull.incrementalPullDescription')}
                    </div>
                  </div>
                </Button>
              </div>
              
              <div className="flex justify-end pt-2 flex-shrink-0">
                <Button variant="ghost" onClick={onClose} disabled={loading}>
                  {t('common.cancel')}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    <AlertDialog open={showForceCloseConfirm} onOpenChange={setShowForceCloseConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('lora.pull.forceCloseWarningTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('lora.pull.forceCloseWarningDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.continueWaiting')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => { setShowForceCloseConfirm(false); onClose() }}
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

export type { ProgressInfo }
