import { useTranslation } from 'react-i18next'
import { MonitorCard, MonitorCardHeader } from './MonitorCard'
import { MetricBox } from './MetricBox'
import { MonitorChart } from './MonitorChart'
import type { CPUMonitorData } from '@/types/monitor'

interface CPUMonitorCardProps {
  data: CPUMonitorData
  historyData: number[]
  cpuName?: string
  hardwareMonitorAvailable?: boolean
}

export function CPUMonitorCard({ data, historyData, cpuName, hardwareMonitorAvailable }: CPUMonitorCardProps) {
  const { t } = useTranslation()

  const showTempWarning = !hardwareMonitorAvailable && (data.temp === 0 || data.temp === null)
  const showPowerWarning = !hardwareMonitorAvailable && (data.power === 0 || data.power === null)

  return (
    <MonitorCard>
      <MonitorCardHeader
        title={t('monitor.cpuCoreLoad')}
        subtitle={cpuName || 'CPU'}
      />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <MetricBox
          label={t('monitor.coreLoad')}
          value={data.load}
          unit="%"
          valueColor="text-primary"
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
          value={data.freq}
          unit="GHz"
        />
      </div>
      <MonitorChart data={historyData} className="mt-auto" />
    </MonitorCard>
  )
}
