import { useState, useCallback, useRef, useEffect } from 'react'

export interface Position {
  x: number
  y: number
}

export interface UseDraggableOptions {
  boundary?: 'window' | 'none'
  storageKey?: string
}

export interface UseDraggableReturn {
  position: Position
  isDragging: boolean
  dragHandleProps: {
    onMouseDown: (e: React.MouseEvent) => void
    style: React.CSSProperties
  }
  containerRef: React.RefObject<HTMLDivElement | null>
}

const MARGIN = 20
const STORAGE_VERSION = 2

function getStorageKey(key: string): string {
  return `${key}_v${STORAGE_VERSION}`
}

function getDefaultPosition(): Position {
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight
  return {
    x: Math.max(MARGIN, windowWidth - 320),
    y: Math.max(MARGIN, windowHeight - 180)
  }
}

function validatePosition(pos: Position): Position {
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight
  
  const minX = MARGIN
  const maxX = Math.max(minX + 100, windowWidth - 300)
  const minY = MARGIN
  const maxY = Math.max(minY + 100, windowHeight - 200)
  
  return {
    x: Math.max(minX, Math.min(pos.x, maxX)),
    y: Math.max(minY, Math.min(pos.y, maxY))
  }
}

export function useDraggable(options: UseDraggableOptions = {}): UseDraggableReturn {
  const { boundary = 'window', storageKey } = options

  const [position, setPosition] = useState<Position>(() => {
    if (storageKey) {
      try {
        const stored = localStorage.getItem(getStorageKey(storageKey))
        if (stored) {
          const parsed = JSON.parse(stored)
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            return validatePosition(parsed)
          }
        }
      } catch {
        // ignore
      }
    }
    return getDefaultPosition()
  })
  
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(null)

  const savePosition = useCallback((pos: Position) => {
    if (storageKey) {
      try {
        localStorage.setItem(getStorageKey(storageKey), JSON.stringify(pos))
      } catch {
        // ignore
      }
    }
  }, [storageKey])

  const clampPosition = useCallback((x: number, y: number): Position => {
    if (boundary !== 'window' || !containerRef.current) {
      return { x, y }
    }

    const rect = containerRef.current.getBoundingClientRect()
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    const minX = MARGIN
    const maxX = windowWidth - rect.width - MARGIN
    const minY = MARGIN
    const maxY = windowHeight - rect.height - MARGIN

    return {
      x: Math.max(minX, Math.min(x, maxX)),
      y: Math.max(minY, Math.min(y, maxY))
    }
  }, [boundary])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return

    e.preventDefault()
    setIsDragging(true)

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y
    }
  }, [position])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return

      const deltaX = e.clientX - dragStartRef.current.mouseX
      const deltaY = e.clientY - dragStartRef.current.mouseY

      const newX = dragStartRef.current.posX + deltaX
      const newY = dragStartRef.current.posY + deltaY

      const clamped = clampPosition(newX, newY)
      setPosition(clamped)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      dragStartRef.current = null
      setPosition(prev => {
        savePosition(prev)
        return prev
      })
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, clampPosition, savePosition])

  useEffect(() => {
    const handleResize = () => {
      if (boundary === 'window') {
        setPosition(prev => clampPosition(prev.x, prev.y))
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [boundary, clampPosition])

  return {
    position,
    isDragging,
    dragHandleProps: {
      onMouseDown: handleMouseDown,
      style: { cursor: 'move', userSelect: 'none' }
    },
    containerRef
  }
}
