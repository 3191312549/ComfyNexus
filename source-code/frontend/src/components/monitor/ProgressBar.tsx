import { cn } from '@/lib/utils'

interface ProgressBarProps {
  label: string
  used: number
  total: number
  percent: number
  showValues?: boolean
  variant?: 'normal' | 'warning' | 'danger' | 'subtle' | 'success'
  className?: string
}

export function ProgressBar({
  label,
  used,
  total,
  percent,
  showValues = true,
  variant = 'normal',
  className
}: ProgressBarProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'danger':
        return 'bg-gradient-to-r from-danger to-danger/80'
      case 'warning':
        return 'bg-gradient-to-r from-warning to-warning/80'
      case 'success':
        return 'bg-gradient-to-r from-success to-success/80'
      case 'subtle':
        return 'bg-gradient-to-r from-muted-foreground to-muted-foreground/80'
      default:
        return 'bg-gradient-to-r from-primary to-primary/80'
    }
  }

  const getValueColor = () => {
    switch (variant) {
      case 'danger':
        return 'text-danger'
      case 'warning':
        return 'text-warning'
      case 'success':
        return 'text-success'
      default:
        return 'text-foreground'
    }
  }

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-bold text-foreground">{label}</span>
        {showValues && (
          <span className={cn('font-mono text-xs font-bold', getValueColor())}>
            {typeof used === 'number' && typeof total === 'number'
              ? `${used.toFixed(1)} / ${total.toFixed(1)} GB`
              : `${percent.toFixed(1)}%`}
          </span>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-active">
        <div
          className={cn('h-full rounded-full transition-all duration-300', getVariantClasses())}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  )
}
