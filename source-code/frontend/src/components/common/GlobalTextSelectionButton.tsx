import { useTranslation } from 'react-i18next'
import { Copy, CopyCheck } from 'lucide-react'
import { useGlobalTextSelectionStore } from '@/stores/useGlobalTextSelectionStore'
import { cn } from '@/lib/utils'
import { useState, useCallback, useEffect, useRef } from 'react'

const BUTTON_RADIUS = 20
const MOVE_THRESHOLD = 5

export function GlobalTextSelectionButton() {
  const { t } = useTranslation()
  const visible = useGlobalTextSelectionStore((state) => state.visible)
  const active = useGlobalTextSelectionStore((state) => state.active)
  const position = useGlobalTextSelectionStore((state) => state.position)
  const toggleActive = useGlobalTextSelectionStore((state) => state.toggleActive)
  const setPosition = useGlobalTextSelectionStore((state) => state.setPosition)
  const resetPosition = useGlobalTextSelectionStore((state) => state.resetPosition)

  const [isDragging, setIsDragging] = useState(false)
  const [localPosition, setLocalPosition] = useState(position)
  const mouseDownPosRef = useRef({ x: 0, y: 0 })
  const buttonStartRef = useRef({ x: 0, y: 0 })

  const calculateDistance = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
  }, [])

  const clampPosition = useCallback((x: number, y: number) => {
    if (typeof window === 'undefined') return { x, y }
    
    const maxX = window.innerWidth - BUTTON_RADIUS
    const maxY = window.innerHeight - BUTTON_RADIUS
    
    return {
      x: Math.max(BUTTON_RADIUS, Math.min(x, maxX)),
      y: Math.max(BUTTON_RADIUS, Math.min(y, maxY))
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    
    e.preventDefault()
    e.stopPropagation()
    
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY }
    buttonStartRef.current = { x: position.x, y: position.y }
    setLocalPosition(position)
    setIsDragging(true)
  }, [position])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    
    const deltaX = e.clientX - mouseDownPosRef.current.x
    const deltaY = e.clientY - mouseDownPosRef.current.y
    
    const newX = buttonStartRef.current.x + deltaX
    const newY = buttonStartRef.current.y + deltaY
    
    const clamped = clampPosition(newX, newY)
    setLocalPosition(clamped)
  }, [isDragging, clampPosition])

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setIsDragging(false)
      setPosition(localPosition)
      
      const distance = calculateDistance(
        mouseDownPosRef.current.x,
        mouseDownPosRef.current.y,
        e.clientX,
        e.clientY
      )
      
      if (distance < MOVE_THRESHOLD) {
        toggleActive()
      }
    }
  }, [isDragging, localPosition, setPosition, toggleActive, calculateDistance])

  const handleDoubleClick = useCallback(() => {
    resetPosition()
  }, [resetPosition])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  useEffect(() => {
    const handleResize = () => {
      const clamped = clampPosition(position.x, position.y)
      if (clamped.x !== position.x || clamped.y !== position.y) {
        setPosition(clamped)
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [position, clampPosition, setPosition])

  useEffect(() => {
    if (!isDragging) {
      setLocalPosition(position)
    }
  }, [position, isDragging])

  if (!visible) return null

  return (
    <button
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      className={cn(
        'fixed z-50',
        'flex size-10 items-center justify-center rounded-full',
        'bg-warning text-warning-foreground',
        isDragging ? 'transition-none' : 'transition-all duration-200',
        'hover:opacity-100 hover:scale-110',
        'focus:outline-none focus:ring-2 focus:ring-warning focus:ring-offset-2',
        active ? 'opacity-100 ring-2 ring-warning' : 'opacity-30',
        isDragging && 'cursor-move opacity-80 scale-110'
      )}
      style={{
        left: `${isDragging ? localPosition.x : position.x}px`,
        top: `${isDragging ? localPosition.y : position.y}px`,
        transform: 'translate(-50%, -50%)'
      }}
      title={active ? t('settings.globalTextSelection.deactivate') : t('settings.globalTextSelection.activate')}
    >
      {active ? (
        <CopyCheck className="size-5" />
      ) : (
        <Copy className="size-5" />
      )}
    </button>
  )
}
