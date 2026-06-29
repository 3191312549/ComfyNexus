/**
 * ComfyUIStatusCard 组件
 * 显示 ComfyUI 运行状态和操作按钮
 */

import React from 'react'
import { useTranslation } from 'react-i18next'
import { Activity } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useProcessStore } from '@/stores/useProcessStore'
import { cn } from '@/lib/utils'

/**
 * ComfyUIStatusCard 组件属性
 */
export interface ComfyUIStatusCardProps {
  /** 自定义样式类名 */
  className?: string
}

/**
 * 格式化运行时长
 * @param seconds - 运行秒数
 * @param t - 翻译函数
 * @returns 格式化后的字符串（如 "2 hours 35 minutes"）
 */
const formatUptime = (seconds: number, t: (key: string) => string): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}${t('home.status.hours')} ${minutes}${t('home.status.minutes')}`
}

/**
 * ComfyUIStatusCard 组件
 * 显示 ComfyUI 运行状态、端口、运行时长和操作按钮
 */
export const ComfyUIStatusCard: React.FC<ComfyUIStatusCardProps> = React.memo(({ className }) => {
  const { t } = useTranslation()
  const { comfyUIStatus, openComfyUI, startComfyUI, isStarting, loading } = useProcessStore()

  /**
   * 处理操作按钮点击
   * 根据当前状态决定是打开还是启动 ComfyUI
   */
  const handleAction = async () => {
    if (!comfyUIStatus) {
      console.warn('[ComfyUIStatusCard] 状态数据未加载')
      return
    }

    try {
      if (comfyUIStatus.isRunning) {
        // 运行中：打开 ComfyUI
        console.log('[ComfyUIStatusCard] 打开 ComfyUI')
        await openComfyUI()
      } else {
        // 已停止：启动 ComfyUI
        console.log('[ComfyUIStatusCard] 启动 ComfyUI')
        await startComfyUI()
      }
    } catch (error) {
      console.error('[ComfyUIStatusCard] 操作失败:', error)
      // 可选：显示错误提示
      // toast.error('操作失败，请重试')
    }
  }

  // 处理状态数据缺失
  if (!comfyUIStatus) {
    return (
      <Card className={cn('p-4', className)}>
        <CardContent>
          <p className="text-muted-foreground">
            {t('common.loading')}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('p-4 hover:shadow-lg hover:border-primary/50 transition-all duration-300', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-5" />
          {t('home.comfyuiStatus')}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              'h-3 w-3 rounded-full',
              comfyUIStatus.isRunning
                ? 'bg-success animate-pulse'
                : 'bg-muted-foreground'
            )} />
            <span className="text-foreground font-medium">
              {comfyUIStatus.isRunning ? t('home.status.running') : t('home.status.stopped')}
            </span>
          </div>
        </div>

        {comfyUIStatus.isRunning && (
          <div className="text-muted-foreground space-y-1 text-sm">
            <p>{t('home.status.port')}: {comfyUIStatus.port}</p>
            <p>{t('home.status.uptime')}: {formatUptime(comfyUIStatus.uptime || 0, t)}</p>
          </div>
        )}

        {/* 操作按钮 */}
        <Button
          className="w-full"
          onClick={handleAction}
          variant={comfyUIStatus.isRunning ? 'default' : 'outline'}
          disabled={isStarting || loading}
        >
          {comfyUIStatus.isRunning 
            ? t('home.status.openComfyUI') 
            : isStarting 
              ? t('home.status.starting') 
              : t('home.status.startComfyUI')}
        </Button>
      </CardContent>
    </Card>
  )
})

ComfyUIStatusCard.displayName = 'ComfyUIStatusCard'

export default ComfyUIStatusCard
