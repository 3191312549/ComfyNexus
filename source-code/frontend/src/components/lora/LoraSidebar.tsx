/**
 * LoRA 左侧目录树组件
 */

import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Folder, FolderOpen, Layers, Package, Loader2, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { bridgeService, type LoraFolderNode } from '@/services/bridge'

interface LoraSidebarProps {
  selectedFolder: string | null
  onSelectFolder: (folderId: string | null) => void
  refreshKey?: number
  dropTargetFolderId?: string | null
  onOpenFolderManage?: () => void
}

function FolderItem({
  node,
  level = 0,
  selectedFolder,
  expandedFolders,
  onToggle,
  onSelect,
  dropTargetFolderId,
}: {
  node: LoraFolderNode
  level?: number
  selectedFolder: string | null
  expandedFolders: Set<string>
  onToggle: (id: string) => void
  onSelect: (id: string | null) => void
  dropTargetFolderId?: string | null
}) {
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = expandedFolders.has(node.id)
  const isSelected = selectedFolder === node.id
  const isDropTarget = dropTargetFolderId === node.id
  
  const FolderIcon = isSelected ? FolderOpen : Folder

  return (
    <>
      <div
        data-folder-id={node.id}
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
          onSelect(node.id)
          if (hasChildren) {
            onToggle(node.id)
          }
        }}
      >
        <FolderIcon className={cn(
          'size-4 flex-shrink-0',
          isSelected ? 'text-primary' : 'text-muted-foreground'
        )} />
        <span className="truncate">{node.name}</span>
      </div>

      {hasChildren && isExpanded && (
        <div className="ml-3 border-l border-border-subtle pl-0.5">
          {node.children!.map((child) => (
            <FolderItem
              key={child.id}
              node={child}
              level={level + 1}
              selectedFolder={selectedFolder}
              expandedFolders={expandedFolders}
              onToggle={onToggle}
              onSelect={onSelect}
              dropTargetFolderId={dropTargetFolderId}
            />
          ))}
        </div>
      )}
    </>
  )
}

export function LoraSidebar({ selectedFolder, onSelectFolder, refreshKey, dropTargetFolderId, onOpenFolderManage }: LoraSidebarProps) {
  const { t } = useTranslation()
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [folders, setFolders] = useState<LoraFolderNode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFolders()
  }, [refreshKey])

  const loadFolders = async () => {
    setLoading(true)
    try {
      const result = await bridgeService.loraGetFolderStructure()
      if (result.success && result.folders) {
        setFolders(result.folders)
        if (result.folders.length > 0) {
          setExpandedFolders(new Set([result.folders[0].id]))
        }
      }
    } catch (error) {
      console.error('加载文件夹结构失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <aside className="flex w-56 flex-col flex-shrink-0 border-r border-border-subtle bg-surface">
      <ScrollArea className="flex-1 p-3">
        <div className="flex flex-col gap-0.5">
          <div
            className={cn(
              'flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all',
              'border border-transparent',
              selectedFolder === null
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
            )}
            onClick={() => onSelectFolder(null)}
          >
            <Layers className="size-4 flex-shrink-0" />
            <span className="truncate flex-1">{t('lora.allModels')}</span>
          </div>

          <div
            data-folder-id="uncategorized"
            className={cn(
              'flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all',
              'border border-transparent',
              selectedFolder === 'uncategorized'
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
              dropTargetFolderId === 'uncategorized' && 'border-primary border-dashed bg-primary/10'
            )}
            onClick={() => onSelectFolder('uncategorized')}
          >
            <Package className="size-4 flex-shrink-0" />
            <span className="truncate flex-1">{t('lora.others')}</span>
          </div>

          <div className="my-2 mx-3 h-px bg-border/50" />

          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : folders.length === 0 ? (
            <div className="px-4 py-2 text-center text-xs text-muted-foreground">
              {t('lora.sidebar.noFolders')}
            </div>
          ) : (
            folders.map((folder) => (
              <FolderItem
                key={folder.id}
                node={folder}
                selectedFolder={selectedFolder}
                expandedFolders={expandedFolders}
                onToggle={handleToggle}
                onSelect={onSelectFolder}
                dropTargetFolderId={dropTargetFolderId}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <div className="flex-shrink-0 border-t border-border-subtle p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={onOpenFolderManage}
        >
          <Settings className="size-4" />
          {t('lora.sidebar.manageFolders')}
        </Button>
      </div>
    </aside>
  )
}
