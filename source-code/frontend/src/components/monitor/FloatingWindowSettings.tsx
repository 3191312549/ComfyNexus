import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui'
import { Switch } from '@/components/ui/Switch'
import { Slider } from '@/components/ui/Slider'
import type { FloatingWindowSettings } from '@/types/monitor'
import { FLOATING_WINDOW_ITEMS } from '@/types/monitor'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface FloatingWindowSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: FloatingWindowSettings
  onSettingsChange: (settings: FloatingWindowSettings) => void
}

interface DragItem {
  id: string
  label: string
  visible: boolean
}

interface SortableItemProps {
  item: DragItem
  onToggle: (id: string) => void
}

function SortableItem({ item, onToggle }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        'flex items-center justify-between rounded-xl border bg-surface p-3.5 shadow-sm transition-all',
        isDragging
          ? 'ring-2 ring-primary shadow-lg shadow-primary/20 border-primary opacity-90 scale-[1.02]'
          : 'border-border hover:border-border-strong'
      )}
    >
      <div className="flex items-center gap-3.5">
        <span
          {...listeners}
          className="cursor-grab select-none text-base font-bold tracking-tighter text-muted-foreground hover:text-foreground transition-colors active:cursor-grabbing"
        >
          ⋮⋮
        </span>
        <span className="text-sm font-semibold text-foreground">{item.label}</span>
      </div>
      <Switch
        checked={item.visible}
        onCheckedChange={() => onToggle(item.id)}
      />
    </div>
  )
}

export function FloatingWindowSettings({
  open,
  onOpenChange,
  settings,
  onSettingsChange
}: FloatingWindowSettingsProps) {
  const { t } = useTranslation()
  const [localOpacity, setLocalOpacity] = useState(settings.opacity)
  const [dragItems, setDragItems] = useState<DragItem[]>(() =>
    settings.itemOrder.map((id) => ({
      id,
      label: t(
        FLOATING_WINDOW_ITEMS.find((item) => item.id === id)?.labelKey || id
      ),
      visible: settings.visibleItems.includes(id)
    }))
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (open) {
      setLocalOpacity(settings.opacity)

      const allItemIds = FLOATING_WINDOW_ITEMS.map(item => item.id)
      const existingIds = new Set(settings.itemOrder)
      const newItems = allItemIds.filter(id => !existingIds.has(id))
      const mergedOrder = [...settings.itemOrder, ...newItems]

      setDragItems(
        mergedOrder.map((id) => ({
          id,
          label: t(
            FLOATING_WINDOW_ITEMS.find((item) => item.id === id)?.labelKey || id
          ),
          visible: settings.visibleItems.includes(id)
        }))
      )
    }
  }, [open, settings, t])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setDragItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        const newItems = [...items]
        const [removed] = newItems.splice(oldIndex, 1)
        newItems.splice(newIndex, 0, removed)
        return newItems
      })
    }
  }

  const handleToggleItem = (id: string) => {
    setDragItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, visible: !item.visible } : item
      )
    )
  }

  const handleSave = () => {
    onSettingsChange({
      opacity: localOpacity,
      visibleItems: dragItems.filter((i) => i.visible).map((i) => i.id),
      itemOrder: dragItems.map((i) => i.id)
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{t('monitor.floatingWindow.settings')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('monitor.floatingWindow.settingsDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-7 py-4">
          <div>
            <div className="mb-3 flex items-center justify-between text-sm font-semibold">
              <span className="text-foreground">{t('monitor.floatingWindow.backgroundOpacity')}</span>
              <span className="font-mono font-bold text-primary">{localOpacity}%</span>
            </div>
            <Slider
              value={[localOpacity]}
              onValueChange={(value) => setLocalOpacity(value[0])}
              min={10}
              max={100}
              step={1}
            />
          </div>
          <div className="border-t border-border-subtle pt-6">
            <div className="mb-4 text-xs font-medium text-muted-foreground">
              {t('monitor.floatingWindow.dragToReorder')}
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext
                items={dragItems.map(i => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2.5">
                  {dragItems.map((item) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      onToggle={handleToggleItem}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>{t('common.confirm')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
