/**
 * FolderShortcutCard 组件
 * 文件夹快捷方式卡片，支持拖拽排序
 */

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { FolderOpen, Folder, Image, Box, FileCode, FileText, LucideIcon, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { openFolder } from '@/mocks/home'
import type { FolderShortcut } from '@/types/home'

export interface FolderShortcutCardProps {
  shortcut: FolderShortcut
  isDragOverlay?: boolean
  onError?: (error: string) => void
}

const FOLDER_ICONS: Record<string, LucideIcon> = {
  models: Box,
  lora: Box,
  checkpoints: Box,
  vae: Box,
  embeddings: Box,
  controlnet: Box,
  upscale: Box,
  clip: Box,
  workflows: FileCode,
  output: Image,
  input: FileText,
  custom_nodes: Folder,
}

const getFolderIcon = (id: string): LucideIcon => {
  const lowerId = id.toLowerCase()
  for (const [key, icon] of Object.entries(FOLDER_ICONS)) {
    if (lowerId.includes(key)) {
      return icon
    }
  }
  return FolderOpen
}

export const FolderShortcutCard: React.FC<FolderShortcutCardProps> = ({
  shortcut,
  isDragOverlay = false,
  onError
}) => {
  const { t } = useTranslation()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: shortcut.id })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  const IconComponent = getFolderIcon(shortcut.id)

  // 对默认文件夹的 name 进行 i18n 翻译
  const displayName = shortcut.isDefault ? t(shortcut.name) : shortcut.name

  const handleClick = async () => {
    if (!shortcut.path) {
      onError?.(t('home.folder.addEnvFirst'))
      return
    }

    try {
      await openFolder(shortcut.path)
    } catch (error) {
      console.error('[FolderShortcutCard] 打开文件夹失败:', error)
      onError?.(t('home.folder.openFailed'))
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative p-4 cursor-pointer transition-all duration-300 rounded-2xl",
        "bg-surface-hover",
        "border border-border-subtle",
        "hover:bg-surface-hover/80 hover:border-border",
        "hover:-translate-y-1 hover:shadow-lg hover:shadow-border-subtle/50",
        !shortcut.path && "opacity-50 cursor-not-allowed",
        isDragging && "opacity-40 scale-95 rotate-2 shadow-2xl ring-2 ring-primary",
        isDragOverlay && "shadow-2xl ring-2 ring-primary rotate-3 scale-105"
      )}
      onClick={handleClick}
    >
      <div className="flex flex-col items-center space-y-2 text-center">
        <div className={cn(
          "p-3 rounded-xl transition-transform duration-200",
          "bg-primary/10",
          "border border-primary/20",
          "group-hover:scale-110 group-hover:bg-primary/20"
        )}>
          <IconComponent className="text-primary size-6" />
        </div>
        
        <div>
          <p className="text-foreground text-sm font-medium">
            {displayName}
          </p>
          {shortcut.path ? (
            <p
              className="text-muted-foreground max-w-[100px] truncate text-xs"
              title={shortcut.path}
            >
              {shortcut.path}
            </p>
          ) : (
            <p className="text-warning flex items-center justify-center gap-1 text-xs">
              <AlertCircle className="size-3" />
              {t('home.folder.addEnvFirst')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default FolderShortcutCard
