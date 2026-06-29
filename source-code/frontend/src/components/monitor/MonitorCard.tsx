import { cn } from '@/lib/utils'
import { Card } from '@/components/ui'

interface MonitorCardProps {
  children: React.ReactNode
  className?: string
  dangerState?: boolean
}

export function MonitorCard({ children, className, dangerState }: MonitorCardProps) {
  return (
    <Card
      className={cn(
        'flex flex-col p-6 transition-all duration-300',
        dangerState && 'animate-pulse border-danger/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]',
        className
      )}
    >
      {children}
    </Card>
  )
}

interface MonitorCardHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function MonitorCardHeader({ title, subtitle, action }: MonitorCardHeaderProps) {
  return (
    <div className="mb-5 flex items-start justify-between">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        {subtitle && (
          <span className="font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {subtitle}
          </span>
        )}
      </div>
      {action}
    </div>
  )
}
