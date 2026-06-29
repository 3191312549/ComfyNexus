/**
 * 工具栏组件
 */

import { useCallback, useRef } from 'react'
import { ArrowUpDown, Upload, Download, CheckSquare, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import type { FilterTag } from '@/stores/usePromptStore'

type SortBy = 'name' | 'created_at' | 'updated_at' | 'usage_count'

interface PromptToolbarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  filterTags: FilterTag[]
  activeFilterTag: string
  onFilterTagChange: (tagId: string) => void
  isBatchMode: boolean
  selectedCount: number
  totalCount: number
  onToggleBatchMode: () => void
  onAddPrompt: () => void
  onImport?: (data: unknown) => Promise<void>
  onExport?: () => Promise<void>
  sortBy?: SortBy
  onSortChange?: (sortBy: SortBy) => void
}

export function PromptToolbar({
  searchQuery,
  onSearchChange,
  filterTags,
  activeFilterTag,
  onFilterTagChange,
  isBatchMode,
  selectedCount,
  totalCount,
  onToggleBatchMode,
  onAddPrompt,
  onImport,
  onExport,
  sortBy = 'updated_at',
  onSortChange
}: PromptToolbarProps) {
  const { t } = useTranslation()
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value)
  }, [onSearchChange])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (onImport) {
        await onImport(data)
      }
    } catch (error) {
      toast.error(t('prompt.toast.importParseFailed'))
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onImport])

  const handleExportClick = useCallback(async () => {
    if (onExport) {
      await onExport()
    }
  }, [onExport])

  const handleSortClick = useCallback(() => {
    if (!onSortChange) return
    
    const sortOptions: SortBy[] = ['name', 'created_at', 'updated_at', 'usage_count']
    const currentIndex = sortOptions.indexOf(sortBy)
    const nextIndex = (currentIndex + 1) % sortOptions.length
    const nextSortBy = sortOptions[nextIndex]
    
    onSortChange(nextSortBy)
  }, [sortBy, onSortChange])

  const getSortLabel = () => {
    switch (sortBy) {
      case 'name': return t('prompt.toolbar.sortByName')
      case 'created_at': return t('prompt.toolbar.sortByCreatedAt')
      case 'updated_at': return t('prompt.toolbar.sortByUpdatedAt')
      case 'usage_count': return t('prompt.toolbar.sortByUsageCount')
      default: return t('prompt.toolbar.sort')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('prompt.toolbar.searchPlaceholder')}
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-96 rounded-full pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />
          
          <Button 
            variant="outline" 
            size="sm" 
            title={`${t('prompt.toolbar.sort')}: ${getSortLabel()}`}
            onClick={handleSortClick}
          >
            <ArrowUpDown className="size-4" />
            {getSortLabel()}
          </Button>

          <Button variant="outline" size="sm" title={t('prompt.toolbar.import')} onClick={handleImportClick}>
            <Upload className="size-4" />
            {t('prompt.toolbar.import')}
          </Button>

          <Button variant="outline" size="sm" title={t('prompt.toolbar.export')} onClick={handleExportClick}>
            <Download className="size-4" />
            {t('prompt.toolbar.export')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className={cn(
              isBatchMode && 'bg-success/15 text-success border-success hover:bg-success/20'
            )}
            onClick={onToggleBatchMode}
          >
            <CheckSquare className="size-4" />
            {isBatchMode ? t('prompt.toolbar.done') : t('prompt.toolbar.batch')}
          </Button>

          <Button
            size="sm"
            onClick={onAddPrompt}
          >
            <Plus className="size-4" />
            {t('prompt.toolbar.addPrompt')}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {filterTags.map((tag) => (
            <Button
              key={tag.id}
              variant="ghost"
              size="sm"
              className={cn(
                'rounded-full text-xs',
                activeFilterTag === tag.id
                  ? 'border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15'
                  : 'border border-border-subtle bg-muted text-muted-foreground hover:border-border hover:text-foreground'
              )}
              onClick={() => onFilterTagChange(tag.id)}
            >
              {tag.name}
            </Button>
          ))}
        </div>

        <div className="text-xs text-muted-foreground">
          {t('prompt.toolbar.totalPrompts', { count: totalCount })}
          {isBatchMode && selectedCount > 0 && (
            <span className="ml-2 text-success">
              {t('prompt.toolbar.selected', { count: selectedCount })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
