/**
 * 窗口大小调整手柄组件
 * 在四个角添加透明的拖动区域，允许用户调整窗口大小
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { bridgeService } from '@/services/bridge'
import { useFullscreenStore } from '@/stores/useFullscreenStore'
import { useSettingsStore } from '@/stores/useSettingsStore'

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

interface ResizeState {
  isResizing: boolean
  corner: Corner | null
  startX: number
  startY: number
  startWidth: number
  startHeight: number
  startWindowX: number
  startWindowY: number
}

const HANDLE_SIZE = 16
const MIN_WIDTH = 1280
const MIN_HEIGHT = 720

export function ResizeHandles() {
  const { isFullscreen } = useFullscreenStore()
  const { updateSystemSettings } = useSettingsStore()
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    corner: null,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    startWindowX: 0,
    startWindowY: 0,
  })
  
  const animationFrameRef = useRef<number | null>(null)
  const pendingResizeRef = useRef<{
    width: number
    height: number
    x: number
    y: number
  } | null>(null)

  const getCursorStyle = (corner: Corner): string => {
    switch (corner) {
      case 'top-left':
      case 'bottom-right':
        return 'nwse-resize'
      case 'top-right':
      case 'bottom-left':
        return 'nesw-resize'
    }
  }

  const handleMouseDown = useCallback((e: React.MouseEvent, corner: Corner) => {
    e.preventDefault()
    e.stopPropagation()

    const dpr = window.devicePixelRatio || 1
    const startX = e.screenX / dpr
    const startY = e.screenY / dpr
    const startWidth = window.outerWidth
    const startHeight = window.outerHeight
    const startWindowX = window.screenX
    const startWindowY = window.screenY

    setResizeState({
      isResizing: true,
      corner,
      startX,
      startY,
      startWidth,
      startHeight,
      startWindowX,
      startWindowY,
    })
  }, [])

  const saveWindowSize = useCallback(async (width: number, height: number) => {
    try {
      const windowSizeString = `${width}x${height}`
      console.log(`[ResizeHandles] 保存窗口大小: ${windowSizeString}`)
      await updateSystemSettings({ windowSize: windowSizeString })
      console.log(`[ResizeHandles] 窗口大小保存成功`)
    } catch (error) {
      console.error('[ResizeHandles] 保存窗口大小失败:', error)
    }
  }, [updateSystemSettings])

  useEffect(() => {
    if (!resizeState.isResizing) return

    const {
      corner,
      startX,
      startY,
      startWidth,
      startHeight,
      startWindowX,
      startWindowY,
    } = resizeState

    const performResize = async (width: number, height: number, x: number, y: number) => {
      try {
        await bridgeService.resizeWindowWithPosition(width, height, x, y)
      } catch (error) {
        console.error('[ResizeHandles] 调整窗口大小失败:', error)
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      const dpr = window.devicePixelRatio || 1
      const deltaX = (e.screenX / dpr) - startX
      const deltaY = (e.screenY / dpr) - startY

      let newWidth = startWidth
      let newHeight = startHeight
      let newX = startWindowX
      let newY = startWindowY

      switch (corner) {
        case 'top-left':
          newWidth = Math.max(MIN_WIDTH, startWidth - deltaX)
          newHeight = Math.max(MIN_HEIGHT, startHeight - deltaY)
          newX = startWindowX + (startWidth - newWidth)
          newY = startWindowY + (startHeight - newHeight)
          break
        case 'top-right':
          newWidth = Math.max(MIN_WIDTH, startWidth + deltaX)
          newHeight = Math.max(MIN_HEIGHT, startHeight - deltaY)
          newX = startWindowX
          newY = startWindowY + (startHeight - newHeight)
          break
        case 'bottom-left':
          newWidth = Math.max(MIN_WIDTH, startWidth - deltaX)
          newHeight = Math.max(MIN_HEIGHT, startHeight + deltaY)
          newX = startWindowX + (startWidth - newWidth)
          newY = startWindowY
          break
        case 'bottom-right':
          newWidth = Math.max(MIN_WIDTH, startWidth + deltaX)
          newHeight = Math.max(MIN_HEIGHT, startHeight + deltaY)
          newX = startWindowX
          newY = startWindowY
          break
      }

      const roundedWidth = Math.round(newWidth)
      const roundedHeight = Math.round(newHeight)
      const roundedX = Math.round(newX)
      const roundedY = Math.round(newY)

      pendingResizeRef.current = {
        width: roundedWidth,
        height: roundedHeight,
        x: roundedX,
        y: roundedY,
      }

      if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(() => {
          animationFrameRef.current = null
          if (pendingResizeRef.current) {
            performResize(
              pendingResizeRef.current.width,
              pendingResizeRef.current.height,
              pendingResizeRef.current.x,
              pendingResizeRef.current.y
            )
          }
        })
      }
    }

    const handleMouseUp = async () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      
      if (pendingResizeRef.current) {
        await performResize(
          pendingResizeRef.current.width,
          pendingResizeRef.current.height,
          pendingResizeRef.current.x,
          pendingResizeRef.current.y
        )
        
        await saveWindowSize(
          pendingResizeRef.current.width,
          pendingResizeRef.current.height
        )
      }
      
      setResizeState((prev) => ({
        ...prev,
        isResizing: false,
        corner: null,
      }))
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    document.body.style.cursor = resizeState.corner
      ? getCursorStyle(resizeState.corner)
      : 'default'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [resizeState, saveWindowSize])

  if (isFullscreen) {
    return null
  }

  const handleStyle: React.CSSProperties = {
    position: 'fixed',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    zIndex: 9999,
    pointerEvents: 'auto',
  }

  const corners: { corner: Corner; style: React.CSSProperties }[] = [
    {
      corner: 'top-left',
      style: {
        ...handleStyle,
        top: 0,
        left: 0,
        cursor: 'nwse-resize',
      },
    },
    {
      corner: 'top-right',
      style: {
        ...handleStyle,
        top: 0,
        right: 0,
        cursor: 'nesw-resize',
      },
    },
    {
      corner: 'bottom-left',
      style: {
        ...handleStyle,
        bottom: 0,
        left: 0,
        cursor: 'nesw-resize',
      },
    },
    {
      corner: 'bottom-right',
      style: {
        ...handleStyle,
        bottom: 0,
        right: 0,
        cursor: 'nwse-resize',
      },
    },
  ]

  return (
    <>
      {corners.map(({ corner, style }) => (
        <div
          key={corner}
          style={style}
          onMouseDown={(e) => handleMouseDown(e, corner)}
          className="resize-handle"
        />
      ))}
    </>
  )
}
