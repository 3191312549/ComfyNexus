/**
 * 文档预览组件
 * 
 * 显示文档图标和文件信息
 * 
 * 验证需求: 3.2, 3.7
 */

import React from 'react'
import {
  FileText,
  FileCode,
  FileJson,
  FileSpreadsheet,
  File as FileIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { UploadedFile } from '@/stores/useFileStore'
import { getFileIcon, FileIcon as FileIconType } from '@/utils/fileTypeDetector'

interface DocumentPreviewProps {
  file: UploadedFile
  className?: string
}

/**
 * 根据文件图标类型获取对应的 Lucide 图标组件
 */
const getIconComponent = (iconType: FileIconType) => {
  const iconMap: Record<FileIconType, React.ComponentType<{ className?: string }>> = {
    // 文档图标
    [FileIconType.PDF]: FileText,
    [FileIconType.TEXT]: FileText,
    [FileIconType.MARKDOWN]: FileText,
    [FileIconType.JSON]: FileJson,
    [FileIconType.XML]: FileCode,
    [FileIconType.CSV]: FileSpreadsheet,
    [FileIconType.LOG]: FileText,
    [FileIconType.WORD]: FileText,
    [FileIconType.EXCEL]: FileSpreadsheet,
    
    // 代码图标
    [FileIconType.PYTHON]: FileCode,
    [FileIconType.JAVASCRIPT]: FileCode,
    [FileIconType.TYPESCRIPT]: FileCode,
    [FileIconType.JAVA]: FileCode,
    [FileIconType.C]: FileCode,
    [FileIconType.CPP]: FileCode,
    [FileIconType.GO]: FileCode,
    [FileIconType.RUST]: FileCode,
    [FileIconType.CODE]: FileCode,
    
    // 图片和未知
    [FileIconType.IMAGE]: FileIcon,
    [FileIconType.UNKNOWN]: FileIcon,
  }

  return iconMap[iconType] || FileIcon
}

/**
 * 根据文件图标类型获取图标颜色（语义化颜色）
 */
const getIconColor = (iconType: FileIconType): string => {
  const colorMap: Record<FileIconType, string> = {
    // 文档图标颜色
    [FileIconType.PDF]: 'text-danger',
    [FileIconType.TEXT]: 'text-muted-foreground',
    [FileIconType.MARKDOWN]: 'text-primary',
    [FileIconType.JSON]: 'text-warning',
    [FileIconType.XML]: 'text-warning',
    [FileIconType.CSV]: 'text-success',
    [FileIconType.LOG]: 'text-muted-foreground',
    [FileIconType.WORD]: 'text-primary',
    [FileIconType.EXCEL]: 'text-success',
    
    // 代码图标颜色
    [FileIconType.PYTHON]: 'text-primary',
    [FileIconType.JAVASCRIPT]: 'text-warning',
    [FileIconType.TYPESCRIPT]: 'text-primary',
    [FileIconType.JAVA]: 'text-danger',
    [FileIconType.C]: 'text-primary',
    [FileIconType.CPP]: 'text-primary',
    [FileIconType.GO]: 'text-cyan-500',
    [FileIconType.RUST]: 'text-warning',
    [FileIconType.CODE]: 'text-purple-500',
    
    // 默认颜色
    [FileIconType.IMAGE]: 'text-muted-foreground',
    [FileIconType.UNKNOWN]: 'text-muted-foreground',
  }

  return colorMap[iconType] || 'text-muted-foreground'
}

/**
 * 格式化文件大小
 */
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
}

/**
 * 文档预览组件
 * 
 * 显示文档的图标、文件名和文件大小
 */
const DocumentPreview: React.FC<DocumentPreviewProps> = ({ file, className }) => {
  // 获取文件图标类型
  const iconType = getFileIcon({ name: file.name, type: file.mime_type })
  
  // 获取图标组件和颜色
  const IconComponent = getIconComponent(iconType)
  const iconColor = getIconColor(iconType)

  // 截断文件名（最多显示10个字符）
  const displayName = file.name.length > 10 
    ? `${file.name.slice(0, 10)}...` 
    : file.name

  return (
    <div
      className={cn(
        'w-full h-full flex flex-col items-center justify-center gap-1 p-2',
        'bg-muted',
        className
      )}
    >
      {/* 文件图标 */}
      <IconComponent className={cn('w-8 h-8', iconColor)} />

      {/* 文件名 */}
      <div
        className="w-full truncate px-1 text-center text-xs text-foreground"
        title={file.name}
      >
        {displayName}
      </div>

      {/* 文件大小 */}
      <div className="text-xs text-muted-foreground">
        {formatFileSize(file.size)}
      </div>
    </div>
  )
}

export default DocumentPreview
