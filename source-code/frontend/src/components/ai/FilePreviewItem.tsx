/**
 * 文件预览项组件
 * 
 * 单个文件预览项，包含删除按钮
 * 根据文件类型显示不同的预览内容
 * 
 * 验证需求: 3.2, 3.3, 4.1
 */

import React from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { UploadedFile } from '@/stores/useFileStore'
import ImagePreview from './ImagePreview'
import DocumentPreview from './DocumentPreview'

interface FilePreviewItemProps {
  file: UploadedFile
  onRemove: (fileId: string) => void
  className?: string
}

/**
 * 文件预览项组件
 * 
 * 显示单个文件的预览，包括：
 * - 图片：显示缩略图
 * - 文档：显示图标和文件信息
 * - 删除按钮（右上角）
 */
const FilePreviewItem: React.FC<FilePreviewItemProps> = ({
  file,
  onRemove,
  className
}) => {
  const { t } = useTranslation()
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove(file.id)
  }

  return (
    <div
      className={cn(
        'relative group flex-shrink-0',
        'w-24 h-24',
        'rounded-lg border border-border',
        'bg-surface',
        'hover:border-primary transition-colors duration-200',
        className
      )}
      role="listitem"
      aria-label={t("common.aria.fileName", { name: file.name })}
    >
      {/* 文件预览内容 */}
      <div className="size-full overflow-hidden rounded-lg">
        {file.type === 'image' ? (
          <ImagePreview file={file} />
        ) : (
          <DocumentPreview file={file} />
        )}
      </div>

      {/* 删除按钮 */}
      <Button
        onClick={handleRemove}
        variant="destructive"
        size="icon"
        className={cn(
          'absolute -top-2 -right-2 size-6 rounded-full',
          'opacity-0 group-hover:opacity-100',
          'transition-opacity duration-200',
          'shadow-md'
        )}
        aria-label={t("common.aria.deleteFileWithName", { name: file.name })}
        title={t("common.title.deleteFile")}
      >
        <X className="size-4" />
      </Button>
    </div>
  )
}

export default FilePreviewItem
