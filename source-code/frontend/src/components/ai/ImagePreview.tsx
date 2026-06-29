/**
 * 图片预览组件
 * 
 * 显示图片缩略图，支持加载状态和错误状态
 * 
 * 验证需求: 3.1, 3.6, 10.1, 10.2
 */

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageIcon, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UploadedFile } from '@/stores/useFileStore'

interface ImagePreviewProps {
  file: UploadedFile
  className?: string
}

/**
 * 图片预览组件
 * 
 * 显示图片缩略图（最大 100x100 像素）
 * 支持三种状态：
 * - 加载中：显示加载动画
 * - 加载成功：显示图片缩略图
 * - 加载失败：显示错误图标
 */
const ImagePreview: React.FC<ImagePreviewProps> = ({ file, className }) => {
  const { t } = useTranslation()
  // 使用缩略图（如果有），否则使用原图
  const imageSrc = file.thumbnail || file.content
  
  console.log('[ImagePreview] 渲染:', {
    fileName: file.name,
    hasImageSrc: !!imageSrc,
    imageSrcLength: imageSrc?.length,
    imageSrcPreview: imageSrc?.substring(0, 50)
  })
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const imgRef = React.useRef<HTMLImageElement>(null)

  const handleLoad = () => {
    console.log('[ImagePreview] 图片加载成功:', file.name)
    setLoading(false)
    setError(false)
  }

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('[ImagePreview] 图片加载失败:', file.name, e)
    setLoading(false)
    setError(true)
  }
  
  // 检查图片是否已经加载完成（处理缓存情况）
  React.useEffect(() => {
    const img = imgRef.current
    if (img) {
      // 如果图片已经加载完成（从缓存加载）
      if (img.complete && img.naturalHeight !== 0) {
        console.log('[ImagePreview] 图片已在缓存中，直接显示:', file.name)
        setLoading(false)
        setError(false)
      }
    }
  }, [file.name, imageSrc])

  return (
    <div
      className={cn(
        'w-full h-full flex items-center justify-center',
        'bg-muted',
        className
      )}
    >
      {/* 加载状态 */}
      {loading && !error && imageSrc && (
        <div className="flex flex-col items-center justify-center gap-1">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">{t("common.loading")}</span>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="flex flex-col items-center justify-center gap-1 p-2">
          <AlertCircle className="size-6 text-danger" />
          <span className="text-center text-xs text-danger">{t("ai.loadFailed")}</span>
        </div>
      )}

      {/* 图片 */}
      {imageSrc && (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={file.name}
          className={cn(
            'w-full h-full object-cover',
            loading && 'hidden',
            error && 'hidden'
          )}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {/* 无图片数据 */}
      {!imageSrc && (
        <div className="flex flex-col items-center justify-center gap-1 p-2">
          <ImageIcon className="size-6 text-muted-foreground" />
          <span className="text-center text-xs text-muted-foreground">{t("ai.noPreview")}</span>
        </div>
      )}
    </div>
  )
}

export default ImagePreview
