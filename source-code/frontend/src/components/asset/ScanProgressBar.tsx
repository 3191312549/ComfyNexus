/**
 * 扫描进度条组件
 * 显示后台扫描进度
 * 支持拖拽移动位置
 */

import { useTranslation } from 'react-i18next'
import { Loader2, Square, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAssetStore } from '@/stores/useAssetStore'
import { useDraggable } from '@/hooks/useDraggable'
import { cn } from '@/lib/utils'

export function ScanProgressBar() {
  const { t } = useTranslation()
  const { scanProgress, isScanning, isStoppingScan, stopScan } = useAssetStore()

  const { position, dragHandleProps, containerRef } = useDraggable({
    boundary: 'window',
    storageKey: 'scan-progress-bar-position'
  })

  if (!isScanning || !scanProgress) {
    return null
  }

  const progressPercent = scanProgress.total > 0
    ? Math.round((scanProgress.current / scanProgress.total) * 100)
    : 0

  const isDone = scanProgress.stage === 'done'

  return (
    <div
      ref={containerRef}
      className={cn(
        "animate-in fade-in slide-in-from-bottom-2",
        "fixed z-50",
        "rounded-lg border border-border bg-surface p-3 shadow-xl",
        "min-w-[280px] max-w-[400px]"
      )}
      style={{
        left: position.x,
        top: position.y
      }}
    >
      <div
        {...dragHandleProps}
        className="-mx-1 -mt-1 mb-2 flex cursor-move select-none items-center gap-2 rounded p-1 text-sm"
      >
        {isStoppingScan ? (
          <Square className="size-4 text-warning" />
        ) : isDone ? (
          <CheckCircle className="size-4 text-success" />
        ) : (
          <Loader2 className="size-4 animate-spin text-primary" />
        )}
        <span className={cn(
          "font-medium",
          isStoppingScan ? "text-warning" : isDone ? "text-success" : ""
        )}>
          {isStoppingScan
            ? t('gallery.scan.stopping', '正在停止...')
            : isDone
              ? t('gallery.scan.complete', '扫描完成')
              : t('gallery.scan.scanning', '正在扫描')
          }
        </span>
        <span className="text-muted-foreground">
          {scanProgress.current} / {scanProgress.total}
        </span>
        <span className={cn(
          "ml-auto font-medium",
          isStoppingScan ? "text-warning" : isDone ? "text-success" : "text-primary"
        )}>
          {progressPercent}%
        </span>
      </div>

      <div className="space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full transition-all duration-300 ease-out",
              isStoppingScan ? "bg-warning" : isDone ? "bg-success" : "bg-primary"
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div
          className="max-h-12 overflow-hidden truncate text-xs text-muted-foreground"
          title={scanProgress.message}
        >
          {scanProgress.message}
        </div>
      </div>

      {!isDone && !isStoppingScan && (
        <div className="mt-2 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={stopScan}
            className="text-xs"
          >
            {t('gallery.scan.stop')}
          </Button>
        </div>
      )}
    </div>
  )
}
