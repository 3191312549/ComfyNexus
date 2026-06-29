/**
 * 插件侧边栏组件
 * 
 * 显示插件列表，用于过滤依赖列表
 */

import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

export interface Plugin {
  name: string
  path: string
  hasRequirements: boolean
  dependencyCount: number
}

interface PluginSidebarProps {
  plugins: Plugin[]
  selectedPlugin: string | null
  onSelect: (pluginName: string | null) => void
  dependencyCounts: Record<string, number>
  loading?: boolean
}

export default function PluginSidebar({
  plugins,
  selectedPlugin,
  onSelect,
  dependencyCounts,
  loading = false
}: PluginSidebarProps) {
  // 固定选项
  const fixedOptions = [
    { id: 'core', label: 'ComfyUI 核心', count: dependencyCounts['core'] || 0 },
    { id: 'all', label: '全部', count: dependencyCounts['all'] || 0 }
  ]

  // 按字母顺序排序插件
  const sortedPlugins = [...plugins].sort((a, b) => 
    a.name.localeCompare(b.name)
  )

  const itemClass = cn(
    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground'
  )

  return (
    <div className="flex w-64 flex-col border-r border-border bg-surface">
      {/* 标题 */}
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-content-primary">
          插件列表
        </h3>
      </div>

      {/* 固定选项 */}
      <div className="border-b border-border p-2">
        {fixedOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={cn(
              itemClass,
              selectedPlugin === option.id && 'bg-primary/10 text-primary font-medium'
            )}
          >
            <span>{option.label}</span>
            <span className={cn(
              'ml-auto text-xs px-2 py-0.5 rounded-full',
              selectedPlugin === option.id
                ? 'bg-primary/20 text-primary'
                : 'bg-muted text-content-muted'
            )}>
              {option.count}
            </span>
          </button>
        ))}
      </div>

      {/* 插件列表 */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {loading ? (
            <div className="px-3 py-2 text-sm text-content-muted">
              加载中...
            </div>
          ) : sortedPlugins.length === 0 ? (
            <div className="px-3 py-2 text-sm text-content-muted">
              暂无插件
            </div>
          ) : (
            sortedPlugins.map((plugin) => (
              <button
                key={plugin.name}
                onClick={() => onSelect(plugin.name)}
                className={cn(
                  itemClass,
                  selectedPlugin === plugin.name && 'bg-primary/10 text-primary font-medium'
                )}
                title={plugin.name}
              >
                <span className="flex-1 truncate">{plugin.name}</span>
                {plugin.dependencyCount > 0 && (
                  <span className={cn(
                    'ml-auto text-xs px-2 py-0.5 rounded-full flex-shrink-0',
                    selectedPlugin === plugin.name
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-content-muted'
                  )}>
                    {plugin.dependencyCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
