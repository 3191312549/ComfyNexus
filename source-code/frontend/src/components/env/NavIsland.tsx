import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface NavIslandProps {
  tabs: Array<{
    id: string
    label: string
  }>
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

export function NavIsland({ tabs, activeTab, onTabChange, className }: NavIslandProps) {
  return (
    <div
      className={cn(
        'bg-background/75 backdrop-blur-xl backdrop-saturate-180',
        'border border-border-subtle/80',
        'rounded-full px-1.5 py-1.5',
        'inline-flex gap-0.5',
        'shadow-soft',
        className
      )}
    >
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant="ghost"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'px-5 py-2 text-sm font-medium rounded-full transition-all duration-200',
            'cursor-pointer',
            activeTab === tab.id
              ? 'bg-foreground text-background shadow-sm hover:bg-foreground hover:text-background'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
          )}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  )
}
