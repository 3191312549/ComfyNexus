/**
 * 拖拽状态管理 Context
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

interface DragContextValue {
  isDragging: boolean
  draggingPromptIds: string[]
  dragPosition: { x: number; y: number }
  dropTargetId: string | null
  startDrag: (promptId: string, selectedIds: string[], clientX: number, clientY: number) => void
  updatePosition: (x: number, y: number) => void
  endDrag: () => void
  cancelDrag: () => void
  setDropTargetId: (id: string | null) => void
}

const DragContext = createContext<DragContextValue | null>(null)

export function useDragContext() {
  const context = useContext(DragContext)
  if (!context) {
    throw new Error('useDragContext must be used within DragProvider')
  }
  return context
}

interface DragProviderProps {
  children: React.ReactNode
  onDrop: (categoryId: string, promptIds: string[]) => void
}

export function DragProvider({ children, onDrop }: DragProviderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [draggingPromptIds, setDraggingPromptIds] = useState<string[]>([])
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  
  const dragStartPosRef = useRef({ x: 0, y: 0 })
  const hasStartedDragRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  
  const dropTargetIdRef = useRef<string | null>(null)
  const draggingPromptIdsRef = useRef<string[]>([])
  const onDropRef = useRef(onDrop)
  
  useEffect(() => {
    dropTargetIdRef.current = dropTargetId
  }, [dropTargetId])
  
  useEffect(() => {
    draggingPromptIdsRef.current = draggingPromptIds
  }, [draggingPromptIds])
  
  useEffect(() => {
    onDropRef.current = onDrop
  }, [onDrop])

  const startDrag = useCallback((
    promptId: string,
    selectedIds: string[],
    clientX: number,
    clientY: number
  ) => {
    const ids = selectedIds.includes(promptId) ? selectedIds : [promptId]
    
    setIsDragging(true)
    setDraggingPromptIds(ids)
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
    const currentDraggingPromptIds = draggingPromptIdsRef.current
    
    if (currentDropTargetId && currentDraggingPromptIds.length > 0) {
      onDropRef.current(currentDropTargetId, currentDraggingPromptIds)
    }
    
    setIsDragging(false)
    setDraggingPromptIds([])
    setDropTargetId(null)
    hasStartedDragRef.current = false
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const cancelDrag = useCallback(() => {
    setIsDragging(false)
    setDraggingPromptIds([])
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
    <DragContext.Provider
      value={{
        isDragging,
        draggingPromptIds,
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
    </DragContext.Provider>
  )
}
