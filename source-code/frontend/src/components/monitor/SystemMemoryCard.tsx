import { useTranslation } from 'react-i18next'
import { MonitorCard, MonitorCardHeader } from './MonitorCard'
import { ProgressBar } from './ProgressBar'
import { MonitorChart } from './MonitorChart'
import { NativeSelect } from '@/components/ui/NativeSelect'
import type { SystemMemoryData } from '@/types/monitor'

interface SystemMemoryCardProps {
  data: SystemMemoryData
  historyData: number[]
  historySource: 'ram' | 'vram' | 'page'
  onSourceChange: (source: 'ram' | 'vram' | 'page') => void
}

export function SystemMemoryCard({
  data,
  historyData,
  historySource,
  onSourceChange
}: SystemMemoryCardProps) {
  const { t } = useTranslation()

  const getVariant = (percent: number): 'normal' | 'warning' | 'danger' => {
    if (percent > 90) return 'danger'
    if (percent > 75) return 'warning'
    return 'normal'
  }

  const getChartColor = () => {
    switch (historySource) {
      case 'vram':
        return 'hsl(var(--color-danger))'
      case 'page':
        return 'hsl(var(--text-muted))'
      default:
        return 'hsl(var(--color-primary))'
    }
  }

  return (
    <MonitorCard>
      <MonitorCardHeader
        title={t('monitor.systemStorage')}
        action={
          <NativeSelect
            value={historySource}
            onChange={(e) => onSourceChange(e.target.value as 'ram' | 'vram' | 'page')}
            className="w-36"
            inputSize="sm"
          >
            <option value="ram">{t('monitor.ram')}</option>
            <option value="vram">{t('monitor.vram')}</option>
            <option value="page">{t('monitor.pageFile')}</option>
          </NativeSelect>
        }
      />
      <div className="mb-4 flex flex-col gap-2.5">
        <ProgressBar
          label={t('monitor.memory')}
          used={data.ram.used}
          total={data.ram.total}
          percent={data.ram.percent}
          variant={getVariant(data.ram.percent)}
        />
        <ProgressBar
          label={t('monitor.vramLabel')}
          used={data.vram.used}
          total={data.vram.total}
          percent={data.vram.percent}
          variant={getVariant(data.vram.percent)}
        />
        <ProgressBar
          label={t('monitor.virtualMemory')}
          used={data.page.used}
          total={data.page.total}
          percent={data.page.percent}
          variant="subtle"
        />
      </div>
      <MonitorChart data={historyData} color={getChartColor()} className="mt-auto" />
    </MonitorCard>
  )
}
