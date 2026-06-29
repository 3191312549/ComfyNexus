/**
 * 预览图轮播组件
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, ImageOff, Upload, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { bridgeService } from '@/services/bridge'

interface PreviewCarouselProps {
  previews?: string[]
  preview?: string
  className?: string
  height?: number | string
  workflowId?: string
  onPreviewChange?: () => void
}

function mergeAndDedupePreviews(preview?: string, previews?: string[]): string[] {
  return [
    ...(preview ? [preview] : []),
    ...(previews || [])
  ].filter((value, index, self) => self.indexOf(value) === index)
}

export function PreviewCarousel({
  previews,
  preview,
  className,
  height = 267,
  workflowId,
  onPreviewChange
}: PreviewCarouselProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  const [previewFiles, setPreviewFiles] = useState<string[]>(() => 
    mergeAndDedupePreviews(preview, previews)
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const hasPreviews = previewFiles.length > 0

  useEffect(() => {
    const newPreviews = mergeAndDedupePreviews(preview, previews)
    setPreviewFiles(newPreviews)
    setCurrentIndex(prev => Math.min(prev, Math.max(0, newPreviews.length - 1)))
  }, [preview, previews])

  const goToPrevious = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex((prev) =>
      prev === 0 ? previewFiles.length - 1 : prev - 1
    )
  }, [previewFiles.length])

  const goToNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex((prev) =>
      prev === previewFiles.length - 1 ? 0 : prev + 1
    )
  }, [previewFiles.length])

  const handleUploadClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !workflowId) return

    setIsUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64 = event.target?.result as string
        const result = await bridgeService.uploadWorkflowPreview(workflowId, base64)
        if (result.success && result.previewPath) {
          setPreviewFiles(prev => [...prev, result.previewPath!])
          setCurrentIndex(previewFiles.length)
          onPreviewChange?.()
        } else {
          console.error('上传预览图失败:', result.error)
        }
      }
      reader.readAsDataURL(file)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [workflowId, previewFiles.length, onPreviewChange])

  const handleDeleteClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!workflowId || !hasPreviews) return

    try {
      const result = await bridgeService.deleteWorkflowPreview(workflowId, currentIndex)
      if (result.success) {
        setPreviewFiles(prev => prev.filter((_, idx) => idx !== currentIndex))
        setCurrentIndex(prev => Math.max(0, prev - 1))
        onPreviewChange?.()
      } else {
        console.error('删除预览图失败:', result.error)
      }
    } catch (error) {
      console.error('删除预览图失败:', error)
    }
  }, [workflowId, currentIndex, hasPreviews, onPreviewChange])

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-surface group/carousel',
        className
      )}
      style={{ height }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--border-subtle))_1px,transparent_1px)] bg-[length:16px_16px] bg-[position:-8px_-8px]" />

      {hasPreviews ? (
        <>
          <img
            src={previewFiles[currentIndex]}
            alt={t('workflow.previewImage', { index: currentIndex + 1 })}
            className="relative z-10 h-full w-full object-cover"
          />

          <div className="absolute inset-0 z-10 bg-gradient-to-t from-background to-transparent opacity-60" />

          {previewFiles.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                className="absolute left-2.5 top-1/2 z-20 h-7 w-7 -translate-y-1/2 bg-foreground/60 text-background opacity-0 transition-all hover:bg-foreground/80 group-hover/carousel:opacity-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                className="absolute right-2.5 top-1/2 z-20 h-7 w-7 -translate-y-1/2 bg-foreground/60 text-background opacity-0 transition-all hover:bg-foreground/80 group-hover/carousel:opacity-100"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
                {previewFiles.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      'h-1.5 w-1.5 rounded-full shadow-sm transition-colors',
                      index === currentIndex
                        ? 'bg-foreground'
                        : 'border border-foreground/20 bg-foreground/30'
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageOff className="h-12 w-12 opacity-30" />
            <span className="text-xs">{t('workflow.noPreview')}</span>
          </div>
        </div>
      )}

      {/* 上传和删除按钮 */}
      {workflowId && (
        <div className="absolute bottom-2 right-2 z-20 flex gap-1 opacity-0 transition-opacity group-hover/carousel:opacity-100">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleUploadClick}
            disabled={isUploading}
            className="h-7 w-7 bg-foreground/60 text-background hover:bg-foreground/80"
          >
            <Upload className="h-3.5 w-3.5" />
          </Button>
          {hasPreviews && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDeleteClick}
              className="h-7 w-7 bg-foreground/60 text-background hover:bg-foreground/80 hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
