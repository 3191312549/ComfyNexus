/**
 * 版本标签页容器组件
 * 分段控制样式，带语义化色彩
 */

import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

export type TabType = 'stable' | 'dev'

interface VersionTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  stableCount?: number
  devCount?: number
  stableTotalCached?: number
  devTotalCached?: number
}

export function VersionTabs({
  activeTab,
  onTabChange,
  stableCount = 0,
  devCount = 0,
  stableTotalCached,
  devTotalCached,
}: VersionTabsProps) {
  const { t } = useTranslation()
  
  const stableDisplay = stableTotalCached ?? stableCount
  const devDisplay = devTotalCached ?? devCount

  return (
    <div className="flex items-center border-b border-border pb-4">
      <div className="inline-flex gap-2">
        <Button
          onClick={() => onTabChange('stable')}
          variant="outline"
          className={cn(
            'gap-2',
            activeTab === 'stable' && 'bg-primary/10 text-primary border-primary/30 shadow-[0_4px_12px_hsl(var(--primary)/0.15)]'
          )}
        >
          {t('version.stable')}
          <span
            className={cn(
              'px-2 py-0.5 rounded-xl text-xs font-medium',
              activeTab === 'stable'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
            )}
          >
            {stableDisplay}
          </span>
        </Button>

        <Button
          onClick={() => onTabChange('dev')}
          variant="outline"
          className={cn(
            'gap-2',
            activeTab === 'dev' && 'bg-warning/10 text-warning border-warning/30 shadow-[0_4px_12px_hsl(var(--warning)/0.15)]'
          )}
        >
          {t('version.dev')}
          <span
            className={cn(
              'px-2 py-0.5 rounded-xl text-xs font-medium',
              activeTab === 'dev'
                ? 'bg-warning text-warning-foreground'
                : 'bg-muted'
            )}
          >
            {devDisplay}
          </span>
        </Button>
      </div>
    </div>
  )
}

export default VersionTabs
