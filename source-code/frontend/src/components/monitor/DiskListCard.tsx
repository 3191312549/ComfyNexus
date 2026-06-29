import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { MonitorCard, MonitorCardHeader } from './MonitorCard'
import type { DiskInfo } from '@/types/monitor'

interface DiskListCardProps {
  disks: DiskInfo[]
}

export function DiskListCard({ disks }: DiskListCardProps) {
  const { t } = useTranslation()

  const getVariant = (percent: number): 'normal' | 'warning' | 'danger' => {
    if (percent > 90) return 'danger'
    if (percent > 75) return 'warning'
    return 'normal'
  }

  return (
    <MonitorCard className="col-span-full self-start">
      <MonitorCardHeader title={t('monitor.localDiskStatus')} />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {disks.map((disk) => {
          const percent = (disk.used / disk.total) * 100
          const variant = getVariant(percent)

          return (
            <div
              key={disk.letter}
              className={cn(
                'flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-hover p-4'
              )}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-foreground">
                  {disk.letter}
                  <span className="ml-2 text-xs font-semibold text-content-secondary">
                    {disk.name}
                  </span>
                </span>
                <span
                  className={cn(
                    'font-mono text-sm font-extrabold',
                    variant === 'danger' ? 'text-danger' : 'text-foreground'
                  )}
                >
                  {percent.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-active">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    variant === 'danger' &&
                      'bg-gradient-to-r from-danger to-danger/80',
                    variant === 'warning' &&
                      'bg-gradient-to-r from-warning to-warning/80',
                    variant === 'normal' &&
                      'bg-gradient-to-r from-primary to-primary/80'
                  )}
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>
              <div className="text-right font-mono text-xs font-semibold text-muted-foreground">
                {disk.used} GB / {disk.total} GB
              </div>
            </div>
          )
        })}
      </div>
    </MonitorCard>
  )
}
