/**
 * ComfyUIStatusBar 组件
 * ComfyUI 状态卡片，美化版
 * 
 * 功能:
 * - 显示 ComfyUI 运行状态（运行中/已停止/启动中）
 * - 显示当前环境信息
 * - 打开 WebUI 按钮
 * - 显示端口信息
 * - 实时轮询状态更新
 */

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cpu, Zap, Activity, Loader2, Clock } from 'lucide-react'
import { useProcessStore } from '@/stores/useProcessStore'
import { useEnvStore } from '@/stores/useEnvStore'
import { cn } from '@/lib/utils'

export interface ComfyUIStatusBarProps {
  className?: string
}

/**
 * ComfyUIStatusBar 组件
 * 美化的状态卡片，无标题，内容丰富，与博主卡片等高
 */
export const ComfyUIStatusBar: React.FC<ComfyUIStatusBarProps> = ({ className }) => {
  const { t } = useTranslation()
  const { status, comfyUIStatus, isStarting: storeIsStarting, loadComfyUIStatus } = useProcessStore()
  const { environments, currentEnvId } = useEnvStore()

  const isRunning = status.isRunning
  const isStarting = storeIsStarting // 使用 store 中的启动状态
  const uptime = status.uptime || 0 // 运行时长（秒）

  // 本地运行时间状态（用于实时更新）
  const [localUptime, setLocalUptime] = useState(uptime)

  // 获取当前环境：优先使用后端返回的 envId，如果没有则使用 currentEnvId
  const displayEnvId = comfyUIStatus?.envId || currentEnvId
  const currentEnv = environments.find(env => env.id === displayEnvId)
  
  console.log('[ComfyUIStatusBar] 环境信息:', {
    comfyUIStatusEnvId: comfyUIStatus?.envId,
    currentEnvId,
    displayEnvId,
    currentEnvName: currentEnv?.name
  })

  /**
   * 格式化运行时间
   * @param seconds 秒数
   * @returns 格式化的时间字符串 (如 "1小时23分45秒" 或 "5分30秒" 或 "--")
   */
  const formatUptime = (seconds: number): string => {
    if (!isRunning || seconds === 0) {
      return '--'
    }
    
    if (seconds < 60) {
      return `${Math.floor(seconds)}${t('common.duration.seconds')}`
    }
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}${t('common.duration.hours')}${minutes}${t('common.duration.minutes')}${secs}${t('common.duration.seconds')}`
    }
    
    return `${minutes}${t('common.duration.minutes')}${secs}${t('common.duration.seconds')}`
  }

  /**
   * 同步 uptime 到本地状态
   */
  useEffect(() => {
    if (isRunning) {
      setLocalUptime(uptime)
    } else {
      setLocalUptime(0)
    }
  }, [uptime, isRunning])

  /**
   * 实时更新本地运行时间（每秒+1）
   */
  useEffect(() => {
    if (!isRunning) return

    const timer = setInterval(() => {
      setLocalUptime(prev => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [isRunning])

  /**
   * 轮询检查 ComfyUI 状态
   */
  useEffect(() => {
    // 如果正在启动，每2秒检查一次状态
    if (isStarting) {
      const pollInterval = setInterval(async () => {
        await loadComfyUIStatus()
      }, 2000)

      return () => {
        clearInterval(pollInterval)
      }
    }
  }, [isStarting, loadComfyUIStatus])

  /**
   * 监听状态变化
   */
  useEffect(() => {
    // 每5秒刷新一次状态
    const interval = setInterval(() => {
      loadComfyUIStatus()
    }, 5000)

    return () => clearInterval(interval)
  }, [loadComfyUIStatus])

  /**
   * 监听环境变化，重新加载状态
   */
  useEffect(() => {
    if (displayEnvId) {
      console.log('[ComfyUIStatusBar] 环境变化，重新加载状态:', displayEnvId)
      loadComfyUIStatus()
    }
  }, [displayEnvId, loadComfyUIStatus])

  /**
   * 获取状态文本和颜色
   */
  const getStatusInfo = () => {
    if (isStarting && !isRunning) {
      return {
        text: t('home.status.starting'),
        subText: t('home.status.startingService'),
        color: 'text-warning',
        bgColor: 'bg-warning',
        icon: <Loader2 className="text-warning size-5 animate-spin" />
      }
    }
    
    if (isRunning) {
      return {
        text: t('home.status.running'),
        subText: t('home.status.serviceNormal'),
        color: 'text-success',
        bgColor: 'bg-success',
        icon: <Activity className="text-success size-5 animate-pulse" />
      }
    }
    
    return {
      text: t('home.status.stopped'),
      subText: null,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted-foreground',
      icon: null
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div
      className={cn(
        'rounded-2xl p-4 h-full',
        'bg-surface',
        'border border-border-subtle',
        'shadow-sm',
        'flex flex-col',
        className
      )}
    >
      <div className="bg-surface-hover flex items-center justify-between rounded-xl p-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className={cn(
                'w-4 h-4 rounded-full',
                statusInfo.bgColor,
                (isRunning || isStarting) && 'animate-pulse'
              )}
            />
            {isRunning && (
              <div className={cn(
                'absolute inset-0 w-4 h-4 rounded-full animate-ping opacity-75',
                statusInfo.bgColor
              )} />
            )}
          </div>
          
          <div>
            <div className={cn('text-base font-semibold', statusInfo.color)}>
              {statusInfo.text}
            </div>
            {statusInfo.subText && (
              <div className="text-muted-foreground text-xs">
                {statusInfo.subText}
              </div>
            )}
          </div>
        </div>

        {statusInfo.icon}
      </div>

      {currentEnv && (
        <div className="mt-3 space-y-2">
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {t('home.currentEnv')}
          </div>
          
          <div className="bg-surface-hover rounded-lg p-2.5">
            <div className="text-foreground text-sm font-semibold">
              {currentEnv.name || t('home.defaultEnvironment')}
            </div>
          </div>
          
          {currentEnv.dependencies?.pythonVersion && (
            <div className="hover:bg-surface-hover flex items-center gap-2 rounded-lg p-1.5 transition-colors">
              <div className="bg-primary/10 rounded-md p-1.5">
                <Cpu className="text-primary size-3.5" />
              </div>
              <div className="flex-1">
                <div className="text-muted-foreground text-xs">
                  Python
                </div>
                <div className="text-foreground text-sm font-medium">
                  {currentEnv.dependencies.pythonVersion}
                </div>
              </div>
            </div>
          )}
          
          {currentEnv.dependencies?.pytorchVersion && (
            <div className="hover:bg-surface-hover flex items-center gap-2 rounded-lg p-1.5 transition-colors">
              <div className="bg-warning/10 rounded-md p-1.5">
                <Zap className="text-warning size-3.5" />
              </div>
              <div className="flex-1">
                <div className="text-muted-foreground text-xs">
                  PyTorch
                </div>
                <div className="text-foreground text-sm font-medium">
                  {currentEnv.dependencies.pytorchVersion}
                </div>
              </div>
            </div>
          )}

          <div className="hover:bg-surface-hover flex items-center gap-2 rounded-lg p-1.5 transition-colors">
            <div className="bg-success/10 rounded-md p-1.5">
              <Clock className="text-success size-3.5" />
            </div>
            <div className="flex-1">
              <div className="text-muted-foreground text-xs">
                {t('home.uptime')}
              </div>
              <div className="text-foreground text-sm font-medium">
                {formatUptime(localUptime)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default React.memo(ComfyUIStatusBar)
