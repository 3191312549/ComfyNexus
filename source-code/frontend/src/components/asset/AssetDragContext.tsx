/**
 * 资产拖拽状态管理 Context
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

interface AssetDragContextValue {
  isDragging: boolean
  draggingAssetIds: string[]
  dragPosition: { x: number; y: number }
  dropTargetId: string | null
  startDrag: (assetId: string, selectedIds: string[], clientX: number, clientY: number) => void
  updatePosition: (x: number, y: number) => void
  endDrag: () => void
  cancelDrag: () => void
  setDropTargetId: (id: string | null) => void
}

const AssetDragContext = createContext<AssetDragContextValue | null>(null)

export function useAssetDragContext() {
  const context = useContext(AssetDragContext)
  if (!context) {
    throw new Error('useAssetDragContext must be used within AssetDragProvider')
  }
  return context
}

interface AssetDragProviderProps {
  children: React.ReactNode
  onDrop: (categoryId: string, assetIds: string[]) => void
}

export function AssetDragProvider({ children, onDrop }: AssetDragProviderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [draggingAssetIds, setDraggingAssetIds] = useState<string[]>([])
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  
  const dragStartPosRef = useRef({ x: 0, y: 0 })
  const hasStartedDragRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  
  const dropTargetIdRef = useRef<string | null>(null)
  const draggingAssetIdsRef = useRef<string[]>([])
  const onDropRef = useRef(onDrop)
  
  useEffect(() => {
    dropTargetIdRef.current = dropTargetId
  }, [dropTargetId])
  
  useEffect(() => {
    draggingAssetIdsRef.current = draggingAssetIds
  }, [draggingAssetIds])
  
  useEffect(() => {
    onDropRef.current = onDrop
  }, [onDrop])

  const startDrag = useCallback((
    assetId: string,
    selectedIds: string[],
    clientX: number,
    clientY: number
  ) => {
    const ids = selectedIds.includes(assetId) ? selectedIds : [assetId]
    
    setIsDragging(true)
    setDraggingAssetIds(ids)
    setDragPosition({ x: clientX, y: clientY })
    dragStartPosRef.current = { x: clientX, y: clientY }
    hasStartedDragRef.current = true
  }, [])

  const updatePosition = useCallback((x: number, y: number) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }
    
    rafRef.current = requestAnimationFrame(() => {
      setDragPosition({ x, y })
    })
  }, [])

  const endDrag = useCallback(() => {
    const currentDropTargetId = dropTargetIdRef.current
    const currentDraggingAssetIds = draggingAssetIdsRef.current
    
    if (currentDropTargetId && currentDraggingAssetIds.length > 0) {
      onDropRef.current(currentDropTargetId, currentDraggingAssetIds)
    }
    
    setIsDragging(false)
    setDraggingAssetIds([])
    setDropTargetId(null)
    hasStartedDragRef.current = false
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const cancelDrag = useCallback(() => {
    setIsDragging(false)
    setDraggingAssetIds([])
    setDropTargetId(null)
    hasStartedDragRef.current = false
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelDrag()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDragging, cancelDrag])

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  return (
    <AssetDragContext.Provider
      value={{
        isDragging,
        draggingAssetIds,
        dragPosition,
        dropTargetId,
        startDrag,
        updatePosition,
        endDrag,
        cancelDrag,
        setDropTargetId
      }}
    >
      {children}
    </AssetDragContext.Provider>
  )
}
