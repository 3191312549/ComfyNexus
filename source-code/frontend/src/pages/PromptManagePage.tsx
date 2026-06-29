/**
 * 提示词管理页面
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import {
  PromptToolbar,
  PromptCategoryTree,
  PromptGrid,
  PromptEditorDialog,
  CategoryManageDialog,
  PromptPreviewPopover,
  DragProvider,
  PromptDragLayer,
  PromptSelectionBox,
  PromptBatchToolbar
} from '@/components/prompt'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import type { PromptGridRef } from '@/components/prompt/PromptGrid'
import {
  usePromptStore,
  type Prompt,
  type PromptInput,
  type CategoryInput
} from '@/stores/usePromptStore'
import { useTranslation } from 'react-i18next'

export default function PromptManagePage() {
  const { t } = useTranslation()
  const {
    categories,
    filterTags,
    selectedCategoryId,
    selectedPromptIds,
    isBatchMode,
    searchQuery,
    activeFilterTag,
    isLoading,
    loadData,
    setSelectedCategoryId,
    setActiveFilterTag,
    setSearchQuery,
    toggleBatchMode,
    togglePromptSelection,
    createPrompt,
    updatePrompt,
    deleteSelectedPrompts,
    toggleFavorite,
    movePromptsToCategory,
    createCategory,
    updateCategory,
    deleteCategory,
    exportPrompts,
    importPrompts,
    getFilteredPrompts,
    getPromptCount,
    setBatchMode,
    setSelectedPromptIds
  } = usePromptStore()

  const [showEditor, setShowEditor] = useState(false)
  const [showCategoryManage, setShowCategoryManage] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
  const [hoveredPrompt, setHoveredPrompt] = useState<Prompt | null>(null)
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 })
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [batchDeleteConfirmOpen, setBatchDeleteConfirmOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [pendingDeleteName, setPendingDeleteName] = useState<string>('')
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'updated_at' | 'usage_count'>('updated_at')
  
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null)
  
  const gridRef = useRef<PromptGridRef>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null)
  const isSelectingRef = useRef(false)

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredPrompts = getFilteredPrompts()
  const totalCount = getPromptCount()

  const handleAddPrompt = useCallback(() => {
    setEditingPrompt(null)
    setShowEditor(true)
  }, [])

  const handleEditPrompt = useCallback((prompt: Prompt) => {
    setEditingPrompt(prompt)
    setShowEditor(true)
  }, [])

  const handleSavePrompt = useCallback(async (data: PromptInput) => {
    if (editingPrompt) {
      const success = await updatePrompt(editingPrompt.id, data)
      if (success) {
        toast.success(t('prompt.toast.updateSuccess'))
        return true
      } else {
        toast.error(t('prompt.toast.updateFailed'))
        return false
      }
    } else {
      const result = await createPrompt(data)
      if (result.prompt) {
        toast.success(t('prompt.toast.createSuccess'))
        return true
      } else {
        toast.error(result.error || t('prompt.toast.createFailed'))
        return false
      }
    }
  }, [editingPrompt, createPrompt, updatePrompt, t])

  const handleCopyPrompt = useCallback((text: string, type: 'positive' | 'negative') => {
    navigator.clipboard.writeText(text)
    toast.success(type === 'positive' ? t('prompt.toast.copyPositive') : t('prompt.toast.copyNegative'))
  }, [t])

  const handleToggleFavorite = useCallback(async (id: string) => {
    const success = await toggleFavorite(id)
    if (!success) {
      toast.error(t('prompt.toast.updateFailed'))
    }
  }, [toggleFavorite, t])

  const handleDeletePrompt = useCallback((id: string) => {
    const prompt = filteredPrompts.find((p) => p.id === id)
    if (prompt) {
      setPendingDeleteId(id)
      setPendingDeleteName(prompt.name)
      setDeleteConfirmOpen(true)
    }
  }, [filteredPrompts])

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDeleteId) return
    
    const success = await usePromptStore.getState().deletePrompt(pendingDeleteId)
    if (success) {
      toast.success(t('prompt.toast.deleteSuccess'))
    } else {
      toast.error(t('prompt.toast.deleteFailed'))
    }
    setDeleteConfirmOpen(false)
    setPendingDeleteId(null)
    setPendingDeleteName('')
  }, [pendingDeleteId, t])

  const handleBatchDeleteClick = useCallback(() => {
    setBatchDeleteConfirmOpen(true)
  }, [])

  const handleBatchDeleteConfirm = useCallback(async () => {
    const success = await deleteSelectedPrompts()
    if (success) {
      toast.success(t('prompt.toast.batchDeleteSuccess'))
    } else {
      toast.error(t('prompt.toast.deleteFailed'))
    }
    setBatchDeleteConfirmOpen(false)
  }, [deleteSelectedPrompts, t])

  const handleHoverPrompt = useCallback((prompt: Prompt | null) => {
    setHoveredPrompt(prompt)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setPopoverPosition({ x: e.clientX, y: e.clientY })
  }, [])

  const findCategoryById = useCallback((categoryId: string, categoryList: typeof categories): typeof categories[0] | undefined => {
    for (const category of categoryList) {
      if (category.id === categoryId) {
        return category
      }
      if (category.children) {
        const found = findCategoryById(categoryId, category.children)
        if (found) return found
      }
    }
    return undefined
  }, [])

  const handleDropToCategory = useCallback(async (categoryId: string, promptIds: string[]) => {
    const count = promptIds.length
    
    if (categoryId === 'favorites') {
      let successCount = 0
      for (const id of promptIds) {
        const success = await toggleFavorite(id)
        if (success) successCount++
      }
      if (successCount > 0) {
        toast.success(t('prompt.toast.favoriteSuccess', { count: successCount }))
      } else {
        toast.error(t('prompt.toast.favoriteFailed'))
      }
      return
    }
    
    const success = await movePromptsToCategory(promptIds, categoryId)
    if (success) {
      const category = findCategoryById(categoryId, categories)
      toast.success(t('prompt.toast.moveSuccess', { count, category: category?.name || categoryId }))
    } else {
      toast.error(t('prompt.toast.moveFailed'))
    }
  }, [movePromptsToCategory, toggleFavorite, categories, findCategoryById, t])

  const handleAddCategory = useCallback(async (data: CategoryInput) => {
    const newCategory = await createCategory(data)
    if (newCategory) {
      toast.success(t('prompt.toast.categoryAddSuccess'))
    } else {
      toast.error(t('prompt.toast.categoryAddFailed'))
    }
  }, [createCategory, t])

  const handleUpdateCategory = useCallback(async (id: string, data: Partial<CategoryInput>) => {
    const success = await updateCategory(id, data)
    if (success) {
      toast.success(t('prompt.toast.categoryUpdateSuccess'))
    } else {
      toast.error(t('prompt.toast.categoryUpdateFailed'))
    }
  }, [updateCategory, t])

  const handleDeleteCategory = useCallback(async (id: string) => {
    const success = await deleteCategory(id)
    if (success) {
      toast.success(t('prompt.toast.categoryDeleteSuccess'))
    } else {
      const error = usePromptStore.getState().error
      toast.error(error || t('prompt.toast.categoryDeleteFailed'))
    }
  }, [deleteCategory, t])

  const handleSortChange = useCallback((newSortBy: typeof sortBy) => {
    setSortBy(newSortBy)
  }, [])

  const handleExport = useCallback(async () => {
    const result = await exportPrompts()
    if (result.success && result.data) {
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `prompts_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(t('prompt.toast.exportSuccess'))
    } else {
      toast.error(result.error || t('prompt.toast.exportFailed'))
    }
  }, [exportPrompts, t])

  const handleImport = useCallback(async (data: unknown) => {
    const result = await importPrompts(data)
    if (result.success) {
      toast.success(result.message || t('prompt.toast.importSuccess', { count: result.importedCount || 0 }))
    } else {
      toast.error(result.error || t('prompt.toast.importFailed'))
    }
  }, [importPrompts, t])

  const getIntersectingCardIds = useCallback((
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): string[] => {
    const selectionRect = {
      left: Math.min(start.x, end.x),
      right: Math.max(start.x, end.x),
      top: Math.min(start.y, end.y),
      bottom: Math.max(start.y, end.y)
    }

    const intersectingIds: string[] = []
    const cardRefs = gridRef.current?.getCardRefs() ?? new Map()

    cardRefs.forEach((cardEl, promptId) => {
      const cardRect = cardEl.getBoundingClientRect()

      if (
        cardRect.left < selectionRect.right &&
        cardRect.right > selectionRect.left &&
        cardRect.top < selectionRect.bottom &&
        cardRect.bottom > selectionRect.top
      ) {
        intersectingIds.push(promptId)
      }
    })

    return intersectingIds
  }, [])

  const handleSelectionMouseDown = useCallback((e: React.MouseEvent) => {
    console.log('[PromptManagePage] handleSelectionMouseDown 触发', {
      button: e.button,
      target: e.target,
      closestCard: (e.target as HTMLElement).closest('[data-prompt-card]'),
      isBatchMode
    })
    
    if (e.button !== 0) {
      console.log('[PromptManagePage] 非左键点击，忽略')
      return
    }
    if ((e.target as HTMLElement).closest('[data-prompt-card]')) {
      console.log('[PromptManagePage] 点击在卡片上，忽略')
      return
    }

    console.log('[PromptManagePage] 开始框选')

    const point = { x: e.clientX, y: e.clientY }
    console.log('[PromptManagePage] 设置选区起点:', point)
    
    setIsSelecting(true)
    setSelectionStart(point)
    setSelectionEnd(point)
    selectionStartRef.current = point
    isSelectingRef.current = true
  }, [isBatchMode, setBatchMode])

  useEffect(() => {
    console.log('[PromptManagePage] isSelecting 变化:', isSelecting)
    
    if (!isSelecting) return

    const handleMouseMove = (e: MouseEvent) => {
      console.log('[PromptManagePage] document mousemove', {
        isSelectingRef: isSelectingRef.current,
        selectionStartRef: selectionStartRef.current,
        clientX: e.clientX,
        clientY: e.clientY
      })
      
      if (!isSelectingRef.current || !selectionStartRef.current) {
        console.log('[PromptManagePage] mousemove 条件不满足，跳过')
        return
      }

      setSelectionEnd({ x: e.clientX, y: e.clientY })

      const intersectingIds = getIntersectingCardIds(selectionStartRef.current, { x: e.clientX, y: e.clientY })
      console.log('[PromptManagePage] 碰撞检测到卡片:', intersectingIds.length, '个')
      
      if (intersectingIds.length > 0 && !isBatchMode) {
        console.log('[PromptManagePage] 框选到卡片，自动开启批量模式')
        setBatchMode(true)
      }
      
      usePromptStore.setState(state => {
        const newIds = new Set(state.selectedPromptIds)
        intersectingIds.forEach(id => newIds.add(id))
        return { selectedPromptIds: Array.from(newIds) }
      })
    }

    const handleMouseUp = () => {
      console.log('[PromptManagePage] document mouseup，结束框选')
      setIsSelecting(false)
      setSelectionStart(null)
      setSelectionEnd(null)
      isSelectingRef.current = false
      selectionStartRef.current = null
    }

    console.log('[PromptManagePage] 添加 document 事件监听器')
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      console.log('[PromptManagePage] 移除 document 事件监听器')
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isSelecting, getIntersectingCardIds, isBatchMode, setBatchMode])

  useEffect(() => {
    if (!isSelecting) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSelecting(false)
        setSelectionStart(null)
        setSelectionEnd(null)
        isSelectingRef.current = false
        selectionStartRef.current = null
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isSelecting])

  const sortedPrompts = useCallback(() => {
    const filtered = getFilteredPrompts()
    return [...filtered].sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'zh-CN')
          break
        case 'created_at':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'updated_at':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          break
        case 'usage_count':
          comparison = (a.usageCount || 0) - (b.usageCount || 0)
          break
      }
      return sortBy === 'name' ? comparison : -comparison
    })
  }, [getFilteredPrompts, sortBy])

  return (
    <DragProvider onDrop={handleDropToCategory}>
      <div
        className="flex h-full flex-col"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPrompt(null)}
      >
        <header className="flex-shrink-0 border-b border-border-subtle bg-surface p-4">
          <PromptToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterTags={filterTags}
            activeFilterTag={activeFilterTag}
            onFilterTagChange={setActiveFilterTag}
            isBatchMode={isBatchMode}
            selectedCount={selectedPromptIds.length}
            totalCount={totalCount}
            onToggleBatchMode={toggleBatchMode}
            onAddPrompt={handleAddPrompt}
            onImport={handleImport}
            onExport={handleExport}
            sortBy={sortBy}
            onSortChange={handleSortChange}
          />
        </header>

        <main className="flex flex-1 overflow-hidden">
          <aside className="w-56 flex-shrink-0 border-r border-border-subtle bg-surface">
            <PromptCategoryTree
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={setSelectedCategoryId}
              onOpenCategoryManage={() => setShowCategoryManage(true)}
            />
          </aside>

          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-6"
            onMouseDown={handleSelectionMouseDown}
          >
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-muted-foreground">{t('prompt.loading')}</div>
              </div>
            ) : (
              <PromptGrid
                ref={gridRef}
                prompts={sortedPrompts()}
                selectedPromptIds={selectedPromptIds}
                isBatchMode={isBatchMode}
                onSelectPrompt={togglePromptSelection}
                onEditPrompt={handleEditPrompt}
                onCopyPrompt={handleCopyPrompt}
                onToggleFavorite={handleToggleFavorite}
                onDeletePrompt={handleDeletePrompt}
                onHoverPrompt={handleHoverPrompt}
              />
            )}
          </div>
        </main>

        <PromptEditorDialog
          open={showEditor}
          onOpenChange={setShowEditor}
          prompt={editingPrompt}
          categories={categories}
          onSave={handleSavePrompt}
        />

        <CategoryManageDialog
          open={showCategoryManage}
          onOpenChange={setShowCategoryManage}
          categories={categories}
          onAddCategory={handleAddCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
        />

        <PromptPreviewPopover
          prompt={hoveredPrompt}
          position={popoverPosition}
        />

        <PromptDragLayer getCardRefs={() => gridRef.current?.getCardRefs() ?? new Map()} />

        {isSelecting && selectionStart && selectionEnd && (
          <PromptSelectionBox
            startPoint={selectionStart}
            endPoint={selectionEnd}
          />
        )}

        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title={t('prompt.confirm.deleteTitle')}
          description={t('prompt.confirm.deleteDescription', { name: pendingDeleteName })}
          confirmText={t('prompt.confirm.confirmButton')}
          variant="destructive"
          onConfirm={handleConfirmDelete}
        />

        <ConfirmDialog
          open={batchDeleteConfirmOpen}
          onOpenChange={setBatchDeleteConfirmOpen}
          title={t('prompt.confirm.batchDeleteTitle')}
          description={t('prompt.confirm.batchDeleteDescription', { count: selectedPromptIds.length })}
          confirmText={t('prompt.confirm.confirmButton')}
          variant="destructive"
          onConfirm={handleBatchDeleteConfirm}
        />

        <PromptBatchToolbar
          selectedCount={selectedPromptIds.length}
          totalCount={filteredPrompts.length}
          onClearSelection={() => {
            setSelectedPromptIds([])
            setBatchMode(false)
          }}
          onBatchFavorite={async () => {
            let successCount = 0
            for (const id of selectedPromptIds) {
              const success = await toggleFavorite(id)
              if (success) successCount++
            }
            if (successCount > 0) {
              toast.success(t('prompt.toast.favoriteSuccess', { count: successCount }))
            }
          }}
          onBatchDelete={handleBatchDeleteClick}
        />
      </div>
    </DragProvider>
  )
}
