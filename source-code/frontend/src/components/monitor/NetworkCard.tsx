import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
import { MonitorCard, MonitorCardHeader } from './MonitorCard'
import { NetworkChart } from './MonitorChart'
import type { NetworkData } from '@/types/monitor'

interface NetworkCardProps {
  data: NetworkData
  downHistoryData: number[]
  upHistoryData: number[]
  interfaceName?: string
}

function formatNetworkSpeed(mb: number): { value: string; unit: string; kb: number } {
  const kb = mb * 1024
  if (kb < 1024) {
    return { value: kb.toFixed(0), unit: 'KB/s', kb }
  }
  return { value: mb.toFixed(1), unit: 'MB/s', kb }
}

export function NetworkCard({ data, downHistoryData, upHistoryData, interfaceName }: NetworkCardProps) {
  const { t } = useTranslation()

  const upFormatted = useMemo(() => formatNetworkSpeed(data.up), [data.up])
  const downFormatted = useMemo(() => formatNetworkSpeed(data.down), [data.down])

  const maxSpeedKB = 50 * 1024

  return (
    <MonitorCard>
      <MonitorCardHeader
        title={t('monitor.networkThroughput')}
        subtitle={interfaceName || t('monitor.network')}
      />
      <div className="mb-4 flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold text-foreground">{t('monitor.uploadSpeed')}</span>
          <span className="font-mono text-xs font-bold text-primary">
            {upFormatted.value} {upFormatted.unit}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-active">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300"
            style={{ width: `${Math.min((upFormatted.kb / maxSpeedKB) * 100, 100)}%` }}
          />
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold text-foreground">{t('monitor.downloadSpeed')}</span>
          <span className="font-mono text-xs font-bold text-success">
            {downFormatted.value} {downFormatted.unit}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-active">
          <div
            className="h-full rounded-full bg-gradient-to-r from-success to-success/80 transition-all duration-300"
            style={{ width: `${Math.min((downFormatted.kb / maxSpeedKB) * 100, 100)}%` }}
          />
        </div>
      </div>
      <NetworkChart downData={downHistoryData} upData={upHistoryData} height={60} className="mt-auto" />
    </MonitorCard>
  )
}
