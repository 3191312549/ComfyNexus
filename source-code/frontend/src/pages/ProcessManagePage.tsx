/**
 * 进程管理页面
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Button, 
  Toast,
  Loading,
} from '@/components/ui'
import { useProcessStore } from '@/stores/useProcessStore'
import { mockProcessApi } from '@/mocks/process'
import { Play, Square, RotateCw, Trash2, ExternalLink } from 'lucide-react'

export default function ProcessManagePage() {
  const { t } = useTranslation()
  const { status, logs, loading, setStatus, setLogs, clearLogs, setLoading } = useProcessStore()
  const [toast, setToast] = useState<{ open: boolean; title: string; variant: 'success' | 'error' }>({
    open: false,
    title: '',
    variant: 'success',
  })

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [processStatus, processLogs] = await Promise.all([
          mockProcessApi.getStatus(),
          mockProcessApi.getLogs(),
        ])
        setStatus(processStatus)
        setLogs(processLogs)
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [setStatus, setLogs, setLoading])

  const handleStart = async () => {
    try {
      setLoading(true)
      const newStatus = await mockProcessApi.startComfyUI()
      setStatus(newStatus)
      setToast({ open: true, title: 'ComfyUI 启动成功', variant: 'success' })
    } catch (error) {
      console.error('Failed to start ComfyUI:', error)
      setToast({ open: true, title: '启动失败', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    try {
      setLoading(true)
      await mockProcessApi.stopComfyUI()
      setStatus({ isRunning: false })
      setToast({ open: true, title: 'ComfyUI 已停止', variant: 'success' })
    } catch (error) {
      console.error('Failed to stop ComfyUI:', error)
      setToast({ open: true, title: '停止失败', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleRestart = async () => {
    await handleStop()
    setTimeout(() => handleStart(), 1000)
  }

  const handleOpenBrowser = () => {
    if (status.url) {
      window.open(status.url, '_blank')
    }
  }

  if (loading && !status.isRunning) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loading size="lg" text={t('common.loading')} />
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* 进程状态 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('process.processStatus')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={`size-3 rounded-full ${
                    status.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                  }`}
                />
                <span className="font-medium">
                  {status.isRunning ? t('process.running') : t('process.stopped')}
                </span>
              </div>
              {status.isRunning && status.pid && (
                <span className="text-sm text-muted-foreground">
                  PID: {status.pid}
                </span>
              )}
              {status.isRunning && status.port && (
                <span className="text-sm text-muted-foreground">
                  {t('process.port')}: {status.port}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!status.isRunning ? (
                <Button onClick={handleStart} disabled={loading}>
                  <Play className="mr-2 size-4" />
                  {t('process.startComfyUI')}
                </Button>
              ) : (
                <>
                  <Button variant="destructive" onClick={handleStop} disabled={loading}>
                    <Square className="mr-2 size-4" />
                    {t('process.stopComfyUI')}
                  </Button>
                  <Button variant="outline" onClick={handleRestart} disabled={loading}>
                    <RotateCw className="mr-2 size-4" />
                    {t('process.restartComfyUI')}
                  </Button>
                  {status.url && (
                    <Button variant="outline" onClick={handleOpenBrowser}>
                      <ExternalLink className="mr-2 size-4" />
                      打开浏览器
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 运行日志 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('process.logs')}</CardTitle>
            <Button variant="outline" size="sm" onClick={clearLogs}>
              <Trash2 className="mr-2 size-4" />
              {t('process.clearLogs')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 h-96 overflow-y-auto rounded-lg p-4 font-mono text-sm">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            ) : (
              <div className="text-gray-500">{t("process.noLogs")}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Toast 提示 */}
      <Toast
        open={toast.open}
        onClose={() => setToast({ ...toast, open: false })}
        title={toast.title}
        variant={toast.variant}
      />
    </div>
  )
}
