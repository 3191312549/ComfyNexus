/**
 * 文件预览列表组件
 * 
 * 水平滚动的文件预览列表容器
 * 
 * 验证需求: 3.4, 3.5
 */

import React from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { UploadedFile } from '@/stores/useFileStore'
import FilePreviewItem from './FilePreviewItem'

interface FilePreviewListProps {
  files: UploadedFile[]
  onRemove: (fileId: string) => void
  className?: string
}

/**
 * 文件预览列表组件
 * 
 * 显示已上传文件的水平滚动列表
 * 当文件数量超过5个时显示滚动条
 */
const FilePreviewList: React.FC<FilePreviewListProps> = ({
  files,
  onRemove,
  className
}) => {
  const { t } = useTranslation()
  if (files.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto py-2',
        // 当文件数量超过5个时显示滚动条
        files.length > 5 && 'scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200',
        className
      )}
      role="list"
      aria-label={t("common.aria.uploadedFileList")}
    >
      {files.map((file) => (
        <FilePreviewItem
          key={file.id}
          file={file}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}

export default FilePreviewList
