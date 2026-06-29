/**
 * 主题Context - 管理应用的浅色/深色主题
 */

import { createContext, useCallback, useEffect, useState, ReactNode } from 'react'
import { useSettingsStore } from '@/stores/useSettingsStore'

export type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: Theme
}

/**
 * 检测是否在 pywebview 环境中
 */
function isPyWebView(): boolean {
  return typeof window !== 'undefined' && !!window.pywebview?.api
}

/**
 * 主题提供者组件
 * 负责初始化主题、管理主题状态、持久化主题选择
 * 
 * 优先级：
 * 1. localStorage (用户手动切换，最高优先级)
 * 2. 后端配置文件 (settings.json) - 仅在 pywebview 环境中
 * 3. 系统偏好
 */
export function ThemeProvider({ children, defaultTheme = 'light' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [mounted, setMounted] = useState(false)

  // 应用主题到DOM
  const applyTheme = useCallback((newTheme: Theme) => {
    const root = document.documentElement
    
    if (newTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [])

  // 保存主题到后端（仅在 pywebview 环境中）
  const saveThemeToBackend = useCallback(async (newTheme: Theme) => {
    if (!isPyWebView()) return
    
    try {
      const { updateSystemSettings } = useSettingsStore.getState()
      await updateSystemSettings({ theme: newTheme })
      console.log('[ThemeProvider] 主题已保存到后端:', newTheme)
    } catch (error) {
      console.error('[ThemeProvider] 保存主题到后端失败:', error)
    }
  }, [])

  // 初始化主题 - 只在组件挂载时运行一次
  useEffect(() => {
    // 优先级 1: 检查 localStorage 中的主题偏好（用户手动切换的优先级最高）
    const savedTheme = localStorage.getItem('theme-preference') as Theme | null
    
    if (savedTheme) {
      console.log('[ThemeProvider] 使用 localStorage 的主题:', savedTheme)
      setThemeState(savedTheme)
      applyTheme(savedTheme)
      setMounted(true)
      return
    }

    // 优先级 2: 从后端配置文件读取（仅在 pywebview 环境中）
    if (isPyWebView()) {
      const { systemSettings } = useSettingsStore.getState()
      if (systemSettings.theme) {
        console.log('[ThemeProvider] 使用后端配置的主题:', systemSettings.theme)
        setThemeState(systemSettings.theme)
        applyTheme(systemSettings.theme)
        setMounted(true)
        return
      }
    }

    // 优先级 3: 检测系统偏好
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const systemTheme: Theme = prefersDark ? 'dark' : 'light'
    console.log('[ThemeProvider] 使用系统偏好主题:', systemTheme)
    setThemeState(systemTheme)
    applyTheme(systemTheme)

    setMounted(true)
  }, [applyTheme])

  // 监听系统偏好变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      // 只有在用户未手动设置主题时，才跟随系统偏好
      if (!localStorage.getItem('theme-preference')) {
        const newTheme: Theme = e.matches ? 'dark' : 'light'
        setThemeState(newTheme)
        applyTheme(newTheme)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [applyTheme])

  // 切换主题
  const toggleTheme = useCallback(() => {
    const newTheme: Theme = theme === 'light' ? 'dark' : 'light'
    setThemeState(newTheme)
    applyTheme(newTheme)
    localStorage.setItem('theme-preference', newTheme)
    saveThemeToBackend(newTheme)
    console.log('[ThemeProvider] 主题已切换:', newTheme)
  }, [theme, applyTheme, saveThemeToBackend])

  // 设置指定主题
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    applyTheme(newTheme)
    localStorage.setItem('theme-preference', newTheme)
    saveThemeToBackend(newTheme)
    console.log('[ThemeProvider] 主题已设置:', newTheme)
  }, [applyTheme, saveThemeToBackend])

  // 防止闪烁 - 只在挂载后渲染
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
