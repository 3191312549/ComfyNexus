/**
 * 分类树组件
 */

import {
  Settings,
  Layers,
  Star,
  User,
  Building,
  Sparkles,
  Image,
  FileText,
  Folder,
  FolderOpen,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useDragContext } from './PromptDragContext'
import { useTranslation } from 'react-i18next'
import type { PromptCategory } from '@/stores/usePromptStore'
import type { CategoryIconName } from '@/mocks/prompt'

const iconMap: Record<CategoryIconName, LucideIcon> = {
  'layers': Layers,
  'star': Star,
  'folder': FileText,
  'file-text': FileText,
  'user': User,
  'building': Building,
  'sparkles': Sparkles,
  'image': Image
}

interface PromptCategoryTreeProps {
  categories: PromptCategory[]
  selectedCategoryId: string
  onSelectCategory: (categoryId: string) => void
  onOpenCategoryManage: () => void
}

function CategoryItem({
  category,
  selectedCategoryId,
  dropTargetId,
  onSelect,
  level = 0
}: {
  category: PromptCategory
  selectedCategoryId: string
  dropTargetId: string | null
  onSelect: (categoryId: string) => void
  level?: number
}) {
  const hasChildren = category.children && category.children.length > 0
  const isSelected = selectedCategoryId === category.id
  const isDropTarget = dropTargetId === category.id
  const isVirtualCategory = category.isSystem && (category.id === 'all' || category.id === 'favorites')
  
  const SystemIcon = iconMap[category.icon]
  const FolderIcon = isSelected ? FolderOpen : Folder

  return (
    <>
      <div
        data-category-id={category.id}
        data-is-virtual={isVirtualCategory ? 'true' : undefined}
        className={cn(
          'flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all',
          'border border-transparent',
          isSelected
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
          isDropTarget && 'border-primary border-dashed bg-primary/10'
        )}
        style={{ marginLeft: level * 2 }}
        onClick={() => onSelect(category.id)}
      >
        {isVirtualCategory ? (
          <SystemIcon className={cn(
            'size-4 flex-shrink-0',
            isSelected ? 'text-primary' : 'text-muted-foreground'
          )} />
        ) : (
          <FolderIcon className={cn(
            'size-4 flex-shrink-0',
            isSelected ? 'text-primary' : 'text-muted-foreground'
          )} />
        )}
        <span className="truncate">{category.name}</span>
      </div>

      {hasChildren && (
        <div className="ml-3 border-l border-border-subtle pl-0.5">
          {category.children!.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              selectedCategoryId={selectedCategoryId}
              dropTargetId={dropTargetId}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </>
  )
}

export function PromptCategoryTree({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onOpenCategoryManage
}: PromptCategoryTreeProps) {
  const { dropTargetId } = useDragContext()
  const { t } = useTranslation()

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 p-3">
        <div className="flex flex-col gap-0.5">
          {categories.map((category) => (
            <div key={category.id}>
              <CategoryItem
                category={category}
                selectedCategoryId={selectedCategoryId}
                dropTargetId={dropTargetId}
                onSelect={onSelectCategory}
              />
              {category.id === 'favorites' && (
                <div className="my-2 mx-3 h-px bg-border/50" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="flex-shrink-0 border-t border-border-subtle p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={onOpenCategoryManage}
        >
          <Settings className="size-4" />
          {t('prompt.category.manage')}
        </Button>
      </div>
    </div>
  )
}
