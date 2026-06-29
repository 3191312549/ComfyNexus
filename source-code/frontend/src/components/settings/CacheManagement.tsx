/**
 * 缓存管理组件
 * 
 * 提供缓存统计显示和清理功能
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, RefreshCw, HardDrive, FileText, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { toast } from '@/utils/toast'

interface CacheStats {
  type: string
  name: string
  description: string
  size_bytes: number
  size_formatted: string
  file_count: number
  last_updated: string | null
  path: string
}

interface AllCacheStats {
  caches: CacheStats[]
  total_size_bytes: number
  total_size_formatted: string
  total_file_count: number
}

export function CacheManagement() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<AllCacheStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [clearingType, setClearingType] = useState<string | null>(null)
  const [clearingAll, setClearingAll] = useState(false)

  const loadStats = async () => {
    setLoading(true)
    try {
      if (!window.pywebview?.api) {
        setLoading(false)
        return
      }

      const result = await window.pywebview.api.get_cache_stats()
      if (result.success && result.data) {
        setStats(result.data)
      } else {
        toast.error(t('settings.cache.loadError'))
      }
    } catch (error) {
      console.error('加载缓存统计失败:', error)
      toast.error(t('settings.cache.loadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const handleClearCache = async (cacheType: string, cacheName: string) => {
    setClearingType(cacheType)
    try {
      if (!window.pywebview?.api) {
        toast.error(t('common.apiUnavailable'))
        return
      }

      const result = await window.pywebview.api.clear_cache(cacheType)
      if (result.success && result.data) {
        const clearedSize = formatSize(result.data.cleared_size)
        toast.success(t('settings.cache.clearSuccess', { name: cacheName, size: clearedSize }))
        await loadStats()
      } else {
        toast.error(result.error || t('settings.cache.clearError'))
      }
    } catch (error) {
      console.error('清理缓存失败:', error)
      toast.error(t('settings.cache.clearError'))
    } finally {
      setClearingType(null)
    }
  }

  const handleClearAllCaches = async () => {
    setClearingAll(true)
    try {
      if (!window.pywebview?.api) {
        toast.error(t('common.apiUnavailable'))
        return
      }

      const result = await window.pywebview.api.clear_all_caches()
      if (result.success && result.data) {
        const clearedSize = result.data.total_cleared_size_formatted
        toast.success(t('settings.cache.clearAllSuccess', { size: clearedSize }))
        await loadStats()
      } else {
        toast.error(t('settings.cache.clearError'))
      }
    } catch (error) {
      console.error('清理所有缓存失败:', error)
      toast.error(t('settings.cache.clearError'))
    } finally {
      setClearingAll(false)
    }
  }

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const formatTime = (isoString: string | null): string => {
    if (!isoString) return t('settings.cache.never')
    
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return t('settings.cache.justNow')
    if (diffMins < 60) return t('settings.cache.minutesAgo', { count: diffMins })
    if (diffHours < 24) return t('settings.cache.hoursAgo', { count: diffHours })
    return t('settings.cache.daysAgo', { count: diffDays })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        {t('settings.cache.noData')}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 缓存统计卡片 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.caches.map((cache) => (
          <Card key={cache.type} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <HardDrive className="size-4 text-primary" />
                {cache.name}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{cache.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 大小 */}
              <div className="flex items-center gap-2">
                <HardDrive className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('settings.cache.size')}:</span>
                <span className={cn(
                  "font-medium",
                  cache.size_bytes > 100 * 1024 * 1024 && "text-orange-500",
                  cache.size_bytes > 500 * 1024 * 1024 && "text-red-500"
                )}>
                  {cache.size_formatted}
                </span>
              </div>

              {/* 文件数量 */}
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('settings.cache.fileCount')}:</span>
                <span className="font-medium">{cache.file_count}</span>
              </div>

              {/* 最后更新 */}
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('settings.cache.lastUpdated')}:</span>
                <span className="text-sm">{formatTime(cache.last_updated)}</span>
              </div>

              {/* 清理按钮 */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={clearingType === cache.type || cache.size_bytes === 0}
                  >
                    {clearingType === cache.type ? (
                      <RefreshCw className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 size-4" />
                    )}
                    {t('settings.cache.clear')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('settings.cache.confirmClear.title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('settings.cache.confirmClear.description', { name: cache.name })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleClearCache(cache.type, cache.name)}
                    >
                      {t('common.confirm')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 总计和一键清理 */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <div className="text-sm text-muted-foreground">{t('settings.cache.totalSize')}</div>
            <div className="text-2xl font-bold">{stats.total_size_formatted}</div>
            <div className="text-xs text-muted-foreground">
              {t('settings.cache.totalFiles', { count: stats.total_file_count })}
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={clearingAll || stats.total_size_bytes === 0}
              >
                {clearingAll ? (
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 size-4" />
                )}
                {t('settings.cache.clearAll')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('settings.cache.confirmClearAll.title')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('settings.cache.confirmClearAll.description')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAllCaches}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t('common.confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
