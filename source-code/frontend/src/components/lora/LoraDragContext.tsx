/**
 * LoRA 拖拽状态管理 Context
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

interface LoraDragContextValue {
  isDragging: boolean
  draggingModelIds: string[]
  dragPosition: { x: number; y: number }
  dropTargetFolderId: string | null
  startDrag: (modelId: string, selectedIds: string[], clientX: number, clientY: number) => void
  updatePosition: (x: number, y: number) => void
  endDrag: () => void
  cancelDrag: () => void
  setDropTargetFolderId: (id: string | null) => void
}

const LoraDragContext = createContext<LoraDragContextValue | null>(null)

export function useLoraDragContext() {
  const context = useContext(LoraDragContext)
  if (!context) {
    throw new Error('useLoraDragContext must be used within LoraDragProvider')
  }
  return context
}

interface LoraDragProviderProps {
  children: React.ReactNode
  onDrop: (folderId: string, modelIds: string[]) => void
}

export function LoraDragProvider({ children, onDrop }: LoraDragProviderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [draggingModelIds, setDraggingModelIds] = useState<string[]>([])
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null)
  
  const rafRef = useRef<number | null>(null)
  const dropTargetFolderIdRef = useRef<string | null>(null)
  const draggingModelIdsRef = useRef<string[]>([])
  const onDropRef = useRef(onDrop)
  
  useEffect(() => {
    dropTargetFolderIdRef.current = dropTargetFolderId
  }, [dropTargetFolderId])
  
  useEffect(() => {
    draggingModelIdsRef.current = draggingModelIds
  }, [draggingModelIds])
  
  useEffect(() => {
    onDropRef.current = onDrop
  }, [onDrop])

  const startDrag = useCallback((
    modelId: string,
    selectedIds: string[],
    clientX: number,
    clientY: number
  ) => {
    const ids = selectedIds.includes(modelId) ? selectedIds : [modelId]
    
    setIsDragging(true)
    setDraggingModelIds(ids)
    setDragPosition({ x: clientX, y: clientY })
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
    const currentDropTargetId = dropTargetFolderIdRef.current
    const currentDraggingIds = draggingModelIdsRef.current
    
    if (currentDropTargetId && currentDraggingIds.length > 0) {
      onDropRef.current(currentDropTargetId, currentDraggingIds)
    }
    
    setIsDragging(false)
    setDraggingModelIds([])
    setDropTargetFolderId(null)
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const cancelDrag = useCallback(() => {
    setIsDragging(false)
    setDraggingModelIds([])
    setDropTargetFolderId(null)
    
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
    <LoraDragContext.Provider
      value={{
        isDragging,
        draggingModelIds,
        dragPosition,
        dropTargetFolderId,
        startDrag,
        updatePosition,
        endDrag,
        cancelDrag,
        setDropTargetFolderId
      }}
    >
      {children}
    </LoraDragContext.Provider>
  )
}
