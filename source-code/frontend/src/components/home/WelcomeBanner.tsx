/**
 * WelcomeBanner 组件
 * 欢迎横幅，跨3列布局
 * 
 * 功能:
 * - 实时显示日期和时间
 * - 根据时间段显示不同的欢迎语
 * - 启动环境和配置管理按钮
 * - 资产统计卡片（LoRA、资产库、Prompt、工作流）
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Clock, Play, Settings, Box, Database, GitBranch, Loader2, Image } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { bridgeService } from '@/services/bridge'
import { useProcessStore } from '@/stores/useProcessStore'
import { useEnvStore } from '@/stores/useEnvStore'
import { useAssetStore } from '@/stores/useAssetStore'

export interface WelcomeBannerProps {
  className?: string
}

const getTimeOfDay = (hour: number): 'morning' | 'afternoon' | 'evening' | 'night' => {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 24) return 'evening'
  return 'night'
}

const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatTime = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ className }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [loraCount, setLoraCount] = useState<number | null>(null)
  const [loadingLora, setLoadingLora] = useState(false)
  const [promptCount, setPromptCount] = useState<number | null>(null)
  const [loadingPrompt, setLoadingPrompt] = useState(false)
  const [workflowCount, setWorkflowCount] = useState<number | null>(null)
  const [loadingWorkflow, setLoadingWorkflow] = useState(false)

  const { startComfyUI, isStarting, status } = useProcessStore()
  const { currentEnvId } = useEnvStore()
  const assetCount = useAssetStore(state => state.assets.length)
  const loadAssetData = useAssetStore(state => state.loadData)

  const greetings = {
    morning: t('home.greeting.morning'),
    afternoon: t('home.greeting.afternoon'),
    evening: t('home.greeting.evening'),
    night: t('home.greeting.night')
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchAssetCounts = useCallback(async () => {
    // 获取 LoRA 数量
    setLoadingLora(true)
    bridgeService.loraGetModels()
      .then(result => {
        if (result.success && result.count !== undefined) {
          setLoraCount(result.count)
        } else if (result.models) {
          setLoraCount(result.models.length)
        }
      })
      .catch(error => {
        console.error('[WelcomeBanner] 获取 LoRA 数量失败:', error)
      })
      .finally(() => {
        setLoadingLora(false)
      })

    // 获取提示词数量
    setLoadingPrompt(true)
    bridgeService.promptGetCount()
      .then(result => {
        if (result.success && result.count !== undefined) {
          setPromptCount(result.count)
        }
      })
      .catch(error => {
        console.error('[WelcomeBanner] 获取提示词数量失败:', error)
      })
      .finally(() => {
        setLoadingPrompt(false)
      })

    // 获取工作流数量
    setLoadingWorkflow(true)
    bridgeService.workflowGetCount()
      .then(result => {
        if (result.success && result.count !== undefined) {
          setWorkflowCount(result.count)
        }
      })
      .catch(error => {
        console.error('[WelcomeBanner] 获取工作流数量失败:', error)
      })
      .finally(() => {
        setLoadingWorkflow(false)
      })

    // 获取资产库数量
    if (assetCount === 0) {
      loadAssetData().catch(error => {
        console.error('[WelcomeBanner] 获取资产库数量失败:', error)
      })
    }
  }, [assetCount, loadAssetData])

  // 页面加载时获取一次
  useEffect(() => {
    fetchAssetCounts()
  }, [fetchAssetCounts])

  // 环境切换时重新获取
  useEffect(() => {
    if (currentEnvId) {
      console.log('[WelcomeBanner] 环境切换，重新获取资产数量')
      fetchAssetCounts()
    }
  }, [currentEnvId, fetchAssetCounts])

  const timeOfDay = getTimeOfDay(currentTime.getHours())
  const greeting = greetings[timeOfDay]

  const handleStartEnv = async () => {
    if (!currentEnvId) {
      console.warn('[WelcomeBanner] 未选择环境')
      return
    }
    if (status.isRunning || isStarting) {
      return
    }
    try {
      await startComfyUI()
    } catch (error) {
      console.error('[WelcomeBanner] 启动失败:', error)
    }
  }

  const handleOpenSettings = () => {
    window.location.href = '/env'
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl p-8',
        'bg-gradient-to-br from-background via-surface to-background',
        'border border-border-subtle',
        'shadow-lg shadow-border-subtle/50',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(hsl(var(--text-muted)/0.08)_1px,transparent_1px)] bg-[length:24px_24px] opacity-60" />
      <div className="pointer-events-none absolute -right-24 -top-12 size-96 bg-[radial-gradient(circle,hsl(var(--color-primary)/0.08)_0%,transparent_60%)]" />

      <div className="relative z-10 flex size-full items-center justify-between">
        <div className="flex max-w-[50%] flex-col items-start justify-center">
          <div className={cn(
            'inline-flex items-center gap-2.5 px-5 py-2 rounded-full',
            'bg-surface-hover',
            'border border-border-subtle',
            'backdrop-blur-xl mb-6'
          )}>
            <Clock className="text-primary size-4" />
            <span className="text-foreground font-mono text-sm font-medium">
              {formatDate(currentTime)} · {formatTime(currentTime)}
            </span>
          </div>

          <h1 className="text-foreground mb-4 text-3xl font-bold">
            {greeting}，<span className="from-primary to-info bg-gradient-to-r bg-clip-text text-transparent">{t('home.inspirationOnTheWay')}</span>
          </h1>
          <p className="text-muted-foreground mb-8 text-base leading-relaxed">
            {t('home.welcomeDescription')}
          </p>

          <div className="flex gap-4">
            <Button
              onClick={handleStartEnv}
              disabled={isStarting || status.isRunning || !currentEnvId}
              className="gap-2"
            >
              {isStarting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              {isStarting ? t('home.status.starting') : status.isRunning ? t('home.status.running') : t('home.startEnvironment')}
            </Button>
            <Button
              onClick={handleOpenSettings}
              variant="outline"
              className="gap-2"
            >
              <Settings className="size-4" />
              {t('home.manageConfig')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <StatCard
            icon={<Box className="size-4" />}
            value={loadingLora ? '...' : loraCount !== null ? loraCount : '--'}
            label={t('home.assets.lora')}
            iconColor="text-info"
            iconBg="bg-info/10"
            onClick={() => navigate('/model')}
          />
          <StatCard
            icon={<Image className="size-4" />}
            value={assetCount}
            label={t('home.assets.gallery')}
            iconColor="text-primary"
            iconBg="bg-primary/10"
            onClick={() => navigate('/gallery')}
          />
          <StatCard
            icon={<Database className="size-4" />}
            value={loadingPrompt ? '...' : promptCount !== null ? promptCount : '--'}
            label={t('home.assets.prompt')}
            iconColor="text-warning"
            iconBg="bg-warning/10"
            onClick={() => navigate('/prompt')}
          />
          <StatCard
            icon={<GitBranch className="size-4" />}
            value={loadingWorkflow ? '...' : workflowCount !== null ? workflowCount : '--'}
            label={t('home.assets.workflow')}
            iconColor="text-success"
            iconBg="bg-success/10"
            onClick={() => navigate('/workflow')}
          />
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  value: string | number
  label: string
  iconColor: string
  iconBg: string
  onClick?: () => void
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, iconColor, iconBg, onClick }) => (
  <div
    onClick={onClick}
    className={cn(
      'flex items-center gap-2.5 p-3 rounded-xl',
      'bg-surface-hover',
      'border border-border-subtle',
      'backdrop-blur-sm',
      'hover:bg-surface-hover/80 hover:border-border hover:-translate-y-0.5',
      'transition-all duration-300',
      onClick ? 'cursor-pointer' : 'cursor-default'
    )}
  >
    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
      <span className={iconColor}>{icon}</span>
    </div>
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-foreground font-mono text-xl font-bold truncate">{value}</span>
      <span className="text-muted-foreground text-[11px] font-medium truncate">{label}</span>
    </div>
  </div>
)

export default React.memo(WelcomeBanner)
