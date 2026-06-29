/**
 * 资产库分类管理弹窗组件
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Trash2, Plus, Folder } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { NativeSelect } from '@/components/ui/NativeSelect'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { AssetCategory, Asset } from '@/mocks/asset'

interface CategoryNode {
  id: string
  name: string
  parentId: string | null
  children: CategoryNode[]
  assetCount: number
}

interface AssetCategoryManageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: AssetCategory[]
  assets: Asset[]
  onCreateCategory: (name: string, parentId?: string) => Promise<boolean>
  onUpdateCategory: (categoryId: string, name?: string) => Promise<boolean>
  onDeleteCategory: (categoryId: string, cascade?: boolean) => Promise<boolean>
}

function buildCategoryTree(
  cats: AssetCategory[],
  assetList: Asset[]
): CategoryNode[] {
  const nodeMap = new Map<string, CategoryNode>()
  const roots: CategoryNode[] = []

  cats
    .filter((c) => c.id !== 'all' && c.id !== 'favorites')
    .forEach((cat) => {
      nodeMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        parentId: cat.parentId || null,
        children: [],
        assetCount: assetList.filter((a) => a.categoryId === cat.id).length
      })
    })

  nodeMap.forEach((node) => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

function findNodeById(
  nodes: CategoryNode[],
  id: string
): CategoryNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = findNodeById(node.children, id)
    if (found) return found
  }
  return null
}

function CategoryTree({
  nodes,
  selectedId,
  onSelect,
  level = 0
}: {
  nodes: CategoryNode[]
  selectedId: string | null
  onSelect: (id: string) => void
  level?: number
}) {
  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <div key={node.id} className="relative">
          {level > 0 && (
            <div 
              className="absolute top-0 h-full w-px bg-border-subtle"
              style={{ left: `${(level - 1) * 16 + 14}px` }}
            />
          )}
          <button
            type="button"
            onClick={() => onSelect(node.id)}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm',
              'hover:bg-surface-active',
              selectedId === node.id && 'bg-primary/10 text-primary'
            )}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
          >
            <Folder className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{node.name}</span>
            {node.children.length > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">
                {node.children.length}
              </span>
            )}
          </button>
          {node.children.length > 0 && (
            <CategoryTree
              nodes={node.children}
              selectedId={selectedId}
              onSelect={onSelect}
              level={level + 1}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export function AssetCategoryManageDialog({
  open,
  onOpenChange,
  categories,
  assets,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory
}: AssetCategoryManageDialogProps) {
  const { t } = useTranslation()

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  )
  const [editName, setEditName] = useState('')
  const [editParentId, setEditParentId] = useState<string>('root')
  const [newChildName, setNewChildName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean
    categoryId: string
    categoryName: string
    assetCount: number
    childCount: number
  }>({
    open: false,
    categoryId: '',
    categoryName: '',
    assetCount: 0,
    childCount: 0
  })

  const categoryTree = useMemo(
    () => buildCategoryTree(categories, assets),
    [categories, assets]
  )

  const selectedCategory = selectedCategoryId
    ? findNodeById(categoryTree, selectedCategoryId)
    : null

  useEffect(() => {
    if (open && categoryTree.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categoryTree[0].id)
    }
  }, [open, categoryTree, selectedCategoryId])

  useEffect(() => {
    if (selectedCategory) {
      setEditName(selectedCategory.name)
      setEditParentId(selectedCategory.parentId || 'root')
    }
  }, [selectedCategory])

  const getParentOptions = useCallback(
    (excludeId?: string) => {
      const options = [{ value: 'root', label: t('asset.categoryManage.topLevel') }]

      const addOptions = (nodes: CategoryNode[], prefix = '') => {
        nodes.forEach((node) => {
          if (node.id !== excludeId) {
            options.push({
              value: node.id,
              label: prefix + node.name
            })
            if (node.children.length > 0) {
              addOptions(node.children, prefix + '  ')
            }
          }
        })
      }

      addOptions(categoryTree)
      return options
    },
    [categoryTree, t]
  )

  const handleUpdateName = useCallback(async () => {
    if (!selectedCategoryId || !editName.trim()) return
    if (editName === selectedCategory?.name) return

    await onUpdateCategory(selectedCategoryId, editName.trim())
  }, [selectedCategoryId, editName, selectedCategory, onUpdateCategory])

  const handleUpdateParent = useCallback(
    async (newParentId: string) => {
      if (!selectedCategoryId) return

      setEditParentId(newParentId)

      // TODO: 需要后端支持更新父级
    },
    [selectedCategoryId]
  )

  const handleAddChild = useCallback(async () => {
    if (!selectedCategoryId || !newChildName.trim()) return

    await onCreateCategory(newChildName.trim(), selectedCategoryId)
    setNewChildName('')
  }, [selectedCategoryId, newChildName, onCreateCategory])

  const handleAddTopLevel = useCallback(async () => {
    const name = t('asset.categoryManage.newCategory')
    await onCreateCategory(name)
  }, [onCreateCategory, t])

  const handleDeleteClick = useCallback(() => {
    if (!selectedCategory) return

    const childCount = selectedCategory.children.length
    const assetCount = selectedCategory.assetCount

    setDeleteConfirm({
      open: true,
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      childCount,
      assetCount
    })
  }, [selectedCategory])

  const handleConfirmDelete = useCallback(async () => {
    await onDeleteCategory(deleteConfirm.categoryId, true)
    setDeleteConfirm({
      open: false,
      categoryId: '',
      categoryName: '',
      assetCount: 0,
      childCount: 0
    })
    if (selectedCategoryId === deleteConfirm.categoryId) {
      setSelectedCategoryId(categoryTree[0]?.id || null)
    }
  }, [
    onDeleteCategory,
    deleteConfirm.categoryId,
    selectedCategoryId,
    categoryTree
  ])

  const getDeleteDescription = () => {
    const { categoryName, assetCount, childCount } = deleteConfirm
    if (assetCount > 0 && childCount > 0) {
      return t('asset.confirm.deleteCategoryWithContent', {
        name: categoryName,
        assetCount,
        childCount
      })
    } else if (assetCount > 0) {
      return t('asset.confirm.deleteCategoryWithAssets', {
        name: categoryName,
        assetCount
      })
    } else if (childCount > 0) {
      return t('asset.confirm.deleteCategoryWithChildren', {
        name: categoryName,
        childCount
      })
    }
    return t('asset.confirm.deleteCategoryEmpty', { name: categoryName })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('asset.categoryManage.title')}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4" style={{ height: '600px' }}>
          <div className="flex w-80 shrink-0 flex-col border-r border-border-subtle pr-4">
            <div className="flex-1 overflow-y-auto">
              <CategoryTree
                nodes={categoryTree}
                selectedId={selectedCategoryId}
                onSelect={setSelectedCategoryId}
              />
            </div>
            <Button
              variant="outline"
              className="mt-4 w-full shrink-0 border-dashed"
              onClick={handleAddTopLevel}
            >
              <Plus className="mr-2 size-4" />
              {t('asset.categoryManage.addTopLevel')}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {selectedCategory ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('asset.categoryManage.categoryName')}
                  </label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleUpdateName}
                    placeholder={t('asset.categoryManage.namePlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('asset.categoryManage.parentCategory')}
                  </label>
                  <NativeSelect
                    value={editParentId}
                    onValueChange={handleUpdateParent}
                  >
                    {getParentOptions(selectedCategoryId || undefined).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                {selectedCategory.children.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      {t('asset.categoryManage.childCategories')} (
                      {selectedCategory.children.length})
                    </label>
                    <div className="rounded-lg border border-border-subtle">
                      {selectedCategory.children.map((child, index) => (
                        <div
                          key={child.id}
                          className={cn(
                            'flex items-center justify-between px-3 py-2',
                            index !== selectedCategory.children.length - 1 &&
                              'border-b border-border-subtle'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Folder className="size-4 text-muted-foreground" />
                            <span className="text-sm">{child.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-danger"
                            onClick={() => {
                              setDeleteConfirm({
                                open: true,
                                categoryId: child.id,
                                categoryName: child.name,
                                childCount: child.children.length,
                                assetCount: child.assetCount
                              })
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Input
                    value={newChildName}
                    onChange={(e) => setNewChildName(e.target.value)}
                    placeholder={t('asset.categoryManage.childPlaceholder')}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddChild()
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={handleAddChild}
                    disabled={!newChildName.trim()}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>

                <div className="pt-4">
                  <Button
                    variant="outline"
                    className="text-danger hover:bg-danger/10"
                    onClick={handleDeleteClick}
                  >
                    <Trash2 className="mr-2 size-4" />
                    {t('asset.categoryManage.deleteCategory')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                {t('asset.categoryManage.selectCategory')}
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) =>
          setDeleteConfirm((prev) => ({ ...prev, open }))
        }
        title={t('asset.confirm.deleteCategoryTitle')}
        description={getDeleteDescription()}
        confirmText={t('common.delete')}
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </Dialog>
  )
}
