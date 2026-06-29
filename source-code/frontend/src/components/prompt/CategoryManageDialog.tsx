/**
 * 分类管理弹窗组件
 */

import { useState, useCallback, useEffect } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { NativeSelect } from '@/components/ui/NativeSelect'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { useTranslation } from 'react-i18next'
import type { PromptCategory, CategoryInput } from '@/stores/usePromptStore'

interface CategoryManageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: PromptCategory[]
  onAddCategory: (category: CategoryInput) => void
  onUpdateCategory: (id: string, updates: Partial<CategoryInput>) => void
  onDeleteCategory: (id: string) => void
}

interface CategoryRow {
  id: string
  parentId: string
  name: string
  originalName?: string
  originalParentId?: string
  isNew?: boolean
}

export function CategoryManageDialog({
  open,
  onOpenChange,
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory
}: CategoryManageDialogProps) {
  const { t } = useTranslation()
  
  const buildRowsFromCategories = useCallback((cats: PromptCategory[]): CategoryRow[] => {
    return cats
      .filter((c) => c.id !== 'all' && c.id !== 'favorites')
      .flatMap((cat) => [
        { 
          id: cat.id, 
          parentId: cat.parentId || 'root', 
          name: cat.name,
          originalName: cat.name,
          originalParentId: cat.parentId || 'root'
        },
        ...(cat.children || []).map((child) => ({
          id: child.id,
          parentId: child.parentId || cat.id,
          name: child.name,
          originalName: child.name,
          originalParentId: child.parentId || cat.id
        }))
      ])
  }, [])

  const [rows, setRows] = useState<CategoryRow[]>(() => buildRowsFromCategories(categories))

  useEffect(() => {
    if (open) {
      setRows(buildRowsFromCategories(categories))
    }
  }, [open, categories, buildRowsFromCategories])

  const getParentOptions = () => {
    const options = [{ value: 'root', label: t('prompt.category.topLevel') }]
    categories
      .filter((c) => c.id !== 'all' && c.id !== 'favorites' && !c.parentId)
      .forEach((cat) => {
        options.push({ value: cat.id, label: cat.name })
      })
    return options
  }

  const handleAddRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        parentId: 'root',
        name: '',
        isNew: true
      }
    ])
  }, [])

  const handleDeleteRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id))
    if (!id.startsWith('new-')) {
      onDeleteCategory(id)
    }
  }, [onDeleteCategory])

  const handleRowChange = useCallback((id: string, field: 'parentId' | 'name', value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    )
  }, [])

  const handleSave = useCallback(async () => {
    for (const row of rows) {
      if (row.isNew && row.name.trim()) {
        await onAddCategory({
          name: row.name,
          icon: row.parentId === 'root' ? 'folder' : 'file-text',
          parentId: row.parentId === 'root' ? null : row.parentId
        })
      } else if (!row.isNew) {
        const nameChanged = row.name !== row.originalName
        const parentChanged = row.parentId !== row.originalParentId
        if (nameChanged || parentChanged) {
          const updates: Partial<CategoryInput> = {}
          if (nameChanged) updates.name = row.name.trim()
          if (parentChanged) updates.parentId = row.parentId === 'root' ? null : row.parentId
          await onUpdateCategory(row.id, updates)
        }
      }
    }
    onOpenChange(false)
  }, [rows, categories, onAddCategory, onUpdateCategory, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('prompt.category.manageTitle')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4 px-1 text-xs text-muted-foreground">
            <span className="flex-1">{t('prompt.category.parentCategory')}</span>
            <span className="flex-[2]">{t('prompt.category.categoryName')}</span>
            <span className="w-10" />
          </div>

          <div className="max-h-80 space-y-3 overflow-y-auto">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center gap-3">
                <NativeSelect
                  value={row.parentId}
                  onValueChange={(value) => handleRowChange(row.id, 'parentId', value)}
                  className="flex-1"
                >
                  {getParentOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </NativeSelect>

                <Input
                  value={row.name}
                  onChange={(e) => handleRowChange(row.id, 'name', e.target.value)}
                  placeholder={t('prompt.editor.namePlaceholder')}
                  className="flex-[2]"
                />

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-danger hover:bg-danger/10 hover:text-danger"
                  onClick={() => handleDeleteRow(row.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={handleAddRow}
          >
            <Plus className="mr-2 size-4" />
            {t('prompt.category.addRow')}
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('prompt.editor.cancel')}
          </Button>
          <Button onClick={handleSave}>
            {t('prompt.category.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
