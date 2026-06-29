/**
 * FolderShortcutBar 组件
 * 文件夹快捷方式横栏，支持拖拽排序和路径同步
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DndContext, closestCenter, DragEndEvent, DragStartEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import { restrictToHorizontalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import { SortableContext, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { Settings, Zap } from 'lucide-react'
import { useFolderShortcutStore } from '@/stores/useFolderShortcutStore'
import { useEnvStore } from '@/stores/useEnvStore'
import { FolderShortcutCard } from './FolderShortcutCard'
import { FolderSettingsModal } from './FolderSettingsModal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import type { FolderShortcut } from '@/types/home'

export interface FolderShortcutBarProps {
  className?: string
}

export const FolderShortcutBar: React.FC<FolderShortcutBarProps> = ({
  className
}) => {
  const { t } = useTranslation()
  
  const [showSettings, setShowSettings] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  
  const { error: showError } = useToast()
  
  const {
    shortcuts,
    loading,
    error,
    loadShortcuts,
    reorderShortcuts,
    syncDefaultPaths
  } = useFolderShortcutStore()
  
  const environments = useEnvStore(state => state.environments)
  const currentEnvId = useEnvStore(state => state.currentEnvId)
  const envInitialized = useEnvStore(state => state.initialized)
  const currentEnv = environments.find(env => env.id === currentEnvId)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  )
  
  useEffect(() => {
    loadShortcuts()
  }, [loadShortcuts])
  
  useEffect(() => {
    if (envInitialized && currentEnv) {
      console.log('[FolderShortcutBar] 环境已初始化，同步路径:', currentEnv.id)
      syncDefaultPaths(currentEnv)
    } else if (envInitialized && !currentEnv) {
      console.log('[FolderShortcutBar] 环境已初始化但没有当前环境，清空路径')
      syncDefaultPaths(null)
    }
  }, [envInitialized, currentEnv, syncDefaultPaths])
  
  useEffect(() => {
    if (error) {
      showError(error)
    }
  }, [error, showError])
  
  const handleDragStart = (event: DragStartEvent) => {
    console.log('[FolderShortcutBar] 拖拽开始:', event.active.id)
    setActiveId(event.active.id as string)
    setIsDragging(true)
  }
  
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    console.log('[FolderShortcutBar] 拖拽结束:', { active: active.id, over: over?.id })
    setActiveId(null)
    setIsDragging(false)
    
    if (!over || active.id === over.id) {
      return
    }
    
    const oldIndex = shortcuts.findIndex(s => s.id === active.id)
    const newIndex = shortcuts.findIndex(s => s.id === over.id)
    
    if (oldIndex === -1 || newIndex === -1) {
      return
    }
    
    const newShortcuts = arrayMove(shortcuts, oldIndex, newIndex)
    
    try {
      await reorderShortcuts(newShortcuts)
    } catch (err) {
      console.error('[FolderShortcutBar] 保存顺序失败:', err)
    }
  }
  
  const handleSettingsClick = () => {
    console.log('[FolderShortcutBar] 打开设置弹窗')
    setShowSettings(true)
  }
  
  const handleSaveSettings = async (updatedShortcuts: FolderShortcut[]) => {
    try {
      await reorderShortcuts(updatedShortcuts)
    } catch (err) {
      console.error('[FolderShortcutBar] 保存设置失败:', err)
    }
  }
  
  return (
    <div className={cn(
      "rounded-2xl p-[18px] border shadow-lg shadow-border-subtle/50",
      "bg-surface",
      "border-border-subtle",
      className
    )}>
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="text-muted-foreground size-4" />
          <h2 className="text-foreground text-sm font-semibold">
            {t('home.quickAccess')}
          </h2>
        </div>
        <Button
          onClick={handleSettingsClick}
          variant="ghost"
          size="icon"
          aria-label={t('home.folder.settings')}
        >
          <Settings className="size-4" />
        </Button>
      </div>
      
      {loading && (
        <div className="text-muted-foreground py-8 text-center">
          <div className="border-primary mx-auto mb-2 size-8 animate-spin rounded-full border-b-2" />
          <p>{t('common.loading')}</p>
        </div>
      )}
      
      {error && !loading && (
        <div className="py-8 text-center">
          <p className="text-danger font-medium">{t('home.error.loadShortcuts')}</p>
          <p className="text-muted-foreground mt-1 text-sm">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadShortcuts()}
            className="mt-4"
          >
            {t('common.retry')}
          </Button>
        </div>
      )}
      
      {!loading && !error && shortcuts.length === 0 && (
        <div className="text-muted-foreground py-8 text-center">
          <p>{t('home.folder.pathNotSet')}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSettingsClick}
            className="mt-4"
          >
            {t('home.folder.add')}
          </Button>
        </div>
      )}
      
      {!loading && !error && shortcuts.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
        >
          <SortableContext
            items={shortcuts.filter(s => s.visible !== false).map(s => s.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className={cn(
              "grid grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3",
              "transition-all duration-300",
              isDragging && "bg-primary/5 rounded-lg p-2"
            )}>
              {shortcuts
                .filter(shortcut => shortcut.visible !== false)
                .map(shortcut => (
                  <FolderShortcutCard
                    key={shortcut.id}
                    shortcut={shortcut}
                    onError={showError}
                  />
                ))}
            </div>
          </SortableContext>
          
          <DragOverlay>
            {activeId ? (
              (() => {
                const activeShortcut = shortcuts.find(s => s.id === activeId)
                return activeShortcut ? (
                  <FolderShortcutCard
                    shortcut={activeShortcut}
                    isDragOverlay
                  />
                ) : null
              })()
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
      
      {showSettings && (
        <FolderSettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          shortcuts={shortcuts}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  )
}

export default FolderShortcutBar
