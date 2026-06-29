/**
 * 文件上传区域组件
 * 
 * 功能：
 * - 拖拽上传（dragover, dragleave, drop）
 * - 粘贴上传（Clipboard API）
 * - 文件选择按钮
 * - 拖拽高亮效果
 * - 文件验证集成
 * 
 * 验证需求: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 10.5
 */

import React, { useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, Image, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { validateFile } from '@/utils/fileValidator'
import { useFileStore } from '@/stores/useFileStore'
import { Button } from '@/components/ui/Button'

interface FileUploadZoneProps {
  onFilesSelected?: (files: File[]) => void
  disabled?: boolean
  className?: string
}

/**
 * 文件上传区域组件
 * 
 * 支持拖拽和粘贴上传文件
 */
const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFilesSelected,
  disabled = false,
  className
}) => {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const { files } = useFileStore()

  /**
   * 处理文件选择
   */
  const handleFiles = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) {
      return
    }

    const fileArray = Array.from(selectedFiles)
    
    // 验证每个文件
    const validFiles: File[] = []
    const errors: string[] = []

    for (const file of fileArray) {
      const result = validateFile(file, files)
      
      if (result.valid) {
        validFiles.push(file)
        
        // 如果有警告，显示警告信息
        if (result.warning) {
          console.warn(`[FileUploadZone] ${result.warning}`)
        }
      } else if (result.error) {
        errors.push(result.error)
      }
    }

    // 如果有错误，显示第一个错误
    if (errors.length > 0) {
      alert(errors[0])
    }

    // 如果有有效文件，触发回调
    if (validFiles.length > 0 && onFilesSelected) {
      onFilesSelected(validFiles)
    }
  }, [files, onFilesSelected])

  /**
   * 处理拖拽进入
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (disabled) return
    
    setIsDragging(true)
  }, [disabled])

  /**
   * 处理拖拽悬停
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (disabled) return
    
    // 设置拖拽效果
    e.dataTransfer.dropEffect = 'copy'
  }, [disabled])

  /**
   * 处理拖拽离开
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (disabled) return
    
    // 只有当离开整个拖拽区域时才取消高亮
    // 检查是否真的离开了容器
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    
    if (
      x <= rect.left ||
      x >= rect.right ||
      y <= rect.top ||
      y >= rect.bottom
    ) {
      setIsDragging(false)
    }
  }, [disabled])

  /**
   * 处理文件释放
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (disabled) return
    
    setIsDragging(false)
    
    // 获取拖拽的文件
    const droppedFiles = e.dataTransfer.files
    handleFiles(droppedFiles)
  }, [disabled, handleFiles])

  /**
   * 处理粘贴事件
   */
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    if (disabled) return
    
    // 检查剪贴板是否包含文件
    const items = e.clipboardData?.items
    if (!items) return
    
    const files: File[] = []
    
    // 遍历剪贴板项
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      // 检查是否为文件
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          files.push(file)
        }
      }
    }
    
    // 如果有文件，处理它们
    if (files.length > 0) {
      e.preventDefault()
      e.stopPropagation()
      
      // 创建 FileList 对象（兼容测试环境）
      try {
        const fileList = new DataTransfer()
        files.forEach(file => fileList.items.add(file))
        handleFiles(fileList.files)
      } catch (_error) {
        // 在测试环境中 DataTransfer 可能不可用，直接使用文件数组
        // 创建一个类似 FileList 的对象
        const fileListLike = Object.assign(files, {
          item: (index: number) => files[index] || null,
          length: files.length
        }) as unknown as FileList
        handleFiles(fileListLike)
      }
    }
  }, [disabled, handleFiles])

  /**
   * 处理文件输入变化
   */
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    
    // 清空input值，允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [handleFiles])

  /**
   * 打开文件选择对话框
   */
  const handleButtonClick = useCallback(() => {
    if (disabled) return
    fileInputRef.current?.click()
  }, [disabled])

  return (
    <div
      className={cn(
        'relative rounded-lg border-2 border-dashed transition-all duration-200',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-border bg-muted',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      tabIndex={0}
      role="button"
      aria-label={t("common.aria.fileUploadZone")}
    >
      {/* 隐藏的文件输入 */}
      {/* eslint-disable-next-line no-restricted-syntax */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.md,.json,.xml,.csv,.log,.docx,.xlsx,.py,.js,.ts,.jsx,.tsx,.java,.cpp,.c,.go,.rs"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* 上传区域内容 */}
      <div className="flex flex-col items-center justify-center px-4 py-6">
        {/* 图标 */}
        <div className={cn(
          'mb-3 p-3 rounded-full transition-all duration-200',
          isDragging
            ? 'bg-primary/10'
            : 'bg-muted'
        )}>
          <Upload className={cn(
            'w-6 h-6 transition-colors duration-200',
            isDragging
              ? 'text-primary'
              : 'text-muted-foreground'
          )} />
        </div>

        {/* 提示文本 */}
        <div className="mb-3 text-center">
          <p className={cn(
            'text-sm font-medium transition-colors duration-200',
            isDragging
              ? 'text-primary'
              : 'text-foreground'
          )}>
            {isDragging ? '释放文件以上传' : '拖拽文件到这里'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            或点击下方按钮选择文件，也可以使用 Ctrl+V 粘贴图片
          </p>
        </div>

        {/* 上传按钮 */}
        <Button
          onClick={handleButtonClick}
          disabled={disabled}
          variant="outline"
          size="sm"
          className="text-sm"
        >
          <Upload className="mr-2 size-4" />
          选择文件
        </Button>

        {/* 支持的文件类型提示 */}
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Image className="size-3" />
            <span>{t("ai.image")}</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="size-3" />
            <span>{t("ai.document")}</span>
          </div>
        </div>

        {/* 文件限制提示 */}
        <p className="mt-2 text-xs text-muted-foreground/60">
          单个文件最大 20MB · 总大小最大 50MB · 最多 10 个文件
        </p>
      </div>
    </div>
  )
}

export default FileUploadZone
