/**
 * 全屏功能 Hook
 */

import { useState, useEffect, RefObject } from 'react'

export interface UseFullscreenReturn {
  isFullscreen: boolean
  enterFullscreen: () => Promise<void>
  exitFullscreen: () => Promise<void>
  toggleFullscreen: () => Promise<void>
}

/**
 * 全屏功能 Hook
 * @param elementRef 要全屏的元素引用
 */
export function useFullscreen(elementRef: RefObject<HTMLElement | null>): UseFullscreenReturn {
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  /**
   * 全屏窗口（pywebview API）
   */
  const maximizeWindow = async () => {
    if (window.pywebview?.api?.toggleFullscreen) {
      try {
        await window.pywebview.api.toggleFullscreen()
        console.log('[useFullscreen] 窗口全屏成功')
      } catch (error) {
        console.error('[useFullscreen] 全屏窗口失败:', error)
      }
    } else {
      console.warn('[useFullscreen] toggleFullscreen API 不可用')
    }
  }
  
  /**
   * 进入全屏
   */
  const enterFullscreen = async () => {
    if (elementRef.current) {
      try {
        // 1. 先全屏主应用窗口
        await maximizeWindow()
        
        // 2. 等待窗口全屏动画完成（延迟 300ms）
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // 3. 再全屏工作台元素
        await elementRef.current.requestFullscreen()
        setIsFullscreen(true)
      } catch (error) {
        console.error('进入全屏失败:', error)
      }
    }
  }
  
  /**
   * 退出全屏
   */
  const exitFullscreen = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen()
        setIsFullscreen(false)
      } catch (error) {
        console.error('退出全屏失败:', error)
      }
    }
  }
  
  /**
   * 切换全屏
   */
  const toggleFullscreen = async () => {
    if (isFullscreen) {
      await exitFullscreen()
    } else {
      await enterFullscreen()
    }
  }
  
  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])
  
  // 监听 ESC 键退出全屏
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        exitFullscreen()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])
  
  return { isFullscreen, enterFullscreen, exitFullscreen, toggleFullscreen }
}
