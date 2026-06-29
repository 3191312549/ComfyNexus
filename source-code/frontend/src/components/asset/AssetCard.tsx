/**
 * 资产卡片组件
 */

import { forwardRef, useState, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check, Eye, EyeOff, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAssetStore } from '@/stores/useAssetStore'
import { useAssetDragContext } from './AssetDragContext'
import { useProcessStore } from '@/stores/useProcessStore'
import { useToast } from '@/hooks/useToast'
import type { Asset } from '@/mocks/asset'
import { cn } from '@/lib/utils'

interface AssetCardProps {
  asset: Asset
  onClick?: () => void
  onDoubleClick?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  isBatchMode?: boolean
}

export const AssetCard = forwardRef<HTMLDivElement, AssetCardProps>(
  function AssetCard({ asset, onClick, onDoubleClick, onContextMenu, isBatchMode }, ref) {
    const { t } = useTranslation()
    const { selectedAssetIds, toggleAssetSelection, updatePreviewBlurred, pushImageToComfyUI } = useAssetStore()
    const { comfyUIStatus, showWorkspaceIframe } = useProcessStore()
    const { success, warning, error } = useToast()
    const [isLoaded, setIsLoaded] = useState(false)
    const [isLocalDragging, setIsLocalDragging] = useState(false)
    const [isPushing, setIsPushing] = useState(false)
    
    let dragContext: ReturnType<typeof useAssetDragContext> | null = null
    try {
      dragContext = useAssetDragContext()
    } catch {
      // 不在 DragProvider 内部时忽略
    }
    
    const { 
      isDragging: isGlobalDragging, 
      startDrag, 
      updatePosition, 
      endDrag, 
      setDropTargetId 
    } = dragContext || {}

    const mouseDownPosRef = useRef({ x: 0, y: 0 })
    const isDragTriggeredRef = useRef(false)
    const isMouseDownRef = useRef(false)

    const isSelected = selectedAssetIds.includes(asset.id)
    const isBlurred = asset.previewBlurred ?? false
    const showBlurToggle = true

    useEffect(() => {
      if (isGlobalDragging && isLocalDragging) {
        document.body.style.cursor = 'grabbing'
        document.body.style.userSelect = 'none'
      } else {
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      
      return () => {
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }, [isGlobalDragging, isLocalDragging])

    const handleClick = () => {
      if (isBatchMode && !isDragTriggeredRef.current) {
        toggleAssetSelection(asset.id)
      } else if (!isBatchMode) {
        onClick?.()
      }
    }

    const handleToggleBlur = (e: React.MouseEvent) => {
      e.stopPropagation()
      updatePreviewBlurred(asset.id, !isBlurred)
    }

    const handlePushToComfyUI = async (e: React.MouseEvent) => {
      e.stopPropagation()
      
      if (!comfyUIStatus?.isRunning) {
        warning(t('asset.push.comfyuiNotRunning'))
        return
      }
      
      if (!showWorkspaceIframe) {
        warning(t('asset.push.workspaceNotStarted'))
        return
      }
      
      setIsPushing(true)
      try {
        const result = await pushImageToComfyUI(asset.id)
        
        if (result.success && result.filename) {
          const iframe = document.querySelector('iframe[title="ComfyUI Workspace"]') as HTMLIFrameElement
          if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage({
              type: 'comfynexus:add_load_image_node',
              data: { filename: result.filename }
            }, '*')
          }
          
          success(t('asset.push.success'))
        } else {
          error(result.error_message || t('asset.push.failed'))
        }
      } catch (err) {
        error(t('asset.push.failed'))
      } finally {
        setIsPushing(false)
      }
    }

    const handleCopyPrompt = async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!asset.prompt) return

      try {
        await navigator.clipboard.writeText(asset.prompt)
        success(t('asset.toast.copySuccess'))
      } catch {
        error(t('asset.toast.copyFailed'))
      }
    }

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      if (!dragContext) return
      if (e.button !== 0) return
      if ((e.target as HTMLElement).closest('button')) return
      if (isBatchMode && !isSelected) return
      
      e.preventDefault()
      
      mouseDownPosRef.current = { x: e.clientX, y: e.clientY }
      isDragTriggeredRef.current = false
      isMouseDownRef.current = true
      
      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isMouseDownRef.current) return
        
        const dx = moveEvent.clientX - mouseDownPosRef.current.x
        const dy = moveEvent.clientY - mouseDownPosRef.current.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance > 5 && !isDragTriggeredRef.current) {
          isDragTriggeredRef.current = true
          setIsLocalDragging(true)
          startDrag!(asset.id, selectedAssetIds, moveEvent.clientX, moveEvent.clientY)
        }
        
        if (isDragTriggeredRef.current) {
          updatePosition!(moveEvent.clientX, moveEvent.clientY)
          
          const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)
          const categoryItem = target?.closest('[data-category-id]')
          if (categoryItem) {
            const categoryId = categoryItem.getAttribute('data-category-id')
            const isVirtual = categoryItem.getAttribute('data-is-virtual') === 'true'
            const isFavorites = categoryId === 'favorites'
            
            if (categoryId && (!isVirtual || isFavorites)) {
              setDropTargetId!(categoryId)
            } else {
              setDropTargetId!(null)
            }
          } else {
            setDropTargetId!(null)
          }
        }
      }
      
      const handleMouseUp = () => {
        isMouseDownRef.current = false
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        
        if (isDragTriggeredRef.current) {
          setIsLocalDragging(false)
          endDrag!()
        }
        
        setTimeout(() => {
          isDragTriggeredRef.current = false
        }, 0)
      }
      
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }, [asset.id, selectedAssetIds, dragContext, startDrag, updatePosition, endDrag, setDropTargetId, isBatchMode, isSelected])

    const isVisualDragging = isLocalDragging && isGlobalDragging

    return (
      <div
        ref={ref}
        data-asset-card
        data-asset-id={asset.id}
        className={cn(
          'group relative mb-5 break-inside-avoid overflow-hidden rounded-lg border border-border-subtle bg-surface transition-all cursor-grab',
          'hover:-translate-y-1 hover:shadow-soft-lg hover:border-border-strong',
          'active:cursor-grabbing',
          isSelected && 'ring-2 ring-success ring-offset-2 ring-offset-background',
          isVisualDragging && 'opacity-50 scale-[0.98] border-primary ring-2 ring-primary/30'
        )}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
      >
        <div 
          className="relative w-full"
          style={{ paddingBottom: `${(asset.height / asset.width) * 100}%` }}
        >
          {!isLoaded && (
            <div className="absolute inset-0 animate-pulse bg-surface-active" />
          )}
          <img
            src={asset.thumbnail}
            alt={asset.filename}
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            className={cn(
              'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0',
              isBlurred && 'blur-lg scale-[1.15]'
            )}
          />

          {showBlurToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleBlur}
              className={cn(
                'absolute bottom-2 left-2 size-7',
                'bg-background/80 backdrop-blur-sm',
                'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                'hover:bg-background/90'
              )}
              title={isBlurred ? t('asset.showPreview') : t('asset.hidePreview')}
            >
              {isBlurred ? (
                <EyeOff className="size-4 text-muted-foreground" />
              ) : (
                <Eye className="size-4 text-muted-foreground" />
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={handlePushToComfyUI}
            disabled={isPushing}
            className={cn(
              'absolute bottom-2 right-2 size-7',
              'bg-background/80 backdrop-blur-sm',
              'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
              'hover:bg-background/90',
              isPushing && 'animate-pulse'
            )}
            title={t('asset.push.toComfyui')}
          >
            <Send className="size-4 text-muted-foreground" />
          </Button>

          {(asset.hasWorkflow || asset.prompt) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={asset.prompt ? handleCopyPrompt : undefined}
              disabled={!asset.prompt}
              className={cn(
                'absolute right-2 top-2 size-6',
                'backdrop-blur-sm',
                'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                asset.prompt
                  ? 'bg-success/80 hover:bg-success/70'
                  : 'bg-background/80 hover:bg-background/90'
              )}
              title={asset.prompt ? t('asset.copyPrompt') : t('asset.copyPromptNoPrompt')}
            >
              <Copy className={cn(
                'size-3',
                asset.prompt ? 'text-success-foreground' : 'text-muted-foreground'
              )} />
            </Button>
          )}

          {isBatchMode && (
            <div
              className={cn(
                'absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors',
                isSelected
                  ? 'border-success bg-success text-foreground'
                  : 'border-border bg-background/80 backdrop-blur-sm'
              )}
            >
              {isSelected && <Check className="size-4" />}
            </div>
          )}
        </div>
        <div className="px-1 py-1.5">
          <p className="truncate text-[10px] text-muted-foreground">{asset.filename}</p>
          <p className="text-[10px] text-muted-foreground/70">{asset.width}×{asset.height}</p>
        </div>
      </div>
    )
  }
)
