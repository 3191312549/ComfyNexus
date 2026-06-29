import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, RotateCcw, AlertCircle, CheckCircle, ExternalLink, FileCheck, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/progress'
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
import { useAppUpdateStore, LocalFileInfo } from '@/stores/useAppUpdateStore'

type UpdateStatus = 'available' | 'checking_local' | 'resuming' | 'downloading' | 'ready' | 'error'

interface UpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentVersion: string
}

export function UpdateDialog({ open, onOpenChange, currentVersion }: UpdateDialogProps) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<UpdateStatus>('available')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [, setLocalFileInfo] = useState<LocalFileInfo | null>(null)
  const [resumedFrom, setResumedFrom] = useState(0)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  
  const { updateInfo } = useAppUpdateStore()

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateString: string): string => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  useEffect(() => {
    if (open) {
      setStatus('available')
      setError(null)
      setProgress(0)
      setLocalFileInfo(null)
      setResumedFrom(0)
    }
  }, [open])

  const checkLocalUpdate = useCallback(async (): Promise<LocalFileInfo | null> => {
    try {
      const api = (window as any).pywebview?.api
      if (!api) {
        return null
      }

      const result = await api.check_local_update()
      
      if (result.success) {
        const info: LocalFileInfo = {
          exists: result.has_local_file,
          filePath: result.file_path,
          hashMatch: result.hash_match,
          fileSize: result.file_size,
          partialDownload: result.partial_download
        }
        setLocalFileInfo(info)
        return info
      }
      
      return null
    } catch (err) {
      console.error('检查本地更新失败:', err)
      return null
    }
  }, [])

  const handleDownloadUpdate = useCallback(async () => {
    setStatus('checking_local')
    setError(null)
    setProgress(0)

    try {
      const api = (window as any).pywebview?.api
      if (!api) {
        throw new Error('API not available')
      }

      const localInfo = await checkLocalUpdate()
      
      if (localInfo?.exists && localInfo.hashMatch) {
        setStatus('downloading')
        setProgress(100)
        
        const result = await api.download_update()
        
        if (result.success) {
          setStatus('ready')
          return
        }
        
        setError(result.error || t('update.downloadError'))
        setStatus('error')
        return
      }
      
      if (localInfo?.partialDownload?.hasPartial && 
          localInfo.partialDownload.versionMatch && 
          localInfo.partialDownload.hashMatch) {
        setResumedFrom(localInfo.partialDownload.percentage)
        setStatus('resuming')
      } else {
        setStatus('downloading')
      }

      ;(window as any).__updateProgress = (downloaded: number, total: number) => {
        const percentage = total > 0 ? Math.round((downloaded / total) * 100) : 0
        setProgress(percentage)
      }

      const result = await api.download_update()

      if (!result.success) {
        setError(result.error || t('update.downloadError'))
        setStatus('error')
        return
      }

      setStatus('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('update.downloadError'))
      setStatus('error')
    } finally {
      ;(window as any).__updateProgress = undefined
    }
  }, [t, checkLocalUpdate])

  const handleApplyUpdate = useCallback(async () => {
    try {
      const api = (window as any).pywebview?.api
      if (!api) {
        throw new Error('API not available')
      }

      const result = await api.apply_update()

      if (!result.success) {
        setError(result.message || t('update.updateError'))
        setStatus('error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('update.updateError'))
      setStatus('error')
    }
  }, [t])

  const isBusy = status === 'downloading' || status === 'checking_local' || status === 'resuming'

  const handleClose = useCallback(() => {
    if (isBusy) {
      setShowCloseConfirm(true)
      return
    }
    onOpenChange(false)
  }, [isBusy, onOpenChange])

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) handleClose()
  }, [handleClose])

  const renderContent = () => {
    switch (status) {
      case 'checking_local':
        return (
          <div className="flex flex-col items-center justify-center gap-6 py-8">
            <FileCheck className="size-10 animate-pulse text-primary" />
            <div className="space-y-2 text-center">
              <p className="font-medium">{t('update.checkingLocal') || '正在检查本地文件...'}</p>
              <p className="text-sm text-muted-foreground">{t('update.pleaseWait') || '请稍候'}</p>
            </div>
          </div>
        )

      case 'resuming':
        return (
          <div className="flex flex-col items-center justify-center gap-6 py-8">
            <RefreshCw className="size-10 animate-spin text-primary" />
            <div className="w-full max-w-sm space-y-3">
              <p className="text-center text-muted-foreground">
                {t('update.resuming') || '继续下载'} ({resumedFrom}% {t('update.completed') || '已完成'})
              </p>
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">{progress}%</p>
            </div>
          </div>
        )

      case 'downloading':
        return (
          <div className="flex flex-col items-center justify-center gap-6 py-8">
            <Download className="size-10 animate-pulse text-primary" />
            <div className="w-full max-w-sm space-y-3">
              <p className="text-center text-muted-foreground">{t('update.downloading') || '正在下载...'}</p>
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">{progress}%</p>
            </div>
          </div>
        )

      case 'ready':
        return (
          <div className="flex flex-col items-center justify-center gap-6 py-8">
            <CheckCircle className="size-10 text-success" />
            <div className="space-y-2 text-center">
              <p className="font-medium">{t('update.readyToUpdate') || '准备更新'}</p>
              <p className="text-sm text-muted-foreground">{t('update.pleaseWait') || '请稍候'}</p>
            </div>
            <Button onClick={handleApplyUpdate} size="lg">
              <RotateCcw className="mr-2 size-4" />
              {t('update.restartToUpdate') || '重启并更新'}
            </Button>
          </div>
        )

      case 'error':
        return (
          <div className="flex flex-col items-center justify-center gap-6 py-8">
            <AlertCircle className="size-10 text-destructive" />
            <p className="text-destructive">{error || t('update.updateError') || '更新失败'}</p>
            <div className="flex gap-2">
              <Button onClick={handleDownloadUpdate} variant="outline" size="sm">
                {t('update.retry') || '重试'}
              </Button>
              <Button onClick={handleClose} variant="ghost" size="sm">
                {t('common.close') || '关闭'}
              </Button>
            </div>
          </div>
        )

      default:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle className="size-5" />
              <span className="font-semibold">{t('update.foundUpdate') || '发现新版本'}</span>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-border/50 py-2">
                    <span className="text-sm text-muted-foreground">{t('update.currentVersion') || '当前版本'}</span>
                    <span className="font-mono text-sm">{updateInfo?.currentVersion || currentVersion}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/50 py-2">
                    <span className="text-sm text-muted-foreground">{t('update.latestVersion') || '最新版本'}</span>
                    <span className="font-mono text-sm font-medium text-primary">{updateInfo?.latestVersion}</span>
                  </div>
                  {updateInfo?.fileSize && (
                    <div className="flex items-center justify-between border-b border-border/50 py-2">
                      <span className="text-sm text-muted-foreground">{t('update.fileSize') || '文件大小'}</span>
                      <span className="text-sm">{formatFileSize(updateInfo.fileSize)}</span>
                    </div>
                  )}
                  {updateInfo?.publishedAt && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-muted-foreground">{t('update.releaseDate') || '发布日期'}</span>
                      <span className="text-sm">{formatDate(updateInfo.publishedAt)}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Button onClick={handleDownloadUpdate} size="sm" className="w-full">
                    <Download className="mr-2 size-4" />
                    {t('update.downloadNow') || '立即下载'}
                  </Button>
                  <Button onClick={handleClose} variant="outline" size="sm" className="w-full">
                    {t('update.remindLater') || '稍后提醒'}
                  </Button>
                </div>
              </div>

              <div className="col-span-2 flex flex-col">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <ExternalLink className="size-4" />
                  {t('update.releaseNotes') || '更新日志'}
                </div>
                <div className="max-h-64 flex-1 overflow-y-auto rounded-lg bg-muted/30 p-4">
                  {updateInfo?.releaseNotes ? (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {updateInfo.releaseNotes}
                    </div>
                  ) : (
                    <div className="text-sm italic text-muted-foreground">
                      {t('update.noReleaseNotes') || '暂无更新日志'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-h-[600px] sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{t('update.title') || '软件更新'}</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
    <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('update.closeWarningTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('update.closeWarningDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.continueWaiting')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setShowCloseConfirm(false)
              ;(window as any).__updateProgress = undefined
              onOpenChange(false)
            }}
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

export default UpdateDialog
