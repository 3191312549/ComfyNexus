/**
 * 提示词批量操作栏组件
 */

import { useTranslation } from 'react-i18next'
import { X, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface PromptBatchToolbarProps {
  selectedCount: number
  totalCount: number
  onClearSelection: () => void
  onBatchFavorite: () => void
  onBatchDelete: () => void
  className?: string
}

export function PromptBatchToolbar({
  selectedCount,
  totalCount,
  onClearSelection,
  onBatchFavorite,
  onBatchDelete,
  className
}: PromptBatchToolbarProps) {
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
        {t('prompt.batch.selected', { count: selectedCount, total: totalCount })}
      </span>

      <div className="h-4 w-px bg-border-subtle" />

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBatchFavorite}
          className="gap-1.5 text-muted-foreground hover:text-warning"
        >
          <Star className="h-4 w-4" />
          {t('prompt.batch.favorite')}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onBatchDelete}
          className="gap-1.5 text-muted-foreground hover:text-danger"
        >
          <Trash2 className="h-4 w-4" />
          {t('prompt.batch.delete')}
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
