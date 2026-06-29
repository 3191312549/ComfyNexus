/**
 * 版本切换进度显示组件
 * 显示切换进度（切换中 → 更新依赖 → 重启进程）
 */

import { useTranslation } from 'react-i18next'
import { Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SwitchStep = 'switching' | 'dependency' | 'restarting' | 'completed'

interface SwitchProgressProps {
  currentStep: SwitchStep
  error?: string | null
}

export function SwitchProgress({ currentStep, error }: SwitchProgressProps) {
  const { t } = useTranslation()

  const steps = [
    { key: 'switching', label: t('version.switching') },
    { key: 'dependency', label: t('version.checkingDependency') },
    { key: 'restarting', label: t('version.restarting') },
  ]

  const getStepStatus = (stepKey: string) => {
    const currentIndex = steps.findIndex((s) => s.key === currentStep)
    const stepIndex = steps.findIndex((s) => s.key === stepKey)

    if (error) {
      return stepIndex <= currentIndex ? 'error' : 'pending'
    }

    if (currentStep === 'completed') {
      return 'completed'
    }

    if (stepIndex < currentIndex) {
      return 'completed'
    } else if (stepIndex === currentIndex) {
      return 'active'
    } else {
      return 'pending'
    }
  }

  return (
    <div className="space-y-4">
      {/* 进度步骤 */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const status = getStepStatus(step.key)

          return (
            <div key={step.key} className="flex items-center gap-3">
              {/* 状态图标 */}
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full',
                  status === 'completed' && 'bg-green-500 text-white',
                  status === 'active' && 'bg-primary text-primary-foreground',
                  status === 'pending' && 'bg-muted text-muted-foreground',
                  status === 'error' && 'bg-destructive text-destructive-foreground'
                )}
              >
                {status === 'completed' ? (
                  <Check className="size-4" />
                ) : status === 'active' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <span className="text-sm">{index + 1}</span>
                )}
              </div>

              {/* 步骤标签 */}
              <div className="flex-1">
                <p
                  className={cn(
                    'text-sm font-medium',
                    status === 'active' && 'text-foreground',
                    status === 'completed' && 'text-muted-foreground',
                    status === 'pending' && 'text-muted-foreground',
                    status === 'error' && 'text-destructive'
                  )}
                >
                  {step.label}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* 错误信息 */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* 完成信息 */}
      {currentStep === 'completed' && !error && (
        <div className="bg-green-50 text-green-800 dark:bg-green-950/20 dark:text-green-200 rounded-md p-3 text-sm">
          {t('version.switchSuccess')}
        </div>
      )}
    </div>
  )
}
