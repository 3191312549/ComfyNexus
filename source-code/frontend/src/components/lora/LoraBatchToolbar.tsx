/**
 * LoRA 批量操作工具栏组件
 */

import { useTranslation } from 'react-i18next'
import { X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface LoraBatchToolbarProps {
  selectedCount: number
  totalCount: number
  onClearSelection: () => void
  onBatchDelete: () => void
  className?: string
}

export function LoraBatchToolbar({
  selectedCount,
  totalCount,
  onClearSelection,
  onBatchDelete,
  className
}: LoraBatchToolbarProps) {
  const { t } = useTranslation()

  if (selectedCount === 0) return null

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-xl border border-border-subtle bg-card px-6 py-3 shadow-soft-lg',
        className
      )}
    >
      <span className="text-sm font-medium text-foreground">
        {t('lora.batch.selected', { count: selectedCount, total: totalCount })}
      </span>

      <div className="h-4 w-px bg-border-subtle" />

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBatchDelete}
          className="gap-1.5 text-muted-foreground hover:text-danger"
        >
          <Trash2 className="h-4 w-4" />
          {t('lora.batch.delete')}
        </Button>
      </div>

      <div className="h-4 w-px bg-border-subtle" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="gap-1.5 text-muted-foreground"
      >
        <X className="h-4 w-4" />
        {t('common.cancel')}
      </Button>
    </div>
  )
}
