/**
 * 悬浮窗主组件
 * 深色毛玻璃效果，参照原型设计
 * 无标题栏，整个窗口可拖拽
 * 使用 CSS 变量支持主题切换
 * 高度自适应内容
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FloatingMonitorItem } from '@/components/floating/FloatingMonitorItem'
import type { MonitorData, FloatingWindowSettings } from '@/types/monitor'
import { DEFAULT_FLOATING_WINDOW_SETTINGS, FLOATING_WINDOW_ITEMS } from '@/types/monitor'

const MONITOR_INTERVAL = 1000
const WINDOW_WIDTH = 280

export function FloatingWindowApp() {
  const { t } = useTranslation()
  const [monitorData, setMonitorData] = useState<MonitorData | null>(null)
  const [settings, setSettings] = useState<FloatingWindowSettings>(DEFAULT_FLOATING_WINDOW_SETTINGS)
  const contentRef = useRef<HTMLDivElement>(null)
  const hasNotifiedReady = useRef(false)
  const prevVisibleItemsRef = useRef<string[]>([])
  const prevItemOrderRef = useRef<string[]>([])
  const hasResizedRef = useRef(false)
  const monitorDataLoaded = useRef(false)
  const settingsLoaded = useRef(false)

  const fetchMonitorData = useCallback(async () => {
    try {
      const response = await window.pywebview?.api?.get_monitor_data()
      if (response?.success && response.data) {
        setMonitorData(response.data)
      }
    } catch (error) {
      console.error('[FloatingWindow] Failed to fetch monitor data:', error)
    }
  }, [])

  const fetchSettings = useCallback(async () => {
    try {
      const response = await window.pywebview?.api?.get_floating_window_settings()
      if (response?.success && response.data) {
        setSettings(response.data)
        if (!settingsLoaded.current) {
          settingsLoaded.current = true
        }
      }
    } catch (error) {
      console.error('[FloatingWindow] Failed to fetch settings:', error)
    }
  }, [])

  const adjustWindowSize = useCallback(async () => {
    if (!contentRef.current) return
    
    const contentHeight = contentRef.current.offsetHeight
    const windowHeight = contentHeight + 2
    
    try {
      const res = await window.pywebview?.api?.resize_floating_window(WINDOW_WIDTH, windowHeight)
      if (res?.success === false) {
        console.warn('[FloatingWindow] 后端调整窗口尺寸返回失败')
      } else {
        console.log(`[FloatingWindow] 物理窗口已同步调整：${WINDOW_WIDTH}x${windowHeight}`)
      }
    } catch (error) {
      console.error('[FloatingWindow] 调整窗口尺寸异常 (可能 API 未暴露):', error)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
    fetchMonitorData()

    const monitorInterval = setInterval(fetchMonitorData, MONITOR_INTERVAL)
    const settingsInterval = setInterval(fetchSettings, 2000)

    return () => {
      clearInterval(monitorInterval)
      clearInterval(settingsInterval)
    }
  }, [fetchSettings, fetchMonitorData])

  useEffect(() => {
    if (!settingsLoaded.current || hasNotifiedReady.current) return
    
    hasNotifiedReady.current = true
    
    const timer = setTimeout(() => {
      const contentEl = document.querySelector('.floating-content') as HTMLElement | null
      const contentHeight = contentEl ? contentEl.offsetHeight : 260
      const windowHeight = contentHeight + 2
      
      window.pywebview?.api?.floating_window_ready?.(WINDOW_WIDTH, windowHeight)
        .catch(err => console.error('[FloatingWindow] 发送就绪信号失败:', err))
      console.log(`[FloatingWindow] 已通知后端：前端渲染完成，尺寸: ${WINDOW_WIDTH}x${windowHeight}`)
    }, 50)
    
    return () => clearTimeout(timer)
  }, [settings.visibleItems, settings.itemOrder])

  useEffect(() => {
    if (settings.visible === false) return
    
    const visibleItemsChanged = 
      prevVisibleItemsRef.current.length !== settings.visibleItems.length ||
      prevVisibleItemsRef.current.some((item, index) => item !== settings.visibleItems[index])
    
    const itemOrderChanged =
      prevItemOrderRef.current.length !== settings.itemOrder.length ||
      prevItemOrderRef.current.some((item, index) => item !== settings.itemOrder[index])
    
    const shouldResize = !hasResizedRef.current || visibleItemsChanged || itemOrderChanged
    
    if (shouldResize) {
      const timer = setTimeout(() => {
        adjustWindowSize()
        hasResizedRef.current = true
        prevVisibleItemsRef.current = [...settings.visibleItems]
        prevItemOrderRef.current = [...settings.itemOrder]
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [settings.visibleItems, settings.itemOrder, settings.visible, adjustWindowSize])

  useEffect(() => {
    if (monitorData && !monitorDataLoaded.current) {
      monitorDataLoaded.current = true
      setTimeout(() => {
        adjustWindowSize()
      }, 50)
    }
  }, [monitorData, adjustWindowSize])

  const visibleItems = settings.itemOrder
    .filter((id) => settings.visibleItems.includes(id))
    .map((id) => {
      const item = FLOATING_WINDOW_ITEMS.find((i) => i.id === id)
      return item ? { id, label: t(item.labelKey) } : null
    })
    .filter(Boolean) as { id: string; label: string }[]

  const opacity = settings.opacity / 100
  
  useEffect(() => {
    console.log(`[FloatingWindow] settings.opacity: ${settings.opacity}, opacity: ${opacity}`)
    console.log(`[FloatingWindow] background: color-mix(in srgb, hsl(var(--bg-surface)) ${settings.opacity}%, transparent)`)
  }, [settings.opacity, opacity])

  return (
    <div
      className="floating-window"
      style={{
        background: `color-mix(in srgb, hsl(var(--bg-surface)) ${settings.opacity}%, transparent)`
      }}
    >
      <div ref={contentRef} className="floating-content">
        {visibleItems.map((item) => (
          <FloatingMonitorItem
            key={item.id}
            id={item.id}
            label={item.label}
            data={monitorData}
          />
        ))}
      </div>
    </div>
  )
}
