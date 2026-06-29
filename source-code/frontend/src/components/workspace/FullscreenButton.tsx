/**
 * 全屏切换按钮（可拖动）
 */

import { useState, useRef, useEffect } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui'
import type { FullscreenButtonProps } from '@/types/workspace'

export function FullscreenButton({ isFullscreen, onToggle }: FullscreenButtonProps) {
  // 使用百分比存储位置，这样全屏后位置不会变
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [positionPercent, setPositionPercent] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  
  // 初始化位置（右下角，距离边缘 20px）
  useEffect(() => {
    const updatePosition = () => {
      const button = buttonRef.current
      if (!button) return
      
      const rect = button.getBoundingClientRect()
      const parentRect = button.parentElement?.getBoundingClientRect()
      
      if (parentRect) {
        // 如果是初始化（positionPercent 为 0），设置到右下角
        if (positionPercent.x === 0 && positionPercent.y === 0) {
          const x = parentRect.width - rect.width - 20
          const y = parentRect.height - rect.height - 20
          setPosition({ x, y })
          setPositionPercent({
            x: (x / parentRect.width) * 100,
            y: (y / parentRect.height) * 100
          })
        } else {
          // 根据百分比计算新位置
          const x = (positionPercent.x / 100) * parentRect.width
          const y = (positionPercent.y / 100) * parentRect.height
          setPosition({ x, y })
        }
      }
    }
    
    // 初始化位置
    updatePosition()
    
    // 监听窗口大小变化和全屏状态变化
    window.addEventListener('resize', updatePosition)
    document.addEventListener('fullscreenchange', updatePosition)
    
    return () => {
      window.removeEventListener('resize', updatePosition)
      document.removeEventListener('fullscreenchange', updatePosition)
    }
  }, [positionPercent, isFullscreen])
  
  // 处理鼠标按下
  const handleMouseDown = (e: React.MouseEvent) => {
    // 只响应左键
    if (e.button !== 0) return
    
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
    
    e.preventDefault()
    e.stopPropagation()
  }
  
  // 处理鼠标移动
  useEffect(() => {
    if (!isDragging) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const button = buttonRef.current
      if (!button) return
      
      const parentRect = button.parentElement?.getBoundingClientRect()
      if (!parentRect) return
      
      const rect = button.getBoundingClientRect()
      
      // 计算新位置
      let newX = e.clientX - dragStart.x
      let newY = e.clientY - dragStart.y
      
      // 限制在父容器内
      newX = Math.max(0, Math.min(newX, parentRect.width - rect.width))
      newY = Math.max(0, Math.min(newY, parentRect.height - rect.height))
      
      setPosition({ x: newX, y: newY })
      
      // 同时更新百分比位置
      setPositionPercent({
        x: (newX / parentRect.width) * 100,
        y: (newY / parentRect.height) * 100
      })
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart])
  
  // 处理点击（只在没有拖动时触发）
  const handleClick = (e: React.MouseEvent) => {
    // 如果刚刚拖动过，不触发点击
    if (isDragging) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    
    onToggle()
  }
  
  return (
    <Button
      ref={buttonRef}
      variant="secondary"
      size="icon"
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      className="bg-black/50 text-white hover:bg-black/70 absolute z-[9999] opacity-60 transition-opacity duration-300 hover:opacity-100"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      title={isFullscreen ? '退出全屏 (ESC)' : '进入全屏'}
    >
      {isFullscreen ? (
        <Minimize2 className="size-5" />
      ) : (
        <Maximize2 className="size-5" />
      )}
    </Button>
  )
}
