import { useTranslation } from 'react-i18next'
import { MonitorCard, MonitorCardHeader } from './MonitorCard'
import { MetricBox } from './MetricBox'
import { MonitorChart } from './MonitorChart'
import type { GPUMonitorData } from '@/types/monitor'

interface GPUMonitorCardProps {
  data: GPUMonitorData
  historyData: number[]
  gpuName?: string
  hardwareMonitorAvailable?: boolean
}

export function GPUMonitorCard({ data, historyData, gpuName, hardwareMonitorAvailable }: GPUMonitorCardProps) {
  const { t } = useTranslation()
  const isDanger = data.load > 90

  const showTempWarning = !hardwareMonitorAvailable && (data.temp === 0 || data.temp === null)
  const showPowerWarning = !hardwareMonitorAvailable && (data.power === 0 || data.power === null)

  return (
    <MonitorCard dangerState={isDanger}>
      <MonitorCardHeader
        title={t('monitor.gpu3DCompute')}
        subtitle={gpuName || 'GPU'}
      />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <MetricBox
          label={t('monitor.coreLoad')}
          value={data.load}
          unit="%"
          valueColor={
            data.load > 90
              ? 'text-danger'
              : data.load > 75
                ? 'text-warning'
                : 'text-foreground'
          }
        />
        <MetricBox
          label={t('monitor.temperature')}
          value={showTempWarning ? null : data.temp}
          unit="°C"
          warning={showTempWarning ? t('monitor.needAdmin') : undefined}
        />
        <MetricBox
          label={t('monitor.power')}
          value={showPowerWarning ? null : data.power}
          unit="W"
          warning={showPowerWarning ? t('monitor.needAdmin') : undefined}
        />
        <MetricBox
          label={t('monitor.coreFrequency')}
          value={data.core_clock}
          unit="MHz"
        />
      </div>
      <MonitorChart
        data={historyData}
        color={isDanger ? 'hsl(var(--color-danger))' : undefined}
        className="mt-auto"
      />
    </MonitorCard>
  )
}
