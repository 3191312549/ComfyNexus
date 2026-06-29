/**
 * AI 分析对话框组件
 * 
 * 功能：
 * - 显示 AI 分析结果
 * - 支持流式输出
 * - 可拖动
 * - 非模态、非阻塞
 * - 支持内容复制
 * 
 * 验证需求: 8.4, 8.5, 8.6, 8.7, 8.8, 8.9
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { X, Copy, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/utils/toast'

export interface AIAnalysisDialogProps {
  isOpen: boolean
  content: string
  isStreaming: boolean
  onClose: () => void
  onCopy: () => void
}

export default function AIAnalysisDialog({
  isOpen,
  content,
  isStreaming,
  onClose,
  onCopy,
}: AIAnalysisDialogProps) {
  const { t } = useTranslation()
  const contentRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const contentWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [content, isStreaming])

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      })
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x
        const newY = e.clientY - dragStart.y

        const wrapper = contentWrapperRef.current
        if (wrapper) {
          const rect = wrapper.getBoundingClientRect()
          const maxX = window.innerWidth - rect.width
          const maxY = window.innerHeight - rect.height

          setPosition({
            x: Math.max(0, Math.min(newX, maxX)),
            y: Math.max(0, Math.min(newY, maxY)),
          })
        }
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success(t('dependency.aiAnalysisDialog.copied'))
      onCopy()
    } catch (error) {
      console.error('Copy failed:', error)
      toast.error(t('dependency.aiAnalysisDialog.copyFailed'))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        ref={contentWrapperRef}
        className={cn(
          'w-[600px] max-w-[90vw] flex flex-col p-0 gap-0',
          isDragging && 'cursor-move select-none'
        )}
        style={isDragging ? {
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: 'none',
        } : undefined}
        onPointerDownCapture={handleMouseDown}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="drag-handle flex cursor-move items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <GripVertical className="size-5 text-muted-foreground" />
            <DialogTitle className="font-semibold text-foreground">
              {t('dependency.aiAnalysisDialog.title')}
            </DialogTitle>
            {isStreaming && (
              <span className="animate-pulse text-xs text-muted-foreground">
                {t('dependency.aiAnalysisDialog.analyzing')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              disabled={!content || isStreaming}
              className="cursor-pointer"
            >
              <Copy className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="cursor-pointer"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto p-4 text-sm text-foreground"
          style={{ minHeight: '200px', maxHeight: 'calc(80vh - 120px)' }}
        >
          {content ? (
            <div className="whitespace-pre-wrap break-words">
              {content}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              {t('dependency.aiAnalysisDialog.waiting')}
            </div>
          )}
        </div>

        <div className="border-t border-border bg-muted px-4 py-2">
          <p className="text-xs text-muted-foreground">
            {t('dependency.aiAnalysisDialog.dragHint')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
