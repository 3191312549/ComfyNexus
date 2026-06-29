/**
 * StatusCard 组件
 * 运行状态卡片，跨1列布局
 * 
 * 功能:
 * - 显示 ComfyUI 运行状态
 * - 显示当前环境信息
 * - 显示 Python 和 PyTorch 版本
 * - 显示运行时间
 */

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cpu, Zap, Clock, Activity, Loader2 } from 'lucide-react'
import { useProcessStore } from '@/stores/useProcessStore'
import { useEnvStore } from '@/stores/useEnvStore'
import { cn } from '@/lib/utils'

export interface StatusCardProps {
  className?: string
}

const formatUptime = (seconds: number, isRunning: boolean): string => {
  if (!isRunning || seconds === 0) {
    return '-- : -- : --'
  }
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  return `${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')} : ${String(secs).padStart(2, '0')}`
}

export const StatusCard: React.FC<StatusCardProps> = ({ className }) => {
  const { t } = useTranslation()
  const { status, comfyUIStatus, isStarting, loadComfyUIStatus } = useProcessStore()
  const { environments, currentEnvId } = useEnvStore()

  const isRunning = status.isRunning
  const isExternal = comfyUIStatus?.isExternal ?? false
  const uptime = status.uptime || 0

  const [localUptime, setLocalUptime] = useState(uptime)

  const displayEnvId = comfyUIStatus?.envId || currentEnvId
  const currentEnv = environments.find(env => env.id === displayEnvId)

  useEffect(() => {
    if (isRunning) {
      setLocalUptime(uptime)
    } else {
      setLocalUptime(0)
    }
  }, [uptime, isRunning])

  useEffect(() => {
    if (!isRunning) return
    const timer = setInterval(() => {
      setLocalUptime(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [isRunning])

  useEffect(() => {
    if (isStarting) {
      const pollInterval = setInterval(async () => {
        await loadComfyUIStatus()
      }, 2000)
      return () => clearInterval(pollInterval)
    }
  }, [isStarting, loadComfyUIStatus])

  useEffect(() => {
    const interval = setInterval(() => {
      loadComfyUIStatus()
    }, 5000)
    return () => clearInterval(interval)
  }, [loadComfyUIStatus])

  useEffect(() => {
    if (displayEnvId) {
      loadComfyUIStatus()
    }
  }, [displayEnvId, loadComfyUIStatus])

  const getStatusInfo = () => {
    if (isStarting && !isRunning) {
      return {
        text: t('home.status.starting'),
        color: 'text-warning',
        bgColor: 'bg-warning',
        icon: <Loader2 className="text-warning size-4 animate-spin" />
      }
    }
    if (isRunning && isExternal) {
      return {
        text: t('home.status.running'),
        color: 'text-primary',
        bgColor: 'bg-primary',
        icon: <Activity className="text-primary size-4 animate-pulse" />
      }
    }
    if (isRunning) {
      return {
        text: t('home.status.running'),
        color: 'text-success',
        bgColor: 'bg-success',
        icon: <Activity className="text-success size-4 animate-pulse" />
      }
    }
    return {
      text: t('home.status.stopped'),
      color: 'text-muted-foreground',
      bgColor: 'bg-muted-foreground',
      icon: null
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div
      className={cn(
        'rounded-2xl p-6 h-full',
        'bg-surface',
        'border border-border-subtle',
        'shadow-lg shadow-border-subtle/50',
        'flex flex-col',
        className
      )}
    >
      <div className="mb-5 flex items-center gap-2">
        <Cpu className="text-muted-foreground size-4" />
        <span className="text-muted-foreground text-sm font-semibold">{t('home.runtimeStatus')}</span>
      </div>

      <div className={cn(
        'flex items-center justify-between p-3 rounded-xl mb-6',
        'bg-surface-hover',
        'border border-border-subtle'
      )}>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className={cn('w-2 h-2 rounded-full', statusInfo.bgColor, (isRunning || isStarting) && 'animate-pulse')} />
            {isRunning && (
              <div className={cn('absolute inset-0 w-2 h-2 rounded-full animate-ping opacity-75', statusInfo.bgColor)} />
            )}
          </div>
          <span className={cn('text-sm font-medium', statusInfo.color)}>{statusInfo.text}</span>
        </div>
        <span className="bg-surface-hover text-muted-foreground rounded-md px-2 py-1 text-xs">
          {isExternal ? t('home.status.externalProcess') : (currentEnv?.alias || currentEnv?.name || '--')}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{t('home.pythonEnvironment')}</span>
          <div className={cn(
            'flex items-center gap-2.5 px-3 py-2.5 rounded-lg',
            'bg-surface-hover',
            'border border-border-subtle'
          )}>
            <Cpu className="text-primary size-4" />
            <span className="text-foreground font-mono text-sm">
              {isExternal ? '--' : (currentEnv?.dependencies?.pythonVersion || '--')}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{t('home.pytorchVersion')}</span>
          <div className={cn(
            'flex items-center gap-2.5 px-3 py-2.5 rounded-lg',
            'bg-surface-hover',
            'border border-border-subtle'
          )}>
            <Zap className="text-warning size-4" />
            <span className="text-foreground font-mono text-sm">
              {isExternal ? '--' : (currentEnv?.dependencies?.pytorchVersion || '--')}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{t('home.uptime')}</span>
          <div className={cn(
            'flex items-center gap-2.5 px-3 py-2.5 rounded-lg',
            'bg-surface-hover',
            'border border-border-subtle'
          )}>
            <Clock className="text-muted-foreground size-4" />
            <span className="text-muted-foreground font-mono text-sm">
              {isExternal ? '-- : -- : --' : formatUptime(localUptime, isRunning)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default React.memo(StatusCard)
