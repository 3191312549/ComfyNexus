/**
 * 工作流目录导航组件
 */

import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LayoutGrid,
  Star,
  Folder,
  FolderOpen,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useWorkflowStore } from '@/stores/useWorkflowStore'
import type { WorkflowFolder } from '@/types/workflow'

interface WorkflowSidebarProps {
  className?: string
  dropTargetId?: string | null
  onOpenFolderManage?: () => void
}

function FolderItem({
  folder,
  level = 0,
  selectedFolderId,
  filterType,
  expandedFolders,
  dropTargetId,
  onToggle,
  onSelect,
  getChildren,
  getWorkflowCount
}: {
  folder: WorkflowFolder
  level?: number
  selectedFolderId: string | null
  filterType: 'all' | 'favorites' | 'folder'
  expandedFolders: Set<string>
  dropTargetId?: string | null
  onToggle: (id: string) => void
  onSelect: (id: string) => void
  getChildren: (parentId: string) => WorkflowFolder[]
  getWorkflowCount: (folderId: string) => number
}) {
  const children = getChildren(folder.id)
  const hasChildren = children.length > 0
  const isExpanded = expandedFolders.has(folder.id)
  const isSelected = selectedFolderId === folder.id && filterType === 'folder'
  const isDropTarget = dropTargetId === folder.id
  const workflowCount = getWorkflowCount(folder.id)
  
  const FolderIcon = isSelected ? FolderOpen : Folder

  return (
    <>
      <div
        data-folder-id={folder.id}
        className={cn(
          'flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all',
          'border border-transparent',
          isSelected
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
          isDropTarget && 'border-primary border-dashed bg-primary/10'
        )}
        style={{ marginLeft: level * 2 }}
        onClick={() => {
          onSelect(folder.id)
          if (hasChildren) {
            onToggle(folder.id)
          }
        }}
      >
        <FolderIcon className={cn(
          'size-4 flex-shrink-0',
          isSelected ? 'text-primary' : 'text-muted-foreground'
        )} />
        <span className="truncate flex-1">{folder.name}</span>
        {workflowCount > 0 && (
          <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[11px] font-mono">
            {workflowCount}
          </span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="ml-3 border-l border-border-subtle pl-0.5">
          {children.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              filterType={filterType}
              expandedFolders={expandedFolders}
              dropTargetId={dropTargetId}
              onToggle={onToggle}
              onSelect={onSelect}
              getChildren={getChildren}
              getWorkflowCount={getWorkflowCount}
            />
          ))}
        </div>
      )}
    </>
  )
}

export function WorkflowSidebar({ className, dropTargetId, onOpenFolderManage }: WorkflowSidebarProps) {
  const { t } = useTranslation()
  const {
    folders,
    workflows,
    filterType,
    selectedFolderId,
    setFilterType,
    setSelectedFolderId
  } = useWorkflowStore()

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  const totalWorkflows = workflows.length
  const favoriteCount = workflows.filter((w) => w.isFavorite).length

  const folderTree = useMemo(() => {
    const rootFolders = folders.filter((f) => !f.parentId)
    const getChildren = (parentId: string): WorkflowFolder[] => {
      return folders.filter((f) => f.parentId === parentId)
    }
    return { rootFolders, getChildren }
  }, [folders])

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }, [])

  const handleSelectFilter = useCallback((type: 'all' | 'favorites') => {
    setFilterType(type)
  }, [setFilterType])

  const handleSelectFolder = useCallback((folderId: string) => {
    setSelectedFolderId(folderId)
  }, [setSelectedFolderId])

  const getWorkflowCount = useCallback((folderId: string) => {
    return workflows.filter((w) => w.folderId === folderId).length
  }, [workflows])

  return (
    <aside className={cn('flex w-56 flex-col flex-shrink-0 border-r border-border-subtle bg-surface', className)}>
      <ScrollArea className="flex-1 p-3">
        <div className="flex flex-col gap-0.5">
          <div
            data-folder-id="all"
            data-is-virtual="true"
            className={cn(
              'flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all',
              'border border-transparent',
              filterType === 'all'
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
            )}
            onClick={() => handleSelectFilter('all')}
          >
            <LayoutGrid className="size-4 flex-shrink-0" />
            <span className="truncate flex-1">{t('workflow.sidebar.allWorkflows')}</span>
            <span className="font-mono text-xs">{totalWorkflows}</span>
          </div>

          <div
            data-folder-id="favorites"
            data-is-virtual="true"
            className={cn(
              'flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all',
              'border border-transparent',
              filterType === 'favorites'
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
              dropTargetId === 'favorites' && 'border-primary border-dashed bg-primary/10'
            )}
            onClick={() => handleSelectFilter('favorites')}
          >
            <Star className="size-4 flex-shrink-0" />
            <span className="truncate flex-1">{t('workflow.sidebar.favorites')}</span>
            <span className="font-mono text-xs">{favoriteCount}</span>
          </div>

          <div className="my-2 mx-3 h-px bg-border/50" />

          {folderTree.rootFolders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              selectedFolderId={selectedFolderId}
              filterType={filterType}
              expandedFolders={expandedFolders}
              dropTargetId={dropTargetId}
              onToggle={toggleFolder}
              onSelect={handleSelectFolder}
              getChildren={folderTree.getChildren}
              getWorkflowCount={getWorkflowCount}
            />
          ))}
        </div>
      </ScrollArea>

      <div className="flex-shrink-0 border-t border-border-subtle p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={onOpenFolderManage}
        >
          <Settings className="size-4" />
          {t('workflow.sidebar.manageFolders')}
        </Button>
      </div>
    </aside>
  )
}
