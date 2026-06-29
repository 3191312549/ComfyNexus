/**
 * 资产批量操作工具栏
 */

import { useTranslation } from 'react-i18next'
import { Heart, Trash2, X, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAssetStore } from '@/stores/useAssetStore'
import { cn } from '@/lib/utils'

interface AssetBatchToolbarProps {
  onDeleteConfirm?: () => void
}

export function AssetBatchToolbar({ onDeleteConfirm }: AssetBatchToolbarProps) {
  const { t } = useTranslation()
  const {
    selectedAssetIds,
    getFilteredAssets,
    clearSelection,
    toggleBatchMode,
    toggleFavorite
  } = useAssetStore()

  const selectedCount = selectedAssetIds.length
  const filteredCount = getFilteredAssets().length

  if (selectedCount === 0) {
    return null
  }

  const handleBatchFavorite = async () => {
    for (const id of selectedAssetIds) {
      await toggleFavorite(id)
    }
  }

  const handleBatchDelete = () => {
    onDeleteConfirm?.()
  }

  return (
    <div
      className={cn(
        'absolute bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border-subtle bg-surface/95 px-4 py-2 shadow-soft-lg backdrop-blur-lg'
      )}
    >
      <div className="flex items-center gap-2 pr-3">
        <CheckSquare className="size-4 text-success" />
        <span className="text-sm font-medium">
          {t('asset.batchSelected', { count: selectedCount })}
        </span>
        <span className="text-xs text-muted-foreground">
          / {t('asset.batchTotal', { count: filteredCount })}
        </span>
      </div>

      <div className="h-4 w-px bg-border-subtle" />

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBatchFavorite}
          className="h-8 rounded-full"
        >
          <Heart className="mr-1 size-4" />
          {t('asset.batchFavorite')}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleBatchDelete}
          className="h-8 rounded-full text-danger hover:bg-danger/10"
        >
          <Trash2 className="mr-1 size-4" />
          {t('asset.batchDelete')}
        </Button>
      </div>

      <div className="h-4 w-px bg-border-subtle" />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          clearSelection()
          toggleBatchMode()
        }}
        className="size-8 rounded-full text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </Button>
    </div>
  )
}
