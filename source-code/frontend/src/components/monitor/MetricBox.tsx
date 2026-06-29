import { cn } from '@/lib/utils'

interface MetricBoxProps {
  label: string
  value: number | string | null
  unit: string
  valueColor?: string
  className?: string
  warning?: string
}

export function MetricBox({ label, value, unit, valueColor, className, warning }: MetricBoxProps) {
  const displayValue = value === null || value === 0 ? '--' : value
  const showWarning = warning && (value === null || value === 0)

  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-xl border border-border-subtle bg-surface-hover p-3.5',
        className
      )}
    >
      <span className="text-xs font-semibold text-content-secondary">{label}</span>
      <div className="flex items-baseline gap-0.5 leading-none">
        <span
          className={cn(
            'font-mono text-xl font-extrabold',
            showWarning ? 'text-muted-foreground' : (valueColor || 'text-foreground')
          )}
        >
          {displayValue}
        </span>
        {!showWarning && <span className="font-mono text-xs font-semibold text-muted-foreground">{unit}</span>}
      </div>
      {showWarning && (
        <span className="text-xs text-warning">{warning}</span>
      )}
    </div>
  )
}
