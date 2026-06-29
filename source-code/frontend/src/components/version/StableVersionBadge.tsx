/**
 * 稳定版铭牌组件
 * 紧凑的版本卡片，点击后打开详情面板
 */

import { useTranslation } from 'react-i18next'
import { VersionInfo } from '@/types/version'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

interface StableVersionBadgeProps {
  version: VersionInfo
  isCurrent?: boolean
  isSelected?: boolean
  onClick?: () => void
  onSwitch?: (version: VersionInfo) => void
  disabled?: boolean
}

export function StableVersionBadge({
  version,
  isCurrent = false,
  isSelected = false,
  onClick,
  onSwitch,
  disabled = false,
}: StableVersionBadgeProps) {
  const { t } = useTranslation()

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(/\//g, '/')
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl p-4 flex justify-between items-center transition-all duration-200',
        'bg-surface border border-border',
        'hover:bg-surface-hover hover:border-border-strong',
        onClick && 'cursor-pointer',
        isCurrent && [
          'bg-primary/[0.08] border-primary/40',
          'shadow-[0_4px_12px_hsl(var(--primary)/0.15)]'
        ],
        isSelected && !isCurrent && [
          'bg-primary/[0.05] border-primary/30',
          'ring-2 ring-primary/20'
        ]
      )}
    >
      <div className="flex flex-col gap-1">
        <div className={cn(
          'text-lg font-extrabold font-mono leading-none',
          isCurrent ? 'text-primary' : 'text-foreground'
        )}>
          {version.tag || version.id}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {formatDate(version.timestamp)}
        </div>
      </div>
      
      {isCurrent ? (
        <span className="text-sm font-medium text-primary">
          {t('version.current')}
        </span>
      ) : (
        <Button
          onClick={(e) => {
            e.stopPropagation()
            onSwitch?.(version)
          }}
          disabled={disabled}
          variant="outline"
          size="sm"
        >
          {t('version.switchVersion')}
        </Button>
      )}
    </div>
  )
}

export default StableVersionBadge
